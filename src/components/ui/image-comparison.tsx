import React, { useState } from 'react';
import Image from 'next/image';

interface ImageComparisonProps {
  originalUrl: string;
  processedUrl: string | null | undefined;
  isProcessing: boolean;
}

export function ImageComparison({ originalUrl, processedUrl, isProcessing }: ImageComparisonProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden">
      {/* Original Image */}
      <div className="absolute inset-0">
        <Image
          src={originalUrl}
          alt="Original"
          fill
          className="object-cover"
          unoptimized // Since we're dealing with local blobs
        />
      </div>

      {/* Processed Image */}
      {processedUrl && (
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <Image
            src={processedUrl}
            alt="Processed"
            fill
            className="object-cover"
            unoptimized // Since we're dealing with local blobs
          />
        </div>
      )}

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

      {/* Slider */}
      <div
        className="absolute inset-0"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const percent = (x / rect.width) * 100;
          setPosition(Math.min(100, Math.max(0, percent)));
        }}
      >
        <div
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
          style={{ left: `${position}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-600" />
          </div>
        </div>
      </div>
    </div>
  );
} 