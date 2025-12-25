// Core types for AI Artisan

export type ProcessingFunction =
  | 'upscale'
  | 'remove-background'
  | 'enhance'
  | 'colorize'
  | 'denoise'
  | 'deblur'
  | 'low-light'
  | 'retouch'
  | 'depth-map'
  | 'face-enhance'
  | 'style-transfer';

export type UpscaleScale = 2 | 3 | 4 | 8;

export type EnhanceStyle = 'natural' | 'vivid' | 'dramatic';

export type AIModel = 'fast' | 'balanced' | 'quality';

export type EnhancePreset = 'none' | 'cinematic' | 'natural' | 'hdr' | 'portrait' | 'landscape' | 'vintage';

export interface ProcessingOptions {
  // Upscale options
  scale?: UpscaleScale;

  // Enhancement options
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  sharpness?: number; // 0 to 100
  style?: EnhanceStyle;

  // Advanced AI controls (like Krea)
  aiStrength?: number; // 0 to 100 - How much AI processing to apply
  resemblance?: number; // 0 to 100 - How close to original (100 = closest)
  clarity?: number; // 0 to 100 - Detail enhancement
  denoise?: number; // 0 to 100 - Noise reduction strength
  vibrance?: number; // -100 to 100 - Smart saturation
  structure?: number; // 0 to 100 - Edge/structure preservation
  hue?: number; // -180 to 180 - Color hue shift

  // Presets
  preset?: EnhancePreset;

  // Style Transfer
  styleType?: 'oil-painting' | 'watercolor' | 'pencil-sketch' | 'pop-art' | 'vintage-film' | 'cyberpunk' | 'anime' | 'impressionist';

  // Model selection
  aiModel?: AIModel; // Speed vs quality tradeoff

  // Colorize options
  colorIntensity?: number; // 0 to 1

  // Depth map options
  depthColorize?: boolean; // Colorize depth map
  depthInvert?: boolean; // Invert depth values

  // Face enhance options
  faceOnly?: boolean; // Only enhance detected faces

  // General options
  quality?: number; // 0 to 100
  format?: 'png' | 'jpeg' | 'webp';
}

export interface ImageToProcess {
  id: string;
  file: File;
  name: string;
  previewUrl: string;
  originalDimensions?: {
    width: number;
    height: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  progressMessage?: string;
  error?: string;
  processedUrl?: string;
  processedBlob?: Blob;
  processingFunction?: ProcessingFunction;
  options?: ProcessingOptions;
  processingTime?: number;
}

export interface GalleryImage {
  id: string;
  originalName: string;
  thumbnailUrl: string;
  fullUrl: string;
  timestamp: string;
  processingFunction: ProcessingFunction;
  options?: ProcessingOptions;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface ProcessingProgress {
  progress: number;
  message: string;
  stage?: 'loading' | 'processing' | 'finalizing';
}

export type ProgressCallback = (progress: ProcessingProgress) => void;

// Processor interface that all processors implement
export interface ImageProcessor {
  name: string;
  description: string;
  process: (
    input: File | Blob | string,
    options: ProcessingOptions,
    onProgress?: ProgressCallback
  ) => Promise<Blob>;
  isSupported: () => Promise<boolean>;
  warmup?: () => Promise<void>;
}

// Device capability detection
export interface DeviceCapabilities {
  webgl: boolean;
  webgl2: boolean;
  webgpu: boolean;
  sharedArrayBuffer: boolean;
  offscreenCanvas: boolean;
  workers: boolean;
  memory: number; // in GB
  cores: number;
}

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_DIMENSION = 4096; // Max input dimension for processing
