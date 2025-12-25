// Pure canvas-based background removal
// Uses saliency detection and color analysis - no external dependencies

import { ProgressCallback } from './types';

/**
 * Remove background from an image using saliency-based detection
 */
export async function removeImageBackground(
  input: File | Blob | string,
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading image...',
    stage: 'loading',
  });

  // Convert input to blob
  let imageBlob: Blob;
  if (typeof input === 'string') {
    const response = await fetch(input);
    imageBlob = await response.blob();
  } else {
    imageBlob = input;
  }

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

        onProgress?.({
          progress: 15,
          message: 'Analyzing image colors...',
          stage: 'processing',
        });

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const pixelCount = width * height;

        // Step 1: Convert to Lab-like color space and compute statistics
        const labL = new Float32Array(pixelCount);
        const labA = new Float32Array(pixelCount);
        const labB = new Float32Array(pixelCount);

        for (let i = 0; i < pixelCount; i++) {
          const r = data[i * 4] / 255;
          const g = data[i * 4 + 1] / 255;
          const b = data[i * 4 + 2] / 255;

          // Simplified RGB to Lab
          labL[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          labA[i] = r - g;
          labB[i] = (r + g) / 2 - b;
        }

        onProgress?.({
          progress: 25,
          message: 'Detecting background...',
          stage: 'processing',
        });

        // Step 2: Sample border pixels to identify background
        const borderSamples: { l: number; a: number; b: number }[] = [];
        const borderWidth = Math.max(5, Math.floor(Math.min(width, height) / 30));

        // Top and bottom borders
        for (let x = 0; x < width; x++) {
          for (let y = 0; y < borderWidth; y++) {
            const idx = y * width + x;
            borderSamples.push({ l: labL[idx], a: labA[idx], b: labB[idx] });
          }
          for (let y = height - borderWidth; y < height; y++) {
            const idx = y * width + x;
            borderSamples.push({ l: labL[idx], a: labA[idx], b: labB[idx] });
          }
        }

        // Left and right borders
        for (let y = borderWidth; y < height - borderWidth; y++) {
          for (let x = 0; x < borderWidth; x++) {
            const idx = y * width + x;
            borderSamples.push({ l: labL[idx], a: labA[idx], b: labB[idx] });
          }
          for (let x = width - borderWidth; x < width; x++) {
            const idx = y * width + x;
            borderSamples.push({ l: labL[idx], a: labA[idx], b: labB[idx] });
          }
        }

        // Calculate background statistics
        let bgL = 0, bgA = 0, bgB = 0;
        for (const s of borderSamples) {
          bgL += s.l;
          bgA += s.a;
          bgB += s.b;
        }
        bgL /= borderSamples.length;
        bgA /= borderSamples.length;
        bgB /= borderSamples.length;

        // Calculate standard deviations
        let varL = 0, varA = 0, varB = 0;
        for (const s of borderSamples) {
          varL += (s.l - bgL) ** 2;
          varA += (s.a - bgA) ** 2;
          varB += (s.b - bgB) ** 2;
        }
        const stdL = Math.sqrt(varL / borderSamples.length) + 0.05;
        const stdA = Math.sqrt(varA / borderSamples.length) + 0.05;
        const stdB = Math.sqrt(varB / borderSamples.length) + 0.05;

        onProgress?.({
          progress: 40,
          message: 'Computing saliency map...',
          stage: 'processing',
        });

        // Step 3: Compute saliency map
        // Saliency = color distance from background + distance from mean
        const saliency = new Float32Array(pixelCount);

        // Calculate image mean
        let meanL = 0, meanA = 0, meanB = 0;
        for (let i = 0; i < pixelCount; i++) {
          meanL += labL[i];
          meanA += labA[i];
          meanB += labB[i];
        }
        meanL /= pixelCount;
        meanA /= pixelCount;
        meanB /= pixelCount;

        const centerX = width / 2;
        const centerY = height / 2;
        const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = y * width + x;

            // Color distance from background (normalized)
            const bgDist = Math.sqrt(
              ((labL[idx] - bgL) / stdL) ** 2 +
              ((labA[idx] - bgA) / stdA) ** 2 +
              ((labB[idx] - bgB) / stdB) ** 2
            );

            // Color distance from mean (uniqueness)
            const meanDist = Math.sqrt(
              (labL[idx] - meanL) ** 2 +
              (labA[idx] - meanA) ** 2 +
              (labB[idx] - meanB) ** 2
            );

            // Spatial prior - objects tend to be in center
            const spatialDist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / maxDist;
            const spatialWeight = Math.exp(-spatialDist * spatialDist * 3);

            // Combined saliency
            saliency[idx] = (bgDist * 0.5 + meanDist * 3 + spatialWeight * 0.8);
          }
        }

        // Normalize saliency
        let maxSal = 0;
        for (let i = 0; i < pixelCount; i++) {
          maxSal = Math.max(maxSal, saliency[i]);
        }
        for (let i = 0; i < pixelCount; i++) {
          saliency[i] /= maxSal;
        }

        onProgress?.({
          progress: 55,
          message: 'Refining detection...',
          stage: 'processing',
        });

        // Step 4: Apply adaptive thresholding with Otsu's method
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < pixelCount; i++) {
          const bin = Math.min(255, Math.floor(saliency[i] * 255));
          histogram[bin]++;
        }

        // Otsu's threshold
        let sumAll = 0;
        for (let i = 0; i < 256; i++) sumAll += i * histogram[i];

        let sumB = 0, wB = 0, wF = 0;
        let maxVariance = 0, threshold = 128;

        for (let t = 0; t < 256; t++) {
          wB += histogram[t];
          if (wB === 0) continue;
          wF = pixelCount - wB;
          if (wF === 0) break;

          sumB += t * histogram[t];
          const mB = sumB / wB;
          const mF = (sumAll - sumB) / wF;
          const variance = wB * wF * (mB - mF) ** 2;

          if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
          }
        }

        const normalizedThreshold = threshold / 255;

        onProgress?.({
          progress: 70,
          message: 'Creating mask...',
          stage: 'processing',
        });

        // Step 5: Create initial mask with soft edges
        const mask = new Float32Array(pixelCount);
        const softness = 0.15;

        for (let i = 0; i < pixelCount; i++) {
          if (saliency[i] > normalizedThreshold + softness) {
            mask[i] = 1;
          } else if (saliency[i] < normalizedThreshold - softness) {
            mask[i] = 0;
          } else {
            mask[i] = (saliency[i] - (normalizedThreshold - softness)) / (2 * softness);
          }
        }

        onProgress?.({
          progress: 80,
          message: 'Smoothing edges...',
          stage: 'processing',
        });

        // Step 6: Gaussian blur for smooth edges
        const blurred = new Float32Array(pixelCount);
        const radius = 3;
        const sigma = 2;

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let sum = 0, weightSum = 0;

            for (let ky = -radius; ky <= radius; ky++) {
              for (let kx = -radius; kx <= radius; kx++) {
                const ny = Math.min(height - 1, Math.max(0, y + ky));
                const nx = Math.min(width - 1, Math.max(0, x + kx));
                const weight = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
                sum += mask[ny * width + nx] * weight;
                weightSum += weight;
              }
            }

            blurred[y * width + x] = sum / weightSum;
          }
        }

        onProgress?.({
          progress: 90,
          message: 'Applying transparency...',
          stage: 'finalizing',
        });

        // Step 7: Apply mask to alpha channel
        for (let i = 0; i < pixelCount; i++) {
          data[i * 4 + 3] = Math.round(blurred[i] * 255);
        }

        ctx.putImageData(imageData, 0, 0);
        URL.revokeObjectURL(img.src);

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
  return true;
}

/**
 * Warmup - no-op for canvas-based approach
 */
export async function warmupBackgroundRemoval(): Promise<void> {
  // No warmup needed for canvas-based approach
}
