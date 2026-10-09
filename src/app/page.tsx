import { Metadata } from 'next';
import { Suspense } from 'react';
import { getProducts, getCatalogMeta } from '@/lib/products';
import { CatalogQueryParams } from '@/types/product';
import { ProductCard } from '@/components/ProductCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { SITE_URL } from '@/lib/config';

interface PageProps {
  searchParams: {
    page?: string;
    category?: string;
    brand?: string;
    gender?: string;
    season?: string;
    size?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
    search?: string;
  };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const pageNum = Number(searchParams.page) || 1;
  const category = searchParams.category;
  const brand = searchParams.brand;
  const search = searchParams.search;

  let title = 'Каталог оригінального взуття та кросівок';
  let description = 'Великий вибір оригінальних кросівок і взуття з доставкою по Україні за 1–2 дні. Оплата після примірки (накладений платіж).';

  if (category && category !== 'all') {
    title = `Взуття категорії ${category}`;
  } else if (brand && brand !== 'all') {
    title = `Оригінальне взуття ${brand.toUpperCase()}`;
  } else if (search) {
    title = `Пошук «${search}» — каталог взуття`;
  }

  if (pageNum > 1) {
    title += ` — Сторінка ${pageNum}`;
  }

  // Canonical rule:
  // "сторінки з фільтрами вказують на категорію, сторінки пагінації вказують самі на себе"
  let canonicalUrl = `${SITE_URL}/`;
  if (pageNum > 1) {
    canonicalUrl = `${SITE_URL}/?page=${pageNum}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function CatalogPage({ searchParams }: PageProps) {
  const queryParams: CatalogQueryParams = {
    page: Number(searchParams.page) || 1,
    limit: 24,
    category: searchParams.category,
    brand: searchParams.brand,
    gender: searchParams.gender,
    season: searchParams.season,
    size: searchParams.size,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    sort: searchParams.sort || 'newest',
    search: searchParams.search,
  };

  const [catalogResponse, meta] = await Promise.all([
    getProducts(queryParams),
    getCatalogMeta(),
  ]);

  // Schema.org ItemList for products
  const schemaItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: catalogResponse.items.slice(0, 10).map((prod, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: prod.name,
      url: `${SITE_URL}/product/${prod.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItemList) }}
      />

      {/* Page Title & Count */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
            Каталог взуття
          </h1>
          <p className="text-xs text-muted">
            Знайдено {catalogResponse.total.toLocaleString('uk-UA')} моделей у наявності
          </p>
        </div>
      </div>

      {/* Interactive Filters (Suspense wrapped) */}
      <Suspense fallback={<div className="h-12 w-full animate-pulse rounded-lg bg-surface mb-6" />}>
        <CatalogFilters meta={meta} currentSort={queryParams.sort} />
      </Suspense>

      {/* Product Grid or Empty State */}
      {catalogResponse.items.length === 0 ? (
        <EmptyState
          title="За вашим запитом нічого не знайдено"
          description="Спробуйте змінити фільтри, вибрати інший бренд або скинути пошуковий запит."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {catalogResponse.items.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                priority={idx < 2}
              />
            ))}
          </div>

          {/* Pagination */}
          <Suspense fallback={null}>
            <Pagination
              currentPage={catalogResponse.page}
              totalPages={catalogResponse.totalPages}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}
