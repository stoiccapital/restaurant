import { useEffect, useState } from 'react';
import { api, type Restaurant } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/Toast';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function CheckoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { lines, totalCents, clear, restaurantId } = useCart();
  const { t, locale } = useI18n();
  const toast = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'pickup'>('pickup');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lines[0]) return;
    api.getRestaurant(lines[0].restaurant_slug).then(({ restaurant }) => {
      setRestaurant(restaurant);
      if (!restaurant.delivers) setFulfillment('pickup');
    }).catch(() => undefined);
  }, [open, lines]);

  const currency = lines[0]?.offer.currency ?? 'EUR';
  const deliveryFee = fulfillment === 'delivery' ? restaurant?.delivery_fee_cents ?? 0 : 0;
  const grandTotal = totalCents + deliveryFee;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!restaurantId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.placeOrder({
        restaurant_id: restaurantId,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || undefined,
        fulfillment,
        address: fulfillment === 'delivery' ? address : undefined,
        note: note || undefined,
        items: lines.map((l) => ({ offer_id: l.offer.id, quantity: l.quantity })),
      });
      toast.show({
        title: t('checkout.order_placed'),
        description: `${formatPrice(res.total_cents, res.currency, locale)} · #${res.order_id.slice(4, 10)}`,
      });
      clear();
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNote('');
      setFulfillment('pickup');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t('checkout.title')}</DialogTitle>
        <DialogDescription>{t('checkout.subtitle')}</DialogDescription>
      </DialogHeader>

      <form onSubmit={submit} className="space-y-4">
        {restaurant && (
          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${fulfillment === 'pickup' ? 'border-primary bg-primary/10' : 'hover:bg-accent'}`}
              onClick={() => setFulfillment('pickup')}
              disabled={!restaurant.pickup}
            >
              {t('fulfillment.pickup')}
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md border px-3 py-2 text-sm ${fulfillment === 'delivery' ? 'border-primary bg-primary/10' : 'hover:bg-accent'} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => setFulfillment('delivery')}
              disabled={!restaurant.delivers}
              title={!restaurant.delivers ? t('fulfillment.does_not_deliver') : undefined}
            >
              {t('fulfillment.delivery')}{' '}
              {restaurant.delivers ? `· +${formatPrice(restaurant.delivery_fee_cents, currency, locale)}` : `(${t('fulfillment.unavailable')})`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="name">{t('checkout.name')}</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">{t('checkout.phone')}</Label>
            <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('checkout.phone_placeholder')} />
          </div>
          <div>
            <Label htmlFor="email">{t('checkout.email_optional')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {fulfillment === 'delivery' && (
            <div className="col-span-2">
              <Label htmlFor="address">{t('checkout.delivery_address')}</Label>
              <Input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          )}
          <div className="col-span-2">
            <Label htmlFor="note">{t('checkout.note_optional')}</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('checkout.items')}</span>
            <span className="num">{formatPrice(totalCents, currency, locale)}</span>
          </div>
          {fulfillment === 'delivery' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('checkout.delivery_fee')}</span>
              <span className="num">{formatPrice(deliveryFee, currency, locale)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1 font-semibold">
            <span>{t('checkout.total')}</span>
            <span className="num">{formatPrice(grandTotal, currency, locale)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.placing') : t('checkout.place_order')}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
