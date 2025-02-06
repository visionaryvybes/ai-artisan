import { NextRequest, NextResponse } from 'next/server';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
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

    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process the image locally using sharp
    const processedBuffer = await processImage(buffer, {
      format: 'webp',
      quality: 90,
      enhance: true, // This will help with the colorization effect
      resize: {
        width: 1024,
        height: 1024,
        fit: 'inside'
      }
    });

    // Return processed image
    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000',
        'Content-Length': processedBuffer.length.toString()
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process image'
      },
      { status: 500 }
    );
  }
}

// Configure the maximum request size
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}; 