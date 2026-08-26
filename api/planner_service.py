"""
Planner Service — CRUD operations for crop rotation plans stored in Supabase.
"""

from db import get_supabase


def get_plans(user_id: int, year: int = None) -> list:
    """Get all crop plans for a user, optionally filtered by year."""
    sb = get_supabase()
    query = sb.table("crop_plans").select("*").eq("user_id", user_id)
    if year:
        query = query.eq("year", year)
    result = query.order("plot_label").order("start_month").execute()
    return result.data or []


def get_plans_grouped(user_id: int, year: int = None) -> list:
    """
    Get plans grouped by plot_label, formatted for the frontend Planner calendar.
    Returns: [{ plot: "South Field", entries: [{ crop, start, end, season }, ...] }, ...]
    """
    plans = get_plans(user_id, year)
    # Group by plot_label
    grouped = {}
    for plan in plans:
        plot = plan["plot_label"]
        if plot not in grouped:
            grouped[plot] = []
        grouped[plot].append({
            "id": plan["id"],
            "crop": plan["crop"],
            "start": plan["start_month"] - 1,   # Convert 1-indexed to 0-indexed for frontend
            "end": plan["end_month"],             # end is exclusive in frontend
            "season": plan.get("season", ""),
            "field_id": plan.get("field_id"),
        })
    return [{"plot": plot, "entries": entries} for plot, entries in grouped.items()]


def create_plan(user_id: int, data: dict) -> dict:
    """Create a new crop plan entry."""
    sb = get_supabase()
    plan_data = {
        "user_id": user_id,
        "field_id": data.get("field_id"),
        "plot_label": data.get("plot_label", "Unnamed Plot"),
        "year": data.get("year", 2026),
        "crop": data.get("crop", ""),
        "season": data.get("season", ""),
        "start_month": data.get("start_month", 1),
        "end_month": data.get("end_month", 3),
    }
    result = sb.table("crop_plans").insert(plan_data).execute()
    if not result.data or len(result.data) == 0:
        raise ValueError("Failed to create plan entry")
    return result.data[0]


def update_plan(user_id: int, plan_id: int, data: dict) -> dict | None:
    """Update an existing crop plan entry."""
    sb = get_supabase()

    # Verify ownership
    existing = sb.table("crop_plans").select("*").eq("id", plan_id).eq("user_id", user_id).execute()
    if not existing.data or len(existing.data) == 0:
        return None

    update_data = {}
    allowed_fields = ["field_id", "plot_label", "year", "crop", "season", "start_month", "end_month"]
    for key in allowed_fields:
        if key in data:
            update_data[key] = data[key]

    if not update_data:
        return existing.data[0]

    result = (
        sb.table("crop_plans")
        .update(update_data)
        .eq("id", plan_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else existing.data[0]


def delete_plan(user_id: int, plan_id: int) -> bool:
    """Delete a single crop plan entry."""
    sb = get_supabase()
    sb.table("crop_plans").delete().eq("id", plan_id).eq("user_id", user_id).execute()
    return True


def delete_plans_for_plot(user_id: int, plot_label: str, year: int = None) -> bool:
    """Delete all plans for a specific plot (and optionally year)."""
    sb = get_supabase()
    query = sb.table("crop_plans").delete().eq("user_id", user_id).eq("plot_label", plot_label)
    if year:
        query = query.eq("year", year)
    query.execute()
    return True
