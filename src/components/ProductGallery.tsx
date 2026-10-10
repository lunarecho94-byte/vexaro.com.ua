'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const validImages = images.filter((img) => !failedImages[img]);
  const activeImage =
    validImages[activeIdx] ||
    validImages[0] ||
    '/images/shoe-placeholder.svg';

  const handleImageError = (imgUrl: string) => {
    setFailedImages((prev) => ({ ...prev, [imgUrl]: true }));
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main Large Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-surface-raised">
        <Image
          src={activeImage}
          alt={`${productName} — фото ${activeIdx + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover object-center"
          onError={() => handleImageError(activeImage)}
        />
      </div>

      {/* Thumbnails row */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {images.map((img, idx) => {
            if (failedImages[img]) return null;
            return (
              <button
                key={`${img}-${idx}`}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  activeIdx === idx
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border opacity-70 hover:opacity-100'
                }`}
                aria-label={`Переглянути фото ${idx + 1}`}
              >
                <Image
                  src={img}
                  alt={`${productName} мініатюра ${idx + 1}`}
                  fill
                  sizes="72px"
                  loading="lazy"
                  className="object-cover"
                  onError={() => handleImageError(img)}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
