import sharp from 'sharp';

interface ProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    scale?: 2 | 4 | 8 | 16;
  };
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  enhance?: boolean;
  enhancementLevel?: number;
  detailGeneration?: {
    enabled: boolean;
    strength: number;
    style: 'realistic' | 'artistic' | 'balanced';
  };
  textureEnhancement?: {
    enabled: boolean;
    strength?: number;  // 0-1: controls texture enhancement
    preservation?: number;  // 0-1: how much of original texture to preserve
  };
  colorize?: boolean;
  colorIntensity?: number;  // 0-1: controls the intensity of colorization
  preserveDetails?: number;  // 0-1: how much of original details to preserve during colorization
  optimizationEffort?: number;
  onProgress?: (progress: number) => void;
}

// Optimized processing parameters for different scales
const SCALE_OPTIMIZATIONS = {
  2: {
    claheSize: 32,  // Smaller window for more local contrast
    recombStrength: 0.15,  // Very gentle detail enhancement
    sharpening: { sigma: 0.3, strength: 0.2 }  // Subtle sharpening
  },
  4: {
    claheSize: 32,
    recombStrength: 0.12,
    sharpening: { sigma: 0.25, strength: 0.15 }
  },
  8: {
    claheSize: 16,
    recombStrength: 0.1,
    sharpening: { sigma: 0.2, strength: 0.1 }
  },
  16: {
    claheSize: 16,
    recombStrength: 0.08,
    sharpening: { sigma: 0.15, strength: 0.08 }
  }
};

function calculateOptimalDimensions(
  width: number, 
  height: number, 
  scale: number = 2
): { width: number; height: number } {
  // Calculate scaled dimensions
  let targetWidth = width * scale;
  let targetHeight = height * scale;
  
  // More aggressive size limits for higher scales
  const MAX_SIZES = {
    2: 8192,
    4: 6144,
    8: 4096,
    16: 3072
  };
  const maxSize = MAX_SIZES[scale as keyof typeof MAX_SIZES] || 8192;
  
  const aspectRatio = width / height;
  
  // If dimensions exceed maxSize, scale down while maintaining aspect ratio
  if (targetWidth > maxSize || targetHeight > maxSize) {
    if (targetWidth > targetHeight) {
      targetWidth = maxSize;
      targetHeight = Math.round(maxSize / aspectRatio);
    } else {
      targetHeight = maxSize;
      targetWidth = Math.round(maxSize * aspectRatio);
    }
  }
  
  // Ensure dimensions are multiples of 32 for optimal processing
  targetWidth = Math.floor(targetWidth / 32) * 32;
  targetHeight = Math.floor(targetHeight / 32) * 32;
  
  return { width: targetWidth, height: targetHeight };
}

export async function processImage(
  inputBuffer: Buffer,
  options: ProcessingOptions = {}
): Promise<Buffer> {
  const startTime = Date.now();
  let pipeline: sharp.Sharp | null = null;

  try {
    // Validate input buffer
    if (!inputBuffer || inputBuffer.length === 0) {
      throw new Error('Invalid input buffer');
    }

    // Create Sharp instance with safe settings
    pipeline = sharp(inputBuffer, {
      failOn: 'none',
      limitInputPixels: 512000000, // Limit to 512MP
      sequentialRead: true,
      pages: 1
    });

    // Get and validate image info
    const metadata = await pipeline.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    if (metadata.width * metadata.height > 512000000) {
      throw new Error('Image dimensions too large');
    }

    const scale = options.resize?.scale || 2;
    
    // Calculate dimensions before processing
    const { width, height } = calculateOptimalDimensions(metadata.width, metadata.height, scale);
    
    // Basic preprocessing
    pipeline = pipeline
      .rotate() // Auto-rotate based on EXIF
      .removeAlpha()
      .resize(width, height, {
        fit: 'contain',
        kernel: 'lanczos3',
        fastShrinkOnLoad: true,
        withoutEnlargement: false
      });

    // Enhancement pipeline
    if (options.enhance) {
      const level = options.enhancementLevel || 1.0;
      
      pipeline = pipeline
        .normalize()
        .modulate({
          brightness: 1 + (level * 0.1),
          saturation: 1 + (level * 0.2)
        });

      if (options.detailGeneration?.enabled) {
        const strength = options.detailGeneration.strength || 0.5;
        pipeline = pipeline
          .sharpen({
            sigma: 0.5 + (strength * 0.5),
            m1: 0.1 + (strength * 0.2),
            m2: 0.1,
            x1: 2,
            y2: 10,
            y3: 20
          });
      }
    }

    // Process final output
    const format = options.format || 'png';
    const formatOptions = {
      quality: options.quality || 90,
      effort: options.optimizationEffort || 4,
      progressive: true,
      chromaSubsampling: '4:4:4'
    };

    let result: Buffer;
    if (format === 'png') {
      result = await pipeline.png(formatOptions as sharp.PngOptions).toBuffer();
    } else if (format === 'jpeg') {
      result = await pipeline.jpeg(formatOptions as sharp.JpegOptions).toBuffer();
    } else {
      result = await pipeline.webp(formatOptions as sharp.WebpOptions).toBuffer();
    }

    if (!result || result.length === 0) {
      throw new Error('Processing resulted in empty buffer');
    }

    return result;
  } catch (error) {
    console.error('Error in image processing:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown processing error');
  } finally {
    if (pipeline) {
      try {
        // @ts-ignore - Destroy is available but not in types
        if (pipeline.destroy) pipeline.destroy();
      } catch (e) {
        console.error('Error destroying pipeline:', e);
      }
    }
  }
}

export async function optimizeImage(
  buffer: Buffer,
  format: 'jpeg' | 'png' | 'webp' = 'webp',
  quality = 90
): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image metadata');
  }
  
  // Calculate optimal dimensions
  const { width, height } = calculateOptimalDimensions(metadata.width, metadata.height);
  
  // Auto-rotate based on EXIF data and resize to optimal dimensions
  image
    .rotate()
    .resize(width, height, {
      fit: 'inside',
      withoutEnlargement: false
    });
  
  // Strip unnecessary metadata but keep color profile
  image.withMetadata({
    orientation: undefined
  });
  
  switch (format) {
    case 'jpeg':
      return image
        .jpeg({
          quality,
          progressive: true,
          chromaSubsampling: '4:4:4',
          mozjpeg: true
        })
        .toBuffer();
    case 'png':
      return image
        .png({
          progressive: true,
          compressionLevel: 9,
          palette: true,
          quality
        })
        .toBuffer();
    case 'webp':
      return image
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
          force: true
        })
        .toBuffer();
    default:
      return buffer;
  }
}

export async function extractFaces(buffer: Buffer): Promise<Buffer[]> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image metadata');
  }
  
  // Use face detection to extract faces
  // This is a placeholder - implement actual face detection
  return [buffer];
}

export async function applyWatermark(
  buffer: Buffer,
  watermarkText: string
): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image metadata');
  }
  
  const width = metadata.width;
  const height = metadata.height;
  
  // Create SVG watermark
  const svg = `
    <svg width="${width}" height="${height}">
      <style>
        .watermark {
          font: bold 24px sans-serif;
          fill: rgba(255, 255, 255, 0.5);
        }
      </style>
      <text
        x="50%"
        y="95%"
        text-anchor="middle"
        class="watermark"
      >${watermarkText}</text>
    </svg>
  `;
  
  return image
    .composite([
      {
        input: Buffer.from(svg),
        gravity: 'center'
      }
    ])
    .toBuffer();
} 