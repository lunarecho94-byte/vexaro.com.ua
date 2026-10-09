import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { MetaPixel } from '@/components/MetaPixel';

export const metadata: Metadata = {
  metadataBase: new URL('https://urbangrid.com.ua'),
  title: {
    default: 'URBAN — Інтернет-магазин оригінального взуття та кросівок',
    template: '%s | URBAN',
  },
  description:
    'Каталог оригінального взуття та кросівок за найкращими цінами в Україні. Швидка доставка Новою Поштою 1–2 дні, накладений платіж без передоплати, примірка у відділенні.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    url: 'https://urbangrid.com.ua',
    siteName: 'URBAN',
    title: 'URBAN — Інтернет-магазин оригінального взуття та кросівок',
    description:
      'Каталог оригінального взуття та кросівок. Доставка Новою Поштою по Україні, оплата після примірки.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <Suspense fallback={null}>
          <MetaPixel />
        </Suspense>

        <Suspense fallback={<div className="h-16 border-b border-border bg-background" />}>
          <Header />
        </Suspense>

        <main className="flex-1">
          {children}
        </main>

        <CartDrawer />
        <Footer />
      </body>
    </html>
  );
}
