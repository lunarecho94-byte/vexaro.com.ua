'use client';

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Product } from '@/types/product';
import { useFavoritesStore } from '@/lib/favorites-store';

interface FavoriteButtonProps {
  product: Product;
  variant?: 'card' | 'panel' | 'inline';
  className?: string;
  showText?: boolean;
}

export function FavoriteButton({
  product,
  variant = 'card',
  className = '',
  showText = false,
}: FavoriteButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const toggleItem = useFavoritesStore((state) => state.toggleItem);
  const isFav = useFavoritesStore((state) => state.isFavorite(product.id));

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAnimating(true);
    toggleItem(product);

    setTimeout(() => {
      setIsAnimating(false);
    }, 400);
  };

  const active = mounted && isFav;

  if (variant === 'panel') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={active ? 'Видалити з обраного' : 'Додати в обране'}
        className={`flex h-12 items-center justify-center gap-2 rounded-xl border px-4 font-semibold text-xs transition-all active:scale-95 ${
          active
            ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
            : 'border-border bg-surface text-muted hover:border-rose-500/30 hover:text-rose-400'
        } ${className}`}
      >
        <Heart
          className={`h-4 w-4 transition-transform duration-300 ${
            active ? 'fill-rose-500 text-rose-500' : 'text-current'
          } ${isAnimating ? 'scale-130' : ''}`}
        />
        <span>{active ? 'В обраному' : 'В обране'}</span>
      </button>
    );
  }

  // Default: 'card' overlay button
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? 'Видалити з обраного' : 'Додати в обране'}
      title={active ? 'Видалити з обраного' : 'Додати в обране'}
      className={`group/fav flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 ${
        active
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.35)]'
          : 'bg-black/50 text-white/80 hover:bg-black/75 hover:text-rose-400 border border-white/10'
      } ${className}`}
    >
      <Heart
        className={`h-4 w-4 sm:h-4.5 sm:w-4.5 transition-all duration-300 ${
          active
            ? 'fill-rose-500 text-rose-500 scale-110'
            : 'text-current group-hover/fav:scale-115'
        } ${isAnimating ? 'scale-135' : ''}`}
      />
      {showText && (
        <span className="text-xs font-semibold ml-2">
          {active ? 'В обраному' : 'В обране'}
        </span>
      )}
    </button>
  );
}
