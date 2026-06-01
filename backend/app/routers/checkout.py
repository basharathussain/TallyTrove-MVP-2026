"""Cart preview + Layer 3 verification + Stripe PaymentIntent creation."""
import asyncio
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import stripe
from app.database import get_db
from app.models import Product, ProductShipping, Vendor, CustomerOrder, VendorOrder
from app.core.pricing import calc_breakdown_usd
from app.services.verify_offer import verify_offer
from app.services.currency import get_region, get_fx_rate, to_display, to_breakdown_display, CURRENCY_SYMBOLS
from app.config import settings
from app.auth import get_customer
from app.schemas import (
    CartPreviewRequest, CartPreviewResponse, CartLineOut, PriceBreakdown,
    CheckoutAuthorizeRequest, CheckoutAuthorizeResponse, CheckoutVerificationItem,
)

stripe.api_key = settings.stripe_secret_key

router = APIRouter(prefix="/api/checkout", tags=["checkout"])


async def _load_product_pricing(db: AsyncSession, product_id: str, region_code: str) -> dict:
    p = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not p:
        return None
    ps = (await db.execute(
        select(ProductShipping).where(
            ProductShipping.product_id == product_id,
            ProductShipping.region_code == region_code,
        )
    )).scalar_one_or_none()
    shipping = float(ps.shipping_cost_usd) if ps else 2.50
    return {
        "product": p,
        "shipping_usd": shipping,
        "usd_breakdown": calc_breakdown_usd(float(p.cost_snapshot), shipping),
    }


@router.post("/preview", response_model=CartPreviewResponse)
async def preview(req: CartPreviewRequest, db: AsyncSession = Depends(get_db)):
    region_obj = await get_region(db, req.region_code)
    fx = await get_fx_rate(db, region_obj.currency)

    lines: list[CartLineOut] = []
    sum_base = sum_fee = sum_shipping = sum_total = 0.0

    for item in req.items:
        info = await _load_product_pricing(db, item.product_id, region_obj.code)
        if not info:
            continue
        p = info["product"]
        b = info["usd_breakdown"]
        display_per_unit = to_breakdown_display(b, fx, region_obj.currency, region_obj.currency_symbol)
        line_total_display = round(display_per_unit["grand_total"] * item.quantity, 2)

        sum_base += b["base_cost"] * item.quantity
        sum_fee += b["agency_fee"] * item.quantity
        sum_shipping += b["shipping_cost"] * item.quantity
        sum_total += b["grand_total"] * item.quantity

        lines.append(CartLineOut(
            product_id=p.id,
            title=p.title,
            image_url=(p.image_urls or [None])[0],
            quantity=item.quantity,
            unit_pricing=PriceBreakdown(**display_per_unit),
            line_total_display=line_total_display,
        ))

    totals = PriceBreakdown(
        base_cost=to_display(sum_base, fx),
        agency_fee=to_display(sum_fee, fx),
        shipping_cost=to_display(sum_shipping, fx),
        grand_total=to_display(sum_total, fx),
        currency=region_obj.currency,
        currency_symbol=region_obj.currency_symbol,
    )
    return CartPreviewResponse(
        region_code=region_obj.code,
        currency=region_obj.currency,
        currency_symbol=region_obj.currency_symbol,
        lines=lines,
        totals=totals,
    )


@router.post("/authorize", response_model=CheckoutAuthorizeResponse)
async def authorize(req: CheckoutAuthorizeRequest, db: AsyncSession = Depends(get_db), user=Depends(get_customer)):
    region_obj = await get_region(db, req.region_code)
    fx = await get_fx_rate(db, region_obj.currency)

    # Layer 3 — verify every cart item against live vendor offer
    verification_results: list[CheckoutVerificationItem] = []
    needs_confirmation = False
    grand_total_usd = base_usd = fee_usd = ship_usd = 0.0
    vendor_order_data = []

    for item in req.items:
        v = await verify_offer(item.product_id, db, triggered_by="checkout")
        verification_results.append(CheckoutVerificationItem(
            product_id=item.product_id,
            outcome=v["outcome"],
            snapshot_cost=v.get("snapshot_cost") or 0,
            live_cost=v.get("live_cost"),
            drift_pct=v.get("drift_pct"),
            in_stock=v.get("in_stock"),
        ))
        if v["outcome"] in ("PriceDrift", "OutOfStock", "ScrapeFailed", "OfferGone"):
            needs_confirmation = True

        # Build line totals using the *current* snapshot (just refreshed by verify_offer)
        info = await _load_product_pricing(db, item.product_id, region_obj.code)
        if not info:
            continue
        b = info["usd_breakdown"]
        base_usd += b["base_cost"] * item.quantity
        fee_usd += b["agency_fee"] * item.quantity
        ship_usd += b["shipping_cost"] * item.quantity
        grand_total_usd += b["grand_total"] * item.quantity
        vendor_order_data.append({
            "product": info["product"],
            "quantity": item.quantity,
            "breakdown": b,
        })

    if needs_confirmation:
        return CheckoutAuthorizeResponse(
            state="CONFIRMATION_REQUIRED",
            verification=verification_results,
        )

    # Build totals display
    totals = PriceBreakdown(
        base_cost=to_display(base_usd, fx),
        agency_fee=to_display(fee_usd, fx),
        shipping_cost=to_display(ship_usd, fx),
        grand_total=to_display(grand_total_usd, fx),
        currency=region_obj.currency,
        currency_symbol=region_obj.currency_symbol,
    )

    # Create customer_order + vendor_orders (one per vendor; MVP: always 1)
    co = CustomerOrder(
        user_id=user.id,
        region_code=region_obj.code,
        fx_rate_locked=fx,
        total_base_cost=Decimal(str(round(base_usd, 2))),
        total_agency_fee=Decimal(str(round(fee_usd, 2))),
        total_shipping_cost=Decimal(str(round(ship_usd, 2))),
        grand_total=Decimal(str(round(grand_total_usd, 2))),
        payment_status="Pending",
        shipping_destination=req.shipping_destination,
    )
    db.add(co)
    await db.flush()

    # Group by vendor (MVP: all AliExpress → one vendor_order per line for clarity)
    for vd in vendor_order_data:
        p = vd["product"]
        b = vd["breakdown"]
        db.add(VendorOrder(
            customer_order_id=co.id,
            vendor_id=p.vendor_id,
            product_id=p.id,
            title_snapshot=p.title,
            quoted_cost=Decimal(str(b["base_cost"])),
            base_cost=Decimal(str(b["base_cost"] * vd["quantity"])),
            agency_fee=Decimal(str(b["agency_fee"] * vd["quantity"])),
            shipping_cost=Decimal(str(b["shipping_cost"] * vd["quantity"])),
            quantity=vd["quantity"],
            fulfillment_status="Sourcing",
        ))

    # Stripe PaymentIntent
    client_secret = None
    if settings.stripe_secret_key.startswith("sk_"):
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(totals.grand_total * 100),
                currency=region_obj.currency.lower(),
                metadata={"customer_order_id": co.id, "region": region_obj.code},
                automatic_payment_methods={"enabled": True},
            )
            co.stripe_payment_intent_id = intent.id
            client_secret = intent.client_secret
        except Exception as e:
            print(f"[checkout] Stripe error: {e}")

    await db.commit()

    return CheckoutAuthorizeResponse(
        state="AUTHORIZED",
        verification=verification_results,
        order_id=co.id,
        stripe_client_secret=client_secret,
        publishable_key=settings.stripe_publishable_key,
        totals=totals,
    )


@router.post("/confirm-payment/{order_id}")
async def confirm_payment(order_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_customer)):
    """Frontend tells us Stripe confirmed payment (in lieu of webhook for MVP)."""
    co = (await db.execute(select(CustomerOrder).where(CustomerOrder.id == order_id))).scalar_one_or_none()
    if not co or co.user_id != user.id:
        raise HTTPException(404, "Order not found")
    co.payment_status = "Paid"
    await db.commit()
    return {"order_id": order_id, "payment_status": "Paid"}
