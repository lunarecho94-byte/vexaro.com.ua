'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Product, ProductVariation } from '@/types/product';
import { useCartStore } from '@/lib/cart-store';
import { ProductGallery } from './ProductGallery';
import { SizeGuideModal } from './SizeGuideModal';
import { FavoriteButton } from './FavoriteButton';
import { ShoppingBag, Ruler, Check, Zap, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import { isHitProduct } from '@/lib/product-badges';

interface ProductDetailViewProps {
  product: Product;
}

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const variations = product.variations && product.variations.length > 0 ? product.variations : [];
  const hasVariations = variations.length > 0;

  // Active variation state
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(() => {
    if (!hasVariations) return null;
    return product.activeVariation || variations[0];
  });

  // Current effective product data derived from active variation or base product
  const currentSku = selectedVariation ? selectedVariation.sku : product.sku;
  const currentPrice = selectedVariation ? selectedVariation.price : product.price;
  const currentOldPrice = selectedVariation ? selectedVariation.oldPrice : product.oldPrice;
  const currentImages =
    selectedVariation && selectedVariation.images && selectedVariation.images.length > 0
      ? selectedVariation.images
      : product.images;
  const currentAvailableSizes = selectedVariation ? selectedVariation.sizes : product.sizes;
  const allSizesList = product.sizes && product.sizes.length > 0 ? product.sizes : currentAvailableSizes;

  // Selected size state (must be available in current variation)
  const [selectedSize, setSelectedSize] = useState<string>(() => {
    return currentAvailableSizes[0] || allSizesList[0] || '';
  });

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // When variation changes, verify if selected size is available in new variation
  const handleSelectVariation = (v: ProductVariation) => {
    setSelectedVariation(v);
    if (!v.sizes.includes(selectedSize)) {
      setSelectedSize(v.sizes[0] || '');
    }
    // Update URL query/path silently without page reload so user can share/bookmark
    if (typeof window !== 'undefined' && v.slug) {
      window.history.replaceState(null, '', `/product/${v.slug}`);
    }
  };

  const displayName = selectedVariation
    ? `${product.name} | ${selectedVariation.color}`
    : product.name;

  const handleAddToCart = () => {
    if (!product.inStock) return;
    const sizeToUse = selectedSize || currentAvailableSizes[0] || 'Універсальний';

    const cartProduct: Product = selectedVariation
      ? {
          ...product,
          id: selectedVariation.id,
          sku: selectedVariation.sku,
          name: `${product.name} | ${selectedVariation.color}`,
          price: selectedVariation.price,
          oldPrice: selectedVariation.oldPrice,
          images: selectedVariation.images,
          sizes: selectedVariation.sizes,
          slug: selectedVariation.slug || product.slug,
        }
      : product;

    addItem(cartProduct, sizeToUse);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1500);
  };

  const handleBuyNow = () => {
    if (!product.inStock) return;
    const sizeToUse = selectedSize || currentAvailableSizes[0] || 'Універсальний';

    const cartProduct: Product = selectedVariation
      ? {
          ...product,
          id: selectedVariation.id,
          sku: selectedVariation.sku,
          name: `${product.name} | ${selectedVariation.color}`,
          price: selectedVariation.price,
          oldPrice: selectedVariation.oldPrice,
          images: selectedVariation.images,
          sizes: selectedVariation.sizes,
          slug: selectedVariation.slug || product.slug,
        }
      : product;

    addItem(cartProduct, sizeToUse);
    router.push('/checkout');
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      {/* Left Column: Gallery */}
      <div>
        <ProductGallery
          key={selectedVariation ? selectedVariation.id : 'default'}
          images={currentImages}
          productName={displayName}
        />
      </div>

      {/* Right Column: Info & Purchase */}
      <div className="flex flex-col">
        {/* Header & SKU */}
        <div className="border-b border-border pb-5">
          <div className="flex items-center justify-between text-xs text-muted mb-1.5">
            <span className="font-bold uppercase tracking-wider text-primary">
              {product.brand}
            </span>
            <span className="font-mono bg-surface border border-border px-2 py-0.5 rounded">
              Артикул: <strong className="text-foreground">{currentSku}</strong>
            </span>
          </div>

          <h1 className="text-xl font-black text-foreground sm:text-2xl leading-snug">
            {product.name}
          </h1>

          {/* Price Box */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black text-foreground sm:text-3xl whitespace-nowrap">
                {currentPrice.toLocaleString('uk-UA')}&nbsp;₴
              </span>
              {currentOldPrice && (
                <span className="text-sm sm:text-base text-red-500 line-through decoration-red-500 font-semibold whitespace-nowrap">
                  {currentOldPrice.toLocaleString('uk-UA')}&nbsp;₴
                </span>
              )}
              {currentOldPrice && currentOldPrice > currentPrice && (
                <span className="shrink-0 whitespace-nowrap rounded bg-rose-500/90 px-2 py-0.5 text-xs font-bold text-white uppercase shadow-sm">
                  -{Math.round(((currentOldPrice - currentPrice) / currentOldPrice) * 100)}%
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isHitProduct(product) && (
                <span className="shrink-0 whitespace-nowrap rounded bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5 text-xs font-bold text-black uppercase shadow-sm flex items-center gap-1">
                  🔥&nbsp;Хіт
                </span>
              )}
              {product.inStock ? (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  В&nbsp;наявності
                </span>
              ) : (
                <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                  Немає в&nbsp;наявності
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Color Variations Selector */}
        {hasVariations && (
          <div className="py-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">
                Колір:{' '}
                <span className="text-foreground font-black">
                  {selectedVariation?.color || 'Оберіть колір'}
                </span>
              </label>
              <span className="text-[11px] font-semibold text-primary">
                {variations.length} кольорів у наявності
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {variations.map((v) => {
                const isSelected = selectedVariation?.id === v.id;
                const thumbImage = v.images[0] || '/images/shoe-placeholder.svg';
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVariation(v)}
                    className={`group relative flex flex-col items-center rounded-xl border p-1.5 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm'
                        : 'border-border bg-surface hover:border-primary/50'
                    }`}
                    title={`${v.color} — ${v.price.toLocaleString('uk-UA')} ₴ (арт. ${v.sku})`}
                    aria-label={`Обрати колір ${v.color}`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white border border-border/60">
                      <Image
                        src={thumbImage}
                        alt={v.color}
                        fill
                        sizes="70px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white shadow-xs">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="mt-1.5 block w-full truncate text-[11px] font-bold text-foreground text-center leading-tight">
                      {v.color}
                    </span>
                    <span className="block text-[10px] font-semibold text-muted text-center">
                      {v.price.toLocaleString('uk-UA')}&nbsp;₴
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size Selector Block */}
        <div className="py-5 border-b border-border">
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
            {allSizesList.map((size) => {
              const isAvailable = currentAvailableSizes.includes(size);
              const isSelected = selectedSize === size && isAvailable;
              return (
                <button
                  key={size}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => {
                    if (isAvailable) setSelectedSize(size);
                  }}
                  className={`flex h-12 flex-col items-center justify-center rounded-xl border text-sm font-bold transition-all ${
                    !isAvailable
                      ? 'border-border/50 bg-surface/40 text-muted/40 cursor-not-allowed line-through'
                      : isSelected
                      ? 'border-primary bg-primary text-white ring-2 ring-primary/30 shadow-sm'
                      : 'border-border bg-surface text-foreground hover:border-primary/50'
                  }`}
                  aria-label={`Розмір ${size} ${!isAvailable ? '(немає в наявності)' : ''}`}
                >
                  <span>{size}</span>
                </button>
              );
            })}
          </div>

          {!currentAvailableSizes.includes(selectedSize) && currentAvailableSizes.length > 0 && (
            <p className="mt-2 text-xs text-amber-500 font-medium">
              Розмір {selectedSize} відсутній для цього кольору. Оберіть доступний розмір.
            </p>
          )}
        </div>

        {/* Main Order Buttons */}
        <div className="flex flex-col gap-3 py-6 border-b border-border">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!product.inStock || !currentAvailableSizes.includes(selectedSize)}
            className="flex h-14 sm:h-16 w-full items-center justify-center gap-3 rounded-2xl bg-primary text-base sm:text-lg font-black uppercase tracking-wider text-white shadow-lg shadow-primary/25 hover:bg-primary-hover hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-40 transition-all"
          >
            {addedAnimation ? (
              <>
                <Check className="h-6 w-6 stroke-[2.5]" />
                <span>Додано до кошика!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="h-6 w-6 stroke-[2.5]" />
                <span>Додати в кошик</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!product.inStock || !currentAvailableSizes.includes(selectedSize)}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-xs font-bold uppercase tracking-wider text-foreground hover:bg-surface-raised active:scale-[0.99] disabled:opacity-40 transition-all"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span>Швидке замовлення</span>
            </button>

            <FavoriteButton product={product} variant="panel" />
          </div>
        </div>

        {/* Specifications Table */}
        <div className="py-6 border-b border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
            Характеристики моделі
          </h2>
          <div className="divide-y divide-border text-xs">
            <div className="flex justify-between py-2">
              <span className="text-muted">Артикул товару:</span>
              <span className="font-semibold text-foreground font-mono">{currentSku}</span>
            </div>
            {selectedVariation && (
              <div className="flex justify-between py-2">
                <span className="text-muted">Колір забарвлення:</span>
                <span className="font-semibold text-foreground">{selectedVariation.color}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-muted">Бренд:</span>
              <span className="font-semibold text-foreground">{product.brand}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Сезон:</span>
              <span className="font-semibold text-foreground">{product.seasonName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Стать:</span>
              <span className="font-semibold text-foreground">{product.genderName}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Матеріал верху:</span>
              <span className="font-semibold text-foreground">{product.material}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Країна-виробник:</span>
              <span className="font-semibold text-foreground">{product.country}</span>
            </div>
          </div>
        </div>

        {/* Delivery & Warranty Guarantees */}
        <div className="pt-6 pb-2 space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
            <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-foreground font-semibold">Доставка Новою Поштою</strong>
              <span className="text-muted">
                Термін 1–2 дні по всій території України. Відправка в день замовлення.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-foreground font-semibold">Оплата при отриманні</strong>
              <span className="text-muted">
                Накладений платіж. Ви оглядаєте та приміряєте взуття у відділенні перед оплатою.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
            <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-foreground font-semibold">Обмін та повернення</strong>
              <span className="text-muted">
                14 днів на обмін розміру або повернення згідно із законодавством України.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 px-3.5 py-3 backdrop-blur-xl sm:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_25px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
          <div className="shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted">Ціна</span>
              {currentOldPrice && (
                <span className="text-[10px] text-red-500 line-through decoration-red-500 font-semibold whitespace-nowrap">
                  {currentOldPrice.toLocaleString('uk-UA')}&nbsp;₴
                </span>
              )}
            </div>
            <div className="text-base sm:text-lg font-black text-foreground whitespace-nowrap">
              {currentPrice.toLocaleString('uk-UA')}&nbsp;₴
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-1 justify-end min-w-0">
            <FavoriteButton product={product} variant="card" className="h-12 w-12 shrink-0" />

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.inStock || !currentAvailableSizes.includes(selectedSize)}
              className="flex-1 min-w-0 h-14 rounded-2xl bg-primary text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-lg shadow-primary/30 hover:bg-primary-hover active:scale-[0.98] flex items-center justify-center gap-2 px-3 transition-all disabled:opacity-40"
            >
              {addedAnimation ? (
                <>
                  <Check className="h-5 w-5 stroke-[2.5]" />
                  <span>Додано!</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-5 w-5 stroke-[2.5]" />
                  <span className="truncate">
                    В кошик {selectedSize ? `(${selectedSize})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        onClose={() => setIsSizeGuideOpen(false)}
        selectedSize={selectedSize}
        onSelectSize={(size) => setSelectedSize(size)}
        product={product}
        gender={product.gender}
      />
    </div>
  );
}
