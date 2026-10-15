'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  ArrowUpDown,
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

  const [isOpenDrawer, setIsOpenDrawer] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  // Parse active filters from URL
  const selectedBrands = searchParams?.get('brand')
    ? searchParams.get('brand')!.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const selectedSizes = searchParams?.get('size')
    ? searchParams.get('size')!.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  const selectedGenders = searchParams?.get('gender')
    ? searchParams.get('gender')!.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const selectedSeasons = searchParams?.get('season')
    ? searchParams.get('season')!.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  const currentMinPrice = searchParams?.get('minPrice') || '';
  const currentMaxPrice = searchParams?.get('maxPrice') || '';
  const selectedSort = searchParams?.get('sort') || currentSort;
  const currentSearch = searchParams?.get('search') || '';

  // Local draft state for the full filter drawer
  const [draftBrands, setDraftBrands] = useState<string[]>([]);
  const [draftSizes, setDraftSizes] = useState<string[]>([]);
  const [draftGenders, setDraftGenders] = useState<string[]>([]);
  const [draftSeasons, setDraftSeasons] = useState<string[]>([]);
  const [draftMinPrice, setDraftMinPrice] = useState<string>('');
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>('');

  // Sync draft state whenever drawer opens
  const openDrawer = () => {
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
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname || '/';
      router.push(targetUrl, { scroll: false });
    });
  };

  // Instant toggle for top quick bar
  const toggleQuickFilter = (
    key: 'gender' | 'brand' | 'season' | 'size',
    value: string,
    currentList: string[]
  ) => {
    const isSelected = currentList.includes(value.toLowerCase());
    const nextList = isSelected
      ? currentList.filter((item) => item !== value.toLowerCase())
      : [...currentList, value.toLowerCase()];

    commitFilters({
      [key]: nextList.length > 0 ? nextList.join(',') : null,
    });
  };

  // Apply draft from drawer
  const applyDrawerFilters = () => {
    commitFilters({
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
      router.push(pathname || '/', { scroll: false });
    });
    setIsOpenDrawer(false);
  };

  // Toggle item in array helper
  const toggleItem = (arr: string[], item: string) => {
    const lower = item.toLowerCase();
    return arr.includes(lower) ? arr.filter((x) => x !== lower) : [...arr, lower];
  };

  // Clean numeric sizes
  const numericSizes = meta.sizes
    .filter((s) => !isNaN(Number(s)))
    .sort((a, b) => Number(a) - Number(b));

  // Quick popular sizes for the top bar
  const quickSizes = ['38', '39', '40', '41', '42', '43', '44', '45'];

  // Filtered brands for drawer
  const filteredBrands = meta.brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.trim().toLowerCase())
  );

  // Price presets
  const applyPricePreset = (min: string, max: string) => {
    setDraftMinPrice(min);
    setDraftMaxPrice(max);
  };

  return (
    <div className="sticky top-14 sm:top-16 z-30 mb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-background/95 backdrop-blur-md py-2.5 sm:py-3 border-b border-border shadow-xs transition-all">
      {/* Top Filter Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Left Side: Filter Drawer Trigger + Horizontal Quick Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none min-w-0 flex-1">
          {/* Main "Filters" Button with Active Badge */}
          <button
            type="button"
            onClick={openDrawer}
            className={`flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all active:scale-95 ${
              activeCount > 0
                ? 'border-primary bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-hover'
                : 'border-border bg-surface text-foreground hover:border-primary/50 hover:bg-surface-raised'
            }`}
            aria-label="Відкрити фільтри"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Фільтри</span>
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-primary">
                {activeCount}
              </span>
            )}
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Quick Tab: All */}
          <button
            type="button"
            onClick={() => {
              commitFilters({
                gender: null,
                brand: null,
                season: null,
                size: null,
                minPrice: null,
                maxPrice: null,
              });
            }}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCount === 0
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Всі
          </button>

          {/* Quick Gender Pills */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('gender', 'men', selectedGenders)}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGenders.includes('men')
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Чоловічі
          </button>
          <button
            type="button"
            onClick={() => toggleQuickFilter('gender', 'women', selectedGenders)}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGenders.includes('women')
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Жіночі
          </button>
          <button
            type="button"
            onClick={() => toggleQuickFilter('gender', 'unisex', selectedGenders)}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedGenders.includes('unisex')
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Унісекс
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Quick Season Pills */}
          <button
            type="button"
            onClick={() => toggleQuickFilter('season', 'demi', selectedSeasons)}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSeasons.includes('demi')
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Демісезон
          </button>
          <button
            type="button"
            onClick={() => toggleQuickFilter('season', 'winter', selectedSeasons)}
            className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedSeasons.includes('winter')
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:text-foreground border border-border'
            }`}
          >
            Зимові
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Quick Popular Brands */}
          {meta.brands.slice(0, 6).map((b) => {
            const isSelected = selectedBrands.includes(b.slug.toLowerCase());
            return (
              <button
                key={b.slug}
                type="button"
                onClick={() => toggleQuickFilter('brand', b.slug, selectedBrands)}
                className={`h-9 shrink-0 rounded-xl px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-surface text-muted hover:text-foreground border border-border'
                }`}
              >
                {b.name}
              </button>
            );
          })}

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Quick Sizes */}
          <span className="text-[11px] font-bold uppercase text-muted shrink-0 pl-1">Розмір:</span>
          {quickSizes.map((sz) => {
            const isSelected = selectedSizes.includes(sz);
            return (
              <button
                key={sz}
                type="button"
                onClick={() => toggleQuickFilter('size', sz, selectedSizes)}
                className={`h-8 w-9 shrink-0 rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface text-foreground border border-border hover:border-primary/60'
                }`}
              >
                {sz}
              </button>
            );
          })}
        </div>

        {/* Right Side: Sorting & Reset */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {/* Sorting Dropdown */}
          <div className="relative">
            <select
              value={selectedSort}
              onChange={(e) => commitFilters({ sort: e.target.value })}
              className="h-9 appearance-none rounded-xl border border-border bg-surface pl-3 pr-8 text-xs font-medium text-foreground focus:border-primary focus:outline-none cursor-pointer"
              aria-label="Сортування товарів"
            >
              <option value="newest">Нові поставки</option>
              <option value="popular">За популярністю</option>
              <option value="price_asc">Від дешевих до дорогих</option>
              <option value="price_desc">Від дорогих до дешевих</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-muted" />
          </div>

          {/* Reset button if active */}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-red-500 hover:border-red-200 transition-colors"
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

          {/* Gender Chips */}
          {selectedGenders.map((g) => (
            <span
              key={g}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
            >
              <span>Стать: {g === 'men' ? 'Чоловічі' : g === 'women' ? 'Жіночі' : 'Унісекс'}</span>
              <button
                type="button"
                onClick={() => toggleQuickFilter('gender', g, selectedGenders)}
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
                onClick={() => toggleQuickFilter('size', sz, selectedSizes)}
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
                  onClick={() => toggleQuickFilter('brand', bSlug, selectedBrands)}
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
                onClick={() => toggleQuickFilter('season', s, selectedSeasons)}
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

      {/* Full Modern Filter Drawer */}
      {isOpenDrawer && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsOpenDrawer(false)} />

          {/* Drawer Content */}
          <div className="flex h-full w-full max-w-md flex-col bg-surface shadow-2xl border-l border-border animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/95 px-5 py-4 backdrop-blur-md">
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
              {/* Section 1: Footwear Sizes (EU) */}
              <div>
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
                <p className="text-[11px] text-muted mb-3">Оберіть один або декілька розмірів:</p>

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

              {/* Section 2: Price Range */}
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

                {/* Price Range Quick Presets */}
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

              {/* Section 3: Gender */}
              <div className="border-t border-border/80 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-foreground block mb-2.5">
                  Стать
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {meta.genders.map((g) => {
                    const isSelected = draftGenders.includes(g.slug);
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
                        <span className="text-[10px] opacity-75 font-normal">({g.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Brand with Search */}
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

                {/* Brand Search Input */}
                <div className="relative mb-2.5">
                  <input
                    type="text"
                    value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    placeholder="Пошук бренду..."
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

                {/* Brand List */}
                <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
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

              {/* Section 5: Season */}
              <div className="border-t border-border/80 pt-5">
                <label className="text-xs font-black uppercase tracking-wider text-foreground block mb-2.5">
                  Сезон
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {meta.seasons.map((s) => {
                    const isSelected = draftSeasons.includes(s.slug);
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
            <div className="sticky bottom-0 z-10 border-t border-border bg-surface/95 px-5 py-4 backdrop-blur-md flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftBrands([]);
                  setDraftSizes([]);
                  setDraftGenders([]);
                  setDraftSeasons([]);
                  setDraftMinPrice('');
                  setDraftMaxPrice('');
                }}
                className="flex-1 h-12 rounded-xl border border-border bg-background text-xs font-bold text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
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
        </div>
      )}
    </div>
  );
}
