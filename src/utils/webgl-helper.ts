import * as tf from '@tensorflow/tfjs';

class WebGLHelper {
  private isWebGLAvailable: boolean = true;
  private readonly listeners: Set<(available: boolean) => void> = new Set();

  constructor() {
    this.checkWebGLAvailability();
    this.setupContextLossHandling();
  }

  private checkWebGLAvailability(): void {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      this.isWebGLAvailable = !!gl;
      
      if (!this.isWebGLAvailable) {
        console.warn('WebGL is not available, falling back to CPU backend');
        this.setupCPUBackend();
      }
    } catch (error) {
      console.error('Error checking WebGL availability:', error);
      this.isWebGLAvailable = false;
      this.setupCPUBackend();
    }
  }

  private async setupCPUBackend(): Promise<void> {
    try {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('CPU backend initialized');
    } catch (error) {
      console.error('Failed to initialize CPU backend:', error);
    }
  }

  private setupContextLossHandling(): void {
    window.addEventListener('webglcontextlost', async () => {
      console.warn('WebGL context lost');
      this.isWebGLAvailable = false;
      await this.setupCPUBackend();
      this.notifyListeners();
    });

    window.addEventListener('webglcontextrestored', async () => {
      console.log('WebGL context restored');
      this.isWebGLAvailable = true;
      await tf.setBackend('webgl');
      await tf.ready();
      this.notifyListeners();
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isWebGLAvailable));
  }

  public isAvailable(): boolean {
    return this.isWebGLAvailable;
  }

  public onAvailabilityChange(callback: (available: boolean) => void): () => void {
    this.listeners.add(callback);
    callback(this.isWebGLAvailable);

    return () => {
      this.listeners.delete(callback);
    };
  }

  public async ensureBackend(): Promise<void> {
    if (!this.isWebGLAvailable) {
      await this.setupCPUBackend();
    } else {
      await tf.setBackend('webgl');
      await tf.ready();
    }
  }

  public async withFallback<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error && error.message.includes('WEBGL')) {
        console.warn('WebGL error, falling back to CPU backend');
        await this.setupCPUBackend();
        return await operation();
      }
      throw error;
    }
  }
}

export const webglHelper = new WebGLHelper(); 