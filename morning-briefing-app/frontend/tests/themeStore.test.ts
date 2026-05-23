import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockMatchMedia(matchesDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: matchesDark && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('themeStore', () => {
  it('reads initial theme from localStorage when present', async () => {
    localStorage.setItem('theme', 'dark');
    mockMatchMedia(false);
    const { useThemeStore } = await import('../src/store/themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('falls back to system pref when localStorage empty', async () => {
    mockMatchMedia(true);
    const { useThemeStore } = await import('../src/store/themeStore');
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('toggle flips theme, persists, and updates the dark class', async () => {
    localStorage.setItem('theme', 'light');
    mockMatchMedia(false);
    const { useThemeStore } = await import('../src/store/themeStore');
    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setTheme directly sets to a specific value', async () => {
    localStorage.setItem('theme', 'light');
    mockMatchMedia(false);
    const { useThemeStore } = await import('../src/store/themeStore');
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});
