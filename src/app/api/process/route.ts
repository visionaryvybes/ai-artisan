import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum allowed for Hobby plan
export const runtime = 'nodejs'; // Use Node.js runtime for Sharp

export async function POST(request: NextRequest) {
  try {
    // Log request headers
    const headers = Object.fromEntries(request.headers.entries());
    console.log('Request headers:', headers);

    const formData = await request.formData();
    const image = formData.get('image') as File;
    const feature = formData.get('feature') as string || 'enhance';
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;

    if (!image) {
      return NextResponse.json({ 
        error: 'No image provided',
        details: 'The image file is missing from the request' 
      }, { status: 400 });
    }

    if (!(image instanceof File)) {
      return NextResponse.json({ 
        error: 'Invalid image format',
        details: `Expected File, got ${typeof image}`
      }, { status: 400 });
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large',
        details: `Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB, got: ${image.size / 1024 / 1024}MB`
      }, { status: 400 });
    }

    try {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate buffer
      if (!buffer || buffer.length === 0) {
        return NextResponse.json({ 
          error: 'Invalid image data',
          details: 'Failed to convert image to buffer'
        }, { status: 400 });
      }

      // Basic image validation
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        return NextResponse.json({ 
          error: 'Invalid image',
          details: 'Could not read image dimensions'
        }, { status: 400 });
      }

      // Process image with minimal operations
      const processedBuffer = await sharp(buffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();

      return new NextResponse(processedBuffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'no-cache',
          'Content-Length': processedBuffer.length.toString()
        }
      });

    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      return NextResponse.json({ 
        error: 'Image processing failed',
        details: sharpError instanceof Error ? sharpError.message : 'Unknown Sharp error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 