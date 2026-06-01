from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Integer, String, Text, Boolean, Numeric, DateTime,
    ForeignKey, JSON, func, UniqueConstraint, ARRAY,
)
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


# ── Identity ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="customer")  # customer | admin
    region_code: Mapped[str] = mapped_column(String(2), default="US")
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Catalog ───────────────────────────────────────────────────────────────────

class Vendor(Base):
    __tablename__ = "vendors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    api_base_url: Mapped[str] = mapped_column(String(255), default="")
    reliability_rating: Mapped[float] = mapped_column(Numeric(3, 2), default=5.00)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Region(Base):
    __tablename__ = "regions"
    code: Mapped[str] = mapped_column(String(2), primary_key=True)  # 'US', 'GB'
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    currency_symbol: Mapped[str] = mapped_column(String(5), default="$")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    external_product_id: Mapped[str] = mapped_column(String(150), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_urls: Mapped[list] = mapped_column(JSON, default=list)
    category_path: Mapped[Optional[str]] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text, nullable=False)

    # pricing snapshot in USD (single source of truth)
    cost_snapshot: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)

    last_verified_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    verification_outcome: Mapped[str] = mapped_column(String(30), default="Verified")

    # Postgres FTS column populated via trigger (managed in migration / lifespan)
    search_vector: Mapped[Optional[str]] = mapped_column(TSVECTOR)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("vendor_id", "external_product_id", name="uq_vendor_external"),)

    shipping: Mapped[list["ProductShipping"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    vendor: Mapped["Vendor"] = relationship()


class ProductShipping(Base):
    __tablename__ = "product_shipping"
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    region_code: Mapped[str] = mapped_column(ForeignKey("regions.code"), primary_key=True)
    shipping_cost_usd: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)

    product: Mapped["Product"] = relationship(back_populates="shipping")


class ProductVerificationHistory(Base):
    __tablename__ = "product_verification_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    checked_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    cost_at_check: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    in_stock_at_check: Mapped[Optional[bool]] = mapped_column(Boolean)
    drift_pct: Mapped[Optional[float]] = mapped_column(Numeric(6, 3))
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    triggered_by: Mapped[str] = mapped_column(String(20), nullable=False)  # indexer | checkout | admin


# ── Orders ────────────────────────────────────────────────────────────────────

class CustomerOrder(Base):
    __tablename__ = "customer_orders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    region_code: Mapped[str] = mapped_column(String(2), nullable=False)
    fx_rate_locked: Mapped[float] = mapped_column(Numeric(12, 6), default=1.0)  # USD→region rate at order time

    # all monetary fields stored in USD; display currency derived from region_code
    total_base_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_agency_fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    total_shipping_cost: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(12, 2), default=0)

    payment_status: Mapped[str] = mapped_column(String(20), default="Pending")
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(200))
    shipping_destination: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    vendor_orders: Mapped[list["VendorOrder"]] = relationship(back_populates="customer_order", cascade="all, delete-orphan")


class VendorOrder(Base):
    __tablename__ = "vendor_orders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    customer_order_id: Mapped[str] = mapped_column(ForeignKey("customer_orders.id", ondelete="CASCADE"), nullable=False)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))

    # Snapshot of what we quoted + agreed at checkout
    title_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    quoted_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)  # L3-verified cost USD
    base_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    agency_fee: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    shipping_cost: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    vendor_order_id: Mapped[Optional[str]] = mapped_column(String(120))  # AliExpress receipt id
    tracking_number: Mapped[Optional[str]] = mapped_column(String(150))
    fulfillment_status: Mapped[str] = mapped_column(String(30), default="Sourcing")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    placed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    customer_order: Mapped["CustomerOrder"] = relationship(back_populates="vendor_orders")
    tracking_logs: Mapped[list["TrackingLog"]] = relationship(back_populates="vendor_order", cascade="all, delete-orphan")


class TrackingLog(Base):
    __tablename__ = "tracking_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    vendor_order_id: Mapped[str] = mapped_column(ForeignKey("vendor_orders.id", ondelete="CASCADE"), nullable=False)
    checkpoint_description: Mapped[str] = mapped_column(Text, nullable=False)
    location_string: Mapped[Optional[str]] = mapped_column(String(150))
    logged_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    vendor_order: Mapped["VendorOrder"] = relationship(back_populates="tracking_logs")


class ReturnTicket(Base):
    __tablename__ = "return_tickets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    vendor_order_id: Mapped[str] = mapped_column(ForeignKey("vendor_orders.id"), nullable=False)
    reason_type: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_note: Mapped[Optional[str]] = mapped_column(Text)
    calculated_refund_payout: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    is_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ── Settings ──────────────────────────────────────────────────────────────────

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
