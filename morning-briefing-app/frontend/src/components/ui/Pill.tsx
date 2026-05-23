import type { HTMLAttributes } from 'react';

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  emphasis?: 'default' | 'accent';
}

export function Pill({ emphasis = 'default', className = '', children, ...rest }: PillProps) {
  const tone =
    emphasis === 'accent'
      ? 'bg-ink-900 text-surface-0'
      : 'bg-surface-2 text-ink-700';
  return (
    <span
      className={`inline-flex items-center text-[11px] tracking-tracked uppercase font-semibold px-2 py-0.5 rounded-full ${tone} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
