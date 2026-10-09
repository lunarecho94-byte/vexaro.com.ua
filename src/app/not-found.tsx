import Link from 'next/link';
import { PackageX, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-raised border border-border text-muted mb-4">
        <PackageX className="h-8 w-8 text-primary" />
      </div>

      <h1 className="text-xl font-black uppercase tracking-tight text-foreground sm:text-2xl mb-2">
        Сторінку не знайдено
      </h1>
      <p className="text-xs text-muted mb-6 leading-relaxed">
        Можливо, товар уже розпродано або посилання застаріло. Перейдіть до каталогу, щоб переглянути актуальні моделі.
      </p>

      <Link
        href="/"
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold uppercase tracking-wider text-background hover:bg-primary-hover transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>До каталогу товарів</span>
      </Link>
    </div>
  );
}
