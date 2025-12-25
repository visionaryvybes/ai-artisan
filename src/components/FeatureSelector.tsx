'use client';

import { ProcessingFunction } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Eraser,
  Wand2,
  Palette,
  Waves,
  Focus,
  Sun,
  Camera,
  Layers,
  Smile,
  Paintbrush,
} from 'lucide-react';

interface Feature {
  id: ProcessingFunction;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'ai' | 'advanced';
  isNew?: boolean;
}

const features: Feature[] = [
  // Core features
  {
    id: 'upscale',
    name: 'AI Upscale',
    description: 'Increase resolution with ESRGAN AI',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'core',
  },
  {
    id: 'remove-background',
    name: 'Remove Background',
    description: 'AI-powered background removal',
    icon: <Eraser className="w-5 h-5" />,
    category: 'core',
  },
  {
    id: 'enhance',
    name: 'Enhance',
    description: 'Advanced controls: clarity, sharpness, vibrance',
    icon: <Wand2 className="w-5 h-5" />,
    category: 'core',
  },
  {
    id: 'colorize',
    name: 'Colorize',
    description: 'Add or adjust image colors',
    icon: <Palette className="w-5 h-5" />,
    category: 'core',
  },
  // AI features
  {
    id: 'denoise',
    name: 'AI Denoise',
    description: 'Remove noise & grain with MAXIM AI',
    icon: <Waves className="w-5 h-5" />,
    category: 'ai',
    isNew: true,
  },
  {
    id: 'deblur',
    name: 'AI Deblur',
    description: 'Remove blur & restore sharpness',
    icon: <Focus className="w-5 h-5" />,
    category: 'ai',
    isNew: true,
  },
  {
    id: 'low-light',
    name: 'Low Light',
    description: 'Brighten dark images with AI',
    icon: <Sun className="w-5 h-5" />,
    category: 'ai',
    isNew: true,
  },
  {
    id: 'retouch',
    name: 'AI Retouch',
    description: 'General image improvement',
    icon: <Camera className="w-5 h-5" />,
    category: 'ai',
    isNew: true,
  },
  // Advanced features
  {
    id: 'depth-map',
    name: 'Depth Map',
    description: 'Generate depth visualization',
    icon: <Layers className="w-5 h-5" />,
    category: 'advanced',
    isNew: true,
  },
  {
    id: 'face-enhance',
    name: 'Face Enhance',
    description: 'Detect & enhance faces',
    icon: <Smile className="w-5 h-5" />,
    category: 'advanced',
    isNew: true,
  },
  {
    id: 'style-transfer',
    name: 'Style Transfer',
    description: 'Apply artistic styles',
    icon: <Paintbrush className="w-5 h-5" />,
    category: 'advanced',
    isNew: true,
  },
];

interface FeatureSelectorProps {
  selected: ProcessingFunction | null;
  onSelect: (feature: ProcessingFunction) => void;
  disabled?: boolean;
}

const categoryLabels = {
  core: 'Core Features',
  ai: 'AI Enhancement',
  advanced: 'Advanced',
};

export function FeatureSelector({
  selected,
  onSelect,
  disabled = false,
}: FeatureSelectorProps) {
  const categories = ['core', 'ai', 'advanced'] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const categoryFeatures = features.filter((f) => f.category === category);
        if (categoryFeatures.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
              {categoryLabels[category]}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {categoryFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => onSelect(feature.id)}
                  disabled={disabled}
                  className={cn(
                    'relative flex flex-col items-center p-3 rounded-lg border transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-gray-900',
                    selected === feature.id
                      ? 'border-purple-500 bg-purple-500/10 shadow-md shadow-purple-500/20'
                      : 'border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/50',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {feature.isNew && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full">
                      NEW
                    </span>
                  )}
                  <div
                    className={cn(
                      'mb-2 p-2 rounded-lg transition-colors',
                      selected === feature.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-gray-800/50 text-gray-400'
                    )}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xs font-medium text-gray-200 text-center leading-tight">
                    {feature.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 text-center mt-1 line-clamp-2 hidden sm:block">
                    {feature.description}
                  </p>
                  {selected === feature.id && (
                    <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-purple-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
