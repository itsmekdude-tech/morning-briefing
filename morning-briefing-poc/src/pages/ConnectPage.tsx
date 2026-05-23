import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockApi } from '../services/mockApi';
import { Button } from '../components/ui/Button';
import { useToastStore } from '../store/toastStore';

export function ConnectPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const pushToast = useToastStore((s) => s.push);

  const onAllow = async () => {
    setLoading(true);
    const res = await mockApi.connectGoogle();
    pushToast({ message: `Connected as ${res.email}` });
    navigate('/briefing');
  };

  return (
    <div className="min-h-screen bg-ink-900/40 flex items-center justify-center p-6">
      <div className="bg-surface-0 rounded-2xl shadow-card-dark max-w-md w-full border border-ink-300/60 p-8">
        <div className="text-2xl font-display text-ink-900 mb-1">G</div>
        <h1 className="text-lg font-medium text-ink-900 mt-4">
          Sign in to continue to <span className="font-semibold">Morning Briefing</span>
        </h1>

        <div className="mt-6 border border-ink-300 rounded-lg px-4 py-3 text-sm text-ink-700 flex items-center justify-between">
          <span>hersh@appemble.com</span>
          <span className="text-ink-500">▾</span>
        </div>

        <p className="mt-6 text-sm text-ink-700">This app would like to:</p>
        <ul className="mt-3 space-y-2 text-sm text-ink-700">
          <li className="flex items-start gap-2">
            <span className="text-ink-900 mt-0.5">✓</span>
            View your Gmail messages and settings (read-only)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-ink-900 mt-0.5">✓</span>
            View events on your Google Calendar (read-only)
          </li>
        </ul>

        <p className="mt-6 text-xs text-ink-500 leading-relaxed border-t border-ink-300/50 pt-4">
          Make sure you trust Morning Briefing. You may be sharing sensitive info with this app.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onAllow} disabled={loading}>
            {loading ? 'Connecting…' : 'Allow'}
          </Button>
        </div>
      </div>
    </div>
  );
}
