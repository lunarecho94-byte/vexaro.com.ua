import fs from 'fs';
import path from 'path';
import { Product, ProductVariation, CatalogMeta, CatalogQueryParams, CatalogResponse } from '@/types/product';
import { isHitProduct } from './product-badges';

export { isHitProduct };

let allProducts: Product[] | null = null;
let catalogMeta: CatalogMeta | null = null;
const productBySlug = new Map<string, Product>();
const productById = new Map<string, Product>();

const DEFAULT_PINNED_KEYS: string[] = [
  'A6201',     // Premiata MOERUN ХУТРО Brown - pinned by user
  'PM12',      // Premiata MOERUN ХУТРО Khaki - pinned by user
  'PM11',      // Premiata MOERUN ХУТРО Anthracite - pinned by user
  'PM10',      // Premiata MOERUN ХУТРО Black - pinned by user
  '1691',      // UGG LOWMEL SNEAKERS (Moss Green) - newest studio photos
  '1692',      // UGG LOWMEL SNEAKERS (Light Bronze) - newest studio photos
  'А5689',     // Nike Air Max Plus Tn Black Teal Yellow - newest studio photos
  '1705',      // UGG ULTRA MINI CHOCOLATE BROWN SUEDE - newest studio photos
  '5174',      // Adidas Campus 00s Beige Black (хутро) - newest studio photos
  '5187',      // Adidas Campus 00s Grey Black (хутро) - newest studio photos
  '5188',      // Adidas Campus 00s Grey White (хутро) - newest studio photos
  '0801',      // UGG ULTRA MINI PLATFORM BLACK SUEDE (most recent delivery)
  '2112',      // Nike Jordan 4 Black Cat ХУТРО
  '2113',      // Nike Jordan 4 White Cement ХУТРО
  'TN02',      // The North Face Glenclyffe Low Gore-Tex Black
  'VN04',      // Vans Sk8-Hi MTE Gore-Tex
  'S1270',     // Salomon XT-6 Black Gore-Tex
  'S1470',     // Salomon XT-6 Beige Gore-Tex
  'NK0420',    // Nike Pegasus Zebra Print
  'U0699',     // UGG Heritage Utility Sneaker
  'NB527',     // New Balance 530 (термо)
  'NB526',     // New Balance 530 (термо)
  'NB525',     // New Balance 530 (термо)
  'NB524',     // New Balance 530 (термо)
  'NB523',     // New Balance 9060 (термо)
  'NB522',     // New Balance 9060 (термо)
  'NB521',     // New Balance 9060 (термо)
  'NB520',     // New Balance 9060 (термо)
  'NB519',     // New Balance 9060 (термо)
  'NB149',     // New Balance 9060 Grey Cordura V2
  'NB148',     // New Balance 9060 Beige Cordura
  'NK185',     // Nike Sb Dunk Low Grey
  'AC033',     // Asics Gel-Pickax Clay Grey Mink
  'AS-045',    // Adidas Campus Grey (хутро)
  '0705V',     // Adidas Campus 00s Grey White Gum (хутро)
];

let pinnedKeys: string[] = DEFAULT_PINNED_KEYS;

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
  '5193',
  '256193',
  'UG0020',
  '252588',
  '253417',
  '253416',
  'UG0016',
  '249465',
  '2579',
  '208607',
  'U930',
  '203123',
  '1918',
  '201924',
  '2395',
  '201383',
  '2397',
  '199672',
  '2394',
  '199670',
  '198587',
  'UG0017',
  '252589',
  'U880',
  '185521',
  '189534',
  'U920',
  '185523',
  'U830',
  '185520',
  '185202',
  '185186',
]);

const BRAND_ALIASES: Record<string, string[]> = {
  nike: ['найк', 'найки', 'nike'],
  adidas: ['адідас', 'адидас', 'adidas'],
  ugg: ['угг', 'угги', 'уггі', 'ugg'],
  'new balance': ['нью беланс', 'нью беленс', 'нью баланс', 'ньюбаланс', 'нб', 'new balance', 'nb'],
  premiata: ['преміата', 'премиата', 'premiata'],
  asics: ['асікс', 'асикс', 'asics'],
  salomon: ['саломон', 'salomon'],
  puma: ['пума', 'puma'],
  vans: ['ванс', 'ванси', 'vans'],
  'air jordan': ['джордан', 'джордани', 'jordan', 'air jordan'],
};

export function normalizeHomoglyphs(str: string): string {
  return str
    .toLowerCase()
    .replace(/а/g, 'a')
    .replace(/е/g, 'e')
    .replace(/с/g, 'c')
    .replace(/о/g, 'o')
    .replace(/р/g, 'p')
    .replace(/х/g, 'x')
    .replace(/і/g, 'i');
}

export function getProductSearchText(p: Product): string {
  const parts: string[] = [
    p.name,
    p.brand,
    p.brandSlug,
    p.sku || '',
    p.id || '',
    p.genderName || '',
    p.gender || '',
    p.seasonName || '',
    p.season || '',
    p.material || '',
    ...(p.sizes || []),
  ];

  const brandKey = (p.brandSlug || p.brand || '').toLowerCase();
  for (const [key, aliases] of Object.entries(BRAND_ALIASES)) {
    if (brandKey.includes(key) || p.name.toLowerCase().includes(key)) {
      parts.push(...aliases);
    }
  }

  if (p.variations && p.variations.length > 0) {
    for (const v of p.variations) {
      if (v.color) parts.push(v.color);
      if (v.colorSlug) parts.push(v.colorSlug);
      if (v.sku) parts.push(v.sku);
    }
  }

  const raw = parts.join(' ').toLowerCase();
  const normalized = normalizeHomoglyphs(raw);
  return `${raw} ${normalized}`;
}

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
      !EXCLUDED_SKUS.has((p.id || '').trim()) &&
      !(
        ['2071', '2072', '1892', '1782', '1704', '1700'].includes((p.sku || '').trim().toUpperCase()) &&
        (p.name || '').toLowerCase().includes('ugg')
      )
  );
  catalogMeta = JSON.parse(metaRaw) as CatalogMeta;

  try {
    const pinnedPath = path.join(dataDir, 'pinned.json');
    if (fs.existsSync(pinnedPath)) {
      const parsed = JSON.parse(fs.readFileSync(pinnedPath, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        pinnedKeys = parsed;
      }
    }
  } catch {
    pinnedKeys = DEFAULT_PINNED_KEYS;
  }

  for (const p of allProducts) {
    productBySlug.set(p.slug, p);
    productById.set(p.id, p);

    if (p.variations && p.variations.length > 0) {
      for (const v of p.variations) {
        const variantProduct: Product = {
          ...p,
          sku: v.sku,
          price: v.price,
          oldPrice: v.oldPrice,
          images: v.images && v.images.length > 0 ? v.images : p.images,
          sizes: v.sizes && v.sizes.length > 0 ? v.sizes : p.sizes,
          sizeChart: v.sizeChart || p.sizeChart,
          activeVariation: v,
        };
        if (v.slug) {
          productBySlug.set(v.slug, variantProduct);
        }
        if (v.id) {
          productById.set(v.id, variantProduct);
        }
      }
    }

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
  const slugs: string[] = [];
  for (const p of allProducts!) {
    slugs.push(p.slug);
    if (p.variations) {
      for (const v of p.variations) {
        if (v.slug && !slugs.includes(v.slug)) {
          slugs.push(v.slug);
        }
      }
    }
  }
  return slugs;
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

  // Order-independent multi-word search
  const isSearchActive = Boolean(params.search && params.search.trim());
  const rawSearch = params.search ? params.search.trim() : '';
  const searchTokens = isSearchActive
    ? rawSearch
        .toLowerCase()
        .split(/[\s,+/|]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    : [];

  if (isSearchActive && searchTokens.length > 0) {
    filtered = filtered.filter((p) => {
      const text = getProductSearchText(p);
      // All tokens must be present in the product's searchable text (in any order)
      return searchTokens.every((token) => {
        const normToken = normalizeHomoglyphs(token);
        return text.includes(token) || text.includes(normToken);
      });
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

  // Match pinned products or new deliveries permanently prioritized at top
  const matchPin = (key: string, p: Product) => {
    if (key.startsWith('id:')) {
      return (p.id || '').trim() === key.slice(3).trim();
    }
    const target = (key.startsWith('sku:') ? key.slice(4) : key).trim().toUpperCase();
    const sku = (p.sku || '').trim().toUpperCase();
    const matched = (
      sku === target ||
      sku.replace(/\s+/g, '') === target.replace(/\s+/g, '') ||
      (p.id || '').trim() === target
    );
    if (matched && (target === '1691' || target === '1692') && p.id !== '253608') {
      return false;
    }
    return matched;
  };
  const getPinRank = (p: Product) => {
    const idx = pinnedKeys.findIndex((k) => matchPin(k, p));
    if (idx >= 0) return 10000 + (pinnedKeys.length - idx);
    const hasStudio = p.images && p.images.some((img) => img.startsWith('/images/products/'));
    return hasStudio ? 5000 : 0;
  };

  const getSearchRelevance = (p: Product): number => {
    if (!isSearchActive) return 0;
    let score = 0;
    const qLower = rawSearch.toLowerCase();
    const nameLower = p.name.toLowerCase();
    const skuLower = (p.sku || '').toLowerCase();
    const brandLower = (p.brand || '').toLowerCase();

    // Exact full query phrase match in product name (+500)
    if (nameLower.includes(qLower)) {
      score += 500;
    }

    // Exact SKU match (+1000)
    if (skuLower === qLower || searchTokens.includes(skuLower)) {
      score += 1000;
    } else if (skuLower.includes(qLower)) {
      score += 400;
    }

    // Variation SKU match (+800)
    if (
      p.variations &&
      p.variations.some(
        (v) =>
          (v.sku || '').toLowerCase() === qLower ||
          searchTokens.includes((v.sku || '').toLowerCase())
      )
    ) {
      score += 800;
    }

    // Exact brand match (+200)
    if (brandLower === qLower || searchTokens.includes(brandLower)) {
      score += 200;
    }

    // Individual token matches in title (+100 per word)
    for (const t of searchTokens) {
      if (nameLower.includes(t)) {
        score += 100;
      }
    }

    // Bonus for studio photography (+50)
    if (p.images && p.images.some((img) => img.startsWith('/images/products/'))) {
      score += 50;
    }

    return score;
  };

  // Sorting:
  if (params.sort === 'price_asc') {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (params.sort === 'price_desc') {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (params.sort === 'popular') {
    // 'popular' -> search relevance first (if searching), then pinned items, prioritize top iconic models, then newest
    filtered = [...filtered].sort((a, b) => {
      if (isSearchActive) {
        const sA = getSearchRelevance(a);
        const sB = getSearchRelevance(b);
        if (sB !== sA) return sB - sA;
      }
      const pinA = getPinRank(a);
      const pinB = getPinRank(b);
      if (pinB !== pinA) return pinB - pinA;
      const pA = getProductPriority(a);
      const pB = getProductPriority(b);
      if (pB !== pA) return pB - pA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  } else {
    // 'newest' (default) -> search relevance first (if searching), then pinned items, then newest arrivals by ID descending
    filtered = [...filtered].sort((a, b) => {
      if (isSearchActive) {
        const sA = getSearchRelevance(a);
        const sB = getSearchRelevance(b);
        if (sB !== sA) return sB - sA;
      }
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
