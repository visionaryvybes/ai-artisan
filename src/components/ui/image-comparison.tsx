import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface ImageComparisonProps {
  originalUrl: string;
  processedUrl: string;
  isProcessing?: boolean;
  className?: string;
}

export function ImageComparison({ 
  originalUrl, 
  processedUrl, 
  isProcessing,
  className = ''
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState({ original: false, processed: false });
  const [imageErrors, setImageErrors] = useState({ original: false, processed: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = Math.max(0, Math.min((x / rect.width) * 100, 100));
      setPosition(percentage);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging]);

  // Reset state when URLs change
  useEffect(() => {
    setImagesLoaded({ original: false, processed: false });
    setImageErrors({ original: false, processed: false });
  }, [originalUrl, processedUrl]);

  const handleImageLoad = (type: 'original' | 'processed') => {
    setImagesLoaded(prev => ({ ...prev, [type]: true }));
    setImageErrors(prev => ({ ...prev, [type]: false }));
  };

  const handleImageError = (type: 'original' | 'processed') => {
    setImageErrors(prev => ({ ...prev, [type]: true }));
    setImagesLoaded(prev => ({ ...prev, [type]: false }));
    console.error(`Error loading ${type} image`);
  };

  const showLoading = isProcessing || (!imagesLoaded.original || !imagesLoaded.processed);
  const showError = imageErrors.original || imageErrors.processed;

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-xl overflow-hidden cursor-ew-resize bg-black ${className}`}
      style={{ maxHeight: '85vh' }}
      onMouseDown={(e) => {
        setIsDragging(true);
        handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
        setIsDragging(true);
        if (e.touches[0]) handleMove(e.touches[0].clientX);
      }}
    >
      {/* Original Image */}
      <div className="absolute inset-0 bg-black flex items-center justify-center">
        <div className="relative w-full h-full">
          <Image
            src={originalUrl}
            alt="Original image"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
            unoptimized
            onLoad={() => handleImageLoad('original')}
            onError={() => handleImageError('original')}
          />
        </div>
      </div>

      {/* Processed Image */}
      <div 
        className="absolute inset-0 bg-black flex items-center justify-center"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="relative w-full h-full">
          <Image
            src={processedUrl}
            alt="Processed image"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
            unoptimized
            onLoad={() => handleImageLoad('processed')}
            onError={() => handleImageError('processed')}
          />
        </div>
      </div>

      {/* Slider */}
      {!showError && (
        <div 
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: `${position}%` }}
        >
          <div className="absolute inset-y-0 -left-px w-0.5 bg-white/80" />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-ew-resize">
            <svg className="w-5 h-5 text-gray-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {showLoading && !showError && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce" />
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {showError && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 font-medium mb-2">Error loading images</p>
            <p className="text-gray-400 text-sm">Please try again</p>
          </div>
        </div>
      )}
    </div>
  );
} 