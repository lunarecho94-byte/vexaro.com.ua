'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react';
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

  const [mounted, setMounted] = useState(false);
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Path category (if URL is /category/[slug])
  const pathCategory = pathname?.startsWith('/category/')
    ? pathname.replace('/category/', '').split('/')[0].toLowerCase()
    : null;
  const isGenericCategory = !pathCategory || pathCategory === 'shoes' || pathCategory === 'all';

  // Parse active filters from URL
  const urlCategoryParam = searchParams?.get('category');
  const selectedCategories = urlCategoryParam
    ? urlCategoryParam
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && s !== 'all' && s !== 'shoes')
    : (!isGenericCategory && pathCategory ? [pathCategory] : []);

  const selectedBrands = searchParams?.get('brand')
    ? searchParams.get('brand')!.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s && s !== 'all')
    : [];

  const selectedSizes = searchParams?.get('size')
    ? searchParams.get('size')!.split(',').map((s) => s.trim()).filter((s) => s && s !== 'all')
    : [];

  const selectedGenders = searchParams?.get('gender')
    ? searchParams.get('gender')!.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s && s !== 'all')
    : [];

  const selectedSeasons = searchParams?.get('season')
    ? searchParams.get('season')!.split(',').map((s) => s.trim().toLowerCase()).filter((s) => s && s !== 'all')
    : [];

  const currentMinPrice = searchParams?.get('minPrice') || '';
  const currentMaxPrice = searchParams?.get('maxPrice') || '';
  const selectedSort = searchParams?.get('sort') || currentSort;
  const currentSearch = searchParams?.get('search') || '';

  // Local draft state for the full filter drawer
  const [draftCategories, setDraftCategories] = useState<string[]>([]);
  const [draftBrands, setDraftBrands] = useState<string[]>([]);
  const [draftSizes, setDraftSizes] = useState<string[]>([]);
  const [draftGenders, setDraftGenders] = useState<string[]>([]);
  const [draftSeasons, setDraftSeasons] = useState<string[]>([]);
  const [draftMinPrice, setDraftMinPrice] = useState<string>('');
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>('');

  // Sync draft state whenever drawer opens
  const openDrawer = () => {
    setDraftCategories(selectedCategories);
    setDraftBrands(selectedBrands);
    setDraftSizes(selectedSizes);
    setDraftGenders(selectedGenders);
    setDraftSeasons(selectedSeasons);
    setDraftMinPrice(currentMinPrice);
    setDraftMaxPrice(currentMaxPrice);
    setBrandSearch('');
    setIsOpenDrawer(true);
  };

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpenDrawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenDrawer]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpenDrawer) {
        setIsOpenDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenDrawer]);

  // Active filters count
  const activeCount =
    selectedCategories.length +
    selectedBrands.length +
    selectedSizes.length +
    selectedGenders.length +
    selectedSeasons.length +
    (currentMinPrice || currentMaxPrice ? 1 : 0) +
    (currentSearch ? 1 : 0);

  // Helper to commit filters to URL
  const commitFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('page'); // Reset to first page

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      const queryString = params.toString();
      const targetPath = pathname?.startsWith('/category/') ? '/' : (pathname || '/');
      const targetUrl = queryString ? `${targetPath}?${queryString}` : targetPath;
      router.push(targetUrl, { scroll: false });
      router.refresh();
    });
  };

  // Remove single active filter chip
  const removeActiveFilter = (
    key: 'category' | 'gender' | 'brand' | 'season' | 'size',
    value: string,
    currentList: string[]
  ) => {
    const lower = value.toLowerCase();
    const nextList = currentList.filter((item) => item !== lower);
    commitFilters({
      [key]: nextList.length > 0 ? nextList.join(',') : null,
    });
  };

  // Apply draft from drawer
  const applyDrawerFilters = () => {
    commitFilters({
      category: draftCategories.length > 0 ? draftCategories.join(',') : null,
      brand: draftBrands.length > 0 ? draftBrands.join(',') : null,
      size: draftSizes.length > 0 ? draftSizes.join(',') : null,
      gender: draftGenders.length > 0 ? draftGenders.join(',') : null,
      season: draftSeasons.length > 0 ? draftSeasons.join(',') : null,
      minPrice: draftMinPrice.trim() ? draftMinPrice.trim() : null,
      maxPrice: draftMaxPrice.trim() ? draftMaxPrice.trim() : null,
    });
    setIsOpenDrawer(false);
  };

  // Reset all filters
  const resetAll = () => {
    startTransition(() => {
      router.push('/', { scroll: false });
      router.refresh();
    });
    setIsOpenDrawer(false);
  };

  // Toggle item in array helper
  const toggleItem = (arr: string[], item: string) => {
    const lower = item.toLowerCase();
    return arr.includes(lower) ? arr.filter((x) => x !== lower) : [...arr, lower];
  };

  // Standard numeric shoe sizes
  const numericSizes = meta.sizes
    .filter((s) => !isNaN(Number(s)))
    .sort((a, b) => Number(a) - Number(b));

  // Filtered brands for drawer search
  const filteredBrands = meta.brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  // Top popular brands for quick tiles in drawer
  const topBrands = meta.brands.slice(0, 6);

  // Price presets
  const applyPricePreset = (min: string, max: string) => {
    setDraftMinPrice(min);
    setDraftMaxPrice(max);
  };

  return (
    <>
      <div className="sticky top-14 sm:top-16 z-30 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-border shadow-xs transition-all">
        {/* Clean Top Bar: Only Filter Button & Sorting */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Filter Trigger Button & Count */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openDrawer}
              className={`flex h-10 items-center gap-2.5 rounded-xl border px-4 text-xs font-bold transition-all active:scale-95 ${
                activeCount > 0
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/25 hover:bg-primary-hover'
                  : 'border-border bg-surface text-foreground shadow-xs hover:border-primary/60 hover:bg-surface-raised'
              }`}
              aria-label="Відкрити фільтри"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Фільтри</span>
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-black text-primary">
                  {activeCount}
                </span>
              )}
            </button>

            <span className="text-xs text-muted font-medium hidden sm:inline-block">
              {meta.total.toLocaleString('uk-UA')} товарів
            </span>
          </div>

          {/* Right Side: Sorting & Reset */}
          <div className="flex items-center gap-2">
            {/* Sorting Dropdown */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => commitFilters({ sort: e.target.value })}
                className="h-10 appearance-none rounded-xl border border-border bg-surface pl-3.5 pr-8 text-xs font-medium text-foreground shadow-xs focus:border-primary focus:outline-none cursor-pointer hover:border-border/80"
                aria-label="Сортування товарів"
              >
                <option value="newest">Нові поставки</option>
                <option value="popular">За популярністю</option>
                <option value="price_asc">Від дешевих до дорогих</option>
                <option value="price_desc">Від дорогих до дешевих</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-muted" />
            </div>

            {/* Reset button if active */}
            {activeCount > 0 && (
              <button
                type="button"
                onClick={resetAll}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-muted shadow-xs hover:text-red-500 hover:border-red-200 transition-colors"
                title="Скинути всі фільтри"
                aria-label="Скинути всі фільтри"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {activeCount > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap text-xs pb-0.5 pt-0.5 border-t border-border/60">
            <span className="text-muted text-[11px] font-bold uppercase tracking-wider mr-1">
              Обрано ({activeCount}):
            </span>

            {/* Category Chips */}
            {selectedCategories.map((cSlug) => {
              const catObj = meta.categories.find((c) => c.slug.toLowerCase() === cSlug);
              const catName = catObj ? catObj.name : cSlug;
              return (
                <span
                  key={cSlug}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <span>Категорія: {catName}</span>
                  <button
                    type="button"
                    onClick={() => removeActiveFilter('category', cSlug, selectedCategories)}
                    className="hover:text-foreground p-0.5"
                    aria-label={`Видалити фільтр категорії ${catName}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Gender Chips */}
            {selectedGenders.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                <span>Стать: {g === 'men' ? 'Чоловічі' : g === 'women' ? 'Жіночі' : 'Унісекс'}</span>
                <button
                  type="button"
                  onClick={() => removeActiveFilter('gender', g, selectedGenders)}
                  className="hover:text-foreground p-0.5"
                  aria-label="Видалити фільтр статі"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Size Chips */}
            {selectedSizes.map((sz) => (
              <span
                key={sz}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
              >
                <span>Розмір: {sz}</span>
                <button
                  type="button"
                  onClick={() => removeActiveFilter('size', sz, selectedSizes)}
                  className="hover:text-foreground p-0.5"
                  aria-label={`Видалити фільтр розміру ${sz}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Brand Chips */}
            {selectedBrands.map((bSlug) => {
              const brandObj = meta.brands.find((b) => b.slug.toLowerCase() === bSlug);
              const brandName = brandObj ? brandObj.name : bSlug;
              return (
                <span
                  key={bSlug}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                >
                  <span>Бренд: {brandName}</span>
                  <button
                    type="button"
                    onClick={() => removeActiveFilter('brand', bSlug, selectedBrands)}
                    className="hover:text-foreground p-0.5"
                    aria-label={`Видалити фільтр бренду ${brandName}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}

            {/* Season Chips */}
            {selectedSeasons.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <span>Сезон: {s === 'winter' ? 'Зимові' : 'Демісезон'}</span>
                <button
                  type="button"
                  onClick={() => removeActiveFilter('season', s, selectedSeasons)}
                  className="text-muted hover:text-foreground p-0.5"
                  aria-label="Видалити фільтр сезону"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Price Chip */}
            {(currentMinPrice || currentMaxPrice) && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                <span>
                  Ціна: {currentMinPrice ? `від ${currentMinPrice} ₴` : ''}{' '}
                  {currentMaxPrice ? `до ${currentMaxPrice} ₴` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => commitFilters({ minPrice: null, maxPrice: null })}
                  className="text-muted hover:text-foreground p-0.5"
                  aria-label="Очистити фільтр ціни"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Search Chip */}
            {currentSearch && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground">
                <span>Пошук: «{currentSearch}»</span>
                <button
                  type="button"
                  onClick={() => commitFilters({ search: null })}
                  className="text-muted hover:text-foreground p-0.5"
                  aria-label="Очистити пошуковий запит"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {/* Clear All Text Button */}
            <button
              type="button"
              onClick={resetAll}
              className="text-[11px] font-semibold text-muted hover:text-red-500 transition-colors ml-2 underline underline-offset-2"
            >
              Скинути все
            </button>
          </div>
        )}
      </div>

      {/* Full Modern Filter Drawer rendered in React Portal to document.body */}
      {mounted && isOpenDrawer && createPortal(
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpenDrawer(false);
            }
          }}
        >
          {/* Drawer Content Container */}
          <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-surface shadow-2xl border-l border-border animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                  Фільтри товарів
                </h3>
                <p className="text-xs text-muted">
                  В каталозі {meta.total.toLocaleString('uk-UA')} моделей
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenDrawer(false)}
                className="rounded-xl p-2 text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
                aria-label="Закрити фільтри"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
              {/* 1. КАТЕГОРІЇ ТОВАРУ */}
              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Категорія товару
                  </label>
                  {draftCategories.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftCategories([])}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Скинути ({draftCategories.length})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {meta.categories.map((c, idx) => {
                    const isSelected = draftCategories.includes(c.slug.toLowerCase());
                    const isLastOdd = idx === meta.categories.length - 1 && meta.categories.length % 2 !== 0;
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => setDraftCategories(toggleItem(draftCategories, c.slug))}
                        className={`h-11 rounded-xl px-3 text-xs font-bold transition-all flex items-center justify-between text-left ${
                          isLastOdd ? 'col-span-2' : ''
                        } ${
                          isSelected
                            ? 'bg-primary text-white shadow-sm border-2 border-primary'
                            : 'bg-background text-foreground border border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] opacity-75 font-normal shrink-0 pl-1">
                          ({c.count.toLocaleString('uk-UA')})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. СТАТЬ */}
              <div className="border-t border-border/80 pt-5">
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Стать
                  </label>
                  {draftGenders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftGenders([])}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Скинути ({draftGenders.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {meta.genders.map((g) => {
                    const isSelected = draftGenders.includes(g.slug.toLowerCase());
                    return (
                      <button
                        key={g.slug}
                        type="button"
                        onClick={() => setDraftGenders(toggleItem(draftGenders, g.slug))}
                        className={`h-10 rounded-xl px-2 text-xs font-bold transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs border-2 border-primary'
                            : 'bg-background text-foreground border border-border hover:border-primary/50'
                        }`}
                      >
                        <span>{g.name}</span>
                        <span className="text-[10px] opacity-75 font-normal">
                          ({g.count.toLocaleString('uk-UA')})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. РОЗМІР ВЗУТТЯ (EU) */}
              <div className="border-t border-border/80 pt-5">
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Розмір взуття (EU)
                  </label>
                  {draftSizes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftSizes([])}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Скинути ({draftSizes.length})
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted mb-3">Оберіть потрібний розмір (можна кілька):</p>

                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {numericSizes.map((sz) => {
                    const isSelected = draftSizes.includes(sz);
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setDraftSizes(toggleItem(draftSizes, sz))}
                        className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-white shadow-md shadow-primary/30 border-2 border-primary scale-[1.02]'
                            : 'bg-background text-foreground border border-border hover:border-primary/50'
                        }`}
                      >
                        {sz}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. БРЕНДИ */}
              <div className="border-t border-border/80 pt-5">
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Бренд
                  </label>
                  {draftBrands.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftBrands([])}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Скинути ({draftBrands.length})
                    </button>
                  )}
                </div>

                {/* Popular Brand Quick Tiles */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {topBrands.map((b) => {
                    const isSelected = draftBrands.includes(b.slug.toLowerCase());
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => setDraftBrands(toggleItem(draftBrands, b.slug))}
                        className={`h-9 rounded-xl px-2 text-xs font-bold transition-all flex items-center justify-center text-center ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs border-2 border-primary'
                            : 'bg-background text-foreground border border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Brand Search Input */}
                <div className="relative mb-2.5">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Пошук інших брендів..."
                    className="w-full h-9 rounded-xl border border-border bg-background pl-8 pr-8 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted pointer-events-none" />
                  {brandSearch && (
                    <button
                      type="button"
                      onClick={() => setBrandSearch('')}
                      className="absolute right-2.5 top-2.5 text-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Full Brand List with Checkboxes */}
                <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                  {filteredBrands.map((b) => {
                    const isSelected = draftBrands.includes(b.slug.toLowerCase());
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => setDraftBrands(toggleItem(draftBrands, b.slug))}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'bg-background hover:bg-surface-raised text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-border bg-surface'
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                          <span className="truncate">{b.name}</span>
                        </div>
                        <span className="text-[11px] text-muted shrink-0 pl-2">
                          {b.count.toLocaleString('uk-UA')}
                        </span>
                      </button>
                    );
                  })}
                  {filteredBrands.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted">
                      Брендів за запитом «{brandSearch}» не знайдено
                    </div>
                  )}
                </div>
              </div>

              {/* 5. ЦІНА (ГРН) */}
              <div className="border-t border-border/80 pt-5">
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Ціна (грн)
                  </label>
                  {(draftMinPrice || draftMaxPrice) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftMinPrice('');
                        setDraftMaxPrice('');
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Очистити
                    </button>
                  )}
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted block mb-1">
                      Від
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draftMinPrice}
                        onChange={(e) => setDraftMinPrice(e.target.value)}
                        placeholder={`${meta.minPrice}`}
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 pr-7 text-xs font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-muted">
                        ₴
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted block mb-1">
                      До
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={draftMaxPrice}
                        onChange={(e) => setDraftMaxPrice(e.target.value)}
                        placeholder={`${meta.maxPrice}`}
                        className="w-full h-10 rounded-xl border border-border bg-background px-3 pr-7 text-xs font-medium text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2.5 text-xs text-muted">
                        ₴
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPricePreset('', '2500')}
                    className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                      draftMinPrice === '' && draftMaxPrice === '2500'
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    До 2 500 ₴
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPricePreset('2500', '4000')}
                    className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                      draftMinPrice === '2500' && draftMaxPrice === '4000'
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    2 500 – 4 000 ₴
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPricePreset('4000', '6000')}
                    className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                      draftMinPrice === '4000' && draftMaxPrice === '6000'
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    4 000 – 6 000 ₴
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPricePreset('6000', '')}
                    className={`h-8 rounded-lg border text-xs font-medium transition-colors ${
                      draftMinPrice === '6000' && draftMaxPrice === ''
                        ? 'border-primary bg-primary text-white font-bold'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    Від 6 000 ₴
                  </button>
                </div>
              </div>

              {/* 6. СЕЗОН */}
              <div className="border-t border-border/80 pt-5">
                <div className="flex items-baseline justify-between mb-2.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Сезон
                  </label>
                  {draftSeasons.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDraftSeasons([])}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      Скинути ({draftSeasons.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {meta.seasons.map((s) => {
                    const isSelected = draftSeasons.includes(s.slug.toLowerCase());
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        onClick={() => setDraftSeasons(toggleItem(draftSeasons, s.slug))}
                        className={`h-10 rounded-xl px-3 text-xs font-bold transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs border-2 border-primary'
                            : 'bg-background text-foreground border border-border hover:border-primary/50'
                        }`}
                      >
                        <span>{s.name}</span>
                        <span className="text-[11px] opacity-75 font-normal">({s.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Fixed Footer */}
            <div className="shrink-0 border-t border-border bg-surface-raised px-5 py-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftCategories([]);
                  setDraftBrands([]);
                  setDraftSizes([]);
                  setDraftGenders([]);
                  setDraftSeasons([]);
                  setDraftMinPrice('');
                  setDraftMaxPrice('');
                }}
                className="flex-1 h-12 rounded-xl border border-border bg-background text-xs font-bold text-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                Скинути все
              </button>
              <button
                type="button"
                onClick={applyDrawerFilters}
                className="flex-1 h-12 rounded-xl bg-primary text-xs font-black uppercase tracking-wider text-white hover:bg-primary-hover shadow-lg shadow-primary/25 active:scale-[0.98] transition-all"
              >
                Застосувати
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
