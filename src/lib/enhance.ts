// Client-side image enhancement using Canvas API

import { ProcessingOptions, ProgressCallback } from './types';

/**
 * Load an image from a File, Blob, or URL
 */
export async function loadImage(
  input: File | Blob | string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof input === 'string') {
      img.src = input;
    } else {
      img.src = URL.createObjectURL(input);
    }
  });
}

/**
 * Apply brightness adjustment
 */
function applyBrightness(
  imageData: ImageData,
  brightness: number
): ImageData {
  const data = imageData.data;
  const factor = (brightness / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, data[i] + factor)); // R
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor)); // G
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor)); // B
  }

  return imageData;
}

/**
 * Apply contrast adjustment
 */
function applyContrast(imageData: ImageData, contrast: number): ImageData {
  const data = imageData.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }

  return imageData;
}

/**
 * Apply saturation adjustment
 */
function applySaturation(
  imageData: ImageData,
  saturation: number
): ImageData {
  const data = imageData.data;
  const factor = 1 + saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = Math.min(255, Math.max(0, gray + factor * (data[i] - gray)));
    data[i + 1] = Math.min(255, Math.max(0, gray + factor * (data[i + 1] - gray)));
    data[i + 2] = Math.min(255, Math.max(0, gray + factor * (data[i + 2] - gray)));
  }

  return imageData;
}

/**
 * Apply sharpening using convolution
 */
function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
): void {
  if (amount === 0) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const copy = new Uint8ClampedArray(data);
  const strength = amount / 100;

  // Sharpening kernel
  const kernel = [
    0, -strength, 0,
    -strength, 1 + 4 * strength, -strength,
    0, -strength, 0,
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let val = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            val += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.min(255, Math.max(0, val));
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply style presets
 */
function applyStylePreset(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  style: 'natural' | 'vivid' | 'dramatic'
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  let data = imageData;

  switch (style) {
    case 'vivid':
      data = applySaturation(data, 30);
      data = applyContrast(data, 15);
      break;
    case 'dramatic':
      data = applyContrast(data, 25);
      data = applySaturation(data, 20);
      data = applyBrightness(data, -5);
      break;
    case 'natural':
    default:
      // Subtle auto-enhance
      data = applyContrast(data, 5);
      data = applySaturation(data, 5);
      break;
  }

  ctx.putImageData(data, 0, 0);
}

/**
 * Auto-enhance image using histogram equalization
 */
function autoEnhance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Calculate histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.round(
      0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    );
    histogram[luminance]++;
  }

  // Calculate CDF
  const cdf = new Array(256);
  cdf[0] = histogram[0];
  for (let i = 1; i < 256; i++) {
    cdf[i] = cdf[i - 1] + histogram[i];
  }

  // Normalize CDF
  const cdfMin = cdf.find((v) => v > 0) || 0;
  const totalPixels = width * height;
  const lookup = new Array(256);
  for (let i = 0; i < 256; i++) {
    lookup[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
  }

  // Apply equalization with blending (50% strength for natural look)
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const original = data[i + c];
      const enhanced = lookup[data[i + c]];
      data[i + c] = Math.round(original * 0.5 + enhanced * 0.5);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Main enhance function
 */
export async function enhanceImage(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({ progress: 0, message: 'Loading image...', stage: 'loading' });

  const img = await loadImage(input);

  onProgress?.({ progress: 20, message: 'Applying enhancements...', stage: 'processing' });

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Apply auto-enhance if no specific adjustments
  const hasAdjustments =
    options.brightness !== undefined ||
    options.contrast !== undefined ||
    options.saturation !== undefined;

  if (!hasAdjustments) {
    autoEnhance(ctx, img.width, img.height);
  }

  onProgress?.({ progress: 40, message: 'Processing adjustments...', stage: 'processing' });

  // Get image data for pixel manipulation
  let imageData = ctx.getImageData(0, 0, img.width, img.height);

  // Apply individual adjustments
  if (options.brightness !== undefined && options.brightness !== 0) {
    imageData = applyBrightness(imageData, options.brightness);
  }

  if (options.contrast !== undefined && options.contrast !== 0) {
    imageData = applyContrast(imageData, options.contrast);
  }

  if (options.saturation !== undefined && options.saturation !== 0) {
    imageData = applySaturation(imageData, options.saturation);
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({ progress: 60, message: 'Applying sharpening...', stage: 'processing' });

  // Apply sharpening
  if (options.sharpness !== undefined && options.sharpness > 0) {
    applySharpen(ctx, img.width, img.height, options.sharpness);
  }

  // Apply style preset
  if (options.style) {
    applyStylePreset(ctx, img.width, img.height, options.style);
  }

  onProgress?.({ progress: 80, message: 'Finalizing...', stage: 'finalizing' });

  // Convert to blob
  const format = options.format || 'png';
  const quality = (options.quality || 90) / 100;
  const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.({ progress: 100, message: 'Complete!', stage: 'finalizing' });
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      mimeType,
      quality
    );
  });
}
