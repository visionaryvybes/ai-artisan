import '@testing-library/jest-dom';
import * as tf from '@tensorflow/tfjs-node';

// Configure TensorFlow.js for testing
beforeAll(async () => {
  // Use CPU backend for testing
  await tf.setBackend('cpu');
  await tf.ready();
});

// Clean up TensorFlow.js memory after each test
afterEach(() => {
  tf.disposeVariables();
});

// Mock browser APIs
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src = '';
  width = 224;
  height = 224;

  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
}

const mockContext2D = {
  drawImage: jest.fn(),
  putImageData: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(224 * 224 * 4),
    width: 224,
    height: 224
  }))
};

const mockCanvas = {
  getContext: jest.fn((type: string) => type === '2d' ? mockContext2D : null),
  toBlob: jest.fn((callback: (blob: Blob | null) => void) => {
    callback(new Blob(['mock-image-data'], { type: 'image/webp' }));
  }),
  width: 224,
  height: 224
};

// Set up global mocks
Object.defineProperty(global, 'Image', {
  value: MockImage
});

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: jest.fn(() => mockCanvas)
});

Object.defineProperty(global, 'createImageBitmap', {
  value: jest.fn(async () => ({}))
});

// Mock URL utilities
Object.defineProperty(URL, 'createObjectURL', {
  value: jest.fn(() => 'mock-url')
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: jest.fn()
});

// Mock WebGL context
class MockWebGLRenderingContext {
  canvas: HTMLCanvasElement;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  getExtension() { return null; }
  getParameter() { return 0; }
  getShaderPrecisionFormat() { return { precision: 0, rangeMin: 0, rangeMax: 0 }; }
}

HTMLCanvasElement.prototype.getContext = function(contextType: string) {
  switch (contextType) {
    case '2d':
      return new MockCanvasRenderingContext2D(this);
    case 'webgl':
    case 'webgl2':
      return new MockWebGLRenderingContext(this);
    default:
      return null;
  }
};

// Mock window.URL.createObjectURL
window.URL.createObjectURL = jest.fn();
window.URL.revokeObjectURL = jest.fn();

// Mock performance.now
window.performance.now = jest.fn(() => Date.now());

// Mock WebGL context
const mockWebGLContext = {
  getExtension: jest.fn(),
  getParameter: jest.fn(),
  getShaderPrecisionFormat: jest.fn(() => ({
    precision: 23,
    rangeMin: 127,
    rangeMax: 127,
  })),
  canvas: null as HTMLCanvasElement | null,
  drawingBufferWidth: 0,
  drawingBufferHeight: 0,
  ARRAY_BUFFER: 0,
  ELEMENT_ARRAY_BUFFER: 0,
  STATIC_DRAW: 0,
  DYNAMIC_DRAW: 0,
  FLOAT: 0,
  TRIANGLES: 0,
  LINE_STRIP: 0,
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createProgram: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  attachShader: jest.fn(),
  createTexture: jest.fn(),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  viewport: jest.fn(),
  clear: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
} as unknown as WebGLRenderingContext;

const getContextMock = jest.fn((contextId: string) => {
  if (contextId === 'webgl' || contextId === 'webgl2') {
    return mockWebGLContext;
  }
  if (contextId === '2d') {
    return null; // Let the original implementation handle 2D context
  }
  return null;
});

// @ts-expect-error: Mock implementation for tests
HTMLCanvasElement.prototype.getContext = getContextMock;

// Mock OffscreenCanvas
interface MockCanvasRenderingContext2D {
  drawImage: jest.Mock;
  getImageData: jest.Mock;
  putImageData: jest.Mock;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  font: string;
  fillText: jest.Mock;
  strokeText: jest.Mock;
}

class MockOffscreenCanvas {
  constructor(public readonly width: number, public readonly height: number) {}

  getContext(_contextId: '2d'): MockCanvasRenderingContext2D {
    return {
      drawImage: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(this.width * this.height * 4),
        width: this.width,
        height: this.height,
      })),
      putImageData: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      fillText: jest.fn(),
      strokeText: jest.fn(),
    };
  }

  convertToBlob(options?: ImageEncodeOptions): Promise<Blob> {
    return Promise.resolve(new Blob([], { type: options?.type || 'image/png' }));
  }
}

// @ts-expect-error: Mock implementation for tests
global.OffscreenCanvas = MockOffscreenCanvas;

// Mock createImageBitmap
interface MockImageBitmap {
  readonly width: number;
  readonly height: number;
  close(): void;
}

const createImageBitmapMock = jest.fn((_image: ImageBitmapSource): Promise<MockImageBitmap> => {
  return Promise.resolve({
    width: 100,
    height: 100,
    close: jest.fn(),
  });
});

// @ts-expect-error: Mock implementation for tests
global.createImageBitmap = createImageBitmapMock; 