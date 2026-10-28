export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  cuisine: string;
  address: string;
  city: string;
  phone: string | null;
  description: string | null;
  delivers: number;
  delivery_fee_cents: number;
  delivery_radius_km: number;
  pickup: number;
  image_url: string | null;
  created_at: number;
};

export type Offer = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  category: string | null;
  image_url: string | null;
  available: number;
  created_at: number;
};

export type OfferWithRestaurant = Offer & {
  restaurant_name: string;
  restaurant_slug: string;
  city: string;
  delivers: number;
  pickup: number;
};

export type Order = {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment: 'delivery' | 'pickup';
  address: string | null;
  note: string | null;
  total_cents: number;
  currency: string;
  status: 'placed' | 'accepted' | 'ready' | 'completed' | 'cancelled';
  created_at: number;
};

export type OrderItem = {
  id: string;
  order_id: string;
  offer_id: string;
  name_snapshot: string;
  price_cents_snapshot: number;
  quantity: number;
};

const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api`;
const TOKEN_KEY = 'ownerToken';

export const session = {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('ownerEmail'); // clear legacy key
  },
};

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  const token = session.token;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'request_failed' }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listRestaurants: (city?: string) =>
    req<{ restaurants: Restaurant[] }>(`/restaurants${city ? `?city=${encodeURIComponent(city)}` : ''}`),

  getRestaurant: (slug: string) =>
    req<{ restaurant: Restaurant; offers: Offer[] }>(`/restaurants/${slug}`),

  listOffers: (city?: string) =>
    req<{ offers: OfferWithRestaurant[] }>(`/offers${city ? `?city=${encodeURIComponent(city)}` : ''}`),

  placeOrder: (payload: {
    restaurant_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    fulfillment: 'delivery' | 'pickup';
    address?: string;
    note?: string;
    items: { offer_id: string; quantity: number }[];
  }) =>
    req<{ order_id: string; total_cents: number; currency: string; status: string }>(`/orders`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  signUpOwner: (email: string, name: string, password: string) =>
    req<{ token: string; expires_at: number; owner: { id: string; email: string; name: string } }>(`/owners/signup`, {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),

  signInOwner: (email: string, password: string) =>
    req<{ token: string; expires_at: number; owner: { id: string; email: string; name: string } }>(`/owners/signin`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signOutOwner: () =>
    req<{ ok: boolean }>(`/owners/signout`, { method: 'POST' }),

  me: () => req<{ owner: { id: string; email: string; name: string } }>(`/owner/me`),

  ownerRestaurants: () =>
    req<{ restaurants: Restaurant[] }>(`/owner/restaurants`),

  createRestaurant: (payload: Partial<Restaurant>) =>
    req<{ restaurant: Restaurant }>(`/owner/restaurants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateRestaurant: (id: string, payload: Partial<Restaurant>) =>
    req<{ restaurant: Restaurant }>(`/owner/restaurants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  ownerOffers: (restaurantId: string) =>
    req<{ offers: Offer[] }>(`/owner/restaurants/${restaurantId}/offers`),

  createOffer: (restaurantId: string, payload: Partial<Offer>) =>
    req<{ offer: Offer }>(`/owner/restaurants/${restaurantId}/offers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateOffer: (id: string, payload: Partial<Offer>) =>
    req<{ offer: Offer }>(`/owner/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteOffer: (id: string) =>
    req<{ ok: boolean }>(`/owner/offers/${id}`, { method: 'DELETE' }),

  ownerOrders: (restaurantId: string) =>
    req<{ orders: Order[]; items: OrderItem[] }>(`/owner/restaurants/${restaurantId}/orders`),

  updateOrderStatus: (id: string, status: Order['status']) =>
    req<{ order: Order }>(`/owner/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};
