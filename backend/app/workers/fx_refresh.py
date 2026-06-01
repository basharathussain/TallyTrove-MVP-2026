"""Pulls daily USD→GBP rate from a free exchange rate API into system_settings."""
import asyncio
import httpx
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import SystemSetting


FX_URL = "https://api.exchangerate-api.com/v4/latest/USD"


async def refresh():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(FX_URL)
            r.raise_for_status()
            rates = r.json().get("rates", {})
            gbp = rates.get("GBP")
        except Exception as e:
            print(f"[fx_refresh] error: {e}")
            return

    if not gbp:
        print("[fx_refresh] no GBP rate in response")
        return

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == "fx_usd_gbp"))
        row = result.scalar_one_or_none()
        if row:
            row.value = float(gbp)
        else:
            db.add(SystemSetting(key="fx_usd_gbp", value=float(gbp)))
        await db.commit()

    print(f"[fx_refresh] USD→GBP = {gbp}")


if __name__ == "__main__":
    asyncio.run(refresh())
