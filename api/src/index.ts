import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Offer, Restaurant } from './types';
import { id, now, parseBool, slugify } from './util';
import { hashPassword, randomSaltHex, randomToken, sessionExpiresAt, verifyPassword } from './auth';

type AppContext = Context<{ Bindings: Bindings }>;

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));

app.get('/', (c) => c.json({ ok: true, service: 'restaurants-marketplace-api' }));

// --- Public: browse ---------------------------------------------------------

app.get('/api/restaurants', async (c) => {
  const city = c.req.query('city');
  const sql = city
    ? 'SELECT * FROM restaurants WHERE city = ? ORDER BY created_at DESC'
    : 'SELECT * FROM restaurants ORDER BY created_at DESC';
  const stmt = city ? c.env.DB.prepare(sql).bind(city) : c.env.DB.prepare(sql);
  const { results } = await stmt.all<Restaurant>();
  return c.json({ restaurants: results });
});

app.get('/api/restaurants/:slug', async (c) => {
  const slug = c.req.param('slug');
  const restaurant = await c.env.DB.prepare('SELECT * FROM restaurants WHERE slug = ?').bind(slug).first<Restaurant>();
  if (!restaurant) return c.json({ error: 'not_found' }, 404);
  const { results: offers } = await c.env.DB.prepare('SELECT * FROM offers WHERE restaurant_id = ? AND available = 1 ORDER BY category, name').bind(restaurant.id).all<Offer>();
  return c.json({ restaurant, offers });
});

app.get('/api/offers', async (c) => {
  const city = c.req.query('city');
  const sql = city
    ? `SELECT o.*, r.name AS restaurant_name, r.slug AS restaurant_slug, r.city, r.delivers, r.pickup
       FROM offers o JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.available = 1 AND r.city = ?
       ORDER BY o.created_at DESC LIMIT 60`
    : `SELECT o.*, r.name AS restaurant_name, r.slug AS restaurant_slug, r.city, r.delivers, r.pickup
       FROM offers o JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.available = 1
       ORDER BY o.created_at DESC LIMIT 60`;
  const stmt = city ? c.env.DB.prepare(sql).bind(city) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();
  return c.json({ offers: results });
});

// --- Public: order ----------------------------------------------------------

app.post('/api/orders', async (c) => {
  const body = await c.req.json<{
    restaurant_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    fulfillment: 'delivery' | 'pickup';
    address?: string;
    note?: string;
    items: { offer_id: string; quantity: number }[];
  }>();

  if (!body.restaurant_id || !body.customer_name || !body.customer_phone || !body.fulfillment || !Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  if (body.fulfillment === 'delivery' && !body.address) {
    return c.json({ error: 'address_required_for_delivery' }, 400);
  }

  const restaurant = await c.env.DB.prepare('SELECT * FROM restaurants WHERE id = ?').bind(body.restaurant_id).first<Restaurant>();
  if (!restaurant) return c.json({ error: 'restaurant_not_found' }, 404);
  if (body.fulfillment === 'delivery' && !restaurant.delivers) {
    return c.json({ error: 'restaurant_does_not_deliver' }, 400);
  }

  const offerIds = body.items.map((i) => i.offer_id);
  const placeholders = offerIds.map(() => '?').join(',');
  const { results: offers } = await c.env.DB.prepare(
    `SELECT * FROM offers WHERE restaurant_id = ? AND available = 1 AND id IN (${placeholders})`,
  )
    .bind(restaurant.id, ...offerIds)
    .all<Offer>();

  if (offers.length !== offerIds.length) {
    return c.json({ error: 'invalid_items' }, 400);
  }

  const offerMap = new Map(offers.map((o) => [o.id, o]));
  let total = 0;
  for (const item of body.items) {
    const offer = offerMap.get(item.offer_id);
    if (!offer || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      return c.json({ error: 'invalid_quantity' }, 400);
    }
    total += offer.price_cents * item.quantity;
  }
  if (body.fulfillment === 'delivery') total += restaurant.delivery_fee_cents;

  const orderId = id('ord');
  const createdAt = now();

  const stmts: D1PreparedStatement[] = [];
  stmts.push(
    c.env.DB.prepare(
      `INSERT INTO orders (id, restaurant_id, customer_name, customer_phone, customer_email, fulfillment, address, note, total_cents, currency, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?)`,
    ).bind(
      orderId,
      restaurant.id,
      body.customer_name,
      body.customer_phone,
      body.customer_email ?? null,
      body.fulfillment,
      body.address ?? null,
      body.note ?? null,
      total,
      offers[0].currency,
      createdAt,
    ),
  );
  for (const item of body.items) {
    const offer = offerMap.get(item.offer_id)!;
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO order_items (id, order_id, offer_id, name_snapshot, price_cents_snapshot, quantity) VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(id('oit'), orderId, offer.id, offer.name, offer.price_cents, item.quantity),
    );
  }
  await c.env.DB.batch(stmts);

  return c.json({ order_id: orderId, total_cents: total, currency: offers[0].currency, status: 'placed' });
});

// --- Owner auth (email + password, opaque session tokens) -------------------

type OwnerRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  password_salt: string | null;
};

async function requireOwner(c: AppContext): Promise<{ owner?: { id: string; email: string; name: string }; error?: Response }> {
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) return { error: c.json({ error: 'missing_token' }, 401) };
  const token = header.slice(7);
  const row = await c.env.DB.prepare(
    `SELECT o.id, o.email, o.name, s.expires_at FROM sessions s JOIN owners o ON o.id = s.owner_id WHERE s.token = ?`,
  ).bind(token).first<{ id: string; email: string; name: string; expires_at: number }>();
  if (!row) return { error: c.json({ error: 'invalid_token' }, 401) };
  if (row.expires_at < now()) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return { error: c.json({ error: 'expired_token' }, 401) };
  }
  return { owner: { id: row.id, email: row.email, name: row.name } };
}

async function createSession(c: AppContext, ownerId: string): Promise<{ token: string; expires_at: number }> {
  const token = randomToken();
  const createdAt = now();
  const expiresAt = sessionExpiresAt(createdAt);
  await c.env.DB.prepare('INSERT INTO sessions (token, owner_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(token, ownerId, createdAt, expiresAt).run();
  return { token, expires_at: expiresAt };
}

// Sign up. If email exists but has no password yet (legacy row), set the password.
app.post('/api/owners/signup', async (c) => {
  const body = await c.req.json<{ email: string; name: string; password: string }>();
  if (!body.email || !body.name || !body.password) return c.json({ error: 'missing_fields' }, 400);
  if (body.password.length < 8) return c.json({ error: 'password_too_short' }, 400);

  const existing = await c.env.DB.prepare('SELECT id, email, name, password_hash FROM owners WHERE email = ?')
    .bind(body.email).first<Pick<OwnerRow, 'id' | 'email' | 'name' | 'password_hash'>>();

  const salt = randomSaltHex();
  const hash = await hashPassword(body.password, salt);

  let ownerId: string;
  let ownerName: string;
  let ownerEmail: string;
  if (existing) {
    if (existing.password_hash) return c.json({ error: 'email_already_registered' }, 409);
    await c.env.DB.prepare('UPDATE owners SET password_hash = ?, password_salt = ?, name = ? WHERE id = ?')
      .bind(hash, salt, body.name, existing.id).run();
    ownerId = existing.id;
    ownerName = body.name;
    ownerEmail = existing.email;
  } else {
    ownerId = id('own');
    await c.env.DB.prepare('INSERT INTO owners (id, email, name, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(ownerId, body.email, body.name, hash, salt, now()).run();
    ownerName = body.name;
    ownerEmail = body.email;
  }

  const session = await createSession(c, ownerId);
  return c.json({ token: session.token, expires_at: session.expires_at, owner: { id: ownerId, email: ownerEmail, name: ownerName } });
});

app.post('/api/owners/signin', async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  if (!body.email || !body.password) return c.json({ error: 'missing_fields' }, 400);

  const row = await c.env.DB.prepare('SELECT id, email, name, password_hash, password_salt FROM owners WHERE email = ?')
    .bind(body.email).first<OwnerRow>();
  if (!row) return c.json({ error: 'invalid_credentials' }, 401);
  if (!row.password_hash || !row.password_salt) return c.json({ error: 'password_not_set' }, 403);

  const ok = await verifyPassword(body.password, row.password_salt, row.password_hash);
  if (!ok) return c.json({ error: 'invalid_credentials' }, 401);

  const session = await createSession(c, row.id);
  return c.json({ token: session.token, expires_at: session.expires_at, owner: { id: row.id, email: row.email, name: row.name } });
});

app.post('/api/owners/signout', async (c) => {
  const header = c.req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(header.slice(7)).run();
  }
  return c.json({ ok: true });
});

app.get('/api/owner/me', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  return c.json({ owner });
});

app.get('/api/owner/restaurants', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const { results } = await c.env.DB.prepare('SELECT * FROM restaurants WHERE owner_id = ? ORDER BY created_at DESC').bind(owner!.id).all<Restaurant>();
  return c.json({ restaurants: results });
});

app.post('/api/owner/restaurants', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const body = await c.req.json<Partial<Restaurant>>();
  if (!body.name || !body.cuisine || !body.address || !body.city) return c.json({ error: 'missing_fields' }, 400);

  let slug = slugify(body.name);
  const existing = await c.env.DB.prepare('SELECT id FROM restaurants WHERE slug = ?').bind(slug).first();
  if (existing) slug = `${slug}-${id('x').slice(2, 6).toLowerCase()}`;

  const rid = id('res');
  await c.env.DB.prepare(
    `INSERT INTO restaurants (id, owner_id, name, slug, cuisine, address, city, phone, description, delivers, delivery_fee_cents, delivery_radius_km, pickup, image_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      rid,
      owner!.id,
      body.name,
      slug,
      body.cuisine,
      body.address,
      body.city,
      body.phone ?? null,
      body.description ?? null,
      parseBool(body.delivers),
      body.delivery_fee_cents ?? 0,
      body.delivery_radius_km ?? 0,
      body.pickup === undefined ? 1 : parseBool(body.pickup),
      body.image_url ?? null,
      now(),
    )
    .run();
  const created = await c.env.DB.prepare('SELECT * FROM restaurants WHERE id = ?').bind(rid).first<Restaurant>();
  return c.json({ restaurant: created });
});

app.patch('/api/owner/restaurants/:id', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const rid = c.req.param('id');
  const current = await c.env.DB.prepare('SELECT * FROM restaurants WHERE id = ? AND owner_id = ?').bind(rid, owner!.id).first<Restaurant>();
  if (!current) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json<Partial<Restaurant>>();
  const next = {
    name: body.name ?? current.name,
    cuisine: body.cuisine ?? current.cuisine,
    address: body.address ?? current.address,
    city: body.city ?? current.city,
    phone: body.phone ?? current.phone,
    description: body.description ?? current.description,
    delivers: body.delivers === undefined ? current.delivers : parseBool(body.delivers),
    delivery_fee_cents: body.delivery_fee_cents ?? current.delivery_fee_cents,
    delivery_radius_km: body.delivery_radius_km ?? current.delivery_radius_km,
    pickup: body.pickup === undefined ? current.pickup : parseBool(body.pickup),
    image_url: body.image_url ?? current.image_url,
  };
  await c.env.DB.prepare(
    `UPDATE restaurants SET name=?, cuisine=?, address=?, city=?, phone=?, description=?, delivers=?, delivery_fee_cents=?, delivery_radius_km=?, pickup=?, image_url=? WHERE id = ?`,
  )
    .bind(next.name, next.cuisine, next.address, next.city, next.phone, next.description, next.delivers, next.delivery_fee_cents, next.delivery_radius_km, next.pickup, next.image_url, rid)
    .run();
  const updated = await c.env.DB.prepare('SELECT * FROM restaurants WHERE id = ?').bind(rid).first<Restaurant>();
  return c.json({ restaurant: updated });
});

app.get('/api/owner/restaurants/:id/offers', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const rid = c.req.param('id');
  const restaurant = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?').bind(rid, owner!.id).first();
  if (!restaurant) return c.json({ error: 'not_found' }, 404);
  const { results } = await c.env.DB.prepare('SELECT * FROM offers WHERE restaurant_id = ? ORDER BY category, name').bind(rid).all<Offer>();
  return c.json({ offers: results });
});

app.post('/api/owner/restaurants/:id/offers', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const rid = c.req.param('id');
  const restaurant = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?').bind(rid, owner!.id).first();
  if (!restaurant) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json<Partial<Offer>>();
  if (!body.name || typeof body.price_cents !== 'number' || body.price_cents < 0) return c.json({ error: 'missing_fields' }, 400);
  const oid = id('off');
  await c.env.DB.prepare(
    `INSERT INTO offers (id, restaurant_id, name, description, price_cents, currency, category, image_url, available, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(oid, rid, body.name, body.description ?? null, body.price_cents, body.currency ?? 'EUR', body.category ?? null, body.image_url ?? null, body.available === undefined ? 1 : parseBool(body.available), now())
    .run();
  const created = await c.env.DB.prepare('SELECT * FROM offers WHERE id = ?').bind(oid).first<Offer>();
  return c.json({ offer: created });
});

app.patch('/api/owner/offers/:id', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const oid = c.req.param('id');
  const current = await c.env.DB.prepare(
    `SELECT o.* FROM offers o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ? AND r.owner_id = ?`,
  ).bind(oid, owner!.id).first<Offer>();
  if (!current) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json<Partial<Offer>>();
  const next = {
    name: body.name ?? current.name,
    description: body.description ?? current.description,
    price_cents: body.price_cents ?? current.price_cents,
    currency: body.currency ?? current.currency,
    category: body.category ?? current.category,
    image_url: body.image_url ?? current.image_url,
    available: body.available === undefined ? current.available : parseBool(body.available),
  };
  await c.env.DB.prepare(
    `UPDATE offers SET name=?, description=?, price_cents=?, currency=?, category=?, image_url=?, available=? WHERE id = ?`,
  )
    .bind(next.name, next.description, next.price_cents, next.currency, next.category, next.image_url, next.available, oid)
    .run();
  const updated = await c.env.DB.prepare('SELECT * FROM offers WHERE id = ?').bind(oid).first<Offer>();
  return c.json({ offer: updated });
});

app.delete('/api/owner/offers/:id', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const oid = c.req.param('id');
  const current = await c.env.DB.prepare(
    `SELECT o.id FROM offers o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ? AND r.owner_id = ?`,
  ).bind(oid, owner!.id).first();
  if (!current) return c.json({ error: 'not_found' }, 404);
  await c.env.DB.prepare('DELETE FROM offers WHERE id = ?').bind(oid).run();
  return c.json({ ok: true });
});

app.get('/api/owner/restaurants/:id/orders', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const rid = c.req.param('id');
  const restaurant = await c.env.DB.prepare('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?').bind(rid, owner!.id).first();
  if (!restaurant) return c.json({ error: 'not_found' }, 404);
  const { results: orders } = await c.env.DB.prepare('SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC LIMIT 100').bind(rid).all();
  const orderIds = (orders as { id: string }[]).map((o) => o.id);
  let items: unknown[] = [];
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    const { results } = await c.env.DB.prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders})`).bind(...orderIds).all();
    items = results;
  }
  return c.json({ orders, items });
});

app.patch('/api/owner/orders/:id', async (c) => {
  const { owner, error } = await requireOwner(c);
  if (error) return error;
  const oid = c.req.param('id');
  const current = await c.env.DB.prepare(
    `SELECT o.* FROM orders o JOIN restaurants r ON r.id = o.restaurant_id WHERE o.id = ? AND r.owner_id = ?`,
  ).bind(oid, owner!.id).first();
  if (!current) return c.json({ error: 'not_found' }, 404);
  const body = await c.req.json<{ status?: string }>();
  if (!body.status || !['placed', 'accepted', 'ready', 'completed', 'cancelled'].includes(body.status)) {
    return c.json({ error: 'invalid_status' }, 400);
  }
  await c.env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, oid).run();
  const updated = await c.env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(oid).first();
  return c.json({ order: updated });
});

export default app;
