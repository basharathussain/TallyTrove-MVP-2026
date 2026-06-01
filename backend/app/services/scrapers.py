"""Thin Scrapfly + aliexpress-scraper wrappers."""
import os
import sys
from app.config import settings

SCRAPERS_ROOT = os.environ.get("SCRAPERS_ROOT", "/scrapers")


def _ensure_aliexpress_module():
    scraper_dir = os.path.join(SCRAPERS_ROOT, "aliexpress-scraper")
    if scraper_dir not in sys.path:
        sys.path.insert(0, scraper_dir)
    from scrapfly import ScrapflyClient
    import aliexpress as ax
    if settings.scrapfly_key:
        ax.SCRAPFLY = ScrapflyClient(key=settings.scrapfly_key)
    return ax


async def search_aliexpress(query: str, max_results: int = 20) -> list[dict]:
    """Return normalized list of products for indexer use."""
    try:
        ax = _ensure_aliexpress_module()
        url = f"https://www.aliexpress.com/w/wholesale-{query.replace(' ', '-')}.html?SearchText={query.replace(' ', '+')}"
        raw = await ax.scrape_search(url, max_pages=1)
    except Exception as e:
        print(f"[scrapers] search '{query}' failed: {e}")
        return []

    results = []
    for item in (raw or [])[:max_results]:
        img = item.get("image", {}) if isinstance(item.get("image"), dict) else {}
        img_url = img.get("imgUrl", "") or ""
        if img_url.startswith("//"):
            img_url = "https:" + img_url

        images = [img_url] if img_url else []
        for ri in (item.get("images", []) or [])[:5]:
            u = ri.get("imgUrl", "") if isinstance(ri, dict) else str(ri)
            if u.startswith("//"):
                u = "https:" + u
            if u and u not in images:
                images.append(u)

        price_str = item.get("prices", {}).get("salePrice", {}).get("formattedPrice", "") or ""
        try:
            price = float(price_str.replace("US $", "").replace(",", "").strip() or 0)
        except ValueError:
            price = 0.0

        title_obj = item.get("title", {})
        title = title_obj.get("displayTitle", "") if isinstance(title_obj, dict) else str(title_obj)
        product_id = item.get("productId", "")
        if not product_id or not title or price <= 0:
            continue

        results.append({
            "external_product_id": str(product_id),
            "title": title.strip(),
            "description": title.strip(),
            "images": images,
            "category_path": query,
            "source_url": f"https://www.aliexpress.com/item/{product_id}.html",
            "price_usd": price,
            "shipping_us_usd": 2.50,    # AliExpress free / cheap to US
            "shipping_gb_usd": 3.50,    # slightly higher to UK
            "in_stock": True,
        })
    return results


async def fetch_aliexpress_product(supplier_url: str) -> dict:
    """Live single-product scrape for Layer 3 verification."""
    try:
        ax = _ensure_aliexpress_module()
        product = await ax.scrape_product(supplier_url)
    except Exception as e:
        print(f"[scrapers] product fetch failed: {e}")
        return {}

    pricing = product.get("pricing", {}) if isinstance(product, dict) else {}
    price = pricing.get("price")
    if isinstance(price, (int, float)) and price > 0:
        return {"price": float(price), "in_stock": True}
    return {}
