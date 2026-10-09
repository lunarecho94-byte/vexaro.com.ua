import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { Product, CatalogMeta } from '@/types/product';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dataDir = path.join(process.cwd(), 'src', 'data');
  const products = JSON.parse(fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8')) as Product[];
  const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf-8')) as CatalogMeta;
  const baseUrl = 'https://urbangrid.com.ua';

  // In-stock products URLs
  // Rule: "Кількість URL у sitemap.xml дорівнює кількості товарів у продажу"
  const inStockProducts = products.filter((p) => p.inStock);

  const productUrls = inStockProducts.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = meta.categories.map((c) => ({
    url: `${baseUrl}/category/${c.slug}`,
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
