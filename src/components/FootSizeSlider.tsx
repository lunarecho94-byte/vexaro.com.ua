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
  cmFormatted: string; // e.g. "24,0" or "24,5"
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

// Fixed 17-point scale from 22.0 cm to 30.0 cm with 0.5 cm step
const MIN_SCALE_CM = 22.0;
const MAX_SCALE_CM = 30.0;
const STEP_SCALE_CM = 0.5;
const RANGE_SCALE_CM = MAX_SCALE_CM - MIN_SCALE_CM; // 8.0

export const SCALE_CM_VALUES: number[] = [
  22.0, 22.5, 23.0, 23.5, 24.0, 24.5, 25.0, 25.5,
  26.0, 26.5, 27.0, 27.5, 28.0, 28.5, 29.0, 29.5, 30.0,
];

function formatCm(num: number): string {
  // Format with comma in Ukrainian style: 24 -> "24,0", 24.5 -> "24,5"
  return num.toFixed(1).replace('.', ',');
}

function parseCm(val: string | number | undefined, size: string): number {
  if (val !== undefined && val !== null) {
    const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && parsed < 40) return parsed;
  }
  const firstPart = size.split(/[\/\-]/)[0] || '';
  const cleanSize = firstPart.replace(/[^\d.]/g, '');
  if (GENERAL_CM_MAP[cleanSize]) return GENERAL_CM_MAP[cleanSize];
  const num = parseFloat(cleanSize);
  if (!isNaN(num) && num >= 30 && num <= 52) {
    return 22.0 + (num - 35) * 0.5;
  }
  return 26.0;
}

function findBestSizeForCm(
  cm: number,
  items: SliderSizeItem[],
  preferredSize?: string
): SliderSizeItem {
  if (items.length === 0) {
    return {
      size: preferredSize || '41',
      cmRaw: cm,
      cmFormatted: formatCm(cm),
      isAvailable: true,
    };
  }

  // If preferredSize already matches this cm, keep it
  if (preferredSize) {
    const pref = items.find(
      (it) => it.size === preferredSize && Math.abs(it.cmRaw - cm) < 0.01
    );
    if (pref) return pref;
  }

  // 1. Exact match by cm
  const exact = items.find((it) => Math.abs(it.cmRaw - cm) < 0.01);
  if (exact) return exact;

  // 2. Next size up that accommodates foot (insole >= foot length)
  const larger = items.filter((it) => it.cmRaw > cm);
  if (larger.length > 0) {
    larger.sort((a, b) => a.cmRaw - b.cmRaw);
    return larger[0];
  }

  // 3. Fallback to largest available size
  return items[items.length - 1];
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
        const existing = map.get(trimmed)!;
        map.set(trimmed, {
          ...existing,
          isAvailable: availableSizes.includes(trimmed),
        });
      }
    }

    // 2. Filter sizes to the relevant range of this shoe model
    const hasExplicitChart = Boolean(sizeChart && sizeChart.length > 0);
    const chartSizesSet = new Set(sizeChart?.map((r) => r.size.trim()) || []);

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
      const shouldKeep = hasExplicitChart
        ? chartSizesSet.has(sizeStr) || data.isAvailable
        : data.isAvailable || (isNumeric && num >= minNum && num <= maxNum);

      if (shouldKeep) {
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

  // Initial centimeter value derived from selectedSize or first available size
  const getInitialCm = (): number => {
    if (selectedSize) {
      const found = items.find((it) => it.size === selectedSize);
      if (found) return found.cmRaw;
    }
    const firstAvailable = items.find((it) => it.isAvailable);
    if (firstAvailable) return firstAvailable.cmRaw;
    return items[0]?.cmRaw ?? 26.0;
  };

  const [currentCm, setCurrentCm] = useState<number>(getInitialCm);
  const isDraggingRef = useRef(false);

  // Keep slider synced when selectedSize changes externally (e.g. from parent component)
  useEffect(() => {
    if (!isDraggingRef.current && selectedSize) {
      const found = items.find((it) => it.size === selectedSize);
      if (found) {
        setCurrentCm((prev) => (Math.abs(found.cmRaw - prev) > 0.01 ? found.cmRaw : prev));
      }
    }
  }, [selectedSize, items]);

  // Current active size item derived from currentCm
  const activeItem = useMemo(() => {
    return findBestSizeForCm(currentCm, items, selectedSize);
  }, [currentCm, items, selectedSize]);

  // Thumb ratio for exact positioning: 0.0 at 22.0 cm, 1.0 at 30.0 cm
  const sliderRatio = Math.max(0, Math.min(1, (currentCm - MIN_SCALE_CM) / RANGE_SCALE_CM));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentCm(val);
    const matched = findBestSizeForCm(val, items, selectedSize);
    if (matched && matched.size !== selectedSize) {
      onSelectSize(matched.size);
    }
  };

  const handleCmSelect = (val: number) => {
    setCurrentCm(val);
    const matched = findBestSizeForCm(val, items, selectedSize);
    if (matched && matched.size !== selectedSize) {
      onSelectSize(matched.size);
    }
  };

  const handleCardClick = (item: SliderSizeItem) => {
    if (!item.isAvailable) return;
    setCurrentCm(item.cmRaw);
    onSelectSize(item.size);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-border bg-surface-raised/40 p-4 sm:p-5 shadow-xs transition-colors select-none">
      {/* Top Header: cm on Left, Size on Right */}
      <div className="flex items-start justify-between gap-2 mb-3">
        {/* Left: Foot Length */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
            довжина вашої стопи
          </span>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight my-0.5">
            {formatCm(currentCm)}&nbsp;см
          </div>
          <span className="text-[11px] font-medium text-muted block">
            посуньте повзунок
          </span>
        </div>

        {/* Right: Detected Size & Table Link */}
        <div className="text-right flex flex-col items-end">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted block">
            ваш розмір
          </span>
          <div className="text-3xl sm:text-4xl font-black text-primary tracking-tight leading-none my-0.5">
            {activeItem.size}
          </div>
          {onOpenSizeGuideModal && (
            <button
              type="button"
              onClick={onOpenSizeGuideModal}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-hover hover:underline font-semibold mt-0.5 transition-colors"
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
            min={MIN_SCALE_CM}
            max={MAX_SCALE_CM}
            step={STEP_SCALE_CM}
            value={currentCm}
            onMouseDown={() => {
              isDraggingRef.current = true;
            }}
            onMouseUp={() => {
              isDraggingRef.current = false;
            }}
            onTouchStart={() => {
              isDraggingRef.current = true;
            }}
            onTouchEnd={() => {
              isDraggingRef.current = false;
            }}
            onChange={handleSliderChange}
            className="foot-size-slider w-full"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 calc(13px + (100% - 26px) * ${sliderRatio}), var(--border, #e4e4e7) calc(13px + (100% - 26px) * ${sliderRatio}), var(--border, #e4e4e7) 100%)`,
            }}
            aria-label="Повзунок вибору довжини стопи від 22,0 до 30,0 см"
          />
        </div>

        {/* Scale labels under slider (22.0 to 30.0 with 0.5 step, staggered 2-tier for crystal-clear readability) */}
        <div className="relative w-full h-11 mt-2.5 select-none pointer-events-none">
          {SCALE_CM_VALUES.map((val) => {
            const ratio = (val - MIN_SCALE_CM) / RANGE_SCALE_CM;
            const isWhole = val % 1 === 0;
            const isSelected = Math.abs(currentCm - val) < 0.05;

            return (
              <button
                key={val}
                type="button"
                onClick={() => handleCmSelect(val)}
                className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-pointer focus:outline-none group"
                style={{
                  left: `calc(13px + (100% - 26px) * ${ratio})`,
                  top: 0,
                  bottom: 0,
                  width: '20px',
                }}
                aria-label={`Обрати довжину стопи ${formatCm(val)} см`}
              >
                {/* Top tick mark pointing directly to the slider track */}
                <span
                  className={`rounded-full transition-all ${
                    isWhole ? 'h-2 w-[1.5px]' : 'h-1.5 w-[1px]'
                  } ${
                    isSelected
                      ? 'bg-primary scale-y-110 shadow-xs'
                      : isWhole
                      ? 'bg-foreground/40 group-hover:bg-foreground'
                      : 'bg-muted/40 group-hover:bg-muted-foreground'
                  }`}
                />

                {/* Centimeter number label: whole numbers on upper tier, half numbers on lower tier */}
                <span
                  className={`tabular-nums whitespace-nowrap leading-none transition-all ${
                    isWhole ? 'mt-1.5' : 'mt-5'
                  } ${
                    isSelected
                      ? 'text-primary font-bold text-[10px] sm:text-[11px] scale-105'
                      : isWhole
                      ? 'text-foreground/80 font-semibold text-[8.5px] sm:text-[9.5px] group-hover:text-foreground'
                      : 'text-muted font-medium text-[8px] sm:text-[9px] group-hover:text-foreground'
                  }`}
                >
                  {formatCm(val)}
                </span>
              </button>
            );
          })}
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
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl sm:rounded-2xl transition-all ${
                !isAvailable
                  ? 'border border-dashed border-border/60 bg-surface-raised/40 text-muted/40 cursor-not-allowed line-through'
                  : isSelected
                  ? 'bg-primary text-white shadow-md shadow-primary/25 ring-2 ring-primary/40'
                  : 'bg-surface border border-border text-foreground hover:border-primary hover:text-primary shadow-xs'
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
                  isSelected ? 'text-white/90' : 'text-muted'
                }`}
              >
                {item.cmFormatted}&nbsp;см
              </span>
            </button>
          );
        })}
      </div>

      {/* Foot measurement instruction text */}
      <div className="mt-4 pt-3.5 border-t border-border">
        <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
          Як виміряти: станьте на аркуш паперу, обведіть стопу і виміряйте від п&apos;яти до найдовшого пальця. Розмір підбираємо за довжиною устілки. Сумніваєтесь — менеджер підкаже під час дзвінка.
        </p>
      </div>
    </div>
  );
}
