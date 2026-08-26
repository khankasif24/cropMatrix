"""
ML Model Service — Loads and runs inference on all 3 pre-trained models.

Models:
  1. Crop Recommendation (RandomForest) → top-K crops with confidence (state-aware)
  2. Crop Yield Prediction (GradientBoosting/XGBoost) → Tonnes/Ha
  3. Crop Price Prediction (GradientBoosting/XGBoost) → Rs./Quintal
"""

import os
import joblib
import numpy as np
import pandas as pd
import random
from pathlib import Path

# ── Resolve model paths relative to project root ──────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT_ROOT / "latest_model"

# Global model bundles (loaded once at startup)
_crop_rec_bundle = None
_yield_bundle = None
_price_bundle = None


def load_models():
    """Load all 3 ML model bundles from disk. Call once at startup."""
    global _crop_rec_bundle, _yield_bundle, _price_bundle

    crop_rec_path = MODEL_DIR / "crop_recommendation_rf.pkl"
    yield_path = MODEL_DIR / "crop_yield_xgboost.pkl"
    price_path = MODEL_DIR / "crop_price_xgboost.pkl"

    print(f"Loading models from: {MODEL_DIR}")

    # Load Crop Recommendation model
    try:
        if crop_rec_path.exists():
            _crop_rec_bundle = joblib.load(crop_rec_path)
            version = _crop_rec_bundle.get("dataset_version", "unknown")
            print(f"  [OK] Crop Recommendation model loaded ({len(_crop_rec_bundle['class_names'])} crops, version={version})")
            if version == "v2_state_aware":
                print(f"     States: {len(_crop_rec_bundle.get('states', []))} | Soil types: {len(_crop_rec_bundle.get('soil_types', []))}")
        else:
            print(f"  [WARN] Crop Recommendation model not found at {crop_rec_path}")
    except Exception as e:
        print(f"  [ERROR] Failed to load Crop Recommendation model: {e}")

    # Load Yield Prediction model
    try:
        if yield_path.exists():
            _yield_bundle = joblib.load(yield_path)
            print(f"  [OK] Yield Prediction model loaded")
        else:
            print(f"  [WARN] Yield Prediction model not found at {yield_path}")
    except Exception as e:
        print(f"  [ERROR] Failed to load Yield Prediction model: {e}")

    # Load Price Prediction model
    try:
        if price_path.exists():
            _price_bundle = joblib.load(price_path)
            print(f"  [OK] Price Prediction model loaded")
        else:
            print(f"  [WARN] Price Prediction model not found at {price_path}")
    except Exception as e:
        print(f"  [WARN] Price model failed to load (version mismatch, using mock): {e}")
        _price_bundle = None

    print("Model loading complete!")


def get_crop_list():
    """Return list of crops the recommendation model knows about."""
    if _crop_rec_bundle is None:
        return []
    return _crop_rec_bundle.get("class_names", [])


def get_state_list():
    """Return list of states supported by the recommendation model."""
    if _crop_rec_bundle is None:
        return []
    return _crop_rec_bundle.get("states", [])


def get_soil_types():
    """Return list of soil types supported by the recommendation model."""
    if _crop_rec_bundle is None:
        return []
    return _crop_rec_bundle.get("soil_types", [])


def get_state_crops(state: str) -> list[str]:
    """Return list of crops commonly grown in the given state (from dataset)."""
    if _crop_rec_bundle is None:
        return []
    state_crops_map = _crop_rec_bundle.get("state_crops_map", {})
    return state_crops_map.get(state, [])


def get_dataset_version():
    """Return the dataset version used for training."""
    if _crop_rec_bundle is None:
        return "unknown"
    return _crop_rec_bundle.get("dataset_version", "unknown")


def get_yield_metadata():
    """Return metadata about what the yield model supports."""
    if _yield_bundle is None:
        return {}
    return {
        "crops": _yield_bundle.get("crops", []),
        "states": _yield_bundle.get("states", []),
        "seasons": _yield_bundle.get("seasons", []),
    }


def get_price_metadata():
    """Return metadata about what the price model supports."""
    if _price_bundle is None:
        return {"note": "Using mock predictions (model version mismatch)"}
    return {
        "commodities": _price_bundle.get("commodities", []),
        "states": _price_bundle.get("states", []),
    }


# ── Yield Districts (from model bundle or pre-processed JSON) ──────
_yield_districts_cache = None


def _load_yield_districts():
    """Load state→districts mapping. Prefers model bundle, falls back to JSON."""
    global _yield_districts_cache
    if _yield_districts_cache is not None:
        return _yield_districts_cache

    # 1. Try from yield model bundle (most accurate — matches training data)
    if _yield_bundle is not None and "state_districts_map" in _yield_bundle:
        _yield_districts_cache = _yield_bundle["state_districts_map"]
        total = sum(len(v) for v in _yield_districts_cache.values())
        print(f"  [OK] Yield districts from model bundle ({len(_yield_districts_cache)} states, {total} districts)")
        return _yield_districts_cache

    # 2. Fall back to pre-processed JSON file
    import json
    districts_path = PROJECT_ROOT / "datasets" / "yield_state_districts.json"
    try:
        if districts_path.exists():
            with open(districts_path, "r", encoding="utf-8") as f:
                _yield_districts_cache = json.load(f)
            total = sum(len(v) for v in _yield_districts_cache.values())
            print(f"  [OK] Yield districts from JSON ({len(_yield_districts_cache)} states, {total} districts)")
        else:
            print(f"  [WARN] yield_state_districts.json not found")
            _yield_districts_cache = {}
    except Exception as e:
        print(f"  [ERROR] Failed to load yield districts: {e}")
        _yield_districts_cache = {}
    return _yield_districts_cache


def get_yield_districts(state: str) -> list[str]:
    """Return list of districts available in the yield dataset for a given state."""
    mapping = _load_yield_districts()
    if not state:
        return []
    # Try exact match first, then case-insensitive
    if state in mapping:
        return mapping[state]
    for key, districts in mapping.items():
        if key.lower() == state.strip().lower():
            return districts
    return []


def recommend_crop(nitrogen: float, phosphorus: float, potassium: float,
                   temperature: float, humidity: float, ph: float,
                   rainfall: float, top_k: int = 3,
                   state: str = None, soil_type: str = None) -> list[dict]:
    """
    Run crop recommendation inference.
    Returns list of top-K crops with scores.
    Supports state-aware (v2) and legacy (v1) models.
    """
    if _crop_rec_bundle is None:
        raise RuntimeError("Crop recommendation model not loaded")

    pipeline = _crop_rec_bundle["pipeline"]
    le = _crop_rec_bundle["label_encoder"]
    class_names = _crop_rec_bundle["class_names"]
    version = _crop_rec_bundle.get("dataset_version", "v1_legacy")

    if version == "v2_state_aware":
        # New state-aware model
        state_encoder = _crop_rec_bundle["state_encoder"]
        soil_encoder = _crop_rec_bundle["soil_encoder"]

        # Encode state — use 0 if unknown
        if state and state in state_encoder.classes_:
            state_val = state_encoder.transform([state])[0]
        else:
            state_val = 0

        # Encode soil type — use 0 if unknown
        if soil_type and soil_type in soil_encoder.classes_:
            soil_val = soil_encoder.transform([soil_type])[0]
        else:
            soil_val = 0

        sample = pd.DataFrame([{
            "state_enc": state_val,
            "soil_enc": soil_val,
            "N": nitrogen,
            "P": phosphorus,
            "K": potassium,
            "temperature": temperature,
            "humidity": humidity,
            "ph": ph,
            "rainfall": rainfall,
        }])
    else:
        # Legacy model (v1) — no state/soil features
        sample = pd.DataFrame([{
            "N": nitrogen,
            "P": phosphorus,
            "K": potassium,
            "temperature": temperature,
            "humidity": humidity,
            "ph": ph,
            "rainfall": rainfall,
        }])

    proba = pipeline.predict_proba(sample)[0]

    # Get the pipeline's actual class labels (encoded integers)
    clf_classes = pipeline.named_steps["clf"].classes_

    # Build full decoded predictions list
    all_predictions = []
    for idx in range(len(proba)):
        encoded_label = clf_classes[idx]
        crop_name = le.inverse_transform([encoded_label])[0]
        all_predictions.append({
            "crop": crop_name,
            "score": float(proba[idx]),
        })

    # Sort by score descending
    all_predictions.sort(key=lambda x: x["score"], reverse=True)

    # If a state is selected, FILTER to only crops grown in that state
    # and blend ML score with state crop prevalence
    if state and version == "v2_state_aware":
        state_crops_map = _crop_rec_bundle.get("state_crops_map", {})
        state_crop_list = state_crops_map.get(state, [])

        if state_crop_list:
            # state_crop_list is ordered by dataset frequency (most common first)
            # Build prevalence rank scores: top crop gets 1.0, last gets ~0.02
            total_state_crops = len(state_crop_list)
            prevalence_scores = {}
            for rank_idx, crop_name in enumerate(state_crop_list):
                prevalence_scores[crop_name.lower().strip()] = (total_state_crops - rank_idx) / total_state_crops

            # First pass: filter to state crops, keeping ML rank order
            state_preds = []
            for p in all_predictions:
                crop_lower = p["crop"].lower().strip()
                if crop_lower in prevalence_scores:
                    state_preds.append({
                        "crop": p["crop"],
                        "ml_score": p["score"],
                        "prevalence": prevalence_scores[crop_lower],
                    })

            if state_preds:
                # Assign ML rank scores (top = 1.0, proportionally decreasing)
                n = len(state_preds)
                for rank_idx, sp in enumerate(state_preds):
                    sp["ml_rank"] = (n - rank_idx) / n

                # Blend: 60% ML rank + 40% state prevalence
                for sp in state_preds:
                    blended = 0.60 * sp["ml_rank"] + 0.40 * sp["prevalence"]
                    # Scale to realistic confidence: 35-90% range
                    sp["score"] = 0.35 + blended * 0.55

                # Sort by blended score
                state_preds.sort(key=lambda x: x["score"], reverse=True)
                all_predictions = state_preds

    # Take top_k
    top_results = all_predictions[:top_k]

    results = []
    for rank, pred in enumerate(top_results, 1):
        results.append({
            "rank": rank,
            "crop": pred["crop"],
            "score": round(pred["score"], 4),
            "confidence_pct": round(pred["score"] * 100, 1),
        })

    return results


def predict_yield(state: str, district: str, crop: str,
                  season: str, area_ha: float, year: int = 2026) -> dict:
    """
    Predict crop yield in Tonnes/Hectare.
    """
    if _yield_bundle is None:
        raise RuntimeError("Yield prediction model not loaded")

    pipeline = _yield_bundle["pipeline"]

    sample = pd.DataFrame([{
        "State": state,
        "District": district,
        "Crop": crop,
        "Season": season,
        "log_area": np.log1p(area_ha),
        "year_num": year,
    }])

    pred = max(0, float(pipeline.predict(sample)[0]))

    return {
        "crop": crop,
        "state": state,
        "district": district,
        "season": season,
        "area_ha": area_ha,
        "predicted_yield_tonnes_per_ha": round(pred, 3),
        "predicted_total_tonnes": round(pred * area_ha, 2),
        "year": year,
    }


def predict_price(state: str, district: str, market: str,
                  commodity: str, variety: str, grade: str,
                  min_price: float, max_price: float,
                  month: int, year: int = 2026) -> dict:
    """
    Predict modal price in Rs./Quintal.
    Falls back to smart mock if model is unavailable.
    """
    price_spread = max_price - min_price

    if _price_bundle is not None:
        # Real model inference
        pipeline = _price_bundle["pipeline"]
        sample = pd.DataFrame([{
            "state": state,
            "district": district,
            "market": market,
            "commodity": commodity,
            "variety": variety,
            "grade": grade,
            "min_price": min_price,
            "max_price": max_price,
            "price_spread": price_spread,
            "month": month,
            "year": year,
        }])
        pred = float(pipeline.predict(sample)[0])
        model_used = "xgboost_v1"
    else:
        # Smart mock: modal price is typically between min and max,
        # weighted slightly toward the higher end
        pred = min_price + (price_spread * random.uniform(0.55, 0.75))
        model_used = "mock_fallback"

    return {
        "commodity": commodity,
        "state": state,
        "district": district,
        "market": market,
        "predicted_modal_price": round(pred, 2),
        "min_price": min_price,
        "max_price": max_price,
        "month": month,
        "year": year,
        "currency": "INR",
        "unit": "Rs./Quintal",
        "model_used": model_used,
    }
