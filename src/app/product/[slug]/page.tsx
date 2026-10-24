import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug } from '@/lib/products';
import { ProductGallery } from '@/components/ProductGallery';
import { ProductOrderPanel } from '@/components/ProductOrderPanel';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { Truck, ShieldCheck, RefreshCw, ChevronRight } from 'lucide-react';
import { SITE_URL, SITE_NAME } from '@/lib/config';

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export const dynamicParams = true;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateStaticParams() {
  const { getProducts } = await import('@/lib/products');
  const res = await getProducts({ limit: 50 });
  return res.items.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: 'Товар не знайдено',
    };
  }

  const primaryImage = product.images[0] || `${SITE_URL}/og-default.jpg`;

  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: {
      canonical: `${SITE_URL}/product/${product.slug}`,
    },
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      url: `${SITE_URL}/product/${product.slug}`,
      siteName: SITE_NAME,
      locale: 'uk_UA',
      type: 'website',
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  // Schema.org: Product with Offer and BreadcrumbList
  const schemaProduct = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description,
    sku: product.sku,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/product/${product.slug}`,
      priceCurrency: 'UAH',
      price: product.price,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  };

  const schemaBreadcrumbs = {
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
        name: product.category,
        item: `${SITE_URL}/category/${product.categorySlug}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.name,
        item: `${SITE_URL}/product/${product.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 pb-2 sm:pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaProduct) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumbs) }}
      />

      {/* Breadcrumb Navigation & Back Button */}
      <ProductBreadcrumbs
        category={product.category}
        categorySlug={product.categorySlug}
        productName={product.name}
      />

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Left: Gallery */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Right: Info & Purchase */}
        <div className="flex flex-col">
          {/* Header & SKU */}
          <div className="border-b border-border pb-5">
            <div className="flex items-center justify-between text-xs text-muted mb-1.5">
              <span className="font-bold uppercase tracking-wider text-primary">
                {product.brand}
              </span>
              <span className="font-mono bg-surface border border-border px-2 py-0.5 rounded">
                Артикул: <strong className="text-foreground">{product.sku}</strong>
              </span>
            </div>

            <h1 className="text-xl font-black text-foreground sm:text-2xl leading-snug">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl font-black text-foreground sm:text-3xl">
                {product.price.toLocaleString('uk-UA')} ₴
              </span>
              {product.oldPrice && (
                <span className="text-sm sm:text-base text-red-500 line-through decoration-red-500 font-semibold">
                  {product.oldPrice.toLocaleString('uk-UA')} ₴
                </span>
              )}
              {product.oldPrice && product.oldPrice > product.price && (
                <span className="rounded bg-rose-500/90 px-2 py-0.5 text-xs font-bold text-white uppercase shadow-sm">
                  -{Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)}%
                </span>
              )}
              {product.inStock ? (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  В наявності
                </span>
              ) : (
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                  Немає в наявності
                </span>
              )}
            </div>
          </div>

          {/* Order Panel (Size Selector & Buttons) */}
          <div className="py-6 border-b border-border">
            <ProductOrderPanel product={product} />
          </div>

          {/* Specifications Table */}
          <div className="py-6 border-b border-border">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Характеристики моделі
            </h2>
            <div className="divide-y divide-border text-xs">
              <div className="flex justify-between py-2">
                <span className="text-muted">Артикул товару:</span>
                <span className="font-semibold text-foreground">{product.sku}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Бренд:</span>
                <span className="font-semibold text-foreground">{product.brand}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Сезон:</span>
                <span className="font-semibold text-foreground">{product.seasonName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Стать:</span>
                <span className="font-semibold text-foreground">{product.genderName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Матеріал верху:</span>
                <span className="font-semibold text-foreground">{product.material}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted">Країна-виробник:</span>
                <span className="font-semibold text-foreground">{product.country}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Warranty Guarantees */}
          <div className="pt-6 pb-2 space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <Truck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-foreground font-semibold">Доставка Новою Поштою</strong>
                <span className="text-muted">Термін 1–2 дні по всій території України. Відправка в день замовлення.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-foreground font-semibold">Оплата при отриманні</strong>
                <span className="text-muted">Накладений платіж. Ви оглядаєте та приміряєте взуття у відділенні перед оплатою.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5">
              <RefreshCw className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="block text-foreground font-semibold">Обмін та повернення</strong>
                <span className="text-muted">14 днів на обмін розміру або повернення згідно із законодавством України.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
