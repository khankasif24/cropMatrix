"""
Fertilizer Service — ML-based fertilizer recommendation + organic remedy lookup.
Uses a trained RandomForest model on the fertilizer dataset and a JSON lookup for organic options.
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = PROJECT_ROOT / "latest_model"
ORGANIC_PATH = PROJECT_ROOT / "datasets" / "organic_fertilizer_lookup_v1.json"

_fertilizer_bundle = None
_organic_data = None


def load_fertilizer_models():
    """Load fertilizer recommendation model and organic lookup. Call once at startup."""
    global _fertilizer_bundle, _organic_data

    fert_model_path = MODEL_DIR / "fertilizer_recommendation_rf.pkl"

    # Load ML model
    try:
        if fert_model_path.exists():
            _fertilizer_bundle = joblib.load(fert_model_path)
            fert_types = _fertilizer_bundle.get("fertilizer_types", [])
            print(f"  [OK] Fertilizer model loaded ({len(fert_types)} types)")
        else:
            print(f"  [WARN] Fertilizer model not found at {fert_model_path} — train it first")
    except Exception as e:
        print(f"  [WARN] Fertilizer model failed to load: {e}")

    # Load organic lookup
    try:
        if ORGANIC_PATH.exists():
            with open(ORGANIC_PATH, "r", encoding="utf-8") as f:
                _organic_data = json.load(f)
            rules_count = len(_organic_data.get("rules", []))
            print(f"  [OK] Organic fertilizer lookup loaded ({rules_count} rules)")
        else:
            print(f"  [WARN] Organic lookup not found at {ORGANIC_PATH}")
    except Exception as e:
        print(f"  [WARN] Organic lookup failed: {e}")


def recommend_fertilizer(temperature: float, moisture: float, rainfall: float,
                          ph: float, nitrogen: float, phosphorous: float,
                          potassium: float, carbon: float,
                          soil: str, crop: str, top_k: int = 3) -> dict:
    """
    Recommend fertilizer using the trained ML model.
    Returns top-K fertilizer types with confidence scores.
    """
    if _fertilizer_bundle is None:
        # Fallback: rule-based recommendation
        return _rule_based_fertilizer(nitrogen, phosphorous, potassium, ph, soil)

    pipeline = _fertilizer_bundle["pipeline"]
    le = _fertilizer_bundle["label_encoder"]
    fertilizer_types = _fertilizer_bundle.get("fertilizer_types", [])

    sample = pd.DataFrame([{
        "Temperature": temperature,
        "Moisture": moisture,
        "Rainfall": rainfall,
        "PH": ph,
        "Nitrogen": nitrogen,
        "Phosphorous": phosphorous,
        "Potassium": potassium,
        "Carbon": carbon,
        "Soil": soil,
        "Crop": crop,
    }])

    try:
        proba = pipeline.predict_proba(sample)[0]
        clf_classes = pipeline.named_steps["clf"].classes_

        predictions = []
        for idx in range(len(proba)):
            encoded_label = clf_classes[idx]
            fert_name = le.inverse_transform([encoded_label])[0]
            predictions.append({
                "fertilizer": fert_name,
                "confidence": round(float(proba[idx]) * 100, 1),
            })

        predictions.sort(key=lambda x: x["confidence"], reverse=True)

        return {
            "recommendations": predictions[:top_k],
            "model_used": "randomforest",
            "all_types": fertilizer_types,
            "input": {
                "soil": soil,
                "crop": crop,
                "npk": {"N": nitrogen, "P": phosphorous, "K": potassium},
                "ph": ph,
            },
        }
    except Exception as e:
        return _rule_based_fertilizer(nitrogen, phosphorous, potassium, ph, soil)


def _rule_based_fertilizer(n: float, p: float, k: float, ph: float, soil: str) -> dict:
    """Simple rule-based fallback when ML model is not available."""
    recommendations = []

    if n < 50:
        recommendations.append({
            "fertilizer": "Urea",
            "confidence": 85.0,
            "reason": "Low nitrogen detected — Urea is a high-nitrogen fertilizer",
        })
    if p < 30:
        recommendations.append({
            "fertilizer": "DAP",
            "confidence": 80.0,
            "reason": "Low phosphorus detected — DAP provides phosphorus and nitrogen",
        })
    if k < 30:
        recommendations.append({
            "fertilizer": "Muriate Of Potash",
            "confidence": 78.0,
            "reason": "Low potassium detected — MOP is a concentrated potassium source",
        })

    if ph < 5.5:
        recommendations.append({
            "fertilizer": "Lime",
            "confidence": 75.0,
            "reason": "Acidic soil detected — Lime raises pH",
        })
    elif ph > 8.0:
        recommendations.append({
            "fertilizer": "Gypsum",
            "confidence": 75.0,
            "reason": "Alkaline soil detected — Gypsum helps reduce pH",
        })

    if not recommendations:
        recommendations.append({
            "fertilizer": "Balanced Npk Fertilizer",
            "confidence": 70.0,
            "reason": "General purpose balanced nutrition",
        })

    return {
        "recommendations": recommendations[:3],
        "model_used": "rule_based_fallback",
        "input": {"npk": {"N": n, "P": p, "K": k}, "ph": ph, "soil": soil},
    }


def get_organic_remedies(nitrogen: float, phosphorous: float, potassium: float) -> dict:
    """
    Get organic fertilizer recommendations based on low NPK values.
    Uses the organic_fertilizer_lookup_v1.json thresholds.
    """
    if _organic_data is None:
        return {"error": "Organic fertilizer data not loaded"}

    thresholds = _organic_data.get("meta", {}).get("default_thresholds", {})
    rules = _organic_data.get("rules", [])
    safety_notes = _organic_data.get("safety_and_usage_notes", [])

    low_n_thresh = 50
    low_p_thresh = 30
    low_k_thresh = 30

    results = []
    deficiencies = []

    for rule in rules:
        nutrient = rule.get("nutrient", "")

        if nutrient == "N" and nitrogen < low_n_thresh:
            deficiencies.append(f"Low Nitrogen (current: {nitrogen}, threshold: {low_n_thresh})")
            results.append({
                "nutrient": "Nitrogen (N)",
                "status": "LOW",
                "current_value": nitrogen,
                "threshold": low_n_thresh,
                "recommendations": rule.get("recommendations", []),
            })
        elif nutrient == "P" and phosphorous < low_p_thresh:
            deficiencies.append(f"Low Phosphorus (current: {phosphorous}, threshold: {low_p_thresh})")
            results.append({
                "nutrient": "Phosphorus (P)",
                "status": "LOW",
                "current_value": phosphorous,
                "threshold": low_p_thresh,
                "recommendations": rule.get("recommendations", []),
            })
        elif nutrient == "K" and potassium < low_k_thresh:
            deficiencies.append(f"Low Potassium (current: {potassium}, threshold: {low_k_thresh})")
            results.append({
                "nutrient": "Potassium (K)",
                "status": "LOW",
                "current_value": potassium,
                "threshold": low_k_thresh,
                "recommendations": rule.get("recommendations", []),
            })

    # Check if all are fine
    all_ok = len(results) == 0

    return {
        "deficiencies": results,
        "all_nutrients_ok": all_ok,
        "message": "All NPK levels are adequate!" if all_ok else f"Found {len(deficiencies)} nutrient deficienc{'y' if len(deficiencies) == 1 else 'ies'}",
        "safety_notes": safety_notes,
        "input": {"N": nitrogen, "P": phosphorous, "K": potassium},
    }


def get_fertilizer_metadata() -> dict:
    """Return metadata about the fertilizer model."""
    if _fertilizer_bundle is not None:
        return {
            "model_available": True,
            "fertilizer_types": _fertilizer_bundle.get("fertilizer_types", []),
            "soil_types": _fertilizer_bundle.get("soil_types", []),
            "crop_types": _fertilizer_bundle.get("crop_types", []),
        }
    return {
        "model_available": False,
        "note": "Using rule-based fallback — train the model first",
    }
