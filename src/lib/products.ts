import fs from 'fs';
import path from 'path';
import { Product, CatalogMeta, CatalogQueryParams, CatalogResponse } from '@/types/product';

let allProducts: Product[] | null = null;
let catalogMeta: CatalogMeta | null = null;
const productBySlug = new Map<string, Product>();
const productById = new Map<string, Product>();

const EXCLUDED_TAPKI_REGEX =
  /\b(slides?|slippers?|clogs?|mules?|sandals?|flip.?flops?|adimule|tazz|tasman|funkette|disquette|tazzlita|lanah|goldenstar|crocs|thongs?|sabot|adilette|chypre|dway|tippi|birkenstock)\b|triomphe.*mule|summer charms|тапк|тапочк|шльоп|шлеп|сланц|сланец|босоніж|босонож|вьетнамк|в'єтнамк|сабо|пантоф|лофер|loafer/i;

function ensureLoaded() {
  if (allProducts) return;

  const dataDir = path.join(process.cwd(), 'src', 'data');
  const prodsRaw = fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8');
  const metaRaw = fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf-8');

  const rawProducts = JSON.parse(prodsRaw) as Product[];
  allProducts = rawProducts.filter((p) => !EXCLUDED_TAPKI_REGEX.test(p.name));
  catalogMeta = JSON.parse(metaRaw) as CatalogMeta;

  for (const p of allProducts) {
    productBySlug.set(p.slug, p);
    productById.set(p.id, p);
    if (p.id === '254776') {
      productBySlug.set('nike-air-max-plus-tn-black-teal-yellow-dh4776-001', p);
    }
    if (p.id === '146368') {
      productBySlug.set('nike-air-max-plus-tn-lace-toggle-white-black-fd0799-001', p);
      productBySlug.set('nike-air-max-plus-tn-lace-toggle-white-black', p);
    }
  }
}

export function matchesCategory(p: Product, categorySlug: string): boolean {
  const cat = categorySlug.toLowerCase();
  if (cat === 'all' || cat === 'shoes') return true;

  const n = p.name.toLowerCase();
  const isWinter =
    p.season === 'winter' ||
    n.includes('ugg') ||
    n.includes('чобот') ||
    n.includes('ботинк') ||
    n.includes('boot') ||
    n.includes('fur');

  const isKedy =
    !isWinter &&
    (n.includes('kedy') ||
      n.includes('кед') ||
      n.includes('samba') ||
      n.includes('gazelle') ||
      n.includes('spezial') ||
      n.includes('converse') ||
      n.includes('vans') ||
      n.includes('all star') ||
      n.includes('sk8'));

  if (cat === 'winter' || cat === 'boots') {
    return isWinter;
  }
  if (cat === 'kedy') {
    return isKedy;
  }
  if (cat === 'sneakers') {
    return !isWinter && !isKedy;
  }
  if (cat === 'men') {
    return p.gender === 'men' || p.gender === 'unisex';
  }
  if (cat === 'women') {
    return p.gender === 'women' || p.gender === 'unisex';
  }
  if (cat === 'unisex') {
    return p.gender === 'unisex';
  }

  return p.categorySlug === categorySlug;
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  ensureLoaded();
  const prods = allProducts!;
  const enrichedCategories = [
    {
      name: 'Кросівки',
      slug: 'sneakers',
      count: prods.filter((p) => matchesCategory(p, 'sneakers')).length,
    },
    {
      name: 'Зимове взуття',
      slug: 'winter',
      count: prods.filter((p) => matchesCategory(p, 'winter')).length,
    },
    {
      name: 'Кеди',
      slug: 'kedy',
      count: prods.filter((p) => matchesCategory(p, 'kedy')).length,
    },
  ];

  const enrichedGenders = [
    {
      name: 'Чоловічі',
      slug: 'men',
      count: prods.filter((p) => p.gender === 'men' || p.gender === 'unisex').length,
    },
    {
      name: 'Жіночі',
      slug: 'women',
      count: prods.filter((p) => p.gender === 'women' || p.gender === 'unisex').length,
    },
    {
      name: 'Унісекс',
      slug: 'unisex',
      count: prods.filter((p) => p.gender === 'unisex').length,
    },
  ];

  return {
    ...catalogMeta!,
    categories: enrichedCategories,
    genders: enrichedGenders,
  };
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

export function getProductPriority(product: { id: string; name: string }): number {
  const n = product.name.toLowerCase();
  if (n.includes('frank rudy') || String(product.id) === '122263') {
    return 4;
  }
  if (n.includes('black teal yellow') || String(product.id) === '254776') {
    return 3;
  }
  if (n.includes('lace toggle') || String(product.id) === '146368') {
    return 2;
  }
  if (!n.includes('nike')) return 0;
  if (n.includes('surplus') || n.includes('homme plus')) return 0;
  if (
    n.includes('air max plus') ||
    n.includes('air max tn') ||
    (n.includes('air max') && n.includes('plus'))
  ) {
    return 1;
  }
  return 0;
}

export async function getProducts(params: CatalogQueryParams = {}): Promise<CatalogResponse> {
  ensureLoaded();
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(params.limit) || 24));

  let filtered = allProducts!;

  if (params.category && params.category !== 'all') {
    const cats = params.category.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
    if (cats.length > 0) {
      filtered = filtered.filter((p) => cats.some((cat) => matchesCategory(p, cat)));
    }
  }

  if (params.brand && params.brand !== 'all') {
    const brands = params.brand.split(',').map((b) => b.trim().toLowerCase()).filter(Boolean);
    if (brands.length > 0) {
      filtered = filtered.filter((p) => brands.includes(p.brandSlug.toLowerCase()));
    }
  }

  if (params.gender && params.gender !== 'all') {
    const genders = params.gender.split(',').map((g) => g.trim().toLowerCase()).filter(Boolean);
    if (genders.length > 0) {
      filtered = filtered.filter((p) => {
        if (genders.includes('men') && (p.gender === 'men' || p.gender === 'unisex')) return true;
        if (genders.includes('women') && (p.gender === 'women' || p.gender === 'unisex')) return true;
        if (genders.includes('unisex') && p.gender === 'unisex') return true;
        return genders.includes(p.gender.toLowerCase());
      });
    }
  }

  if (params.season && params.season !== 'all') {
    const seasons = params.season.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (seasons.length > 0) {
      filtered = filtered.filter((p) => seasons.includes(p.season.toLowerCase()));
    }
  }

  if (params.size && params.size !== 'all') {
    const sizes = params.size.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (sizes.length > 0) {
      filtered = filtered.filter((p) =>
        p.sizes.some((sz) => sizes.includes(sz.trim().toLowerCase()))
      );
    }
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

  // Sorting: default to newest arrivals (newest items first)
  if (params.sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (params.sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else {
    // 'newest' (default) or 'popular' -> newest drops first by ID descending
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
