# Plates — Restaurants Marketplace (MVP v1)

A no-commission marketplace competing with Uber Eats.
Restaurants list their menus and prices. Delivery or pickup — restaurants decide.
Plates takes 0% revenue share.

## Stack

- **web/** — React + Vite + TypeScript + Tailwind + shadcn-style UI
- **api/** — Cloudflare Worker + Hono + D1 (SQLite)
- Monorepo via pnpm workspaces

## First-time setup

```bash
pnpm install

# Create local D1 database
cd api
pnpm wrangler d1 create marketplace
# Copy the printed database_id into api/wrangler.toml under [[d1_databases]]

# Run migrations + seed (local)
pnpm db:local
pnpm seed:local
cd ..
```

## Dev

```bash
pnpm dev           # starts web (:5173) and api (:8787) in parallel
# or run them separately:
pnpm --filter api dev
pnpm --filter web dev
```

Visit http://localhost:5173.

## Deploy

- API: `cd api && pnpm deploy` (Cloudflare Workers)
- Web: build with `pnpm --filter web build`, deploy `dist/` to Cloudflare Pages
  - Set the Pages project to proxy `/api/*` to the Worker route

## Owner auth (MVP)

No password. Signed-in state is just a stored email that goes to the API in
`X-Owner-Email`. Replace with proper auth before shipping to real owners.

## Seed credentials

Three owners seeded in dev — sign in with any of these emails:
- `maria@trattoria.example`
- `kenji@sakura.example`
- `leyla@anatolia.example`
