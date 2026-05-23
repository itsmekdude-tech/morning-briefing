import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/morning-briefing/' : '/',
  plugins: [react()],
  server: { port: 5173 },
}));
