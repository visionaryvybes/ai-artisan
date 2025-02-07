import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum allowed for Hobby plan
export const runtime = 'nodejs'; // Use Node.js runtime for Sharp

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const feature = formData.get('feature') as string || 'enhance';
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Basic image processing with minimal operations
    const processedImage = sharp(buffer, {
      failOnError: false,
      limitInputPixels: 50000000
    })
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true
    });

    // Simple enhancement only - minimal processing
    if (feature === 'enhance') {
      processedImage.sharpen(0.5);
    }

    const processedBuffer = await processedImage
      .webp({ quality: 80, effort: 2 })
      .toBuffer();

    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'no-cache',
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Image processing failed' },
      { status: 500 }
    );
  }
} 