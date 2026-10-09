import React from 'react';
import Link from 'next/link';
import { PackageSearch, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onReset?: () => void;
  resetHref?: string;
}

export function EmptyState({
  title = 'Товарів не знайдено',
  description = 'За вибраними критеріями фільтрації або пошуку немає доступних позицій.',
  resetHref = '/',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-12 text-center my-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised border border-border text-muted mb-4">
        <PackageSearch className="h-8 w-8 text-primary" />
      </div>

      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      <Link
        href={resetHref}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-surface-raised px-4 text-xs font-semibold text-foreground border border-border hover:border-primary hover:text-primary transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Скинути всі фільтри</span>
      </Link>
    </div>
  );
}
