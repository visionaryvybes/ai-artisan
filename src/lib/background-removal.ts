// Client-side background removal using @imgly/background-removal via dynamic import
// This properly loads the library and its ONNX models

import { ProgressCallback } from './types';

let removeBackgroundFn: ((image: Blob, config?: any) => Promise<Blob>) | null = null;
let loadingPromise: Promise<void> | null = null;
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 2;

/**
 * Dynamically load the background removal library
 */
async function loadLibrary(): Promise<void> {
  if (removeBackgroundFn) return;
  if (loadAttempts >= MAX_LOAD_ATTEMPTS) {
    throw new Error('Background removal library failed to load after multiple attempts');
  }
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    loadAttempts++;

    // Try different CDN sources in order
    const cdnUrls = [
      'https://esm.sh/@imgly/background-removal@1.4.5',
      'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm',
    ];

    let lastError: Error | null = null;

    for (const url of cdnUrls) {
      try {
        console.log(`Attempting to load background removal from: ${url}`);

        // Use Function constructor to avoid TypeScript module resolution issues
        const importFn = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
        const module = await importFn(url);

        // Try different export paths based on CDN
        const fn = module.removeBackground ||
                   module.default?.removeBackground ||
                   module.default;

        if (fn && typeof fn === 'function') {
          removeBackgroundFn = fn;
          console.log('Background removal library loaded successfully from:', url);
          return;
        }

        console.warn('Module loaded but removeBackground not found. Keys:', Object.keys(module));
      } catch (error) {
        console.warn(`Failed to load from ${url}:`, error);
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All CDN sources failed');
  })();

  try {
    await loadingPromise;
  } catch (error) {
    loadingPromise = null; // Reset so we can retry
    throw error;
  }
}

/**
 * Flood fill based background removal
 * More reliable for images with solid or gradient backgrounds
 */
async function floodFillBackgroundRemoval(
  imageBlob: Blob,
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 20,
    message: 'Analyzing background...',
    stage: 'processing',
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const canvas = document.createElement('canvas');
        const width = img.width;
        const height = img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        onProgress?.({
          progress: 30,
          message: 'Sampling border colors...',
          stage: 'processing',
        });

        // Sample colors from all four borders
        const borderPixels: { r: number; g: number; b: number }[] = [];
        const sampleRate = Math.max(1, Math.floor(Math.min(width, height) / 100));

        // Top and bottom
        for (let x = 0; x < width; x += sampleRate) {
          const topIdx = x * 4;
          borderPixels.push({ r: data[topIdx], g: data[topIdx + 1], b: data[topIdx + 2] });

          const bottomIdx = ((height - 1) * width + x) * 4;
          borderPixels.push({ r: data[bottomIdx], g: data[bottomIdx + 1], b: data[bottomIdx + 2] });
        }

        // Left and right
        for (let y = 0; y < height; y += sampleRate) {
          const leftIdx = y * width * 4;
          borderPixels.push({ r: data[leftIdx], g: data[leftIdx + 1], b: data[leftIdx + 2] });

          const rightIdx = (y * width + width - 1) * 4;
          borderPixels.push({ r: data[rightIdx], g: data[rightIdx + 1], b: data[rightIdx + 2] });
        }

        // Find the most common border color (background color)
        const colorCounts = new Map<string, { count: number; r: number; g: number; b: number }>();

        for (const pixel of borderPixels) {
          // Quantize to reduce noise
          const qr = Math.round(pixel.r / 10) * 10;
          const qg = Math.round(pixel.g / 10) * 10;
          const qb = Math.round(pixel.b / 10) * 10;
          const key = `${qr},${qg},${qb}`;

          const existing = colorCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorCounts.set(key, { count: 1, r: qr, g: qg, b: qb });
          }
        }

        // Get the most common color
        let bgColor = { r: 255, g: 255, b: 255 };
        let maxCount = 0;
        for (const entry of colorCounts.values()) {
          if (entry.count > maxCount) {
            maxCount = entry.count;
            bgColor = { r: entry.r, g: entry.g, b: entry.b };
          }
        }

        onProgress?.({
          progress: 50,
          message: 'Creating transparency mask...',
          stage: 'processing',
        });

        // Calculate tolerance based on image variance
        let variance = 0;
        for (const pixel of borderPixels) {
          variance += Math.abs(pixel.r - bgColor.r) + Math.abs(pixel.g - bgColor.g) + Math.abs(pixel.b - bgColor.b);
        }
        const avgVariance = variance / borderPixels.length;
        const baseTolerance = Math.max(25, Math.min(60, avgVariance * 1.5));

        // Create a visited map for flood fill
        const visited = new Uint8Array(width * height);
        const isBackground = new Uint8Array(width * height);

        // Helper to check if a pixel is similar to background
        const isSimilarToBg = (idx: number, tolerance: number) => {
          const dr = Math.abs(data[idx] - bgColor.r);
          const dg = Math.abs(data[idx + 1] - bgColor.g);
          const db = Math.abs(data[idx + 2] - bgColor.b);
          return (dr + dg + db) / 3 < tolerance;
        };

        onProgress?.({
          progress: 60,
          message: 'Flood filling from borders...',
          stage: 'processing',
        });

        // Flood fill from border pixels
        const queue: number[] = [];

        // Add all border pixels that match background color
        for (let x = 0; x < width; x++) {
          const topIdx = x;
          const bottomIdx = (height - 1) * width + x;
          if (isSimilarToBg(topIdx * 4, baseTolerance)) queue.push(topIdx);
          if (isSimilarToBg(bottomIdx * 4, baseTolerance)) queue.push(bottomIdx);
        }
        for (let y = 0; y < height; y++) {
          const leftIdx = y * width;
          const rightIdx = y * width + width - 1;
          if (isSimilarToBg(leftIdx * 4, baseTolerance)) queue.push(leftIdx);
          if (isSimilarToBg(rightIdx * 4, baseTolerance)) queue.push(rightIdx);
        }

        // BFS flood fill
        while (queue.length > 0) {
          const pixelIdx = queue.shift()!;

          if (visited[pixelIdx]) continue;
          visited[pixelIdx] = 1;

          const dataIdx = pixelIdx * 4;
          if (!isSimilarToBg(dataIdx, baseTolerance + 10)) continue;

          isBackground[pixelIdx] = 1;

          const x = pixelIdx % width;
          const y = Math.floor(pixelIdx / width);

          // Check 4-connected neighbors
          if (x > 0 && !visited[pixelIdx - 1]) queue.push(pixelIdx - 1);
          if (x < width - 1 && !visited[pixelIdx + 1]) queue.push(pixelIdx + 1);
          if (y > 0 && !visited[pixelIdx - width]) queue.push(pixelIdx - width);
          if (y < height - 1 && !visited[pixelIdx + width]) queue.push(pixelIdx + width);
        }

        onProgress?.({
          progress: 80,
          message: 'Applying transparency...',
          stage: 'processing',
        });

        // Apply transparency with edge feathering
        for (let i = 0; i < width * height; i++) {
          if (isBackground[i]) {
            data[i * 4 + 3] = 0; // Fully transparent
          }
        }

        // Edge feathering pass
        const tempAlpha = new Uint8ClampedArray(width * height);
        for (let i = 0; i < width * height; i++) {
          tempAlpha[i] = data[i * 4 + 3];
        }

        for (let y = 2; y < height - 2; y++) {
          for (let x = 2; x < width - 2; x++) {
            const idx = y * width + x;

            // Count transparent neighbors in 5x5 area
            let transparentCount = 0;
            let opaqueCount = 0;

            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const neighborIdx = (y + dy) * width + (x + dx);
                if (tempAlpha[neighborIdx] === 0) transparentCount++;
                else opaqueCount++;
              }
            }

            // Feather edges
            if (transparentCount > 0 && opaqueCount > 0) {
              const ratio = opaqueCount / (transparentCount + opaqueCount);
              data[idx * 4 + 3] = Math.round(tempAlpha[idx] * ratio);
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);

        onProgress?.({
          progress: 100,
          message: 'Complete!',
          stage: 'finalizing',
        });

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(img.src);
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/png',
          1
        );
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(imageBlob);
  });
}

/**
 * Remove background from an image
 */
export async function removeImageBackground(
  input: File | Blob | string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Initializing background removal...',
    stage: 'loading',
  });

  // Convert input to blob if needed
  let imageBlob: Blob;
  if (typeof input === 'string') {
    try {
      const response = await fetch(input);
      imageBlob = await response.blob();
    } catch {
      throw new Error('Failed to fetch image');
    }
  } else {
    imageBlob = input;
  }

  // Try the AI library first
  try {
    onProgress?.({
      progress: 5,
      message: 'Loading AI model (this may take a moment on first use)...',
      stage: 'loading',
    });

    await loadLibrary();

    if (!removeBackgroundFn) {
      throw new Error('Library not loaded');
    }

    onProgress?.({
      progress: 15,
      message: 'Processing with AI...',
      stage: 'processing',
    });

    const config = {
      model: 'small' as const,
      output: {
        format: 'image/png' as const,
        quality: 1,
      },
      progress: (key: string, current: number, total: number) => {
        let progress = 15;
        let message = 'Processing...';

        if (key === 'fetch:model') {
          progress = 15 + (current / total) * 25;
          message = 'Downloading AI model...';
        } else if (key === 'compute:inference') {
          progress = 40 + (current / total) * 45;
          message = 'Analyzing image...';
        } else if (key === 'compute:mask') {
          progress = 85 + (current / total) * 10;
          message = 'Creating mask...';
        }

        onProgress?.({
          progress: Math.floor(progress),
          message,
          stage: 'processing',
        });
      },
    };

    const result = await removeBackgroundFn(imageBlob, config);

    onProgress?.({
      progress: 100,
      message: 'Complete!',
      stage: 'finalizing',
    });

    return result;
  } catch (error) {
    console.warn('AI background removal failed, using fallback:', error);

    onProgress?.({
      progress: 15,
      message: 'Using alternative method...',
      stage: 'processing',
    });

    // Use flood-fill based fallback
    return floodFillBackgroundRemoval(imageBlob, onProgress);
  }
}

/**
 * Remove background and replace with a color
 */
export async function removeAndReplaceBackground(
  input: File | Blob | string,
  backgroundColor: string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  const transparentBlob = await removeImageBackground(input, (progress) => {
    onProgress?.({
      progress: Math.floor(progress.progress * 0.8),
      message: progress.message,
      stage: progress.stage,
    });
  });

  onProgress?.({
    progress: 85,
    message: 'Adding background color...',
    stage: 'finalizing',
  });

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(img.src);

      onProgress?.({
        progress: 100,
        message: 'Complete!',
        stage: 'finalizing',
      });

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        },
        'image/png',
        1
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(transparentBlob);
  });
}

/**
 * Check if background removal is supported
 */
export async function isBackgroundRemovalSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

/**
 * Warmup - preload the library
 */
export async function warmupBackgroundRemoval(): Promise<void> {
  try {
    await loadLibrary();
  } catch (e) {
    console.warn('Background removal warmup failed:', e);
  }
}
