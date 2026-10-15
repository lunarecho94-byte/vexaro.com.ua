'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, RotateCcw, Search as SearchIcon } from 'lucide-react';
import { CatalogMeta } from '@/types/product';

interface CatalogFiltersProps {
  meta: CatalogMeta;
  currentSort?: string;
}

export function CatalogFilters({ meta, currentSort = 'newest' }: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Extract category from pathname (/category/[slug]) or searchParams (?category=[slug])
  const pathCategory = pathname?.startsWith('/category/')
    ? pathname.replace('/category/', '').split('/')[0]
    : null;
  const selectedCategory = pathCategory || searchParams?.get('category') || 'all';

  const selectedBrand = searchParams?.get('brand') || 'all';
  const selectedGender = searchParams?.get('gender') || 'all';
  const selectedSeason = searchParams?.get('season') || 'all';
  const selectedSort = searchParams?.get('sort') || currentSort;
  const currentSearch = searchParams?.get('search') || '';

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '');

    // Always reset to page 1 when changing filters
    params.delete('page');

    let targetPathname = pathname || '/';

    if (key === 'category') {
      if (value === 'all' || !value) {
        targetPathname = '/';
        params.delete('category');
      } else {
        targetPathname = `/category/${value}`;
        params.delete('category');
      }
    } else {
      if (value === 'all' || !value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    startTransition(() => {
      const queryString = params.toString();
      const targetUrl = queryString ? `${targetPathname}?${queryString}` : targetPathname;
      router.push(targetUrl, { scroll: false });
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

  const activeCategoryName =
    selectedCategory !== 'all'
      ? meta.categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory
      : null;

  const activeBrandName =
    selectedBrand !== 'all'
      ? meta.brands.find((b) => b.slug === selectedBrand)?.name || selectedBrand
      : null;

  const filteredBrands = meta.brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  return (
    <div className="sticky top-14 sm:top-16 z-30 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-border shadow-xs transition-all">
      {/* Top Bar: Quick Pills & Filters Drawer Trigger */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Quick Tabs: Gender, Category, Popular Brands & Seasons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* All */}
          <button
            type="button"
            onClick={() => {
              if (selectedCategory !== 'all') {
                updateFilters('category', 'all');
              }
              if (selectedGender !== 'all') {
                updateFilters('gender', 'all');
              }
            }}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'all' && selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Всі
          </button>

          {/* Categories */}
          {meta.categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => updateFilters('category', selectedCategory === c.slug ? 'all' : c.slug)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === c.slug
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground border border-border'
              }`}
            >
              {c.name}
            </button>
          ))}

          {/* Gender */}
          <button
            type="button"
            onClick={() => updateFilters('gender', selectedGender === 'men' ? 'all' : 'men')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'men'
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Чоловічі
          </button>
          <button
            type="button"
            onClick={() => updateFilters('gender', selectedGender === 'women' ? 'all' : 'women')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGender === 'women'
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Жіночі
          </button>

          {/* Popular Brands */}
          <div className="h-4 w-px bg-border shrink-0 mx-0.5" />
          {meta.brands.slice(0, 4).map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => updateFilters('brand', selectedBrand === b.slug ? 'all' : b.slug)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedBrand === b.slug
                  ? 'bg-primary text-white'
                  : 'bg-surface text-muted hover:text-foreground border border-border'
              }`}
            >
              {b.name}
            </button>
          ))}

          {/* Seasons */}
          <div className="h-4 w-px bg-border shrink-0 mx-0.5" />
          <button
            type="button"
            onClick={() => updateFilters('season', selectedSeason === 'demi' ? 'all' : 'demi')}
            className={`rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSeason === 'demi'
                ? 'bg-primary text-white'
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
                ? 'bg-primary text-white'
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
            <option value="newest">Нові поставки</option>
            <option value="popular">За популярністю</option>
            <option value="price_asc">Від дешевих до дорогих</option>
            <option value="price_desc">Від дорогих до дешевих</option>
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

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap text-xs pb-0.5">
          <span className="text-muted text-[11px] font-medium mr-1">Фільтри:</span>

          {/* Category Chip */}
          {activeCategoryName && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <span>Категорія: {activeCategoryName}</span>
              <button
                type="button"
                onClick={() => updateFilters('category', 'all')}
                className="hover:text-foreground p-0.5"
                aria-label={`Видалити фільтр категорії ${activeCategoryName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Brand Chip */}
          {activeBrandName && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <span>Бренд: {activeBrandName}</span>
              <button
                type="button"
                onClick={() => updateFilters('brand', 'all')}
                className="hover:text-foreground p-0.5"
                aria-label={`Видалити фільтр бренду ${activeBrandName}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Gender Chip */}
          {selectedGender !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
              <span>
                Стать: {selectedGender === 'men' ? 'Чоловічі' : selectedGender === 'women' ? 'Жіночі' : 'Унісекс'}
              </span>
              <button
                type="button"
                onClick={() => updateFilters('gender', 'all')}
                className="text-muted hover:text-foreground p-0.5"
                aria-label="Видалити фільтр статі"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Season Chip */}
          {selectedSeason !== 'all' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
              <span>
                Сезон: {selectedSeason === 'winter' ? 'Зимові' : selectedSeason === 'demi' ? 'Демісезон' : selectedSeason}
              </span>
              <button
                type="button"
                onClick={() => updateFilters('season', 'all')}
                className="text-muted hover:text-foreground p-0.5"
                aria-label="Видалити фільтр сезону"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Search Chip */}
          {currentSearch && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
              <span>Пошук: «{currentSearch}»</span>
              <button
                type="button"
                onClick={() => updateFilters('search', '')}
                className="text-muted hover:text-foreground p-0.5"
                aria-label="Очистити пошуковий запит"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {/* Clear all text button */}
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] text-muted hover:text-primary transition-colors underline ml-1"
          >
            Очистити все
          </button>
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
              {/* Category */}
              {meta.categories.length > 0 && (
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
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      Всі товари ({meta.total})
                    </button>
                    {meta.categories.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => updateFilters('category', c.slug)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                          selectedCategory === c.slug
                            ? 'border-primary bg-primary text-white font-bold'
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted block">
                    Бренд
                  </label>
                  {selectedBrand !== 'all' && (
                    <button
                      type="button"
                      onClick={() => updateFilters('brand', 'all')}
                      className="text-[11px] text-primary hover:underline"
                    >
                      Скинути бренд
                    </button>
                  )}
                </div>

                {/* Brand Search Input */}
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Пошук бренду..."
                    className="w-full h-8 rounded-lg border border-border bg-background px-8 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                  <SearchIcon className="absolute left-2.5 top-2 h-4 w-4 text-muted" />
                  {brandSearch && (
                    <button
                      type="button"
                      onClick={() => setBrandSearch('')}
                      className="absolute right-2 top-2 text-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1 scrollbar-thin">
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
                  {filteredBrands.map((b) => (
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
                  {filteredBrands.length === 0 && (
                    <div className="py-3 text-center text-xs text-muted">
                      Брендів не знайдено
                    </div>
                  )}
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
                        ? 'border-primary bg-primary text-white font-bold'
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
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {s.name} ({s.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted block mb-2">
                  Стать
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateFilters('gender', 'all')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                      selectedGender === 'all'
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    Всі
                  </button>
                  {meta.genders.map((g) => (
                    <button
                      key={g.slug}
                      type="button"
                      onClick={() => updateFilters('gender', g.slug)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                        selectedGender === g.slug
                          ? 'border-primary bg-primary text-white font-bold'
                          : 'border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {g.name} ({g.count})
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
                Скинути все
              </button>
              <button
                type="button"
                onClick={() => setIsOpenMobile(false)}
                className="flex-1 h-11 rounded-lg bg-primary text-xs font-bold text-white hover:bg-primary-hover shadow-sm"
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
