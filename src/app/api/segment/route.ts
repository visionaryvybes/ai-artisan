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

          // First, get the segmentation result
          const segResult = await hf.imageSegmentation({
            model: 'facebook/mask2former-swin-large-ade-semantic',
            data: new Blob([buffer], { type: image.type }),
          });

          // Create a visualization of the segmentation
          const img = await createImageBitmap(new Blob([buffer], { type: image.type }));
          const canvas = new OffscreenCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Overlay segmentation with transparency
          const colors = generateSegmentColors(segResult.length);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          segResult.forEach((segment, idx) => {
            const color = colors[idx % colors.length];
            const mask = segment.mask;
            
            // Apply colored overlay for this segment
            for (let i = 0; i < mask.length; i++) {
              const maskValue = parseFloat(mask[i]);
              if (!isNaN(maskValue) && maskValue > 0.5) {
                const pixelIndex = i * 4;
                imageData.data[pixelIndex] = Math.round((imageData.data[pixelIndex] + color.r) / 2);
                imageData.data[pixelIndex + 1] = Math.round((imageData.data[pixelIndex + 1] + color.g) / 2);
                imageData.data[pixelIndex + 2] = Math.round((imageData.data[pixelIndex + 2] + color.b) / 2);
              }
            }
          });

          ctx.putImageData(imageData, 0, 0);

          // Add labels
          ctx.font = '16px sans-serif';
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;

          segResult.forEach((segment, idx) => {
            const label = segment.label;
            const x = 10;
            const y = 20 + idx * 20;
            
            ctx.strokeText(label, x, y);
            ctx.fillText(label, x, y);
          });

          const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
          return Promise.race([Promise.resolve(resultBlob), timeoutPromise]);
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
      console.error('Error in segmentation route:', error);
      
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

interface Color {
  r: number;
  g: number;
  b: number;
}

function generateSegmentColors(numSegments: number): Color[] {
  const colors: Color[] = [];
  for (let i = 0; i < numSegments; i++) {
    const hue = (i * 360) / numSegments;
    const saturation = 0.7;
    const lightness = 0.5;

    // Convert HSL to RGB
    const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
    const m = lightness - c / 2;

    let r = 0, g = 0, b = 0;
    if (hue < 60) {
      [r, g, b] = [c, x, 0];
    } else if (hue < 120) {
      [r, g, b] = [x, c, 0];
    } else if (hue < 180) {
      [r, g, b] = [0, c, x];
    } else if (hue < 240) {
      [r, g, b] = [0, x, c];
    } else if (hue < 300) {
      [r, g, b] = [x, 0, c];
    } else {
      [r, g, b] = [c, 0, x];
    }

    colors.push({
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    });
  }
  return colors;
} 