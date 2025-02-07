import { NextRequest, NextResponse } from 'next/server';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';
import { configureSharp, cleanupSharp } from '@/utils/sharp-config';

// Configure server settings
export const dynamic = 'force-dynamic';
export const maxDuration = 600;
export const runtime = 'nodejs';

// Configure processing limits based on scale
const SCALE_CONFIGS = {
  2: {
    maxSize: 10 * 1024 * 1024,
    timeout: 60000,
    quality: 90,
    effort: 2
  },
  4: {
    maxSize: 8 * 1024 * 1024,
    timeout: 120000,
    quality: 85,
    effort: 2
  },
  8: {
    maxSize: 5 * 1024 * 1024,
    timeout: 180000,
    quality: 80,
    effort: 1
  },
  16: {
    maxSize: 3 * 1024 * 1024,
    timeout: 300000,
    quality: 75,
    effort: 1
  }
};

// Initialize Sharp once at module level
let isSharpInitialized = false;

async function ensureSharpInitialized() {
  if (!isSharpInitialized) {
    try {
      await configureSharp();
      isSharpInitialized = true;
      console.log('Sharp initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sharp:', error);
      throw error;
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let currentStage = 'initialization';
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    // Initialize Sharp
    currentStage = 'sharp-initialization';
    await ensureSharpInitialized();

    // Parse and validate form data
    currentStage = 'form-data-parsing';
    const formData = await request.formData();
    const file = formData.get('image');
    
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ 
        error: 'No valid image provided',
        details: 'Please provide a valid image file'
      }, { status: 400 });
    }

    // Get and validate parameters
    currentStage = 'parameter-validation';
    const scale = Number(formData.get('scale')) || 2;
    const enhancementLevel = Number(formData.get('enhancementLevel')) || 1.0;
    const detailStrength = Number(formData.get('detailStrength')) || 0.5;
    const style = formData.get('style') as 'realistic' | 'artistic' | 'balanced' || 'balanced';

    // Validate scale
    if (![2, 4, 8, 16].includes(scale)) {
      return NextResponse.json({ 
        error: 'Invalid scale factor',
        details: 'Scale must be one of: 2, 4, 8, 16'
      }, { status: 400 });
    }

    // Validate enhancement parameters
    if (enhancementLevel < 0.1 || enhancementLevel > 2.0) {
      return NextResponse.json({ 
        error: 'Invalid enhancement level',
        details: 'Enhancement level must be between 0.1 and 2.0'
      }, { status: 400 });
    }

    if (detailStrength < 0.1 || detailStrength > 1.0) {
      return NextResponse.json({ 
        error: 'Invalid detail strength',
        details: 'Detail strength must be between 0.1 and 1.0'
      }, { status: 400 });
    }

    // Validate file size
    currentStage = 'file-size-validation';
    const maxSize = (11 - scale) * 1024 * 1024; // Dynamic size limit based on scale
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json({ 
        error: 'File too large',
        details: `For ${scale}x scaling, image size must be under ${maxMB}MB`
      }, { status: 400 });
    }

    // Convert to buffer
    currentStage = 'buffer-conversion';
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ 
        error: 'Empty image buffer',
        details: 'The uploaded image appears to be empty'
      }, { status: 400 });
    }

    // Set processing timeout
    const timeout = scale * 30000; // 30 seconds per scale factor
    timeoutId = setTimeout(() => {
      throw new Error('Processing timeout');
    }, timeout);

    // Process the image
    currentStage = 'image-processing';
    console.log('Processing image:', {
      scale,
      enhancementLevel,
      detailStrength,
      style,
      size: buffer.length
    });

    const processedBuffer = await processImage(buffer, {
      enhance: true,
      enhancementLevel,
      detailGeneration: {
        enabled: true,
        strength: detailStrength,
        style
      },
      resize: {
        scale: scale as 2 | 4 | 8 | 16,
        fit: 'contain'
      },
      format: 'png',
      quality: 90
    });

    // Clear timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Validate output
    if (!processedBuffer || processedBuffer.length === 0) {
      throw new Error('Processing resulted in empty output');
    }

    // Return processed image
    const processingTime = Date.now() - startTime;
    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': processedBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Processing-Time': processingTime.toString(),
        'X-Processing-Scale': scale.toString()
      }
    });

  } catch (error) {
    // Clear timeout if it exists
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`Enhancement failed at stage: ${currentStage}`);
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Processing timeout') {
        return NextResponse.json({ 
          error: 'Processing timeout',
          details: `The operation took too long to complete at stage: ${currentStage}`,
          stage: currentStage
        }, { status: 408 });
      }

      return NextResponse.json({ 
        error: 'Enhancement failed',
        details: error.message,
        stage: currentStage
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Enhancement failed',
      details: 'An unexpected error occurred',
      stage: currentStage
    }, { status: 500 });

  } finally {
    try {
      await cleanupSharp();
    } catch (cleanupError) {
      console.error('Failed to clean up Sharp resources:', cleanupError);
    }
  }
} 