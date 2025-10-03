// src/components/brand/Logo.tsx
import * as React from 'react';

type LogoProps = {
  /** classes extras (opcional) */
  className?: string;
  /** texto ao lado da marca (opcional) */
  title?: string;
};

export const Logo: React.FC<LogoProps> = ({ className = '', title }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* A imagem é servida de /public/logo.png → use caminho absoluto */}
      <img
        src="/logo.png"
        alt={title || 'Logo'}
        className="h-12 w-auto md:h-14 lg:h-16 object-contain select-none"
        draggable={false}
      />
      {title ? (
        <span className="text-xl md:text-2xl font-semibold tracking-tight">
          {title}
        </span>
      ) : null}
    </div>
  );
};

export default Logo;
