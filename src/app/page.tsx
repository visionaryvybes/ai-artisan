'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ImageComparison } from '@/components/ImageComparison';
import { FeatureCard } from '@/components/ui/feature-card';
import { useDropzone } from 'react-dropzone';
import { Sparkles, Zap, Image as ImageIcon, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  processedUrl: string | null;
  error?: string;
}

export default function HomePage() {
  const router = useRouter();
  const [queuedImages, setQueuedImages] = useState<QueuedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Processing options
  const [enhancementLevel, setEnhancementLevel] = useState(1.0);
  const [detailStrength, setDetailStrength] = useState(0.5);
  const [style, setStyle] = useState<'realistic' | 'artistic' | 'balanced'>('balanced');
  const [selectedScale, setSelectedScale] = useState<2 | 4 | 8 | 16>(2);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map(file => ({
      id: uuidv4(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued' as const,
      processedUrl: null
    }));
    
    setQueuedImages(prev => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 10,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const processImages = async () => {
    if (queuedImages.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      for (let i = 0; i < queuedImages.length; i++) {
        const image = queuedImages[i];
        if (image.status === 'completed') continue;

        setQueuedImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'processing' } : img
        ));

        try {
          const formData = new FormData();
          formData.append('image', image.file);
          formData.append('enhancementLevel', enhancementLevel.toString());
          formData.append('detailStrength', detailStrength.toString());
          formData.append('style', style);
          formData.append('scale', selectedScale.toString());

          const response = await fetch('/api/enhance', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(await response.text() || 'Failed to process image');
          }

          const blob = await response.blob();
          const processedUrl = URL.createObjectURL(blob);

          // Save to localStorage
          const savedImages = localStorage.getItem('processedImages');
          const images = savedImages ? JSON.parse(savedImages) : [];
          images.push({
            id: image.id,
            originalName: image.file.name,
            processedUrl,
            timestamp: new Date().toISOString(),
            scale: selectedScale
          });
          localStorage.setItem('processedImages', JSON.stringify(images));

          setQueuedImages(prev => prev.map(img =>
            img.id === image.id ? { ...img, status: 'completed', processedUrl } : img
          ));
        } catch (error) {
          setQueuedImages(prev => prev.map(img =>
            img.id === image.id ? { 
              ...img, 
              status: 'error',
              error: error instanceof Error ? error.message : 'Failed to process image'
            } : img
          ));
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (id: string) => {
    setQueuedImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative">
        {/* Hero Section */}
        <div className="text-center pt-20 pb-16 px-4">
          <h1 className="text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 animate-gradient">
            AI Image Processing Studio
          </h1>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transform your images with cutting-edge AI technology. Enhance quality and details with advanced machine learning models.
          </p>
        </div>

        <div className="container mx-auto px-4 pb-20">
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <FeatureCard
              icon={<Sparkles className="w-6 h-6" />}
              title="High Quality Enhancement"
              description="Boost image quality with AI-powered enhancement"
            />
            <FeatureCard
              icon={<ImageIcon className="w-6 h-6" />}
              title="Detail Generation"
              description="Generate and enhance fine details"
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Real-time Processing"
              description="Fast and efficient image processing"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {/* Upload Section */}
            <div className="space-y-6">
              <Card className="p-8 bg-gray-900/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/30 transition-colors">
                <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Upload Images
                </h2>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                    ${isDragActive 
                      ? 'border-purple-500 bg-purple-500/10 scale-102' 
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'}`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gray-800 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    {isDragActive ? (
                      <p className="text-purple-400 text-lg">Drop your images here...</p>
                    ) : (
                      <>
                        <p className="text-gray-300 text-lg">Drag & drop your images here, or click to browse</p>
                        <p className="text-sm text-gray-500">Supports PNG, JPG, JPEG, WEBP up to 50MB</p>
                        <p className="text-sm text-gray-500">Upload up to 10 images at once</p>
                      </>
                    )}
                  </div>
                </div>
              </Card>

              {queuedImages.length > 0 && (
                <Card className="p-6 bg-gray-900/50 backdrop-blur-sm border-purple-500/20">
                  <h3 className="text-lg font-semibold text-gray-300 mb-4">Queued Images</h3>
                  <div className="space-y-4">
                    {queuedImages.map((img) => (
                      <div key={img.id} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50">
                        <div className="relative w-16 h-16">
                          <Image
                            src={img.previewUrl}
                            alt={img.file.name}
                            fill
                            className="object-cover rounded-lg"
                            unoptimized // Since we're dealing with local blobs
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-300 truncate">{img.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(img.file.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {img.status === 'queued' && (
                            <span className="text-xs text-gray-400">Queued</span>
                          )}
                          {img.status === 'processing' && (
                            <span className="text-xs text-purple-400">Processing...</span>
                          )}
                          {img.status === 'completed' && (
                            <span className="text-xs text-green-400">Completed</span>
                          )}
                          {img.status === 'error' && (
                            <span className="text-xs text-red-400">{img.error}</span>
                          )}
                          <button
                            onClick={() => removeImage(img.id)}
                            className="p-1 hover:bg-gray-700 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Enhancement Options */}
            <div className="space-y-6">
              <Card className="p-8 bg-gray-900/50 backdrop-blur-sm border-purple-500/20 hover:border-purple-500/30 transition-colors">
                <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Enhancement Options
                </h2>
                <div className="space-y-8">
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-3">
                      <span>Enhancement Level</span>
                      <span className="text-purple-400">{enhancementLevel.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[enhancementLevel]}
                      onValueChange={(values: number[]) => setEnhancementLevel(values[0])}
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3 flex justify-between">
                      <span>Detail Strength</span>
                      <span className="text-purple-400">{detailStrength.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[detailStrength]}
                      onValueChange={(values: number[]) => setDetailStrength(values[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                      disabled={isProcessing}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Style</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['realistic', 'artistic', 'balanced'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s as typeof style)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                            ${style === s 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25' 
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Resolution Scale</label>
                    <div className="grid grid-cols-4 gap-4">
                      {[2, 4, 8, 16].map((scale) => (
                        <button
                          key={scale}
                          onClick={() => setSelectedScale(scale as 2 | 4 | 8 | 16)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                            ${selectedScale === scale 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25' 
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                          {scale}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="flex gap-4">
                <Button
                  onClick={processImages}
                  disabled={queuedImages.length === 0 || isProcessing}
                  className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 
                    shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-[1.02]"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Images...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Process All Images
                    </span>
                  )}
                </Button>

                <Button
                  onClick={() => router.push('/gallery')}
                  className="px-6 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                >
                  View Gallery
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Section - Show the most recently processed image */}
          {queuedImages.some(img => img.processedUrl) && (
            <Card className="bg-gray-900/50 backdrop-blur-sm border-purple-500/20 overflow-hidden">
              <div className="p-8">
                <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Latest Preview
                </h2>
                {queuedImages.filter(img => img.processedUrl).slice(-1).map(image => (
                  <ImageComparison
                    key={image.id}
                    originalUrl={image.previewUrl}
                    processedUrl={image.processedUrl}
                    isProcessing={false}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
