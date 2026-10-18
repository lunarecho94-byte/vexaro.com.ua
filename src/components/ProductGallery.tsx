'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Touch gesture state for swipe
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const validImages = images.filter((img) => !failedImages[img]);
  const total = validImages.length;
  const currentImage = validImages[activeIdx] || validImages[0] || '/images/shoe-placeholder.svg';

  const handleImageError = (imgUrl: string) => {
    setFailedImages((prev) => ({ ...prev, [imgUrl]: true }));
  };

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setActiveIdx((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setActiveIdx((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  // Keyboard navigation (Arrow keys + Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext, isLightboxOpen]);

  // Touch swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchEndX - touchStartXRef.current;

    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Main Large Image Box */}
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-[#18181b] select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Image
          src={currentImage}
          alt={`${productName} — фото ${activeIdx + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
          onClick={() => setIsLightboxOpen(true)}
          onError={() => handleImageError(currentImage)}
        />

        {/* Counter Badge */}
        {total > 1 && (
          <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/90 border border-zinc-200/80 backdrop-blur-md px-2.5 py-1 text-xs font-mono font-bold text-zinc-700 shadow-sm pointer-events-none">
            {activeIdx + 1} / {total}
          </div>
        )}

        {/* Fullscreen Zoom trigger button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-zinc-800 border border-zinc-200/80 backdrop-blur-md hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-md"
          title="Відкрити фото на весь екран"
          aria-label="Збільшити фото"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {/* Previous Image Arrow */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            aria-label="Попереднє фото"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 border border-zinc-200/80 backdrop-blur-md hover:bg-white hover:scale-110 active:scale-90 transition-all shadow-md opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Next Image Arrow */}
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            aria-label="Наступне фото"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 border border-zinc-200/80 backdrop-blur-md hover:bg-white hover:scale-110 active:scale-90 transition-all shadow-md opacity-80 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Bottom indicator dots for mobile */}
        {total > 1 && (
          <div className="absolute bottom-3 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none sm:hidden">
            {validImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeIdx === idx
                    ? 'w-5 bg-primary shadow'
                    : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {total > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
          {validImages.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-[#18181b] transition-all ${
                activeIdx === idx
                  ? 'border-primary ring-2 ring-primary/40 scale-[1.02]'
                  : 'border-border/80 opacity-70 hover:opacity-100 hover:border-border'
              }`}
              aria-label={`Переглянути фото ${idx + 1}`}
            >
              <Image
                src={img}
                alt={`${productName} мініатюра ${idx + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                onError={() => handleImageError(img)}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-lg p-4 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar with Counter and Close Button */}
          <div
            className="absolute top-4 inset-x-4 sm:inset-x-8 flex items-center justify-between z-20 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-lg bg-white/10 px-3 py-1.5 text-xs sm:text-sm font-mono font-bold backdrop-blur-md">
              {activeIdx + 1} / {total}
            </div>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
              aria-label="Закрити перегляд"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Large Image in Lightbox */}
          <div
            className="relative flex-1 w-full max-w-4xl max-h-[80vh] flex items-center justify-center select-none my-auto"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="relative w-full h-full max-h-[75vh] aspect-square">
              <Image
                src={currentImage}
                alt={`${productName} — збільшене фото ${activeIdx + 1}`}
                fill
                sizes="(max-width: 1200px) 100vw, 1200px"
                className="object-contain"
              />
            </div>

            {/* Modal Prev Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Попереднє фото"
                className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 active:scale-90 transition-all backdrop-blur-md"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Modal Next Button */}
            {total > 1 && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="Наступне фото"
                className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30 active:scale-90 transition-all backdrop-blur-md"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails in Modal */}
          {total > 1 && (
            <div
              className="flex gap-2 overflow-x-auto max-w-xl py-2 px-4 z-20 scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              {validImages.map((img, idx) => (
                <button
                  key={`modal-${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                    activeIdx === idx
                      ? 'border-primary ring-2 ring-primary/50 scale-105'
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="56px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
