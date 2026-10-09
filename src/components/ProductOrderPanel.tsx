'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { useCartStore } from '@/lib/cart-store';
import { ShoppingBag, Ruler, Check, Zap } from 'lucide-react';
import { SizeGuideModal } from './SizeGuideModal';

interface ProductOrderPanelProps {
  product: Product;
}

export function ProductOrderPanel({ product }: ProductOrderPanelProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] || '');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  const handleAddToCart = () => {
    if (!product.inStock) return;
    const sizeToUse = selectedSize || product.sizes[0] || 'Універсальний';
    addItem(product, sizeToUse);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product.inStock) return;
    const sizeToUse = selectedSize || product.sizes[0] || 'Універсальний';
    addItem(product, sizeToUse);
    router.push('/checkout');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Size Selector Block */}
      {product.sizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted">
              Виберіть розмір (EU)
            </label>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>Таблиця розмірів</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {product.sizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-background ring-2 ring-primary/30'
                      : 'border-border bg-surface text-foreground hover:border-primary/50'
                  }`}
                  aria-label={`Розмір ${size}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Order Buttons */}
      <div className="flex flex-col gap-2.5 pt-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!product.inStock}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover disabled:opacity-40 transition-colors"
        >
          {addedAnimation ? (
            <>
              <Check className="h-5 w-5" />
              <span>Додано до кошика!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="h-5 w-5" />
              <span>Додати в кошик</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!product.inStock}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-raised disabled:opacity-40 transition-colors"
        >
          <Zap className="h-4 w-4 text-primary" />
          <span>Швидке замовлення</span>
        </button>
      </div>

      {/* Mobile Sticky Bottom Bar (appears on small screens) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 p-3.5 backdrop-blur-lg sm:hidden">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div>
            <div className="text-[11px] text-muted">Ціна товару</div>
            <div className="text-base font-black text-foreground">
              {product.price.toLocaleString('uk-UA')} ₴
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className="flex-1 h-12 rounded-xl bg-primary text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover flex items-center justify-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>В кошик {selectedSize ? `(${selectedSize})` : ''}</span>
          </button>
        </div>
      </div>

      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
      />
    </div>
  );
}
