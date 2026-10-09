'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Truck, Phone, ArrowLeft, PackageCheck } from 'lucide-react';

export function ThankYouClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('orderId') || 'UB-000000';
  const [orderData, setOrderData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === 'undefined') return;

    // Retrieve order details from session storage
    const raw = sessionStorage.getItem(`urban_order_${orderId}`);
    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
        setOrderData(data);
      } catch {
        // Ignore JSON error
      }
    }

    // DEDUPLICATED META PURCHASE EVENT
    // Rule: "Purchase з'являється в Test Events один раз, а оновлення сторінки другої події не дає."
    const trackedKey = `meta_purchase_tracked_${orderId}`;
    const alreadyTracked = sessionStorage.getItem(trackedKey);

    if (!alreadyTracked && orderId !== 'UB-000000') {
      const purchaseValue = data?.totalAmount || 0;
      const contentIds = data?.items?.map((i: any) => String(i.id)) || [];
      const numItems = data?.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 1;

      if ((window as any).fbq) {
        (window as any).fbq(
          'track',
          'Purchase',
          {
            value: purchaseValue,
            currency: 'UAH',
            content_type: 'product',
            content_ids: contentIds,
            num_items: numItems,
          },
          { eventID: orderId }
        );
        console.log('🎯 [Meta Pixel] Purchase event tracked with eventID:', orderId);
      }

      // Mark as tracked so reload will NEVER trigger second event
      sessionStorage.setItem(trackedKey, 'true');
    } else {
      console.log('🛡️ [Meta Pixel] Reload detected: Purchase event already tracked for orderId:', orderId);
    }
  }, [orderId]);

  if (!mounted) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center space-y-6">
      {/* Success Badge */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <div>
        <span className="inline-block rounded-full bg-surface-raised border border-border px-3 py-1 text-xs font-mono font-bold text-primary mb-2">
          Замовлення #{orderId}
        </span>
        <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl">
          Дякуємо! Ваше замовлення прийнято
        </h1>
        <p className="mt-2 text-xs text-muted max-w-md mx-auto leading-relaxed">
          Наш менеджер звʼяжеться з вами для підтвердження деталей відправки. Номер ТТН Нової Пошти буде надіслано в повідомленні після оформлення.
        </p>
      </div>

      {/* Order specifics if available */}
      {orderData && (
        <div className="rounded-xl border border-border bg-background p-4 text-left space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground border-b border-border pb-2">
            <PackageCheck className="h-4 w-4 text-primary" />
            <span>Деталі доставки</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted">
            <div>
              <span>Одержувач:</span>{' '}
              <strong className="text-foreground">{orderData.customerName}</strong>
            </div>
            <div>
              <span>Телефон:</span>{' '}
              <strong className="text-foreground">{orderData.phone}</strong>
            </div>
            <div>
              <span>Місто:</span>{' '}
              <strong className="text-foreground">{orderData.city}</strong>
            </div>
            <div>
              <span>Відділення:</span>{' '}
              <strong className="text-foreground">{orderData.warehouse}</strong>
            </div>
          </div>

          {orderData.items && orderData.items.length > 0 && (
            <div className="border-t border-border pt-3 mt-3 space-y-1.5">
              <span className="font-semibold text-foreground block mb-1">
                Замовлені товари:
              </span>
              {orderData.items.map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between text-muted">
                  <span>
                    {i.name} (арт. {i.sku}) — {i.size} × {i.quantity} шт.
                  </span>
                  <span className="font-semibold text-foreground">
                    {(i.price * i.quantity).toLocaleString('uk-UA')} ₴
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                <span>Разом:</span>
                <span className="text-sm font-black text-primary">
                  {orderData.totalAmount.toLocaleString('uk-UA')} ₴
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delivery and payment reminders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-raised p-3">
          <Truck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="block text-foreground font-semibold">Термін доставки</strong>
            <span className="text-muted">1–2 дні до вашого відділення Нової Пошти.</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-raised p-3">
          <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="block text-foreground font-semibold">Підтримка клієнтів</strong>
            <span className="text-muted">+38 (097) 452-44-35 (Пн–Нд 09:00–20:00).</span>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Повернутися до покупок</span>
        </Link>
      </div>
    </div>
  );
}
