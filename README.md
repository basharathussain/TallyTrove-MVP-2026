# TallyTrove MVP

Transparent sourcing platform — AliExpress sourcing, US + UK regions, itemized pricing on every cart.

---

## Quick start

```bash
cp .env.example .env       # fill in SCRAPFLY_KEY and STRIPE_* keys
make build                 # build images
make up                    # start db + backend + storefront + admin
make index                 # populate catalog (takes ~5-10 min on free Scrapfly)
make open                  # opens storefront + admin in browser
```

---

## Services

| Container | Host port | Internal | Purpose |
|---|---|---|---|
| `tallytrove-db` | — | 5432 | PostgreSQL 15 |
| `tallytrove-backend` | — | 8000 | FastAPI + workers |
| `tallytrove-storefront` | **9400** | 80 | Customer site (React + Vite) |
| `tallytrove-admin` | **9401** | 80 | Back-office (React + Vite) |

## URLs

> **Note on ports:** the `test` branch uses VPS ports (`12095` storefront, `12096` admin, `12097` backend).
> The `main` and `development` branches use the original localhost ports (`9400` / `9401`).
> Numbers below assume the branch you've checked out.

### Localhost (main / development branches)

| Surface | URL | Credentials |
|---|---|---|
| **Storefront** | http://localhost:9400 | demo@tallytrove.com / demo123 |
| **Admin** | http://localhost:9401 | admin@tallytrove.com / changeme123 |

### Test server (test branch deployed to staging VPS)

| Surface | URL | Credentials |
|---|---|---|
| **Storefront** | http://109.199.121.116:12095 | demo@tallytrove.com / demo123 |
| **Admin** | http://109.199.121.116:12096 | admin@tallytrove.com / changeme123 |
| **API docs** | http://109.199.121.116:12097/docs | — |

Deploy workflow (from your Mac, after `git push origin test`):
```bash
ssh eztrove-vps 'cd /opt/tallytrove && ./deploy/deploy.sh'
```

Full VPS setup details: see [`deploy/README.md`](./deploy/README.md).

---

## The Three Layers in action

```
┌─ Layer 1 ── Background indexer (`make index`) ──┐
│   Scrapfly → AliExpress → upserts products      │
│   Writes shipping rows for US + GB regions      │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌─ Layer 2 ── Customer search ────────────────────┐
│   Postgres FTS (search_vector + GIN index)       │
│   No vendor calls — <100ms                       │
│   Returns itemized pricing in user's currency    │
└──────────────────────────────────────────────────┘
                       │
                       ▼
┌─ Layer 3 ── Pre-checkout verification ──────────┐
│   ONE live Scrapfly call per product            │
│   Drift > 2% → CONFIRMATION_REQUIRED            │
│   Every check logged to verification_history    │
└──────────────────────────────────────────────────┘
                       │
                       ▼
              Stripe PaymentIntent (test mode)
                       │
                       ▼
         vendor_orders created (status=Sourcing)
                       │
                       ▼
         Operator manually places on AliExpress
         using the captured snapshot in admin UI
```

---

## Make commands

```bash
make build      # build all images
make up         # start all containers
make down       # stop
make restart    # down + up
make logs       # tail backend
make ps         # container status
make seed       # idempotent: regions + vendor + admin + demo customer + system_settings
make index      # run the indexer (~50 seed terms × 30 products)
make fx         # refresh USD→GBP rate from exchangerate-api
make open       # opens both apps in browser
```

---

## End-to-end happy path (manual demo)

1. `make up` → wait for backend healthcheck
2. `make index` → populates ~1500 products (uses Scrapfly credits)
3. Open http://localhost:9400 — browse trending, search "earbuds"
4. Click any product → "Add to cart" → "View cart" → "Authorize Agent Checkout"
5. Log in as `demo@tallytrove.com` / `demo123`
6. Fill shipping address → "Continue"
7. Watch for the L3 verification (Scrapfly call). If drift > 2% you'll see the confirmation step
8. Click "Confirm payment" (Stripe is wired but MVP simulates success)
9. View your order at `/orders/<uuid>` — full transparent invoice
10. Open admin http://localhost:9401 as `admin@tallytrove.com` / `changeme123`
11. **Vendor Orders** → click the PO → see the customer's address + supplier URL
12. Open AliExpress (link in the panel), place the actual order manually
13. Paste the supplier order ID and tracking number → save
14. Append shipment timeline entries → customer sees them at `/orders/<uuid>`

---

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `SCRAPFLY_KEY` | ✅ | Catalog indexer + Layer 3 verification |
| `STRIPE_SECRET_KEY` | optional | Real PaymentIntents (test mode keys work) |
| `STRIPE_PUBLISHABLE_KEY` | optional | Frontend Stripe Elements (not yet wired in MVP) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✅ | Seeded admin account |
| `DEMO_CUSTOMER_EMAIL` / `DEMO_CUSTOMER_PASSWORD` | ✅ | Seeded demo customer |
| `DRIFT_THRESHOLD` | default 0.02 | % drift that triggers `CONFIRMATION_REQUIRED` at L3 |
| `DEFAULT_FX_USD_GBP` | default 0.79 | Used before first `make fx` succeeds |

---

## Tech choices (and why)

| Choice | Rationale |
|---|---|
| **React + Vite** (both apps) | MVP velocity. Spec mandates Angular SSR; can migrate storefront to Next.js for SEO before paid-search scaling. Admin doesn't need SEO. |
| **Postgres FTS** (not Meilisearch) | One fewer service to run; good enough for <100k SKUs. |
| **Single payment flow** (Stripe test) | Wired but simulated success for MVP demo; replace `confirm-payment` with webhook before going live. |
| **All USD storage, convert at boundary** | Single source of truth; no rounding drift between tables; FX changes don't rewrite history. |
| **Operator-driven vendor placement** | AliExpress automated checkout is genuinely fragile (anti-bot, 3DS, CAPTCHAs). Manual placement with the L3 snapshot is the right MVP trade-off. |
