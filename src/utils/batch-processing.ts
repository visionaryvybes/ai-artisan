import * as tf from '@tensorflow/tfjs';
import { AIFeature, AI_MODELS } from '@/config/ai-models';
import { loadImageAsTensor, tensorToBlob } from './image-processing';
import { optimizeImage } from './image-optimization';
import JSZip from 'jszip';

export interface BatchProgress {
  current: number;
  total: number;
  currentFileName: string;
}

export interface BatchResult {
  originalFile: File;
  processedBlob: Blob;
  feature: AIFeature;
}

interface BatchProcessingOptions {
  feature: AIFeature;
  parameters?: {
    enhancementLevel?: number;
    detailGeneration?: {
      enabled: boolean;
      strength?: number;
      style?: 'realistic' | 'artistic' | 'balanced';
    };
    textureEnhancement?: {
      enabled: boolean;
      strength?: number;
      preservation?: number;
    };
  };
  concurrency?: number;
  onProgress?: (progress: BatchProgress) => void;
}

export async function processBatch(
  files: File[],
  options: BatchProcessingOptions
): Promise<Blob[]> {
  const {
    feature,
    parameters = {},
    concurrency = 2,
    onProgress
  } = options;

  const model = await tf.loadGraphModel(AI_MODELS[feature].modelPath);
  const results: Blob[] = [];
  let completed = 0;

  // Process files in chunks to manage memory
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    const chunkPromises = chunk.map(async (file) => {
      try {
        // Load and process image
        const tensor = await loadImageAsTensor(file);
        const processedTensor = tf.tidy(() => {
          const batched = tensor.expandDims(0);
          // Convert parameters to tensor scalars with proper type checking
          const paramValues = Object.values(parameters).map(p => {
            if (typeof p === 'number') return tf.scalar(p);
            if (typeof p === 'boolean') return tf.scalar(p ? 1 : 0);
            if (p === undefined) return tf.scalar(0);
            return tf.scalar(0); // default case
          });
          
          const processed = model.predict([batched, ...paramValues]) as tf.Tensor4D;
          return processed.squeeze([0]) as tf.Tensor3D;
        });

        try {
          const blob = await tensorToBlob(processedTensor);
          const optimizedBlob = await optimizeImage(blob, {
            maxWidth: 2048,
            maxHeight: 2048,
            quality: 0.95,
            format: 'png',
            enhance: true,
            enhancementLevel: parameters.enhancementLevel || 1.0,
            detailGeneration: parameters.detailGeneration || {
              enabled: true,
              strength: 0.5,
              style: 'balanced'
            },
            textureEnhancement: parameters.textureEnhancement || {
              enabled: true,
              strength: 0.5,
              preservation: 0.7
            }
          });

          completed++;
          onProgress?.({
            current: completed,
            total: files.length,
            currentFileName: file.name
          });

          return optimizedBlob;
        } finally {
          tf.dispose([tensor, processedTensor]);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        throw error;
      }
    });

    // Wait for current chunk to complete
    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Force garbage collection between chunks
    tf.disposeVariables();
    await tf.nextFrame();
  }

  return results;
}

export async function estimateBatchProcessingTime(
  files: File[],
  feature: AIFeature
): Promise<number> {
  // Rough estimation based on file sizes and model complexity
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const averageTimePerMB = feature === 'enhance' ? 2000 : 1000; // milliseconds
  return (totalSize / (1024 * 1024)) * averageTimePerMB;
}

export function* createBatchChunks<T>(
  items: T[],
  chunkSize: number
): Generator<T[]> {
  for (let i = 0; i < items.length; i += chunkSize) {
    yield items.slice(i, i + chunkSize);
  }
}

export function downloadBatchResults(results: BatchResult[]): void {
  // Create a zip file containing all processed images
  const zip = new JSZip();
  
  results.forEach((result, index) => {
    const fileName = `processed_${index + 1}_${result.originalFile.name}`;
    zip.file(fileName, result.processedBlob);
  });
  
  // Generate and download the zip file
  zip.generateAsync({ type: 'blob' })
    .then((content: Blob) => {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_images.zip';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch((error: Error) => {
      console.error('Failed to create zip file:', error);
    });
} 