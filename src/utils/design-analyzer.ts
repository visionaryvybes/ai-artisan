import * as tf from '@tensorflow/tfjs';

interface ColorInfo {
  color: string;
  percentage: number;
}

interface ImageAnalysis {
  dominantColors: ColorInfo[];
  brightness: number;
  contrast: number;
  sharpness: number;
  aspectRatio: number;
  resolution: {
    width: number;
    height: number;
  };
}

interface DesignSuggestion {
  type: 'color' | 'composition' | 'quality' | 'size';
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function calculateSharpness(tensor: tf.Tensor3D): number {
  return tf.tidy(() => {
    const grayscale = tf.mean(tensor, 2);
    const sobelX = tf.tensor2d([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]);
    const sobelY = tf.tensor2d([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]);
    
    const img4D = grayscale.expandDims(0).expandDims(-1) as tf.Tensor4D;
    const kernelX = sobelX.expandDims(2).expandDims(3) as tf.Tensor4D;
    const kernelY = sobelY.expandDims(2).expandDims(3) as tf.Tensor4D;
    
    const edgesX = tf.conv2d(img4D, kernelX, 1, 'same');
    const edgesY = tf.conv2d(img4D, kernelY, 1, 'same');
    
    const magnitude = tf.sqrt(
      edgesX.square().add(edgesY.square())
    ).mean().dataSync()[0];
    
    return (magnitude / 255) * 100;
  });
}

function colorToRGB(color: number[]): [number, number, number] {
  return [color[0], color[1], color[2]];
}

async function findDominantColors(tensor: tf.Tensor3D, numColors: number = 5): Promise<ColorInfo[]> {
  return tf.tidy(() => {
    // Resize image to speed up processing
    const resized = tf.image.resizeBilinear(tensor, [50, 50]);
    const pixels = resized.reshape([-1, 3]);
    
    // Simple k-means clustering
    const points = pixels.arraySync() as number[][];
    const centroids: number[][] = [];
    const seen = new Set<string>();
    
    // Initialize centroids with unique colors
    for (let i = 0; i < points.length && centroids.length < numColors; i++) {
      const color = points[i];
      const key = color.join(',');
      if (!seen.has(key)) {
        centroids.push(color);
        seen.add(key);
      }
    }
    
    // Count pixels closest to each centroid
    const counts = new Array(centroids.length).fill(0);
    points.forEach(point => {
      let minDist = Infinity;
      let closest = 0;
      
      centroids.forEach((centroid, i) => {
        const dist = Math.sqrt(
          (point[0] - centroid[0]) ** 2 +
          (point[1] - centroid[1]) ** 2 +
          (point[2] - centroid[2]) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      });
      
      counts[closest]++;
    });
    
    // Convert to percentages and hex colors
    const total = counts.reduce((a, b) => a + b, 0);
    return centroids.map((centroid, i) => ({
      color: rgbToHex(...colorToRGB(centroid)),
      percentage: (counts[i] / total) * 100
    })).sort((a, b) => b.percentage - a.percentage);
  });
}

function calculateBrightness(tensor: tf.Tensor3D): number {
  return tf.tidy(() => {
    const mean = tf.mean(tensor).dataSync()[0];
    return (mean / 255) * 100;
  });
}

function calculateContrast(tensor: tf.Tensor3D): number {
  return tf.tidy(() => {
    const grayscale = tf.mean(tensor, 2);
    const std = tf.moments(grayscale).variance.sqrt().dataSync()[0];
    return (std / 128) * 100;
  });
}

export async function analyzeImage(tensor: tf.Tensor3D): Promise<ImageAnalysis> {
  const dominantColors = await findDominantColors(tensor);
  const brightness = calculateBrightness(tensor);
  const contrast = calculateContrast(tensor);
  const sharpness = calculateSharpness(tensor);
  
  return {
    dominantColors,
    brightness,
    contrast,
    sharpness,
    aspectRatio: tensor.shape[1] / tensor.shape[0],
    resolution: {
      width: tensor.shape[1],
      height: tensor.shape[0]
    }
  };
}

export function generateSuggestions(analysis: ImageAnalysis): DesignSuggestion[] {
  const suggestions: DesignSuggestion[] = [];
  
  // Color suggestions
  if (analysis.dominantColors.length <= 2) {
    suggestions.push({
      type: 'color',
      suggestion: 'Consider adding more color variety to make the image more visually interesting',
      priority: 'medium'
    });
  }
  
  // Brightness suggestions
  if (analysis.brightness < 30) {
    suggestions.push({
      type: 'color',
      suggestion: 'The image is quite dark. Consider increasing brightness or exposure',
      priority: 'high'
    });
  } else if (analysis.brightness > 80) {
    suggestions.push({
      type: 'color',
      suggestion: 'The image is very bright. Consider reducing brightness or adding more contrast',
      priority: 'high'
    });
  }
  
  // Contrast suggestions
  if (analysis.contrast < 20) {
    suggestions.push({
      type: 'color',
      suggestion: 'Low contrast detected. Consider increasing contrast to make the image more dynamic',
      priority: 'medium'
    });
  }
  
  // Sharpness suggestions
  if (analysis.sharpness < 10) {
    suggestions.push({
      type: 'quality',
      suggestion: 'The image appears to be blurry. Consider using a sharper image or applying sharpening',
      priority: 'high'
    });
  }
  
  // Resolution suggestions
  const minDimension = Math.min(analysis.resolution.width, analysis.resolution.height);
  if (minDimension < 800) {
    suggestions.push({
      type: 'size',
      suggestion: 'Image resolution is relatively low. Consider using a higher resolution image',
      priority: minDimension < 500 ? 'high' : 'medium'
    });
  }
  
  // Aspect ratio suggestions
  if (analysis.aspectRatio < 0.5 || analysis.aspectRatio > 2) {
    suggestions.push({
      type: 'composition',
      suggestion: 'The image has an extreme aspect ratio. Consider cropping to a more balanced ratio',
      priority: 'medium'
    });
  }
  
  return suggestions;
} 