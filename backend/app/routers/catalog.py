"""Layer 2 — Customer search + product detail. Reads `products` via Postgres FTS."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from app.database import get_db
from app.models import Product, ProductShipping, Vendor
from app.core.pricing import calc_breakdown_usd
from app.services.currency import get_region, get_fx_rate, to_breakdown_display
from app.schemas import SearchResponse, ProductCard, PriceBreakdown, ProductDetail

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/search", response_model=SearchResponse)
async def search(q: str = Query(..., min_length=1), region: str = "US", limit: int = 24,
                 db: AsyncSession = Depends(get_db)):
    region_obj = await get_region(db, region)
    fx = await get_fx_rate(db, region_obj.currency)

    sql = text("""
        SELECT
            p.id, p.title, p.image_urls, p.source_url,
            CAST(p.cost_snapshot AS FLOAT) AS cost,
            p.in_stock, p.last_verified_at,
            v.name AS vendor_name,
            CAST(ps.shipping_cost_usd AS FLOAT) AS shipping_cost
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN product_shipping ps ON ps.product_id = p.id AND ps.region_code = :region
        WHERE p.in_stock = TRUE
          AND p.search_vector @@ plainto_tsquery('english', :q)
        ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', :q)) DESC
        LIMIT :limit
    """)
    rows = (await db.execute(sql, {"q": q, "region": region_obj.code, "limit": limit})).fetchall()

    results = []
    for r in rows:
        usd_breakdown = calc_breakdown_usd(r.cost, r.shipping_cost)
        breakdown = to_breakdown_display(usd_breakdown, fx, region_obj.currency, region_obj.currency_symbol)
        results.append(ProductCard(
            product_id=r.id,
            vendor_name=r.vendor_name,
            title=r.title,
            image_url=(r.image_urls or [None])[0],
            in_stock=r.in_stock,
            last_verified_at=r.last_verified_at,
            pricing=PriceBreakdown(**breakdown),
        ))

    return SearchResponse(query=q, region=region_obj.code, results=results)


@router.get("/trending", response_model=SearchResponse)
async def trending(region: str = "US", limit: int = 12, db: AsyncSession = Depends(get_db)):
    region_obj = await get_region(db, region)
    fx = await get_fx_rate(db, region_obj.currency)

    sql = text("""
        SELECT
            p.id, p.title, p.image_urls, p.source_url,
            CAST(p.cost_snapshot AS FLOAT) AS cost,
            p.in_stock, p.last_verified_at,
            v.name AS vendor_name,
            CAST(ps.shipping_cost_usd AS FLOAT) AS shipping_cost
        FROM products p
        JOIN vendors v ON v.id = p.vendor_id
        JOIN product_shipping ps ON ps.product_id = p.id AND ps.region_code = :region
        WHERE p.in_stock = TRUE
        ORDER BY p.updated_at DESC
        LIMIT :limit
    """)
    rows = (await db.execute(sql, {"region": region_obj.code, "limit": limit})).fetchall()

    results = []
    for r in rows:
        usd_breakdown = calc_breakdown_usd(r.cost, r.shipping_cost)
        breakdown = to_breakdown_display(usd_breakdown, fx, region_obj.currency, region_obj.currency_symbol)
        results.append(ProductCard(
            product_id=r.id, vendor_name=r.vendor_name, title=r.title,
            image_url=(r.image_urls or [None])[0],
            in_stock=r.in_stock, last_verified_at=r.last_verified_at,
            pricing=PriceBreakdown(**breakdown),
        ))
    return SearchResponse(query="trending", region=region_obj.code, results=results)


@router.get("/products/{product_id}", response_model=ProductDetail)
async def product_detail(product_id: str, region: str = "US", db: AsyncSession = Depends(get_db)):
    region_obj = await get_region(db, region)
    fx = await get_fx_rate(db, region_obj.currency)

    product = (await db.execute(select(Product).where(Product.id == product_id))).scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    vendor = (await db.execute(select(Vendor).where(Vendor.id == product.vendor_id))).scalar_one()
    shipping = (await db.execute(
        select(ProductShipping).where(
            ProductShipping.product_id == product_id,
            ProductShipping.region_code == region_obj.code,
        )
    )).scalar_one_or_none()
    shipping_cost = float(shipping.shipping_cost_usd) if shipping else 2.50

    usd_breakdown = calc_breakdown_usd(float(product.cost_snapshot), shipping_cost)
    breakdown = to_breakdown_display(usd_breakdown, fx, region_obj.currency, region_obj.currency_symbol)

    return ProductDetail(
        product_id=product.id,
        vendor_name=vendor.name,
        title=product.title,
        description=product.description,
        image_urls=product.image_urls or [],
        image_url=(product.image_urls or [None])[0],
        source_url=product.source_url,
        category_path=product.category_path,
        in_stock=product.in_stock,
        last_verified_at=product.last_verified_at,
        pricing=PriceBreakdown(**breakdown),
    )
