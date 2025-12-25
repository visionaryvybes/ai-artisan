# AI Artisan - AI Image Processing Studio

A fully client-side AI-powered image processing application. All processing happens directly in your browser - your images never leave your device.

## Features

- **AI Upscale** - Increase image resolution using ESRGAN AI models (2x, 3x, 4x, 8x)
- **Remove Background** - AI-powered background removal using IMG.LY
- **Enhance** - Improve image quality with brightness, contrast, saturation, and sharpness adjustments
- **Colorize** - Add or adjust colors in images

## Key Benefits

- **100% Private** - All processing happens in your browser
- **No Server Costs** - No backend required, works offline after initial load
- **Real-time Progress** - Watch the transformation happen live
- **Mobile Friendly** - Works on both desktop and mobile devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS
- **Zustand** - State management
- **UpscalerJS** - AI image upscaling with ESRGAN
- **@imgly/background-removal** - Client-side background removal
- **Radix UI** - Accessible UI primitives

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/visionaryvybes/ai-artisan.git
cd ai-artisan
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Upload images by dragging and dropping or clicking to browse
2. Select a processing feature (Upscale, Remove Background, Enhance, or Colorize)
3. Adjust options as needed
4. Click "Process Current" to process the selected image
5. Download the processed result

## Browser Support

- Chrome 90+ (recommended)
- Firefox 90+
- Safari 15+
- Edge 90+

For best performance, use a browser with WebGL2 support. WebGPU-enabled browsers will have even better performance.

## Performance Tips

- Start with smaller images (under 2MB) for faster processing
- Use lower upscale factors (2x, 3x) for quicker results
- Close other browser tabs to free up memory
- Use a device with a dedicated GPU for best performance

## Deployment

This project is optimized for deployment on Vercel:

```bash
npm run build
```

The app can also be deployed to any static hosting provider.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Credits

- [UpscalerJS](https://upscalerjs.com/) - ESRGAN-based image upscaling
- [IMG.LY Background Removal](https://img.ly/background-removal) - Client-side background removal
- [Radix UI](https://www.radix-ui.com/) - Accessible UI components
