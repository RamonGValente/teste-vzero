
import * as React from 'react';

export function Sheet({ children }: React.PropsWithChildren<{}>) { return <>{children}</>; }

export function SheetTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  return <>{children}</>;
}

export function SheetContent({ side = 'left', className = '', children }: { side?: 'left'|'right'; className?: string; children: React.ReactNode }) {
  return (
    <div className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-[320px] bg-background shadow-xl border-r ${className}`}>
      {children}
    </div>
  );
}
