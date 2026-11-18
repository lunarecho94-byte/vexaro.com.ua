'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ruler } from 'lucide-react';
import { SizeChartItem } from '@/types/product';

interface FootSizeSliderProps {
  sizeChart?: SizeChartItem[];
  allSizes?: string[];
  availableSizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onOpenSizeGuideModal?: () => void;
}

interface SliderSizeItem {
  size: string;
  cmRaw: number;
  cmFormatted: string; // e.g. "24,0" or "24"
  isAvailable: boolean;
}

// Fallback general table if model lacks specific row
const GENERAL_CM_MAP: Record<string, number> = {
  '35': 22.0,
  '36': 22.5,
  '37': 23.5,
  '38': 24.0,
  '39': 25.0,
  '40': 25.5,
  '41': 26.0,
  '42': 26.5,
  '43': 27.5,
  '44': 28.0,
  '45': 28.5,
  '46': 29.5,
  '47': 30.0,
};

function formatCm(num: number): string {
  // Format with comma in Ukrainian style: 24 -> "24,0", 24.5 -> "24,5"
  return num.toFixed(1).replace('.', ',');
}

function parseCm(val: string | number | undefined, size: string): number {
  if (val !== undefined && val !== null) {
    const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  const cleanSize = size.replace(/[^\d.]/g, '');
  return GENERAL_CM_MAP[cleanSize] || (cleanSize ? parseFloat(cleanSize) * 0.65 : 26.0);
}

export function FootSizeSlider({
  sizeChart,
  allSizes = [],
  availableSizes = [],
  selectedSize,
  onSelectSize,
  onOpenSizeGuideModal,
}: FootSizeSliderProps) {
  // Determine the relevant size run for this sneaker model
  const items: SliderSizeItem[] = useMemo(() => {
    // 1. Gather all unique sizes from sizeChart and allSizes
    const map = new Map<string, { cmRaw: number; isAvailable: boolean }>();

    // From sizeChart
    if (sizeChart && sizeChart.length > 0) {
      for (const row of sizeChart) {
        const s = row.size.trim();
        const cm = parseCm(row.cm, s);
        map.set(s, {
          cmRaw: cm,
          isAvailable: availableSizes.includes(s) || Boolean(row.available),
        });
      }
    }

    // From allSizes / availableSizes (to guarantee active sizes exist)
    const combinedSizes = Array.from(new Set([...allSizes, ...availableSizes]));
    for (const s of combinedSizes) {
      const trimmed = s.trim();
      if (!map.has(trimmed)) {
        map.set(trimmed, {
          cmRaw: parseCm(undefined, trimmed),
          isAvailable: availableSizes.includes(trimmed),
        });
      } else {
        // Update availability from current active variation
        const existing = map.get(trimmed)!;
        map.set(trimmed, {
          ...existing,
          isAvailable: availableSizes.includes(trimmed),
        });
      }
    }

    // 2. Filter sizes to the relevant range of this shoe model
    // E.g. for men's 41-46 shoe, do not include 36-40
    const activeNumerics = availableSizes
      .map((s) => parseFloat(s.replace(',', '.')))
      .filter((n) => !isNaN(n));

    let minNum = activeNumerics.length > 0 ? Math.min(...activeNumerics) : 36;
    let maxNum = activeNumerics.length > 0 ? Math.max(...activeNumerics) : 45;

    // Filter and sort items by numeric size
    const list: SliderSizeItem[] = [];
    map.forEach((data, sizeStr) => {
      const num = parseFloat(sizeStr.replace(',', '.'));
      const isNumeric = !isNaN(num);
      // Keep if within shoe range or if available
      if (data.isAvailable || (isNumeric && num >= minNum && num <= maxNum)) {
        list.push({
          size: sizeStr,
          cmRaw: data.cmRaw,
          cmFormatted: formatCm(data.cmRaw),
          isAvailable: data.isAvailable,
        });
      }
    });

    // Sort by cmRaw ascending, then numeric size
    list.sort((a, b) => {
      if (a.cmRaw !== b.cmRaw) return a.cmRaw - b.cmRaw;
      const nA = parseFloat(a.size.replace(',', '.'));
      const nB = parseFloat(b.size.replace(',', '.'));
      return (isNaN(nA) ? 0 : nA) - (isNaN(nB) ? 0 : nB);
    });

    return list;
  }, [sizeChart, allSizes, availableSizes]);

  // Find index of currently selected size
  const selectedIndex = useMemo(() => {
    if (!selectedSize) return 0;
    const idx = items.findIndex((it) => it.size === selectedSize);
    return idx >= 0 ? idx : 0;
  }, [items, selectedSize]);

  // Local state for smooth slider dragging
  const [sliderIndex, setSliderIndex] = useState<number>(selectedIndex);
  const isDraggingRef = useRef(false);

  // Keep slider synced when selectedSize changes externally
  useEffect(() => {
    if (!isDraggingRef.current) {
      setSliderIndex(selectedIndex);
    }
  }, [selectedIndex]);

  // Current active item derived from slider index
  const activeItem = items[Math.round(sliderIndex)] || items[0] || {
    size: selectedSize || '41',
    cmRaw: 26.0,
    cmFormatted: '26,0',
    isAvailable: true,
  };

  const maxIndex = Math.max(1, items.length - 1);
  const progressPercent = (sliderIndex / maxIndex) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSliderIndex(val);
    const closestIdx = Math.round(val);
    const item = items[closestIdx];
    if (item && item.size !== selectedSize) {
      onSelectSize(item.size);
    }
  };

  const handleCardClick = (item: SliderSizeItem) => {
    if (!item.isAvailable) return;
    const idx = items.findIndex((it) => it.size === item.size);
    if (idx >= 0) {
      setSliderIndex(idx);
    }
    onSelectSize(item.size);
  };

  // Choose scale marks to display under the slider (up to 5-6 evenly spaced)
  const scaleMarks = useMemo(() => {
    if (items.length === 0) return [];
    if (items.length <= 6) return items;
    // Pick first, middle, last or spaced marks
    const step = (items.length - 1) / 4;
    return [0, 1, 2, 3, 4].map((i) => items[Math.round(i * step)]);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border-2 border-dashed border-[#dfd7cc] dark:border-border/80 bg-[#fdfcf9] dark:bg-surface-raised/40 p-4 sm:p-5 shadow-sm transition-colors select-none">
      {/* Top Header: cm on Left, Size on Right */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {/* Left: Foot Length */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8278] dark:text-muted block">
            довжина вашої стопи
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#241c15] dark:text-foreground tracking-tight my-0.5">
            {activeItem.cmFormatted}&nbsp;см
          </div>
          <span className="text-[11px] font-medium text-[#8c8278] dark:text-muted block">
            посуньте повзунок
          </span>
        </div>

        {/* Right: Detected Size & Table Link */}
        <div className="text-right flex flex-col items-end">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8c8278] dark:text-muted block">
            ваш розмір
          </span>
          <div className="text-3xl sm:text-4xl font-black text-[#b47539] dark:text-primary tracking-tight leading-none my-0.5">
            {activeItem.size}
          </div>
          {onOpenSizeGuideModal && (
            <button
              type="button"
              onClick={onOpenSizeGuideModal}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-semibold mt-0.5"
            >
              <Ruler className="h-3 w-3" />
              <span>Таблиця розмірів</span>
            </button>
          )}
        </div>
      </div>

      {/* Range Slider */}
      <div className="pt-2 pb-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={maxIndex}
            step={0.01}
            value={sliderIndex}
            onMouseDown={() => {
              isDraggingRef.current = true;
            }}
            onMouseUp={() => {
              isDraggingRef.current = false;
              // Snap to nearest integer index
              const snapped = Math.round(sliderIndex);
              setSliderIndex(snapped);
              if (items[snapped]) onSelectSize(items[snapped].size);
            }}
            onTouchStart={() => {
              isDraggingRef.current = true;
            }}
            onTouchEnd={() => {
              isDraggingRef.current = false;
              const snapped = Math.round(sliderIndex);
              setSliderIndex(snapped);
              if (items[snapped]) onSelectSize(items[snapped].size);
            }}
            onChange={handleSliderChange}
            className="foot-size-slider w-full"
            style={{
              background: `linear-gradient(to right, #b47539 0%, #b47539 ${progressPercent}%, #e8e2d9 ${progressPercent}%, #e8e2d9 100%)`,
            }}
            aria-label="Повзунок вибору довжини стопи та розміру"
          />
        </div>

        {/* Scale labels under the slider */}
        <div className="flex justify-between items-center px-1 mt-2 text-[10px] sm:text-[11px] font-semibold text-[#8c8278] dark:text-muted">
          {scaleMarks.map((m, idx) => (
            <span key={`${m.size}-${idx}`} className="tabular-nums">
              {m.cmFormatted}
            </span>
          ))}
        </div>
      </div>

      {/* Row of Size Cards with cm underneath */}
      <div
        className="mt-4 grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${Math.min(items.length, 6)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const isSelected = selectedSize === item.size && item.isAvailable;
          const isAvailable = item.isAvailable;

          return (
            <button
              key={item.size}
              type="button"
              disabled={!isAvailable}
              onClick={() => handleCardClick(item)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all ${
                !isAvailable
                  ? 'border border-dashed border-[#dfd7cc]/70 dark:border-border/50 bg-[#f4efe8]/50 dark:bg-surface/30 text-muted/40 cursor-not-allowed line-through'
                  : isSelected
                  ? 'bg-[#241c15] text-white shadow-md ring-2 ring-[#241c15]/20 dark:bg-primary dark:ring-primary/30'
                  : 'bg-white dark:bg-surface border border-[#dfd7cc] dark:border-border text-[#241c15] dark:text-foreground hover:border-[#b47539] dark:hover:border-primary shadow-xs'
              }`}
              aria-label={`Розмір ${item.size}, довжина ${item.cmFormatted} см ${
                !isAvailable ? '(немає в наявності)' : ''
              }`}
            >
              <span className="text-sm sm:text-base font-black leading-tight">
                {item.size}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-medium leading-tight mt-0.5 whitespace-nowrap ${
                  isSelected ? 'text-white/85' : 'text-[#8c8278] dark:text-muted'
                }`}
              >
                {item.cmFormatted}&nbsp;см
              </span>
            </button>
          );
        })}
      </div>

      {/* Foot measurement instruction text */}
      <div className="mt-4 pt-3.5 border-t border-[#eee7dd] dark:border-border/60">
        <p className="text-[11px] sm:text-xs text-[#73685d] dark:text-muted leading-relaxed">
          Як виміряти: станьте на аркуш паперу, обведіть стопу і виміряйте від п&apos;яти до найдовшого пальця. Розмір підбираємо за довжиною устілки. Сумніваєтесь — менеджер підкаже під час дзвінка.
        </p>
      </div>
    </div>
  );
}
