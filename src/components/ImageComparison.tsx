import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ImageComparisonProps {
  originalUrl: string;
  processedUrl: string;
  isProcessing?: boolean;
}

export function ImageComparison({ originalUrl, processedUrl, isProcessing }: ImageComparisonProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setPosition(percentage);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-[3/2] rounded-xl overflow-hidden cursor-ew-resize"
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
    >
      {/* Original Image */}
      <div className="absolute inset-0">
        {originalUrl && (
          <Image
            src={originalUrl}
            alt="Original image"
            fill
            className="object-cover"
            unoptimized
            onError={(e) => {
              console.error('Error loading original image:', e);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Processed Image */}
      <div 
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {processedUrl && (
          <Image
            src={processedUrl}
            alt="Processed image"
            fill
            className="object-cover"
            unoptimized
            onError={(e) => {
              console.error('Error loading processed image:', e);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
      </div>

      {/* Slider */}
      <div 
        className="absolute inset-y-0"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 -left-px w-0.5 bg-white/80" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce" />
          </div>
        </div>
      )}
    </div>
  );
} 