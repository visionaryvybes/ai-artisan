// Style Transfer using canvas-based artistic effects
// Provides various artistic styles without heavy ML models

import { ProcessingOptions, ProgressCallback } from './types';

export type StyleType =
  | 'oil-painting'
  | 'watercolor'
  | 'pencil-sketch'
  | 'pop-art'
  | 'vintage-film'
  | 'cyberpunk'
  | 'anime'
  | 'impressionist';

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
 * Apply oil painting effect
 */
function applyOilPainting(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const radius = Math.max(2, Math.floor(intensity / 25));
  const levels = Math.max(8, Math.floor(32 - intensity / 4));

  const output = new Uint8ClampedArray(data);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const intensityCount: number[] = new Array(levels).fill(0);
      const avgR: number[] = new Array(levels).fill(0);
      const avgG: number[] = new Array(levels).fill(0);
      const avgB: number[] = new Array(levels).fill(0);

      // Sample neighborhood
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const curIntensity = Math.floor((r + g + b) / 3 * levels / 256);
          const level = Math.min(levels - 1, curIntensity);

          intensityCount[level]++;
          avgR[level] += r;
          avgG[level] += g;
          avgB[level] += b;
        }
      }

      // Find most common intensity
      let maxCount = 0;
      let maxIndex = 0;
      for (let i = 0; i < levels; i++) {
        if (intensityCount[i] > maxCount) {
          maxCount = intensityCount[i];
          maxIndex = i;
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = avgR[maxIndex] / maxCount;
      output[idx + 1] = avgG[maxIndex] / maxCount;
      output[idx + 2] = avgB[maxIndex] / maxCount;
    }
  }

  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply watercolor effect
 */
function applyWatercolor(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  // Apply blur for softness
  const blurAmount = Math.max(1, intensity / 20);
  ctx.filter = `blur(${blurAmount}px) saturate(1.3)`;
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.drawImage(ctx.canvas, 0, 0);
  ctx.filter = 'none';
  ctx.drawImage(tempCanvas, 0, 0);

  // Add texture/grain effect
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Reduce color palette
    const factor = 32;
    data[i] = Math.round(data[i] / factor) * factor;
    data[i + 1] = Math.round(data[i + 1] / factor) * factor;
    data[i + 2] = Math.round(data[i + 2] / factor) * factor;

    // Add subtle paper texture
    const noise = (Math.random() - 0.5) * intensity * 0.3;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply pencil sketch effect
 */
function applyPencilSketch(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale first
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  // Invert
  const inverted = gray.map(v => 255 - v);

  // Simple edge detection using Sobel-like filter
  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx =
        -inverted[idx - width - 1] - 2 * inverted[idx - 1] - inverted[idx + width - 1] +
        inverted[idx - width + 1] + 2 * inverted[idx + 1] + inverted[idx + width + 1];
      const gy =
        -inverted[idx - width - 1] - 2 * inverted[idx - width] - inverted[idx - width + 1] +
        inverted[idx + width - 1] + 2 * inverted[idx + width] + inverted[idx + width + 1];
      edges[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Combine with original for sketch effect
  const blend = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;
    const edge = Math.min(255, edges[idx] * 2);
    const sketch = 255 - edge;
    const original = gray[idx];

    // Blend sketch with light gray tones from original
    const value = sketch * blend + original * 0.3 * (1 - blend);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply pop art effect
 */
function applyPopArt(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Pop art color palette
  const colors = [
    [255, 0, 128],   // Pink
    [0, 255, 255],   // Cyan
    [255, 255, 0],   // Yellow
    [255, 128, 0],   // Orange
    [128, 0, 255],   // Purple
    [0, 255, 0],     // Green
  ];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    // Map to pop art color based on luminance
    const colorIdx = Math.floor(lum / 256 * colors.length);
    const color = colors[Math.min(colorIdx, colors.length - 1)];

    // Boost saturation and contrast
    const blend = intensity / 100;
    data[i] = r * (1 - blend) + color[0] * blend;
    data[i + 1] = g * (1 - blend) + color[1] * blend;
    data[i + 2] = b * (1 - blend) + color[2] * blend;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply vintage film effect
 */
function applyVintageFilm(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const blend = intensity / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Sepia/warm tint
    const tr = 0.393 * r + 0.769 * g + 0.189 * b;
    const tg = 0.349 * r + 0.686 * g + 0.168 * b;
    const tb = 0.272 * r + 0.534 * g + 0.131 * b;

    r = r * (1 - blend) + tr * blend;
    g = g * (1 - blend) + tg * blend;
    b = b * (1 - blend) + tb * blend;

    // Add grain
    const grain = (Math.random() - 0.5) * 30 * blend;
    r += grain;
    g += grain;
    b += grain;

    // Vignette
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);
    const cx = width / 2;
    const cy = height / 2;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const maxDist = Math.sqrt(cx ** 2 + cy ** 2);
    const vignette = 1 - (dist / maxDist) * 0.5 * blend;

    data[i] = Math.max(0, Math.min(255, r * vignette));
    data[i + 1] = Math.max(0, Math.min(255, g * vignette));
    data[i + 2] = Math.max(0, Math.min(255, b * vignette));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply cyberpunk effect
 */
function applyCyberpunk(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const blend = intensity / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // High contrast
    r = ((r / 255 - 0.5) * 1.5 + 0.5) * 255;
    g = ((g / 255 - 0.5) * 1.5 + 0.5) * 255;
    b = ((b / 255 - 0.5) * 1.5 + 0.5) * 255;

    // Neon color shift (cyan/magenta split toning)
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (lum < 128) {
      // Shadows to cyan
      r = r * (1 - blend * 0.3);
      g = g * (1 - blend * 0.1);
      b = Math.min(255, b * (1 + blend * 0.4));
    } else {
      // Highlights to magenta
      r = Math.min(255, r * (1 + blend * 0.3));
      g = g * (1 - blend * 0.2);
      b = Math.min(255, b * (1 + blend * 0.2));
    }

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply anime/cartoon effect
 */
function applyAnime(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Reduce color palette (cell shading)
  const levels = Math.max(4, 16 - Math.floor(intensity / 10));

  // Edge detection for outlines
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
  }

  const edges = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + width] - gray[idx - width]);
      edges[idx] = gx + gy;
    }
  }

  // Apply cell shading and edges
  for (let i = 0; i < data.length; i += 4) {
    const idx = i / 4;

    // Posterize colors
    data[i] = Math.round(data[i] / (256 / levels)) * (256 / levels);
    data[i + 1] = Math.round(data[i + 1] / (256 / levels)) * (256 / levels);
    data[i + 2] = Math.round(data[i + 2] / (256 / levels)) * (256 / levels);

    // Boost saturation
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = Math.min(255, data[i] + (data[i] - avg) * 0.3);
    data[i + 1] = Math.min(255, data[i + 1] + (data[i + 1] - avg) * 0.3);
    data[i + 2] = Math.min(255, data[i + 2] + (data[i + 2] - avg) * 0.3);

    // Add black edges
    const edgeThreshold = 50 - intensity * 0.3;
    if (edges[idx] > edgeThreshold) {
      const edgeStrength = Math.min(1, edges[idx] / 100);
      data[i] *= (1 - edgeStrength);
      data[i + 1] *= (1 - edgeStrength);
      data[i + 2] *= (1 - edgeStrength);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply impressionist effect
 */
function applyImpressionist(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data);

  const brushSize = Math.max(2, Math.floor(intensity / 15));

  // Apply brush stroke simulation
  for (let y = brushSize; y < height - brushSize; y += brushSize / 2) {
    for (let x = brushSize; x < width - brushSize; x += brushSize / 2) {
      const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Random brush direction
      const angle = Math.random() * Math.PI * 2;
      const length = brushSize * (0.5 + Math.random() * 0.5);

      // Draw brush stroke
      for (let t = 0; t < length; t++) {
        const px = Math.floor(x + Math.cos(angle) * t);
        const py = Math.floor(y + Math.sin(angle) * t);

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const pidx = (py * width + px) * 4;
          // Add color variation
          const variation = (Math.random() - 0.5) * 30;
          output[pidx] = Math.max(0, Math.min(255, r + variation));
          output[pidx + 1] = Math.max(0, Math.min(255, g + variation));
          output[pidx + 2] = Math.max(0, Math.min(255, b + variation));
        }
      }
    }
  }

  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Apply style transfer to an image
 */
export async function applyStyleTransfer(
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
  const blobUrl = input instanceof File || input instanceof Blob ? img.src : null;

  onProgress?.({
    progress: 20,
    message: 'Applying style...',
    stage: 'processing',
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const style = (options.styleType as StyleType) || 'oil-painting';
  const intensity = options.aiStrength ?? 50;

  onProgress?.({
    progress: 40,
    message: `Applying ${style.replace('-', ' ')} effect...`,
    stage: 'processing',
  });

  // Apply the selected style
  switch (style) {
    case 'oil-painting':
      applyOilPainting(ctx, img.width, img.height, intensity);
      break;
    case 'watercolor':
      applyWatercolor(ctx, img.width, img.height, intensity);
      break;
    case 'pencil-sketch':
      applyPencilSketch(ctx, img.width, img.height, intensity);
      break;
    case 'pop-art':
      applyPopArt(ctx, img.width, img.height, intensity);
      break;
    case 'vintage-film':
      applyVintageFilm(ctx, img.width, img.height, intensity);
      break;
    case 'cyberpunk':
      applyCyberpunk(ctx, img.width, img.height, intensity);
      break;
    case 'anime':
      applyAnime(ctx, img.width, img.height, intensity);
      break;
    case 'impressionist':
      applyImpressionist(ctx, img.width, img.height, intensity);
      break;
  }

  onProgress?.({
    progress: 80,
    message: 'Finalizing...',
    stage: 'finalizing',
  });

  // Clean up
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        onProgress?.({
          progress: 100,
          message: 'Complete!',
          stage: 'finalizing',
        });
        if (blob) resolve(blob);
        else reject(new Error('Failed to create output'));
      },
      'image/png',
      1
    );
  });
}

/**
 * Check if style transfer is supported
 */
export function isStyleTransferSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!document.createElement('canvas').getContext('2d');
}

/**
 * Get available styles
 */
export function getAvailableStyles(): Array<{ id: StyleType; name: string; description: string }> {
  return [
    { id: 'oil-painting', name: 'Oil Painting', description: 'Classic oil painting look with visible brush strokes' },
    { id: 'watercolor', name: 'Watercolor', description: 'Soft, dreamy watercolor effect' },
    { id: 'pencil-sketch', name: 'Pencil Sketch', description: 'Hand-drawn pencil sketch style' },
    { id: 'pop-art', name: 'Pop Art', description: 'Bold, colorful pop art style' },
    { id: 'vintage-film', name: 'Vintage Film', description: 'Nostalgic film photography look' },
    { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon-lit futuristic aesthetic' },
    { id: 'anime', name: 'Anime', description: 'Japanese animation style' },
    { id: 'impressionist', name: 'Impressionist', description: 'Impressionist painting style' },
  ];
}
