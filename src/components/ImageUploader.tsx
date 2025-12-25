'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '@/lib/types';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export function ImageUploader({
  onUpload,
  disabled = false,
  maxFiles = 10,
  className,
}: ImageUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
      },
      maxSize: MAX_FILE_SIZE,
      maxFiles,
      disabled,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-300',
        isDragActive && !isDragReject
          ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
          : isDragReject
          ? 'border-red-500 bg-red-500/10'
          : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        <div
          className={cn(
            'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive
              ? 'bg-purple-500/20 text-purple-400'
              : 'bg-gray-800/50 text-gray-500'
          )}
        >
          {isDragActive ? (
            <Upload className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
          ) : (
            <ImagePlus className="w-8 h-8 sm:w-10 sm:h-10" />
          )}
        </div>

        {isDragActive ? (
          <div>
            <p className="text-purple-400 text-lg font-medium">
              Drop your images here
            </p>
          </div>
        ) : (
          <div>
            <p className="text-gray-300 text-base sm:text-lg font-medium">
              Drag & drop images here
            </p>
            <p className="text-gray-500 text-sm mt-1">
              or click to browse
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
            PNG
          </span>
          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
            JPG
          </span>
          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
            WEBP
          </span>
          <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">
            GIF
          </span>
        </div>

        <p className="text-xs text-gray-600">
          Max {MAX_FILE_SIZE / (1024 * 1024)}MB per file
        </p>
      </div>
    </div>
  );
}
