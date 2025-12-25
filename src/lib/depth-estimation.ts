// Depth estimation - simplified canvas-based approach
// Note: For full AI depth estimation, a dedicated worker setup is needed

import type { ProcessingOptions, ProgressCallback } from './types';

/**
 * Load image from various sources
 */
async function loadImage(input: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    if (input instanceof File || input instanceof Blob) {
      img.src = URL.createObjectURL(input);
    } else {
      img.src = input;
    }
  });
}

/**
 * Simple edge-based depth estimation using Sobel filter
 * This is a simplified approach that creates depth-like visualization
 * based on edge detection and brightness
 */
export async function generateDepthMap(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  onProgress?.({
    progress: 20,
    message: 'Analyzing image structure...',
    stage: 'processing',
  });

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Convert to grayscale first
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i] = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
  }

  onProgress?.({
    progress: 40,
    message: 'Computing depth estimation...',
    stage: 'processing',
  });

  // Apply Sobel edge detection
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Sobel X
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];

      // Sobel Y
      const gy =
        -gray[(y - 1) * width + (x - 1)] +
        -2 * gray[(y - 1) * width + x] +
        -gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  onProgress?.({
    progress: 60,
    message: 'Generating depth visualization...',
    stage: 'processing',
  });

  // Normalize edges
  let maxEdge = 0;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > maxEdge) maxEdge = edges[i];
  }

  // Create depth map based on edges and brightness
  // Higher edges = closer objects (lower depth)
  // Also use brightness as a cue
  const depthData = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const edgeValue = maxEdge > 0 ? edges[i] / maxEdge : 0;
    const brightnessValue = gray[i];

    // Combine edge and brightness for pseudo-depth
    // Objects with more edges tend to be in focus/closer
    depthData[i] = brightnessValue * 0.6 + edgeValue * 0.4;
  }

  onProgress?.({
    progress: 80,
    message: 'Rendering depth map...',
    stage: 'processing',
  });

  const colorize = options.depthColorize !== false;
  const invert = options.depthInvert ?? false;

  // Apply to output
  for (let i = 0; i < width * height; i++) {
    let depth = depthData[i];
    if (invert) depth = 1 - depth;

    const idx = i * 4;

    if (colorize) {
      // Turbo-like colormap
      const r = Math.min(255, Math.max(0, Math.round(255 * (1.5 - Math.abs(depth - 0.75) * 4))));
      const g = Math.min(255, Math.max(0, Math.round(255 * (1.5 - Math.abs(depth - 0.5) * 4))));
      const b = Math.min(255, Math.max(0, Math.round(255 * (1.5 - Math.abs(depth - 0.25) * 4))));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    } else {
      const value = Math.round(depth * 255);
      data[idx] = value;
      data[idx + 1] = value;
      data[idx + 2] = value;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  onProgress?.({
    progress: 100,
    message: 'Complete!',
    stage: 'finalizing',
  });

  return new Promise((resolve, reject) => {
    const format = options.format ?? 'png';
    const quality = (options.quality ?? 95) / 100;

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create depth map'));
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Check if depth estimation is supported
 */
export async function isDepthEstimationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  return true; // Canvas-based approach works everywhere
}

/**
 * Cleanup depth pipeline
 */
export function disposeDepthPipeline() {
  // No cleanup needed for canvas-based approach
}
