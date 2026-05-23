import { Check } from '@phosphor-icons/react';

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  ariaLabel?: string;
}

export function Checkbox({ checked, onChange, ariaLabel }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition-colors duration-150 ${
        checked
          ? 'bg-ink-900 border-ink-900 text-surface-0'
          : 'bg-surface-0 border-ink-300 hover:border-ink-500'
      }`}
    >
      {checked ? <Check size={14} weight="bold" /> : null}
    </button>
  );
}
