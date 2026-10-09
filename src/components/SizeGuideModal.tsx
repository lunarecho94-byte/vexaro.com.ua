'use client';

import React from 'react';
import { X } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SIZE_CHART = [
  { eu: '36', cm: '23.0' },
  { eu: '37', cm: '23.5' },
  { eu: '38', cm: '24.0' },
  { eu: '39', cm: '24.5' },
  { eu: '40', cm: '25.0' },
  { eu: '41', cm: '26.0' },
  { eu: '42', cm: '26.5' },
  { eu: '43', cm: '27.5' },
  { eu: '44', cm: '28.0' },
  { eu: '45', cm: '29.0' },
];

export function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold text-foreground">
            Розмірна сітка взуття
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:text-foreground"
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-muted leading-relaxed">
          Виміряйте довжину стопи від пʼяти до кінчика великого пальця в сантиметрах і зіставте з розміром:
        </p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
          <div className="grid grid-cols-2 border-b border-border bg-surface-raised p-2.5 text-xs font-bold text-foreground text-center">
            <span>Розмір (EU)</span>
            <span>Довжина стопи (см)</span>
          </div>

          <div className="divide-y divide-border text-xs">
            {SIZE_CHART.map((row) => (
              <div
                key={row.eu}
                className="grid grid-cols-2 p-2.5 text-center text-muted hover:bg-surface/50"
              >
                <span className="font-semibold text-foreground">{row.eu}</span>
                <span>{row.cm} см</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted">
          При отриманні у відділенні Нової Пошти ви маєте можливість приміряти взуття перед оплатою.
        </p>
      </div>
    </div>
  );
}
