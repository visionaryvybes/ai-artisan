import * as tf from '@tensorflow/tfjs-node';
import { processImage } from '@/utils/server/image-processing';
import { loadImageAsTensor, tensorToBlob, processWithTensorflow } from '@/utils/image-processing';
import { AIFeature } from '@/config/ai-models';
import fs from 'fs/promises';
import path from 'path';

// Mock TensorFlow.js functions
jest.mock('@tensorflow/tfjs-node', () => ({
  ...jest.requireActual('@tensorflow/tfjs-node'),
  loadGraphModel: jest.fn(),
  browser: {
    fromPixels: jest.fn(),
    toPixels: jest.fn()
  }
}));

describe('Image Processing', () => {
  const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
  let testImageBuffer: Buffer;
  let testImageFile: File;

  beforeAll(async () => {
    // Load test image
    testImageBuffer = await fs.readFile(testImagePath);
    testImageFile = new File([testImageBuffer], 'test-image.jpg', { type: 'image/jpeg' });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server-side Image Processing', () => {
    it('should process image with default options', async () => {
      const result = await processImage(testImageBuffer);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should process image with custom options', async () => {
      const result = await processImage(testImageBuffer, {
        resize: {
          width: 800,
          height: 600,
          fit: 'cover'
        },
        format: 'webp',
        quality: 85,
        enhance: true
      });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle invalid input', async () => {
      const invalidBuffer = Buffer.from('invalid');
      await expect(processImage(invalidBuffer)).rejects.toThrow();
    });
  });

  describe('Client-side Image Processing', () => {
    beforeEach(() => {
      // Mock TensorFlow.js functions
      (tf.browser.fromPixels as jest.Mock).mockReturnValue(
        tf.ones([224, 224, 3])
      );
      (tf.browser.toPixels as jest.Mock).mockResolvedValue(
        new Uint8ClampedArray(224 * 224 * 4)
      );
      (tf.loadGraphModel as jest.Mock).mockResolvedValue({
        predict: jest.fn().mockReturnValue(tf.ones([1, 224, 224, 3]))
      });
    });

    it('should load image as tensor', async () => {
      const tensor = await loadImageAsTensor(testImageFile);
      expect(tensor).toBeInstanceOf(tf.Tensor);
      expect(tensor.shape).toHaveLength(3);
    });

    it('should convert tensor to blob', async () => {
      const tensor = tf.ones([224, 224, 3]) as tf.Tensor3D;
      const blob = await tensorToBlob(tensor);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should process image with TensorFlow.js', async () => {
      const features: AIFeature[] = ['enhance', 'colorize', 'style', 'face', 'segment'];

      for (const feature of features) {
        const result = await processWithTensorflow(testImageFile, feature);
        expect(result).toBeInstanceOf(Blob);
      }
    });

    it('should handle processing errors', async () => {
      // Mock a processing error
      (tf.loadGraphModel as jest.Mock).mockRejectedValue(new Error('Model not found'));

      await expect(
        processWithTensorflow(testImageFile, 'enhance')
      ).rejects.toThrow('Model not found');
    });
  });
}); 