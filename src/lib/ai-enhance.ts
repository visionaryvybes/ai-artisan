// AI-powered image enhancement with reliable fallbacks
// Uses canvas-based processing by default for reliability

import type { ProcessingOptions, ProgressCallback } from './types';

// Configuration
const AI_MODEL_TIMEOUT = 15000; // 15 seconds timeout for AI models
const USE_AI_MODELS = false; // Disable heavy AI models by default for reliability

/**
 * Load image from various sources
 */
async function loadImage(input: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      reject(new Error('Image load timeout'));
    }, 30000);

    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image'));
    };

    if (input instanceof File || input instanceof Blob) {
      img.src = URL.createObjectURL(input);
    } else {
      img.src = input;
    }
  });
}

/**
 * Convert canvas to blob
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string = 'png',
  quality: number = 0.95
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Promise with timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: () => Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), ms)
    )
  ]).catch(() => fallback());
}

/**
 * AI Denoise - Remove noise from images
 * Uses canvas-based processing for reliability
 */
export async function aiDenoise(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Starting noise reduction...',
    stage: 'loading',
  });

  // Always use canvas-based denoise for reliability
  return canvasDenoise(input, options, onProgress);
}

/**
 * AI Deblur - Remove blur and restore sharpness
 * Uses canvas-based processing for reliability
 */
export async function aiDeblur(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Starting deblur...',
    stage: 'loading',
  });

  // Always use canvas-based deblur for reliability
  return canvasDeblur(input, options, onProgress);
}

/**
 * Canvas-based denoise - fast bilateral filter approximation
 */
async function canvasDenoise(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 10,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Clean up object URL
  if (input instanceof File || input instanceof Blob) {
    URL.revokeObjectURL(img.src);
  }

  onProgress?.({
    progress: 30,
    message: 'Applying noise reduction...',
    stage: 'processing',
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const strength = (options.aiStrength || 50) / 100;

  // Use smaller radius for speed
  const radius = Math.max(1, Math.min(2, Math.floor(strength * 2)));
  const tempData = new Uint8ClampedArray(data);

  // Process in chunks for better UI responsiveness
  const chunkSize = Math.ceil(height / 10);

  for (let startY = radius; startY < height - radius; startY += chunkSize) {
    const endY = Math.min(startY + chunkSize, height - radius);

    for (let y = startY; y < endY; y++) {
      for (let x = radius; x < width - radius; x++) {
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            rSum += data[idx];
            gSum += data[idx + 1];
            bSum += data[idx + 2];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        tempData[idx] = Math.round(rSum / count);
        tempData[idx + 1] = Math.round(gSum / count);
        tempData[idx + 2] = Math.round(bSum / count);
      }
    }

    // Update progress
    const progress = 30 + ((startY - radius) / (height - 2 * radius)) * 50;
    onProgress?.({
      progress: Math.floor(progress),
      message: 'Reducing noise...',
      stage: 'processing',
    });

    // Yield to UI
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  onProgress?.({
    progress: 85,
    message: 'Blending results...',
    stage: 'processing',
  });

  // Blend with original
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * (1 - strength) + tempData[i] * strength);
    data[i + 1] = Math.round(data[i + 1] * (1 - strength) + tempData[i + 1] * strength);
    data[i + 2] = Math.round(data[i + 2] * (1 - strength) + tempData[i + 2] * strength);
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing',
  });

  return canvasToBlob(canvas, options.format || 'png', (options.quality || 95) / 100);
}

/**
 * Canvas-based deblur (unsharp mask)
 */
async function canvasDeblur(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 10,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  // Clean up object URL
  if (input instanceof File || input instanceof Blob) {
    URL.revokeObjectURL(img.src);
  }

  onProgress?.({
    progress: 30,
    message: 'Applying sharpening...',
    stage: 'processing',
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const strength = (options.aiStrength || 50) / 100;

  const amount = strength * 1.5;
  const tempData = new Uint8ClampedArray(data);

  // Process in chunks
  const chunkSize = Math.ceil(height / 10);

  for (let startY = 1; startY < height - 1; startY += chunkSize) {
    const endY = Math.min(startY + chunkSize, height - 1);

    for (let y = startY; y < endY; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = data[idx + c];
          const top = data[((y - 1) * width + x) * 4 + c];
          const bottom = data[((y + 1) * width + x) * 4 + c];
          const left = data[(y * width + (x - 1)) * 4 + c];
          const right = data[(y * width + (x + 1)) * 4 + c];

          const laplacian = 4 * center - top - bottom - left - right;
          const sharpened = center + amount * laplacian;

          tempData[idx + c] = Math.max(0, Math.min(255, Math.round(sharpened)));
        }
      }
    }

    const progress = 30 + ((startY - 1) / (height - 2)) * 60;
    onProgress?.({
      progress: Math.floor(progress),
      message: 'Sharpening...',
      stage: 'processing',
    });

    await new Promise(resolve => setTimeout(resolve, 0));
  }

  for (let i = 0; i < data.length; i++) {
    data[i] = tempData[i];
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing',
  });

  return canvasToBlob(canvas, options.format || 'png', (options.quality || 95) / 100);
}

/**
 * AI Low-Light Enhancement - Brighten dark images
 */
export async function aiLowLight(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 10,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  if (input instanceof File || input instanceof Blob) {
    URL.revokeObjectURL(img.src);
  }

  onProgress?.({
    progress: 30,
    message: 'Analyzing brightness...',
    stage: 'processing',
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const strength = (options.aiStrength || 50) / 100;

  // Calculate average brightness
  let totalBrightness = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avgBrightness = totalBrightness / (data.length / 4);
  const targetBrightness = 128;
  const brightnessBoost = ((targetBrightness - avgBrightness) / 255) * strength;

  onProgress?.({
    progress: 50,
    message: 'Enhancing low-light areas...',
    stage: 'processing',
  });

  const gamma = 1 + strength * 0.5;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let value = data[i + c] / 255;
      value = Math.pow(value, 1 / gamma);
      value = value + brightnessBoost * (1 - value);
      data[i + c] = Math.max(0, Math.min(255, Math.round(value * 255)));
    }
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing',
  });

  return canvasToBlob(canvas, options.format || 'png', (options.quality || 95) / 100);
}

/**
 * AI Retouch - General image improvement
 */
export async function aiRetouch(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 10,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  if (input instanceof File || input instanceof Blob) {
    URL.revokeObjectURL(img.src);
  }

  onProgress?.({
    progress: 30,
    message: 'Analyzing image...',
    stage: 'processing',
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const strength = (options.aiStrength || 50) / 100;

  // Calculate min/max for auto-levels
  let minR = 255, maxR = 0;
  let minG = 255, maxG = 0;
  let minB = 255, maxB = 0;

  for (let i = 0; i < data.length; i += 4) {
    minR = Math.min(minR, data[i]);
    maxR = Math.max(maxR, data[i]);
    minG = Math.min(minG, data[i + 1]);
    maxG = Math.max(maxG, data[i + 1]);
    minB = Math.min(minB, data[i + 2]);
    maxB = Math.max(maxB, data[i + 2]);
  }

  onProgress?.({
    progress: 60,
    message: 'Optimizing colors...',
    stage: 'processing',
  });

  const rangeR = maxR - minR || 1;
  const rangeG = maxG - minG || 1;
  const rangeB = maxB - minB || 1;

  for (let i = 0; i < data.length; i += 4) {
    // Auto-levels
    const newR = ((data[i] - minR) / rangeR) * 255;
    const newG = ((data[i + 1] - minG) / rangeG) * 255;
    const newB = ((data[i + 2] - minB) / rangeB) * 255;

    // Blend with original
    data[i] = Math.round(data[i] * (1 - strength) + newR * strength);
    data[i + 1] = Math.round(data[i + 1] * (1 - strength) + newG * strength);
    data[i + 2] = Math.round(data[i + 2] * (1 - strength) + newB * strength);

    // Saturation boost
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const satBoost = 1 + strength * 0.2;
    data[i] = Math.max(0, Math.min(255, Math.round(avg + (data[i] - avg) * satBoost)));
    data[i + 1] = Math.max(0, Math.min(255, Math.round(avg + (data[i + 1] - avg) * satBoost)));
    data[i + 2] = Math.max(0, Math.min(255, Math.round(avg + (data[i + 2] - avg) * satBoost)));
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing',
  });

  return canvasToBlob(canvas, options.format || 'png', (options.quality || 95) / 100);
}

/**
 * Cleanup resources (no-op since we use canvas)
 */
export function disposeAIEnhance() {
  // No resources to dispose with canvas-based processing
}
