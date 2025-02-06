# AI Artisan

AI Artisan is a Next.js application that leverages AI for image enhancement, style transfer, colorization, face enhancement, and design suggestions. The application uses Hugging Face's AI models for processing images directly in the browser.

## Features

- Image Enhancement & Upscaling using Real-ESRGAN
- Colorization with DeOldify
- Style Transfer with AdaIN
- Face Enhancement with GFPGAN
- Image Segmentation with Unet

## Prerequisites

- Node.js 18.x or later
- A Hugging Face API key (get one from [Hugging Face](https://huggingface.co/settings/tokens))

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-artisan
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Hugging Face API key:
```env
NEXT_PUBLIC_HUGGING_FACE_API_KEY=your-api-key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Usage

1. Upload an image by dragging and dropping it into the designated area or clicking to select a file.
2. Choose an AI feature to apply to your image:
   - Image Enhancement: Improve image quality and resolution
   - Colorization: Add color to black and white images
   - Style Transfer: Apply artistic styles to your images
   - Face Enhancement: Improve facial features and details
   - Image Segmentation: Separate image into distinct parts
3. Enter your Hugging Face API key if not already configured
4. Click "Process Image" and wait for the results

## Technical Details

- Built with Next.js 14 and TypeScript
- Uses TensorFlow.js for client-side processing
- Integrates with Hugging Face's AI models
- Implements modern UI with Tailwind CSS
- State management with Zustand

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
