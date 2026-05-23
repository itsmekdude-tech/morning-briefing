import { useToastStore } from '../store/toastStore';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto bg-ink-900 text-surface-0 text-sm px-4 py-3 rounded-lg shadow-card-dark flex items-center gap-4 min-w-[240px]"
        >
          <span>{t.message}</span>
          {t.undo && (
            <button
              className="text-surface-0 underline underline-offset-2 hover:no-underline text-xs"
              onClick={() => {
                t.undo?.();
                dismiss(t.id);
              }}
            >
              Undo
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
