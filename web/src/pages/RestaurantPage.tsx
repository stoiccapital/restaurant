import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Truck, ShoppingBag, Plus } from 'lucide-react';
import { api, type Offer, type Restaurant } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RestaurantPage({ onCartOpen }: { onCartOpen: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { add } = useCart();

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.getRestaurant(slug)
      .then((res) => {
        setRestaurant(res.restaurant);
        setOffers(res.offers);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Offer[]>();
    for (const o of offers) {
      const key = o.category ?? 'Other';
      const list = groups.get(key) ?? [];
      list.push(o);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [offers]);

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">Loading…</div>;
  if (error) return <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-destructive">{error}</div>;
  if (!restaurant) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">← Back to browse</Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
            <Badge variant="secondary">{restaurant.cuisine}</Badge>
          </div>
          {restaurant.description && (
            <p className="max-w-xl text-sm text-muted-foreground">{restaurant.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{restaurant.address}, {restaurant.city}</span>
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1.5 hover:underline">
                <Phone className="h-3.5 w-3.5" />
                <span className="num">{restaurant.phone}</span>
              </a>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {restaurant.pickup ? <Badge variant="muted"><ShoppingBag className="mr-1 h-3 w-3" />Pickup available</Badge> : null}
            {restaurant.delivers ? (
              <Badge variant="muted">
                <Truck className="mr-1 h-3 w-3" />
                Delivery · <span className="num ml-1">{formatPrice(restaurant.delivery_fee_cents, 'EUR')}</span>
                {restaurant.delivery_radius_km > 0 && (
                  <span className="num ml-1 text-muted-foreground">· {restaurant.delivery_radius_km} km</span>
                )}
              </Badge>
            ) : (
              <Badge variant="outline">Pickup only</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {grouped.length === 0 ? (
          <p className="text-sm text-muted-foreground">No offers available right now.</p>
        ) : (
          grouped.map(([category, items]) => (
            <section key={category}>
              <h2 className="mb-3 text-lg font-semibold">{category}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((o) => (
                  <Card key={o.id}>
                    <CardContent className="flex items-start justify-between gap-3 p-4">
                      <div className="flex-1">
                        <div className="font-medium">{o.name}</div>
                        {o.description && <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>}
                        <div className="num mt-2 text-sm font-semibold">{formatPrice(o.price_cents, o.currency)}</div>
                      </div>
                      <Button
                        size="icon"
                        onClick={() => {
                          add(o, { id: restaurant.id, name: restaurant.name, slug: restaurant.slug });
                          onCartOpen();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
