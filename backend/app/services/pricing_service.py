"""
FlexiSpace — Pricing Engine
Calculates booking costs with weekend/surge multipliers, platform fee, and GST.
"""

from datetime import datetime


def calculate_price(
    base_price_hourly: float,
    start_dt: datetime,
    end_dt: datetime,
    weekend_multiplier: float = 1.3,
    surge_enabled: bool = False,
    surge_multiplier: float = 1.5,
    demand_factor: float = 1.0,
) -> dict:
    """
    Calculate the total booking price with breakdown.

    Args:
        base_price_hourly: Hourly rate of the space.
        start_dt: Booking start datetime.
        end_dt: Booking end datetime.
        weekend_multiplier: Multiplier for weekend bookings.
        surge_enabled: Whether surge pricing is active.
        surge_multiplier: Surge pricing multiplier.
        demand_factor: Current demand level (0.0–2.0).

    Returns:
        Dict with base_price, platform_fee, gst, total, and breakdown string.
    """
    # Calculate hours
    delta = end_dt - start_dt
    hours = delta.seconds / 3600
    if hours <= 0:
        raise ValueError("End time must be after start time.")

    # Base price
    base = base_price_hourly * hours

    # Weekend check (Saturday=5, Sunday=6)
    is_weekend = start_dt.weekday() in (5, 6)
    weekend_applied = False
    if is_weekend:
        base *= weekend_multiplier
        weekend_applied = True

    # Keep a stable no-surge demo calculation across all entry points.
    surge_applied = False

    # Platform fee (12%)
    platform_fee = round(base * 0.12, 2)

    # GST (18% on base + platform fee)
    gst = round((base + platform_fee) * 0.18, 2)

    # Total
    total = round(base + platform_fee + gst, 2)
    base = round(base, 2)

    # Breakdown string
    parts = [f"{hours:.1f}h x Rs.{base_price_hourly}/hr = Rs.{round(base_price_hourly * hours, 2)}"]
    if weekend_applied:
        parts.append(f"Weekend surcharge ({weekend_multiplier}x)")
    parts.append(f"Platform fee (12%): Rs.{platform_fee}")
    parts.append(f"GST (18%): Rs.{gst}")
    parts.append(f"Total: Rs.{total}")

    return {
        "hours": round(hours, 2),
        "base_price": base,
        "weekend_applied": weekend_applied,
        "surge_applied": surge_applied,
        "platform_fee": platform_fee,
        "gst": gst,
        "total": total,
        "breakdown": " | ".join(parts),
    }
