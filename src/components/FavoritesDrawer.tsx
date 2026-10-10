'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Heart, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useFavoritesStore } from '@/lib/favorites-store';

export function FavoritesDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeFavorites, removeItem, clearFavorites } = useFavoritesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeFavorites();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeFavorites]);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={closeFavorites}
        aria-hidden="true"
      />

      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-surface shadow-2xl border-l border-border animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Обране</h2>
              <span className="text-[11px] text-muted">
                {items.length === 1 ? '1 збережений товар' : `${items.length} збережених товарів`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={closeFavorites}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Закрити обране"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-raised border border-border text-rose-400/40 mb-4">
              <Heart className="h-10 w-10" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">
              Список обраного порожній
            </h3>
            <p className="text-xs text-muted max-w-xs leading-relaxed mb-6">
              Тисніть на сердечко на картці товару, щоб зберегти вподобані моделі та швидко повернутися до них пізніше.
            </p>
            <button
              type="button"
              onClick={closeFavorites}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
            >
              <span>Перейти до каталогу</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border px-5 py-2">
              {items.map((product) => (
                <div key={product.id} className="py-4 flex gap-3.5 group">
                  {/* Thumbnail */}
                  <Link
                    href={`/product/${product.slug}`}
                    onClick={closeFavorites}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-raised"
                  >
                    <img
                      src={product.images[0] || '/images/shoe-placeholder.svg'}
                      alt={product.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/images/shoe-placeholder.svg';
                      }}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${product.slug}`}
                          onClick={closeFavorites}
                          className="text-xs font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {product.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="text-muted hover:text-rose-400 p-1 -mr-1 transition-colors"
                          title="Видалити з обраного"
                          aria-label={`Видалити ${product.name} з обраного`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">
                          {product.brand}
                        </span>
                        <span className="text-[10px] text-muted">•</span>
                        <span className="text-[10px] text-muted">
                          {product.seasonName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-black text-foreground">
                          {product.price.toLocaleString('uk-UA')} ₴
                        </span>
                        {product.oldPrice && (
                          <span className="text-[11px] text-red-500 line-through decoration-red-500 font-semibold">
                            {product.oldPrice.toLocaleString('uk-UA')} ₴
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/product/${product.slug}`}
                        onClick={closeFavorites}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-raised border border-border px-2.5 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <ShoppingBag className="h-3 w-3 text-primary" />
                        <span>Купити</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-border bg-surface-raised p-4 flex items-center justify-between">
              <button
                type="button"
                onClick={clearFavorites}
                className="text-xs font-semibold text-muted hover:text-rose-400 transition-colors"
              >
                Очистити все
              </button>

              <button
                type="button"
                onClick={closeFavorites}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
              >
                <span>Продовжити покупки</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
