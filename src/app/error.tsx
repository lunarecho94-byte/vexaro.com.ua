'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-4">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h2 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl mb-2">
        Виникла помилка
      </h2>
      <p className="text-xs text-muted mb-6 leading-relaxed">
        Не вдалося завантажити сторінку. Спробуйте оновити дані.
      </p>

      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Спробувати ще раз</span>
      </button>
    </div>
  );
}
