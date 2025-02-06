import * as tf from '@tensorflow/tfjs';

interface PerformanceMetrics {
  modelLoadTime: number;
  inferenceTime: number;
  memoryUsage: tf.MemoryInfo;
  gpuMemoryUsage?: number;
  fps: number;
}

interface PerformanceEvent {
  type: 'model_load' | 'inference' | 'memory' | 'fps';
  metrics: Partial<PerformanceMetrics>;
  timestamp: number;
}

interface PerformanceMetric {
  modelPath: string;
  loadTime: number;
  timestamp: number;
}

interface ProcessingMetric {
  feature: string;
  processingTime: number;
  imageSize: number;
  timestamp: number;
}

class PerformanceMonitor {
  private readonly metrics: Map<string, PerformanceMetrics> = new Map();
  private readonly listeners: Set<(event: PerformanceEvent) => void> = new Set();
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private modelMetrics: PerformanceMetric[] = [];
  private processingMetrics: ProcessingMetric[] = [];
  private readonly MAX_ENTRIES = 100;

  constructor() {
    this.startFPSMonitoring();
  }

  private startFPSMonitoring(): void {
    const updateFPS = () => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;
      this.frameCount++;

      if (elapsed >= 1000) {
        const fps = (this.frameCount * 1000) / elapsed;
        this.notifyListeners({
          type: 'fps',
          metrics: { fps },
          timestamp: now,
        });
        this.frameCount = 0;
        this.lastFrameTime = now;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }

  private async getGPUMemoryUsage(): Promise<number | undefined> {
    try {
      if ('chrome' in window && 'gpuMemoryUsage' in navigator) {
        const usage = await (navigator as any).gpuMemoryUsage();
        return usage.currentUsage;
      }
    } catch (error) {
      console.warn('Failed to get GPU memory usage:', error);
    }
    return undefined;
  }

  async recordModelLoad(modelPath: string, startTime: number): Promise<void> {
    const loadTime = performance.now() - startTime;
    this.modelMetrics.push({
      modelPath,
      loadTime,
      timestamp: Date.now(),
    });

    // Keep only the last MAX_ENTRIES
    if (this.modelMetrics.length > this.MAX_ENTRIES) {
      this.modelMetrics = this.modelMetrics.slice(-this.MAX_ENTRIES);
    }

    // Report to analytics if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'model_load', {
        event_category: 'performance',
        event_label: modelPath,
        value: Math.round(loadTime),
      });
    }
  }

  async recordInference(modelPath: string, startTime: number): Promise<void> {
    const endTime = performance.now();
    const inferenceTime = endTime - startTime;
    const memoryUsage = tf.memory();
    const gpuMemoryUsage = await this.getGPUMemoryUsage();

    const metrics = this.metrics.get(modelPath) || {
      modelLoadTime: 0,
      inferenceTime: 0,
      memoryUsage,
      gpuMemoryUsage,
      fps: 0,
    };

    metrics.inferenceTime = inferenceTime;
    metrics.memoryUsage = memoryUsage;
    metrics.gpuMemoryUsage = gpuMemoryUsage;

    this.metrics.set(modelPath, metrics);
    this.notifyListeners({
      type: 'inference',
      metrics: { inferenceTime, memoryUsage, gpuMemoryUsage },
      timestamp: endTime,
    });
  }

  async recordMemoryUsage(): Promise<void> {
    const memoryUsage = tf.memory();
    const gpuMemoryUsage = await this.getGPUMemoryUsage();
    const now = performance.now();

    this.notifyListeners({
      type: 'memory',
      metrics: { memoryUsage, gpuMemoryUsage },
      timestamp: now,
    });
  }

  getMetrics(modelPath: string): PerformanceMetrics | undefined {
    return this.metrics.get(modelPath);
  }

  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  subscribe(callback: (event: PerformanceEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(event: PerformanceEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  reset(): void {
    this.metrics.clear();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
  }

  getAverageLoadTime(modelPath: string): number {
    const relevantMetrics = this.modelMetrics.filter(m => m.modelPath === modelPath);
    if (!relevantMetrics.length) return 0;

    const sum = relevantMetrics.reduce((acc, curr) => acc + curr.loadTime, 0);
    return sum / relevantMetrics.length;
  }

  getAverageProcessingTime(feature: string): number {
    const relevantMetrics = this.processingMetrics.filter(m => m.feature === feature);
    if (!relevantMetrics.length) return 0;

    const sum = relevantMetrics.reduce((acc, curr) => acc + curr.processingTime, 0);
    return sum / relevantMetrics.length;
  }

  getPerformanceReport(): {
    modelLoading: Record<string, number>;
    processing: Record<string, number>;
  } {
    const modelLoading: Record<string, number> = {};
    const processing: Record<string, number> = {};

    // Calculate averages for model loading
    const uniqueModels = new Set(this.modelMetrics.map(m => m.modelPath));
    uniqueModels.forEach(modelPath => {
      modelLoading[modelPath] = this.getAverageLoadTime(modelPath);
    });

    // Calculate averages for processing
    const uniqueFeatures = new Set(this.processingMetrics.map(m => m.feature));
    uniqueFeatures.forEach(feature => {
      processing[feature] = this.getAverageProcessingTime(feature);
    });

    return { modelLoading, processing };
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.modelMetrics = [];
    this.processingMetrics = [];
  }
}

// Add type definition for gtag
declare global {
  interface Window {
    gtag?: (
      command: 'event',
      action: string,
      params: {
        event_category: string;
        event_label: string;
        value: number;
      }
    ) => void;
  }
}

export const performanceMonitor = new PerformanceMonitor(); 