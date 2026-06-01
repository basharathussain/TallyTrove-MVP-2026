"""Admin back-office endpoints — protected by role=admin."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import (
    CustomerOrder, VendorOrder, Product, ProductVerificationHistory,
    TrackingLog, Vendor, Region,
)
from app.auth import get_admin
from app.schemas import (
    ProfitLedgerRow, VerificationRow, AdminVendorOrderUpdate,
    TrackingLogAppend, TrackingLogOut, CustomerOrderOut, VendorOrderOut,
)
from app.routers.orders import _render_order

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/analytics/profit-ledger", response_model=list[ProfitLedgerRow])
async def profit_ledger(db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    sql = text("""
        SELECT
            DATE(created_at) AS processing_date,
            SUM(total_base_cost) AS total_asset_turnover,
            SUM(total_agency_fee) AS net_retained_profit,
            COUNT(id) AS volume_processed
        FROM customer_orders
        WHERE payment_status = 'Paid'
        GROUP BY DATE(created_at)
        ORDER BY processing_date DESC
        LIMIT 30
    """)
    rows = (await db.execute(sql)).fetchall()
    return [ProfitLedgerRow(
        date=str(r.processing_date),
        wholesale_volume_handled=float(r.total_asset_turnover or 0),
        net_service_profit_collected=float(r.net_retained_profit or 0),
        transactions_count=int(r.volume_processed),
    ) for r in rows]


@router.get("/analytics/summary")
async def summary(db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    products_count = (await db.execute(select(func.count(Product.id)))).scalar()
    orders_count = (await db.execute(select(func.count(CustomerOrder.id)))).scalar()
    paid_count = (await db.execute(
        select(func.count(CustomerOrder.id)).where(CustomerOrder.payment_status == "Paid")
    )).scalar()
    pending_vo = (await db.execute(
        select(func.count(VendorOrder.id)).where(VendorOrder.fulfillment_status == "Sourcing")
    )).scalar()
    revenue = (await db.execute(
        select(func.sum(CustomerOrder.grand_total)).where(CustomerOrder.payment_status == "Paid")
    )).scalar() or 0
    profit = (await db.execute(
        select(func.sum(CustomerOrder.total_agency_fee)).where(CustomerOrder.payment_status == "Paid")
    )).scalar() or 0
    return {
        "products_indexed": products_count,
        "orders_total": orders_count,
        "orders_paid": paid_count,
        "vendor_orders_pending": pending_vo,
        "revenue_usd": float(revenue),
        "profit_usd": float(profit),
    }


@router.get("/customer-orders", response_model=list[CustomerOrderOut])
async def admin_orders(db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    result = await db.execute(
        select(CustomerOrder)
        .options(selectinload(CustomerOrder.vendor_orders))
        .order_by(CustomerOrder.created_at.desc())
        .limit(100)
    )
    return [await _render_order(co, db) for co in result.scalars().all()]


@router.get("/vendor-orders")
async def admin_vendor_orders(db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    rows = (await db.execute(
        select(VendorOrder, Vendor.name, Product.source_url, CustomerOrder.shipping_destination, CustomerOrder.payment_status)
        .join(Vendor, Vendor.id == VendorOrder.vendor_id)
        .outerjoin(Product, Product.id == VendorOrder.product_id)
        .join(CustomerOrder, CustomerOrder.id == VendorOrder.customer_order_id)
        .order_by(VendorOrder.updated_at.desc())
        .limit(100)
    )).all()
    out = []
    for vo, vendor_name, source_url, ship_dest, payment_status in rows:
        out.append({
            "id": vo.id,
            "customer_order_id": vo.customer_order_id,
            "vendor_name": vendor_name,
            "product_source_url": source_url,
            "title_snapshot": vo.title_snapshot,
            "quoted_cost": float(vo.quoted_cost),
            "base_cost": float(vo.base_cost),
            "agency_fee": float(vo.agency_fee),
            "shipping_cost": float(vo.shipping_cost),
            "quantity": vo.quantity,
            "vendor_order_id": vo.vendor_order_id,
            "tracking_number": vo.tracking_number,
            "fulfillment_status": vo.fulfillment_status,
            "notes": vo.notes,
            "placed_at": vo.placed_at,
            "shipping_destination": ship_dest,
            "payment_status": payment_status,
        })
    return out


@router.patch("/vendor-orders/{vo_id}")
async def update_vendor_order(vo_id: str, body: AdminVendorOrderUpdate,
                              db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    vo = (await db.execute(select(VendorOrder).where(VendorOrder.id == vo_id))).scalar_one_or_none()
    if not vo:
        raise HTTPException(404, "Vendor order not found")
    from datetime import datetime
    if body.vendor_order_id is not None:
        vo.vendor_order_id = body.vendor_order_id
        if not vo.placed_at:
            vo.placed_at = datetime.utcnow()
    if body.tracking_number is not None:
        vo.tracking_number = body.tracking_number
    if body.fulfillment_status is not None:
        vo.fulfillment_status = body.fulfillment_status
    if body.notes is not None:
        vo.notes = body.notes
    await db.commit()
    return {"ok": True, "id": vo.id, "fulfillment_status": vo.fulfillment_status}


@router.post("/vendor-orders/{vo_id}/tracking-logs", response_model=TrackingLogOut)
async def append_tracking_log(vo_id: str, body: TrackingLogAppend,
                              db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    vo = (await db.execute(select(VendorOrder).where(VendorOrder.id == vo_id))).scalar_one_or_none()
    if not vo:
        raise HTTPException(404, "Vendor order not found")
    log = TrackingLog(
        vendor_order_id=vo_id,
        checkpoint_description=body.checkpoint_description,
        location_string=body.location_string,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return TrackingLogOut(
        id=log.id, checkpoint_description=log.checkpoint_description,
        location_string=log.location_string, logged_at=log.logged_at,
    )


@router.get("/products")
async def admin_products(q: str = "", limit: int = 50,
                         db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    if q:
        sql = text("""
            SELECT p.id, p.title, CAST(p.cost_snapshot AS FLOAT) AS cost,
                   p.in_stock, p.last_verified_at, p.source_url, v.name AS vendor_name
            FROM products p JOIN vendors v ON v.id = p.vendor_id
            WHERE p.search_vector @@ plainto_tsquery('english', :q)
            ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', :q)) DESC
            LIMIT :limit
        """)
        rows = (await db.execute(sql, {"q": q, "limit": limit})).fetchall()
    else:
        sql = text("""
            SELECT p.id, p.title, CAST(p.cost_snapshot AS FLOAT) AS cost,
                   p.in_stock, p.last_verified_at, p.source_url, v.name AS vendor_name
            FROM products p JOIN vendors v ON v.id = p.vendor_id
            ORDER BY p.updated_at DESC LIMIT :limit
        """)
        rows = (await db.execute(sql, {"limit": limit})).fetchall()
    return [dict(r._mapping) for r in rows]


@router.get("/verifications", response_model=list[VerificationRow])
async def verifications(limit: int = 50, only_drift: bool = False,
                        db: AsyncSession = Depends(get_db), _=Depends(get_admin)):
    sql = text(f"""
        SELECT vh.id, vh.product_id, p.title AS product_title, vh.checked_at,
               vh.cost_at_check, vh.drift_pct, vh.outcome, vh.triggered_by
        FROM product_verification_history vh
        JOIN products p ON p.id = vh.product_id
        {"WHERE vh.outcome IN ('PriceDrift', 'OutOfStock', 'OfferGone', 'ScrapeFailed')" if only_drift else ""}
        ORDER BY vh.checked_at DESC LIMIT :limit
    """)
    rows = (await db.execute(sql, {"limit": limit})).fetchall()
    return [VerificationRow(
        id=r.id, product_id=r.product_id, product_title=r.product_title,
        checked_at=r.checked_at,
        cost_at_check=float(r.cost_at_check) if r.cost_at_check is not None else None,
        drift_pct=float(r.drift_pct) if r.drift_pct is not None else None,
        outcome=r.outcome, triggered_by=r.triggered_by,
    ) for r in rows]


@router.post("/trigger/index")
async def trigger_indexer(_=Depends(get_admin)):
    """Kick off the indexer in the background."""
    import asyncio
    from app.workers.indexer import index_seed_terms
    asyncio.create_task(index_seed_terms(max_per_term=20))
    return {"started": True, "message": "Indexer running in background. Refresh products list in a few minutes."}


@router.post("/trigger/fx")
async def trigger_fx(_=Depends(get_admin)):
    from app.workers.fx_refresh import refresh
    await refresh()
    return {"ok": True}
