'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { WarpBackground } from "@/components/ui/warp-background";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AIFeature } from '@/config/ai-models';
import Image from 'next/image';
import { 
  Sparkles, 
  Palette, 
  Brush, 
  UserCircle, 
  Layers,
  Upload
} from 'lucide-react';

const FEATURE_ICONS = {
  enhance: { icon: Sparkles, label: 'Enhance image quality and resolution' },
  colorize: { icon: Palette, label: 'Add color to black and white images' },
  style: { icon: Brush, label: 'Apply artistic styles to images' },
  face: { icon: UserCircle, label: 'Enhance and restore facial features' },
  segment: { icon: Layers, label: 'Segment image into distinct parts' },
};

export default function ProcessPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<AIFeature | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProcessedUrl(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processImage = async () => {
    if (!selectedImage || !selectedFeature) {
      setError('Please select an image and a processing feature');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      console.log('Starting image processing:', {
        imageSize: selectedImage.size,
        imageType: selectedImage.type,
        feature: selectedFeature
      });

      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('feature', selectedFeature);
      formData.append('enhancementLevel', '1.0');

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) return prev;
          return prev + 5;
        });
      }, 2000);

      try {
        console.log('Sending request to /api/process');
        const response = await fetch('/api/process', {
          method: 'POST',
          body: formData,
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(errorText || 'Failed to process image');
        }

        console.log('Processing successful, creating blob URL');
        const blob = await response.blob();
        console.log('Blob size:', blob.size, 'type:', blob.type);
        
        const url = URL.createObjectURL(blob);
        setProcessedUrl(url);
        setProgress(100);
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error: unknown) {
      console.error('Processing error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        setError(`Error: ${error.message}`);
      } else {
        console.error('Unknown error type:', error);
        setError('An unexpected error occurred while processing the image');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <WarpBackground>
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="container mx-auto flex flex-col items-center gap-8 p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col gap-4 p-6">
            <CardTitle className="text-center text-2xl">Process Your Image</CardTitle>
            <CardDescription className="text-center">
              Drop your image here or click to select. Then choose a processing feature to apply.
            </CardDescription>

            <div 
              {...getRootProps()} 
              className={`mt-4 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-700'}
              `}
            >
              <input {...getInputProps()} />
              {previewUrl ? (
                <div className="relative h-96 w-full">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="rounded-lg object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-12 w-12 text-gray-400" />
                  <p>Drag & drop an image here, or click to select one</p>
                </div>
              )}
            </div>

            {selectedImage && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(FEATURE_ICONS).map(([key, { icon: Icon, label }]) => (
                  <Card
                    key={key}
                    className={`group cursor-pointer transition-all hover:scale-105 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950 dark:hover:to-purple-950 ${
                      selectedFeature === key ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950' : ''
                    }`}
                    onClick={() => setSelectedFeature(key as AIFeature)}
                  >
                    <CardContent className="flex flex-col items-center gap-4 p-4">
                      <div className={`rounded-full p-3 text-white transition-transform group-hover:scale-110 ${
                        selectedFeature === key 
                          ? 'bg-indigo-500' 
                          : 'bg-gradient-to-br from-indigo-500 to-purple-500'
                      }`}>
                        <Icon size={24} />
                      </div>
                      <CardDescription className="text-center">
                        {label}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/10 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={processImage}
              disabled={!selectedImage || !selectedFeature || isProcessing}
              className={`mt-4 rounded-lg px-4 py-2 font-medium text-white transition-colors
                ${
                  !selectedImage || !selectedFeature || isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-500 hover:bg-indigo-600'
                }
              `}
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Processing... {progress}%</span>
                </div>
              ) : (
                'Process Image'
              )}
            </button>

            {isProcessing && (
              <div className="mt-4 w-full">
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {processedUrl && (
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6">
              <CardTitle className="mb-4 text-center text-2xl">Result</CardTitle>
              <div className="relative h-96 w-full">
                <Image
                  src={processedUrl}
                  alt="Processed"
                  fill
                  className="rounded-lg object-contain"
                  unoptimized
                />
              </div>
              <a
                href={processedUrl}
                download="processed-image.webp"
                className="mt-4 block rounded-lg bg-green-500 px-4 py-2 text-center font-medium text-white hover:bg-green-600"
              >
                Download Processed Image
              </a>
            </CardContent>
          </Card>
        )}
      </div>
    </WarpBackground>
  );
} 