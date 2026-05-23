import { type ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed select-none';

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 h-8',
  md: 'text-sm px-4 h-10',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-ink-900 text-surface-0 hover:bg-ink-700 [html.dark_&]:bg-ink-900 [html.dark_&]:text-surface-1 [html.dark_&]:hover:bg-ink-700',
  outline:
    'bg-surface-0 text-ink-900 border border-ink-300 hover:bg-surface-1',
  ghost: 'bg-transparent text-ink-700 hover:bg-surface-1',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', className = '', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
