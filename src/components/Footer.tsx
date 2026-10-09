import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, RefreshCw, Phone, Mail } from 'lucide-react';
import { VexaroLogo } from '@/components/VexaroLogo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface text-muted">
      {/* Guarantees bar */}
      <div className="border-b border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-surface-raised p-2 text-primary border border-border">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Доставка 1–2 дні</h4>
                <p className="mt-1 text-xs">
                  Відправка замовлень Новою Поштою по всій території України щодня.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-surface-raised p-2 text-primary border border-border">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Накладений платіж</h4>
                <p className="mt-1 text-xs">
                  Оплата після огляду та примірки товару у відділенні без передоплати.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-surface-raised p-2 text-primary border border-border">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Обмін та повернення</h4>
                <p className="mt-1 text-xs">
                  14 днів гарантії на обмін або повернення коштів згідно із законом України.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer info */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" aria-label="Головна сторінка VEXARO">
              <VexaroLogo variant="footer" animated={true} />
            </Link>
            <p className="mt-3 text-xs leading-relaxed max-w-md">
              Спеціалізований інтернет-магазин брендового та якісного взуття. Прямі поставки зі складів в Україні.
            </p>
            <p className="mt-3 text-xs text-muted">
              Пн–Нд: 09:00 – 20:00 (без вихідних)
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Умови
            </h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>Доставка Новою Поштою</li>
              <li>Оплата при отриманні</li>
              <li>Примірка перед оплатою</li>
              <li>Повернення протягом 14 днів</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Контакти
            </h4>
            <ul className="mt-3 space-y-2.5 text-xs">
              <li>
                <a
                  href="tel:+380974524435"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  +38 (097) 452-44-35
                </a>
              </li>
              <li>
                <a
                  href="mailto:lunarecho94@icloud.com"
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  lunarecho94@icloud.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} VEXARO. Всі права захищено.
        </div>
      </div>
    </footer>
  );
}
