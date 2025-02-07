import { NextRequest, NextResponse } from 'next/server';
import { MAX_FILE_SIZE } from '@/config/ai-models';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Maximum allowed for Hobby plan
export const runtime = 'edge';

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

    // Forward the request to the processing endpoint
    const processUrl = new URL(request.url);
    processUrl.pathname = '/api/process';

    const processResponse = await fetch(processUrl.toString(), {
      method: 'POST',
      body: formData,
    });

    if (!processResponse.ok) {
      const error = await processResponse.text();
      throw new Error(error || 'Failed to process image');
    }

    const processedBuffer = await processResponse.arrayBuffer();

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