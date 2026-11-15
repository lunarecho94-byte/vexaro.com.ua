import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug, isHitProduct } from '@/lib/products';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductDetailView } from '@/components/ProductDetailView';
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

      {/* Main Product Layout with Reactive Color Variations */}
      <ProductDetailView product={product} />
    </div>
  );
}
