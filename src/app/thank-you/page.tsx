import { Metadata } from 'next';
import { Suspense } from 'react';
import { ThankYouClient } from '@/components/ThankYouClient';

export const metadata: Metadata = {
  title: 'Дякуємо за замовлення!',
  description: 'Ваше замовлення успішно прийнято в обробку.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ThankYouPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Suspense fallback={<div className="h-40 rounded-2xl bg-surface animate-pulse" />}>
        <ThankYouClient />
      </Suspense>
    </div>
  );
}
