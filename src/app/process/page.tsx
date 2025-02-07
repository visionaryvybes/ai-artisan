'use client';

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import Image from 'next/image';

export default function ProcessPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProcessedUrl(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to process image');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mx-auto max-w-2xl">
        <CardContent className="p-6">
          <h1 className="mb-4 text-2xl font-bold">Image Processor</h1>
          
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="mb-4 w-full"
            />
          </div>

          {previewUrl && (
            <div className="mb-4">
              <h2 className="mb-2 text-lg font-semibold">Preview:</h2>
              <div className="relative h-64 w-full">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="rounded object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={processImage}
            disabled={!selectedImage || isProcessing}
            className="w-full rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isProcessing ? 'Processing...' : 'Process Image'}
          </button>

          {processedUrl && (
            <div className="mt-8">
              <h2 className="mb-2 text-lg font-semibold">Processed Image:</h2>
              <div className="relative h-64 w-full">
                <Image
                  src={processedUrl}
                  alt="Processed"
                  fill
                  className="rounded object-contain"
                  unoptimized
                />
              </div>
              <a
                href={processedUrl}
                download="processed-image.webp"
                className="mt-4 block rounded bg-green-500 px-4 py-2 text-center font-bold text-white hover:bg-green-700"
              >
                Download
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 