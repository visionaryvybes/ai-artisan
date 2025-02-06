import * as tf from '@tensorflow/tfjs';
import { modelLoader } from '../model-loader';
import { modelCache } from '../model-cache';
import { webglHelper } from '../webgl-helper';

jest.mock('../model-cache');
jest.mock('../webgl-helper');

describe('ModelLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelLoader.disposeAll();
  });

  it('should load a model from network when not cached', async () => {
    const mockModel = {
      predict: jest.fn(),
      dispose: jest.fn(),
      weights: {},
      inputs: [{ shape: [1, 224, 224, 3] }],
    };

    jest.spyOn(tf, 'loadGraphModel').mockResolvedValue(mockModel as any);
    jest.spyOn(modelCache, 'getModel').mockResolvedValue(null);
    jest.spyOn(modelCache, 'saveModel').mockResolvedValue();

    const config = { path: '/test/model.json', version: '1.0.0' };
    const model = await modelLoader.loadModel(config);

    expect(tf.loadGraphModel).toHaveBeenCalledWith(config.path, expect.any(Object));
    expect(modelCache.saveModel).toHaveBeenCalled();
    expect(model).toBe(mockModel);
  });

  it('should load a model from cache when available', async () => {
    const mockCachedModel = new ArrayBuffer(100);
    const mockModel = {
      predict: jest.fn(),
      dispose: jest.fn(),
      weights: {},
      inputs: [{ shape: [1, 224, 224, 3] }],
    };

    jest.spyOn(modelCache, 'getModel').mockResolvedValue(mockCachedModel);
    jest.spyOn(tf, 'loadGraphModel').mockResolvedValue(mockModel as any);

    const config = { path: '/test/model.json', version: '1.0.0' };
    const model = await modelLoader.loadModel(config);

    expect(modelCache.getModel).toHaveBeenCalledWith(config.path, config.version);
    expect(tf.loadGraphModel).toHaveBeenCalledWith(tf.io.fromMemory(mockCachedModel));
    expect(model).toBe(mockModel);
  });

  it('should notify loading state changes', async () => {
    const mockModel = {
      predict: jest.fn(),
      dispose: jest.fn(),
      weights: {},
      inputs: [{ shape: [1, 224, 224, 3] }],
    };

    jest.spyOn(tf, 'loadGraphModel').mockResolvedValue(mockModel as any);
    jest.spyOn(modelCache, 'getModel').mockResolvedValue(null);

    const config = { path: '/test/model.json', version: '1.0.0' };
    const stateChanges: any[] = [];
    const unsubscribe = modelLoader.subscribeToLoadingState(config.path, (state) => {
      stateChanges.push(state);
    });

    await modelLoader.loadModel(config);
    unsubscribe();

    expect(stateChanges).toEqual([
      { isLoading: false, progress: 0, error: null },
      { isLoading: true, progress: 0, error: null },
      { isLoading: false, progress: 100, error: null },
    ]);
  });

  it('should handle loading errors', async () => {
    const error = new Error('Network error');
    jest.spyOn(tf, 'loadGraphModel').mockRejectedValue(error);
    jest.spyOn(modelCache, 'getModel').mockResolvedValue(null);

    const config = { path: '/test/model.json', version: '1.0.0' };
    const stateChanges: any[] = [];
    const unsubscribe = modelLoader.subscribeToLoadingState(config.path, (state) => {
      stateChanges.push(state);
    });

    await expect(modelLoader.loadModel(config)).rejects.toThrow(error);
    unsubscribe();

    expect(stateChanges).toEqual([
      { isLoading: false, progress: 0, error: null },
      { isLoading: true, progress: 0, error: null },
      { isLoading: false, progress: 0, error: 'Network error' },
    ]);
  });

  it('should preload multiple models', async () => {
    const mockModel = {
      predict: jest.fn(),
      dispose: jest.fn(),
      weights: {},
      inputs: [{ shape: [1, 224, 224, 3] }],
    };

    jest.spyOn(tf, 'loadGraphModel').mockResolvedValue(mockModel as any);
    jest.spyOn(modelCache, 'getModel').mockResolvedValue(null);

    const configs = [
      { path: '/test/model1.json', version: '1.0.0' },
      { path: '/test/model2.json', version: '1.0.0' },
    ];

    await modelLoader.preloadModels(configs);

    expect(tf.loadGraphModel).toHaveBeenCalledTimes(2);
    expect(tf.loadGraphModel).toHaveBeenCalledWith(configs[0].path, expect.any(Object));
    expect(tf.loadGraphModel).toHaveBeenCalledWith(configs[1].path, expect.any(Object));
  });
}); 