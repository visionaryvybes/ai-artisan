import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute timeout
export const runtime = 'edge'; // Switch to edge runtime for better performance

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const enhancementLevel = parseFloat(formData.get('enhancementLevel') as string) || 1.0;

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

    // Process image with sharp
    const processedBuffer = await sharp(buffer)
      .resize({
        width: 2048,
        height: 2048,
        fit: 'inside',
        withoutEnlargement: false
      })
      .sharpen({
        sigma: enhancementLevel * 0.8,
        m1: 1.5,
        m2: 2.0,
      })
      .normalize() // Improve contrast
      .modulate({
        brightness: 1.05,
        saturation: 1.1
      })
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