'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft, Check, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import JSZip from 'jszip';

interface GalleryImage {
  id: string;
  originalName: string;
  processedImage: string;  // Base64 string for preview
  processedUrl?: string;   // Full quality URL from processing
  timestamp: string;
  function: 'enhance' | 'colorize';
  scale?: number;
}

export default function GalleryPage() {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Load images from localStorage
    const savedImages = localStorage.getItem('processedImages');
    if (savedImages) {
      try {
        const parsed = JSON.parse(savedImages);
        setImages(parsed.sort((a: GalleryImage, b: GalleryImage) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
      } catch (error) {
        console.error('Error loading gallery images:', error);
        localStorage.removeItem('processedImages');
      }
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

  const deleteSelected = () => {
    if (selectedImages.size === 0) return;
    
    const newImages = images.filter(img => !selectedImages.has(img.id));
    setImages(newImages);
    localStorage.setItem('processedImages', JSON.stringify(newImages));
    setSelectedImages(new Set());
  };

  const downloadImages = async () => {
    if (selectedImages.size === 0) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      const zip = new JSZip();
      let processedCount = 0;
      
      // Process selected images sequentially to maintain quality
      for (const id of selectedImages) {
        const image = images.find(img => img.id === id);
        if (!image) continue;

        try {
          // Get the full quality image
          let imageBlob: Blob;
          
          if (image.processedUrl) {
            // Fetch the full quality image from the URL
            const response = await fetch(image.processedUrl);
            if (!response.ok) throw new Error('Failed to fetch image');
            imageBlob = await response.blob();
          } else {
            // Convert base64 to blob as fallback
            const base64Data = image.processedImage.split(',')[1];
            const binaryData = atob(base64Data);
            const array = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
              array[i] = binaryData.charCodeAt(i);
            }
            imageBlob = new Blob([array], { type: 'image/png' });
          }

          // Ensure we're getting a high-quality image
          if (imageBlob.size < 100 * 1024) { // Less than 100KB
            console.warn('Image quality may be low:', image.originalName);
          }

          // Generate filename with processing details
          const filename = `${image.function}_${image.scale ? `${image.scale}x_` : ''}${image.originalName}`;
          
          // Add to zip with no compression
          zip.file(filename, imageBlob, { 
            binary: true,
            compression: 'STORE'  // No compression to maintain quality
          });

          processedCount++;
          setDownloadProgress((processedCount / selectedImages.size) * 100);
        } catch (error) {
          console.error(`Error processing image ${image.originalName}:`, error);
        }
      }
      
      // Generate zip with no compression
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'STORE',  // No compression
        compressionOptions: {
          level: 0
        }
      }, (metadata) => {
        setDownloadProgress(metadata.percent);
      });
      
      // Create download link
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_images_full_quality.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSelectedImages(new Set());
    } catch (error) {
      console.error('Error downloading images:', error);
      alert('Failed to download images. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Add loading state UI
  const downloadButton = (
    <Button
      onClick={downloadImages}
      disabled={isDownloading || selectedImages.size === 0}
      className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          Preparing Download...
        </>
      ) : (
        <>
          <Download className="w-5 h-5 mr-2" />
          Download Selected ({selectedImages.size})
        </>
      )}
    </Button>
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="border-purple-500/20 hover:border-purple-500/40"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Studio
          </Button>
          
          <div className="flex gap-4">
            {selectedImages.size > 0 && (
              <>
                <Button
                  onClick={deleteSelected}
                  variant="outline"
                  className="border-red-500/20 hover:border-red-500/40 text-red-400"
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Delete Selected
                </Button>
                {downloadButton}
              </>
            )}
          </div>
        </div>

        {isDownloading && (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-200">
                Preparing images for download...
              </p>
              <p className="text-sm text-purple-400">
                Please wait while we process your request
              </p>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-600 animate-pulse" />
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400 mb-4">No processed images yet</p>
            <Button
              onClick={() => router.push('/')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              Start Processing Images
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <Card
                key={image.id}
                className={`relative overflow-hidden group cursor-pointer transition-all duration-300 ${
                  selectedImages.has(image.id)
                    ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900'
                    : ''
                }`}
                onClick={() => toggleImageSelection(image.id)}
              >
                <div className="relative aspect-[3/2]">
                  <Image
                    src={image.processedImage}
                    alt={image.originalName}
                    fill
                    className="object-cover"
                    unoptimized // Since we're using base64
                  />
                  <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
                    selectedImages.has(image.id) ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'
                  }`} />
                  {selectedImages.has(image.id) && (
                    <div className="absolute top-4 right-4">
                      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-900/50 backdrop-blur-sm">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {image.originalName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(image.timestamp).toLocaleDateString()} • {image.function}
                    {image.scale && ` • ${image.scale}x`}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 