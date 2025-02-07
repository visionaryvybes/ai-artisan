import { NextRequest, NextResponse } from 'next/server';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';
import { MAX_FILE_SIZE } from '@/config/ai-models';

// Configure the maximum request size using route segment config
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 1 minute timeout (hobby plan limit)
export const runtime = 'nodejs';

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
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string);
    const detailStrength = parseFloat(formData.get('detailStrength') as string);
    const style = formData.get('style') as 'realistic' | 'artistic' | 'balanced';
    const scale = parseInt(formData.get('scale') as string) as 2 | 4 | 8 | 16;

    if (!image) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Process the image with optimized settings
    const processedBuffer = await processImage(image, {
      enhance: true,
      enhancementLevel,
      detailGeneration: {
        enabled: true,
        strength: detailStrength,
        style
      },
      resize: {
        scale,
        fit: 'inside'
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