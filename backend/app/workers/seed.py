"""Seed baseline data: regions, vendor, admin user, demo customer, system_settings."""
import asyncio
from decimal import Decimal
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models import User, Vendor, Region, SystemSetting
from app.auth import hash_password
from app.config import settings


async def seed():
    async with AsyncSessionLocal() as db:
        # Regions
        for code, name, currency, symbol in [
            ("US", "United States", "USD", "$"),
            ("GB", "United Kingdom", "GBP", "£"),
        ]:
            r = await db.execute(select(Region).where(Region.code == code))
            if not r.scalar_one_or_none():
                db.add(Region(code=code, name=name, currency=currency, currency_symbol=symbol))

        # Vendor: AliExpress
        v = await db.execute(select(Vendor).where(Vendor.name == "AliExpress"))
        if not v.scalar_one_or_none():
            db.add(Vendor(name="AliExpress", api_base_url="https://www.aliexpress.com"))

        # Admin user
        u = await db.execute(select(User).where(User.email == settings.admin_email))
        if not u.scalar_one_or_none():
            db.add(User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                role="admin",
                first_name="TallyTrove",
                last_name="Admin",
            ))

        # Demo customer
        u = await db.execute(select(User).where(User.email == settings.demo_customer_email))
        if not u.scalar_one_or_none():
            db.add(User(
                email=settings.demo_customer_email,
                hashed_password=hash_password(settings.demo_customer_password),
                role="customer",
                region_code="US",
                first_name="Demo",
                last_name="Customer",
            ))

        # System settings
        defaults = {
            "fx_usd_gbp": settings.default_fx_usd_gbp,
            "drift_threshold": settings.drift_threshold,
        }
        for key, val in defaults.items():
            r = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
            if not r.scalar_one_or_none():
                db.add(SystemSetting(key=key, value=val))

        await db.commit()
        print("[seed] baseline data inserted")


if __name__ == "__main__":
    asyncio.run(seed())
