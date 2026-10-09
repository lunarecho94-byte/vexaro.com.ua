import fs from 'fs';
import path from 'path';
import { Product, CatalogMeta, CatalogQueryParams, CatalogResponse } from '@/types/product';

let allProducts: Product[] | null = null;
let catalogMeta: CatalogMeta | null = null;
const productBySlug = new Map<string, Product>();
const productById = new Map<string, Product>();

function ensureLoaded() {
  if (allProducts) return;

  const dataDir = path.join(process.cwd(), 'src', 'data');
  const prodsRaw = fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8');
  const metaRaw = fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf-8');

  allProducts = JSON.parse(prodsRaw) as Product[];
  catalogMeta = JSON.parse(metaRaw) as CatalogMeta;

  for (const p of allProducts) {
    productBySlug.set(p.slug, p);
    productById.set(p.id, p);
  }
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  ensureLoaded();
  return catalogMeta!;
}

export async function getAllSlugs(): Promise<string[]> {
  ensureLoaded();
  return allProducts!.map((p) => p.slug);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  ensureLoaded();
  return productBySlug.get(slug) || null;
}

export async function getProductById(id: string): Promise<Product | null> {
  ensureLoaded();
  return productById.get(id) || null;
}

export async function getProducts(params: CatalogQueryParams = {}): Promise<CatalogResponse> {
  ensureLoaded();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 24));

  let filtered = allProducts!;

  if (params.category && params.category !== 'all') {
    filtered = filtered.filter((p) => p.categorySlug === params.category);
  }

  if (params.brand && params.brand !== 'all') {
    filtered = filtered.filter((p) => p.brandSlug === params.brand);
  }

  if (params.gender && params.gender !== 'all') {
    filtered = filtered.filter((p) => p.gender === params.gender);
  }

  if (params.season && params.season !== 'all') {
    filtered = filtered.filter((p) => p.season === params.season);
  }

  if (params.size) {
    filtered = filtered.filter((p) => p.sizes.includes(params.size!));
  }

  if (params.minPrice !== undefined && !isNaN(params.minPrice)) {
    filtered = filtered.filter((p) => p.price >= params.minPrice!);
  }

  if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) {
    filtered = filtered.filter((p) => p.price <= params.maxPrice!);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
    );
  }

  // Sorting: default to newest arrivals (highest ID first)
  if (params.sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (params.sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else {
    // 'newest' or default/popular -> latest drops first
    filtered = [...filtered].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const items = filtered.slice(startIndex, startIndex + limit);
  const hasMore = page < totalPages;

  return {
    items,
    total,
    page,
    totalPages,
    limit,
    hasMore,
  };
}
