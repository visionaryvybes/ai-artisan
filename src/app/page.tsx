'use client';

import { useEffect, useState } from 'react';
import { useImageStore, useCurrentImage } from '@/store/image-store';
import { FeatureSelector } from '@/components/FeatureSelector';
import { ImageUploader } from '@/components/ImageUploader';
import { ProcessingOptions } from '@/components/ProcessingOptions';
import { ImageQueue } from '@/components/ImageQueue';
import { ImagePreview } from '@/components/ImagePreview';
import { Button } from '@/components/ui/button';
import { detectCapabilities, DeviceCapabilities } from '@/lib/device';
import {
  Sparkles,
  ImageIcon,
  Zap,
  Download,
  Play,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { downloadBlob } from '@/lib/image-processor';

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
      <div className="mb-3">{icon}</div>
      <h3 className="text-purple-400 font-medium mb-1">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

export default function HomePage() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Store state
  const images = useImageStore((s) => s.images);
  const currentImageId = useImageStore((s) => s.currentImageId);
  const isProcessing = useImageStore((s) => s.isProcessing);
  const selectedFunction = useImageStore((s) => s.selectedFunction);
  const processingOptions = useImageStore((s) => s.processingOptions);

  // Store actions
  const addImages = useImageStore((s) => s.addImages);
  const removeImage = useImageStore((s) => s.removeImage);
  const selectImage = useImageStore((s) => s.selectImage);
  const setSelectedFunction = useImageStore((s) => s.setSelectedFunction);
  const setProcessingOptions = useImageStore((s) => s.setProcessingOptions);
  const processCurrentImage = useImageStore((s) => s.processCurrentImage);
  const processAllImages = useImageStore((s) => s.processAllImages);

  // Get current image
  const currentImage = useCurrentImage();

  // Detect device capabilities on mount
  useEffect(() => {
    detectCapabilities().then(setCapabilities);
  }, []);

  const pendingCount = images.filter(
    (i) => i.status === 'pending' || i.status === 'error'
  ).length;

  const handleDownload = () => {
    if (currentImage?.processedBlob) {
      const extension = currentImage.name.split('.').pop() || 'png';
      const baseName = currentImage.name.replace(/\.[^/.]+$/, '');
      downloadBlob(
        currentImage.processedBlob,
        `${baseName}_processed.${extension}`
      );
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-20 pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-3 sm:mb-4">
            AI Image Processing Studio
          </h1>
          <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
            Transform your images with cutting-edge AI technology. All
            processing happens directly in your browser - your images never
            leave your device.
          </p>

          {/* Device Info Badge */}
          {capabilities && (
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-full text-xs text-gray-400 hover:bg-gray-800 transition-colors"
            >
              <Info className="w-3 h-3" />
              {capabilities.webgpu
                ? 'WebGPU Enabled'
                : capabilities.webgl2
                ? 'WebGL2 Enabled'
                : 'Basic Mode'}
              {capabilities.memory && ` • ${capabilities.memory}GB RAM`}
            </button>
          )}

          {showInfo && capabilities && (
            <div className="mt-2 inline-block p-3 bg-gray-800/80 rounded-lg text-xs text-left text-gray-400">
              <p>WebGL: {capabilities.webgl ? 'Yes' : 'No'}</p>
              <p>WebGL2: {capabilities.webgl2 ? 'Yes' : 'No'}</p>
              <p>WebGPU: {capabilities.webgpu ? 'Yes' : 'No'}</p>
              <p>CPU Cores: {capabilities.cores}</p>
              <p>Workers: {capabilities.workers ? 'Yes' : 'No'}</p>
            </div>
          )}
        </header>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 sm:mb-12">
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-purple-400" />}
            title="AI-Powered"
            description="State-of-the-art ESRGAN and ML models for superior results"
          />
          <FeatureCard
            icon={<ImageIcon className="w-8 h-8 text-purple-400" />}
            title="100% Private"
            description="All processing happens locally - your images never leave your device"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-purple-400" />}
            title="Real-time"
            description="Watch the transformation happen live with progress tracking"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Upload & Queue */}
          <div className="space-y-6">
            {/* Upload Section */}
            <section className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Upload Images
              </h2>
              <ImageUploader
                onUpload={addImages}
                disabled={isProcessing}
              />
            </section>

            {/* Image Queue */}
            {images.length > 0 && (
              <section className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <ImageQueue
                  images={images}
                  currentImageId={currentImageId}
                  onSelect={selectImage}
                  onRemove={removeImage}
                />
              </section>
            )}

            {/* Preview Section */}
            {currentImage && (
              <section className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl sm:text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Preview
                  </h2>
                  {currentImage.processedUrl && (
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      className="h-9"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                </div>
                <ImagePreview
                  image={currentImage}
                  showComparison={currentImage.status === 'completed'}
                  className="aspect-video"
                />
              </section>
            )}
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            {/* Feature Selection */}
            <section className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Select Feature
              </h2>
              <FeatureSelector
                selected={selectedFunction}
                onSelect={setSelectedFunction}
                disabled={isProcessing}
              />
            </section>

            {/* Processing Options */}
            {selectedFunction && (
              <section className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <h2 className="text-xl sm:text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Options
                </h2>
                <ProcessingOptions
                  selectedFunction={selectedFunction}
                  options={processingOptions}
                  onOptionsChange={setProcessingOptions}
                  disabled={isProcessing}
                />
              </section>
            )}

            {/* Warning for large upscales */}
            {selectedFunction === 'upscale' && processingOptions.scale && processingOptions.scale >= 4 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-400 font-medium">
                    High Scale Warning
                  </p>
                  <p className="text-xs text-yellow-400/70 mt-1">
                    {processingOptions.scale}x upscaling requires significant
                    processing power and may take longer on mobile devices or
                    older hardware.
                  </p>
                </div>
              </div>
            )}

            {/* Process Buttons */}
            {images.length > 0 && selectedFunction && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={processCurrentImage}
                  disabled={isProcessing || !currentImage || currentImage.status === 'completed'}
                  className="flex-1 h-12 text-base"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Process Current
                    </>
                  )}
                </Button>

                {pendingCount > 1 && (
                  <Button
                    onClick={processAllImages}
                    disabled={isProcessing}
                    variant="outline"
                    className="h-12 text-base"
                  >
                    Process All ({pendingCount})
                  </Button>
                )}
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && currentImage && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <span className="text-sm text-gray-200">
                    {currentImage.progressMessage || 'Processing...'}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                    style={{ width: `${currentImage.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">
                  {currentImage.progress}% complete
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            Powered by{' '}
            <a
              href="https://upscalerjs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              UpscalerJS
            </a>
            {' '}&{' '}
            <a
              href="https://img.ly/background-removal"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300"
            >
              IMG.LY Background Removal
            </a>
          </p>
          <p className="mt-2">
            All processing happens in your browser. Your images never leave your device.
          </p>
        </footer>
      </div>
    </main>
  );
}
