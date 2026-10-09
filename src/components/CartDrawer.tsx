'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    getTotalAmount,
  } = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  if (!mounted || !isOpen) return null;

  const totalAmount = getTotalAmount();

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
      <div
        className="fixed inset-0"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-surface shadow-2xl border-l border-border">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Кошик замовлень</h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-surface-raised transition-colors"
            aria-label="Закрити кошик"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body: Items list or Empty */}
        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised border border-border text-muted mb-3">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Ваш кошик порожній
              </h3>
              <p className="text-xs text-muted max-w-xs mb-5">
                Виберіть модель із каталогу та додайте її до замовлення.
              </p>
              <button
                type="button"
                onClick={closeCart}
                className="rounded-lg bg-surface-raised border border-border px-4 py-2 text-xs font-semibold text-foreground hover:border-primary"
              >
                Перейти до каталогу
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {items.map((item) => (
                <div
                  key={`${item.product.id}-${item.size}`}
                  className="flex gap-3 rounded-xl border border-border bg-background p-3"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
                    <Image
                      src={item.product.images[0] || '/placeholder.png'}
                      alt={item.product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.product.id, item.size)}
                          className="text-muted hover:text-rose-500 transition-colors p-1"
                          aria-label="Видалити"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                        <span>Розмір: <b className="text-foreground">{item.size}</b></span>
                        <span>•</span>
                        <span>арт. {item.product.sku}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity switcher */}
                      <div className="flex items-center rounded-lg border border-border bg-surface">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center text-muted hover:text-foreground"
                          aria-label="Зменшити"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                          className="flex h-7 w-7 items-center justify-center text-muted hover:text-foreground"
                          aria-label="Збільшити"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-extrabold text-foreground">
                          {(item.product.price * item.quantity).toLocaleString('uk-UA')} ₴
                        </span>
                        {item.product.oldPrice && (
                          <span className="text-[10px] text-red-500 line-through decoration-red-500 font-semibold">
                            {(item.product.oldPrice * item.quantity).toLocaleString('uk-UA')} ₴
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawer Footer with Total and Checkout Button */}
        {items.length > 0 && (
          <div className="border-t border-border bg-surface-raised p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Доставка (Нова Пошта):</span>
              <span className="text-foreground">За тарифами перевізника</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Разом до сплати:</span>
              <span className="text-lg font-black text-foreground">
                {totalAmount.toLocaleString('uk-UA')} ₴
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
            >
              <span>Оформити замовлення</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="text-center text-[11px] text-muted">
              Оплата після огляду та примірки (накладений платіж)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
