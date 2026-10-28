import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, Store, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useI18n, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function SiteHeader({ onOpenCart }: { onOpenCart: () => void }) {
  const { itemCount } = useCart();
  const { t, locale, setLocale } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span>Plates</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">· {t('nav.tagline')}</span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn('rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent', isActive && 'bg-accent')
            }
          >
            {t('nav.browse')}
          </NavLink>
          <NavLink
            to="/owner"
            className={({ isActive }) =>
              cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent', isActive && 'bg-accent')
            }
          >
            <Store className="h-4 w-4" />
            {t('nav.for_restaurants')}
          </NavLink>
          <LocaleToggle locale={locale} onChange={setLocale} />
          <button
            onClick={onOpenCart}
            className="relative ml-1 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <ShoppingBag className="h-4 w-4" />
            {t('nav.cart')}
            {itemCount > 0 && (
              <span className="num ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {itemCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}

function LocaleToggle({ locale, onChange }: { locale: Locale; onChange: (l: Locale) => void }) {
  return (
    <div className="ml-1 flex rounded-md border p-0.5 text-xs">
      {(['en', 'de'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={cn(
            'rounded px-2 py-0.5 font-medium',
            locale === l ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
          aria-pressed={locale === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
