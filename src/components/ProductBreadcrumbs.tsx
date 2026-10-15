'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface ProductBreadcrumbsProps {
  category: string;
  categorySlug: string;
  productName: string;
}

export function ProductBreadcrumbs({
  category,
  categorySlug,
  productName,
}: ProductBreadcrumbsProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;

    sessionStorage.setItem('vexaro_restore_scroll', 'true');
    const lastCatalogUrl = sessionStorage.getItem('vexaro_last_catalog_url');

    // If browser history has previous page from our domain, use back() to preserve state
    if (
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      window.history.back();
    } else if (lastCatalogUrl) {
      router.push(lastCatalogUrl);
    } else {
      router.push('/');
    }
  };

  return (
    <nav className="mb-6 flex items-center gap-2 text-xs text-muted overflow-x-auto whitespace-nowrap py-1">
      {/* Explicit Back button */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-raised hover:border-primary/40 transition-all active:scale-95 shrink-0"
        title="Повернутися назад до каталогу зі збереженням позиції"
        aria-label="Назад до каталогу"
      >
        <ArrowLeft className="h-3.5 w-3.5 text-primary" />
        <span>Назад</span>
      </button>

      {/* Breadcrumb Path */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleBack}
          className="hover:text-foreground transition-colors font-medium cursor-pointer"
        >
          Головна
        </button>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        <Link
          href={`/category/${categorySlug}`}
          className="hover:text-foreground transition-colors"
        >
          {category}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        <span className="text-foreground font-medium truncate max-w-[160px] sm:max-w-md">
          {productName}
        </span>
      </div>
    </nav>
  );
}
