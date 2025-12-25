// Main image processor - orchestrates all AI processing

import {
  ProcessingFunction,
  ProcessingOptions,
  ProgressCallback,
  ImageProcessor,
} from './types';
import { enhanceImage } from './enhance';
import { upscaleImage, isUpscaleSupported, warmupUpscaler } from './upscaler';
import {
  removeImageBackground,
  isBackgroundRemovalSupported,
  warmupBackgroundRemoval,
} from './background-removal';
import { colorizeImage, isColorizeSupported, ColorizeMode } from './colorize';
import { applyWebGLEffects, isWebGLSupported } from './webgl-effects';
import { aiDenoise, aiDeblur, aiLowLight, aiRetouch } from './ai-enhance';
import { generateDepthMap, isDepthEstimationSupported } from './depth-estimation';
import { enhanceFaces, isFaceEnhanceSupported } from './face-enhance';
import { applyStyleTransfer, isStyleTransferSupported } from './style-transfer';
import { detectCapabilities, DeviceCapabilities } from './device';

// Processor registry
const processors: Record<ProcessingFunction, ImageProcessor> = {
  upscale: {
    name: 'AI Upscale',
    description: 'Increase image resolution using ESRGAN AI models',
    process: async (input, options, onProgress) => {
      return upscaleImage(input as File | Blob | string, options.scale || 2, onProgress);
    },
    isSupported: isUpscaleSupported,
    warmup: () => warmupUpscaler(2),
  },
  'remove-background': {
    name: 'Remove Background',
    description: 'AI-powered background removal',
    process: async (input, options, onProgress) => {
      return removeImageBackground(input as File | Blob | string, onProgress);
    },
    isSupported: isBackgroundRemovalSupported,
    warmup: warmupBackgroundRemoval,
  },
  enhance: {
    name: 'Enhance',
    description: 'GPU-accelerated image enhancement with advanced controls',
    process: async (input, options, onProgress) => {
      // Use WebGL effects if available for better performance
      if (isWebGLSupported()) {
        return applyWebGLEffects(input as File | Blob | string, options, onProgress);
      }
      // Fall back to canvas-based enhancement
      return enhanceImage(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => true,
  },
  colorize: {
    name: 'Colorize',
    description: 'Add or adjust image colors',
    process: async (input, options, onProgress) => {
      return colorizeImage(
        input as File | Blob | string,
        options.colorIntensity || 0.7,
        'auto',
        onProgress
      );
    },
    isSupported: async () => isColorizeSupported(),
  },
  denoise: {
    name: 'AI Denoise',
    description: 'Remove noise and grain using MAXIM AI',
    process: async (input, options, onProgress) => {
      return aiDenoise(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => isWebGLSupported(),
  },
  deblur: {
    name: 'AI Deblur',
    description: 'Remove blur and restore sharpness using AI',
    process: async (input, options, onProgress) => {
      return aiDeblur(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => isWebGLSupported(),
  },
  'low-light': {
    name: 'Low Light Enhancement',
    description: 'Brighten dark images with AI',
    process: async (input, options, onProgress) => {
      return aiLowLight(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => isWebGLSupported(),
  },
  retouch: {
    name: 'AI Retouch',
    description: 'General image improvement with AI',
    process: async (input, options, onProgress) => {
      return aiRetouch(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => isWebGLSupported(),
  },
  'depth-map': {
    name: 'Depth Map',
    description: 'Generate depth visualization using Depth Anything AI',
    process: async (input, options, onProgress) => {
      return generateDepthMap(input as File | Blob | string, options, onProgress);
    },
    isSupported: isDepthEstimationSupported,
  },
  'face-enhance': {
    name: 'Face Enhance',
    description: 'Detect and enhance faces in images',
    process: async (input, options, onProgress) => {
      return enhanceFaces(input as File | Blob | string, options, onProgress);
    },
    isSupported: isFaceEnhanceSupported,
  },
  'style-transfer': {
    name: 'Style Transfer',
    description: 'Apply artistic styles like oil painting, watercolor, anime, and more',
    process: async (input, options, onProgress) => {
      return applyStyleTransfer(input as File | Blob | string, options, onProgress);
    },
    isSupported: async () => isStyleTransferSupported(),
  },
};

/**
 * Process an image with the specified function
 */
export async function processImage(
  input: File | Blob | string,
  processingFunction: ProcessingFunction,
  options: ProcessingOptions = {},
  onProgress?: ProgressCallback
): Promise<Blob> {
  const processor = processors[processingFunction];

  if (!processor) {
    throw new Error(`Unknown processing function: ${processingFunction}`);
  }

  // Check if supported
  const supported = await processor.isSupported();
  if (!supported) {
    throw new Error(
      `${processor.name} is not supported on this device. Please try a different browser or device.`
    );
  }

  // Process the image
  return processor.process(input, options, onProgress);
}

/**
 * Check if a processing function is supported
 */
export async function isProcessingSupported(
  processingFunction: ProcessingFunction
): Promise<boolean> {
  const processor = processors[processingFunction];
  if (!processor) return false;
  return processor.isSupported();
}

/**
 * Get processor info
 */
export function getProcessorInfo(processingFunction: ProcessingFunction) {
  return processors[processingFunction];
}

/**
 * Warmup all processors
 */
export async function warmupProcessors(
  onProgress?: (message: string) => void
): Promise<void> {
  for (const [name, processor] of Object.entries(processors)) {
    if (processor.warmup) {
      onProgress?.(`Warming up ${processor.name}...`);
      try {
        await processor.warmup();
      } catch (e) {
        console.warn(`Failed to warmup ${name}:`, e);
      }
    }
  }
  onProgress?.('Ready!');
}

/**
 * Get all available processors
 */
export async function getAvailableProcessors(): Promise<
  Array<{ key: ProcessingFunction; name: string; description: string; supported: boolean }>
> {
  const results = await Promise.all(
    Object.entries(processors).map(async ([key, processor]) => ({
      key: key as ProcessingFunction,
      name: processor.name,
      description: processor.description,
      supported: await processor.isSupported(),
    }))
  );

  return results;
}

/**
 * Validate an image file
 */
export function validateImage(
  file: File
): { valid: boolean; error?: string } {
  const maxSize = 20 * 1024 * 1024; // 20MB
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image smaller than 20MB.',
    };
  }

  return { valid: true };
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  input: File | Blob | string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      if (typeof input !== 'string') {
        URL.revokeObjectURL(img.src);
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));

    if (typeof input === 'string') {
      img.src = input;
    } else {
      img.src = URL.createObjectURL(input);
    }
  });
}

/**
 * Convert blob to data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Re-export types and utilities
export * from './types';
export { detectCapabilities } from './device';
export type { DeviceCapabilities } from './device';
export type { ColorizeMode } from './colorize';
