import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { Product } from '@/types/product';
import { getCatalogMeta } from '@/lib/products';
import { SITE_URL } from '@/lib/config';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const products = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')) as Product[];
  const meta = await getCatalogMeta();
  const baseUrl = SITE_URL;

  // In-stock products URLs
  const inStockProducts = products.filter((p) => p.inStock);

  const productUrls = inStockProducts.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categorySlugs = new Set(['shoes', ...meta.categories.map((c) => c.slug)]);

  const categoryUrls = Array.from(categorySlugs).map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...categoryUrls,
    ...productUrls,
  ];
}
