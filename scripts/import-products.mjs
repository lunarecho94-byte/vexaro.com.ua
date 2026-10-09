import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_FILE = '/Users/mac/.gemini/antigravity/scratch/products.json';
const OUTPUT_DATA_DIR = path.join(ROOT_DIR, 'src', 'data');

if (!fs.existsSync(OUTPUT_DATA_DIR)) {
  fs.mkdirSync(OUTPUT_DATA_DIR, { recursive: true });
}

// Ukrainian Cyrillic to Latin transliteration table
const CYRILLIC_TO_LATIN = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
  'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
  'я': 'ya', 'ъ': '', 'ы': 'y', 'э': 'e', 'ё': 'yo'
};

function transliterate(str) {
  return str
    .toLowerCase()
    .split('')
    .map(char => CYRILLIC_TO_LATIN[char] !== undefined ? CYRILLIC_TO_LATIN[char] : char)
    .join('');
}

function createSlug(text, sku, id) {
  const trans = transliterate(text);
  const clean = trans
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanSku = (sku || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
  return `${clean}-${cleanSku || id}`.replace(/-+/g, '-');
}

console.log('🔄 Запуск імпорту товарів з джерела:', SOURCE_FILE);

if (!fs.existsSync(SOURCE_FILE)) {
  console.error('❌ Помилка: файл джерела не знайдено:', SOURCE_FILE);
  process.exit(1);
}

const rawData = fs.readFileSync(SOURCE_FILE, 'utf-8');
const rawProducts = JSON.parse(rawData);

console.log(`📦 Знайдено сирих записів: ${rawProducts.length}`);

const brandMap = new Map();
const categoryMap = new Map();
const genderMap = new Map();
const seasonMap = new Map();
const sizeSet = new Set();

let minPrice = Infinity;
let maxPrice = 0;

const processedProducts = [];
const slugSet = new Set();

for (const p of rawProducts) {
  if (!p.id || !p.name || !p.price || !p.imgs || p.imgs.length === 0) {
    continue;
  }

  // Filter only Demi-season and Winter as requested ("оставь тут только демисезон и зыма")
  if (p.season !== 'demi' && p.season !== 'winter') {
    continue;
  }

  // Filter ONLY Footwear as requested ("только обувь")
  if (p.cat !== 'shoes' && p.cat_name !== 'Взуття') {
    continue;
  }

  const cleanSku = (p.art || p.id).toString().trim();
  let slug = createSlug(p.name, cleanSku, p.id);

  if (slugSet.has(slug)) {
    slug = `${slug}-${p.id}`;
  }
  slugSet.add(slug);

  const price = Number(p.price) || 0;
  const oldPrice = p.old_price ? Number(p.old_price) : undefined;
  const costPrice = p.cost_price ? Number(p.cost_price) : 0;

  if (price > 0) {
    if (price < minPrice) minPrice = price;
    if (price > maxPrice) maxPrice = price;
  }

  const brandName = (p.brand_name || p.brand || 'Інші бренди').trim();
  const brandSlug = (p.brand || 'other').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  brandMap.set(brandSlug, { name: brandName, slug: brandSlug, count: (brandMap.get(brandSlug)?.count || 0) + 1 });

  const catName = (p.cat_name || 'Взуття').trim();
  const catSlug = (p.cat || 'shoes').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  categoryMap.set(catSlug, { name: catName, slug: catSlug, count: (categoryMap.get(catSlug)?.count || 0) + 1 });

  const gender = p.gender === 'women' ? 'women' : p.gender === 'men' ? 'men' : 'unisex';
  const genderName = gender === 'women' ? 'Жіночі' : gender === 'men' ? 'Чоловічі' : 'Унісекс';
  genderMap.set(gender, { name: genderName, slug: gender, count: (genderMap.get(gender)?.count || 0) + 1 });

  const season = p.season === 'winter' ? 'winter' : p.season === 'summer' ? 'summer' : 'demi';
  const seasonName = season === 'winter' ? 'Зима' : season === 'summer' ? 'Літо' : 'Демісезон';
  seasonMap.set(season, { name: seasonName, slug: season, count: (seasonMap.get(season)?.count || 0) + 1 });

  const sizes = Array.isArray(p.sizes) ? p.sizes.map(s => String(s).trim()).filter(Boolean) : [];
  sizes.forEach(s => sizeSet.add(s));

  const material = (p.mat || '').trim();
  const country = (p.origin || 'В\'єтнам').replace(/[^\p{L}\p{N}\s',.\-]/gu, '').trim();

  // Specific, factual Ukrainian description without AI slop
  const descParts = [
    `Модель: ${p.name}.`,
    `Артикул: ${cleanSku}.`,
    material ? `Матеріал: ${material}.` : '',
    seasonName ? `Сезон: ${seasonName}.` : '',
    country ? `Виробництво: ${country}.` : '',
    'Доставка Новою Поштою по Україні протягом 1–2 днів.',
    'Оплата при отриманні (накладений платіж) після огляду та примірки у відділенні.',
    'Гарантія обміну або повернення — 14 днів.'
  ].filter(Boolean);

  const description = descParts.join(' ');

  const title = `${p.name} (арт. ${cleanSku}) — купити в інтернет-магазині VEXARO`;
  const metaDescription = `Замовляйте ${p.name} (арт. ${cleanSku}) за ${price} ₴. Доставка Новою Поштою по Україні 1–2 дні, оплата після примірки (накладений платіж).`;

  processedProducts.push({
    id: String(p.id),
    slug,
    name: p.name.trim(),
    brand: brandName,
    brandSlug,
    category: catName,
    categorySlug: catSlug,
    gender,
    genderName,
    season,
    seasonName,
    price,
    oldPrice: oldPrice && oldPrice > price ? oldPrice : undefined,
    costPrice,
    sku: cleanSku,
    material: material || 'Текстиль / комбінований',
    country: country || 'В\'єтнам',
    sizes,
    inStock: sizes.length > 0,
    images: Array.isArray(p.imgs) ? p.imgs : [p.imgs],
    description,
    seo: {
      title,
      description: metaDescription
    }
  });
}

// Sort sizes naturally (numeric where possible)
const sortedSizes = Array.from(sizeSet).sort((a, b) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return a.localeCompare(b);
});

const meta = {
  total: processedProducts.length,
  brands: Array.from(brandMap.values()).sort((a, b) => b.count - a.count),
  categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
  genders: Array.from(genderMap.values()).sort((a, b) => b.count - a.count),
  seasons: Array.from(seasonMap.values()).sort((a, b) => b.count - a.count),
  sizes: sortedSizes,
  minPrice: minPrice === Infinity ? 0 : minPrice,
  maxPrice: maxPrice
};

console.log(`✅ Оброблено валідних товарів: ${processedProducts.length}`);
console.log(`📊 Категорій: ${meta.categories.length}, Брендів: ${meta.brands.length}, Розмірів: ${meta.sizes.length}`);
console.log(`💰 Діапазон цін: ${meta.minPrice} ₴ – ${meta.maxPrice} ₴`);

// Save files
const productsPath = path.join(OUTPUT_DATA_DIR, 'products.json');
const metaPath = path.join(OUTPUT_DATA_DIR, 'meta.json');

fs.writeFileSync(productsPath, JSON.stringify(processedProducts, null, 2), 'utf-8');
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

console.log('💾 Успішно збережено:');
console.log('   ->', productsPath);
console.log('   ->', metaPath);
