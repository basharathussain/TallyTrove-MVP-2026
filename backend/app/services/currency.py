"""Currency conversion service. USD is the canonical storage; convert at boundary."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import SystemSetting, Region
from app.config import settings


CURRENCY_SYMBOLS = {"USD": "$", "GBP": "£", "EUR": "€"}


async def get_fx_rate(db: AsyncSession, target_currency: str) -> float:
    """USD → target currency. 1.0 for USD itself."""
    if target_currency == "USD":
        return 1.0
    if target_currency == "GBP":
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "fx_usd_gbp"))
        row = result.scalar_one_or_none()
        if row:
            v = row.value
            return float(v) if not isinstance(v, dict) else float(v.get("rate", v))
        return float(settings.default_fx_usd_gbp)
    return 1.0


async def get_region(db: AsyncSession, region_code: str) -> Region:
    region_code = (region_code or "US").upper()
    result = await db.execute(select(Region).where(Region.code == region_code))
    region = result.scalar_one_or_none()
    if not region:
        result = await db.execute(select(Region).where(Region.code == "US"))
        region = result.scalar_one()
    return region


def to_display(amount_usd: float, fx_rate: float) -> float:
    return round(amount_usd * fx_rate, 2)


def to_breakdown_display(usd_breakdown: dict, fx_rate: float, currency: str, currency_symbol: str) -> dict:
    return {
        "base_cost": to_display(usd_breakdown["base_cost"], fx_rate),
        "agency_fee": to_display(usd_breakdown["agency_fee"], fx_rate),
        "shipping_cost": to_display(usd_breakdown["shipping_cost"], fx_rate),
        "grand_total": to_display(usd_breakdown["grand_total"], fx_rate),
        "currency": currency,
        "currency_symbol": currency_symbol,
    }
