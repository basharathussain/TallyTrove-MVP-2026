"""
Tiered transparent agency fee pricing — per the spec §4.2.
Fairness Framework: flat $2.00 for items < $10, otherwise 10% of base cost.

All values flow through in USD; conversion to display currency happens at the API boundary.
"""
from decimal import Decimal, ROUND_HALF_UP

FLAT_FEE = Decimal("2.00")
TIER_BREAKPOINT = Decimal("10.00")
PERCENT_RATE = Decimal("0.10")


def calc_agency_fee(base_cost_usd: float) -> float:
    base = Decimal(str(base_cost_usd))
    if base < TIER_BREAKPOINT:
        fee = FLAT_FEE
    else:
        fee = (base * PERCENT_RATE).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return float(fee)


def calc_breakdown_usd(base_cost_usd: float, shipping_cost_usd: float) -> dict:
    fee = calc_agency_fee(base_cost_usd)
    grand = round(base_cost_usd + fee + shipping_cost_usd + 1e-9, 2)
    return {
        "base_cost": round(base_cost_usd, 2),
        "agency_fee": fee,
        "shipping_cost": round(shipping_cost_usd, 2),
        "grand_total": grand,
    }
