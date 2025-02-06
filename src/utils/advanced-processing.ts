import * as tf from '@tensorflow/tfjs';
import { modelManager } from './model-loader';
import { AIFeature } from '@/config/ai-models';

export async function enhanceWithESRGAN(tensor: tf.Tensor3D): Promise<tf.Tensor3D> {
  const model = await modelManager.getModel('enhance');
  
  return tf.tidy(() => {
    // Ensure input is RGB and normalize to [0, 1]
    const normalized = tensor.toFloat().div(255);
    
    // Real-ESRGAN expects input in NHWC format
    const batched = normalized.expandDims(0);
    
    // Run inference
    const enhanced = model.predict(batched) as tf.Tensor4D;
    
    // Post-process: remove batch dimension and scale back to [0, 255]
    return enhanced.squeeze([0])
      .mul(255)
      .clipByValue(0, 255) as tf.Tensor3D;
  });
}

export async function colorizeWithDeOldify(tensor: tf.Tensor3D): Promise<tf.Tensor3D> {
  const model = await modelManager.getModel('colorize');
  
  return tf.tidy(() => {
    // Convert to grayscale and normalize
    const grayscale = tf.mean(tensor, 2, true).expandDims(0);
    const normalized = grayscale.div(255);
    
    // Run inference
    const colorized = model.predict(normalized) as tf.Tensor4D;
    
    // Post-process
    return colorized.squeeze()
      .mul(255)
      .clipByValue(0, 255) as tf.Tensor3D;
  });
}

export async function transferStyle(
  content: tf.Tensor3D,
  style: tf.Tensor3D
): Promise<tf.Tensor3D> {
  const model = await modelManager.getModel('style');
  
  return tf.tidy(() => {
    // Preprocess both images
    const contentNorm = content.toFloat().div(255).expandDims(0) as tf.Tensor4D;
    const styleNorm = style.toFloat().div(255).expandDims(0) as tf.Tensor4D;
    
    // Run inference
    const stylized = (model.predict([contentNorm, styleNorm]) as tf.Tensor4D)
      .squeeze([0])
      .mul(255)
      .clipByValue(0, 255) as tf.Tensor3D;
    
    return stylized;
  });
}

export async function enhanceFaceWithGFPGAN(tensor: tf.Tensor3D): Promise<tf.Tensor3D> {
  const model = await modelManager.getModel('face');
  
  return tf.tidy(() => {
    // Preprocess: resize to 512x512 and normalize
    const resized = tf.image.resizeBilinear(tensor, [512, 512]);
    const normalized = resized.toFloat().div(255).expandDims(0) as tf.Tensor4D;
    
    // Run inference
    const enhanced = (model.predict(normalized) as tf.Tensor4D)
      .squeeze([0])
      .mul(255)
      .clipByValue(0, 255) as tf.Tensor3D;
    
    // Resize back to original size if needed
    if (tensor.shape[0] !== 512 || tensor.shape[1] !== 512) {
      return tf.image.resizeBilinear(
        enhanced,
        [tensor.shape[0], tensor.shape[1]]
      ) as tf.Tensor3D;
    }
    
    return enhanced;
  });
}

export async function processWithAI(
  tensor: tf.Tensor3D,
  feature: AIFeature,
  styleImage?: tf.Tensor3D
): Promise<tf.Tensor3D> {
  switch (feature) {
    case 'enhance':
      return enhanceWithESRGAN(tensor);
    case 'colorize':
      return colorizeWithDeOldify(tensor);
    case 'style':
      if (!styleImage) {
        throw new Error('Style image is required for style transfer');
      }
      return transferStyle(tensor, styleImage);
    case 'face':
      return enhanceFaceWithGFPGAN(tensor);
    case 'segment':
      // Keep the existing segmentation implementation
      return tensor;
    default:
      throw new Error(`Unsupported feature: ${feature}`);
  }
} 