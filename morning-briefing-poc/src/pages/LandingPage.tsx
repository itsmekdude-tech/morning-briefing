import { Sun } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/Button';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-1 text-ink-700 flex flex-col">
      <header className="max-w-page mx-auto w-full px-6 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink-900 font-display text-lg">
          <Sun size={20} weight="regular" /> Morning Briefing
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 sm:px-8 py-20 sm:py-32 text-center">
        <div className="text-5xl mb-8" aria-hidden="true">☀</div>
        <h1 className="font-display text-5xl sm:text-6xl text-ink-900 leading-tight tracking-tight">
          Mornings, made readable.
        </h1>
        <p className="mt-8 text-lg text-ink-700 max-w-xl mx-auto leading-relaxed">
          A daily briefing built from your Gmail and Google Calendar — categorized,
          filtered, and delivered before you open your inbox.
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/connect">
            <Button variant="primary" size="md">
              <span className="font-semibold mr-1">G</span>
              Connect Google
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-ink-500">Read-only. We never send mail.</p>

        <div className="mt-20 rounded-card border border-ink-300/60 bg-surface-0 p-8 text-left shadow-card max-w-2xl mx-auto opacity-90">
          <div className="text-[11px] tracking-tracked uppercase font-semibold text-ink-500 mb-3">
            Preview
          </div>
          <div className="font-display text-2xl text-ink-900 mb-2">Good morning, Hersh.</div>
          <p className="text-sm text-ink-500 italic">Friday, May 23 · generated 7:02 AM</p>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between border-b border-ink-300/40 pb-2">
              <span className="text-ink-700">Priya Shah — Q3 deck needs your review</span>
              <span className="text-ink-500">06:14</span>
            </div>
            <div className="flex justify-between border-b border-ink-300/40 pb-2">
              <span className="text-ink-700">Manan B. — re: integration timeline</span>
              <span className="text-ink-500">05:48</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-700">Accounts — invoice overdue</span>
              <span className="text-ink-500">02:11</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
