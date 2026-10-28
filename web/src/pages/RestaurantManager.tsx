import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, type Offer, type Order, type OrderItem, type Restaurant } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { formatDateTime, formatPrice } from '@/lib/utils';

type Tab = 'offers' | 'orders';

export function RestaurantManager({ restaurant, onBack }: { restaurant: Restaurant; onBack: () => void }) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>('offers');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);

  async function refreshOffers() {
    const r = await api.ownerOffers(restaurant.id);
    setOffers(r.offers);
  }

  async function refreshOrders() {
    const r = await api.ownerOrders(restaurant.id);
    setOrders(r.orders);
    setOrderItems(r.items);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshOffers(), refreshOrders()])
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:underline">
        {t('manager.back')}
      </button>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="text-sm text-muted-foreground">
            {restaurant.cuisine} · {restaurant.city}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b">
        <button
          onClick={() => setTab('offers')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'offers' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('manager.tab_offers')}
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${tab === 'orders' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t('manager.tab_orders')}{orders.length > 0 && <span className="num ml-1 text-xs">({orders.length})</span>}
        </button>
      </div>

      {loading && <p className="mt-6 text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!loading && tab === 'offers' && (
        <div className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t('manager.add_offer')}
            </Button>
          </div>

          {offers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t('manager.no_offers')}
              </CardContent>
            </Card>
          ) : (
            <div className="divide-y rounded-lg border bg-card">
              {offers.map((o) => (
                <div key={o.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{o.name}</div>
                      {o.category && <Badge variant="muted">{o.category}</Badge>}
                      {!o.available && <Badge variant="outline">{t('manager.hidden_badge')}</Badge>}
                    </div>
                    {o.description && <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>}
                    <div className="num mt-1 text-sm font-semibold">{formatPrice(o.price_cents, o.currency, locale)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(o)}>{t('common.edit')}</Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (confirm(t('manager.delete_offer_confirm', { name: o.name }))) {
                          await api.deleteOffer(o.id);
                          await refreshOffers();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'orders' && (
        <div className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                {t('manager.no_orders')}
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => {
              const items = orderItems.filter((it) => it.order_id === order.id);
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{order.customer_name}</span>
                          <Badge variant={order.fulfillment === 'delivery' ? 'default' : 'secondary'}>
                            {t(`fulfillment.${order.fulfillment}`)}
                          </Badge>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="num mt-1 text-xs text-muted-foreground">
                          {formatDateTime(order.created_at, locale)} · {order.customer_phone}
                          {order.customer_email && <> · {order.customer_email}</>}
                        </div>
                        {order.address && (
                          <div className="mt-1 text-xs text-muted-foreground">→ {order.address}</div>
                        )}
                        {order.note && <div className="mt-1 text-xs italic text-muted-foreground">"{order.note}"</div>}
                      </div>
                      <div className="text-right">
                        <div className="num text-base font-semibold">{formatPrice(order.total_cents, order.currency, locale)}</div>
                        <Select
                          className="mt-2"
                          value={order.status}
                          onChange={async (e) => {
                            await api.updateOrderStatus(order.id, e.target.value as Order['status']);
                            await refreshOrders();
                          }}
                        >
                          <option value="placed">{t('status.placed')}</option>
                          <option value="accepted">{t('status.accepted')}</option>
                          <option value="ready">{t('status.ready')}</option>
                          <option value="completed">{t('status.completed')}</option>
                          <option value="cancelled">{t('status.cancelled')}</option>
                        </Select>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                      {items.map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span>
                            <span className="num mr-2">{it.quantity}×</span>
                            {it.name_snapshot}
                          </span>
                          <span className="num text-muted-foreground">
                            {formatPrice(it.price_cents_snapshot * it.quantity, order.currency, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {creating && (
        <OfferForm
          mode="create"
          restaurantId={restaurant.id}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refreshOffers().catch(() => undefined);
          }}
        />
      )}
      {editing && (
        <OfferForm
          mode="edit"
          restaurantId={restaurant.id}
          offer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refreshOffers().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useI18n();
  const map: Record<Order['status'], 'default' | 'secondary' | 'success' | 'muted' | 'outline'> = {
    placed: 'default',
    accepted: 'secondary',
    ready: 'success',
    completed: 'muted',
    cancelled: 'outline',
  };
  return <Badge variant={map[status]}>{t(`status.${status}`)}</Badge>;
}

type OfferFormProps =
  | { mode: 'create'; restaurantId: string; onClose: () => void; onSaved: () => void }
  | { mode: 'edit'; restaurantId: string; offer: Offer; onClose: () => void; onSaved: () => void };

function OfferForm(props: OfferFormProps) {
  const { t } = useI18n();
  const existing = props.mode === 'edit' ? props.offer : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [priceEuros, setPriceEuros] = useState(existing ? (existing.price_cents / 100).toString() : '');
  const [available, setAvailable] = useState(existing ? !!existing.available : true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Partial<Offer> = {
        name,
        description: description || null,
        category: category || null,
        price_cents: Math.round(parseFloat(priceEuros || '0') * 100),
        available: available ? 1 : 0,
      };
      if (props.mode === 'create') {
        await api.createOffer(props.restaurantId, payload);
      } else {
        await api.updateOffer(props.offer.id, payload);
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
        <DialogTitle>{props.mode === 'create' ? t('offer_form.add') : t('offer_form.edit')}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label htmlFor="name">{t('offer_form.name')}</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">{t('offer_form.description')}</Label>
          <Textarea id="description" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">{t('offer_form.category')}</Label>
            <Input id="category" value={category ?? ''} onChange={(e) => setCategory(e.target.value)} placeholder={t('offer_form.category_placeholder')} />
          </div>
          <div>
            <Label htmlFor="price">{t('offer_form.price_label')}</Label>
            <Input id="price" required type="number" step="0.01" min="0" value={priceEuros} onChange={(e) => setPriceEuros(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="available" type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <Label htmlFor="available">{t('offer_form.visible')}</Label>
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
