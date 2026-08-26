"""
Pest Service — Season-aware, state-specific pest alerts using the crop pest knowledge base.
"""

import os
import json
import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PEST_KB_PATH = PROJECT_ROOT / "datasets" / "india_crop_pest_knowledge_base_v1.json"

_pest_data = None


def load_pest_data():
    """Load the pest knowledge base from JSON. Call once at startup."""
    global _pest_data
    try:
        if PEST_KB_PATH.exists():
            with open(PEST_KB_PATH, "r", encoding="utf-8") as f:
                _pest_data = json.load(f)
            states = len(_pest_data.get("state_crop_map", {}))
            profiles = len(_pest_data.get("pest_library", {}))
            print(f"  [OK] Pest knowledge base loaded ({states} states, {profiles} pest profiles)")
        else:
            print(f"  [WARN] Pest KB not found at {PEST_KB_PATH}")
    except Exception as e:
        print(f"  [ERROR] Failed to load pest KB: {e}")


def get_current_season() -> str:
    """Determine the current agricultural season based on month."""
    month = datetime.datetime.now().month
    if month in (6, 7, 8, 9, 10):
        return "kharif"
    elif month in (11, 12, 1, 2, 3):
        return "rabi"
    else:  # 4, 5
        return "zaid"


def get_season_info() -> dict:
    """Get current season details."""
    season = get_current_season()
    season_info = {
        "kharif": {
            "name": "Kharif",
            "period": "June - October",
            "description": "Monsoon season crops",
            "icon": "rain",
        },
        "rabi": {
            "name": "Rabi",
            "period": "November - March",
            "description": "Winter season crops",
            "icon": "snow",
        },
        "zaid": {
            "name": "Zaid",
            "period": "March - June",
            "description": "Short summer season crops",
            "icon": "sun",
        },
    }
    info = season_info.get(season, season_info["kharif"])
    info["key"] = season
    return info


def get_pest_alerts(state: str, season: str = None) -> dict:
    """
    Get pest alerts for a state and season.
    Returns crops grown in that state/season with their pest profiles.
    """
    if _pest_data is None:
        return {"error": "Pest knowledge base not loaded"}

    if not season:
        season = get_current_season()

    state_crop_map = _pest_data.get("state_crop_map", {})
    pest_profiles = _pest_data.get("pest_library", {})
    crop_aliases = _pest_data.get("crop_aliases", {})

    # Find state data
    state_data = state_crop_map.get(state, {})
    if not state_data:
        # Try case-insensitive match
        for s_name, s_data in state_crop_map.items():
            if s_name.lower() == state.lower():
                state_data = s_data
                break

    if not state_data:
        return {
            "state": state,
            "season": season,
            "crops": [],
            "message": f"No pest data available for {state}",
        }

    # Get crops for the season
    season_crops = state_data.get(season, [])

    result_crops = []
    for crop_entry in season_crops:
        crop_name = crop_entry.get("crop", "")
        pest_key = crop_entry.get("pest_profile_key", "")
        note = crop_entry.get("note", "")

        # Look up pest profile
        pest_profile = pest_profiles.get(pest_key, {})

        # Also check aliases
        if not pest_profile and pest_key in crop_aliases:
            pest_profile = pest_profiles.get(crop_aliases[pest_key], {})

        top_pests = pest_profile.get("top_pests", [])

        result_crops.append({
            "crop": crop_name,
            "pest_profile_key": pest_key,
            "common_name": pest_profile.get("common_name", crop_name),
            "note": note,
            "top_pests": top_pests,
            "basis": pest_profile.get("basis", ""),
            "pest_count": len(top_pests),
        })

    return {
        "state": state,
        "season": season,
        "season_info": get_season_info(),
        "crops": result_crops,
        "total_crops": len(result_crops),
    }


def get_pest_for_crop(crop_key: str) -> dict:
    """Get pest profile for a specific crop."""
    if _pest_data is None:
        return {"error": "Pest knowledge base not loaded"}

    pest_profiles = _pest_data.get("pest_library", {})
    crop_aliases = _pest_data.get("crop_aliases", {})

    # Direct lookup
    profile = pest_profiles.get(crop_key, {})

    # Try alias
    if not profile and crop_key in crop_aliases:
        profile = pest_profiles.get(crop_aliases[crop_key], {})

    # Try lowercase
    if not profile:
        for key, val in pest_profiles.items():
            if key.lower() == crop_key.lower():
                profile = val
                break

    if not profile:
        return {"error": f"No pest profile found for '{crop_key}'"}

    return {
        "crop_key": crop_key,
        "common_name": profile.get("common_name", crop_key),
        "top_pests": profile.get("top_pests", []),
        "basis": profile.get("basis", ""),
    }


def get_available_states() -> list:
    """Return list of states available in the pest knowledge base."""
    if _pest_data is None:
        return []
    return sorted(_pest_data.get("state_crop_map", {}).keys())
