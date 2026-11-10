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
  { eu: '36', cm: '22.5', type: 'women' },
  { eu: '37', cm: '23.5', type: 'women' },
  { eu: '38', cm: '24.0', type: 'women' },
  { eu: '39', cm: '25.0', type: 'women' },
  { eu: '40', cm: '25.5', type: 'both' },
  { eu: '41', cm: '26.0', type: 'both' },
  { eu: '42', cm: '26.5', type: 'men' },
  { eu: '43', cm: '27.5', type: 'men' },
  { eu: '44', cm: '28.0', type: 'men' },
  { eu: '45', cm: '29.0', type: 'men' },
  { eu: '46', cm: '30.0', type: 'men' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Ruler className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Розмірна сітка взуття
              </h3>
              <p className="text-[11px] text-muted">
                {hasModelChart && viewMode === 'model'
                  ? `Сітка постачальника: ${product?.name || 'для цієї моделі'}`
                  : 'Стандартна розмірна сітка постачальника'}
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

        {/* View Mode Switcher (Model Specific vs General Grid) */}
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
              <span>Для цього товару</span>
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
              Загальна таблиця
            </button>
          </div>
        )}

        {/* General Gender Filter Tabs (only when viewing general table) */}
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
              Всі (36–46)
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
              Чоловічі (40–46)
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
              Жіночі (36–41)
            </button>
          </div>
        )}

        {/* Model Specific Size Table */}
        {viewMode === 'model' && product?.sizeChart && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background shadow-inner">
            <div className="grid grid-cols-3 border-b border-border bg-surface-raised p-2.5 text-xs font-bold text-foreground text-center">
              <span>Розмір (EU)</span>
              <span>Довжина устілки</span>
              <span>Наявність</span>
            </div>

            <div className="divide-y divide-border text-xs max-h-72 overflow-y-auto">
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
                        ? 'bg-primary/15 text-primary font-bold border-l-4 border-l-primary'
                        : isAvailable
                        ? canSelect
                          ? 'text-muted hover:bg-surface/70 cursor-pointer'
                          : 'text-muted'
                        : 'text-muted/40 bg-surface-raised/20 cursor-not-allowed'
                    }`}
                  >
                    <span className={`font-semibold flex items-center justify-center gap-1 ${isSelected ? 'text-primary font-bold' : isAvailable ? 'text-foreground' : 'text-muted/60'}`}>
                      {row.size}
                    </span>
                    <span className={isSelected ? 'text-primary font-bold' : isAvailable ? 'text-foreground' : 'text-muted/60'}>
                      {row.cm} см
                    </span>
                    <div className="flex items-center justify-center">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                          <Check className="h-3 w-3 stroke-[3]" /> обрано
                        </span>
                      ) : isAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> В наявності
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/10 px-2 py-0.5 text-[10px] font-normal text-muted/60">
                          Закінчився
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Size Table */}
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

        {/* How to Measure Tip */}
        <div className="mt-4 rounded-xl border border-border bg-surface-raised/40 p-3 text-[11px] text-muted leading-relaxed space-y-1">
          <p className="font-semibold text-foreground">💡 Як правильно виміряти стопу:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Покладіть аркуш паперу на підлогу біля стіни та станьте на нього пʼятою впритул до стіни.</li>
            <li>Зробіть позначку біля кінчика найдовшого пальця та виміряйте довжину лінійкою.</li>
            <li>Зіставте отримані сантиметри з таблицею. Для комфорту рекомендується обирати розмір із запасом 0.5 см.</li>
          </ol>
        </div>

        {/* Selection Confirmation Action */}
        {selectedSize && (
          <div className="mt-3 pt-2 border-t border-border flex items-center justify-between">
            <div className="text-xs">
              <span className="text-muted">Обраний розмір: </span>
              <span className="font-bold text-primary text-sm">{selectedSize}</span>
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

        <p className="mt-3 text-[11px] text-muted text-center">
          🚚 При отриманні у відділенні Нової Пошти ви завжди маєте можливість оглянути та приміряти взуття перед оплатою.
        </p>
      </div>
    </div>
  );
}
