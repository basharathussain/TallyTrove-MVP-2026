"""
Layer 1 — Background Indexer.
Crawls AliExpress for seed terms, upserts into `products`, writes shipping rows per region.
Run via: docker compose exec backend python -m app.workers.indexer
"""
import asyncio
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.database import AsyncSessionLocal
from app.models import Product, ProductShipping, Vendor, Region
from app.services import scrapers


# Top-50 seed terms for US trending dropshipping categories
SEED_TERMS = [
    "wireless earbuds", "phone case", "smart watch", "bluetooth speaker",
    "led strip lights", "car phone holder", "yoga mat", "resistance bands",
    "kitchen gadgets", "silicone baking mat", "reusable water bottle",
    "blue light glasses", "magnetic charger", "wireless mouse",
    "mechanical keyboard", "desk lamp", "phone tripod", "ring light",
    "dog harness", "cat toy", "pet brush", "succulent planter",
    "wall art canvas", "throw blanket", "essential oil diffuser",
    "scented candles", "facial roller", "makeup brush set",
    "hair clips", "hair growth serum", "running shoes", "yoga pants",
    "sports bra", "fitness tracker", "jump rope", "foam roller",
    "shower head", "bath bomb", "hair towel", "silicone scrubber",
    "gaming headset", "rgb mouse pad", "ssd drive", "usb hub",
    "travel pillow", "luggage tag", "passport holder", "money belt",
    "kids toys", "board game",
]


async def index_seed_terms(max_per_term: int = 30):
    async with AsyncSessionLocal() as db:
        vendor = (await db.execute(select(Vendor).where(Vendor.name == "AliExpress"))).scalar_one_or_none()
        if not vendor:
            print("[indexer] No AliExpress vendor — run `make seed` first.")
            return

        regions = (await db.execute(select(Region).where(Region.is_active == True))).scalars().all()
        if not regions:
            print("[indexer] No regions — run `make seed` first.")
            return

        total = 0
        for term in SEED_TERMS:
            scraped = await scrapers.search_aliexpress(term, max_results=max_per_term)
            now = datetime.utcnow()
            for item in scraped:
                stmt = pg_insert(Product).values(
                    vendor_id=vendor.id,
                    external_product_id=item["external_product_id"],
                    title=item["title"],
                    description=item["description"],
                    image_urls=item["images"],
                    category_path=item["category_path"],
                    source_url=item["source_url"],
                    cost_snapshot=Decimal(str(item["price_usd"])),
                    in_stock=item["in_stock"],
                    last_verified_at=now,
                    verification_outcome="Verified",
                ).on_conflict_do_update(
                    index_elements=["vendor_id", "external_product_id"],
                    set_={
                        "title": item["title"],
                        "image_urls": item["images"],
                        "cost_snapshot": Decimal(str(item["price_usd"])),
                        "in_stock": item["in_stock"],
                        "last_verified_at": now,
                        "verification_outcome": "Verified",
                        "updated_at": now,
                    },
                ).returning(Product.id)
                result = await db.execute(stmt)
                pid = result.scalar_one()

                # Per-region shipping
                for region in regions:
                    cost = item["shipping_us_usd"] if region.code == "US" else item["shipping_gb_usd"]
                    ship_stmt = pg_insert(ProductShipping).values(
                        product_id=pid,
                        region_code=region.code,
                        shipping_cost_usd=Decimal(str(cost)),
                    ).on_conflict_do_update(
                        index_elements=["product_id", "region_code"],
                        set_={"shipping_cost_usd": Decimal(str(cost))},
                    )
                    await db.execute(ship_stmt)
                total += 1
            await db.commit()
            print(f"[indexer] {term}: {len(scraped)} indexed")

        print(f"[indexer] DONE — {total} products across {len(SEED_TERMS)} seed terms")


if __name__ == "__main__":
    asyncio.run(index_seed_terms())
