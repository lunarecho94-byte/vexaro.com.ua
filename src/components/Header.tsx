'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Phone, Search, X } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { useRouter, useSearchParams } from 'next/navigation';

export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
  const [mounted, setMounted] = useState(false);

  const totalCount = useCartStore((state) => state.getTotalCount());
  const openCart = useCartStore((state) => state.openCart);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/');
    }
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-black tracking-wider text-foreground group-hover:text-primary transition-colors">
            VEXARO
          </span>
          <span className="hidden sm:inline-block text-xs uppercase tracking-widest text-muted border-l border-border pl-2">
            Footwear Store
          </span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Phone Link */}
          <a
            href="tel:+380974524435"
            className="flex h-11 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface transition-colors"
            title="Зателефонувати: +380974524435"
          >
            <Phone className="h-4 w-4 text-primary" />
            <span className="hidden md:inline">+38 (097) 452-44-35</span>
          </a>

          {/* Search Button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Пошук товарів"
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          {/* Cart Button */}
          <button
            type="button"
            onClick={openCart}
            className="relative flex h-11 items-center gap-2 rounded-lg bg-surface px-3 text-foreground hover:border-primary border border-border transition-colors"
            aria-label="Кошик замовлень"
          >
            <ShoppingBag className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold hidden sm:inline">Кошик</span>
            {mounted && totalCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-background">
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
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-primary-hover transition-colors"
            >
              Знайти
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
