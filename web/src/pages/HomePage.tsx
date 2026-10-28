import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Truck, ShoppingBag } from 'lucide-react';
import { api, type OfferWithRestaurant, type Restaurant } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [offers, setOffers] = useState<OfferWithRestaurant[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listRestaurants(), api.listOffers()])
      .then(([r, o]) => {
        setRestaurants(r.restaurants);
        setOffers(o.offers);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRestaurants = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return restaurants;
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q),
    );
  }, [restaurants, query]);

  const filteredOffers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.restaurant_name.toLowerCase().includes(q) ||
        (o.category ?? '').toLowerCase().includes(q),
    );
  }, [offers, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10">
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Order direct from local restaurants.
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Browse real menus, see real prices. The restaurant delivers or you pick up —
          they decide. Plates takes 0% commission, so the price you see is the price they get.
        </p>
        <div className="mt-6 max-w-md">
          <Input
            placeholder="Search restaurants, dishes, cuisine…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </section>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {!loading && (
        <>
          <section className="mb-12">
            <h2 className="mb-4 text-xl font-semibold">Restaurants</h2>
            {filteredRestaurants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No restaurants match your search.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRestaurants.map((r) => (
                  <Link key={r.id} to={`/r/${r.slug}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle>{r.name}</CardTitle>
                          <Badge variant="secondary">{r.cuisine}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {r.city}
                        </div>
                        {r.description && <p className="line-clamp-2 text-muted-foreground">{r.description}</p>}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {r.pickup ? <Badge variant="muted"><ShoppingBag className="mr-1 h-3 w-3" />Pickup</Badge> : null}
                          {r.delivers ? (
                            <Badge variant="muted">
                              <Truck className="mr-1 h-3 w-3" />
                              Delivery · <span className="num ml-1">{formatPrice(r.delivery_fee_cents, 'EUR')}</span>
                            </Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Popular dishes</h2>
            {filteredOffers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dishes match your search.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOffers.slice(0, 12).map((o) => (
                  <Link key={o.id} to={`/r/${o.restaurant_slug}`}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{o.name}</CardTitle>
                          <span className="num shrink-0 text-base font-semibold">
                            {formatPrice(o.price_cents, o.currency)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="text-muted-foreground">{o.restaurant_name}</div>
                        {o.description && <p className="line-clamp-2 text-muted-foreground">{o.description}</p>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
