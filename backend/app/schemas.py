from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class SignupRequest(BaseModel):
    email: str
    password: str
    region_code: str = "US"
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    region_code: str
    email: str


# ── Catalog ───────────────────────────────────────────────────────────────────

class PriceBreakdown(BaseModel):
    base_cost: float
    agency_fee: float
    shipping_cost: float
    grand_total: float
    currency: str
    currency_symbol: str

class ProductCard(BaseModel):
    product_id: str
    vendor_name: str
    title: str
    image_url: Optional[str]
    in_stock: bool
    last_verified_at: datetime
    pricing: PriceBreakdown

class SearchResponse(BaseModel):
    query: str
    region: str
    results: list[ProductCard]

class ProductDetail(ProductCard):
    description: Optional[str]
    image_urls: list[str]
    source_url: str
    category_path: Optional[str]


# ── Checkout ──────────────────────────────────────────────────────────────────

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartPreviewRequest(BaseModel):
    region_code: str = "US"
    items: list[CartItem]

class CartLineOut(BaseModel):
    product_id: str
    title: str
    image_url: Optional[str]
    quantity: int
    unit_pricing: PriceBreakdown
    line_total_display: float

class CartPreviewResponse(BaseModel):
    region_code: str
    currency: str
    currency_symbol: str
    lines: list[CartLineOut]
    totals: PriceBreakdown


class CheckoutVerificationItem(BaseModel):
    product_id: str
    outcome: str
    snapshot_cost: float
    live_cost: Optional[float]
    drift_pct: Optional[float]
    in_stock: Optional[bool]

class CheckoutAuthorizeRequest(BaseModel):
    region_code: str = "US"
    items: list[CartItem]
    shipping_destination: dict

class CheckoutAuthorizeResponse(BaseModel):
    state: str   # AUTHORIZED | CONFIRMATION_REQUIRED | REJECTED
    verification: list[CheckoutVerificationItem]
    order_id: Optional[str] = None
    stripe_client_secret: Optional[str] = None
    publishable_key: Optional[str] = None
    totals: Optional[PriceBreakdown] = None


# ── Orders ────────────────────────────────────────────────────────────────────

class VendorOrderOut(BaseModel):
    id: str
    vendor_name: str
    title_snapshot: str
    base_cost: float
    agency_fee: float
    shipping_cost: float
    quantity: int
    vendor_order_id: Optional[str]
    tracking_number: Optional[str]
    fulfillment_status: str
    placed_at: Optional[datetime]

class CustomerOrderOut(BaseModel):
    id: str
    region_code: str
    currency: str
    currency_symbol: str
    fx_rate_locked: float
    payment_status: str
    total_base_cost_display: float
    total_agency_fee_display: float
    total_shipping_cost_display: float
    grand_total_display: float
    shipping_destination: dict
    created_at: datetime
    vendor_orders: list[VendorOrderOut]

class TrackingLogOut(BaseModel):
    id: str
    checkpoint_description: str
    location_string: Optional[str]
    logged_at: datetime


# ── Admin ─────────────────────────────────────────────────────────────────────

class ProfitLedgerRow(BaseModel):
    date: str
    wholesale_volume_handled: float
    net_service_profit_collected: float
    transactions_count: int

class VerificationRow(BaseModel):
    id: str
    product_id: str
    product_title: str
    checked_at: datetime
    cost_at_check: Optional[float]
    drift_pct: Optional[float]
    outcome: str
    triggered_by: str

class AdminVendorOrderUpdate(BaseModel):
    vendor_order_id: Optional[str] = None
    tracking_number: Optional[str] = None
    fulfillment_status: Optional[str] = None
    notes: Optional[str] = None

class TrackingLogAppend(BaseModel):
    checkpoint_description: str
    location_string: Optional[str] = None
