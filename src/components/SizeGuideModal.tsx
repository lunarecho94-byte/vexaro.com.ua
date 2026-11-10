'use client';

import React, { useState, useEffect } from 'react';
import { X, Ruler, Check, Sparkles } from 'lucide-react';
import { Product, SizeChartItem } from '@/types/product';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize?: string;
  onSelectSize?: (size: string) => void;
  product?: Product;
  gender?: 'men' | 'women' | 'unisex' | string;
}

interface SizeRow {
  eu: string;
  cm: string;
  type: 'women' | 'men' | 'both';
}

const GENERAL_SIZE_CHART: SizeRow[] = [
  { eu: '35', cm: '22.0', type: 'women' },
  { eu: '36', cm: '22.5', type: 'women' },
  { eu: '37', cm: '23.5', type: 'women' },
  { eu: '38', cm: '24.0', type: 'women' },
  { eu: '39', cm: '25.0', type: 'women' },
  { eu: '40', cm: '25.5', type: 'both' },
  { eu: '41', cm: '26.0', type: 'both' },
  { eu: '42', cm: '26.5', type: 'men' },
  { eu: '43', cm: '27.5', type: 'men' },
  { eu: '44', cm: '28.0', type: 'men' },
  { eu: '45', cm: '28.5', type: 'men' },
  { eu: '46', cm: '29.5', type: 'men' },
  { eu: '47', cm: '30.0', type: 'men' },
];

export function SizeGuideModal({
  isOpen,
  onClose,
  selectedSize,
  onSelectSize,
  product,
  gender,
}: SizeGuideModalProps) {
  const effectiveGender = product?.gender || gender;
  const hasModelChart = Boolean(product?.sizeChart && product.sizeChart.length > 0);

  const [viewMode, setViewMode] = useState<'model' | 'general'>(
    hasModelChart ? 'model' : 'general'
  );
  const [generalGenderTab, setGeneralGenderTab] = useState<'all' | 'men' | 'women'>('all');

  useEffect(() => {
    if (hasModelChart) {
      setViewMode('model');
    } else {
      setViewMode('general');
    }
  }, [hasModelChart, isOpen]);

  useEffect(() => {
    if (effectiveGender === 'men') {
      setGeneralGenderTab('men');
    } else if (effectiveGender === 'women') {
      setGeneralGenderTab('women');
    } else {
      setGeneralGenderTab('all');
    }
  }, [effectiveGender, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredGeneralRows = GENERAL_SIZE_CHART.filter((row) => {
    if (generalGenderTab === 'men') return row.type === 'men' || row.type === 'both';
    if (generalGenderTab === 'women') return row.type === 'women' || row.type === 'both';
    return true;
  });

  const handleRowClick = (size: string, isAvailable: boolean) => {
    if (!isAvailable || !onSelectSize) return;
    onSelectSize(size);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ruler className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Розмірна сітка постачальника
              </h3>
              <p className="text-[11px] text-muted truncate max-w-[240px] sm:max-w-[280px]">
                {product?.name ? product.name : 'Таблиця довжини устілки'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-raised hover:text-foreground transition-colors"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* View Mode Switcher */}
        {hasModelChart && (
          <div className="mt-3.5 flex rounded-xl border border-border bg-surface-raised/60 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('model')}
              className={`flex-1 rounded-lg py-1.5 transition-all flex items-center justify-center gap-1.5 ${
                viewMode === 'model'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Сітка цієї моделі</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('general')}
              className={`flex-1 rounded-lg py-1.5 transition-all ${
                viewMode === 'general'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Загальний стандарт
            </button>
          </div>
        )}

        {/* General Gender Filter Tabs */}
        {viewMode === 'general' && (
          <div className="mt-3 flex rounded-xl border border-border bg-surface-raised/40 p-1 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setGeneralGenderTab('all')}
              className={`flex-1 rounded-lg py-1 transition-all ${
                generalGenderTab === 'all'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Всі (35–47)
            </button>
            <button
              type="button"
              onClick={() => setGeneralGenderTab('men')}
              className={`flex-1 rounded-lg py-1 transition-all ${
                generalGenderTab === 'men'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Чоловічі (40–47)
            </button>
            <button
              type="button"
              onClick={() => setGeneralGenderTab('women')}
              className={`flex-1 rounded-lg py-1 transition-all ${
                generalGenderTab === 'women'
                  ? 'bg-surface text-primary shadow-sm font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Жіночі (35–41)
            </button>
          </div>
        )}

        {/* Model Specific Size Table (Exact Match to EasyDrop Layout) */}
        {viewMode === 'model' && product?.sizeChart && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background shadow-inner">
            <div className="grid grid-cols-3 border-b border-border bg-surface-raised p-2.5 text-xs font-bold text-foreground text-center tracking-wide">
              <span>Розмір</span>
              <span>Устілка (см)</span>
              <span>Наявність</span>
            </div>

            <div className="divide-y divide-border/50 text-xs max-h-80 overflow-y-auto">
              {product.sizeChart.map((row: SizeChartItem) => {
                const isSelected = selectedSize && selectedSize.trim() === row.size.trim();
                const isAvailable = row.available !== false;
                const canSelect = Boolean(onSelectSize && isAvailable);

                return (
                  <div
                    key={row.size}
                    onClick={() => handleRowClick(row.size, isAvailable)}
                    className={`grid grid-cols-3 p-2.5 text-center items-center transition-colors ${
                      isSelected
                        ? 'bg-[#164426] text-white font-bold border-l-4 border-l-emerald-400 ring-1 ring-emerald-500/50'
                        : isAvailable
                        ? canSelect
                          ? 'bg-[#0e2a18]/70 hover:bg-[#133921] text-emerald-200 cursor-pointer border-l-4 border-l-emerald-600/70'
                          : 'bg-[#0e2a18]/70 text-emerald-200'
                        : 'bg-surface/20 text-muted/40 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <span className={`font-bold text-sm ${isSelected ? 'text-white' : isAvailable ? 'text-white' : 'text-muted/50'}`}>
                      {row.size}
                    </span>
                    <span className={`font-semibold ${isSelected ? 'text-emerald-300' : isAvailable ? 'text-emerald-300 font-semibold' : 'text-muted/50'}`}>
                      {row.cm}
                    </span>
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-300">
                          <Check className="h-3 w-3 stroke-[3]" /> Обрано
                        </span>
                      ) : isAvailable ? (
                        <span className="inline-flex items-center justify-center rounded bg-emerald-600/25 px-2 py-0.5 text-xs font-bold text-emerald-400 min-w-[28px]">
                          Є
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center text-muted/40 font-semibold text-xs">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Standard Size Table */}
        {viewMode === 'general' && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background shadow-inner">
            <div className="grid grid-cols-2 border-b border-border bg-surface-raised p-2.5 text-xs font-bold text-foreground text-center">
              <span>Розмір (EU)</span>
              <span>Довжина стопи / устілки</span>
            </div>

            <div className="divide-y divide-border text-xs max-h-72 overflow-y-auto">
              {filteredGeneralRows.map((row) => {
                const isSelected = selectedSize && selectedSize.trim() === row.eu;
                return (
                  <div
                    key={row.eu}
                    onClick={() => onSelectSize && onSelectSize(row.eu)}
                    className={`grid grid-cols-2 p-2.5 text-center items-center transition-colors ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold border-l-4 border-l-primary'
                        : onSelectSize
                        ? 'text-muted hover:bg-surface/50 cursor-pointer'
                        : 'text-muted'
                    }`}
                  >
                    <span className={`font-semibold flex items-center justify-center gap-1.5 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {row.eu}
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/20 px-1 py-0.2 text-[10px] text-primary">
                          <Check className="h-3 w-3 stroke-[3]" /> обрано
                        </span>
                      )}
                    </span>
                    <span className={isSelected ? 'text-primary font-bold' : ''}>
                      {row.cm} см
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selection Confirmation Bar */}
        {selectedSize && (
          <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between">
            <div className="text-xs">
              <span className="text-muted">Обраний розмір: </span>
              <span className="font-bold text-foreground text-sm">{selectedSize}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-hover transition-colors"
            >
              Підтвердити
            </button>
          </div>
        )}

        {/* How to Measure Tip */}
        <div className="mt-4 rounded-xl border border-border bg-surface-raised/40 p-3 text-[11px] text-muted leading-relaxed space-y-1">
          <p className="font-semibold text-foreground">💡 Як правильно виміряти стопу:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Покладіть аркуш паперу на підлогу біля стіни та станьте на нього пʼятою впритул до стіни.</li>
            <li>Зробіть позначку біля кінчика найдовшого пальця та виміряйте довжину лінійкою.</li>
            <li>Зіставте отримані сантиметри з таблицею моделі. Натисніть на свій розмір для швидкого вибору.</li>
          </ol>
        </div>

        <p className="mt-3 text-[11px] text-muted text-center">
          🚚 При отриманні у відділенні Нової Пошти ви завжди маєте можливість оглянути та приміряти взуття перед оплатою.
        </p>
      </div>
    </div>
  );
}
