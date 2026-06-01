"""Customer-facing order list + detail (transparent invoice)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import CustomerOrder, VendorOrder, TrackingLog, Vendor, Region
from app.services.currency import to_display
from app.auth import get_customer
from app.schemas import CustomerOrderOut, VendorOrderOut, TrackingLogOut

router = APIRouter(prefix="/api/orders", tags=["orders"])


async def _render_order(co: CustomerOrder, db: AsyncSession) -> dict:
    region = (await db.execute(select(Region).where(Region.code == co.region_code))).scalar_one()
    fx = float(co.fx_rate_locked)
    vendor_lookup = {}

    vo_out = []
    for vo in co.vendor_orders:
        if vo.vendor_id not in vendor_lookup:
            v = (await db.execute(select(Vendor).where(Vendor.id == vo.vendor_id))).scalar_one()
            vendor_lookup[vo.vendor_id] = v.name
        vo_out.append(VendorOrderOut(
            id=vo.id,
            vendor_name=vendor_lookup[vo.vendor_id],
            title_snapshot=vo.title_snapshot,
            base_cost=to_display(float(vo.base_cost), fx),
            agency_fee=to_display(float(vo.agency_fee), fx),
            shipping_cost=to_display(float(vo.shipping_cost), fx),
            quantity=vo.quantity,
            vendor_order_id=vo.vendor_order_id,
            tracking_number=vo.tracking_number,
            fulfillment_status=vo.fulfillment_status,
            placed_at=vo.placed_at,
        ))

    return CustomerOrderOut(
        id=co.id,
        region_code=co.region_code,
        currency=region.currency,
        currency_symbol=region.currency_symbol,
        fx_rate_locked=fx,
        payment_status=co.payment_status,
        total_base_cost_display=to_display(float(co.total_base_cost), fx),
        total_agency_fee_display=to_display(float(co.total_agency_fee), fx),
        total_shipping_cost_display=to_display(float(co.total_shipping_cost), fx),
        grand_total_display=to_display(float(co.grand_total), fx),
        shipping_destination=co.shipping_destination or {},
        created_at=co.created_at,
        vendor_orders=vo_out,
    )


@router.get("", response_model=list[CustomerOrderOut])
async def my_orders(db: AsyncSession = Depends(get_db), user=Depends(get_customer)):
    result = await db.execute(
        select(CustomerOrder)
        .where(CustomerOrder.user_id == user.id)
        .options(selectinload(CustomerOrder.vendor_orders))
        .order_by(CustomerOrder.created_at.desc())
    )
    return [await _render_order(co, db) for co in result.scalars().all()]


@router.get("/{order_id}", response_model=CustomerOrderOut)
async def my_order(order_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_customer)):
    result = await db.execute(
        select(CustomerOrder)
        .where(CustomerOrder.id == order_id, CustomerOrder.user_id == user.id)
        .options(selectinload(CustomerOrder.vendor_orders))
    )
    co = result.scalar_one_or_none()
    if not co:
        raise HTTPException(404, "Order not found")
    return await _render_order(co, db)


@router.get("/vendor-order/{vendor_order_id}/tracking", response_model=list[TrackingLogOut])
async def vendor_order_tracking(vendor_order_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_customer)):
    # ensure the vendor_order belongs to this customer
    vo = (await db.execute(select(VendorOrder).where(VendorOrder.id == vendor_order_id))).scalar_one_or_none()
    if not vo:
        raise HTTPException(404, "Vendor order not found")
    co = (await db.execute(select(CustomerOrder).where(CustomerOrder.id == vo.customer_order_id))).scalar_one()
    if co.user_id != user.id:
        raise HTTPException(403, "Not yours")
    logs = (await db.execute(
        select(TrackingLog).where(TrackingLog.vendor_order_id == vendor_order_id).order_by(TrackingLog.logged_at.asc())
    )).scalars().all()
    return [TrackingLogOut(
        id=l.id, checkpoint_description=l.checkpoint_description,
        location_string=l.location_string, logged_at=l.logged_at,
    ) for l in logs]
