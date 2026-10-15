'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/product';
import { useCartStore } from '@/lib/cart-store';
import { FavoriteButton } from '@/components/FavoriteButton';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [imageIndex, setImageIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  const imagesList = product.images && product.images.length > 0 ? product.images : [];
  const currentImage = !hasError && imagesList[imageIndex] ? imagesList[imageIndex] : '/images/shoe-placeholder.svg';

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Default to the first available size if available
    const chosenSize = product.sizes[0] || 'Універсальний';
    addItem(product, chosenSize);
  };

  const handleCardClick = () => {
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
        {/* Image Area */}
        <div className="relative aspect-square w-full overflow-hidden bg-surface-raised">
          <Image
            src={currentImage}
            alt={product.name}
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
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="rounded bg-rose-500/90 px-2 py-0.5 text-[11px] font-bold text-white uppercase">
                -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
              </span>
            )}
            {!product.inStock && (
              <span className="rounded bg-zinc-800/90 px-2 py-0.5 text-[11px] font-semibold text-zinc-300 uppercase">
                Немає в наявності
              </span>
            )}
          </div>

          {/* Favorite Wishlist Button */}
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton product={product} variant="card" />
          </div>
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
