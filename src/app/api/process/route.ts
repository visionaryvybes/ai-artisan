import { NextRequest, NextResponse } from 'next/server';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';
import { configureSharp, cleanupSharp } from '@/utils/sharp-config';

// Configure server settings
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout
export const runtime = 'nodejs';

// Configure processing limits based on scale
const SCALE_CONFIGS = {
  2: {
    maxSize: 10 * 1024 * 1024,
    timeout: 30000,  // Increased timeout
    quality: 90,
    effort: 2
  },
  4: {
    maxSize: 8 * 1024 * 1024,
    timeout: 45000,  // Increased timeout
    quality: 85,
    effort: 2
  },
  8: {
    maxSize: 5 * 1024 * 1024,
    timeout: 60000,  // Increased timeout
    quality: 80,
    effort: 1
  },
  16: {
    maxSize: 3 * 1024 * 1024,
    timeout: 90000,  // Increased timeout
    quality: 75,
    effort: 1
  }
};

// Initialize Sharp with optimal settings
try {
  configureSharp();
  console.log('Sharp initialized successfully');
} catch (error) {
  console.error('Failed to initialize Sharp:', error);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const controller = new AbortController();
  let currentStage = 'initialization';

  try {
    // Apply rate limiting
    currentStage = 'rate-limiting';
    const isAllowed = await defaultRateLimiter.check(request);
    if (!isAllowed) {
      return NextResponse.json(
        { 
          error: 'Too many requests',
          retryAfter: defaultRateLimiter.getRemainingRequests(request)
        },
        { status: 429 }
      );
    }

    // Parse form data
    currentStage = 'form-data-parsing';
    const formData = await request.formData();
    const file = formData.get('image') as Blob;
    
    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate configuration
    currentStage = 'configuration-validation';
    const scale = Number(formData.get('scale')) || 2;
    const scaleConfig = SCALE_CONFIGS[scale as keyof typeof SCALE_CONFIGS];

    if (!scaleConfig) {
      return NextResponse.json({ error: 'Invalid scale factor' }, { status: 400 });
    }

    // Validate file size
    currentStage = 'file-size-validation';
    if (file.size > scaleConfig.maxSize) {
      const maxMB = scaleConfig.maxSize / (1024 * 1024);
      return NextResponse.json({ 
        error: `For ${scale}x scaling, image size must be under ${maxMB}MB. Please choose a smaller image or lower scale.`
      }, { status: 400 });
    }

    // Convert to buffer
    currentStage = 'buffer-conversion';
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log(`Image size: ${buffer.length} bytes`);
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      console.error(`Processing timeout after ${scaleConfig.timeout}ms`);
      controller.abort();
    }, scaleConfig.timeout);

    // Process the image
    currentStage = 'image-processing';
    console.log('Starting image processing with options:', {
      scale,
      enhancementLevel: Number(formData.get('enhancementLevel')) || 1.0,
      detailStrength: Number(formData.get('detailStrength')) || 0.5,
      style: formData.get('style') || 'balanced'
    });

    const processedBuffer = await processImage(buffer, {
      enhance: true,
      enhancementLevel: Number(formData.get('enhancementLevel')) || 1.0,
      detailGeneration: {
        enabled: true,
        strength: Number(formData.get('detailStrength')) || 0.5,
        style: (formData.get('style') as 'realistic' | 'artistic' | 'balanced') || 'balanced'
      },
      resize: {
        scale: scale as 2 | 4 | 8 | 16,
        fit: 'contain'
      },
      format: 'png',
      quality: scaleConfig.quality,
      optimizationEffort: scaleConfig.effort,
      onProgress: (progress) => {
        console.log(`Processing progress: ${progress}%`);
      }
    });

    clearTimeout(timeoutId);

    // Prepare response
    currentStage = 'response-preparation';
    const processingTime = Date.now() - startTime;
    const cacheAge = scale <= 4 ? 31536000 : 7776000;

    console.log(`Processing completed successfully in ${processingTime}ms`);

    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': processedBuffer.length.toString(),
        'Cache-Control': `public, max-age=${cacheAge}, immutable`,
        'X-Processing-Time': processingTime.toString()
      }
    });
  } catch (error) {
    console.error(`Processing failed at stage: ${currentStage}`);
    console.error('Error details:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json({ 
          error: 'Processing timeout',
          details: 'The operation took too long to complete',
          stage: currentStage
        }, { status: 408 });
      }

      return NextResponse.json({ 
        error: 'Failed to process image',
        details: error.message,
        stage: currentStage,
        name: error.name
      }, { status: 500 });
    }

    return NextResponse.json({ 
      error: 'Failed to process image',
      details: 'Unknown error occurred',
      stage: currentStage
    }, { status: 500 });
  } finally {
    try {
      cleanupSharp();
      console.log('Sharp resources cleaned up');
    } catch (cleanupError) {
      console.error('Failed to clean up Sharp resources:', cleanupError);
    }
  }
} 