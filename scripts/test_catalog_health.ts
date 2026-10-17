import { getCatalogMeta, getProducts, getProductBySlug, getProductById } from '../src/lib/products';

async function main() {
  console.log('--- 1. Testing getCatalogMeta ---');
  const meta = await getCatalogMeta();
  console.log('✓ Meta loaded:', {
    total: meta.total,
    categories: meta.categories.map((c) => `${c.name} (${c.count})`),
    genders: meta.genders.map((g) => `${g.name} (${g.count})`),
    seasons: meta.seasons.map((s) => `${s.name} (${s.count})`),
    topBrands: meta.brands.slice(0, 5).map((b) => `${b.name} (${b.count})`),
    sizesCount: meta.sizes.length,
    minPrice: meta.minPrice,
    maxPrice: meta.maxPrice,
  });

  if (meta.total <= 0) throw new Error('Meta total is 0');
  if (meta.categories.length === 0) throw new Error('No categories in meta');

  console.log('\n--- 2. Testing Category Queries ---');
  for (const cat of meta.categories) {
    const res = await getProducts({ category: cat.slug, limit: 12 });
    if (res.items.length === 0) {
      throw new Error(`Category ${cat.slug} returned 0 items`);
    }
    console.log(`✓ Category "${cat.name}" [slug: ${cat.slug}] -> total: ${res.total}, page 1: ${res.items.length} items`);
  }

  console.log('\n--- 3. Testing Filter Queries ---');
  const nike = await getProducts({ brand: 'nike', limit: 10 });
  console.log(`✓ Filter brand=nike -> ${nike.total} items`);
  if (nike.items.length === 0) throw new Error('Brand nike returned 0 items');

  const size42 = await getProducts({ size: '42', limit: 10 });
  console.log(`✓ Filter size=42 -> ${size42.total} items`);
  if (size42.items.length === 0) throw new Error('Size 42 returned 0 items');

  const priceRange = await getProducts({ minPrice: 2000, maxPrice: 3500, limit: 10 });
  console.log(`✓ Filter 2000-3500 UAH -> ${priceRange.total} items`);
  if (priceRange.items.length === 0) throw new Error('Price range filter returned 0 items');

  const search = await getProducts({ search: 'Air Max', limit: 10 });
  console.log(`✓ Search "Air Max" -> ${search.total} items`);
  if (search.items.length === 0) throw new Error('Search returned 0 items');

  console.log('\n--- 4. Testing Sorting Modes ---');
  const asc = await getProducts({ sort: 'price_asc', limit: 20 });
  const desc = await getProducts({ sort: 'price_desc', limit: 20 });
  const newest = await getProducts({ sort: 'newest', limit: 20 });
  const popular = await getProducts({ sort: 'popular', limit: 20 });

  console.log(`✓ price_asc: min = ${asc.items[0].price} ₴, max = ${asc.items[asc.items.length - 1].price} ₴`);
  if (asc.items[0].price > asc.items[asc.items.length - 1].price) {
    throw new Error('price_asc sort incorrect');
  }

  console.log(`✓ price_desc: max = ${desc.items[0].price} ₴, min = ${desc.items[desc.items.length - 1].price} ₴`);
  if (desc.items[0].price < desc.items[desc.items.length - 1].price) {
    throw new Error('price_desc sort incorrect');
  }

  console.log(`✓ newest: first ID = ${newest.items[0].id}, second ID = ${newest.items[1].id}`);
  console.log(`✓ popular: first = "${popular.items[0].name}"`);

  console.log('\n--- 5. Testing Slug and ID Lookup ---');
  const sample = newest.items[0];
  const bySlug = await getProductBySlug(sample.slug);
  if (!bySlug || bySlug.id !== sample.id) throw new Error('getProductBySlug failed');
  console.log(`✓ getProductBySlug("${sample.slug}") -> "${bySlug.name}"`);

  const byId = await getProductById(sample.id);
  if (!byId || byId.slug !== sample.slug) throw new Error('getProductById failed');
  console.log(`✓ getProductById("${sample.id}") -> "${byId.name}"`);

  console.log('\n🎉 ALL CATALOG HEALTH TESTS PASSED!');
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
