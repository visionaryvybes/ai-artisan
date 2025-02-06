'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import JSZip from 'jszip';

interface ProcessedImage {
  id: string;
  originalName: string;
  processedUrl: string;
  timestamp: string;
  scale: number;
}

export default function GalleryPage() {
  const router = useRouter();
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Load images from localStorage
    const savedImages = localStorage.getItem('processedImages');
    if (savedImages) {
      setImages(JSON.parse(savedImages));
    }
  }, []);

  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const downloadImages = async () => {
    if (selectedImages.size === 0) return;
    
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      // Add selected images to the zip
      for (const image of images) {
        if (selectedImages.has(image.id)) {
          const response = await fetch(image.processedUrl);
          const blob = await response.blob();
          const fileName = image.originalName.split('.');
          const name = fileName.join('.');
          zip.file(`${name}_enhanced_${image.scale}x.png`, blob);
        }
      }
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enhanced_images.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading images:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Upload
            </Button>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
              Gallery
            </h1>
          </div>
          
          <Button
            onClick={downloadImages}
            disabled={selectedImages.size === 0 || isDownloading}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
          >
            {isDownloading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Zip...
              </div>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download Selected ({selectedImages.size})
              </>
            )}
          </Button>
        </div>

        {images.length === 0 ? (
          <Card className="p-8 text-center bg-gray-900/50 backdrop-blur-sm border-purple-500/20">
            <p className="text-gray-400">No processed images yet. Start by enhancing some images!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <Card
                key={image.id}
                className={`group relative overflow-hidden transition-all duration-300 ${
                  selectedImages.has(image.id)
                    ? 'border-purple-500'
                    : 'border-purple-500/20 hover:border-purple-500/40'
                }`}
              >
                <div className="aspect-[3/2] relative">
                  <Image
                    src={image.processedUrl}
                    alt={image.originalName}
                    fill
                    className="object-cover"
                    unoptimized // Since we're dealing with local blobs
                  />
                  <button
                    onClick={() => toggleImageSelection(image.id)}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      selectedImages.has(image.id)
                        ? 'bg-purple-500/20'
                        : 'bg-black/0 group-hover:bg-black/20'
                    }`}
                  >
                    {selectedImages.has(image.id) && (
                      <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </button>
                </div>
                <div className="p-4 border-t border-purple-500/20 bg-gray-900/50">
                  <p className="text-sm text-gray-300 truncate mb-1">{image.originalName}</p>
                  <p className="text-xs text-gray-500">Enhanced {image.scale}x</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 