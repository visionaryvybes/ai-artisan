import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { processImage } from '@/utils/server/image-processing';
import { defaultRateLimiter } from '@/utils/rate-limit';

// Configure server settings
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout
export const runtime = 'nodejs';

// Configure memory limit for Sharp
sharp.cache(false); // Disable sharp cache to prevent memory issues
sharp.concurrency(1); // Limit concurrent processing

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
    const file = formData.get('image') as Blob;
    const colorIntensity = Number(formData.get('colorIntensity')) || 0.5;
    const preserveDetails = Number(formData.get('preserveDetails')) || 0.7;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate file size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File size must be under 10MB for colorization.'
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Process the image with timeout
    const timeoutMs = 60000; // 1 minute timeout for colorization
    const processedBuffer = await Promise.race([
      processImage(buffer, {
        colorize: true,
        colorIntensity,
        preserveDetails,
        format: 'png',
        quality: 100
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), timeoutMs)
      )
    ]) as Buffer;

    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': processedBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });
  } catch (error) {
    console.error('Colorization error:', error);
    return NextResponse.json({ 
      error: 'Failed to colorize image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Clean up Sharp cache
    sharp.cache(false);
  }
} 