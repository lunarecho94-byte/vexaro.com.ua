'use client';

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Local static assets (like /images/vexaro-emblem.png) load directly
  if (!src || !src.startsWith('http')) {
    return src;
  }

  const q = quality || 80;
  // Cloudflare-backed global CDN image optimization
  // Compresses 2.1MB raw supplier JPEGs down to ~18-25KB modern WebP
  return `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&q=${q}&output=webp`;
}
