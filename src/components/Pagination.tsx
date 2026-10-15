'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const basePath = pathname || '/';
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Generate page numbers window
  const pages: (number | string)[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <nav
      className="mt-12 flex items-center justify-center gap-1.5"
      aria-label="Пагінація каталогу"
    >
      {/* Prev */}
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-primary transition-colors"
          aria-label="Попередня сторінка"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/40 bg-surface/40 text-muted/40 cursor-not-allowed">
          <ChevronLeft className="h-5 w-5" />
        </span>
      )}

      {/* Number buttons */}
      {pages.map((p, idx) => {
        if (p === '...') {
          return (
            <span
              key={`dots-${idx}`}
              className="flex h-11 w-8 items-center justify-center text-xs text-muted"
            >
              ...
            </span>
          );
        }

        const isCurrent = p === currentPage;
        return (
          <Link
            key={p}
            href={createPageUrl(p as number)}
            className={`flex h-11 min-w-[44px] items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors ${
              isCurrent
                ? 'bg-primary text-white font-bold shadow-sm'
                : 'border border-border bg-surface text-muted hover:text-foreground hover:border-primary'
            }`}
            aria-current={isCurrent ? 'page' : undefined}
          >
            {p}
          </Link>
        );
      })}

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground hover:border-primary transition-colors"
          aria-label="Наступна сторінка"
        >
          <ChevronRight className="h-5 w-5" />
        </Link>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/40 bg-surface/40 text-muted/40 cursor-not-allowed">
          <ChevronRight className="h-5 w-5" />
        </span>
      )}
    </nav>
  );
}
