import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '../src/components/ThemeToggle';
import { useThemeStore } from '../src/store/themeStore';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  useThemeStore.getState().setTheme('light');
});

describe('ThemeToggle', () => {
  it('toggles the dark class on the document root', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    await user.click(screen.getByLabelText(/Switch to dark mode/i));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    await user.click(screen.getByLabelText(/Switch to light mode/i));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the chosen theme to localStorage', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByLabelText(/Switch to dark mode/i));
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});
