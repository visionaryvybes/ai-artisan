import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';

interface ImageComparisonProps {
  originalUrl: string;
  processedUrl: string | null;
  isProcessing: boolean;
}

export function ImageComparison({ originalUrl, processedUrl, isProcessing }: ImageComparisonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const newPosition = (x / rect.width) * 100;
      setPosition(Math.min(Math.max(newPosition, 0), 100));
    }
  }, []);

  const handleMouseDown = useCallback(() => setIsDragging(true), []);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  }, [isDragging, handleMove]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video overflow-hidden rounded-lg"
    >
      {/* Original Image */}
      <div className="absolute top-0 left-0 w-full h-full">
        <Image
          src={originalUrl}
          alt="Original"
          fill
          className="object-contain"
          unoptimized // Since we're dealing with local blobs
        />
      </div>

      {/* Processed Image */}
      {processedUrl && (
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={processedUrl}
            alt="Processed"
            fill
            className="object-contain"
            unoptimized // Since we're dealing with local blobs
          />
        </div>
      )}

      {/* Slider */}
      {processedUrl && (
        <div
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
          style={{ left: `${position}%` }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h8M8 12h8M8 17h8"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white text-xl font-semibold">Processing...</div>
        </div>
      )}
    </div>
  );
} 