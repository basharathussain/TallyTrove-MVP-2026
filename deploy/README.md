# TallyTrove — Ubuntu VPS deployment (test branch)

This branch deploys to the staging VPS (`109.199.121.116`) on the next set of ports
after EzTrove (12090) and DiscoveryFX (12091/12092).

## Port map on the VPS

| Service | Public port | Why exposed |
|---|---|---|
| `storefront` (customer site) | **12095** | Main entry — `http://109.199.121.116:12095` |
| `admin` (back-office)        | **12096** | Operator UI — `http://109.199.121.116:12096` |
| `backend` (FastAPI)          | **12097** | Direct API access — `http://109.199.121.116:12097/docs` |
| `db` (Postgres 15)           | —         | Internal only. Reach via `docker exec`. |

## First-time VPS setup

```bash
# As root on the VPS:
cd /opt
git clone https://github.com/basharathussain/TallyTrove-MVP-2026.git tallytrove
cd tallytrove
git checkout test

# Open ports
ufw allow 12095/tcp
ufw allow 12096/tcp
ufw allow 12097/tcp

# Create .env with real keys
cp .env.example .env
# edit .env — at minimum:
#   SECRET_KEY=$(openssl rand -hex 32)
#   SCRAPFLY_KEY=...        (optional — without it, `make index` won't work)
#   STRIPE_SECRET_KEY=...   (optional — without it, real payments simulate success)

# First build + run
./deploy/deploy.sh
```

After this, the site is reachable at **`http://109.199.121.116:12095/`** and admin at
**`http://109.199.121.116:12096/`**. Demo credentials seed on first boot:

- Storefront: `demo@tallytrove.com` / `demo123`
- Admin: `admin@tallytrove.com` / `changeme123`

## Ongoing deploys

From your Mac:
```bash
git push origin test
ssh eztrove-vps 'cd /opt/tallytrove && ./deploy/deploy.sh'
```

`deploy.sh` does: `git pull origin test` → `docker compose up -d --build` → smoke-test each port.

## Caveat: the Scrapfly scrapers sibling repo

The `backend` service in `docker-compose.yml` mounts a sibling repo:

```yaml
- ../../scrapfly-scrapers-2026:/scrapers:ro
```

This is a separate repo (`scrapfly-scrapers-2026`) that the indexer reads when you run
`make index`. **It is not cloned on the VPS by default**, so:

- The storefront, admin, and most of the backend still work without it (you can sign up, log in, browse — there'll just be no products until you index).
- If you want live indexing on the VPS, clone the scrapers repo next to `/opt/tallytrove`:
  ```bash
  cd /opt && git clone <scrapers-repo-url> scrapfly-scrapers-2026
  # then redeploy: cd /opt/tallytrove && ./deploy/deploy.sh
  ```
- If Docker complains about the missing mount path, edit `docker-compose.yml` on the
  VPS to remove the `- ../../scrapfly-scrapers-2026:/scrapers:ro` line, or replace
  it with an empty bind: `- /tmp:/scrapers:ro`.

## What's different from the `development` branch (localhost)

| Concern | `development` (localhost) | `test` (VPS) |
|---|---|---|
| storefront port | `9400:80` | `12095:80` |
| admin port | `9401:80` | `12096:80` |
| backend port | not exposed | `12097:8000` |
| Compose project name | (default) | `tallytrove` (pinned) |

## Useful one-liners

```bash
# Tail backend logs
ssh eztrove-vps 'cd /opt/tallytrove && docker compose logs -f --tail 100 backend'

# Open a psql session
ssh eztrove-vps 'docker exec -it tallytrove-db psql -U tallytrove'

# Stop / start the stack
ssh eztrove-vps 'cd /opt/tallytrove && docker compose down'
ssh eztrove-vps 'cd /opt/tallytrove && docker compose up -d'

# Force re-seed
ssh eztrove-vps 'cd /opt/tallytrove && docker compose exec backend python -m app.seed'
```

## Adding a domain + HTTPS later

Same approach as the other projects:
1. Point a domain at `109.199.121.116`
2. Switch the storefront port binding in `docker-compose.yml` from `12095:80` to `127.0.0.1:12095:80`
3. Install nginx + certbot, point the domain to the loopback port via nginx, and `certbot --nginx -d <domain>`
