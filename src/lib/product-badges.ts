/**
 * VEXARO — Bestseller & Badge Helpers
 * Flagship bestselling models:
 * - New Balance 9060
 * - UGG
 * - New Balance 1906
 * - Nike Air Force
 * - Salomon XT-6
 * - Adidas Campus 00s
 */

export function isHitProduct(product: {
  name: string;
  brandSlug?: string;
  brand?: string;
  isHit?: boolean;
}): boolean {
  if (product.isHit) return true;
  const n = (product.name || '').toLowerCase();
  const b = (product.brandSlug || product.brand || '').toLowerCase();

  // 1. New Balance 9060
  if (n.includes('9060')) return true;

  // 2. UGG
  if (b === 'ugg' || /\b(ugg|угг)\b/.test(n)) return true;

  // 3. New Balance 1906 (1906, 1906r, 1906a, 1906d)
  if (n.includes('1906')) return true;

  // 4. Nike Air Force (Air Force, Air Force 1, etc.)
  if (/air\s*force/.test(n)) return true;

  // 5. Salomon XT-6 (xt-6, xt 6, xt6)
  if (/xt[- ]*6/.test(n)) return true;

  // 6. Adidas Campus 00s (Campus, Campus 00s)
  if (n.includes('campus')) return true;

  return false;
}
