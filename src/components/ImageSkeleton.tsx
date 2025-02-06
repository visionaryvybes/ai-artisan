import { useEffect, useState } from 'react';

interface ImageSkeletonProps {
  width?: number;
  height?: number;
  className?: string;
}

export function ImageSkeleton({ width = 400, height = 300, className = '' }: ImageSkeletonProps) {
  const [shimmerPosition, setShimmerPosition] = useState(0);

  useEffect(() => {
    let animationFrame: number;
    let startTime: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / 2000; // 2 seconds per cycle
      const position = (progress % 1) * 200 - 100; // -100 to 100
      setShimmerPosition(position);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ width, height }}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: `linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 50%,
            transparent 100%
          )`,
          transform: `translateX(${shimmerPosition}%)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="h-12 w-12 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    </div>
  );
} 