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
    strength?: number;  // 0-1: controls how much detail to generate
    style?: 'realistic' | 'artistic' | 'balanced';  // different detail generation styles
  };
  textureEnhancement?: {
    enabled: boolean;
    strength?: number;  // 0-1: controls texture enhancement
    preservation?: number;  // 0-1: how much of original texture to preserve
  };
  colorize?: boolean;
  colorIntensity?: number;  // 0-1: controls the intensity of colorization
  preserveDetails?: number;  // 0-1: how much of original details to preserve during colorization
}

function calculateOptimalDimensions(
  width: number, 
  height: number, 
  scale: number = 2
): { width: number; height: number } {
  // Calculate scaled dimensions
  let targetWidth = width * scale;
  let targetHeight = height * scale;
  
  const maxSize = 8192; // Maximum size supported by most GPUs
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
  file: File | Buffer,
  options: ProcessingOptions = {}
): Promise<Buffer> {
  let buffer: Buffer;
  
  if (Buffer.isBuffer(file)) {
    buffer = file;
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  }

  const image = sharp(buffer, {
    failOnError: false,
    limitInputPixels: false,
    sequentialRead: true
  });
  
  const metadata = await image.metadata();
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Invalid image dimensions');
  }

  // Calculate target dimensions with scaling
  const scale = options.resize?.scale || 2;
  const { width, height } = calculateOptimalDimensions(metadata.width, metadata.height, scale);
  
  // Create processing pipeline with optimized settings
  let pipeline = image
    .resize(width, height, {
      fit: options.resize?.fit || 'inside',
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
      fastShrinkOnLoad: true
    });

  if (options.enhance) {
    const level = options.enhancementLevel || 1.0;
    const detailStrength = options.detailGeneration?.strength || 0.5;
    const style = options.detailGeneration?.style || 'balanced';
    
    // Base enhancement pipeline
    pipeline = pipeline
      .normalize()
      // Enhanced detail generation with better preservation
      .recomb([
        [1.2 + (detailStrength * 0.4), -0.1, -0.1],
        [-0.1, 1.2 + (detailStrength * 0.4), -0.1],
        [-0.1, -0.1, 1.2 + (detailStrength * 0.4)]
      ])
      // Adaptive contrast enhancement
      .linear(
        1.0 + (detailStrength * 0.2),
        -(detailStrength * 5)
      );

    // Style-specific processing
    switch (style) {
      case 'artistic':
        pipeline = pipeline
          .modulate({
            brightness: 1.1,
            saturation: 1.3,
            hue: 5
          })
          .gamma(1.2)
          .clahe({
            width: 128,
            height: 128,
            maxSlope: 4
          });
        break;
      
      case 'realistic':
        pipeline = pipeline
          .modulate({
            brightness: 1.05,
            saturation: 1.1,
            hue: 0
          })
          .gamma(1.1)
          .clahe({
            width: 64,
            height: 64,
            maxSlope: 2
          });
        break;
      
      default: // balanced
        pipeline = pipeline
          .modulate({
            brightness: 1.08,
            saturation: 1.15,
            hue: 2
          })
          .gamma(1.15)
          .clahe({
            width: 96,
            height: 96,
            maxSlope: 3
          });
    }

    // Final detail enhancement
    pipeline = pipeline
      .sharpen({
        sigma: 0.8 + (detailStrength * 0.5),
        m1: 0.5 * level,
        m2: 0.2 * level,
        x1: 2,
        y2: 10,
        y3: 20
      });
  }

  // Set output format and quality
  const format = options.format || 'png';
  const quality = options.quality || 95;
  
  switch (format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({
        quality,
        progressive: true,
        chromaSubsampling: '4:4:4',
        trellisQuantisation: true,
        overshootDeringing: true,
        optimizeScans: true
      });
      break;
    case 'png':
      pipeline = pipeline.png({
        progressive: true,
        compressionLevel: 6, // Reduced for better speed
        palette: false,
        quality,
        dither: 0.0,
        colors: 256
      });
      break;
    case 'webp':
      pipeline = pipeline.webp({
        quality,
        effort: 4, // Reduced for better speed
        smartSubsample: true,
        force: true,
        nearLossless: true
      });
      break;
  }

  try {
    return await pipeline.toBuffer();
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image. Try reducing the image size or using a different format.');
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