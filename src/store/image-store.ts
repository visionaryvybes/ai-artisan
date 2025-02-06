import { create } from 'zustand';
import { type AIFeature, AI_MODELS } from '@/config/ai-models';

export interface ProcessedImage {
  id: string;
  originalImage: string;
  processedImage: string;
  feature: AIFeature;
  timestamp: number;
}

interface LoadingState {
  isProcessing: boolean;
  isLoadingHistory: boolean;
  isLoadingImage: boolean;
  uploadProgress: number;
}

interface ImageState {
  selectedImage: File | null;
  processedImage: string | null;
  selectedFeature: AIFeature;
  error: string | null;
  history: ProcessedImage[];
  urls: Set<string>;
  loading: LoadingState;
  setSelectedImage: (image: File | null) => void;
  setProcessedImage: (url: string | null) => void;
  setSelectedFeature: (feature: AIFeature) => void;
  setError: (error: string | null) => void;
  setLoading: (state: Partial<LoadingState>) => void;
  addToHistory: (image: ProcessedImage) => void;
  removeFromHistory: (id: string) => void;
  loadFromHistory: (image: ProcessedImage) => void;
  clearHistory: () => void;
  addUrl: (url: string) => void;
  removeUrl: (url: string) => void;
  clearUrls: () => void;
}

const initialState = {
  selectedImage: null,
  processedImage: null,
  selectedFeature: 'enhance' as AIFeature,
  error: null,
  history: [],
  urls: new Set<string>(),
  loading: {
    isProcessing: false,
    isLoadingHistory: false,
    isLoadingImage: false,
    uploadProgress: 0,
  },
};

const validateFeature = (feature: AIFeature | undefined): AIFeature => {
  if (!feature || !(feature in AI_MODELS)) {
    return 'enhance';
  }
  return feature;
};

export const useImageStore = create<ImageState>()((set, get) => ({
  ...initialState,
  setSelectedImage: (image) => {
    set((state) => ({
      selectedImage: image,
      loading: { ...state.loading, isLoadingImage: Boolean(image) },
    }));
  },
  setProcessedImage: (url) => {
    const state = get();
    if (state.processedImage) {
      URL.revokeObjectURL(state.processedImage);
      state.urls.delete(state.processedImage);
    }
    set((state) => ({
      processedImage: url,
      loading: { ...state.loading, isLoadingImage: false },
    }));
    if (url) {
      get().addUrl(url);
    }
  },
  setSelectedFeature: (feature) => set({ selectedFeature: validateFeature(feature) }),
  setError: (error) => set({ error }),
  setLoading: (loadingState) => 
    set((state) => ({
      loading: { ...state.loading, ...loadingState },
    })),
  addToHistory: (image) =>
    set((state) => {
      get().addUrl(image.originalImage);
      get().addUrl(image.processedImage);

      return {
        history: [
          {
            ...image,
            feature: validateFeature(image.feature),
            id: String(Date.now()),
            timestamp: Date.now(),
          },
          ...state.history,
        ].slice(0, 10),
        loading: { ...state.loading, isLoadingHistory: false },
      };
    }),
  removeFromHistory: (id) =>
    set((state) => {
      const item = state.history.find((i) => i.id === id);
      if (item) {
        URL.revokeObjectURL(item.originalImage);
        URL.revokeObjectURL(item.processedImage);
        get().removeUrl(item.originalImage);
        get().removeUrl(item.processedImage);
      }
      return {
        history: state.history.filter((item) => item.id !== id),
        loading: { ...state.loading, isLoadingHistory: false },
      };
    }),
  loadFromHistory: (image) => {
    const state = get();
    if (state.processedImage) {
      URL.revokeObjectURL(state.processedImage);
      state.urls.delete(state.processedImage);
    }
    set((state) => ({
      selectedImage: null,
      processedImage: image.processedImage,
      selectedFeature: validateFeature(image.feature),
      error: null,
      loading: { ...state.loading, isLoadingHistory: true },
    }));
    get().addUrl(image.processedImage);
    // Reset loading state after a short delay
    setTimeout(() => {
      set((state) => ({
        loading: { ...state.loading, isLoadingHistory: false },
      }));
    }, 500);
  },
  clearHistory: () => {
    const state = get();
    state.history.forEach((item) => {
      URL.revokeObjectURL(item.originalImage);
      URL.revokeObjectURL(item.processedImage);
      state.urls.delete(item.originalImage);
      state.urls.delete(item.processedImage);
    });
    set((state) => ({
      history: [],
      loading: { ...state.loading, isLoadingHistory: false },
    }));
  },
  addUrl: (url) => set((state) => ({ urls: new Set([...state.urls, url]) })),
  removeUrl: (url) => set((state) => {
    const newUrls = new Set(state.urls);
    newUrls.delete(url);
    return { urls: newUrls };
  }),
  clearUrls: () => {
    const state = get();
    state.urls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to revoke URL:', error);
      }
    });
    set({ urls: new Set() });
  },
})); 