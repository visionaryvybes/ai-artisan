// Client-side image colorization
// Uses canvas-based colorization with intelligent color mapping

import { ProgressCallback } from './types';
import { loadImage } from './enhance';

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Analyze image to detect if it's grayscale
 */
function isGrayscale(imageData: ImageData): boolean {
  const data = imageData.data;
  let colorPixels = 0;
  const sampleSize = Math.min(data.length / 4, 10000);
  const step = Math.floor(data.length / 4 / sampleSize);

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel has significant color
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b)
    );

    if (maxDiff > 15) {
      colorPixels++;
    }
  }

  // If less than 5% of pixels have color, consider it grayscale
  return colorPixels / sampleSize < 0.05;
}

/**
 * Apply intelligent colorization to a grayscale image
 * Uses region-based color mapping based on luminance and position
 */
function applyColorization(
  imageData: ImageData,
  intensity: number = 0.7
): ImageData {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Color palette based on typical photo colors
  // Maps luminance ranges to likely colors
  const colorPalette = [
    // Sky blues (high luminance, top of image)
    { lMin: 180, lMax: 255, yRatio: [0, 0.3], color: { h: 200, s: 60, shift: 0 } },
    // Greens (mid luminance)
    { lMin: 80, lMax: 180, yRatio: [0.3, 0.7], color: { h: 120, s: 40, shift: 20 } },
    // Earth tones (low-mid luminance, bottom)
    { lMin: 40, lMax: 120, yRatio: [0.7, 1], color: { h: 30, s: 35, shift: 15 } },
    // Skin tones (mid luminance, center)
    { lMin: 120, lMax: 200, yRatio: [0.2, 0.8], color: { h: 20, s: 30, shift: 10 } },
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

      // Calculate position ratios
      const yRatio = y / height;
      const xRatio = x / width;

      // Find best matching color from palette
      let bestColor = { h: 0, s: 0 };
      let bestScore = -1;

      for (const palette of colorPalette) {
        if (
          luminance >= palette.lMin &&
          luminance <= palette.lMax &&
          yRatio >= palette.yRatio[0] &&
          yRatio <= palette.yRatio[1]
        ) {
          // Calculate match score
          const lMatch =
            1 - Math.abs(luminance - (palette.lMin + palette.lMax) / 2) / 128;
          const yMatch =
            1 -
            Math.abs(yRatio - (palette.yRatio[0] + palette.yRatio[1]) / 2) /
              0.5;
          const score = lMatch * yMatch;

          if (score > bestScore) {
            bestScore = score;
            // Add some variation based on position
            const hueVariation =
              palette.color.shift * Math.sin(xRatio * Math.PI * 2);
            bestColor = {
              h: palette.color.h + hueVariation,
              s: palette.color.s * intensity,
            };
          }
        }
      }

      // Apply colorization
      if (bestScore > 0) {
        const [, , l] = rgbToHsl(r, g, b);
        const [newR, newG, newB] = hslToRgb(
          bestColor.h,
          bestColor.s * bestScore,
          l
        );

        // Blend with original based on intensity
        const blend = intensity * bestScore;
        data[idx] = Math.round(r * (1 - blend) + newR * blend);
        data[idx + 1] = Math.round(g * (1 - blend) + newG * blend);
        data[idx + 2] = Math.round(b * (1 - blend) + newB * blend);
      }
    }
  }

  return imageData;
}

/**
 * Apply sepia tone effect
 */
function applySepia(imageData: ImageData, intensity: number): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const newR = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
    const newG = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
    const newB = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);

    data[i] = Math.round(r * (1 - intensity) + newR * intensity);
    data[i + 1] = Math.round(g * (1 - intensity) + newG * intensity);
    data[i + 2] = Math.round(b * (1 - intensity) + newB * intensity);
  }

  return imageData;
}

/**
 * Apply warm tone effect
 */
function applyWarmTone(imageData: ImageData, intensity: number): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Increase red, slightly increase green, decrease blue
    data[i] = Math.min(255, data[i] + 20 * intensity);
    data[i + 1] = Math.min(255, data[i + 1] + 10 * intensity);
    data[i + 2] = Math.max(0, data[i + 2] - 20 * intensity);
  }

  return imageData;
}

/**
 * Apply cool tone effect
 */
function applyCoolTone(imageData: ImageData, intensity: number): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Decrease red, increase blue
    data[i] = Math.max(0, data[i] - 15 * intensity);
    data[i + 2] = Math.min(255, data[i + 2] + 25 * intensity);
  }

  return imageData;
}

export type ColorizeMode = 'auto' | 'sepia' | 'warm' | 'cool' | 'vibrant';

/**
 * Colorize an image
 */
export async function colorizeImage(
  input: File | Blob | string,
  intensity: number = 0.7,
  mode: ColorizeMode = 'auto',
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);

  onProgress?.({
    progress: 20,
    message: 'Analyzing image...',
    stage: 'processing',
  });

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

  // Get image data
  let imageData = ctx.getImageData(0, 0, img.width, img.height);

  onProgress?.({
    progress: 40,
    message: 'Applying colorization...',
    stage: 'processing',
  });

  // Check if grayscale for auto mode
  const grayscale = isGrayscale(imageData);

  // Apply colorization based on mode
  switch (mode) {
    case 'auto':
      if (grayscale) {
        // Apply intelligent colorization to grayscale images
        imageData = applyColorization(imageData, intensity);
      } else {
        // Apply vibrance boost to color images
        imageData = applyWarmTone(imageData, intensity * 0.3);
      }
      break;
    case 'sepia':
      imageData = applySepia(imageData, intensity);
      break;
    case 'warm':
      imageData = applyWarmTone(imageData, intensity);
      break;
    case 'cool':
      imageData = applyCoolTone(imageData, intensity);
      break;
    case 'vibrant':
      // Increase saturation
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        const newS = Math.min(100, s * (1 + intensity));
        const [r, g, b] = hslToRgb(h, newS, l);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
      break;
  }

  onProgress?.({
    progress: 80,
    message: 'Finalizing...',
    stage: 'finalizing',
  });

  // Put processed image data back
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onProgress?.({
            progress: 100,
            message: 'Complete!',
            stage: 'finalizing',
          });
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      1
    );
  });
}

/**
 * Check if colorization is supported
 */
export function isColorizeSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof document.createElement('canvas').getContext === 'function';
}
