'use client';

import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { useDropzone } from 'react-dropzone';
import { Sparkles, ImageIcon, Zap, Download, ArrowRight, Palette, Loader2, Trash2 } from 'lucide-react';
import { FeatureCard } from '@/components/ui/feature-card';
import { ImageComparison } from '@/components/ui/image-comparison';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import ReactDOM from 'react-dom/client';

type ProcessingFunction = 'enhance' | 'colorize' | 'none';

interface GalleryImage {
  id: string;
  originalName: string;
  processedImage: string;  // Base64 string for preview
  processedUrl?: string;   // Full quality URL from processing
  timestamp: string;
  function: ProcessingFunction;
  scale?: number;
}

interface ImageToProcess {
  file: File;
  id: string;
  name: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  processedUrl?: string;
}

export default function HomePage() {
  const router = useRouter();
  // Processing options
  const [selectedFunction, setSelectedFunction] = useState<ProcessingFunction>('none');
  const [enhancementLevel, setEnhancementLevel] = useState(1.0);
  const [detailStrength, setDetailStrength] = useState(0.5);
  const [style, setStyle] = useState<'realistic' | 'artistic' | 'balanced'>('balanced');
  const [selectedScale, setSelectedScale] = useState<2 | 4 | 8 | 16>(2);
  const [colorIntensity, setColorIntensity] = useState(0.5);
  const [preserveDetails, setPreserveDetails] = useState(0.7);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [imagesToProcess, setImagesToProcess] = useState<ImageToProcess[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Add validation function
  const validateImageForScale = (file: File, scale: number): string | null => {
    const MAX_SIZES = {
      2: 10 * 1024 * 1024,  // 10MB for 2x
      4: 8 * 1024 * 1024,   // 8MB for 4x
      8: 5 * 1024 * 1024,   // 5MB for 8x
      16: 3 * 1024 * 1024   // 3MB for 16x
    };

    if (file.size > MAX_SIZES[scale as keyof typeof MAX_SIZES]) {
      const maxMB = MAX_SIZES[scale as keyof typeof MAX_SIZES] / (1024 * 1024);
      return `For ${scale}x scaling, image size must be under ${maxMB}MB. Please choose a smaller image or lower scale.`;
    }
    return null;
  };

  const getTimeoutDuration = (scale: number): number => {
    const BASE_TIMEOUT = 30000; // 30 seconds base timeout
    return BASE_TIMEOUT * (scale / 2); // Increase timeout proportionally with scale
  };

  // Add timer effect
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    
    if (isProcessing && processingStartTime) {
      timerId = setInterval(() => {
        setProcessingTime(Math.floor((Date.now() - processingStartTime) / 1000));
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isProcessing, processingStartTime]);

  const optimizeImage = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions (max 800px width/height)
        const maxSize = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Use JPEG with 70% quality
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for optimization'));
      };

      img.src = imageUrl;
    });
  };

  const processAllImages = async () => {
    if (selectedFunction === 'none' || isBatchProcessing) return;
    setIsBatchProcessing(true);
    setProcessingStartTime(Date.now());

    const totalImages = imagesToProcess.filter(img => img.status !== 'completed').length;
    if (totalImages === 0) {
      setIsBatchProcessing(false);
      return;
    }

    try {
      for (const image of imagesToProcess) {
        if (image.status === 'completed') continue;

        // Update status to processing
        setImagesToProcess(prev => prev.map(img => 
          img.id === image.id ? { ...img, status: 'processing', progress: 0 } : img
        ));

        try {
          // Validate image size for enhancement
          if (selectedFunction === 'enhance') {
            const validationError = validateImageForScale(image.file, selectedScale);
            if (validationError) {
              throw new Error(validationError);
            }
          }

          const formData = new FormData();
          formData.append('image', image.file);

          // Add function-specific parameters using the current selected values
          if (selectedFunction === 'enhance') {
            formData.append('enhancementLevel', enhancementLevel.toString());
            formData.append('detailStrength', detailStrength.toString());
            formData.append('style', style);
            formData.append('scale', selectedScale.toString());
          } else if (selectedFunction === 'colorize') {
            formData.append('colorIntensity', colorIntensity.toString());
            formData.append('preserveDetails', preserveDetails.toString());
          }

          // Set up progress tracking
          let progressUpdateCount = 0;
          const progressInterval = setInterval(() => {
            progressUpdateCount++;
            const progress = Math.min(
              5 + // Initial progress
              (progressUpdateCount * 2) + // Gradual progress
              (Math.random() * 2), // Random variation
              95 // Max progress before completion
            );
            setImagesToProcess(prev => prev.map(img => 
              img.id === image.id ? { ...img, progress } : img
            ));
          }, 500);

          const response = await fetch(`/api/${selectedFunction}`, {
            method: 'POST',
            body: formData,
          });

          clearInterval(progressInterval);

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to process image');
          }

          const blob = await response.blob();
          if (blob.size === 0) {
            throw new Error('Received empty response from server');
          }

          const processedUrl = URL.createObjectURL(blob);

          // Update image status to completed
          setImagesToProcess(prev => prev.map(img => 
            img.id === image.id ? {
              ...img,
              status: 'completed',
              progress: 100,
              processedUrl
            } : img
          ));

          // If this is the current preview image, update the preview
          if (image.file === currentFile) {
            setProcessedImage(processedUrl);
          }

          // Save to gallery with optimized storage
          try {
            const savedImages: GalleryImage[] = JSON.parse(localStorage.getItem('processedImages') || '[]');
            
            // Keep only the last 5 images
            if (savedImages.length >= 5) {
              savedImages.slice(0, -4).forEach(img => {
                try {
                  if (img.processedImage && typeof img.processedImage === 'string') {
                    if (img.processedImage.startsWith('blob:')) {
                      URL.revokeObjectURL(img.processedImage);
                    }
                  }
                } catch (e) {
                  console.warn('Failed to cleanup old image URL:', e);
                }
              });
              savedImages.splice(0, savedImages.length - 4);
            }

            // Create optimized preview
            const previewBase64 = await optimizeImage(processedUrl);
            
            savedImages.push({
              id: uuidv4(),
              originalName: image.name,
              processedImage: previewBase64,     // Compressed version for preview
              processedUrl: processedUrl,        // Store the full quality URL
              timestamp: new Date().toISOString(),
              function: selectedFunction,
              scale: selectedFunction === 'enhance' ? selectedScale : undefined
            });

            localStorage.setItem('processedImages', JSON.stringify(savedImages));
          } catch (storageError) {
            console.error('Failed to save to gallery:', storageError);
          }

        } catch (error) {
          console.error('Error processing image:', error);
          setImagesToProcess(prev => prev.map(img => 
            img.id === image.id ? {
              ...img,
              status: 'error',
              progress: 0,
              error: error instanceof Error ? error.message : 'Failed to process image'
            } : img
          ));
        }

        // Add a small delay between processing images
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      setIsBatchProcessing(false);
      setProcessingStartTime(null);
    }
  };

  // Add function to select an image for preview
  const selectImageForPreview = (image: ImageToProcess) => {
    setOriginalImage(image.previewUrl);
    setCurrentFile(image.file);
    setCurrentFileName(image.name);
    setProcessedImage(image.processedUrl || null);
  };

  const removeImage = (id: string) => {
    setImagesToProcess(prev => {
      const newImages = prev.filter(img => img.id !== id);
      // Cleanup URLs
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        if (image.processedUrl) {
          URL.revokeObjectURL(image.processedUrl);
        }
      }
      return newImages;
    });
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      imagesToProcess.forEach(image => {
        URL.revokeObjectURL(image.previewUrl);
        if (image.processedUrl) {
          URL.revokeObjectURL(image.processedUrl);
        }
      });
    };
  }, []);

  const processImage = async () => {
    if (!currentFile || selectedFunction === 'none') return;

    try {
      setIsProcessing(true);
      setShowTimeoutWarning(false);
      setProcessingProgress(0);
      setProcessingTime(0);
      setProcessingStartTime(Date.now());

      // Validate image size for enhancement
      if (selectedFunction === 'enhance') {
        const validationError = validateImageForScale(currentFile, selectedScale);
        if (validationError) {
          throw new Error(validationError);
        }
      }

      const formData = new FormData();
      formData.append('image', currentFile);

      // Add function-specific parameters
      if (selectedFunction === 'enhance') {
        formData.append('enhancementLevel', enhancementLevel.toString());
        formData.append('detailStrength', detailStrength.toString());
        formData.append('style', style);
        formData.append('scale', selectedScale.toString());
      } else if (selectedFunction === 'colorize') {
        formData.append('colorIntensity', colorIntensity.toString());
        formData.append('preserveDetails', preserveDetails.toString());
      }

      // Set up progress tracking
      let progressUpdateCount = 0;
      const progressInterval = setInterval(() => {
        progressUpdateCount++;
        const progress = Math.min(
          5 + // Initial progress
          (progressUpdateCount * 2) + // Gradual progress
          (Math.random() * 2), // Random variation
          95 // Max progress before completion
        );
        setProcessingProgress(progress);
      }, 500);

      const response = await fetch(`/api/${selectedFunction}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process image');
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty response from server');
      }

      const processedUrl = URL.createObjectURL(blob);
      setProcessedImage(processedUrl);
      setProcessingProgress(100);

      // Update the image in the queue
      setImagesToProcess(prev => prev.map(img => 
        img.file === currentFile ? {
          ...img,
          processedUrl,
          status: 'completed',
          progress: 100
        } : img
      ));

      // Save to gallery
      try {
        const savedImages: GalleryImage[] = JSON.parse(localStorage.getItem('processedImages') || '[]');
        
        // Keep only the last 5 images
        if (savedImages.length >= 5) {
          savedImages.slice(0, -4).forEach(img => {
            try {
              if (img.processedImage && typeof img.processedImage === 'string') {
                if (img.processedImage.startsWith('blob:')) {
                  URL.revokeObjectURL(img.processedImage);
                }
              }
            } catch (e) {
              console.warn('Failed to cleanup old image URL:', e);
            }
          });
          savedImages.splice(0, savedImages.length - 4);
        }

        // Create optimized preview
        const previewBase64 = await optimizeImage(processedUrl);
        
        savedImages.push({
          id: uuidv4(),
          originalName: currentFile.name,
          processedImage: previewBase64,     // Compressed version for preview
          processedUrl: processedUrl,        // Store the full quality URL
          timestamp: new Date().toISOString(),
          function: selectedFunction,
          scale: selectedFunction === 'enhance' ? selectedScale : undefined
        });

        localStorage.setItem('processedImages', JSON.stringify(savedImages));
      } catch (storageError) {
        console.error('Failed to save to gallery:', storageError);
      }

    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Failed to process image');
      
      // Update error state in queue
      setImagesToProcess(prev => prev.map(img => 
        img.file === currentFile ? {
          ...img,
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to process image'
        } : img
      ));
    } finally {
      setIsProcessing(false);
      setShowTimeoutWarning(false);
      setProcessingStartTime(null);
      setProcessingProgress(0);
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
      a.download = `${selectedFunction}_${currentFileName || 'image.png'}`;
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
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;
      
      const newImages = acceptedFiles.map(file => ({
        file,
        id: uuidv4(),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: 'pending' as const,
        progress: 0
      }));
      
      setImagesToProcess(prev => [...prev, ...newImages]);
      
      // Set the first image as preview if no image is currently selected
      if (!originalImage) {
        setOriginalImage(newImages[0].previewUrl);
        setCurrentFile(newImages[0].file);
        setCurrentFileName(newImages[0].name);
        setProcessedImage(null);
      }
    }
  });

  // Update the processing status message
  const getProcessingMessage = () => {
    if (!showTimeoutWarning) {
      return `Processing... ${processingProgress}% complete (${processingTime}s)`;
    }
    
    if (selectedFunction === 'enhance') {
      return `This is taking longer than usual for ${selectedScale}x scaling. Please be patient, larger scales require more processing time... (${processingTime}s)`;
    }
    
    return `This is taking longer than usual. Please be patient... (${processingTime}s)`;
  };

  // Update the image queue display
  const renderImageQueue = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {imagesToProcess.map((image) => (
        <div
          key={image.id}
          className={`p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg transition-colors ${
            image.file === currentFile ? 'ring-2 ring-purple-500' : 'hover:bg-gray-700/50'
          }`}
          onClick={() => selectImageForPreview(image)}
        >
          <div className="relative aspect-[3/2] rounded-lg overflow-hidden mb-3">
            <Image
              src={image.processedUrl || image.previewUrl}
              alt={image.name}
              fill
              className="object-cover"
              unoptimized
            />
            {image.status === 'processing' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <div className="w-full max-w-[80%] h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                    style={{ width: `${image.progress}%` }}
                  />
                </div>
                <p className="text-sm text-white">{image.progress}%</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate" title={image.name}>
                {image.name.length > 30 
                  ? image.name.substring(0, 27) + '...' 
                  : image.name}
              </p>
              <p className="text-xs text-gray-400">
                {image.status === 'pending' && 'Ready to process'}
                {image.status === 'processing' && 'Processing...'}
                {image.status === 'completed' && 'Completed'}
                {image.status === 'error' && (
                  <span className="text-red-400">Failed to process image</span>
                )}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeImage(image.id);
              }}
              className="ml-2 p-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  // Update the batch processing status section
  const remainingCount = imagesToProcess.filter(img => img.status !== 'completed').length;
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <div className="relative container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            AI Image Processing Studio
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Transform your images with cutting-edge AI technology. Enhance quality and details with advanced machine learning models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<Sparkles className="w-8 h-8 text-purple-400" />}
            title="High Quality Enhancement"
            description="Boost image quality with AI-powered enhancement"
          />
          <FeatureCard
            icon={<ImageIcon className="w-8 h-8 text-purple-400" />}
            title="Detail Generation"
            description="Generate and enhance fine details"
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8 text-purple-400" />}
            title="Real-time Processing"
            description="Fast and efficient image processing"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload and Preview */}
          <div className="space-y-6">
            {/* Upload Section */}
            <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
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
                  <div className="w-24 h-24 mx-auto bg-gray-800/50 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  {isDragActive ? (
                    <p className="text-purple-400 text-lg font-medium">Drop your images here...</p>
                  ) : (
                    <>
                      <p className="text-gray-300 text-lg font-medium">Drag & drop images here, or click to browse</p>
                      <p className="text-sm text-gray-500">Supports PNG, JPG, JPEG, WEBP up to 10MB each</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Image Queue Section - Moved here */}
            {imagesToProcess.length > 0 && (
              <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    Image Queue
                    <span className="ml-2 text-lg font-normal text-gray-400">
                      ({imagesToProcess.filter(img => img.status !== 'completed').length} of {imagesToProcess.length} remaining)
                    </span>
                  </h2>
                  <Button
                    onClick={processAllImages}
                    disabled={isBatchProcessing || selectedFunction === 'none'}
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : remainingCount > 1 ? 'Process All' : 'Process Image'}
                  </Button>
                </div>

                {isBatchProcessing && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-200">
                        Processing images in queue...
                      </p>
                      <p className="text-sm text-purple-400">
                        {imagesToProcess.filter(img => img.status === 'completed').length} / {imagesToProcess.length}
                      </p>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                        style={{
                          width: `${(imagesToProcess.filter(img => img.status === 'completed').length / imagesToProcess.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {imagesToProcess.map((image) => (
                    <div
                      key={image.id}
                      className={`p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg transition-colors ${
                        image.file === currentFile ? 'ring-2 ring-purple-500' : 'hover:bg-gray-700/50'
                      } cursor-pointer`}
                      onClick={() => selectImageForPreview(image)}
                    >
                      <div className="relative aspect-[3/2] rounded-lg overflow-hidden mb-3">
                        <Image
                          src={image.processedUrl || image.previewUrl}
                          alt={image.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        {image.status === 'processing' && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <div className="w-full max-w-[80%] h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                                style={{ width: `${image.progress}%` }}
                              />
                            </div>
                            <p className="text-sm text-white">{image.progress}%</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-200 truncate" title={image.name}>
                            {image.name.length > 30 
                              ? image.name.substring(0, 27) + '...' 
                              : image.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {image.status === 'pending' && 'Ready to process'}
                            {image.status === 'processing' && 'Processing...'}
                            {image.status === 'completed' && 'Completed'}
                            {image.status === 'error' && (
                              <span className="text-red-400">Failed to process image</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(image.id);
                          }}
                          className="ml-2 p-2 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Section */}
            <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Preview
                </h2>
                <p className="text-sm text-gray-400">
                  {imagesToProcess.filter(img => img.status === 'completed').length} of {imagesToProcess.length} processed
                </p>
              </div>
              <div className="space-y-8">
                {imagesToProcess.map((image) => (
                  <div key={image.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-300 truncate max-w-[70%]" title={image.name}>
                        {image.name}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-gray-400">
                          {image.status === 'pending' && 'Ready to process'}
                          {image.status === 'processing' && `Processing... ${image.progress}%`}
                          {image.status === 'completed' && 'Completed'}
                          {image.status === 'error' && (
                            <span className="text-red-400">Failed to process</span>
                          )}
                        </p>
                        {image.processedUrl && (
                          <Button
                            onClick={() => {
                              if (!image.processedUrl) return;
                              const a = document.createElement('a');
                              a.href = image.processedUrl;
                              a.download = `processed_${image.name}`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            variant="outline"
                            className="h-8 px-2 border-purple-500/20 hover:border-purple-500/40"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div 
                      className="relative w-full rounded-xl overflow-hidden bg-gray-800/50 cursor-pointer transition-transform hover:scale-[1.02] duration-200"
                      style={{ minHeight: '300px' }}
                      onClick={() => {
                        if (image.processedUrl) {
                          // Create modal with full-size comparison
                          const modal = document.createElement('div');
                          modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90';
                          modal.onclick = (e) => {
                            if (e.target === modal) {
                              document.body.removeChild(modal);
                            }
                          };
                          
                          const content = document.createElement('div');
                          content.className = 'relative w-full max-w-7xl bg-black rounded-xl overflow-hidden';
                          content.style.height = '85vh';
                          
                          const closeButton = document.createElement('button');
                          closeButton.className = 'absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50 z-10';
                          closeButton.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          `;
                          closeButton.onclick = () => document.body.removeChild(modal);
                          
                          const title = document.createElement('div');
                          title.className = 'absolute top-4 left-4 text-white z-10';
                          title.textContent = image.name;
                          
                          const comparisonWrapper = document.createElement('div');
                          comparisonWrapper.className = 'w-full h-full flex items-center justify-center';
                          
                          content.appendChild(title);
                          content.appendChild(closeButton);
                          content.appendChild(comparisonWrapper);
                          modal.appendChild(content);
                          document.body.appendChild(modal);
                          
                          // Add keyboard event listener for Escape key
                          const handleEscape = (e: KeyboardEvent) => {
                            if (e.key === 'Escape') {
                              document.body.removeChild(modal);
                              document.removeEventListener('keydown', handleEscape);
                            }
                          };
                          document.addEventListener('keydown', handleEscape);
                          
                          // Render comparison in modal
                          const root = ReactDOM.createRoot(comparisonWrapper);
                          root.render(
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageComparison
                                originalUrl={image.previewUrl}
                                processedUrl={image.processedUrl}
                                className="w-full h-full"
                              />
                            </div>
                          );
                        }
                      }}
                    >
                      {image.processedUrl ? (
                        <div className="aspect-[3/2]">
                          <ImageComparison
                            originalUrl={image.previewUrl}
                            processedUrl={image.processedUrl}
                            isProcessing={image.status === 'processing'}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[3/2] relative">
                          <Image
                            src={image.previewUrl}
                            alt={image.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                          {image.status === 'processing' && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                              <div className="w-full max-w-[80%] h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                                  style={{ width: `${image.progress}%` }}
                                />
                              </div>
                              <p className="text-sm text-white">{image.progress}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery Section */}
            <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Gallery
                </h2>
                <Button
                  onClick={() => router.push('/gallery')}
                  variant="outline"
                  className="border-purple-500/20 hover:border-purple-500/40"
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {imagesToProcess
                  .filter(img => img.status === 'completed')
                  .map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-[3/2] rounded-xl overflow-hidden"
                    >
                      <Image
                        src={image.processedUrl || image.previewUrl}
                        alt={image.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-sm font-medium text-white truncate">
                            {image.name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-gray-300">
                              {new Date().toLocaleDateString()}
                            </p>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!image.processedUrl) return;
                                const a = document.createElement('a');
                                a.href = image.processedUrl;
                                a.download = `processed_${image.name}`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }}
                              variant="outline"
                              className="h-8 w-8 p-0 border-white/20 hover:border-white/40"
                            >
                              <Download className="w-4 h-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column - Processing Options */}
          <div className="space-y-6">
            {/* Function Selection */}
            <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
              <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Select Function
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedFunction('enhance')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedFunction === 'enhance'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                  }`}
                >
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                  <h3 className="text-lg font-medium text-gray-200 mb-2">Enhance</h3>
                  <p className="text-sm text-gray-400">Enhance image quality and details</p>
                </button>
                <button
                  onClick={() => setSelectedFunction('colorize')}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    selectedFunction === 'colorize'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/50'
                  }`}
                >
                  <Palette className="w-10 h-10 mx-auto mb-3 text-purple-400" />
                  <h3 className="text-lg font-medium text-gray-200 mb-2">Colorize</h3>
                  <p className="text-sm text-gray-400">Add or adjust image colors</p>
                </button>
              </div>
            </div>

            {/* Enhancement Options */}
            {selectedFunction === 'enhance' && (
              <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
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
                      min={0.1}
                      max={2.0}
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
                      {['realistic', 'artistic', 'balanced'].map((styleOption) => (
                        <button
                          key={styleOption}
                          onClick={() => setStyle(styleOption as 'realistic' | 'artistic' | 'balanced')}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300
                            ${style === styleOption
                              ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                        >
                          {styleOption.charAt(0).toUpperCase() + styleOption.slice(1)}
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
            )}

            {/* Colorize Options */}
            {selectedFunction === 'colorize' && (
              <div className="p-8 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 rounded-xl">
                <h2 className="text-2xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Colorize Options
                </h2>
                <div className="space-y-8">
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-3">
                      <span>Color Intensity</span>
                      <span className="text-purple-400">{colorIntensity.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[colorIntensity]}
                      onValueChange={(values) => setColorIntensity(values[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                    />
                  </div>
                  <div>
                    <label className="flex items-center justify-between text-sm font-medium text-gray-300 mb-3">
                      <span>Preserve Details</span>
                      <span className="text-purple-400">{preserveDetails.toFixed(1)}</span>
                    </label>
                    <Slider
                      value={[preserveDetails]}
                      onValueChange={(values) => setPreserveDetails(values[0])}
                      min={0.1}
                      max={1.0}
                      step={0.1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Process Button */}
            {selectedFunction !== 'none' && (
              <div className="flex justify-end gap-4">
                <Button
                  onClick={processImage}
                  disabled={isProcessing || !currentFile}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Process Image'
                  )}
                </Button>
                {processedImage && (
                  <Button
                    onClick={downloadImage}
                    variant="outline"
                    className="border-purple-500/20 hover:border-purple-500/40"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Result
                  </Button>
                )}
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <p className="text-sm font-medium text-gray-200">
                    Processing... {processingProgress}%
                  </p>
                </div>
                <div className="mt-3 w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300" 
                    style={{ width: `${processingProgress}%` }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
