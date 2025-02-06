import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface WarpBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function WarpBackground({ children, className, ...props }: WarpBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const animate = () => {
      time += 0.01;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const columns = 16;
      const rows = 16;
      const cellWidth = canvas.width / columns;
      const cellHeight = canvas.height / rows;

      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
          const x = cellWidth * i;
          const y = cellHeight * j;
          const distanceToCenter = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );
          const wave = Math.sin(distanceToCenter * 0.02 + time) * 20;

          ctx.fillStyle = `hsla(${wave * 10 + 200}, 70%, 50%, 0.1)`;
          ctx.beginPath();
          ctx.arc(x + wave, y + wave, cellWidth * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn('relative min-h-screen overflow-hidden', className)} {...props}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 -z-10"
        style={{ filter: 'blur(40px)' }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        {children}
      </div>
    </div>
  );
} 