export type AIFeature = 'enhance' | 'colorize' | 'style' | 'face' | 'segment';

export interface AIModel {
  name: string;
  description: string;
  modelPath: string;
  inputSize: {
    width: number;
    height: number;
  };
  parameters?: {
    [key: string]: {
      name: string;
      description: string;
      min: number;
      max: number;
      default: number;
      step: number;
    };
  };
  loras?: {
    [key: string]: {
      path: string;
      strength: number;
    };
  };
}

export const AI_MODELS: Record<AIFeature, AIModel> = {
  enhance: {
    name: 'Visio-Upscaler',
    description: 'Ultra-high quality image enhancement',
    modelPath: '/models/real-esrgan/model.json',
    inputSize: {
      width: 1024,
      height: 1024
    },
    parameters: {
      enhancementLevel: {
        name: 'Enhancement Level',
        description: 'Controls the strength of the enhancement',
        min: 0.5,
        max: 2.0,
        default: 1.0,
        step: 0.1
      },
      tileSize: {
        name: 'Tile Size',
        description: 'Size of processing tiles (larger = more VRAM)',
        min: 128,
        max: 512,
        default: 192,
        step: 64
      }
    },
    loras: {
      moreDetails: {
        path: '/models/lora/more_details.safetensors',
        strength: 0.5
      },
      SDXLrender: {
        path: '/models/lora/SDXLrender_v2.0.safetensors',
        strength: 1.0
      }
    }
  },
  colorize: {
    name: 'DeOldify',
    description: 'Add color to black and white images',
    modelPath: '/models/deoldify/model.json',
    inputSize: {
      width: 1024,
      height: 1024
    },
    parameters: {
      colorIntensity: {
        name: 'Color Intensity',
        description: 'Controls the intensity of added colors',
        min: 0.1,
        max: 1.5,
        default: 1.0,
        step: 0.1
      }
    }
  },
  style: {
    name: 'AdaIN Style Transfer',
    description: 'Apply artistic styles to images',
    modelPath: '/models/style-transfer/model.json',
    inputSize: {
      width: 1024,
      height: 1024
    },
    parameters: {
      styleStrength: {
        name: 'Style Strength',
        description: 'Controls how strongly the style is applied',
        min: 0.1,
        max: 1.0,
        default: 0.6,
        step: 0.1
      }
    }
  },
  face: {
    name: 'GFPGAN',
    description: 'Enhance and restore facial features',
    modelPath: '/models/gfpgan/model.json',
    inputSize: {
      width: 1024,
      height: 1024
    },
    parameters: {
      enhancementLevel: {
        name: 'Enhancement Level',
        description: 'Controls the strength of facial enhancement',
        min: 0.5,
        max: 1.5,
        default: 1.0,
        step: 0.1
      }
    }
  },
  segment: {
    name: 'U-Net Segmentation',
    description: 'Segment image into distinct parts',
    modelPath: '/models/unet/model.json',
    inputSize: {
      width: 1024,
      height: 1024
    }
  }
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_DIMENSION = 13312; // Support for up to 13k resolution 