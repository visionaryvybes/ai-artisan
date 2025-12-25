// Device capability detection for optimal processing

import { DeviceCapabilities } from './types';

// Re-export types for convenience
export type { DeviceCapabilities } from './types';

let cachedCapabilities: DeviceCapabilities | null = null;

export async function detectCapabilities(): Promise<DeviceCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const capabilities: DeviceCapabilities = {
    webgl: false,
    webgl2: false,
    webgpu: false,
    sharedArrayBuffer: false,
    offscreenCanvas: false,
    workers: false,
    memory: 4, // Default assumption
    cores: navigator.hardwareConcurrency || 4,
  };

  // Check WebGL support
  try {
    const canvas = document.createElement('canvas');
    capabilities.webgl = !!(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    );
    capabilities.webgl2 = !!canvas.getContext('webgl2');
  } catch {
    // WebGL not available
  }

  // Check WebGPU support
  try {
    if ('gpu' in navigator) {
      const gpu = (navigator as any).gpu;
      if (gpu) {
        const adapter = await gpu.requestAdapter();
        capabilities.webgpu = !!adapter;
      }
    }
  } catch {
    // WebGPU not available
  }

  // Check SharedArrayBuffer
  capabilities.sharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Check OffscreenCanvas
  capabilities.offscreenCanvas = typeof OffscreenCanvas !== 'undefined';

  // Check Web Workers
  capabilities.workers = typeof Worker !== 'undefined';

  // Estimate available memory
  if ('deviceMemory' in navigator) {
    capabilities.memory = (navigator as any).deviceMemory || 4;
  }

  cachedCapabilities = capabilities;
  return capabilities;
}

export function getRecommendedBatchSize(capabilities: DeviceCapabilities): number {
  // Recommend batch size based on device memory
  if (capabilities.memory >= 8) return 4;
  if (capabilities.memory >= 4) return 2;
  return 1;
}

export function getRecommendedMaxScale(capabilities: DeviceCapabilities): number {
  // Recommend max upscale based on device capabilities
  if (capabilities.webgpu && capabilities.memory >= 8) return 8;
  if (capabilities.webgl2 && capabilities.memory >= 4) return 4;
  return 2;
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function estimateProcessingTime(
  imageSize: number,
  operation: string,
  capabilities: DeviceCapabilities
): number {
  // Rough estimation in seconds
  const baseTime = {
    upscale: 10,
    'remove-background': 8,
    enhance: 2,
    colorize: 6,
  };

  const base = baseTime[operation as keyof typeof baseTime] || 5;
  const sizeMultiplier = Math.max(1, imageSize / (1024 * 1024)); // per MB
  const capabilityMultiplier = capabilities.webgpu
    ? 0.5
    : capabilities.webgl2
    ? 1
    : 2;

  return Math.ceil(base * sizeMultiplier * capabilityMultiplier);
}
