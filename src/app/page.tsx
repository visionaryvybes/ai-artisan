'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { useDropzone } from 'react-dropzone';
import { Sparkles, ImageIcon, Zap } from 'lucide-react';
import { FeatureCard } from '@/components/ui/feature-card';

export default function HomePage() {
  const [enhancementLevel, setEnhancementLevel] = useState(1.0);
  const [detailStrength, setDetailStrength] = useState(0.5);
  const [style, setStyle] = useState<'realistic' | 'artistic' | 'balanced'>('balanced');
  const [selectedScale, setSelectedScale] = useState<2 | 4 | 8 | 16>(2);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 10,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDrop: () => {
      // We'll handle file processing later
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
                        <p className="text-sm text-gray-500">Supports PNG, JPG, JPEG, WEBP up to 50MB</p>
                        <p className="text-sm text-gray-500">Upload up to 10 images at once</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
      </div>
    </main>
  );
}
