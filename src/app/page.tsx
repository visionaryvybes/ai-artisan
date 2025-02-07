'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { useDropzone } from 'react-dropzone';
import { Sparkles, ImageIcon, Zap, Download, ArrowRight } from 'lucide-react';
import { FeatureCard } from '@/components/ui/feature-card';
import { ImageComparison } from '@/components/ui/image-comparison';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const router = useRouter();
  const [enhancementLevel, setEnhancementLevel] = useState(1.0);
  const [detailStrength, setDetailStrength] = useState(0.5);
  const [style, setStyle] = useState<'realistic' | 'artistic' | 'balanced'>('balanced');
  const [selectedScale, setSelectedScale] = useState<2 | 4 | 8 | 16>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const processImage = async (file: File) => {
    try {
      setIsProcessing(true);
      setCurrentFileName(file.name);
      
      const formData = new FormData();
      formData.append('image', file);
      formData.append('enhancementLevel', enhancementLevel.toString());
      formData.append('detailStrength', detailStrength.toString());
      formData.append('style', style);
      formData.append('scale', selectedScale.toString());

      const response = await fetch('/api/enhance', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process image');
      }

      const blob = await response.blob();
      const processedUrl = URL.createObjectURL(blob);
      setProcessedImage(processedUrl);

      // Save to gallery
      const savedImages = JSON.parse(localStorage.getItem('processedImages') || '[]');
      savedImages.push({
        id: uuidv4(),
        originalName: file.name,
        processedUrl,
        timestamp: new Date().toISOString(),
        scale: selectedScale
      });
      localStorage.setItem('processedImages', JSON.stringify(savedImages));

    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async () => {
    if (!processedImage) return;
    
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced_${currentFileName || 'image.png'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const imageUrl = URL.createObjectURL(file);
        setOriginalImage(imageUrl);
        await processImage(file);
      }
    }
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative">
        <div className="text-center pt-20 pb-16 px-4">
          <h1 className="text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400">
            AI Image Processing Studio
          </h1>
          <p className="text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Transform your images with cutting-edge AI technology. Enhance quality and details with advanced machine learning models.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/gallery')}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              View Gallery
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <div className="space-y-6">
              <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/30 transition-colors rounded-xl">
                <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Upload Images
                </h2>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                    ${isDragActive 
                      ? 'border-purple-500 bg-purple-500/10' 
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'}`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto bg-gray-800 rounded-2xl flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    {isDragActive ? (
                      <p className="text-purple-400 text-lg">Drop your images here...</p>
                    ) : (
                      <>
                        <p className="text-gray-300 text-lg">Drag & drop your images here, or click to browse</p>
                        <p className="text-sm text-gray-500">Supports PNG, JPG, JPEG, WEBP up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {originalImage && (
                <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/30 transition-colors rounded-xl">
                  <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Preview
                  </h2>
                  <ImageComparison
                    originalUrl={originalImage}
                    processedUrl={processedImage}
                    isProcessing={isProcessing}
                  />
                      </div>
                    )}
            </div>

            {/* Enhancement Options */}
            <div className="space-y-6">
              <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/30 transition-colors rounded-xl">
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
                      onValueChange={(values) => setEnhancementLevel(values[0])}
                      min={1.0}
                      max={3.0}
                      step={0.1}
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-3">
                      <span>Detail Strength</span>
                      <span className="text-purple-400">{detailStrength.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[detailStrength]}
                      onValueChange={(values) => setDetailStrength(values[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
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
              </div>
            </div>
          </div>
        </div>

        {originalImage && processedImage && (
          <div className="fixed bottom-8 right-8 flex gap-4">
            <Button
              onClick={downloadImage}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Enhanced Image
            </Button>
            <Button
              onClick={() => router.push('/gallery')}
              variant="outline"
              className="border-purple-500/20 hover:border-purple-500/40"
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Go to Gallery
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
