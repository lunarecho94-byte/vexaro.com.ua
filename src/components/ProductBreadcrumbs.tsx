'use client';

import React, { useState, useEffect } from 'react';
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
  const defaultFallback = categorySlug ? `/category/${categorySlug}` : '/';
  const [targetUrl, setTargetUrl] = useState<string>(defaultFallback);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vexaro_last_catalog_url');
      if (saved && !saved.startsWith('/product/')) {
        setTargetUrl(saved);
      } else {
        setTargetUrl(defaultFallback);
      }
    }
  }, [categorySlug, defaultFallback]);

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;

    sessionStorage.setItem('vexaro_restore_scroll', 'true');

    // 1. If there is history in this tab, go back natively (restores scroll & filters)
    if (window.history.length > 1) {
      window.history.back();

      // 2. Safety timeout: if after 250ms the browser hasn't left the product page
      // (e.g. direct link or fresh tab), force navigate to targetUrl
      setTimeout(() => {
        if (window.location.pathname.startsWith('/product/')) {
          router.push(targetUrl);
          setTimeout(() => {
            if (window.location.pathname.startsWith('/product/')) {
              window.location.href = targetUrl;
            }
          }, 150);
        }
      }, 250);
      return;
    }

    // 3. Fallback when no history exists
    router.push(targetUrl);
    setTimeout(() => {
      if (window.location.pathname.startsWith('/product/')) {
        window.location.href = targetUrl;
      }
    }, 150);
  };

  return (
    <nav className="mb-6 flex items-center gap-2 text-xs text-muted overflow-x-auto whitespace-nowrap py-1">
      {/* Explicit Back button */}
      <Link
        href={targetUrl}
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-raised hover:border-primary/40 transition-all active:scale-95 shrink-0 cursor-pointer"
        title="Повернутися назад до каталогу зі збереженням позиції"
        aria-label="Назад до каталогу"
      >
        <ArrowLeft className="h-3.5 w-3.5 text-primary" />
        <span>Назад</span>
      </Link>

      {/* Breadcrumb Path */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href="/"
          className="hover:text-foreground transition-colors font-medium cursor-pointer"
        >
          Головна
        </Link>
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
