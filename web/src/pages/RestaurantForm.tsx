import { useState } from 'react';
import { api, type Restaurant } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props =
  | { mode: 'create'; onClose: () => void; onSaved: () => void }
  | { mode: 'edit'; restaurant: Restaurant; onClose: () => void; onSaved: () => void };

export function RestaurantForm(props: Props) {
  const { t } = useI18n();
  const existing = props.mode === 'edit' ? props.restaurant : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [cuisine, setCuisine] = useState(existing?.cuisine ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [delivers, setDelivers] = useState(!!existing?.delivers);
  const [pickup, setPickup] = useState(existing ? !!existing.pickup : true);
  const [deliveryFeeEuros, setDeliveryFeeEuros] = useState(
    existing ? (existing.delivery_fee_cents / 100).toString() : '0',
  );
  const [deliveryRadius, setDeliveryRadius] = useState(existing?.delivery_radius_km.toString() ?? '0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Partial<Restaurant> = {
        name,
        cuisine,
        address,
        city,
        phone: phone || null,
        description: description || null,
        delivers: delivers ? 1 : 0,
        pickup: pickup ? 1 : 0,
        delivery_fee_cents: Math.round(parseFloat(deliveryFeeEuros || '0') * 100),
        delivery_radius_km: parseInt(deliveryRadius || '0', 10),
      };
      if (props.mode === 'create') {
        await api.createRestaurant(payload);
      } else {
        await api.updateRestaurant(props.restaurant.id, payload);
      }
      props.onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && props.onClose()}>
      <DialogHeader>
        <DialogTitle>{props.mode === 'create' ? t('restaurant_form.add') : t('restaurant_form.edit')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="name">{t('restaurant_form.name')}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cuisine">{t('restaurant_form.cuisine')}</Label>
            <Input id="cuisine" required value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder={t('restaurant_form.cuisine_placeholder')} />
          </div>
          <div>
            <Label htmlFor="city">{t('restaurant_form.city')}</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="address">{t('restaurant_form.address')}</Label>
          <Input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">{t('restaurant_form.phone')}</Label>
          <Input id="phone" value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">{t('restaurant_form.description')}</Label>
          <Textarea id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <input id="pickup" type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
            <Label htmlFor="pickup">{t('restaurant_form.offer_pickup')}</Label>
          </div>
          <div className="flex items-center gap-2">
            <input id="delivers" type="checkbox" checked={delivers} onChange={(e) => setDelivers(e.target.checked)} />
            <Label htmlFor="delivers">{t('restaurant_form.offer_delivery')}</Label>
          </div>
          {delivers && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label htmlFor="fee">{t('restaurant_form.delivery_fee_label')}</Label>
                <Input id="fee" type="number" step="0.01" min="0" value={deliveryFeeEuros} onChange={(e) => setDeliveryFeeEuros(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="radius">{t('restaurant_form.radius_label')}</Label>
                <Input id="radius" type="number" min="0" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={submitting}>{submitting ? t('common.working') : t('common.save')}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
