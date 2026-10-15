'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith('/product/');

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 350) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Повернутися нагору"
      title="Повернутися нагору"
      className={`group fixed right-4 sm:right-8 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border bg-surface/90 text-foreground backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 hover:border-primary/60 hover:text-primary hover:bg-surface hover:shadow-xl active:scale-95 ${
        isProductPage ? 'bottom-24 sm:bottom-8' : 'bottom-6 sm:bottom-8'
      } ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <ArrowUp className="h-5 w-5 stroke-[2.25] transition-transform duration-200 group-hover:-translate-y-0.5" />
    </button>
  );
}
