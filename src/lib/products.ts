import fs from 'fs';
import path from 'path';
import { Product, CatalogMeta, CatalogQueryParams, CatalogResponse } from '@/types/product';
import { isHitProduct } from './product-badges';

export { isHitProduct };

let allProducts: Product[] | null = null;
let catalogMeta: CatalogMeta | null = null;
const productBySlug = new Map<string, Product>();
const productById = new Map<string, Product>();

const EXCLUDED_TAPKI_REGEX =
  /\b(slides?|slippers?|clogs?|mules?|sandals?|flip.?flops?|adimule|tazz|tasman|funkette|disquette|tazzlita|lanah|goldenstar|crocs|thongs?|sabot|adilette|chypre|dway|tippi|birkenstock)\b|triomphe.*mule|summer charms|тапк|тапочк|шльоп|шлеп|сланц|сланец|босоніж|босонож|вьетнамк|в'єтнамк|сабо|пантоф|лофер|loafer/i;

const EXCLUDED_SKUS = new Set([
  '16006',
  '16005',
  '16004',
  '16003',
  'NB143',
  '0068',
  '2688',
  'R343',
  'SL015',
  '258739',
  '2263',
  '2169',
]);

const FEMALE_REGEX =
  /\b(pink|rose|pearl|glitter|sparkle|strawberry|бантик|пудр|розов|ніжн|fuchsia|magenta|lilac|бузков|лаванд|lavender|violet|women|жіноч|floral|heart|pastel|sakura|платформ|platform|mary jane|каблук|балетк)\b/i;

const EXPLICIT_MALE_REGEX =
  /\b(men|чоловіч|мужск|хлопц|для нього|black cat)\b/i;

const MALE_SILHOUETTE_REGEX =
  /\b(camo|tactical|тактич|cordura|military|мілітарі|cement|gore-tex|gtx|freehiker|terrex|initiator|kaws|monarch|air max plus|air max tn|tn|shox|acg|balenciaga runner|balenciaga track|dior b22|lv skate|b22 black|b22 sneaker|travis|phantom|dark iris|canyon purple|triple black)\b/i;

export function getNumericSizes(p: Product): number[] {
  return p.sizes
    .map((s) => parseFloat(s.replace(',', '.')))
    .filter((s) => !isNaN(s))
    .sort((a, b) => a - b);
}

export function isRealisticMen(p: Product): boolean {
  const sizes = getNumericSizes(p);
  const minSize = sizes.length > 0 ? sizes[0] : 0;
  const maxSize = sizes.length > 0 ? sizes[sizes.length - 1] : 0;

  // If a shoe only has men's sizes 41+, it is definitely men's footwear
  if (minSize >= 41) return true;

  if (p.gender === 'women') return false;
  if (FEMALE_REGEX.test(p.name)) return false;
  if (
    /\bugg\b/i.test(p.name) &&
    /\b(mini|ultra mini|platform|lowmel|tazz|tasman)\b/i.test(p.name) &&
    !EXPLICIT_MALE_REGEX.test(p.name)
  ) {
    return false;
  }

  if (p.gender === 'men') return true;
  if (p.gender === 'unisex') {
    if (maxSize >= 42) return true;
    if (minSize >= 40 && maxSize >= 41) return true;
  }
  return false;
}

export function isRealisticWomen(p: Product): boolean {
  if (p.gender === 'men') return false;
  if (EXPLICIT_MALE_REGEX.test(p.name)) return false;

  const sizes = getNumericSizes(p);
  const minSize = sizes.length > 0 ? sizes[0] : 0;
  const maxSize = sizes.length > 0 ? sizes[sizes.length - 1] : 0;

  // Products with only sizes 41+ are men's runs, never women's footwear
  if (minSize >= 41) return false;

  const isFemale = FEMALE_REGEX.test(p.name);
  if (isFemale && minSize > 0 && minSize <= 40) return true;

  if (MALE_SILHOUETTE_REGEX.test(p.name)) return false;

  // Real women footwear without explicit female styling does not span into men's sizes 43-46
  if (maxSize >= 43) return false;

  if (p.gender === 'women') return true;

  if (p.gender === 'unisex') {
    // Only unisex models that fit female size ranges (stops at 40 or 41)
    if (minSize > 0 && minSize <= 40 && maxSize <= 41) {
      return true;
    }
  }
  return false;
}

export function isRealisticUnisex(p: Product): boolean {
  if (p.gender !== 'unisex') return false;
  if (FEMALE_REGEX.test(p.name) || EXPLICIT_MALE_REGEX.test(p.name)) return false;
  const sizes = getNumericSizes(p);
  if (sizes.length === 0) return false;
  return sizes[0] <= 39 && sizes[sizes.length - 1] >= 42;
}

function ensureLoaded() {
  if (allProducts) return;

  const dataDir = path.join(process.cwd(), 'src', 'data');
  const prodsRaw = fs.readFileSync(path.join(dataDir, 'products.json'), 'utf-8');
  const metaRaw = fs.readFileSync(path.join(dataDir, 'meta.json'), 'utf-8');

  const rawProducts = JSON.parse(prodsRaw) as Product[];
  allProducts = rawProducts.filter(
    (p) =>
      !EXCLUDED_TAPKI_REGEX.test(p.name) &&
      !EXCLUDED_SKUS.has((p.sku || '').trim().toUpperCase()) &&
      !EXCLUDED_SKUS.has((p.id || '').trim())
  );
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

  if (cat === 'men') {
    return isRealisticMen(p);
  }
  if (cat === 'women') {
    return isRealisticWomen(p);
  }
  if (cat === 'unisex') {
    return isRealisticUnisex(p);
  }

  if (cat === 'winter' || cat === 'boots') {
    return p.season === 'winter';
  }

  const n = p.name.toLowerCase();
  const isKedy =
    p.season !== 'winter' &&
    (n.includes('kedy') ||
      n.includes('кед') ||
      n.includes('samba') ||
      n.includes('gazelle') ||
      n.includes('spezial') ||
      n.includes('converse') ||
      n.includes('vans') ||
      n.includes('all star') ||
      n.includes('sk8'));

  if (cat === 'kedy') {
    return isKedy;
  }
  if (cat === 'sneakers') {
    return p.season !== 'winter' && !isKedy;
  }

  return p.categorySlug === categorySlug;
}

export async function getCatalogMeta(): Promise<CatalogMeta> {
  ensureLoaded();
  const prods = allProducts!;
  const enrichedCategories = [
    {
      name: 'Чоловіче взуття',
      slug: 'men',
      count: prods.filter(isRealisticMen).length,
    },
    {
      name: 'Жіноче взуття',
      slug: 'women',
      count: prods.filter(isRealisticWomen).length,
    },
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
      count: prods.filter(isRealisticMen).length,
    },
    {
      name: 'Жіночі',
      slug: 'women',
      count: prods.filter(isRealisticWomen).length,
    },
    {
      name: 'Унісекс',
      slug: 'unisex',
      count: prods.filter(isRealisticUnisex).length,
    },
  ];

  const enrichedSeasons = [
    {
      name: 'Демісезон',
      slug: 'demi',
      count: prods.filter((p) => p.season === 'demi').length,
    },
    {
      name: 'Зима',
      slug: 'winter',
      count: prods.filter((p) => p.season === 'winter').length,
    },
  ];

  return {
    ...catalogMeta!,
    categories: enrichedCategories,
    genders: enrichedGenders,
    seasons: enrichedSeasons,
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

export function getProductPriority(product: { id: string; name: string; brandSlug?: string; brand?: string; isHit?: boolean }): number {
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
  if (isHitProduct(product)) {
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
      const genderCats = cats.filter((c) => c === 'men' || c === 'women' || c === 'unisex');
      const typeCats = cats.filter((c) => c !== 'men' && c !== 'women' && c !== 'unisex');

      if (genderCats.length > 0) {
        filtered = filtered.filter((p) => genderCats.some((c) => matchesCategory(p, c)));
      }
      if (typeCats.length > 0) {
        filtered = filtered.filter((p) => typeCats.some((c) => matchesCategory(p, c)));
      }
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
        if (genders.includes('men') && isRealisticMen(p)) return true;
        if (genders.includes('women') && isRealisticWomen(p)) return true;
        if (genders.includes('unisex') && isRealisticUnisex(p)) return true;
        return false;
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
    const qNorm = q.replace(/а/g, 'a').replace(/е/g, 'e').replace(/с/g, 'c').replace(/о/g, 'o').replace(/р/g, 'p').replace(/х/g, 'x');
    filtered = filtered.filter((p) => {
      const sku = p.sku.toLowerCase();
      const skuNorm = sku.replace(/а/g, 'a').replace(/е/g, 'e').replace(/с/g, 'c').replace(/о/g, 'o').replace(/р/g, 'p').replace(/х/g, 'x');
      return (
        p.name.toLowerCase().includes(q) ||
        sku.includes(q) ||
        skuNorm.includes(qNorm) ||
        p.brand.toLowerCase().includes(q)
      );
    });
  }

  if (params.bestseller) {
    const b = params.bestseller.toLowerCase().trim();
    if (b === 'all' || b === 'true') {
      filtered = filtered.filter((p) => isHitProduct(p));
    } else if (b === '9060') {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes('9060'));
    } else if (b === 'ugg') {
      filtered = filtered.filter((p) => p.brandSlug.toLowerCase() === 'ugg' || /\b(ugg|угг)\b/i.test(p.name));
    } else if (b === '1906') {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes('1906'));
    } else if (b === 'airforce' || b === 'air-force') {
      filtered = filtered.filter((p) => /air\s*force/i.test(p.name));
    } else if (b === 'xt6' || b === 'xt-6') {
      filtered = filtered.filter((p) => /xt[- ]*6/i.test(p.name));
    } else if (b === 'campus') {
      filtered = filtered.filter((p) => p.name.toLowerCase().includes('campus'));
    }
  }

  // Pinned products permanently pinned at top by store owner request (supports 'id:...' or SKU)
  const PINNED_KEYS: string[] = ['KS 2868', 'KS2868', '2868', 'PM09', 'PM10', 'PM11', 'PM12', 'A6201'];
  const matchPin = (key: string, p: Product) => {
    if (key.startsWith('id:')) {
      return (p.id || '').trim() === key.slice(3).trim();
    }
    const target = (key.startsWith('sku:') ? key.slice(4) : key).trim().toUpperCase();
    const sku = (p.sku || '').trim().toUpperCase();
    return (
      sku === target ||
      sku.replace(/\s+/g, '') === target.replace(/\s+/g, '') ||
      (p.id || '').trim() === target
    );
  };
  const getPinRank = (p: Product) => {
    const idx = PINNED_KEYS.findIndex((k) => matchPin(k, p));
    return idx >= 0 ? PINNED_KEYS.length - idx : 0;
  };

  // Sorting:
  if (params.sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (params.sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (params.sort === 'popular') {
    // 'popular' -> pinned items first, then prioritize top iconic models, then newest
    filtered = [...filtered].sort((a, b) => {
      const pinA = getPinRank(a);
      const pinB = getPinRank(b);
      if (pinB !== pinA) return pinB - pinA;
      const pA = getProductPriority(a);
      const pB = getProductPriority(b);
      if (pB !== pA) return pB - pA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  } else {
    // 'newest' (default) -> pinned items first, then newest arrivals by ID descending
    filtered = [...filtered].sort((a, b) => {
      const pinA = getPinRank(a);
      const pinB = getPinRank(b);
      if (pinB !== pinA) return pinB - pinA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
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
