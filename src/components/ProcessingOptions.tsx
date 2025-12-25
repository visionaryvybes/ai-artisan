'use client';

import {
  ProcessingFunction,
  ProcessingOptions as Options,
  UpscaleScale,
  EnhanceStyle,
  AIModel,
} from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface ProcessingOptionsProps {
  selectedFunction: ProcessingFunction | null;
  options: Options;
  onOptionsChange: (options: Partial<Options>) => void;
  disabled?: boolean;
}

// Reusable slider component
function OptionSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  suffix = '',
  description,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  suffix?: string;
  description?: string;
}) {
  return (
    <div>
      <label className="flex justify-between text-sm font-medium text-gray-300 mb-2">
        <span>{label}</span>
        <span className="text-purple-400">
          {value}
          {suffix}
        </span>
      </label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
      />
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

// AI Model selector
function AIModelSelector({
  value,
  onChange,
  disabled,
}: {
  value: AIModel;
  onChange: (model: AIModel) => void;
  disabled?: boolean;
}) {
  const models: { id: AIModel; name: string; description: string }[] = [
    { id: 'fast', name: 'Fast', description: 'Quick processing' },
    { id: 'balanced', name: 'Balanced', description: 'Default' },
    { id: 'quality', name: 'Quality', description: 'Best results' },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        AI Model
      </label>
      <div className="grid grid-cols-3 gap-2">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => onChange(model.id)}
            disabled={disabled}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-medium transition-all',
              value === model.id
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {model.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProcessingOptions({
  selectedFunction,
  options,
  onOptionsChange,
  disabled = false,
}: ProcessingOptionsProps) {
  if (!selectedFunction) return null;

  return (
    <div className="space-y-5">
      {/* Upscale Options */}
      {selectedFunction === 'upscale' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scale Factor
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([2, 3, 4, 8] as UpscaleScale[]).map((scale) => (
                <button
                  key={scale}
                  onClick={() => onOptionsChange({ scale })}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    options.scale === scale
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {scale}x
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Higher scales = better quality, slower processing
            </p>
          </div>
        </>
      )}

      {/* Enhanced Enhance Options with Advanced Controls */}
      {selectedFunction === 'enhance' && (
        <>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
            <p className="text-xs text-purple-300">
              GPU-accelerated processing. Adjust sliders for real-time preview.
            </p>
          </div>

          <OptionSlider
            label="Clarity"
            value={options.clarity || 0}
            onChange={(v) => onOptionsChange({ clarity: v })}
            min={0}
            max={100}
            disabled={disabled}
            description="Enhance local contrast and detail"
          />

          <OptionSlider
            label="Sharpness"
            value={options.sharpness || 0}
            onChange={(v) => onOptionsChange({ sharpness: v })}
            min={0}
            max={100}
            disabled={disabled}
            description="Enhance edge definition"
          />

          <OptionSlider
            label="Denoise"
            value={options.denoise || 0}
            onChange={(v) => onOptionsChange({ denoise: v })}
            min={0}
            max={100}
            disabled={disabled}
            description="Reduce noise and grain"
          />

          <OptionSlider
            label="Brightness"
            value={options.brightness || 0}
            onChange={(v) => onOptionsChange({ brightness: v })}
            min={-50}
            max={50}
            disabled={disabled}
          />

          <OptionSlider
            label="Contrast"
            value={options.contrast || 0}
            onChange={(v) => onOptionsChange({ contrast: v })}
            min={-50}
            max={50}
            disabled={disabled}
          />

          <OptionSlider
            label="Saturation"
            value={options.saturation || 0}
            onChange={(v) => onOptionsChange({ saturation: v })}
            min={-50}
            max={50}
            disabled={disabled}
          />

          <OptionSlider
            label="Vibrance"
            value={options.vibrance || 0}
            onChange={(v) => onOptionsChange({ vibrance: v })}
            min={-50}
            max={50}
            disabled={disabled}
            description="Smart saturation for natural colors"
          />

          <OptionSlider
            label="Hue"
            value={options.hue || 0}
            onChange={(v) => onOptionsChange({ hue: v })}
            min={-180}
            max={180}
            disabled={disabled}
            suffix="°"
            description="Shift color hue"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Style Preset
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['natural', 'vivid', 'dramatic'] as EnhanceStyle[]).map((style) => (
                <button
                  key={style}
                  onClick={() => {
                    const presets: Record<EnhanceStyle, Partial<Options>> = {
                      natural: { clarity: 20, sharpness: 15, vibrance: 10, contrast: 5 },
                      vivid: { clarity: 40, sharpness: 25, vibrance: 30, contrast: 15, saturation: 20 },
                      dramatic: { clarity: 60, sharpness: 40, contrast: 30, vibrance: 20 },
                    };
                    onOptionsChange({ style, ...presets[style] });
                  }}
                  disabled={disabled}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize',
                    options.style === style
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Colorize Options */}
      {selectedFunction === 'colorize' && (
        <OptionSlider
          label="Color Intensity"
          value={Math.round((options.colorIntensity || 0.7) * 100)}
          onChange={(v) => onOptionsChange({ colorIntensity: v / 100 })}
          min={10}
          max={100}
          step={5}
          disabled={disabled}
          suffix="%"
          description="Adjust colorization strength"
        />
      )}

      {/* AI Denoise Options */}
      {selectedFunction === 'denoise' && (
        <>
          <AIModelSelector
            value={options.aiModel || 'balanced'}
            onChange={(aiModel) => onOptionsChange({ aiModel })}
            disabled={disabled}
          />
          <OptionSlider
            label="AI Strength"
            value={options.aiStrength || 50}
            onChange={(v) => onOptionsChange({ aiStrength: v })}
            min={0}
            max={100}
            disabled={disabled}
            suffix="%"
            description="How much noise reduction to apply"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              Uses MAXIM AI model for intelligent noise removal while preserving details.
            </p>
          </div>
        </>
      )}

      {/* AI Deblur Options */}
      {selectedFunction === 'deblur' && (
        <>
          <AIModelSelector
            value={options.aiModel || 'balanced'}
            onChange={(aiModel) => onOptionsChange({ aiModel })}
            disabled={disabled}
          />
          <OptionSlider
            label="AI Strength"
            value={options.aiStrength || 50}
            onChange={(v) => onOptionsChange({ aiStrength: v })}
            min={0}
            max={100}
            disabled={disabled}
            suffix="%"
            description="Deblurring intensity"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              Removes motion blur and restores sharpness using MAXIM AI.
            </p>
          </div>
        </>
      )}

      {/* Low Light Options */}
      {selectedFunction === 'low-light' && (
        <>
          <AIModelSelector
            value={options.aiModel || 'balanced'}
            onChange={(aiModel) => onOptionsChange({ aiModel })}
            disabled={disabled}
          />
          <OptionSlider
            label="Enhancement Strength"
            value={options.aiStrength || 50}
            onChange={(v) => onOptionsChange({ aiStrength: v })}
            min={0}
            max={100}
            disabled={disabled}
            suffix="%"
            description="How much to brighten dark areas"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              AI-powered low-light enhancement recovers details from dark images.
            </p>
          </div>
        </>
      )}

      {/* AI Retouch Options */}
      {selectedFunction === 'retouch' && (
        <>
          <AIModelSelector
            value={options.aiModel || 'balanced'}
            onChange={(aiModel) => onOptionsChange({ aiModel })}
            disabled={disabled}
          />
          <OptionSlider
            label="Retouch Strength"
            value={options.aiStrength || 50}
            onChange={(v) => onOptionsChange({ aiStrength: v })}
            min={0}
            max={100}
            disabled={disabled}
            suffix="%"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              General AI improvement for photo quality enhancement.
            </p>
          </div>
        </>
      )}

      {/* Depth Map Options */}
      {selectedFunction === 'depth-map' && (
        <>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Colorize Depth</span>
              <button
                onClick={() => onOptionsChange({ depthColorize: !options.depthColorize })}
                disabled={disabled}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  options.depthColorize !== false ? 'bg-purple-500' : 'bg-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    options.depthColorize !== false ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Invert Depth</span>
              <button
                onClick={() => onOptionsChange({ depthInvert: !options.depthInvert })}
                disabled={disabled}
                className={cn(
                  'w-12 h-6 rounded-full transition-colors relative',
                  options.depthInvert ? 'bg-purple-500' : 'bg-gray-700',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    options.depthInvert ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </label>
          </div>
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              Uses Depth Anything AI to estimate depth from 2D images. Great for 3D effects and parallax.
            </p>
          </div>
        </>
      )}

      {/* Face Enhance Options */}
      {selectedFunction === 'face-enhance' && (
        <>
          <OptionSlider
            label="AI Strength"
            value={options.aiStrength || 50}
            onChange={(v) => onOptionsChange({ aiStrength: v })}
            min={0}
            max={100}
            disabled={disabled}
            suffix="%"
            description="Face enhancement intensity"
          />
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400">
              Detects faces and applies skin smoothing, brightness, and clarity enhancement.
            </p>
          </div>
        </>
      )}

      {/* Background Removal Options */}
      {selectedFunction === 'remove-background' && (
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400">
            AI automatically detects and removes the background.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Works best with clear subjects and good contrast.
          </p>
        </div>
      )}
    </div>
  );
}
