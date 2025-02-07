import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = 'Loading...', className = '' }: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export function LoadingOverlay({ message }: LoadingProps) {
  return (
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <Loading message={message} />
    </div>
  );
}

export function LoadingDots() {
  return (
    <div className="flex items-center space-x-2">
      <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-4 h-4 rounded-full bg-white/90 animate-bounce" />
    </div>
  );
} 