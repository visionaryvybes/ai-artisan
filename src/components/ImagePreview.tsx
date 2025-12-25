'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ImageToProcess } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ZoomIn, ZoomOut, Move, Loader2 } from 'lucide-react';

interface ImagePreviewProps {
  image: ImageToProcess | null;
  showComparison?: boolean;
  className?: string;
}

export function ImagePreview({
  image,
  showComparison = true,
  className,
}: ImagePreviewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  if (!image) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-800/50 rounded-xl aspect-video',
          className
        )}
      >
        <div className="text-center text-gray-500">
          <Move className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Upload an image to preview</p>
        </div>
      </div>
    );
  }

  const hasProcessedImage = image.processedUrl && showComparison;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-gray-800/50 rounded-xl select-none',
        className
      )}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* Original Image (Full) */}
      <div className="relative aspect-video">
        <Image
          src={image.previewUrl}
          alt={`Original: ${image.name}`}
          fill
          className="object-contain"
          unoptimized
          priority
        />
      </div>

      {/* Processed Image (Clipped) */}
      {hasProcessedImage && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <div className="relative w-full h-full">
            <Image
              src={image.processedUrl!}
              alt={`Processed: ${image.name}`}
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        </div>
      )}

      {/* Comparison Slider */}
      {hasProcessedImage && (
        <>
          {/* Slider Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-10"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            {/* Slider Handle */}
            <div
              className={cn(
                'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-10 h-10 rounded-full bg-white shadow-lg',
                'flex items-center justify-center cursor-ew-resize',
                'transition-transform',
                isDragging && 'scale-110'
              )}
            >
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
                <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
            Original
          </div>
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 rounded text-xs text-white">
            Processed
          </div>
        </>
      )}

      {/* Processing Overlay */}
      {image.status === 'processing' && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
          <p className="text-white font-medium mb-2">
            {image.progressMessage || 'Processing...'}
          </p>
          <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
              style={{ width: `${image.progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">{image.progress}%</p>
        </div>
      )}

      {/* Image Info */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
        <div className="px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
          {image.name}
        </div>
        {image.originalDimensions && (
          <div className="px-2 py-1 bg-black/60 rounded text-xs text-gray-300">
            {image.originalDimensions.width} x {image.originalDimensions.height}
          </div>
        )}
      </div>
    </div>
  );
}
