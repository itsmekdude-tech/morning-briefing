import { type ReactNode, useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Drawer({ open, onClose, title, children }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastActive = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastActive.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.focus(), 20);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      lastActive.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex-1 bg-ink-900/60 backdrop-blur-[1px]" aria-hidden="true" />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="bg-surface-0 w-full sm:w-[480px] h-full shadow-card-dark overflow-y-auto border-l border-ink-300 outline-none transition-transform duration-200 ease-drawer"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-300/60">
          <span className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500">
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-ink-500 hover:text-ink-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}
