// WebGL-accelerated image effects using glfx.js
// Provides GPU-powered sharpness, clarity, denoise, and color adjustments

import type { ProcessingOptions, ProgressCallback } from './types';

// Type declarations for glfx-es6
interface GlfxTexture {
  destroy(): void;
  loadContentsOf(image: HTMLImageElement | HTMLCanvasElement): void;
}

interface GlfxCanvas extends HTMLCanvasElement {
  draw(texture: GlfxTexture, width?: number, height?: number): GlfxCanvas;
  texture(image: HTMLImageElement | HTMLCanvasElement): GlfxTexture;
  brightnessContrast(brightness: number, contrast: number): GlfxCanvas;
  hueSaturation(hue: number, saturation: number): GlfxCanvas;
  vibrance(amount: number): GlfxCanvas;
  denoise(exponent: number): GlfxCanvas;
  unsharpMask(radius: number, strength: number): GlfxCanvas;
  noise(amount: number): GlfxCanvas;
  sepia(amount: number): GlfxCanvas;
  vignette(size: number, amount: number): GlfxCanvas;
  curves(red: number[][], green: number[][], blue: number[][]): GlfxCanvas;
  update(): GlfxCanvas;
}

interface Glfx {
  canvas(): GlfxCanvas;
}

let glfxModule: any = null;

async function loadGlfx(): Promise<any> {
  if (glfxModule) return glfxModule;

  // Dynamically import glfx-es6
  // @ts-ignore - glfx-es6 doesn't have proper type definitions
  const fx = await import('glfx-es6');
  glfxModule = fx.default || fx;
  return glfxModule;
}

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
 * Apply WebGL effects to an image
 */
export async function applyWebGLEffects(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading WebGL effects engine...',
    stage: 'loading',
  });

  const fx = await loadGlfx();

  onProgress?.({
    progress: 10,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);

  onProgress?.({
    progress: 20,
    message: 'Initializing GPU processing...',
    stage: 'processing',
  });

  // Create WebGL canvas
  const canvas = fx.canvas();
  const texture = canvas.texture(img);

  // Start with the base image
  canvas.draw(texture);

  let effectsApplied = 0;
  const totalEffects = 6;

  // Apply brightness and contrast
  const brightness = (options.brightness ?? 0) / 100;
  const contrast = (options.contrast ?? 0) / 100;
  if (brightness !== 0 || contrast !== 0) {
    canvas.brightnessContrast(brightness, contrast);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Adjusting brightness/contrast...',
      stage: 'processing',
    });
  }

  // Apply hue and saturation
  const hue = (options.hue ?? 0) / 180; // Convert to -1 to 1 range
  const saturation = (options.saturation ?? 0) / 100;
  if (hue !== 0 || saturation !== 0) {
    canvas.hueSaturation(hue, saturation);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Adjusting colors...',
      stage: 'processing',
    });
  }

  // Apply vibrance
  const vibrance = (options.vibrance ?? 0) / 100;
  if (vibrance !== 0) {
    canvas.vibrance(vibrance);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Enhancing vibrance...',
      stage: 'processing',
    });
  }

  // Apply denoise
  const denoise = options.denoise ?? 0;
  if (denoise > 0) {
    // Map 0-100 to reasonable denoise exponent (0-50)
    const denoiseExponent = (denoise / 100) * 50;
    canvas.denoise(denoiseExponent);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Reducing noise...',
      stage: 'processing',
    });
  }

  // Apply sharpness (unsharp mask)
  const sharpness = options.sharpness ?? 0;
  if (sharpness > 0) {
    // Map sharpness to radius and strength
    const radius = 1 + (sharpness / 100) * 19; // 1-20
    const strength = (sharpness / 100) * 2; // 0-2
    canvas.unsharpMask(radius, strength);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Sharpening details...',
      stage: 'processing',
    });
  }

  // Apply clarity (enhanced local contrast via curves)
  const clarity = options.clarity ?? 0;
  if (clarity > 0) {
    // Clarity is achieved through S-curve contrast enhancement
    const amount = (clarity / 100) * 0.3;
    const lowPoint = 0.25 - amount * 0.25;
    const highPoint = 0.75 + amount * 0.25;
    const curve = [
      [0, 0],
      [0.25, lowPoint],
      [0.5, 0.5],
      [0.75, highPoint],
      [1, 1],
    ];
    canvas.curves(curve, curve, curve);
    effectsApplied++;
    onProgress?.({
      progress: 20 + (effectsApplied / totalEffects) * 50,
      message: 'Enhancing clarity...',
      stage: 'processing',
    });
  }

  // Render final result
  canvas.update();

  onProgress?.({
    progress: 80,
    message: 'Finalizing...',
    stage: 'finalizing',
  });

  // Apply resemblance (blend with original)
  const resemblance = options.resemblance ?? 80;

  // Convert canvas to blob, then blend if needed
  return new Promise((resolve, reject) => {
    const format = options.format ?? 'png';
    const quality = (options.quality ?? 95) / 100;
    const mimeType = `image/${format === 'jpeg' ? 'jpeg' : format}`;

    // If resemblance is 100%, return original
    if (resemblance >= 100) {
      texture.destroy();
      if (input instanceof File || input instanceof Blob) {
        resolve(input as Blob);
      } else {
        // Convert original image to blob
        const origCanvas = document.createElement('canvas');
        origCanvas.width = img.width;
        origCanvas.height = img.height;
        const ctx = origCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        origCanvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create output'));
          },
          mimeType,
          quality
        );
      }
      return;
    }

    // If resemblance < 100%, blend processed with original
    if (resemblance > 0 && resemblance < 100) {
      canvas.toBlob(
        (processedBlob: Blob | null) => {
          texture.destroy();

          if (!processedBlob) {
            reject(new Error('Failed to create output image'));
            return;
          }

          // Blend with original based on resemblance
          const blendCanvas = document.createElement('canvas');
          blendCanvas.width = img.width;
          blendCanvas.height = img.height;
          const ctx = blendCanvas.getContext('2d')!;

          // Draw original first
          ctx.globalAlpha = resemblance / 100;
          ctx.drawImage(img, 0, 0);

          // Draw processed on top
          const processedImg = new Image();
          processedImg.onload = () => {
            ctx.globalAlpha = 1 - (resemblance / 100);
            ctx.drawImage(processedImg, 0, 0);
            URL.revokeObjectURL(processedImg.src);

            blendCanvas.toBlob(
              (finalBlob) => {
                onProgress?.({
                  progress: 100,
                  message: 'Complete!',
                  stage: 'finalizing',
                });
                if (finalBlob) resolve(finalBlob);
                else reject(new Error('Failed to blend images'));
              },
              mimeType,
              quality
            );
          };
          processedImg.src = URL.createObjectURL(processedBlob);
        },
        mimeType,
        quality
      );
      return;
    }

    // resemblance = 0, return fully processed
    canvas.toBlob(
      (blob: Blob | null) => {
        texture.destroy();

        if (blob) {
          onProgress?.({
            progress: 100,
            message: 'Complete!',
            stage: 'finalizing',
          });
          resolve(blob);
        } else {
          reject(new Error('Failed to create output image'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Check if WebGL is supported
 */
export function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Quick preview with reduced quality for real-time adjustments
 */
export async function previewWebGLEffects(
  input: HTMLImageElement | HTMLCanvasElement,
  options: ProcessingOptions
): Promise<HTMLCanvasElement> {
  const fx = await loadGlfx();
  const canvas = fx.canvas();
  const texture = canvas.texture(input);

  canvas.draw(texture);

  // Apply all effects
  const brightness = (options.brightness ?? 0) / 100;
  const contrast = (options.contrast ?? 0) / 100;
  if (brightness !== 0 || contrast !== 0) {
    canvas.brightnessContrast(brightness, contrast);
  }

  const hue = (options.hue ?? 0) / 180;
  const saturation = (options.saturation ?? 0) / 100;
  if (hue !== 0 || saturation !== 0) {
    canvas.hueSaturation(hue, saturation);
  }

  const vibrance = (options.vibrance ?? 0) / 100;
  if (vibrance !== 0) {
    canvas.vibrance(vibrance);
  }

  const denoise = options.denoise ?? 0;
  if (denoise > 0) {
    canvas.denoise((denoise / 100) * 50);
  }

  const sharpness = options.sharpness ?? 0;
  if (sharpness > 0) {
    const radius = 1 + (sharpness / 100) * 19;
    const strength = (sharpness / 100) * 2;
    canvas.unsharpMask(radius, strength);
  }

  const clarity = options.clarity ?? 0;
  if (clarity > 0) {
    const amount = (clarity / 100) * 0.3;
    const lowPoint = 0.25 - amount * 0.25;
    const highPoint = 0.75 + amount * 0.25;
    const curve = [
      [0, 0],
      [0.25, lowPoint],
      [0.5, 0.5],
      [0.75, highPoint],
      [1, 1],
    ];
    canvas.curves(curve, curve, curve);
  }

  canvas.update();
  texture.destroy();

  return canvas;
}
