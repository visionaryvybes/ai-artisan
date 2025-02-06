import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import { ModelArtifacts, SaveResult } from '@tensorflow/tfjs-core/dist/io/types';
import { modelCache } from './model-cache';
import { performanceMonitor } from './performance-monitor';

export interface ModelLoadingState {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

interface ModelConfig {
  path: string;
  version: string;
  quantize?: boolean;
}

class ModelLoader {
  private models: Map<string, tf.GraphModel> = new Map();
  private loadingStates: Map<string, ModelLoadingState> = new Map();
  private loadingCallbacks: Map<string, Set<(state: ModelLoadingState) => void>> = new Map();
  private readonly MODEL_VERSION = '1.0.0';

  private getInitialState(): ModelLoadingState {
    return {
      isLoading: false,
      progress: 0,
      error: null,
    };
  }

  private updateLoadingState(modelPath: string, update: Partial<ModelLoadingState>) {
    const currentState = this.loadingStates.get(modelPath) || this.getInitialState();
    const newState = { ...currentState, ...update };
    this.loadingStates.set(modelPath, newState);
    
    // Notify all callbacks
    const callbacks = this.loadingCallbacks.get(modelPath) || new Set();
    callbacks.forEach(callback => callback(newState));
  }

  private async quantizeModel(model: tf.GraphModel): Promise<tf.GraphModel> {
    // Use lower-level quantization API since the high-level one is not available
    const weights = model.weights;
    const quantizedWeights = new Map<string, tf.Tensor>();

    for (const [name, weight] of Object.entries(weights)) {
      const tensor = weight as tf.Tensor;
      const quantized = tf.tidy(() => {
        const min = tensor.min();
        const max = tensor.max();
        const step = (max.sub(min)).div(tf.scalar(255));
        return tensor.sub(min).div(step).round().mul(step).add(min);
      });
      quantizedWeights.set(name, quantized);
    }

    // Create a new model with quantized weights
    const newModel = await tf.loadGraphModel(tf.io.fromMemory({
      modelTopology: model.modelTopology,
      weightSpecs: model.weightSpecs,
      weightData: await tf.io.encodeWeights(quantizedWeights),
    }));

    return newModel;
  }

  async loadModel(config: ModelConfig): Promise<tf.GraphModel> {
    const { path: modelPath, version = this.MODEL_VERSION, quantize = true } = config;
    const startTime = performance.now();

    // Return cached model if available
    if (this.models.has(modelPath)) {
      return this.models.get(modelPath)!;
    }

    this.updateLoadingState(modelPath, { isLoading: true, progress: 0 });

    try {
      // Try to load from IndexedDB cache first
      const cachedModel = await modelCache.getModel(modelPath, version);
      let model: tf.GraphModel;

      if (cachedModel) {
        model = await tf.loadGraphModel(tf.io.fromMemory(cachedModel));
        this.updateLoadingState(modelPath, { progress: 100 });
      } else {
        // Load from network
        model = await tf.loadGraphModel(modelPath, {
          onProgress: (fraction) => {
            this.updateLoadingState(modelPath, { progress: Math.round(fraction * 100) });
          },
        });

        // Save to cache
        const saveResult = await model.save(tf.io.withSaveHandler(async (artifacts: ModelArtifacts): Promise<SaveResult> => {
          return {
            modelArtifactsInfo: {
              dateSaved: new Date(),
              modelTopologyType: 'JSON',
              modelTopologyBytes: JSON.stringify(artifacts.modelTopology).length,
              weightSpecsBytes: JSON.stringify(artifacts.weightSpecs).length,
              weightDataBytes: artifacts.weightData.byteLength,
            },
            ...artifacts,
          };
        }));
        await modelCache.saveModel(modelPath, saveResult as unknown as ArrayBuffer, version);
      }

      // Quantize if needed
      const modelInfo = await model.getModelArtifactsInfo();
      const isQuantized = modelInfo?.weightDataBytes && modelInfo.weightDataBytes < 1024 * 1024; // Less than 1MB
      if (quantize && !isQuantized) {
        this.updateLoadingState(modelPath, { progress: 90, isLoading: true });
        model = await this.quantizeModel(model);
      }

      // Warm up the model
      const inputShape = model.inputs[0].shape as number[];
      const warmupTensor = tf.zeros(inputShape);
      model.predict(warmupTensor);
      warmupTensor.dispose();

      this.models.set(modelPath, model);
      this.updateLoadingState(modelPath, { isLoading: false, progress: 100 });

      // Record performance metrics
      await performanceMonitor.recordModelLoad(modelPath, startTime);

      return model;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
      this.updateLoadingState(modelPath, {
        isLoading: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  subscribeToLoadingState(
    modelPath: string,
    callback: (state: ModelLoadingState) => void
  ): () => void {
    if (!this.loadingCallbacks.has(modelPath)) {
      this.loadingCallbacks.set(modelPath, new Set());
    }
    
    const callbacks = this.loadingCallbacks.get(modelPath)!;
    callbacks.add(callback);

    // Send initial state
    const currentState = this.loadingStates.get(modelPath) || this.getInitialState();
    callback(currentState);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.loadingCallbacks.delete(modelPath);
      }
    };
  }

  async preloadModels(configs: ModelConfig[]): Promise<void> {
    await Promise.all(configs.map(config => this.loadModel(config)));
  }

  disposeModel(modelPath: string): void {
    const model = this.models.get(modelPath);
    if (model) {
      model.dispose();
      this.models.delete(modelPath);
      this.loadingStates.delete(modelPath);
      this.loadingCallbacks.delete(modelPath);
    }
  }

  disposeAll(): void {
    for (const modelPath of this.models.keys()) {
      this.disposeModel(modelPath);
    }
  }
}

export const modelLoader = new ModelLoader(); 