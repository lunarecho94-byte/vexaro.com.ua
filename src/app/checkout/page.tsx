import { Metadata } from 'next';
import { CheckoutForm } from '@/components/CheckoutForm';

export const metadata: Metadata = {
  title: 'Оформлення замовлення',
  description: 'Оформлення замовлення з доставкою Новою Поштою та оплатою при отриманні.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
          Оформлення замовлення
        </h1>
        <p className="mt-1 text-xs text-muted">
          Доставка Новою Поштою • Оплата після огляду та примірки (накладений платіж)
        </p>
      </div>

      <CheckoutForm />
    </div>
  );
}
