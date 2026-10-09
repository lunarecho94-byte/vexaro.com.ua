import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { FavoritesDrawer } from '@/components/FavoritesDrawer';
import { MetaPixel } from '@/components/MetaPixel';

import { SITE_URL, SITE_NAME } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'VEXARO — Інтернет-магазин брендового взуття та кросівок',
    template: '%s | VEXARO',
  },
  description:
    'Каталог оригінального та брендового взуття за вигідними цінами в Україні. Швидка доставка Новою Поштою 1–2 дні, накладений платіж без передоплати, примірка у відділенні.',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'VEXARO — Інтернет-магазин брендового взуття та кросівок',
    description:
      'Каталог брендового взуття та кросівок. Доставка Новою Поштою по Україні, оплата після примірки.',
  },
  icons: {
    icon: '/images/vexaro-emblem.png',
    shortcut: '/images/vexaro-emblem.png',
    apple: '/images/vexaro-emblem.png',
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
        <link rel="preconnect" href="https://wsrv.nl" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://wsrv.nl" />
        <link rel="preconnect" href="https://easydrop.one" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://easydrop.one" />
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
        <FavoritesDrawer />
        <Footer />
      </body>
    </html>
  );
}
