import { Moon, Sun } from '@phosphor-icons/react';
import { useThemeStore } from '../store/themeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="h-9 w-9 rounded-lg border border-ink-300 text-ink-700 hover:text-ink-900 hover:bg-surface-1 flex items-center justify-center transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} weight="regular" /> : <Moon size={16} weight="regular" />}
    </button>
  );
}
