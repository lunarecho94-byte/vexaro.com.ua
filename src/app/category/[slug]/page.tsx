import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getProducts, getCatalogMeta } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';
import { CatalogFilters } from '@/components/CatalogFilters';
import { Pagination } from '@/components/Pagination';
import { EmptyState } from '@/components/EmptyState';
import { SITE_URL } from '@/lib/config';

interface CategoryPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    page?: string;
    brand?: string;
    gender?: string;
    season?: string;
    size?: string;
    sort?: 'popular' | 'price_asc' | 'price_desc' | 'newest';
    search?: string;
  };
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const { getCatalogMeta } = await import('@/lib/products');
  const meta = await getCatalogMeta();
  return meta.categories.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const meta = await getCatalogMeta();
  const category = meta.categories.find((c) => c.slug === params.slug);

  if (!category && params.slug !== 'all') {
    return { title: 'Категорія не знайдена' };
  }

  const catName = category ? category.name : 'Каталог';
  const pageNum = Number(searchParams.page) || 1;

  let title = `${catName} — купити в інтернет-магазині VEXARO`;
  let description = `Великий асортимент: ${catName}. Швидка доставка Новою Поштою 1–2 дні по Україні, оплата після примірки (накладений платіж).`;

  if (pageNum > 1) {
    title += ` — Сторінка ${pageNum}`;
  }

  // Canonical points to category URL, or itself with pagination
  let canonicalUrl = `${SITE_URL}/category/${params.slug}`;
  if (pageNum > 1) {
    canonicalUrl = `${SITE_URL}/category/${params.slug}?page=${pageNum}`;
  }

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const meta = await getCatalogMeta();
  const category = meta.categories.find((c) => c.slug === params.slug);

  if (!category && params.slug !== 'all') {
    notFound();
  }

  const queryParams = {
    category: params.slug,
    page: Number(searchParams.page) || 1,
    limit: 24,
    brand: searchParams.brand,
    gender: searchParams.gender,
    season: searchParams.season,
    size: searchParams.size,
    sort: searchParams.sort || 'popular',
    search: searchParams.search,
  };

  const catalogResponse = await getProducts(queryParams);

  // Breadcrumbs Schema.org
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Головна',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: category?.name || 'Каталог',
        item: `${SITE_URL}/category/${params.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
          {category?.name || 'Всі товари'}
        </h1>
        <p className="text-xs text-muted">
          Знайдено {catalogResponse.total.toLocaleString('uk-UA')} позицій
        </p>
      </div>

      <Suspense fallback={<div className="h-12 w-full animate-pulse rounded-lg bg-surface mb-6" />}>
        <CatalogFilters meta={meta} currentSort={queryParams.sort} />
      </Suspense>

      {catalogResponse.items.length === 0 ? (
        <EmptyState
          title="Товарів у цій категорії не знайдено"
          description="Спробуйте змінити фільтри або повернутися до загального каталогу."
          resetHref={`/category/${params.slug}`}
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
