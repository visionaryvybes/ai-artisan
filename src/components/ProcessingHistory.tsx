import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useImageStore } from '@/store/image-store';
import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import { type AIFeature, AI_MODELS } from '@/config/ai-models';
import type { ProcessedImage } from '@/store/image-store';

const featureDisplayNames: Record<AIFeature, string> = {
  enhance: 'Image Enhancement',
  colorize: 'Colorization',
  style: 'Style Transfer',
  face: 'Face Enhancement',
  segment: 'Image Segmentation',
};

const ITEMS_PER_PAGE = 6;

export function ProcessingHistory() {
  const { processedImage, selectedImage, selectedFeature } = useImageStore();
  const history = useImageStore((state) => state.history || []);
  const addToHistory = useImageStore((state) => state.addToHistory);
  const removeFromHistory = useImageStore((state) => state.removeFromHistory);
  const loadFromHistory = useImageStore((state) => state.loadFromHistory);
  const addUrl = useImageStore((state) => state.addUrl);
  const [visibleItems, setVisibleItems] = useState(ITEMS_PER_PAGE);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const sentinel = document.getElementById('history-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isIntersecting && visibleItems < history.length) {
      setVisibleItems((prev) => Math.min(prev + ITEMS_PER_PAGE, history.length));
    }
  }, [isIntersecting, history.length]);

  useEffect(() => {
    if (processedImage && selectedImage && selectedFeature) {
      try {
        const originalUrl = URL.createObjectURL(selectedImage);
        addUrl(originalUrl);
        addUrl(processedImage);

        const historyItem: ProcessedImage = {
          id: Date.now().toString(),
          originalImage: originalUrl,
          processedImage,
          feature: selectedFeature,
          timestamp: Date.now(),
        };
        addToHistory(historyItem);
      } catch (error) {
        console.error('Failed to create history item:', error);
      }
    }
  }, [processedImage, selectedImage, selectedFeature, addToHistory, addUrl]);

  if (!history?.length) {
    return null;
  }

  const handleRemove = (id: string) => {
    try {
      removeFromHistory(id);
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  };

  const getFeatureDisplayName = (feature: AIFeature): string => {
    if (!feature || !(feature in AI_MODELS)) {
      return 'Unknown Effect';
    }
    return featureDisplayNames[feature];
  };

  const visibleHistory = history.slice(0, visibleItems);
  const hasMore = visibleItems < history.length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Processing History</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleHistory.map((item) => (
          <div
            key={item.id}
            className="relative rounded-lg border border-gray-300 dark:border-gray-600 p-4 bg-white dark:bg-gray-800"
          >
            <div className="aspect-w-16 aspect-h-9 mb-4 relative">
              <Image
                src={item.processedImage}
                alt={`Processed with ${getFeatureDisplayName(item.feature)}`}
                fill
                className="rounded-lg object-contain"
                loading="lazy"
                unoptimized
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getFeatureDisplayName(item.feature)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.timestamp).toLocaleString()}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => loadFromHistory(item)}
                  className="rounded-md bg-white dark:bg-gray-700 p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200"
                >
                  <span className="sr-only">Load</span>
                  <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="rounded-md bg-white dark:bg-gray-700 p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200"
                >
                  <span className="sr-only">Remove</span>
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <div
          id="history-sentinel"
          className="h-8 flex items-center justify-center text-gray-500 dark:text-gray-400"
        >
          Loading more...
        </div>
      )}
    </div>
  );
} 