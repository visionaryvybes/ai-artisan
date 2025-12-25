import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Artisan - AI Image Processing Studio',
  description:
    'Transform your images with cutting-edge AI technology. Upscale, enhance, remove backgrounds, and colorize - all processed locally in your browser for complete privacy.',
  keywords: [
    'AI image processing',
    'image upscaling',
    'background removal',
    'image enhancement',
    'ESRGAN',
    'client-side AI',
  ],
  authors: [{ name: 'AI Artisan' }],
  openGraph: {
    title: 'AI Artisan - AI Image Processing Studio',
    description:
      'Transform your images with AI. Upscale, enhance, remove backgrounds - all processed locally in your browser.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Artisan - AI Image Processing Studio',
    description:
      'Transform your images with AI. All processing happens in your browser.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7c3aed',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.className} antialiased bg-gray-950 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
