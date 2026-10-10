'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { Truck, ShieldCheck, ShoppingBag, Loader2, ArrowLeft } from 'lucide-react';
import { NovaPoshtaDeliverySelect } from '@/components/NovaPoshtaDeliverySelect';

export function CheckoutForm() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { items, getTotalAmount, clearCart } = useCartStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [comment, setComment] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Format Ukrainian phone mask +38 (0XX) XXX-XX-XX
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, '');
    if (input.startsWith('380')) {
      input = input.substring(2);
    } else if (input.startsWith('80')) {
      input = input.substring(1);
    } else if (!input.startsWith('0') && input.length > 0) {
      input = '0' + input;
    }

    if (input.length > 10) {
      input = input.substring(0, 10);
    }

    let formatted = '+38 ';
    if (input.length > 0) {
      formatted += '(' + input.substring(0, 3);
    }
    if (input.length >= 4) {
      formatted += ') ' + input.substring(3, 6);
    }
    if (input.length >= 7) {
      formatted += '-' + input.substring(6, 8);
    }
    if (input.length >= 9) {
      formatted += '-' + input.substring(8, 10);
    }

    setPhone(input.length === 0 ? '' : formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMsg('Будь ласка, вкажіть ваше імʼя та прізвище');
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setErrorMsg('Вкажіть коректний номер телефону (наприклад: +38 097 123-45-67)');
      return;
    }

    if (!city.trim() || city.trim().length < 2) {
      setErrorMsg('Вкажіть місто для доставки');
      return;
    }

    if (!warehouse.trim()) {
      setErrorMsg('Вкажіть номер відділення або поштомату Нової Пошти');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('Кошик порожній. Додайте товар перед оформленням.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        warehouse: warehouse.trim(),
        comment: comment.trim() || undefined,
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          size: i.size,
          price: i.product.price,
          quantity: i.quantity,
          slug: i.product.slug,
        })),
        totalAmount: getTotalAmount(),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Не вдалося створити замовлення');
      }

      // Store in sessionStorage for one-time deduplicated Purchase event
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          `vexaro_order_${data.orderId}`,
          JSON.stringify({
            orderId: data.orderId,
            totalAmount: data.totalAmount,
            items: payload.items,
            city: payload.city,
            warehouse: payload.warehouse,
            customerName: payload.customerName,
            phone: payload.phone,
          })
        );
      }

      // Clear cart
      clearCart();

      // Redirect to Thank-You page
      router.push(`/thank-you?orderId=${data.orderId}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Помилка надсилання замовлення. Спробуйте ще раз.');
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center my-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised border border-border text-muted mb-4">
          <ShoppingBag className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">Ваш кошик порожній</h3>
        <p className="text-xs text-muted max-w-sm mb-6">
          Виберіть моделі в каталозі, щоб оформити доставку.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Перейти до каталогу</span>
        </Link>
      </div>
    );
  }

  const totalAmount = getTotalAmount();

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left: Input Fields */}
      <div className="lg:col-span-7 space-y-6">
        {/* Recipient info block */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
            1. Дані одержувача
          </h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Імʼя та прізвище <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Іван Петренко"
                className="w-full h-11 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Номер телефону <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                inputMode="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+38 (097) 123-45-67"
                className="w-full h-11 rounded-lg border border-border bg-background px-3.5 text-sm font-mono text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Delivery info block */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
              2. Доставка (Нова Пошта)
            </h2>
            <span className="text-xs text-primary font-semibold">1–2 дні</span>
          </div>

          <div className="space-y-4">
            <NovaPoshtaDeliverySelect
              city={city}
              warehouse={warehouse}
              onCityChange={setCity}
              onWarehouseChange={setWarehouse}
            />

            <div>
              <label className="text-xs font-semibold text-muted block mb-1.5">
                Коментар до замовлення (необовʼязково)
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Уточнення щодо часу дзвінка або доставки..."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Payment notice */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs">
              <strong className="block text-foreground font-semibold mb-1">
                Оплата при отриманні (накладений платіж)
              </strong>
              <p className="text-muted leading-relaxed">
                Жодної передоплати. Ви оглядаєте посилку у відділенні Нової Пошти, приміряєте взуття і тільки після цього сплачуєте готівкою або банківською карткою.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Order Summary Sidebar */}
      <div className="lg:col-span-5">
        <div className="sticky top-20 rounded-2xl border border-border bg-surface p-5 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3">
            Ваше замовлення ({items.reduce((s, i) => s + i.quantity, 0)})
          </h2>

          {/* Items list */}
          <div className="divide-y divide-border max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={`${item.product.id}-${item.size}`}
                className="py-3 flex gap-3 items-center"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-raised border border-border">
                  <Image
                    src={item.product.images[0] || '/placeholder.png'}
                    alt={item.product.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-foreground truncate">
                    {item.product.name}
                  </h4>
                  <div className="text-[11px] text-muted mt-0.5">
                    Розмір: <b className="text-foreground">{item.size}</b> • {item.quantity} шт.
                  </div>
                </div>

                <div className="text-xs font-bold text-foreground">
                  {(item.product.price * item.quantity).toLocaleString('uk-UA')} ₴
                </div>
              </div>
            ))}
          </div>

          {/* Financial summary */}
          <div className="border-t border-border pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted">
              <span>Вартість товарів:</span>
              <span className="text-foreground font-semibold">
                {totalAmount.toLocaleString('uk-UA')} ₴
              </span>
            </div>

            <div className="flex justify-between text-muted">
              <span>Доставка (Нова Пошта):</span>
              <span className="text-foreground">За тарифами перевізника</span>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-border">
              <span className="text-sm font-bold text-foreground">Разом до сплати:</span>
              <span className="text-xl font-black text-foreground">
                {totalAmount.toLocaleString('uk-UA')} ₴
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-400">
              {errorMsg}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-primary text-sm sm:text-base font-extrabold uppercase tracking-wider text-background hover:bg-primary-hover active:scale-[0.99] shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Оформляємо замовлення...</span>
              </>
            ) : (
              <span>Підтвердити замовлення</span>
            )}
          </button>

          <p className="text-center text-[11px] text-muted leading-tight">
            Натискаючи кнопку, ви підтверджуєте замовлення з післяплатою у відділенні Нової Пошти.
          </p>
        </div>
      </div>
    </form>
  );
}
