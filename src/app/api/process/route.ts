import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum allowed for Hobby plan
export const runtime = 'nodejs'; // Use Node.js runtime for Sharp

export async function POST(request: NextRequest) {
  console.log('Received request to /api/process');
  
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;
    const feature = formData.get('feature') as string || 'enhance';

    console.log('Request parameters:', {
      hasImage: !!image,
      imageSize: image?.size,
      feature,
      enhancementLevel
    });

    if (!image) {
      console.error('No image provided');
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      console.error('Image too large:', image.size);
      return NextResponse.json(
        { error: 'File size exceeds maximum limit of 10MB' },
        { status: 400 }
      );
    }

    // Convert image to buffer
    console.log('Converting image to buffer');
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log('Initializing Sharp');
    // Initialize Sharp with optimized settings
    let processedImage = sharp(buffer, {
      failOnError: false,
      limitInputPixels: 50000000 // Limit input size for safety
    });

    // Resize first to reduce processing time
    console.log('Resizing image');
    processedImage = processedImage.resize({
      width: 2048,
      height: 2048,
      fit: 'inside',
      withoutEnlargement: false
    });

    // Apply feature-specific processing
    console.log('Applying feature:', feature);
    switch (feature) {
      case 'enhance':
        processedImage = processedImage
          .sharpen(enhancementLevel * 0.8)
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
          .sharpen();
        break;

      case 'face':
        processedImage = processedImage
          .sharpen()
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

    console.log('Processing image with Sharp');
    // Optimize output
    const processedBuffer = await processedImage
      .webp({
        quality: 85,
        effort: 4, // Lower effort for faster processing
        preset: 'photo'
      })
      .toBuffer();

    console.log('Processing complete, buffer size:', processedBuffer.length);

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
        error: error instanceof Error 
          ? `Processing error: ${error.message}` 
          : 'Unknown error occurred while processing image'
      },
      { status: 500 }
    );
  }
} 