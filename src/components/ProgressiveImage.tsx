import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageSkeleton } from './ImageSkeleton';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
}

export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  quality = 75,
}: ProgressiveImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blur, setBlur] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setBlur(true);
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
    // Add a small delay before removing blur for smooth transition
    setTimeout(() => setBlur(false), 100);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load image');
  };

  if (error) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/10 ${className}`}
        style={{ width, height }}
      >
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      {isLoading && <ImageSkeleton width={width} height={height} className="absolute inset-0" />}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`rounded-lg transition-[filter] duration-300 ${
          blur ? 'blur-sm' : 'blur-0'
        } ${className}`}
        priority={priority}
        quality={quality}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
} 