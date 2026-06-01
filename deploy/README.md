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

## The Scrapfly scrapers sibling repo

The `backend` service mounts a separate repo (`scrapfly-scrapers-2026`) at `/scrapers`.
The host path is env-driven via `SCRAPERS_HOST_PATH` — set it to an absolute path
on the VPS:

```bash
# 1. Clone the scrapers repo to the canonical VPS location
cd /opt
git clone https://github.com/basharathussain/scrapfly-scrapers-2026.git

# 2. Point the .env at it (the .env.example has this commented out — uncomment)
echo "SCRAPERS_HOST_PATH=/opt/scrapfly-scrapers-2026" >> /opt/tallytrove/.env

# 3. Redeploy
cd /opt/tallytrove && ./deploy/deploy.sh
```

Without this:
- Docker will fail to start the backend (missing mount path).

If you want to skip indexing entirely (catalog stays empty — storefront/admin/auth still work):
```bash
echo "SCRAPERS_HOST_PATH=/tmp" >> /opt/tallytrove/.env
```
Pointing the mount at `/tmp` satisfies the bind requirement; the backend just won't find scrapers.

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
