import { NextRequest, NextResponse } from 'next/server';
import { HfInference } from '@huggingface/inference';
import { MAX_FILE_SIZE, SUPPORTED_FORMATS } from '@/config/ai-models';
import { retryOperation } from '@/utils/api-helpers';
import { withRateLimit } from '@/utils/rate-limit';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return withRateLimit(request, async (req) => {
    try {
      if (!process.env.HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY is not configured');
      }

      const formData = await req.formData();
      const image = formData.get('image') as File;

      if (!image) {
        return NextResponse.json(
          { error: 'No image provided' },
          { status: 400 }
        );
      }

      // Validate file size
      if (image.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File size too large' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!SUPPORTED_FORMATS.includes(image.type)) {
        return NextResponse.json(
          { error: 'Unsupported file type' },
          { status: 400 }
        );
      }

      const buffer = await image.arrayBuffer();
      
      const result = await retryOperation(
        async () => {
          const timeoutPromise = new Promise<Blob>((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout')), 290000);
          });

          const resultPromise = hf.imageToImage({
            model: 'microsoft/bringing-old-photos-back-to-life',
            inputs: new Blob([buffer], { type: image.type }),
          });

          const result = await Promise.race([resultPromise, timeoutPromise]);
          if (!result) {
            throw new Error('No result from model');
          }
          return result;
        },
        {
          maxAttempts: 3,
          delayMs: 2000,
          backoff: true,
        }
      );

      return new NextResponse(result, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    } catch (error) {
      console.error('Error in face enhancement route:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return NextResponse.json(
            { error: 'Request timed out' },
            { status: 504 }
          );
        }
        if (error.message.includes('HUGGINGFACE_API_KEY')) {
          return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
          );
        }
        if (error.message.includes('rate limit')) {
          return NextResponse.json(
            { error: 'Rate limit exceeded' },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      );
    }
  });
} 