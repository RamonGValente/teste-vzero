import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SelfDestructAnimationProps {
  children: React.ReactNode;
  isDestructing: boolean;
  onComplete: () => void;
  type: 'text' | 'image' | 'audio' | 'file';
}

export const SelfDestructAnimation = ({ children, isDestructing, onComplete, type }: SelfDestructAnimationProps) => {
  const [animationPhase, setAnimationPhase] = useState<'normal' | 'warning' | 'destructing' | 'destroyed'>('normal');

  useEffect(() => {
    if (!isDestructing) return;

    const phases = [
      { phase: 'warning', delay: 0 },
      { phase: 'destructing', delay: 1000 },
      { phase: 'destroyed', delay: 2000 }
    ];

    const timeouts = phases.map(({ phase, delay }) => 
      setTimeout(() => {
        setAnimationPhase(phase as any);
        if (phase === 'destroyed') {
          setTimeout(onComplete, 500);
        }
      }, delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [isDestructing, onComplete]);

  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-500 ease-in-out";
    
    switch (animationPhase) {
      case 'warning':
        return `${baseClasses} animate-pulse border-2 border-destructive shadow-lg shadow-destructive/20`;
      
      case 'destructing':
        if (type === 'image') {
          return `${baseClasses} animate-[melt_1s_ease-in-out] opacity-70 blur-sm scale-95`;
        } else if (type === 'audio') {
          return `${baseClasses} animate-[dissolve_1s_ease-in-out] opacity-50`;
        } else {
          return `${baseClasses} animate-[crumble_1s_ease-in-out] opacity-30`;
        }
      
      case 'destroyed':
        return `${baseClasses} opacity-0 scale-0`;
      
      default:
        return baseClasses;
    }
  };

  return (
    <div className="relative">
      <div className={cn(getAnimationClasses())}>
        {children}
      </div>
      
      {animationPhase === 'warning' && (
        <div className="absolute -top-2 -right-2 animate-bounce">
          <span className="text-lg">⏰</span>
        </div>
      )}
      
      {animationPhase === 'destructing' && (
        <div className="absolute inset-0 pointer-events-none">
          {type === 'image' && (
            <div className="w-full h-full bg-gradient-to-b from-transparent via-destructive/20 to-destructive/40 animate-pulse" />
          )}
          {type === 'audio' && (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-destructive animate-spin">🌪️</div>
            </div>
          )}
          {type === 'text' && (
            <div className="w-full h-full bg-destructive/10 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
};