'use client';

import Image from 'next/image';
import { ImageToProcess } from '@/lib/types';
import { cn, formatBytes } from '@/lib/utils';
import { X, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import { downloadBlob } from '@/lib/image-processor';

interface ImageQueueProps {
  images: ImageToProcess[];
  currentImageId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ImageQueue({
  images,
  currentImageId,
  onSelect,
  onRemove,
}: ImageQueueProps) {
  if (images.length === 0) return null;

  const handleDownload = (image: ImageToProcess, e: React.MouseEvent) => {
    e.stopPropagation();
    if (image.processedBlob) {
      const extension = image.name.split('.').pop() || 'png';
      const baseName = image.name.replace(/\.[^/.]+$/, '');
      downloadBlob(image.processedBlob, `${baseName}_processed.${extension}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400">
          Image Queue ({images.length})
        </h3>
        <div className="flex gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Pending: {images.filter((i) => i.status === 'pending').length}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Done: {images.filter((i) => i.status === 'completed').length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            onClick={() => onSelect(image.id)}
            className={cn(
              'relative group rounded-lg overflow-hidden cursor-pointer transition-all',
              'border-2',
              currentImageId === image.id
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-transparent hover:border-gray-600'
            )}
          >
            {/* Image Preview */}
            <div className="aspect-square relative bg-gray-800">
              <Image
                src={image.processedUrl || image.previewUrl}
                alt={image.name}
                fill
                className="object-cover"
                unoptimized
              />

              {/* Status Overlay */}
              {image.status === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin mb-2" />
                  <div className="w-3/4 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                      style={{ width: `${image.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{image.progress}%</p>
                </div>
              )}

              {image.status === 'completed' && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {image.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  {image.processedBlob && (
                    <button
                      onClick={(e) => handleDownload(image, e)}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(image.id);
                    }}
                    className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                    title="Remove"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>

            {/* Image Info */}
            <div className="p-2 bg-gray-800/80">
              <p className="text-xs text-gray-300 truncate" title={image.name}>
                {image.name}
              </p>
              {image.originalDimensions && (
                <p className="text-xs text-gray-500">
                  {image.originalDimensions.width} x {image.originalDimensions.height}
                </p>
              )}
              {image.error && (
                <p className="text-xs text-red-400 truncate" title={image.error}>
                  {image.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
