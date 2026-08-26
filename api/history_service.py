"""
History Service — Save and retrieve recommendation history and disease scan history.
"""

from db import get_supabase


# ── Recommendation History ────────────────────────────


def save_recommendation(user_id: int, input_data: dict, recommendations: list,
                        model_version: str = "", inference_ms: int = 0) -> dict:
    """Save a crop recommendation to history."""
    sb = get_supabase()
    record = {
        "user_id": user_id,
        "input_data": input_data,
        "recommendations": recommendations,
        "model_version": model_version,
        "inference_ms": inference_ms,
    }
    result = sb.table("recommendation_history").insert(record).execute()
    return result.data[0] if result.data else record


def get_recommendation_history(user_id: int, limit: int = 20) -> list:
    """Get the recommendation history for a user, most recent first."""
    sb = get_supabase()
    result = (
        sb.table("recommendation_history")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def delete_recommendation(user_id: int, record_id: int) -> bool:
    """Delete a single recommendation history entry."""
    sb = get_supabase()
    sb.table("recommendation_history").delete().eq("id", record_id).eq("user_id", user_id).execute()
    return True


# ── Disease Scan History ──────────────────────────────


def save_disease_scan(user_id: int, crop: str, disease: str, confidence: float,
                      is_healthy: bool, treatment: dict = None,
                      all_predictions: list = None) -> dict:
    """Save a disease detection scan to history."""
    sb = get_supabase()
    record = {
        "user_id": user_id,
        "crop": crop,
        "disease": disease,
        "confidence": confidence,
        "is_healthy": is_healthy,
        "treatment": treatment or {},
        "all_predictions": all_predictions or [],
    }
    result = sb.table("disease_scans").insert(record).execute()
    return result.data[0] if result.data else record


def get_disease_history(user_id: int, limit: int = 20) -> list:
    """Get the disease scan history for a user, most recent first."""
    sb = get_supabase()
    result = (
        sb.table("disease_scans")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


def delete_disease_scan(user_id: int, scan_id: int) -> bool:
    """Delete a single disease scan entry."""
    sb = get_supabase()
    sb.table("disease_scans").delete().eq("id", scan_id).eq("user_id", user_id).execute()
    return True
