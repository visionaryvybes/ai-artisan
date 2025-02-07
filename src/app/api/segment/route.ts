import { NextRequest, NextResponse } from 'next/server';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';

export const maxDuration = 60; // 1 minute timeout
export const dynamic = 'force-dynamic';

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
    const image = formData.get('image') as File;
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Process the image with segmentation-specific settings
    const processedBuffer = await processImage(image, {
      enhance: true,
      enhancementLevel,
      detailGeneration: {
        enabled: true,
        strength: 0.6,
        style: 'balanced'
      },
      format: 'png',
      quality: 100
    });

    // Return processed image
    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable'
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