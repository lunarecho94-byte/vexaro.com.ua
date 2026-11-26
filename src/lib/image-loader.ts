'use client';

export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Load local assets and supplier Cloudflare CDN images directly (avoids wsrv.nl cold-cache stalls)
  return src;
}
