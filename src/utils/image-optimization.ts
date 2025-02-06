interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  enhance?: boolean;
  enhancementLevel?: number;
  detailGeneration?: {
    enabled: boolean;
    strength?: number;
    style?: 'realistic' | 'artistic' | 'balanced';
  };
  textureEnhancement?: {
    enabled: boolean;
    strength?: number;
    preservation?: number;
  };
}

export async function optimizeImage(
  blob: Blob,
  options: OptimizationOptions = {}
): Promise<Blob> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.95,
    format = 'png',
  } = options;

  // Create an image bitmap from the blob
  const imageBitmap = await createImageBitmap(blob);

  // Calculate new dimensions while maintaining aspect ratio
  let width = imageBitmap.width;
  let height = imageBitmap.height;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  // Create a canvas with the new dimensions
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Draw the image onto the canvas
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  // Convert to blob with the specified format and quality
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      `image/${format}`,
      quality
    );
  });
}

export function generateCacheKey(file: File, feature: string): string {
  return `${file.name}-${file.size}-${file.lastModified}-${feature}`;
}

export class ImageCache {
  private cache: Map<string, { blob: Blob; timestamp: number }>;
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 50, maxAge = 24 * 60 * 60 * 1000) { // Default: 50 items, 24 hours
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  set(key: string, blob: Blob): void {
    // Clean up old entries if we're at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      blob,
      timestamp: Date.now(),
    });
  }

  get(key: string): Blob | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if the entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.blob;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Create a singleton instance of the cache
export const imageCache = new ImageCache(); 