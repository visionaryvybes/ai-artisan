// Zustand store for image processing state

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  ImageToProcess,
  GalleryImage,
  ProcessingFunction,
  ProcessingOptions,
  ProcessingProgress,
} from '@/lib/types';
import {
  processImage,
  validateImage,
  getImageDimensions,
  blobToDataUrl,
} from '@/lib/image-processor';

interface ImageStore {
  // Queue state
  images: ImageToProcess[];
  currentImageId: string | null;

  // Processing state
  isProcessing: boolean;
  selectedFunction: ProcessingFunction | null;
  processingOptions: ProcessingOptions;

  // Gallery state
  gallery: GalleryImage[];

  // Device info
  isReady: boolean;

  // Actions - Queue management
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  clearQueue: () => void;
  selectImage: (id: string) => void;

  // Actions - Processing
  setSelectedFunction: (fn: ProcessingFunction | null) => void;
  setProcessingOptions: (options: Partial<ProcessingOptions>) => void;
  processCurrentImage: () => Promise<void>;
  processAllImages: () => Promise<void>;

  // Actions - Gallery
  addToGallery: (image: GalleryImage) => void;
  removeFromGallery: (id: string) => void;
  clearGallery: () => void;

  // Actions - Setup
  setReady: (ready: boolean) => void;

  // Internal
  updateImageProgress: (id: string, progress: ProcessingProgress) => void;
  updateImageStatus: (
    id: string,
    status: ImageToProcess['status'],
    data?: Partial<ImageToProcess>
  ) => void;
}

export const useImageStore = create<ImageStore>()(
  persist(
    (set, get) => ({
      // Initial state
      images: [],
      currentImageId: null,
      isProcessing: false,
      selectedFunction: null,
      processingOptions: {
        // Upscale
        scale: 2,
        // Basic adjustments
        brightness: 0,
        contrast: 0,
        saturation: 0,
        sharpness: 0,
        style: 'natural',
        // Advanced controls - similar to Krea
        clarity: 0,
        denoise: 0,
        vibrance: 0,
        structure: 0,
        hue: 0,
        aiStrength: 50,
        resemblance: 80, // How close to original (100 = most similar)
        preset: 'none',
        aiModel: 'balanced',
        // Colorize
        colorIntensity: 0.7,
        // Depth map
        depthColorize: true,
        depthInvert: false,
        // Output
        quality: 90,
        format: 'png',
      },
      gallery: [],
      isReady: false,

      // Setup
      setReady: (ready: boolean) => set({ isReady: ready }),

      // Queue management
      addImages: async (files: File[]) => {
        const newImages: ImageToProcess[] = [];

        for (const file of files) {
          const validation = validateImage(file);
          if (!validation.valid) {
            console.warn(`Skipping ${file.name}: ${validation.error}`);
            continue;
          }

          const id = uuidv4();
          const previewUrl = URL.createObjectURL(file);

          let dimensions;
          try {
            dimensions = await getImageDimensions(previewUrl);
          } catch {
            dimensions = undefined;
          }

          newImages.push({
            id,
            file,
            name: file.name,
            previewUrl,
            originalDimensions: dimensions,
            status: 'pending',
            progress: 0,
          });
        }

        set((state) => {
          const updatedImages = [...state.images, ...newImages];
          return {
            images: updatedImages,
            currentImageId:
              state.currentImageId || newImages[0]?.id || state.currentImageId,
          };
        });
      },

      removeImage: (id: string) => {
        set((state) => {
          const image = state.images.find((img) => img.id === id);
          if (image) {
            URL.revokeObjectURL(image.previewUrl);
            if (image.processedUrl) {
              URL.revokeObjectURL(image.processedUrl);
            }
          }

          const newImages = state.images.filter((img) => img.id !== id);
          return {
            images: newImages,
            currentImageId:
              state.currentImageId === id
                ? newImages[0]?.id || null
                : state.currentImageId,
          };
        });
      },

      clearQueue: () => {
        const { images } = get();
        images.forEach((img) => {
          URL.revokeObjectURL(img.previewUrl);
          if (img.processedUrl) {
            URL.revokeObjectURL(img.processedUrl);
          }
        });
        set({ images: [], currentImageId: null });
      },

      selectImage: (id: string) => {
        set({ currentImageId: id });
      },

      // Processing
      setSelectedFunction: (fn: ProcessingFunction | null) => {
        set({ selectedFunction: fn });
      },

      setProcessingOptions: (options: Partial<ProcessingOptions>) => {
        set((state) => ({
          processingOptions: { ...state.processingOptions, ...options },
        }));
      },

      processCurrentImage: async () => {
        const { currentImageId, images, selectedFunction, processingOptions } =
          get();

        if (!currentImageId || !selectedFunction) return;

        const image = images.find((img) => img.id === currentImageId);
        if (!image || image.status === 'processing') return;

        set({ isProcessing: true });
        get().updateImageStatus(currentImageId, 'processing');

        const startTime = Date.now();

        try {
          const processedBlob = await processImage(
            image.file,
            selectedFunction,
            processingOptions,
            (progress) => {
              get().updateImageProgress(currentImageId, progress);
            }
          );

          const processedUrl = URL.createObjectURL(processedBlob);
          const processingTime = Date.now() - startTime;

          get().updateImageStatus(currentImageId, 'completed', {
            processedUrl,
            processedBlob,
            processingFunction: selectedFunction,
            options: { ...processingOptions },
            processingTime,
          });

          // Add to gallery
          try {
            const thumbnail = await blobToDataUrl(processedBlob);
            const dims = await getImageDimensions(processedUrl);
            get().addToGallery({
              id: uuidv4(),
              originalName: image.name,
              thumbnailUrl: thumbnail.length > 50000 ? thumbnail.slice(0, 50000) : thumbnail,
              fullUrl: processedUrl,
              timestamp: new Date().toISOString(),
              processingFunction: selectedFunction,
              options: { ...processingOptions },
              dimensions: dims,
            });
          } catch (e) {
            console.warn('Failed to add to gallery:', e);
          }
        } catch (error) {
          get().updateImageStatus(currentImageId, 'error', {
            error:
              error instanceof Error ? error.message : 'Processing failed',
          });
        } finally {
          set({ isProcessing: false });
        }
      },

      processAllImages: async () => {
        const { images, selectedFunction } = get();

        if (!selectedFunction) return;

        const pendingImages = images.filter(
          (img) => img.status === 'pending' || img.status === 'error'
        );

        for (const image of pendingImages) {
          get().selectImage(image.id);
          await get().processCurrentImage();
        }
      },

      // Gallery
      addToGallery: (image: GalleryImage) => {
        set((state) => {
          // Keep only the last 20 images
          const newGallery = [...state.gallery, image];
          if (newGallery.length > 20) {
            newGallery.shift();
          }
          return { gallery: newGallery };
        });
      },

      removeFromGallery: (id: string) => {
        set((state) => ({
          gallery: state.gallery.filter((img) => img.id !== id),
        }));
      },

      clearGallery: () => {
        set({ gallery: [] });
      },

      // Internal helpers
      updateImageProgress: (id: string, progress: ProcessingProgress) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id
              ? {
                  ...img,
                  progress: progress.progress,
                  progressMessage: progress.message,
                }
              : img
          ),
        }));
      },

      updateImageStatus: (
        id: string,
        status: ImageToProcess['status'],
        data?: Partial<ImageToProcess>
      ) => {
        set((state) => ({
          images: state.images.map((img) =>
            img.id === id
              ? {
                  ...img,
                  status,
                  progress: status === 'completed' ? 100 : img.progress,
                  ...data,
                }
              : img
          ),
        }));
      },
    }),
    {
      name: 'ai-artisan-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist gallery (thumbnails only, no blobs)
        gallery: state.gallery.map((img) => ({
          ...img,
          fullUrl: '', // Don't persist blob URLs
        })),
        processingOptions: state.processingOptions,
        selectedFunction: state.selectedFunction,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useCurrentImage = () => {
  const images = useImageStore((state) => state.images);
  const currentImageId = useImageStore((state) => state.currentImageId);
  return images.find((img) => img.id === currentImageId);
};

export const usePendingImages = () => {
  const images = useImageStore((state) => state.images);
  return images.filter((img) => img.status === 'pending');
};

export const useCompletedImages = () => {
  const images = useImageStore((state) => state.images);
  return images.filter((img) => img.status === 'completed');
};
