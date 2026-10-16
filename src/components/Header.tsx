'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, X, Heart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useFavoritesStore } from '@/lib/favorites-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { VexaroLogo } from '@/components/VexaroLogo';

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [mounted, setMounted] = useState(false);

  const totalCount = useCartStore((state) => state.getTotalCount());
  const openCart = useCartStore((state) => state.openCart);

  const favoritesCount = useFavoritesStore((state) => state.getCount());
  const openFavorites = useFavoritesStore((state) => state.openFavorites);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      router.refresh();
    } else {
      router.push('/');
      router.refresh();
    }
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand / Logo */}
        <Link
          href="/"
          aria-label="Головна сторінка VEXARO"
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('vexaro_restore_scroll');
              sessionStorage.removeItem('vexaro_last_scroll_y');
              sessionStorage.removeItem('vexaro_last_product_slug');
              sessionStorage.removeItem('vexaro_from_product');
              sessionStorage.removeItem('vexaro_scroll_/');
            }
          }}
          className="shrink-0 min-w-0"
        >
          <VexaroLogo variant="header" animated={true} />
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Пошук товарів"
          >
            {isSearchOpen ? <X className="h-4 w-4 sm:h-5 sm:w-5" /> : <Search className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          {/* Messengers: Viber & Telegram */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <a
              href="viber://chat?number=%2B380974524435"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Зв'язатися у Viber"
              title="Viber: +38 (097) 452-44-35"
              className="group flex h-9 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-lg border border-border bg-surface px-2 sm:px-2.5 text-xs font-semibold text-muted hover:border-[#7360F2]/50 hover:bg-[#7360F2]/10 hover:text-[#7360F2] transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current text-[#7360F2] transition-transform group-hover:scale-110"
              >
                <path d="M21.96 17.58c-.37 1.86-1.92 3.19-3.79 3.29-1.22.07-2.6-.2-4.13-.81-3.66-1.46-6.66-3.8-8.89-6.95-1.52-2.15-2.45-4.52-2.77-7.05-.2-1.63.5-3.15 1.85-4.04 1.15-.76 2.58-.93 3.86-.46.72.26 1.34.82 1.76 1.58.46.83.94 1.66 1.41 2.5.42.75.42 1.63 0 2.37-.34.6-.74 1.16-1.15 1.71-.24.32-.23.75.03 1.05 1.05 1.21 2.29 2.24 3.69 3.06.32.19.72.16.99-.07.51-.43 1.03-.84 1.58-1.23.76-.53 1.75-.58 2.55-.13.88.49 1.74 1.01 2.6 1.53.8.48 1.33 1.23 1.48 2.15.09.52.02 1.05-.18 1.54z" />
              </svg>
              <span className="hidden xl:inline text-[11px]">Viber</span>
            </a>

            <a
              href="https://t.me/+380974524435"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Зв'язатися у Telegram"
              title="Telegram: +38 (097) 452-44-35"
              className="group flex h-9 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-lg border border-border bg-surface px-2 sm:px-2.5 text-xs font-semibold text-muted hover:border-[#229ED9]/50 hover:bg-[#229ED9]/10 hover:text-[#229ED9] transition-all"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current text-[#229ED9] transition-transform group-hover:scale-110"
              >
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194.992.127.828.928z" />
              </svg>
              <span className="hidden xl:inline text-[11px]">Telegram</span>
            </a>
          </div>

          {/* Favorites Button */}
          <button
            type="button"
            onClick={openFavorites}
            className="relative flex h-9 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-lg bg-surface px-2 sm:px-2.5 md:px-3 text-foreground hover:border-rose-500/50 hover:text-rose-400 border border-border transition-colors"
            aria-label="Обрані товари"
            title="Обране"
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500 fill-rose-500/20" />
            <span className="text-xs font-semibold hidden md:inline">Обране</span>
            {mounted && favoritesCount > 0 && (
              <span className="flex h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] sm:text-[11px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-9 sm:h-10 items-center gap-1 sm:gap-1.5 rounded-lg bg-surface px-2 sm:px-2.5 md:px-3 text-foreground hover:border-primary border border-border transition-colors"
            aria-label="Кошик замовлень"
            title="Кошик"
          >
            <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <span className="text-xs font-semibold hidden sm:inline">Кошик</span>
            {mounted && totalCount > 0 && (
              <span className="flex h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] sm:text-[11px] font-black text-white shadow-xs">
                {totalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable Search Input */}
      {isSearchOpen && (
        <div className="border-t border-border bg-surface px-4 py-3 sm:px-6">
          <form onSubmit={handleSearchSubmit} className="mx-auto max-w-2xl flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Пошук моделі, бренду чи артикулу (наприклад: Samba, Nike, N001)..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Знайти
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
