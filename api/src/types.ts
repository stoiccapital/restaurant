export type Bindings = {
  DB: D1Database;
  ENV: string;
};

export type Owner = {
  id: string;
  email: string;
  name: string;
  created_at: number;
};

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
