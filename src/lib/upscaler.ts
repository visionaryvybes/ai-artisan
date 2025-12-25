// Client-side image upscaling using UpscalerJS

import { UpscaleScale, ProgressCallback } from './types';
import { loadImage } from './enhance';

// Dynamically import upscaler to avoid SSR issues
let Upscaler: any = null;
let models: Record<string, any> = {};
let upscalerInstance: any = null;
let currentScale: UpscaleScale | null = null;

/**
 * Initialize the upscaler with the appropriate model
 */
async function initUpscaler(scale: UpscaleScale): Promise<void> {
  // Only re-initialize if scale changed or not initialized
  if (upscalerInstance && currentScale === scale) {
    return;
  }

  // Dynamically import the upscaler and models
  if (!Upscaler) {
    const upscalerModule = await import('upscaler');
    Upscaler = upscalerModule.default;
  }

  // Load the appropriate model based on scale
  // For 2x and 3x, use slim models (faster)
  // For 4x and 8x, use medium models (better quality)
  let modelModule;

  if (scale <= 3) {
    if (!models['slim']) {
      const esrganSlim = await import('@upscalerjs/esrgan-slim');
      models['slim'] = {
        2: esrganSlim.default,
        3: esrganSlim.default,
      };
    }
    modelModule = models['slim'][scale as 2 | 3] || models['slim'][2];
  } else {
    if (!models['medium']) {
      const esrganMedium = await import('@upscalerjs/esrgan-medium');
      models['medium'] = {
        4: esrganMedium.default,
        8: esrganMedium.default,
      };
    }
    modelModule = models['medium'][scale as 4 | 8] || models['medium'][4];
  }

  // Dispose old instance if exists
  if (upscalerInstance) {
    try {
      await upscalerInstance.dispose();
    } catch (e) {
      console.warn('Error disposing upscaler:', e);
    }
  }

  // Create new instance
  upscalerInstance = new Upscaler({
    model: modelModule,
  });

  currentScale = scale;
}

/**
 * Warmup the upscaler (preload model)
 */
export async function warmupUpscaler(scale: UpscaleScale = 2): Promise<void> {
  await initUpscaler(scale);

  // Create a tiny test image to warm up the model
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 16, 16);

    try {
      await upscalerInstance.upscale(canvas, {
        output: 'tensor',
        patchSize: 16,
        padding: 0,
      });
    } catch (e) {
      // Warmup might fail, that's ok
      console.warn('Warmup failed:', e);
    }
  }
}

/**
 * Upscale an image using ESRGAN
 */
export async function upscaleImage(
  input: File | Blob | string,
  scale: UpscaleScale = 2,
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading AI model...',
    stage: 'loading'
  });

  // Initialize upscaler
  await initUpscaler(scale);

  onProgress?.({
    progress: 20,
    message: 'Loading image...',
    stage: 'loading'
  });

  // Load image
  const img = await loadImage(input);

  // Check if image is too large
  const maxInputSize = 1024; // Max input dimension for reasonable performance
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Resize if too large
  let inputWidth = img.width;
  let inputHeight = img.height;

  if (img.width > maxInputSize || img.height > maxInputSize) {
    const ratio = Math.min(maxInputSize / img.width, maxInputSize / img.height);
    inputWidth = Math.floor(img.width * ratio);
    inputHeight = Math.floor(img.height * ratio);
  }

  canvas.width = inputWidth;
  canvas.height = inputHeight;
  ctx.drawImage(img, 0, 0, inputWidth, inputHeight);

  onProgress?.({
    progress: 30,
    message: `Upscaling ${scale}x...`,
    stage: 'processing'
  });

  // Calculate patch size based on scale and image size
  // Smaller patches use less memory but are slower
  const patchSize = scale >= 4 ? 32 : 64;
  const padding = Math.floor(patchSize / 4);

  // Track progress during upscaling
  let lastProgress = 30;
  const progressCallback = (progress: number) => {
    const scaledProgress = 30 + Math.floor(progress * 60);
    if (scaledProgress > lastProgress) {
      lastProgress = scaledProgress;
      onProgress?.({
        progress: scaledProgress,
        message: `Upscaling ${scale}x... ${Math.floor(progress * 100)}%`,
        stage: 'processing',
      });
    }
  };

  // Perform upscaling
  const upscaledCanvas = await upscalerInstance.upscale(canvas, {
    output: 'base64',
    patchSize,
    padding,
    progress: progressCallback,
  });

  onProgress?.({
    progress: 95,
    message: 'Finalizing...',
    stage: 'finalizing'
  });

  // Convert base64 to blob
  const response = await fetch(upscaledCanvas);
  const blob = await response.blob();

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing'
  });

  return blob;
}

/**
 * Check if upscaling is supported
 */
export async function isUpscaleSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Check for WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Cleanup upscaler resources
 */
export async function disposeUpscaler(): Promise<void> {
  if (upscalerInstance) {
    try {
      await upscalerInstance.dispose();
    } catch (e) {
      console.warn('Error disposing upscaler:', e);
    }
    upscalerInstance = null;
    currentScale = null;
  }
}
