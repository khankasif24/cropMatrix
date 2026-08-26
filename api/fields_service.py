"""
Fields Service — CRUD operations for farm plots/fields stored in Supabase.
"""

from datetime import datetime
from db import get_supabase


def get_fields(user_id: int) -> list:
    """Get all fields for a user."""
    sb = get_supabase()
    result = sb.table("fields").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data or []


def get_field(user_id: int, field_id: int) -> dict | None:
    """Get a single field by ID, ensuring it belongs to the user."""
    sb = get_supabase()
    result = (
        sb.table("fields")
        .select("*")
        .eq("id", field_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data or len(result.data) == 0:
        return None
    return result.data[0]


def create_field(user_id: int, data: dict) -> dict:
    """Create a new field/plot for a user."""
    sb = get_supabase()
    field_data = {
        "user_id": user_id,
        "label": data.get("label", "Unnamed Field"),
        "area_ha": data.get("area_ha", 1.0),
        "irrigation": data.get("irrigation", "rainfed"),
        "soil_n": data.get("soil_n", 0),
        "soil_p": data.get("soil_p", 0),
        "soil_k": data.get("soil_k", 0),
        "soil_ph": data.get("soil_ph", 7.0),
        "soil_type": data.get("soil_type", ""),
        "previous_crop": data.get("previous_crop", ""),
        "current_crop": data.get("current_crop", ""),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "status": data.get("status", "active"),
    }
    result = sb.table("fields").insert(field_data).execute()
    if not result.data or len(result.data) == 0:
        raise ValueError("Failed to create field")
    return result.data[0]


def update_field(user_id: int, field_id: int, data: dict) -> dict | None:
    """Update an existing field. Returns updated field or None if not found."""
    # Verify ownership
    existing = get_field(user_id, field_id)
    if not existing:
        return None

    sb = get_supabase()
    update_data = {}
    allowed_fields = [
        "label", "area_ha", "irrigation", "soil_n", "soil_p", "soil_k",
        "soil_ph", "soil_type", "previous_crop", "current_crop",
        "latitude", "longitude", "status"
    ]
    for key in allowed_fields:
        if key in data:
            update_data[key] = data[key]

    if not update_data:
        return existing

    result = (
        sb.table("fields")
        .update(update_data)
        .eq("id", field_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else existing


def delete_field(user_id: int, field_id: int) -> bool:
    """Delete a field. Returns True if deleted."""
    existing = get_field(user_id, field_id)
    if not existing:
        return False

    sb = get_supabase()
    sb.table("fields").delete().eq("id", field_id).eq("user_id", user_id).execute()
    return True
