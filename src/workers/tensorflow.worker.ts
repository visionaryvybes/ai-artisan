import * as tf from '@tensorflow/tfjs';
import { AIFeature } from '@/config/ai-models';
import { modelLoader } from '@/utils/model-loader';
import { webglHelper } from '@/utils/webgl-helper';

interface WorkerMessage {
  type: 'process';
  imageData: ImageData;
  feature: AIFeature;
  params?: {
    styleStrength?: number;
    enhancementLevel?: number;
    colorIntensity?: number;
  };
}

interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  result?: ImageData;
  error?: string;
  progress?: number;
  modelProgress?: number;
}

const MODEL_CONFIGS = {
  enhance: [
    { path: '/models/real-esrgan/model.json', version: '1.0.0' },
    { path: '/models/enhanced-srgan/model.json', version: '1.0.0' }, // Fallback
  ],
  colorize: [
    { path: '/models/deoldify/model.json', version: '1.0.0' },
    { path: '/models/colorization-v2/model.json', version: '1.0.0' }, // Fallback
  ],
  style: [
    { path: '/models/adain/model.json', version: '1.0.0' },
    { path: '/models/fast-style-transfer/model.json', version: '1.0.0' }, // Fallback
  ],
  face: [
    { path: '/models/gfpgan/model.json', version: '1.0.0' },
    { path: '/models/face-restoration/model.json', version: '1.0.0' }, // Fallback
  ],
  segment: [
    { path: '/models/segment/model.json', version: '1.0.0' },
    { path: '/models/unet-segmentation/model.json', version: '1.0.0' }, // Fallback
  ],
};

async function loadModelWithFallback(feature: AIFeature): Promise<tf.GraphModel> {
  const configs = MODEL_CONFIGS[feature];
  for (const config of configs) {
    try {
      return await modelLoader.loadModel(config);
    } catch (error) {
      console.warn(`Failed to load model ${config.path}, trying fallback...`);
      if (config === configs[configs.length - 1]) {
        throw error; // No more fallbacks
      }
    }
  }
  throw new Error(`Failed to load any model for feature ${feature}`);
}

async function processImage(
  imageData: ImageData,
  feature: AIFeature,
  params: WorkerMessage['params'] = {}
): Promise<ImageData> {
  return await webglHelper.withFallback(async () => {
    const tensor = tf.browser.fromPixels(imageData);
    let processedTensor: tf.Tensor3D = tensor.clone() as tf.Tensor3D;

    try {
      const model = await loadModelWithFallback(feature);

      switch (feature) {
        case 'enhance': {
          processedTensor = tf.tidy(() => {
            const normalized = tensor.toFloat().div(255);
            const batched = normalized.expandDims(0);
            const enhanced = model.predict(batched) as tf.Tensor4D;
            return enhanced.squeeze([0])
              .clipByValue(0, 1)
              .mul(255) as tf.Tensor3D;
          });
          break;
        }

        case 'colorize': {
          processedTensor = tf.tidy(() => {
            const grayscale = tf.mean(tensor, 2, true);
            const normalized = grayscale.toFloat().div(255);
            const batched = normalized.expandDims(0);
            const colorized = model.predict(batched) as tf.Tensor4D;
            return colorized.squeeze([0])
              .clipByValue(0, 1)
              .mul(255) as tf.Tensor3D;
          });
          break;
        }

        case 'style': {
          const strength = params.styleStrength || 1.0;
          processedTensor = tf.tidy(() => {
            const normalized = tensor.toFloat().div(255);
            const batched = normalized.expandDims(0);
            const styled = model.predict([batched, tf.scalar(strength)]) as tf.Tensor4D;
            return styled.squeeze([0])
              .clipByValue(0, 1)
              .mul(255) as tf.Tensor3D;
          });
          break;
        }

        case 'face': {
          processedTensor = tf.tidy(() => {
            const normalized = tensor.toFloat().div(255);
            const batched = normalized.expandDims(0);
            const enhanced = model.predict(batched) as tf.Tensor4D;
            return enhanced.squeeze([0])
              .clipByValue(0, 1)
              .mul(255) as tf.Tensor3D;
          });
          break;
        }

        case 'segment': {
          processedTensor = tf.tidy(() => {
            const normalized = tensor.toFloat().div(255);
            const batched = normalized.expandDims(0);
            const segmented = model.predict(batched) as tf.Tensor4D;
            return segmented.squeeze([0])
              .clipByValue(0, 1)
              .mul(255) as tf.Tensor3D;
          });
          break;
        }

        default:
          throw new Error(`Unsupported feature: ${feature}`);
      }

      const pixels = await tf.browser.toPixels(processedTensor);
      return new ImageData(
        new Uint8ClampedArray(pixels),
        processedTensor.shape[1],
        processedTensor.shape[0]
      );
    } finally {
      tf.dispose([tensor, processedTensor]);
    }
  });
}

self.addEventListener('message', async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type !== 'process') return;

  try {
    const { imageData, feature, params } = e.data;

    // Subscribe to model loading progress
    const modelPath = MODEL_CONFIGS[feature][0].path;
    const unsubscribe = modelLoader.subscribeToLoadingState(modelPath, (state) => {
      if (state.isLoading) {
        self.postMessage({
          type: 'progress',
          modelProgress: state.progress,
        } as WorkerResponse);
      }
    });

    // Subscribe to WebGL availability changes
    const unsubscribeWebGL = webglHelper.onAvailabilityChange((available) => {
      self.postMessage({
        type: 'progress',
        progress: available ? 100 : 50,
      } as WorkerResponse);
    });

    const result = await processImage(imageData, feature, params);
    unsubscribe();
    unsubscribeWebGL();

    self.postMessage(
      { type: 'success', result } as WorkerResponse,
      { transfer: [result.data.buffer] }
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
}); 