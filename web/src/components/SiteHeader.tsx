import { Link, NavLink } from 'react-router-dom';
import { ShoppingBag, Store, UtensilsCrossed } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';

export function SiteHeader({ onOpenCart }: { onOpenCart: () => void }) {
  const { itemCount } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span>Plates</span>
          <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
            · direct from local restaurants · 0% commission
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent',
                isActive && 'bg-accent',
              )
            }
          >
            Browse
          </NavLink>
          <NavLink
            to="/owner"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent',
                isActive && 'bg-accent',
              )
            }
          >
            <Store className="h-4 w-4" />
            For restaurants
          </NavLink>
          <button
            onClick={onOpenCart}
            className="relative ml-1 flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            <ShoppingBag className="h-4 w-4" />
            Cart
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
