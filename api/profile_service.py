"""
Profile Service — CRUD operations for user profiles stored in Supabase.
"""

import json
from datetime import datetime

from db import get_supabase


def get_profile(user_id: int) -> dict | None:
    """Load a user's profile. Returns dict or None."""
    sb = get_supabase()
    result = sb.table("profiles").select("*").eq("user_id", user_id).execute()

    if not result.data or len(result.data) == 0:
        return None

    profile = result.data[0]

    # Ensure JSON fields are proper Python types (Supabase returns jsonb natively)
    if isinstance(profile.get("crops_grown"), str):
        try:
            profile["crops_grown"] = json.loads(profile["crops_grown"])
        except (json.JSONDecodeError, TypeError):
            profile["crops_grown"] = []

    if isinstance(profile.get("notifications"), str):
        try:
            profile["notifications"] = json.loads(profile["notifications"])
        except (json.JSONDecodeError, TypeError):
            profile["notifications"] = {}

    return profile


def save_profile(user_id: int, data: dict) -> dict:
    """Save or update a user's profile. Returns the saved profile."""
    sb = get_supabase()

    profile_data = {
        "user_id": user_id,
        "name": data.get("name", ""),
        "district": data.get("district", ""),
        "state": data.get("state", ""),
        "language": data.get("language", "en"),
        "role": data.get("role", "farmer"),
        "farm_size": data.get("farm_size"),
        "crops_grown": data.get("crops_grown", []),
        "notifications": data.get("notifications", {}),
        "email": data.get("email", ""),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "updated_at": datetime.utcnow().isoformat(),
    }

    # Upsert — insert or update if user_id already exists
    sb.table("profiles").upsert(profile_data, on_conflict="user_id").execute()

    # Also update the name in the users table
    if data.get("name"):
        sb.table("users").update({"name": data["name"]}).eq("id", user_id).execute()

    return get_profile(user_id)


def delete_profile(user_id: int) -> bool:
    """Delete a user's profile and account."""
    sb = get_supabase()
    sb.table("profiles").delete().eq("user_id", user_id).execute()
    sb.table("users").delete().eq("id", user_id).execute()
    return True
