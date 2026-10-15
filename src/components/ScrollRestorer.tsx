'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const THROTTLE_MS = 100;

export function ScrollRestorer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastScrollTime = useRef(0);
  const restoreAttemptRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isCatalogPage = pathname === '/' || pathname.startsWith('/category/');
    const isProductPage = pathname.startsWith('/product/');

    // When on product page, mark that we are viewing a product
    if (isProductPage) {
      sessionStorage.setItem('vexaro_from_product', '1');
      return;
    }

    if (!isCatalogPage) {
      return;
    }

    // We are on a catalog page (home or category)
    const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    const shouldRestore = sessionStorage.getItem('vexaro_restore_scroll') === 'true';
    const savedYStr =
      sessionStorage.getItem(`vexaro_scroll_${currentUrl}`) ||
      sessionStorage.getItem('vexaro_last_scroll_y');
    const savedSlug = sessionStorage.getItem('vexaro_last_product_slug');

    if (shouldRestore && savedYStr) {
      const targetY = parseInt(savedYStr, 10);

      if (!isNaN(targetY) && targetY > 0) {
        // Prevent browser's premature scroll restoration
        if ('scrollRestoration' in window.history) {
          window.history.scrollRestoration = 'manual';
        }

        let userInteracted = false;
        const markInteracted = () => {
          userInteracted = true;
          if (restoreAttemptRef.current) {
            clearInterval(restoreAttemptRef.current);
            restoreAttemptRef.current = null;
          }
          cleanupInteractionListeners();
        };

        const cleanupInteractionListeners = () => {
          window.removeEventListener('wheel', markInteracted);
          window.removeEventListener('touchstart', markInteracted);
          window.removeEventListener('pointerdown', markInteracted);
          window.removeEventListener('keydown', onKeyDown);
        };

        const onKeyDown = (e: KeyboardEvent) => {
          if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space'].includes(e.code)) {
            markInteracted();
          }
        };

        window.addEventListener('wheel', markInteracted, { passive: true, once: true });
        window.addEventListener('touchstart', markInteracted, { passive: true, once: true });
        window.addEventListener('pointerdown', markInteracted, { passive: true, once: true });
        window.addEventListener('keydown', onKeyDown, { passive: true });

        // Initial instant attempt
        window.scrollTo({ top: targetY, behavior: 'instant' });

        let attempts = 0;
        const maxAttempts = 30; // 30 * 50ms = 1.5 seconds

        restoreAttemptRef.current = setInterval(() => {
          if (userInteracted || attempts >= maxAttempts) {
            if (restoreAttemptRef.current) {
              clearInterval(restoreAttemptRef.current);
              restoreAttemptRef.current = null;
            }
            sessionStorage.removeItem('vexaro_restore_scroll');
            cleanupInteractionListeners();
            return;
          }

          attempts++;

          // Check if the specific product element is in the DOM for anchor alignment
          let desiredY = targetY;
          if (savedSlug) {
            const el = document.getElementById(`product-${savedSlug}`);
            if (el) {
              const rect = el.getBoundingClientRect();
              const absoluteTop = window.scrollY + rect.top;
              // Align with ~80px breathing space below the header
              desiredY = Math.max(0, absoluteTop - 80);
            }
          }

          const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

          if (maxScroll >= desiredY - 40) {
            window.scrollTo({ top: desiredY, behavior: 'instant' });

            // If we've successfully reached within 20px of target, finalize
            if (Math.abs(window.scrollY - desiredY) <= 20) {
              if (restoreAttemptRef.current) {
                clearInterval(restoreAttemptRef.current);
                restoreAttemptRef.current = null;
              }
              sessionStorage.removeItem('vexaro_restore_scroll');
              cleanupInteractionListeners();
            }
          } else if (maxScroll > 0) {
            // Scroll as far as currently possible while content loads
            window.scrollTo({ top: maxScroll, behavior: 'instant' });
          }
        }, 50);
      } else {
        sessionStorage.removeItem('vexaro_restore_scroll');
      }
    }

    // Passive scroll listener to continuously keep the scroll coordinate updated
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current < THROTTLE_MS) return;
      lastScrollTime.current = now;

      const y = window.scrollY;
      const url = window.location.pathname + window.location.search;
      sessionStorage.setItem(`vexaro_scroll_${url}`, y.toString());
      sessionStorage.setItem('vexaro_last_catalog_url', url);
      sessionStorage.setItem('vexaro_last_scroll_y', y.toString());
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (restoreAttemptRef.current) {
        clearInterval(restoreAttemptRef.current);
        restoreAttemptRef.current = null;
      }
    };
  }, [pathname, searchParams]);

  return null;
}
