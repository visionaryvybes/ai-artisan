// Face enhancement using face-api.js for detection and canvas for enhancement
// Detects faces and applies targeted enhancement

import type { ProcessingOptions, ProgressCallback } from './types';

let faceApiLoaded = false;

/**
 * Load face-api.js models
 */
async function loadFaceApi(onProgress?: (progress: number) => void) {
  if (faceApiLoaded) return;

  const faceapi = await import('@vladmandic/face-api');

  // Load models from CDN
  const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1/model';

  onProgress?.(10);

  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
  onProgress?.(40);

  await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
  onProgress?.(70);

  await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
  onProgress?.(100);

  faceApiLoaded = true;
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
 * Apply smoothing to a face region
 */
function applyFaceSmoothing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  intensity: number = 0.5
) {
  // Get the face region
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  // Apply bilateral-like smoothing (simplified)
  const radius = Math.max(1, Math.floor(Math.min(width, height) * 0.02 * intensity));

  if (radius < 1) return;

  const tempData = new Uint8ClampedArray(data);

  for (let py = radius; py < height - radius; py++) {
    for (let px = radius; px < width - radius; px++) {
      let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
      const idx = (py * width + px) * 4;
      const centerR = data[idx];
      const centerG = data[idx + 1];
      const centerB = data[idx + 2];

      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const nIdx = ((py + ky) * width + (px + kx)) * 4;
          const nR = data[nIdx];
          const nG = data[nIdx + 1];
          const nB = data[nIdx + 2];

          // Bilateral weight based on color similarity
          const colorDist = Math.sqrt(
            Math.pow(nR - centerR, 2) +
            Math.pow(nG - centerG, 2) +
            Math.pow(nB - centerB, 2)
          );
          const colorWeight = Math.exp(-colorDist / (50 * intensity));

          // Spatial weight
          const spatialDist = Math.sqrt(kx * kx + ky * ky);
          const spatialWeight = Math.exp(-spatialDist / radius);

          const weight = colorWeight * spatialWeight;
          rSum += nR * weight;
          gSum += nG * weight;
          bSum += nB * weight;
          wSum += weight;
        }
      }

      tempData[idx] = Math.round(rSum / wSum);
      tempData[idx + 1] = Math.round(gSum / wSum);
      tempData[idx + 2] = Math.round(bSum / wSum);
    }
  }

  // Blend with original based on intensity
  const blend = intensity;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * (1 - blend) + tempData[i] * blend);
    data[i + 1] = Math.round(data[i + 1] * (1 - blend) + tempData[i + 1] * blend);
    data[i + 2] = Math.round(data[i + 2] * (1 - blend) + tempData[i + 2] * blend);
  }

  ctx.putImageData(imageData, x, y);
}

/**
 * Apply brightness/contrast enhancement to a region
 */
function enhanceRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  brightness: number = 0,
  contrast: number = 0
) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    // Apply brightness
    data[i] = Math.min(255, Math.max(0, data[i] + brightness));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + brightness));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + brightness));

    // Apply contrast
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }

  ctx.putImageData(imageData, x, y);
}

/**
 * Enhance faces in an image
 */
export async function enhanceFaces(
  input: File | Blob | string,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  onProgress?.({
    progress: 0,
    message: 'Loading face detection models...',
    stage: 'loading',
  });

  await loadFaceApi((progress) => {
    onProgress?.({
      progress: progress * 0.2,
      message: 'Downloading face models...',
      stage: 'loading',
    });
  });

  onProgress?.({
    progress: 20,
    message: 'Loading image...',
    stage: 'loading',
  });

  const img = await loadImage(input);
  const faceapi = await import('@vladmandic/face-api');

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  onProgress?.({
    progress: 30,
    message: 'Detecting faces...',
    stage: 'processing',
  });

  // Detect faces with landmarks
  const detections = await faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceExpressions();

  if (detections.length === 0) {
    onProgress?.({
      progress: 100,
      message: 'No faces detected',
      stage: 'finalizing',
    });

    // Return original image if no faces found
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to create output'))),
        `image/${options.format ?? 'png'}`,
        (options.quality ?? 95) / 100
      );
    });
  }

  onProgress?.({
    progress: 50,
    message: `Enhancing ${detections.length} face(s)...`,
    stage: 'processing',
  });

  // Process each face
  const aiStrength = (options.aiStrength ?? 50) / 100;

  for (let i = 0; i < detections.length; i++) {
    const detection = detections[i];
    const box = detection.detection.box;

    // Expand box slightly for better coverage
    const padding = Math.min(box.width, box.height) * 0.2;
    const x = Math.max(0, Math.floor(box.x - padding));
    const y = Math.max(0, Math.floor(box.y - padding));
    const width = Math.min(canvas.width - x, Math.floor(box.width + padding * 2));
    const height = Math.min(canvas.height - y, Math.floor(box.height + padding * 2));

    // Apply face smoothing (skin smoothing effect)
    applyFaceSmoothing(ctx, x, y, width, height, aiStrength * 0.5);

    // Subtle brightness/contrast enhancement
    enhanceRegion(ctx, x, y, width, height, 5 * aiStrength, 10 * aiStrength);

    onProgress?.({
      progress: 50 + ((i + 1) / detections.length) * 40,
      message: `Enhanced face ${i + 1} of ${detections.length}`,
      stage: 'processing',
    });
  }

  onProgress?.({
    progress: 95,
    message: 'Finalizing...',
    stage: 'finalizing',
  });

  return new Promise((resolve, reject) => {
    const format = options.format ?? 'png';
    const quality = (options.quality ?? 95) / 100;

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
          reject(new Error('Failed to create output'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

/**
 * Check if face enhancement is supported
 */
export async function isFaceEnhanceSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Check for WebGL support (required for face-api)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}
