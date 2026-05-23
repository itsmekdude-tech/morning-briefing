import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
        },
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
          300: 'var(--ink-300)',
        },
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tracked: '0.08em',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,10,10,0.04), 0 8px 24px rgba(10,10,10,0.04)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        card: '12px',
      },
      transitionTimingFunction: {
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      maxWidth: {
        page: '1200px',
      },
    },
  },
  plugins: [],
};

export default config;
