import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Offer } from './api';

export type CartLine = {
  offer: Offer;
  quantity: number;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
};

type CartState = {
  lines: CartLine[];
  restaurantId: string | null;
};

type CartCtx = {
  lines: CartLine[];
  restaurantId: string | null;
  add: (offer: Offer, restaurant: { id: string; name: string; slug: string }) => void;
  dec: (offerId: string) => void;
  remove: (offerId: string) => void;
  clear: () => void;
  totalCents: number;
  itemCount: number;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = 'cart.v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as CartState;
    } catch {
      // ignore corrupted cart
    }
    return { lines: [], restaurantId: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const add = useCallback<CartCtx['add']>((offer, restaurant) => {
    setState((prev) => {
      if (prev.restaurantId && prev.restaurantId !== restaurant.id) {
        if (!confirm('Your cart has items from another restaurant. Clear it and start fresh?')) {
          return prev;
        }
        return {
          restaurantId: restaurant.id,
          lines: [{ offer, quantity: 1, restaurant_id: restaurant.id, restaurant_name: restaurant.name, restaurant_slug: restaurant.slug }],
        };
      }
      const existing = prev.lines.find((l) => l.offer.id === offer.id);
      if (existing) {
        return {
          restaurantId: restaurant.id,
          lines: prev.lines.map((l) => (l.offer.id === offer.id ? { ...l, quantity: l.quantity + 1 } : l)),
        };
      }
      return {
        restaurantId: restaurant.id,
        lines: [...prev.lines, { offer, quantity: 1, restaurant_id: restaurant.id, restaurant_name: restaurant.name, restaurant_slug: restaurant.slug }],
      };
    });
  }, []);

  const dec = useCallback<CartCtx['dec']>((offerId) => {
    setState((prev) => {
      const line = prev.lines.find((l) => l.offer.id === offerId);
      if (!line) return prev;
      if (line.quantity <= 1) {
        const lines = prev.lines.filter((l) => l.offer.id !== offerId);
        return { lines, restaurantId: lines.length ? prev.restaurantId : null };
      }
      return {
        restaurantId: prev.restaurantId,
        lines: prev.lines.map((l) => (l.offer.id === offerId ? { ...l, quantity: l.quantity - 1 } : l)),
      };
    });
  }, []);

  const remove = useCallback<CartCtx['remove']>((offerId) => {
    setState((prev) => {
      const lines = prev.lines.filter((l) => l.offer.id !== offerId);
      return { lines, restaurantId: lines.length ? prev.restaurantId : null };
    });
  }, []);

  const clear = useCallback(() => setState({ lines: [], restaurantId: null }), []);

  const totalCents = useMemo(() => state.lines.reduce((sum, l) => sum + l.offer.price_cents * l.quantity, 0), [state.lines]);
  const itemCount = useMemo(() => state.lines.reduce((sum, l) => sum + l.quantity, 0), [state.lines]);

  const value: CartCtx = { lines: state.lines, restaurantId: state.restaurantId, add, dec, remove, clear, totalCents, itemCount };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
