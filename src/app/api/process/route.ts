import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute timeout
export const runtime = 'nodejs'; // Use Node.js runtime for Sharp

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;
    const feature = formData.get('feature') as string || 'enhance';

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

    // Convert image to buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp based on feature
    let processedImage = sharp(buffer);

    // Base processing for all features
    processedImage = processedImage.resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: false
    });

    switch (feature) {
      case 'enhance':
        processedImage = processedImage
          .sharpen({
            sigma: enhancementLevel * 0.8,
            m1: 1.5,
            m2: 2.0,
          })
          .normalize()
          .modulate({
            brightness: 1.05,
            saturation: 1.1
          });
        break;

      case 'colorize':
        processedImage = processedImage
          .normalize()
          .modulate({
            saturation: 1.5,
            brightness: 1.1
          });
        break;

      case 'style':
        processedImage = processedImage
          .normalize()
          .modulate({
            saturation: 1.2,
            brightness: 1.05
          })
          .sharpen({
            sigma: 0.5,
            m1: 1.0,
            m2: 2.0,
          });
        break;

      case 'face':
        processedImage = processedImage
          .sharpen({
            sigma: 0.8,
            m1: 1.5,
            m2: 2.0,
          })
          .modulate({
            brightness: 1.1,
            saturation: 1.1
          });
        break;

      case 'segment':
        processedImage = processedImage
          .normalize()
          .threshold(enhancementLevel * 128);
        break;
    }

    // Convert to WebP for better quality/size ratio
    const processedBuffer = await processedImage
      .toFormat('webp', {
        quality: 90,
        effort: 6,
      })
      .toBuffer();

    // Return processed image
    return new NextResponse(processedBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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