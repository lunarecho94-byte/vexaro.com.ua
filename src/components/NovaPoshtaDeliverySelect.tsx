'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Check, ChevronDown, X, Loader2, Building2, Package, Edit3 } from 'lucide-react';

interface CityItem {
  ref: string;
  cityRef: string;
  name: string;
  region: string;
  label: string;
}

interface WarehouseItem {
  ref: string;
  number: string;
  description: string;
  shortAddress: string;
  type: 'branch' | 'postomat';
  maxWeight: number;
}

interface NovaPoshtaDeliverySelectProps {
  city: string;
  warehouse: string;
  onCityChange: (cityName: string) => void;
  onWarehouseChange: (warehouseName: string) => void;
  error?: string;
}

const POPULAR_QUICK_CITIES = [
  { name: 'Київ', cityRef: '8d5a980d-391c-11dd-90d9-001a92567626', ref: 'e718a680-4b33-11e4-ab6d-005056801329' },
  { name: 'Львів', cityRef: '8d5a980e-391c-11dd-90d9-001a92567626', ref: 'e718a68a-4b33-11e4-ab6d-005056801329' },
  { name: 'Одеса', cityRef: '8d5a980f-391c-11dd-90d9-001a92567626', ref: 'e718a68e-4b33-11e4-ab6d-005056801329' },
  { name: 'Дніпро', cityRef: 'db5c88f0-391c-11dd-90d9-001a92567626', ref: 'e718a686-4b33-11e4-ab6d-005056801329' },
  { name: 'Харків', cityRef: 'db5c88e0-391c-11dd-90d9-001a92567626', ref: 'e718a685-4b33-11e4-ab6d-005056801329' },
  { name: 'Вінниця', cityRef: 'db5c88f5-391c-11dd-90d9-001a92567626', ref: 'e718a698-4b33-11e4-ab6d-005056801329' },
  { name: 'Івано-Франківськ', cityRef: 'db5c88f7-391c-11dd-90d9-001a92567626', ref: 'e718a693-4b33-11e4-ab6d-005056801329' },
];

export function NovaPoshtaDeliverySelect({
  city,
  warehouse,
  onCityChange,
  onWarehouseChange,
}: NovaPoshtaDeliverySelectProps) {
  const [manualMode, setManualMode] = useState(false);

  // City state
  const [citySearch, setCitySearch] = useState(city);
  const [selectedCityRef, setSelectedCityRef] = useState<string>('');
  const [cityList, setCityList] = useState<CityItem[]>([]);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);

  // Warehouse state
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [warehouseList, setWarehouseList] = useState<WarehouseItem[]>([]);
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
  const [isWarehouseDropdownOpen, setIsWarehouseDropdownOpen] = useState(false);
  const [warehouseTypeFilter, setWarehouseTypeFilter] = useState<'all' | 'branch' | 'postomat'>('all');

  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const warehouseDropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize internal citySearch if parent changes
  useEffect(() => {
    if (city && city !== citySearch && !selectedCityRef) {
      setCitySearch(city);
    }
  }, [city]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
      if (warehouseDropdownRef.current && !warehouseDropdownRef.current.contains(e.target as Node)) {
        setIsWarehouseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch cities on input change (debounced)
  useEffect(() => {
    if (manualMode) return;

    const timer = setTimeout(async () => {
      if (!isCityDropdownOpen) return;
      setIsCityLoading(true);
      try {
        const res = await fetch(`/api/novaposhta/cities?query=${encodeURIComponent(citySearch || '')}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.cities)) {
          setCityList(data.cities);
        }
      } catch (err) {
        console.error('Failed to load cities:', err);
      } finally {
        setIsCityLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [citySearch, isCityDropdownOpen, manualMode]);

  // Fetch warehouses when selectedCityRef or search/filter changes
  useEffect(() => {
    if (manualMode || !selectedCityRef) return;

    let cancelled = false;
    const fetchWarehouses = async () => {
      setIsWarehouseLoading(true);
      try {
        const params = new URLSearchParams({
          cityRef: selectedCityRef,
          search: warehouseSearch,
          type: warehouseTypeFilter,
        });
        const res = await fetch(`/api/novaposhta/warehouses?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && data.success && Array.isArray(data.warehouses)) {
          setWarehouseList(data.warehouses);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to load warehouses:', err);
      } finally {
        if (!cancelled) setIsWarehouseLoading(false);
      }
    };

    const timer = setTimeout(fetchWarehouses, warehouseSearch ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCityRef, warehouseSearch, warehouseTypeFilter, manualMode]);

  const handleSelectCity = (cityItem: CityItem | typeof POPULAR_QUICK_CITIES[0]) => {
    const name = cityItem.name;
    const cityRef = cityItem.cityRef;
    setCitySearch(name);
    setSelectedCityRef(cityRef);
    onCityChange(name);
    setIsCityDropdownOpen(false);

    // Reset warehouse
    onWarehouseChange('');
    setWarehouseSearch('');
    setIsWarehouseDropdownOpen(true);
  };

  const handleSelectWarehouse = (wh: WarehouseItem) => {
    onWarehouseChange(wh.description);
    setIsWarehouseDropdownOpen(false);
  };

  const handleClearCity = () => {
    setCitySearch('');
    setSelectedCityRef('');
    onCityChange('');
    onWarehouseChange('');
    setWarehouseList([]);
    setIsCityDropdownOpen(true);
  };

  if (manualMode) {
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-foreground">
              Місто доставки <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Search className="h-3 w-3" />
              <span>Пошук у базі Нової Пошти</span>
            </button>
          </div>
          <input
            type="text"
            required
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="наприклад: Київ"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Відділення або поштомат Нової Пошти <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={warehouse}
            onChange={(e) => onWarehouseChange(e.target.value)}
            placeholder="наприклад: Відділення №25 (вул. Хрещатик, 14)"
            className="w-full h-11 rounded-lg border border-border bg-surface px-3.5 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>
    );
  }

  const branchCount = warehouseList.filter((w) => w.type === 'branch').length;
  const postomatCount = warehouseList.filter((w) => w.type === 'postomat').length;

  return (
    <div className="space-y-4">
      {/* 1. CITY SELECTION */}
      <div className="relative" ref={cityDropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span>Місто доставки</span>
            <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="text-[11px] text-muted hover:text-foreground flex items-center gap-1 transition-colors"
            title="Ввести місто та адресу вручну"
          >
            <Edit3 className="h-3 w-3" />
            <span>Ввести вручну</span>
          </button>
        </div>

        {/* Quick-select chips for popular cities */}
        {!selectedCityRef && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {POPULAR_QUICK_CITIES.slice(0, 6).map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleSelectCity(c)}
                className="rounded-md border border-border bg-surface hover:border-primary/60 hover:text-primary px-2.5 py-1 text-[11px] font-medium text-muted transition-all active:scale-95"
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <input
            type="text"
            required
            value={citySearch}
            onChange={(e) => {
              setCitySearch(e.target.value);
              setSelectedCityRef('');
              onCityChange(e.target.value);
              setIsCityDropdownOpen(true);
            }}
            onFocus={() => setIsCityDropdownOpen(true)}
            placeholder="Введіть або оберіть місто (наприклад: Київ, Львів...)"
            className="w-full h-11 rounded-lg border border-border bg-surface pl-9 pr-9 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none transition-colors"
          />
          <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" />

          {isCityLoading ? (
            <Loader2 className="absolute right-3 top-3.5 h-4 w-4 text-primary animate-spin" />
          ) : citySearch ? (
            <button
              type="button"
              onClick={handleClearCity}
              className="absolute right-2.5 top-2.5 p-1 text-muted hover:text-foreground"
              aria-label="Очистити місто"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted" />
          )}
        </div>

        {/* City Dropdown List */}
        {isCityDropdownOpen && (
          <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-surface-raised shadow-2xl scrollbar-thin">
            {isCityLoading && cityList.length === 0 ? (
              <div className="flex items-center justify-center p-4 text-xs text-muted gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Пошук міст Нової Пошти...</span>
              </div>
            ) : cityList.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">
                Місто не знайдено.{' '}
                <button
                  type="button"
                  onClick={() => {
                    onCityChange(citySearch);
                    setIsCityDropdownOpen(false);
                  }}
                  className="text-primary underline font-medium"
                >
                  Використати як є
                </button>
              </div>
            ) : (
              <div className="py-1">
                {cityList.map((item) => (
                  <button
                    key={item.ref}
                    type="button"
                    onClick={() => handleSelectCity(item)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs text-foreground hover:bg-surface hover:text-primary transition-colors border-b border-border/40 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-foreground">{item.name}</div>
                      {item.region && (
                        <div className="text-[11px] text-muted">{item.region}</div>
                      )}
                    </div>
                    {item.name.toLowerCase() === citySearch.toLowerCase() && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. WAREHOUSE / POSTOMAT SELECTION */}
      <div className="relative" ref={warehouseDropdownRef}>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Відділення або поштомат</span>
            <span className="text-rose-500">*</span>
          </label>
          {selectedCityRef && (
            <span className="text-[11px] text-muted">
              {warehouseList.length > 0 ? `${warehouseList.length} пунктів у м. ${city}` : ''}
            </span>
          )}
        </div>

        {/* Selected warehouse display box */}
        {warehouse && !isWarehouseDropdownOpen ? (
          <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
            <div className="flex items-start gap-2.5 pr-2">
              {warehouse.toLowerCase().includes('поштомат') ? (
                <Package className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-bold text-foreground leading-snug">{warehouse}</div>
                <div className="text-[11px] text-muted mt-0.5">Нова Пошта • м. {city}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsWarehouseDropdownOpen(true)}
              className="text-[11px] font-bold text-primary hover:underline shrink-0"
            >
              Змінити
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              required
              disabled={!city}
              value={warehouseSearch || (warehouse && !isWarehouseDropdownOpen ? warehouse : '')}
              onChange={(e) => {
                setWarehouseSearch(e.target.value);
                onWarehouseChange(e.target.value);
                setIsWarehouseDropdownOpen(true);
              }}
              onFocus={() => {
                if (city) setIsWarehouseDropdownOpen(true);
              }}
              placeholder={
                city
                  ? 'Оберіть відділення або введіть номер (наприклад: 12)'
                  : 'Спочатку оберіть місто вище'
              }
              className="w-full h-11 rounded-lg border border-border bg-surface pl-9 pr-9 text-xs text-foreground placeholder:text-muted focus:border-primary focus:outline-none disabled:opacity-50 transition-colors"
            />
            <Building2 className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted" />

            {isWarehouseLoading ? (
              <Loader2 className="absolute right-3 top-3.5 h-4 w-4 text-primary animate-spin" />
            ) : warehouseSearch ? (
              <button
                type="button"
                onClick={() => {
                  setWarehouseSearch('');
                  onWarehouseChange('');
                }}
                className="absolute right-2.5 top-2.5 p-1 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-muted" />
            )}
          </div>
        )}

        {/* Warehouse Dropdown List with Filter Tabs */}
        {isWarehouseDropdownOpen && city && (
          <div className="absolute z-30 mt-1 max-h-72 w-full flex flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl">
            {/* Filter Tabs: All, Branch, Postomat */}
            <div className="flex border-b border-border bg-surface p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setWarehouseTypeFilter('all')}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors ${
                  warehouseTypeFilter === 'all'
                    ? 'bg-primary text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Всі
              </button>
              <button
                type="button"
                onClick={() => setWarehouseTypeFilter('branch')}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                  warehouseTypeFilter === 'branch'
                    ? 'bg-primary text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Building2 className="h-3 w-3" />
                <span>Відділення{branchCount > 0 ? ` (${branchCount})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setWarehouseTypeFilter('postomat')}
                className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 ${
                  warehouseTypeFilter === 'postomat'
                    ? 'bg-primary text-background'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                <Package className="h-3 w-3" />
                <span>Поштомати{postomatCount > 0 ? ` (${postomatCount})` : ''}</span>
              </button>
            </div>

            {/* Warehouse List */}
            <div className="overflow-y-auto max-h-56 p-1 scrollbar-thin">
              {isWarehouseLoading && warehouseList.length === 0 ? (
                <div className="flex items-center justify-center p-6 text-xs text-muted gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Завантаження пунктів Нової Пошти...</span>
                </div>
              ) : warehouseList.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted">
                  За запитом нічого не знайдено.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onWarehouseChange(warehouseSearch);
                      setIsWarehouseDropdownOpen(false);
                    }}
                    className="text-primary underline font-medium block mt-1 mx-auto"
                  >
                    Використати введений номер
                  </button>
                </div>
              ) : (
                warehouseList.map((wh) => (
                  <button
                    key={wh.ref}
                    type="button"
                    onClick={() => handleSelectWarehouse(wh)}
                    className="w-full flex items-start gap-2.5 p-2.5 text-left rounded-lg hover:bg-surface transition-colors border-b border-border/30 last:border-0"
                  >
                    {wh.type === 'postomat' ? (
                      <Package className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground line-clamp-1">
                        {wh.description}
                      </div>
                      <div className="text-[11px] text-muted line-clamp-1 mt-0.5">
                        {wh.shortAddress}
                      </div>
                    </div>
                    {warehouse === wh.description && (
                      <Check className="h-4 w-4 text-primary shrink-0 self-center" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
