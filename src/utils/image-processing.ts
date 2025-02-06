import * as tf from '@tensorflow/tfjs';
import { AIFeature } from '@/config/ai-models';
import { optimizeImage, generateCacheKey, imageCache } from './image-optimization';

// Model cache
interface ModelCache {
  [key: string]: tf.GraphModel;
}

const modelCache: ModelCache = {};

// Model loading functions
async function loadModel(modelPath: string): Promise<tf.GraphModel> {
  if (modelCache[modelPath]) {
    return modelCache[modelPath];
  }
  
  const model = await tf.loadGraphModel(modelPath);
  modelCache[modelPath] = model;
  return model;
}

export async function loadImageAsTensor(imageFile: File): Promise<tf.Tensor3D> {
  const optimizedBlob = await optimizeImage(imageFile, {
    maxWidth: 1024,
    maxHeight: 1024,
    quality: 0.9,
    format: 'webp',
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const tensor = tf.tidy(() => {
        const imageTensor = tf.browser.fromPixels(img);
        // Normalize to [-1, 1]
        return imageTensor.toFloat().div(127.5).sub(1);
      });
      resolve(tensor as tf.Tensor3D);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(optimizedBlob);
  });
}

export async function tensorToBlob(tensor: tf.Tensor3D): Promise<Blob> {
  const pixels = await tf.browser.toPixels(tensor);
  const canvas = document.createElement('canvas');
  canvas.width = tensor.shape[1];
  canvas.height = tensor.shape[0];
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const imageData = new ImageData(
    new Uint8ClampedArray(pixels),
    canvas.width,
    canvas.height
  );
  
  ctx.putImageData(imageData, 0, 0);
  
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Could not convert tensor to blob'));
      }
    }, 'image/webp', 0.9);
  });
}

export async function processWithTensorflow(
  imageFile: File,
  feature: AIFeature,
  options: { [key: string]: number } = {}
): Promise<Blob> {
  const cacheKey = generateCacheKey(imageFile, feature);
  const cachedResult = imageCache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  const tensor = await loadImageAsTensor(imageFile);
  let processedTensor: tf.Tensor3D | null = null;

  try {
    switch (feature) {
      case 'enhance': {
        const model = await loadModel('/models/real-esrgan/model.json');
        processedTensor = tf.tidy(() => {
          const batched = tensor.expandDims(0);
          const enhanced = model.predict(batched) as tf.Tensor4D;
          return enhanced.squeeze([0]) as tf.Tensor3D;
        });
        break;
      }

      case 'colorize': {
        const model = await loadModel('/models/deoldify/model.json');
        processedTensor = tf.tidy(() => {
          const grayscale = tf.mean(tensor, 2, true);
          const batched = grayscale.expandDims(0);
          const colorized = model.predict(batched) as tf.Tensor4D;
          return colorized.squeeze([0]) as tf.Tensor3D;
        });
        break;
      }

      case 'style': {
        const model = await loadModel('/models/style-transfer/model.json');
        const strength = options.styleStrength || 1.0;
        processedTensor = tf.tidy(() => {
          const batched = tensor.expandDims(0);
          const styled = model.predict([batched, tf.scalar(strength)]) as tf.Tensor4D;
          return styled.squeeze([0]) as tf.Tensor3D;
        });
        break;
      }

      case 'face': {
        const model = await loadModel('/models/gfpgan/model.json');
        processedTensor = tf.tidy(() => {
          const batched = tensor.expandDims(0);
          const enhanced = model.predict(batched) as tf.Tensor4D;
          return enhanced.squeeze([0]) as tf.Tensor3D;
        });
        break;
      }

      case 'segment': {
        const model = await loadModel('/models/unet/model.json');
        processedTensor = tf.tidy(() => {
          const batched = tensor.expandDims(0);
          const segmented = model.predict(batched) as tf.Tensor4D;
          return segmented.squeeze([0]) as tf.Tensor3D;
        });
        break;
      }

      default:
        throw new Error(`Unsupported feature: ${feature}`);
    }

    if (!processedTensor) {
      throw new Error('Failed to process image');
    }

    const result = await tensorToBlob(processedTensor);
    imageCache.set(cacheKey, result);
    return result;
  } finally {
    tf.dispose(tensor);
    if (processedTensor) {
      tf.dispose(processedTensor);
    }
  }
}

export function cleanupModels(): void {
  Object.values(modelCache).forEach(model => {
    try {
      model.dispose();
    } catch (error) {
      console.error('Error disposing model:', error);
    }
  });
  Object.keys(modelCache).forEach(key => delete modelCache[key]);
}

// Utility function to validate image files
export function validateImage(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image smaller than 10MB.',
    };
  }

  return { valid: true };
} 