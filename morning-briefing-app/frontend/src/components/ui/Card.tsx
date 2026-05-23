import { type HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded = true, className = '', children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`bg-surface-0 rounded-card shadow-card dark:shadow-card-dark border border-ink-300/40 ${
        padded ? 'p-6' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
});
