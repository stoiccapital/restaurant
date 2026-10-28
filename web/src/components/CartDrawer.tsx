import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckoutDialog } from './CheckoutDialog';

export function CartDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { lines, totalCents, add, dec, remove, restaurantId } = useCart();
  const { t, locale } = useI18n();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const currency = lines[0]?.offer.currency ?? 'EUR';

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogHeader>
          <DialogTitle>{t('cart.title')}</DialogTitle>
        </DialogHeader>

        {lines.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">{t('cart.empty')}</div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {t('cart.from')}{' '}
              <Link
                to={`/r/${lines[0].restaurant_slug}`}
                className="font-medium text-foreground hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {lines[0].restaurant_name}
              </Link>
            </div>
            <ul className="divide-y">
              {lines.map((line) => (
                <li key={line.offer.id} className="flex items-start gap-3 py-3">
                  <div className="flex-1">
                    <div className="font-medium">{line.offer.name}</div>
                    <div className="num mt-1 text-sm text-muted-foreground">
                      {formatPrice(line.offer.price_cents, line.offer.currency, locale)} ×{' '}
                      <span className="num">{line.quantity}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => dec(line.offer.id)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="num w-6 text-center text-sm">{line.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        add(line.offer, {
                          id: line.restaurant_id,
                          name: line.restaurant_name,
                          slug: line.restaurant_slug,
                        })
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(line.offer.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm font-medium">{t('cart.subtotal')}</span>
              <span className="num text-base font-semibold">{formatPrice(totalCents, currency, locale)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('cart.fine_print')}</p>
            <Button className="w-full" onClick={() => setCheckoutOpen(true)}>{t('cart.checkout')}</Button>
          </div>
        )}
      </Dialog>

      {restaurantId && (
        <CheckoutDialog
          open={checkoutOpen}
          onOpenChange={(o) => {
            setCheckoutOpen(o);
            if (!o) onOpenChange(false);
          }}
        />
      )}
    </>
  );
}
