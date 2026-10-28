import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, type Restaurant } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RestaurantForm } from './RestaurantForm';
import { RestaurantManager } from './RestaurantManager';

type Owner = { id: string; email: string; name: string };

export function OwnerDashboard({ owner, onSignOut }: { owner: Owner; onSignOut: () => void }) {
  const { t } = useI18n();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);

  async function refresh() {
    setLoading(true);
    const r = await api.ownerRestaurants();
    setRestaurants(r.restaurants);
    setLoading(false);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  if (selected) {
    return (
      <RestaurantManager
        restaurant={selected}
        onBack={() => {
          setSelected(null);
          refresh().catch(() => undefined);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('owner.welcome', { name: owner.name })}</h1>
          <p className="text-sm text-muted-foreground">{owner.email}</p>
        </div>
        <Button variant="ghost" onClick={onSignOut}>{t('owner.sign_out')}</Button>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('owner.your_restaurants')}</h2>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" />
          {t('owner.add_restaurant')}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('owner.no_restaurants_yet')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{r.name}</CardTitle>
                  <Badge variant="secondary">{r.cuisine}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-muted-foreground">{r.address}, {r.city}</div>
                <div className="flex flex-wrap gap-2">
                  {r.pickup ? <Badge variant="muted">{t('fulfillment.pickup')}</Badge> : null}
                  {r.delivers ? <Badge variant="muted">{t('fulfillment.delivery')}</Badge> : null}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(r)}>{t('common.edit')}</Button>
                  <Button size="sm" onClick={() => setSelected(r)}>{t('owner.manage')}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <RestaurantForm
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            refresh().catch(() => undefined);
          }}
        />
      )}
      {editing && (
        <RestaurantForm
          mode="edit"
          restaurant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh().catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}
