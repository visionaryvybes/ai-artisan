import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-6 bg-gray-900/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02] group rounded-xl">
      <div className="space-y-4">
        <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
} 