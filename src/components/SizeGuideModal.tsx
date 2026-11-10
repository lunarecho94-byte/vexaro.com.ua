'use client';

import React, { useState, useEffect } from 'react';
import { X, Ruler, Check } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSize?: string;
  gender?: 'men' | 'women' | 'unisex' | string;
}

interface SizeRow {
  eu: string;
  cm: string;
  type: 'women' | 'men' | 'both';
}

const SIZE_CHART: SizeRow[] = [
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
  gender,
}: SizeGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'men' | 'women'>('all');

  useEffect(() => {
    if (gender === 'men') {
      setActiveTab('men');
    } else if (gender === 'women') {
      setActiveTab('women');
    } else {
      setActiveTab('all');
    }
  }, [gender, isOpen]);

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

  const filteredRows = SIZE_CHART.filter((row) => {
    if (activeTab === 'men') return row.type === 'men' || row.type === 'both';
    if (activeTab === 'women') return row.type === 'women' || row.type === 'both';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Розмірна сітка взуття
              </h3>
              <p className="text-[11px] text-muted">
                Стандартна сітка постачальника (довжина устілки)
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

        {/* Gender Filter Tabs */}
        <div className="mt-3.5 flex rounded-xl border border-border bg-surface-raised/60 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              activeTab === 'all'
                ? 'bg-surface text-primary shadow-sm font-bold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Всі розміри (36–46)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('men')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              activeTab === 'men'
                ? 'bg-surface text-primary shadow-sm font-bold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Чоловічі (40–46)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('women')}
            className={`flex-1 rounded-lg py-1.5 transition-all ${
              activeTab === 'women'
                ? 'bg-surface text-primary shadow-sm font-bold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Жіночі (36–41)
          </button>
        </div>

        {/* Size Chart Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background shadow-inner">
          <div className="grid grid-cols-2 border-b border-border bg-surface-raised p-2.5 text-xs font-bold text-foreground text-center">
            <span>Розмір (EU)</span>
            <span>Довжина стопи / устілки</span>
          </div>

          <div className="divide-y divide-border text-xs max-h-72 overflow-y-auto">
            {filteredRows.map((row) => {
              const isSelected = selectedSize && selectedSize.trim() === row.eu;
              return (
                <div
                  key={row.eu}
                  className={`grid grid-cols-2 p-2.5 text-center transition-colors ${
                    isSelected
                      ? 'bg-primary/15 text-primary font-bold border-l-4 border-l-primary'
                      : 'text-muted hover:bg-surface/50'
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

        {/* How to Measure Tip */}
        <div className="mt-4 rounded-xl border border-border bg-surface-raised/40 p-3 text-[11px] text-muted leading-relaxed space-y-1">
          <p className="font-semibold text-foreground">💡 Як правильно виміряти стопу:</p>
          <ol className="list-decimal pl-4 space-y-0.5">
            <li>Покладіть аркуш паперу на підлогу біля стіни та станьте на нього пʼятою впритул до стіни.</li>
            <li>Зробіть позначку біля кінчика найдовшого пальця та виміряйте довжину лінійкою.</li>
            <li>Зіставте отримані сантиметри з таблицею. Для комфорту рекомендується обирати розмір із запасом 0.5 см.</li>
          </ol>
        </div>

        <p className="mt-3 text-[11px] text-muted text-center">
          🚚 При отриманні у відділенні Нової Пошти ви завжди маєте можливість оглянути та приміряти взуття перед оплатою.
        </p>
      </div>
    </div>
  );
}
