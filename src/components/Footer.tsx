import React from 'react';
import Link from 'next/link';
import { Truck, ShieldCheck, RefreshCw, Mail } from 'lucide-react';
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
                  href="viber://chat?number=%2B380974524435"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#7360F2] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-[#7360F2]">
                    <path d="M21.96 17.58c-.37 1.86-1.92 3.19-3.79 3.29-1.22.07-2.6-.2-4.13-.81-3.66-1.46-6.66-3.8-8.89-6.95-1.52-2.15-2.45-4.52-2.77-7.05-.2-1.63.5-3.15 1.85-4.04 1.15-.76 2.58-.93 3.86-.46.72.26 1.34.82 1.76 1.58.46.83.94 1.66 1.41 2.5.42.75.42 1.63 0 2.37-.34.6-.74 1.16-1.15 1.71-.24.32-.23.75.03 1.05 1.05 1.21 2.29 2.24 3.69 3.06.32.19.72.16.99-.07.51-.43 1.03-.84 1.58-1.23.76-.53 1.75-.58 2.55-.13.88.49 1.74 1.01 2.6 1.53.8.48 1.33 1.23 1.48 2.15.09.52.02 1.05-.18 1.54z" />
                  </svg>
                  Viber: +38 (097) 452-44-35
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/+380974524435"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#229ED9] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current text-[#229ED9]">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194.992.127.828.928z" />
                  </svg>
                  Telegram: +38 (097) 452-44-35
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
