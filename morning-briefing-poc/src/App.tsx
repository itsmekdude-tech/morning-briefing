import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from './components/Toaster';
import { BriefingPage } from './pages/BriefingPage';
import { ConnectPage } from './pages/ConnectPage';
import { LandingPage } from './pages/LandingPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const qc = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    [],
  );

  return (
    <QueryClientProvider client={qc}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/briefing" element={<BriefingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <Toaster />
    </QueryClientProvider>
  );
}
