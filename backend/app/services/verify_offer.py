"""
Layer 3 — Pre-Checkout Verification.
Live-fetches the vendor's current price + stock for ONE product,
logs the check, and returns a verdict the checkout router can act on.
"""
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Product, ProductVerificationHistory
from app.services import scrapers
from app.config import settings


async def verify_offer(product_id: str, db: AsyncSession, triggered_by: str = "checkout") -> dict:
    product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not product:
        return {"outcome": "OfferGone", "snapshot_cost": None, "live_cost": None,
                "drift_pct": None, "in_stock": False, "verified_at": datetime.utcnow().isoformat()}

    live = await scrapers.fetch_aliexpress_product(product.source_url)
    live_cost = live.get("price")
    in_stock_live = live.get("in_stock")

    snapshot = float(product.cost_snapshot)

    if live_cost is None:
        outcome, drift_pct = "ScrapeFailed", None
    elif not in_stock_live:
        outcome, drift_pct = "OutOfStock", None
    else:
        drift_pct = (live_cost - snapshot) / snapshot if snapshot else 0.0
        outcome = "PriceDrift" if abs(drift_pct) > settings.drift_threshold else "Verified"

    # Audit trail
    db.add(ProductVerificationHistory(
        product_id=product.id,
        cost_at_check=Decimal(str(live_cost)) if live_cost is not None else None,
        in_stock_at_check=bool(in_stock_live) if in_stock_live is not None else None,
        drift_pct=Decimal(str(round(drift_pct, 4))) if drift_pct is not None else None,
        outcome=outcome,
        triggered_by=triggered_by,
    ))

    # Update product snapshot to reflect current truth
    if live_cost is not None:
        product.cost_snapshot = Decimal(str(live_cost))
    if in_stock_live is not None:
        product.in_stock = bool(in_stock_live)
    product.last_verified_at = datetime.utcnow()
    product.verification_outcome = outcome

    await db.commit()

    return {
        "product_id": product.id,
        "outcome": outcome,
        "snapshot_cost": snapshot,
        "live_cost": live_cost,
        "drift_pct": drift_pct,
        "in_stock": in_stock_live,
        "verified_at": datetime.utcnow().isoformat(),
    }
