'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCartStore } from '@/lib/cart-store';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [imageIndex, setImageIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Touch swipe support for mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isSwipingRef = useRef(false);

  const imagesList = product.images && product.images.length > 0 ? product.images : [];
  const totalImages = imagesList.length;
  const currentImage =
    !hasError && imagesList[imageIndex] ? imagesList[imageIndex] : '/images/shoe-placeholder.svg';

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages <= 1) return;
    setImageIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (totalImages <= 1) return;
    setImageIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (totalImages <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || totalImages <= 1) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = e.touches[0].clientY - touchStartYRef.current;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      isSwipingRef.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || totalImages <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;

    if (Math.abs(diffX) > 35) {
      if (diffX > 0) {
        // Swiped right -> prev image
        setImageIndex((prev) => (prev > 0 ? prev - 1 : totalImages - 1));
      } else {
        // Swiped left -> next image
        setImageIndex((prev) => (prev < totalImages - 1 ? prev + 1 : 0));
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 100);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Default to the first available size if available
    const chosenSize = product.sizes[0] || 'Універсальний';
    addItem(product, chosenSize);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSwipingRef.current) {
      e.preventDefault();
      return;
    }
    if (typeof window !== 'undefined') {
      const currentUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('vexaro_last_catalog_url', currentUrl);
      sessionStorage.setItem(`vexaro_scroll_${currentUrl}`, window.scrollY.toString());
      sessionStorage.setItem('vexaro_last_scroll_y', window.scrollY.toString());
      sessionStorage.setItem('vexaro_last_product_slug', product.slug);
      sessionStorage.setItem('vexaro_from_product', '1');
      sessionStorage.setItem('vexaro_restore_scroll', 'true');
    }
  };

  return (
    <article
      id={`product-${product.slug}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-surface hover:border-primary/50 transition-colors"
    >
      <Link
        href={`/product/${product.slug}`}
        onClick={handleCardClick}
        className="flex flex-col flex-1"
      >
        {/* Image Area with Gallery Controls */}
        <div
          className="relative aspect-square w-full overflow-hidden bg-surface-raised select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={currentImage}
            alt={`${product.name} — фото ${imageIndex + 1}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            onError={() => {
              if (imageIndex + 1 < imagesList.length) {
                setImageIndex(imageIndex + 1);
              } else {
                setHasError(true);
              }
            }}
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 pointer-events-none">
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="rounded bg-rose-500/90 px-2 py-0.5 text-[11px] font-bold text-white uppercase shadow-sm">
                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
              </span>
            )}
            {!product.inStock && (
              <span className="rounded bg-zinc-800/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-300 uppercase shadow-sm">
                Немає в наявності
              </span>
            )}
          </div>

          {/* Favorite Wishlist Button */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton product={product} variant="card" />
          </div>

          {/* Carousel Arrow Controls (if multiple photos) */}
          {totalImages > 1 && (
            <>
              {/* Previous photo button */}
              <button
                type="button"
                onClick={handlePrevImage}
                aria-label="Попереднє фото товару"
                className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Next photo button */}
              <button
                type="button"
                onClick={handleNextImage}
                aria-label="Наступне фото товару"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 active:scale-95 transition-all shadow-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              {/* Photo Indicator Dots */}
              <div className="absolute bottom-2 inset-x-0 z-20 flex items-center justify-center gap-1 px-3 pointer-events-none">
                {imagesList.slice(0, 6).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-200 ${
                      imageIndex === idx
                        ? 'w-3.5 bg-primary shadow-sm'
                        : 'w-1 bg-white/40'
                    }`}
                  />
                ))}
                {totalImages > 6 && (
                  <span className="text-[9px] font-bold text-white/80 ml-0.5 drop-shadow">
                    +{totalImages - 6}
                  </span>
                )}
              </div>

              {/* Photo Counter Pill */}
              <div className="absolute bottom-2 right-2 z-10 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white/90 backdrop-blur-sm pointer-events-none">
                {imageIndex + 1}/{totalImages}
              </div>
            </>
          )}
        </div>

        {/* Content Info */}
        <div className="flex flex-col p-3.5 flex-1 justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-muted mb-1">
              <span className="font-semibold uppercase tracking-wider">{product.brand}</span>
              <span className="font-mono text-[11px]">арт. {product.sku}</span>
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
              {product.name}
            </h3>
          </div>

          <div className="mt-3">
            {/* Sizes preview */}
            {product.sizes.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1">
                {product.sizes.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted font-medium"
                  >
                    {s}
                  </span>
                ))}
                {product.sizes.length > 4 && (
                  <span className="text-[10px] text-muted self-center">
                    +{product.sizes.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Price block */}
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold text-foreground">
                {product.price.toLocaleString('uk-UA')} ₴
              </span>
              {product.oldPrice && (
                <span className="text-xs text-red-500 line-through decoration-red-500 font-semibold">
                  {product.oldPrice.toLocaleString('uk-UA')} ₴
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Action Button */}
      <div className="p-3.5 pt-0">
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!product.inStock}
          className="w-full h-12 rounded-xl bg-surface-raised border border-border text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground hover:bg-primary hover:text-background hover:border-primary disabled:opacity-40 disabled:hover:bg-surface-raised disabled:hover:text-foreground transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
        >
          {product.inStock ? 'В кошик' : 'Немає в наявності'}
        </button>
      </div>
    </article>
  );
}
