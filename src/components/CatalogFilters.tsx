'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { CatalogMeta } from '@/types/product';

interface CatalogFiltersProps {
  meta: CatalogMeta;
  currentSort?: string;
}

export function CatalogFilters({ meta, currentSort = 'popular' }: CatalogFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const selectedCategory = searchParams?.get('category') || 'all';
  const selectedBrand = searchParams?.get('brand') || 'all';
  const selectedGender = searchParams?.get('gender') || 'all';
  const selectedSeason = searchParams?.get('season') || 'all';
  const selectedSort = searchParams?.get('sort') || currentSort;
  const currentSearch = searchParams?.get('search') || '';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Always reset to page 1 when changing filters
    params.delete('page');

    if (value === 'all' || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    startTransition(() => {
      const queryString = params.toString();
      router.push(queryString ? `/?${queryString}` : '/', { scroll: false });
    });
  };

  const resetAll = () => {
    startTransition(() => {
      router.push('/', { scroll: false });
    });
    setIsOpenMobile(false);
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedGender !== 'all' ||
    selectedSeason !== 'all' ||
    Boolean(currentSearch);

  return (
    <div className="mb-6">
      {/* Top Bar: Active categories quick pills & Mobile filter trigger */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Quick Gender / Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => updateFilters('gender', 'all')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'all'
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Всі
          </button>
          <button
            type="button"
            onClick={() => updateFilters('gender', 'men')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'men'
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Чоловічі
          </button>
          <button
            type="button"
            onClick={() => updateFilters('gender', 'women')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'women'
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Жіночі
          </button>
          <button
            type="button"
            onClick={() => updateFilters('season', selectedSeason === 'demi' ? 'all' : 'demi')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSeason === 'demi'
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Демісезон
          </button>
          <button
            type="button"
            onClick={() => updateFilters('season', selectedSeason === 'winter' ? 'all' : 'winter')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSeason === 'winter'
                ? 'bg-primary text-background'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Зимові
          </button>
        </div>

        {/* Sorting & Filter Drawer Trigger */}
        <div className="flex items-center gap-2">
          {/* Sorting */}
          <select
            value={selectedSort}
            onChange={(e) => updateFilters('sort', e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
            aria-label="Сортування товарів"
          >
            <option value="popular">За популярністю</option>
            <option value="price_asc">Від дешевих до дорогих</option>
            <option value="price_desc">Від дорогих до дешевих</option>
            <option value="newest">Нові надходження</option>
          </select>

          {/* Filter Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsOpenMobile(true)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
              hasActiveFilters
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-foreground hover:bg-surface-raised'
            }`}
            aria-label="Відкрити фільтри"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Фільтри</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-primary" />
            )}
          </button>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAll}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-muted hover:text-foreground"
              title="Скинути всі фільтри"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Search Tag banner */}
      {currentSearch && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span>Результати за запитом:</span>
          <span className="font-semibold text-foreground bg-surface border border-border px-2 py-0.5 rounded flex items-center gap-1.5">
            «{currentSearch}»
            <button
              type="button"
              onClick={() => updateFilters('search', '')}
              className="text-muted hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}

      {/* Slide-over Filter Panel */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm">
          <div className="ml-auto flex h-full w-full max-w-sm flex-col bg-surface p-5 shadow-2xl border-l border-border overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground">Фільтри товарів</h3>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="rounded-lg p-1 text-muted hover:text-foreground"
                aria-label="Закрити"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-6 flex-1">
              {/* Category (if multiple categories exist) */}
              {meta.categories.length > 1 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                    Категорія
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateFilters('category', 'all')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                        selectedCategory === 'all'
                          ? 'border-primary bg-primary text-background font-bold'
                          : 'border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      Всі ({meta.total})
                    </button>
                    {meta.categories.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => updateFilters('category', c.slug)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                          selectedCategory === c.slug
                            ? 'border-primary bg-primary text-background font-bold'
                            : 'border-border bg-background text-muted hover:text-foreground'
                        }`}
                      >
                        {c.name} ({c.count})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                  Бренд
                </label>
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => updateFilters('brand', 'all')}
                    className={`text-left rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      selectedBrand === 'all'
                        ? 'bg-surface-raised text-primary font-bold'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Всі бренди
                  </button>
                  {meta.brands.slice(0, 20).map((b) => (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => updateFilters('brand', b.slug)}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        selectedBrand === b.slug
                          ? 'bg-surface-raised text-primary font-bold'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="text-[11px] opacity-60">({b.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Season */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                  Сезон
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateFilters('season', 'all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                      selectedSeason === 'all'
                        ? 'border-primary bg-primary text-background font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    Всі
                  </button>
                  {meta.seasons.map((s) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => updateFilters('season', s.slug)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                        selectedSeason === s.slug
                          ? 'border-primary bg-primary text-background font-bold'
                          : 'border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {s.name} ({s.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-border flex gap-2">
              <button
                type="button"
                onClick={resetAll}
                className="flex-1 h-11 rounded-lg border border-border bg-background text-xs font-semibold text-muted hover:text-foreground"
              >
                Скинути
              </button>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="flex-1 h-11 rounded-lg bg-primary text-xs font-bold text-background hover:bg-primary-hover"
              >
                Застосувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
