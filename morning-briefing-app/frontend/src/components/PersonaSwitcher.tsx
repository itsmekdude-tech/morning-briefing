import { CaretDown } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { PERSONAS } from '../services/mockApi';
import { useUiStore } from '../store/uiStore';

export function PersonaSwitcher() {
  const personaId = useUiStore((s) => s.personaId);
  const setPersona = useUiStore((s) => s.setPersona);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = PERSONAS.find((p) => p.id === personaId) ?? PERSONAS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-9 px-3 rounded-lg border border-ink-300 text-ink-700 hover:text-ink-900 hover:bg-surface-1 flex items-center gap-2 text-sm transition-colors"
      >
        <span className="text-ink-500 text-xs uppercase tracking-tracked">Persona</span>
        <span className="font-medium">{current.label}</span>
        <CaretDown size={12} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-11 z-30 min-w-[260px] bg-surface-0 border border-ink-300 rounded-lg shadow-card-dark py-1"
        >
          {PERSONAS.map((p) => (
            <li key={p.id}>
              <button
                role="option"
                aria-selected={p.id === personaId}
                onClick={() => {
                  setPersona(p.id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-1 flex flex-col ${
                  p.id === personaId ? 'text-ink-900 font-medium' : 'text-ink-700'
                }`}
              >
                <span>{p.label}</span>
                <span className="text-ink-500 text-xs">{p.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
