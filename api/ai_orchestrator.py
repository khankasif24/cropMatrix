"""
CropMatrix AI Orchestrator
==========================
Safe intent-routing layer for the CropMatrix AI Assistant.

IMPORTANT:
- This file does NOT replace routes.py.
- It does NOT modify existing services.
- It only reads/calls existing service functions when enough information
  is available to do so safely.
- If required inputs are missing, it returns a guidance/context object
  instead of inventing values.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

from ml_service import (
    get_crop_list,
    get_state_list,
    get_state_crops,
    get_soil_types,
    get_yield_metadata,
)

from weather_service import (
    get_current_weather,
    get_forecast,
    check_severe_weather,
)

from market_service import (
    get_market_metadata,
    get_historical_prices,
    get_commodities_for_location,
)

from pest_service import (
    get_pest_alerts,
    get_pest_for_crop,
    get_season_info,
    get_available_states as get_pest_states,
)

from fertilizer_service import (
    get_fertilizer_metadata,
)


# ============================================================
# SMALL TEXT HELPERS
# ============================================================

def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def _lower(text: str) -> str:
    return _clean(text).lower()


def _contains_any(text: str, keywords: List[str]) -> bool:
    value = _lower(text)
    return any(keyword in value for keyword in keywords)


def _safe_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(x) for x in value if x is not None]
    return []


def _match_known_value(message: str, values: List[str]) -> Optional[str]:
    """
    Match the longest known value inside the user message.
    Case-insensitive, word-ish boundary matching.
    """
    text = _lower(message)

    candidates = sorted(
        [v for v in values if isinstance(v, str) and v.strip()],
        key=len,
        reverse=True,
    )

    for value in candidates:
        value_l = value.lower().strip()

        if not value_l:
            continue

        # Good for multi-word names such as "Uttar Pradesh"
        pattern = r"(?<!\w)" + re.escape(value_l) + r"(?!\w)"

        if re.search(pattern, text):
            return value

    return None


def _extract_number_after_label(
    message: str,
    labels: List[str],
) -> Optional[float]:
    """
    Examples supported:
      N 50
      N=50
      nitrogen: 50
      pH 6.5
      rainfall 120
    """
    text = message or ""

    joined = "|".join(re.escape(label) for label in labels)

    pattern = (
        rf"(?i)(?:{joined})"
        rf"\s*(?:=|:|is)?\s*"
        rf"(-?\d+(?:\.\d+)?)"
    )

    match = re.search(pattern, text)

    if not match:
        return None

    try:
        return float(match.group(1))
    except (TypeError, ValueError):
        return None


def _extract_lat_lon(message: str) -> Optional[Tuple[float, float]]:
    """
    Supports:
      25.3176, 82.9739
      lat 25.3176 lon 82.9739
      latitude: 25.3 longitude: 82.9
    """

    # Explicit labels first
    lat = _extract_number_after_label(
        message,
        ["lat", "latitude"],
    )

    lon = _extract_number_after_label(
        message,
        ["lon", "lng", "longitude"],
    )

    if lat is not None and lon is not None:
        if -90 <= lat <= 90 and -180 <= lon <= 180:
            return lat, lon

    # Fallback: decimal pair separated by comma
    match = re.search(
        r"(-?\d{1,2}(?:\.\d+)?)\s*,\s*"
        r"(-?\d{1,3}(?:\.\d+)?)",
        message or "",
    )

    if match:
        try:
            lat = float(match.group(1))
            lon = float(match.group(2))

            if -90 <= lat <= 90 and -180 <= lon <= 180:
                return lat, lon
        except ValueError:
            pass

    return None


# ============================================================
# KNOWN VALUES
# ============================================================

def _known_states() -> List[str]:
    states = set()

    try:
        states.update(_safe_list(get_state_list()))
    except Exception:
        pass

    try:
        states.update(_safe_list(get_pest_states()))
    except Exception:
        pass

    try:
        metadata = get_market_metadata() or {}

        state_data = metadata.get("states")

        if isinstance(state_data, dict):
            states.update(str(k) for k in state_data.keys())
        elif isinstance(state_data, list):
            states.update(str(x) for x in state_data)
    except Exception:
        pass

    return sorted(states)


def _known_crops() -> List[str]:
    crops = set()

    try:
        crops.update(_safe_list(get_crop_list()))
    except Exception:
        pass

    try:
        fert_meta = get_fertilizer_metadata() or {}
        crops.update(_safe_list(fert_meta.get("crop_types")))
    except Exception:
        pass

    try:
        market_meta = get_market_metadata() or {}
        crops.update(_safe_list(market_meta.get("commodities")))
    except Exception:
        pass

    return sorted(crops)


# ============================================================
# INTENT DETECTION
# ============================================================

def detect_intent(message: str) -> str:
    """
    Lightweight intent classifier.

    This intentionally stays conservative. When uncertain,
    it returns 'general' so Gemini can answer normally.
    """
    text = _lower(message)

    if not text:
        return "general"

    # Weather
    if _contains_any(
        text,
        [
            "weather",
            "forecast",
            "rain",
            "rainfall",
            "temperature",
            "humidity",
            "storm",
            "heatwave",
        ],
    ):
        return "weather"

    # Market / mandi
    if _contains_any(
        text,
        [
            "market price",
            "mandi price",
            "mandi",
            "price of",
            "price for",
            "market rate",
            "commodity price",
        ],
    ):
        return "market"

    # Pest
    if _contains_any(
        text,
        [
            "pest",
            "insect",
            "insects",
            "bollworm",
            "borer",
            "aphid",
            "whitefly",
            "armyworm",
        ],
    ):
        return "pest"

    # Fertilizer / nutrients
    if _contains_any(
        text,
        [
            "fertilizer",
            "fertiliser",
            "urea",
            "dap",
            "npk",
            "nitrogen",
            "phosphorus",
            "phosphorous",
            "potassium",
            "organic manure",
            "organic fertilizer",
        ],
    ):
        return "fertilizer"

    # Yield
    if _contains_any(
        text,
        [
            "yield prediction",
            "predict yield",
            "expected yield",
            "yield per hectare",
            "tonnes per hectare",
        ],
    ):
        return "yield"

    # Disease (text-only chatbot should guide to scanner)
    if _contains_any(
        text,
        [
            "disease",
            "leaf disease",
            "leaf spot",
            "blight",
            "rust",
            "fungus",
            "fungal",
            "infected leaf",
        ],
    ):
        return "disease"

    # Crop recommendation / state crops
    if _contains_any(
        text,
        [
            "recommend crop",
            "crop recommendation",
            "which crop",
            "what crop",
            "best crop",
            "crops for",
            "crops in",
            "grow in",
            "suitable crop",
        ],
    ):
        return "crop"

    return "general"


# ============================================================
# PROJECT CONTEXT BUILDERS
# ============================================================

def _crop_context(message: str) -> Dict[str, Any]:
    state = _match_known_value(message, _known_states())

    # If the user is only asking common/state crops, use the real
    # state-aware crop map. Do not invent NPK/weather values.
    if state and not _contains_any(
        message,
        [
            "my soil",
            "my field",
            "recommend for my farm",
            "recommend for my field",
            "based on soil",
            "npk",
            "nitrogen",
            "phosphorus",
            "potassium",
            "ph ",
            "rainfall",
            "humidity",
        ],
    ):
        try:
            crops = get_state_crops(state)

            return {
                "handled": True,
                "intent": "crop",
                "source": "CropMatrix state-aware crop dataset",
                "data": {
                    "state": state,
                    "crops": crops[:15],
                },
                "instruction": (
                    "Explain these real CropMatrix state-crop results. "
                    "Do not claim that they are personalized farm recommendations "
                    "because soil and weather measurements were not supplied."
                ),
            }
        except Exception as exc:
            return {
                "handled": False,
                "intent": "crop",
                "error": str(exc),
            }

    # Full personalized crop recommendation requires these values.
    required = {
        "nitrogen": _extract_number_after_label(
            message,
            ["nitrogen", "n"],
        ),
        "phosphorus": _extract_number_after_label(
            message,
            ["phosphorus", "phosphorous", "p"],
        ),
        "potassium": _extract_number_after_label(
            message,
            ["potassium", "k"],
        ),
        "temperature": _extract_number_after_label(
            message,
            ["temperature", "temp"],
        ),
        "humidity": _extract_number_after_label(
            message,
            ["humidity"],
        ),
        "ph": _extract_number_after_label(
            message,
            ["ph", "soil ph"],
        ),
        "rainfall": _extract_number_after_label(
            message,
            ["rainfall", "rain"],
        ),
    }

    missing = [
        key
        for key, value in required.items()
        if value is None
    ]

    if missing:
        return {
            "handled": True,
            "intent": "crop",
            "source": "CropMatrix crop recommendation model requirements",
            "needs_input": True,
            "data": {
                "state": state,
                "missing_inputs": missing,
                "required_inputs": [
                    "nitrogen (N)",
                    "phosphorus (P)",
                    "potassium (K)",
                    "temperature",
                    "humidity",
                    "soil pH",
                    "rainfall",
                ],
            },
            "instruction": (
                "Do not invent the missing farm measurements. "
                "Ask the farmer for the missing values or guide them to "
                "CropMatrix AI Crop Advisory."
            ),
        }

    # We deliberately do NOT call recommend_crop here yet because routes.py
    # applies additional scoring logic. This avoids bypassing that working flow.
    return {
        "handled": True,
        "intent": "crop",
        "source": "CropMatrix crop recommendation input validator",
        "needs_input": False,
        "data": {
            "state": state,
            **required,
        },
        "instruction": (
            "The farmer supplied enough core measurements for CropMatrix crop "
            "recommendation, but the chatbot orchestrator is configured not to "
            "bypass the existing scoring route. Guide them to AI Crop Advisory "
            "for the final model-ranked recommendation."
        ),
    }


def _weather_context(message: str) -> Dict[str, Any]:
    coords = _extract_lat_lon(message)

    if not coords:
        return {
            "handled": True,
            "intent": "weather",
            "source": "CropMatrix OpenWeatherMap service requirements",
            "needs_input": True,
            "data": {
                "missing_inputs": [
                    "latitude",
                    "longitude",
                ]
            },
            "instruction": (
                "Do not invent live weather. Ask the user to allow location "
                "access/use the Weather page, or provide latitude and longitude."
            ),
        }

    lat, lon = coords

    try:
        current = get_current_weather(lat, lon)
        forecast = get_forecast(lat, lon)
        alerts = check_severe_weather(
            lat,
            lon,
            days_ahead=2,
        )

        return {
            "handled": True,
            "intent": "weather",
            "source": "OpenWeatherMap via CropMatrix weather_service",
            "data": {
                "latitude": lat,
                "longitude": lon,
                "current": current,
                "forecast": forecast[:5],
                "alerts": alerts,
            },
            "instruction": (
                "Use only the provided weather data for live claims. "
                "If current contains an error, clearly say live weather "
                "could not be retrieved."
            ),
        }

    except Exception as exc:
        return {
            "handled": False,
            "intent": "weather",
            "error": str(exc),
        }


def _market_context(message: str) -> Dict[str, Any]:
    states = _known_states()
    crops = _known_crops()

    state = _match_known_value(
        message,
        states,
    )

    commodity = _match_known_value(
        message,
        crops,
    )

    # If the global crop list did not identify a commodity,
    # try the market metadata specifically.
    if not commodity:
        try:
            metadata = get_market_metadata() or {}
            commodity = _match_known_value(
                message,
                _safe_list(
                    metadata.get("commodities")
                ),
            )
        except Exception:
            pass

    if not commodity:
        return {
            "handled": True,
            "intent": "market",
            "source": "CropMatrix Agmarknet market service requirements",
            "needs_input": True,
            "data": {
                "state": state,
                "missing_inputs": ["commodity"],
            },
            "instruction": (
                "Ask which crop/commodity price the farmer wants. "
                "Do not invent a live mandi price."
            ),
        }

    try:
        result = get_historical_prices(
            commodity=commodity,
            state=state or None,
            district=None,
            market=None,
            days=30,
        )

        return {
            "handled": True,
            "intent": "market",
            "source": "Agmarknet dataset via CropMatrix market_service",
            "data": result,
            "instruction": (
                "Explain the latest available CropMatrix market dataset result. "
                "Call it historical/latest-available data, not guaranteed live "
                "real-time pricing."
            ),
        }

    except Exception as exc:
        return {
            "handled": False,
            "intent": "market",
            "error": str(exc),
        }


def _pest_context(message: str) -> Dict[str, Any]:
    state = _match_known_value(
        message,
        _known_states(),
    )

    crop = _match_known_value(
        message,
        _known_crops(),
    )

    # State-specific alerts are preferable when a state is present.
    if state:
        try:
            result = get_pest_alerts(
                state,
                None,
            )

            return {
                "handled": True,
                "intent": "pest",
                "source": "CropMatrix pest knowledge base",
                "data": result,
                "instruction": (
                    "Explain only the pest profiles contained in the CropMatrix "
                    "knowledge base. Avoid claiming a field is infected without "
                    "visual/field evidence."
                ),
            }

        except Exception as exc:
            return {
                "handled": False,
                "intent": "pest",
                "error": str(exc),
            }

    if crop:
        try:
            result = get_pest_for_crop(crop)

            return {
                "handled": True,
                "intent": "pest",
                "source": "CropMatrix pest knowledge base",
                "data": result,
                "instruction": (
                    "Explain the known pest profile for this crop. "
                    "Do not diagnose an actual infestation."
                ),
            }

        except Exception as exc:
            return {
                "handled": False,
                "intent": "pest",
                "error": str(exc),
            }

    try:
        season = get_season_info()
    except Exception:
        season = {}

    return {
        "handled": True,
        "intent": "pest",
        "source": "CropMatrix pest knowledge base requirements",
        "needs_input": True,
        "data": {
            "current_season": season,
            "missing_inputs": [
                "state or crop",
            ],
        },
        "instruction": (
            "Ask the farmer for the state or crop before giving "
            "CropMatrix pest-specific advice."
        ),
    }


def _fertilizer_context(message: str) -> Dict[str, Any]:
    crop = _match_known_value(
        message,
        _known_crops(),
    )

    soil = None

    try:
        soil = _match_known_value(
            message,
            _safe_list(
                get_fertilizer_metadata().get(
                    "soil_types"
                )
            ),
        )
    except Exception:
        soil = None

    required = {
        "nitrogen": _extract_number_after_label(
            message,
            ["nitrogen", "n"],
        ),
        "phosphorous": _extract_number_after_label(
            message,
            ["phosphorus", "phosphorous", "p"],
        ),
        "potassium": _extract_number_after_label(
            message,
            ["potassium", "k"],
        ),
        "ph": _extract_number_after_label(
            message,
            ["ph", "soil ph"],
        ),
    }

    missing = [
        key
        for key, value in required.items()
        if value is None
    ]

    # Full fertilizer ML route also expects weather/moisture/carbon.
    # We do not silently use its defaults from a conversational question.
    extra_missing = []

    if crop is None:
        extra_missing.append("crop")

    if soil is None:
        extra_missing.append("soil type")

    missing += extra_missing

    if missing:
        return {
            "handled": True,
            "intent": "fertilizer",
            "source": "CropMatrix fertilizer model requirements",
            "needs_input": True,
            "data": {
                "crop": crop,
                "soil": soil,
                "missing_inputs": missing,
            },
            "instruction": (
                "Do not invent fertilizer-model inputs. Ask for the missing "
                "soil/crop/NPK information or guide the farmer to the "
                "Fertilizer Advisor."
            ),
        }

    return {
        "handled": True,
        "intent": "fertilizer",
        "source": "CropMatrix fertilizer input validator",
        "needs_input": False,
        "data": {
            "crop": crop,
            "soil": soil,
            **required,
        },
        "instruction": (
            "The farmer provided important fertilizer inputs. "
            "For the final ML recommendation, guide them to the CropMatrix "
            "Fertilizer Advisor so the full model inputs can be captured."
        ),
    }


def _yield_context(message: str) -> Dict[str, Any]:
    state = _match_known_value(
        message,
        _known_states(),
    )

    crop = _match_known_value(
        message,
        _known_crops(),
    )

    area = _extract_number_after_label(
        message,
        ["area", "hectare", "hectares", "ha"],
    )

    metadata = {}

    try:
        metadata = get_yield_metadata() or {}
    except Exception:
        pass

    missing = []

    if not state:
        missing.append("state")

    if not crop:
        missing.append("crop")

    if area is None:
        missing.append("area in hectares")

    # District + season are also required by the existing yield model.
    missing.extend(
        [
            "district",
            "season",
        ]
    )

    return {
        "handled": True,
        "intent": "yield",
        "source": "CropMatrix yield model requirements",
        "needs_input": True,
        "data": {
            "state": state,
            "crop": crop,
            "area_ha": area,
            "missing_inputs": missing,
            "supported_metadata": metadata,
        },
        "instruction": (
            "Do not invent yield-model inputs or predicted yield. "
            "Ask for state, district, crop, season and area, or guide "
            "the farmer to Yield Prediction."
        ),
    }


def _disease_context(message: str) -> Dict[str, Any]:
    crop = _match_known_value(
        message,
        _known_crops(),
    )

    return {
        "handled": True,
        "intent": "disease",
        "source": "CropMatrix Disease Scanner requirements",
        "needs_input": True,
        "data": {
            "crop": crop,
            "missing_inputs": [
                "crop leaf image",
            ],
        },
        "instruction": (
            "Do not diagnose a crop disease from text alone. "
            "Tell the farmer to open Disease Scanner and upload a clear "
            "leaf image. You may give general symptom guidance, but label "
            "it as general guidance rather than a diagnosis."
        ),
    }


# ============================================================
# PUBLIC ORCHESTRATOR FUNCTION
# ============================================================

def build_project_context(
    message: str,
) -> Dict[str, Any]:
    """
    Build safe project-grounded context for the chatbot.

    Return shape:
    {
        "handled": bool,
        "intent": str,
        "source": str | None,
        "needs_input": bool | optional,
        "data": {...},
        "instruction": str | optional
    }

    This function is safe to call before Gemini. If it returns
    handled=False or intent='general', Gemini can answer normally.
    """

    message = _clean(message)

    if not message:
        return {
            "handled": False,
            "intent": "general",
            "data": {},
        }

    intent = detect_intent(message)

    try:
        if intent == "crop":
            return _crop_context(message)

        if intent == "weather":
            return _weather_context(message)

        if intent == "market":
            return _market_context(message)

        if intent == "pest":
            return _pest_context(message)

        if intent == "fertilizer":
            return _fertilizer_context(message)

        if intent == "yield":
            return _yield_context(message)

        if intent == "disease":
            return _disease_context(message)

    except Exception as exc:
        # Fail safely. The existing Gemini chatbot can still answer.
        return {
            "handled": False,
            "intent": intent,
            "error": str(exc),
            "data": {},
        }

    return {
        "handled": False,
        "intent": "general",
        "data": {},
    }


def orchestrator_health() -> Dict[str, Any]:
    """
    Small diagnostic helper. It does not call external APIs.
    """
    return {
        "status": "ready",
        "supported_intents": [
            "crop",
            "weather",
            "market",
            "pest",
            "fertilizer",
            "yield",
            "disease",
            "general",
        ],
        "routing_mode": "safe_context_only",
    }