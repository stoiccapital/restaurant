import { useState } from 'react';
import { api, type Restaurant } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props =
  | { mode: 'create'; onClose: () => void; onSaved: () => void }
  | { mode: 'edit'; restaurant: Restaurant; onClose: () => void; onSaved: () => void };

export function RestaurantForm(props: Props) {
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
        <DialogTitle>{props.mode === 'create' ? 'Add restaurant' : 'Edit restaurant'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cuisine">Cuisine</Label>
            <Input id="cuisine" required value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Italian" />
          </div>
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" required value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="address">Address</Label>
          <Input id="address" required value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone ?? ''} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <input id="pickup" type="checkbox" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
            <Label htmlFor="pickup">Offer pickup</Label>
          </div>
          <div className="flex items-center gap-2">
            <input id="delivers" type="checkbox" checked={delivers} onChange={(e) => setDelivers(e.target.checked)} />
            <Label htmlFor="delivers">Offer delivery</Label>
          </div>
          {delivers && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label htmlFor="fee">Delivery fee (€)</Label>
                <Input id="fee" type="number" step="0.01" min="0" value={deliveryFeeEuros} onChange={(e) => setDeliveryFeeEuros(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="radius">Radius (km)</Label>
                <Input id="radius" type="number" min="0" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? '…' : 'Save'}</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
