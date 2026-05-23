import { CaretLeft } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const DELIVERY_KEY = 'mb_delivery_time';

export function SettingsPage() {
  const [deliveryTime, setDeliveryTime] = useState('06:30');
  const [emailCopy, setEmailCopy] = useState(true);
  const [push, setPush] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DELIVERY_KEY);
      if (stored) setDeliveryTime(stored);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-1 text-ink-700">
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/briefing"
            className="text-ink-500 hover:text-ink-900 text-sm inline-flex items-center gap-1"
          >
            <CaretLeft size={14} /> Back
          </Link>
          <ThemeToggle />
        </div>
        <h1 className="font-display text-4xl text-ink-900 mb-8">Settings</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500 mb-3">
              Connected account
            </h2>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink-900">hersh@appemble.com</div>
                  <div className="text-sm text-ink-500">
                    Connected · Gmail + Calendar (read-only)
                  </div>
                </div>
                <Button variant="outline">Disconnect</Button>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500 mb-3">
              Delivery
            </h2>
            <Card>
              <label className="block text-sm text-ink-700 mb-2">
                When should we generate your briefing?
              </label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => {
                  setDeliveryTime(e.target.value);
                  try {
                    localStorage.setItem(DELIVERY_KEY, e.target.value);
                  } catch {
                    /* ignore */
                  }
                }}
                className="border border-ink-300 rounded-md px-3 py-2 text-sm bg-surface-0 text-ink-900"
              />
              <div className="mt-4 space-y-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailCopy}
                    onChange={(e) => setEmailCopy(e.target.checked)}
                    className="accent-ink-900"
                  />
                  Email me a copy too
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={push}
                    onChange={(e) => setPush(e.target.checked)}
                    className="accent-ink-900"
                  />
                  Send a push notification when ready
                </label>
              </div>
            </Card>
          </section>

          <section>
            <h2 className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500 mb-3">
              Appearance
            </h2>
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-ink-900 font-medium">Theme</div>
                  <div className="text-sm text-ink-500">Light, dark, or system.</div>
                </div>
                <ThemeToggle />
              </div>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
