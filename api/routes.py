"""
API Routes — All endpoints for Smart Crop Advisory.
"""

from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, Request
from pydantic import BaseModel, Field
from typing import Optional, List
import time
import random
import json
import os

from ml_service import (
    recommend_crop, predict_yield, predict_price,
    get_crop_list, get_yield_metadata, get_price_metadata,
    get_state_list, get_soil_types, get_state_crops, get_dataset_version,
    get_yield_districts
)
from scoring_engine import apply_scoring
from disease_service import detect_disease, get_supported_disease_crops
from auth_service import register_user, login_user, get_current_user, google_login
from profile_service import get_profile, save_profile, delete_profile
from fields_service import (
    get_fields, get_field, create_field, update_field, delete_field
)
from history_service import (
    save_recommendation, get_recommendation_history, delete_recommendation,
    save_disease_scan, get_disease_history, delete_disease_scan
)
from planner_service import (
    get_plans, get_plans_grouped, create_plan, update_plan,
    delete_plan, delete_plans_for_plot
)
from location_service import get_location_from_ip
from weather_service import get_current_weather, get_forecast, check_severe_weather
from email_service import send_weather_alert, check_and_send_alerts_for_all_users
from pest_service import get_pest_alerts, get_pest_for_crop, get_season_info, get_available_states as get_pest_states
from fertilizer_service import recommend_fertilizer, get_organic_remedies, get_fertilizer_metadata
from market_service import get_market_metadata, get_historical_prices, get_commodities_for_location

router = APIRouter(prefix="/api")

# ── Load state crop recommendations from JSON ────────────
STATE_RECS_PATH = os.path.join(os.path.dirname(__file__), "..", "datasets", "state_crop_recommendations.json")
_state_recs = {}
try:
    if os.path.exists(STATE_RECS_PATH):
        with open(STATE_RECS_PATH, "r", encoding="utf-8") as f:
            _state_recs = json.load(f)
        print(f"  [OK] State recommendations loaded ({len(_state_recs)} states)")
except Exception as e:
    print(f"  [WARN] Failed to load state recommendations: {e}")


# ── Pydantic Models ───────────────────────────────────────

class CropRecommendRequest(BaseModel):
    nitrogen: float = Field(..., ge=0, le=500, description="Nitrogen (N) in kg/ha")
    phosphorus: float = Field(..., ge=0, le=500, description="Phosphorus (P) in kg/ha")
    potassium: float = Field(..., ge=0, le=500, description="Potassium (K) in kg/ha")
    temperature: float = Field(..., ge=-10, le=60, description="Temperature in °C")
    humidity: float = Field(..., ge=0, le=100, description="Humidity in %")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    rainfall: float = Field(..., ge=0, le=5000, description="Rainfall in mm")
    season: str = Field(default="kharif", description="Season: kharif, rabi, or zaid")
    previous_crop: Optional[str] = Field(default=None, description="Previous crop name")
    state: Optional[str] = Field(default=None, description="State name for location-aware recommendation")
    soil_type: Optional[str] = Field(default=None, description="Soil type (e.g., Alluvial soil, Red soil)")


class YieldPredictionRequest(BaseModel):
    state: str = Field(..., description="State name")
    district: str = Field(..., description="District name")
    crop: str = Field(..., description="Crop name")
    season: str = Field(default="Kharif", description="Season")
    area_ha: float = Field(..., gt=0, description="Area in hectares")
    year: int = Field(default=2026, description="Year")


class PricePredictionRequest(BaseModel):
    state: str = Field(..., description="State name")
    district: str = Field(..., description="District name")
    market: str = Field(..., description="Market/Mandi name")
    commodity: str = Field(..., description="Commodity/Crop name")
    variety: str = Field(default="Other", description="Variety")
    grade: str = Field(default="FAQ", description="Grade")
    min_price: float = Field(..., gt=0, description="Minimum price Rs./Quintal")
    max_price: float = Field(..., gt=0, description="Maximum price Rs./Quintal")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    year: int = Field(default=2026, description="Year")


class AuthRegisterRequest(BaseModel):
    phone: str = Field(..., min_length=10, description="Phone number")
    password: str = Field(..., min_length=4, description="Password")
    name: str = Field(default="", description="Full name")


class AuthLoginRequest(BaseModel):
    phone: str = Field(..., description="Phone number")
    password: str = Field(..., description="Password")


class GoogleLoginRequest(BaseModel):
    access_token: str = Field(..., description="Supabase access token from Google OAuth")


class ProfileRequest(BaseModel):
    name: str = ""
    district: str = ""
    state: str = ""
    language: str = "en"
    role: str = "farmer"
    farm_size: Optional[float] = None
    crops_grown: list = []
    notifications: dict = {}
    email: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class FertilizerRequest(BaseModel):
    temperature: float = Field(default=25, description="Temperature in C")
    moisture: float = Field(default=50, description="Moisture %")
    rainfall: float = Field(default=100, description="Rainfall mm")
    ph: float = Field(default=6.5, description="Soil pH")
    nitrogen: float = Field(default=50, description="Nitrogen")
    phosphorous: float = Field(default=50, description="Phosphorous")
    potassium: float = Field(default=50, description="Potassium")
    carbon: float = Field(default=1.0, description="Carbon")
    soil: str = Field(default="Loamy", description="Soil type")
    crop: str = Field(default="Rice", description="Crop")


class OrganicRequest(BaseModel):
    nitrogen: float = Field(default=50, description="Nitrogen")
    phosphorous: float = Field(default=50, description="Phosphorous")
    potassium: float = Field(default=50, description="Potassium")


class CommunityMessageRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Message text")


class FieldRequest(BaseModel):
    label: str = "Unnamed Field"
    area_ha: float = 1.0
    irrigation: str = "rainfed"
    soil_n: float = 0
    soil_p: float = 0
    soil_k: float = 0
    soil_ph: float = 7.0
    soil_type: str = ""
    previous_crop: str = ""
    current_crop: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "active"


class CropPlanRequest(BaseModel):
    field_id: Optional[int] = None
    plot_label: str = "Unnamed Plot"
    year: int = 2026
    crop: str = ""
    season: str = ""
    start_month: int = 1
    end_month: int = 3


def _extract_user(request: Request) -> dict:
    """Extract user from JWT token in Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated. Please login.")
    token = auth_header[7:]
    try:
        return get_current_user(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


def _try_extract_user(request: Request) -> dict | None:
    """Try to extract user from JWT token. Returns None if not authenticated (non-blocking)."""
    try:
        return _extract_user(request)
    except HTTPException:
        return None


# ── Auth ──────────────────────────────────────────────────

@router.post("/auth/register")
async def api_register(req: AuthRegisterRequest):
    try:
        result = register_user(req.phone, req.password, req.name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def api_login(req: AuthLoginRequest):
    try:
        result = login_user(req.phone, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/google")
async def api_google_login(req: GoogleLoginRequest):
    """Authenticate via Google OAuth using a Supabase access token."""
    try:
        result = google_login(req.access_token)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Internal Server Error: {str(e)}")


# ── Profile ───────────────────────────────────────────────

@router.get("/profile")
async def api_get_profile(request: Request):
    user = _extract_user(request)
    profile = get_profile(user["user_id"])
    if profile:
        # Add phone from token (not stored in profiles table)
        profile["phone"] = user["phone"]
        return {"profile": profile}
    return {"profile": {"name": user["name"], "phone": user["phone"]}}


@router.put("/profile")
async def api_save_profile(req: ProfileRequest, request: Request):
    user = _extract_user(request)
    saved = save_profile(user["user_id"], req.model_dump())
    if saved:
        saved["phone"] = user["phone"]
    return {"profile": saved, "message": "Profile saved successfully"}


@router.delete("/profile")
async def api_delete_profile(request: Request):
    user = _extract_user(request)
    delete_profile(user["user_id"])
    return {"message": "Profile and account deleted"}


# ── Fields ────────────────────────────────────────────────

@router.get("/fields")
async def api_get_fields(request: Request):
    """Get all fields/plots for the authenticated user."""
    user = _extract_user(request)
    fields = get_fields(user["user_id"])
    return {"fields": fields, "total": len(fields)}


@router.get("/fields/{field_id}")
async def api_get_field(field_id: int, request: Request):
    """Get a single field by ID."""
    user = _extract_user(request)
    field = get_field(user["user_id"], field_id)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"field": field}


@router.post("/fields")
async def api_create_field(req: FieldRequest, request: Request):
    """Create a new field/plot."""
    user = _extract_user(request)
    try:
        field = create_field(user["user_id"], req.model_dump())
        return {"field": field, "message": "Field created successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/fields/{field_id}")
async def api_update_field(field_id: int, req: FieldRequest, request: Request):
    """Update an existing field."""
    user = _extract_user(request)
    updated = update_field(user["user_id"], field_id, req.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"field": updated, "message": "Field updated successfully"}


@router.delete("/fields/{field_id}")
async def api_delete_field(field_id: int, request: Request):
    """Delete a field."""
    user = _extract_user(request)
    deleted = delete_field(user["user_id"], field_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"message": "Field deleted successfully"}


# ── Recommendation History ────────────────────────────────

@router.get("/recommendations/history")
async def api_get_recommendation_history(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100, description="Number of records"),
):
    """Get the user's crop recommendation history."""
    user = _extract_user(request)
    history = get_recommendation_history(user["user_id"], limit)
    return {"history": history, "total": len(history)}


@router.delete("/recommendations/history/{record_id}")
async def api_delete_recommendation(record_id: int, request: Request):
    """Delete a recommendation history entry."""
    user = _extract_user(request)
    delete_recommendation(user["user_id"], record_id)
    return {"message": "Recommendation deleted"}


# ── Disease Scan History ──────────────────────────────────

@router.get("/disease/history")
async def api_get_disease_history(
    request: Request,
    limit: int = Query(default=20, ge=1, le=100, description="Number of records"),
):
    """Get the user's disease scan history."""
    user = _extract_user(request)
    history = get_disease_history(user["user_id"], limit)
    return {"history": history, "total": len(history)}


@router.delete("/disease/history/{scan_id}")
async def api_delete_disease_scan(scan_id: int, request: Request):
    """Delete a disease scan history entry."""
    user = _extract_user(request)
    delete_disease_scan(user["user_id"], scan_id)
    return {"message": "Scan deleted"}


# ── Crop Plans (Rotation Planner) ─────────────────────────

@router.get("/plans")
async def api_get_plans(
    request: Request,
    year: Optional[int] = Query(default=None, description="Filter by year"),
    grouped: bool = Query(default=True, description="Group plans by plot"),
):
    """Get all crop plans for the user."""
    user = _extract_user(request)
    if grouped:
        plans = get_plans_grouped(user["user_id"], year)
    else:
        plans = get_plans(user["user_id"], year)
    return {"plans": plans, "total": len(plans)}


@router.post("/plans")
async def api_create_plan(req: CropPlanRequest, request: Request):
    """Create a new crop plan entry."""
    user = _extract_user(request)
    try:
        plan = create_plan(user["user_id"], req.model_dump())
        return {"plan": plan, "message": "Plan entry created"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/plans/{plan_id}")
async def api_update_plan(plan_id: int, req: CropPlanRequest, request: Request):
    """Update an existing crop plan entry."""
    user = _extract_user(request)
    updated = update_plan(user["user_id"], plan_id, req.model_dump())
    if not updated:
        raise HTTPException(status_code=404, detail="Plan entry not found")
    return {"plan": updated, "message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def api_delete_plan(plan_id: int, request: Request):
    """Delete a crop plan entry."""
    user = _extract_user(request)
    delete_plan(user["user_id"], plan_id)
    return {"message": "Plan entry deleted"}


# ── Health ────────────────────────────────────────────────

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "3.0.0",
        "database": "supabase",
        "dataset_version": get_dataset_version(),
        "services": {
            "ml_models": "loaded",
            "disease_detection": "loaded",
            "weather": "openweathermap",
            "geolocation": "ipstack",
            "email_alerts": "brevo",
            "pest_alerts": "loaded",
            "fertilizer": "loaded",
            "market_data": "agmarknet",
            "database": "supabase",
            "api": "running",
        }
    }


# ── Crop Recommendation ──────────────────────────────────

@router.post("/recommend/crop")
async def get_crop_recommendation(req: CropRecommendRequest, request: Request):
    start = time.time()
    try:
        # Get base ML predictions — get more candidates for scoring to filter
        base_results = recommend_crop(
            nitrogen=req.nitrogen,
            phosphorus=req.phosphorus,
            potassium=req.potassium,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
            top_k=15,
            state=req.state,
            soil_type=req.soil_type,
        )

        # Get state-specific crop list for boosting
        state_crops_list = get_state_crops(req.state) if req.state else []

        # Apply scoring engine (constraints + bonuses + state boost)
        scored = apply_scoring(
            base_results=base_results,
            previous_crop=req.previous_crop,
            season=req.season,
            ph=req.ph,
            temperature=req.temperature,
            nitrogen=req.nitrogen,
            phosphorus=req.phosphorus,
            potassium=req.potassium,
            state=req.state,
            state_crops=state_crops_list,
        )

        inference_ms = int((time.time() - start) * 1000)

        model_ver = f"rf-v2-state-aware" if get_dataset_version() == "v2_state_aware" else "rf-v1-legacy"

        response_data = {
            "recommendations": scored[:3],
            "model_version": model_ver,
            "dataset_version": get_dataset_version(),
            "inference_ms": inference_ms,
            "input_summary": {
                "soil": {"N": req.nitrogen, "P": req.phosphorus, "K": req.potassium, "pH": req.ph},
                "weather": {"temperature": req.temperature, "humidity": req.humidity, "rainfall": req.rainfall},
                "season": req.season,
                "previous_crop": req.previous_crop,
                "state": req.state,
                "soil_type": req.soil_type,
            },
        }

        # Save to history if user is authenticated (non-blocking — don't fail if not logged in)
        user = _try_extract_user(request)
        if user:
            try:
                save_recommendation(
                    user_id=user["user_id"],
                    input_data=response_data["input_summary"],
                    recommendations=scored[:3],
                    model_version=model_ver,
                    inference_ms=inference_ms,
                )
            except Exception:
                pass  # Don't fail the recommendation if saving history fails

        return response_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── States & Location-Based Recommendations ──────────────

@router.get("/states")
async def list_states():
    """Return list of supported states."""
    model_states = get_state_list()
    all_state_names = sorted(set(model_states + list(_state_recs.keys())))
    return {
        "states": all_state_names,
        "model_states": model_states,
        "total": len(all_state_names),
    }


@router.get("/crops/by-state/{state}")
async def get_crops_by_state(state: str):
    """Return recommended crops for a state (before soil details are entered)."""
    # Get from dataset-trained model
    dataset_crops = get_state_crops(state)

    # Get from curated recommendations
    curated = _state_recs.get(state, {})
    curated_crops = curated.get("top_crops", [])

    # Merge: curated first, then dataset crops
    all_crops = []
    seen = set()
    for crop_info in curated_crops:
        if isinstance(crop_info, dict):
            all_crops.append(crop_info)
            seen.add(crop_info.get("name", "").lower())
        elif isinstance(crop_info, str):
            all_crops.append({"name": crop_info, "season": "Various"})
            seen.add(crop_info.lower())

    for crop_name in dataset_crops[:15]:
        if crop_name.lower() not in seen:
            all_crops.append({"name": crop_name, "season": "Various", "source": "dataset"})
            seen.add(crop_name.lower())

    return {
        "state": state,
        "crops": all_crops[:20],
        "soil_types": curated.get("soil_types", get_soil_types()),
        "climate": curated.get("climate", ""),
        "major_seasons": curated.get("major_seasons", ["Kharif", "Rabi", "Zaid"]),
    }


@router.get("/soil-types")
async def list_soil_types():
    """Return list of supported soil types."""
    return {"soil_types": get_soil_types()}


# ── Disease Detection ────────────────────────────────────

@router.get("/disease/crops")
async def disease_crops():
    """Return list of crops supported for disease detection."""
    return {"crops": get_supported_disease_crops()}


@router.post("/disease/detect")
async def disease_detect(
    request: Request,
    crop: str = Form(..., description="Crop key: potato, corn, rice, sugarcane"),
    image: UploadFile = File(..., description="Leaf image file"),
):
    """Detect disease from a leaf image."""
    try:
        # Read image bytes
        image_bytes = await image.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image file")

        # Limit file size (10MB)
        if len(image_bytes) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="Image file too large (max 10MB)")

        result = detect_disease(crop=crop, image_bytes=image_bytes)

        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))

        # Save to history if user is authenticated (non-blocking)
        user = _try_extract_user(request)
        if user:
            try:
                save_disease_scan(
                    user_id=user["user_id"],
                    crop=result.get("crop", crop),
                    disease=result.get("disease", "Unknown"),
                    confidence=result.get("confidence", 0),
                    is_healthy=result.get("is_healthy", False),
                    treatment=result.get("treatment", {}),
                    all_predictions=result.get("all_predictions", []),
                )
            except Exception:
                pass  # Don't fail the detection if saving history fails

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Yield Prediction ─────────────────────────────────────

@router.get("/yield/districts")
async def get_yield_districts_endpoint(
    state: str = Query(default="", description="State name"),
):
    """Return districts available in the yield dataset for a given state."""
    districts = get_yield_districts(state)
    return {"state": state, "districts": districts, "total": len(districts)}


@router.post("/predict/yield")
async def get_yield_prediction(req: YieldPredictionRequest):
    try:
        result = predict_yield(
            state=req.state,
            district=req.district,
            crop=req.crop,
            season=req.season,
            area_ha=req.area_ha,
            year=req.year,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Price Prediction ──────────────────────────────────────

@router.post("/predict/price")
async def get_price_prediction(req: PricePredictionRequest):
    try:
        result = predict_price(
            state=req.state,
            district=req.district,
            market=req.market,
            commodity=req.commodity,
            variety=req.variety,
            grade=req.grade,
            min_price=req.min_price,
            max_price=req.max_price,
            month=req.month,
            year=req.year,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Crops List ────────────────────────────────────────────

@router.get("/crops")
async def list_crops():
    return {
        "recommendation_crops": get_crop_list(),
        "yield_metadata": get_yield_metadata(),
        "price_metadata": get_price_metadata(),
        "dataset_version": get_dataset_version(),
    }


# ── Location Detection (ipstack) ─────────────────────────

@router.get("/location/detect")
async def detect_location(request: Request, ip: Optional[str] = Query(default=None)):
    """Detect user's location from IP address using ipstack."""
    # Use provided IP or extract from request
    client_ip = ip
    if not client_ip:
        # Check forwarded headers first (for proxies/load balancers)
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
            # Azure adds port (e.g. "106.219.172.163:8584") — strip it
            if ":" in client_ip and "." in client_ip:  # IPv4 with port, not IPv6
                client_ip = client_ip.split(":")[0]
        else:
            client_ip = request.client.host if request.client else "8.8.8.8"

    # Skip localhost/private IPs — use a fallback for dev
    if client_ip in ("127.0.0.1", "::1", "localhost") or client_ip.startswith("192.168.") or client_ip.startswith("10."):
        client_ip = "check"  # ipstack returns info based on server IP for "check"

    location = get_location_from_ip(client_ip)
    location["detected_ip"] = client_ip
    return location


# ── Weather (OpenWeatherMap — Real Data) ─────────────────

@router.get("/weather/{lat}/{lon}")
async def get_weather_forecast_endpoint(lat: float, lon: float):
    """Return real weather data from OpenWeatherMap."""
    # Current weather
    current = get_current_weather(lat, lon)

    # Forecast
    forecast = get_forecast(lat, lon)

    # Severe weather alerts
    alerts = check_severe_weather(lat, lon, days_ahead=2)

    if current.get("error") and not forecast:
        # Fallback to mock if API fails
        import datetime
        conditions = ["sunny", "partly_cloudy", "cloudy", "light_rain", "sunny", "sunny", "partly_cloudy"]
        icons = ["sunny", "partly_cloudy", "cloudy", "rainy", "sunny", "sunny", "partly_cloudy"]
        base_date = datetime.date.today()
        forecast = []
        for i in range(7):
            d = base_date + datetime.timedelta(days=i)
            temp_min = round(random.uniform(18, 24), 1)
            temp_max = round(temp_min + random.uniform(8, 14), 1)
            forecast.append({
                "date": d.isoformat(),
                "day_name": d.strftime("%A"),
                "temp_min": temp_min,
                "temp_max": temp_max,
                "rainfall_mm": round(random.uniform(0, 5) if "rain" in conditions[i] else 0, 1),
                "humidity": random.randint(40, 80),
                "condition": conditions[i],
                "icon": icons[i],
            })
        return {
            "latitude": lat, "longitude": lon,
            "forecast": forecast, "source": "mock_fallback",
            "current": {}, "alerts": [],
        }

    return {
        "latitude": lat,
        "longitude": lon,
        "current": current,
        "forecast": forecast,
        "alerts": alerts,
        "source": "openweathermap",
    }


@router.get("/weather/alerts/{lat}/{lon}")
async def get_weather_alerts(lat: float, lon: float, days: int = Query(default=2, ge=1, le=5)):
    """Check for severe weather alerts."""
    alerts = check_severe_weather(lat, lon, days_ahead=days)
    return {"alerts": alerts, "total": len(alerts)}


@router.post("/alerts/check-weather")
async def trigger_weather_alert_check(request: Request):
    """Manually trigger weather alert check for all users."""
    count = check_and_send_alerts_for_all_users()
    return {"message": f"Weather alert check complete. {count} alert emails sent.", "alerts_sent": count}


@router.get("/alerts/my-alerts")
async def get_my_alerts(request: Request, limit: int = Query(default=10, ge=1, le=50)):
    """Get the current user's recent weather alerts."""
    user = _extract_user(request)
    from db import get_supabase
    sb = get_supabase()
    result = sb.table("weather_alerts").select("*").eq("user_id", user["user_id"]).order("sent_at", desc=True).limit(limit).execute()
    return {"alerts": result.data or [], "total": len(result.data or [])}


# ── Market Prices (Real Data — Agmarknet) ────────────────

@router.get("/market/prices")
async def get_market_prices(
    commodity: str = Query(default="Wheat", description="Commodity name"),
    state: str = Query(default="", description="State name"),
    district: str = Query(default="", description="District name"),
    market: str = Query(default="", description="Market/Mandi name"),
    days: int = Query(default=90, ge=1, le=365, description="Number of days"),
):
    """Return real market price history from agmarknet dataset."""
    result = get_historical_prices(
        commodity=commodity, state=state, district=district,
        market=market, days=days,
    )

    # Format for frontend compatibility
    prices_formatted = []
    for p in result.get("prices", []):
        prices_formatted.append({
            "date": p.get("date", ""),
            "mandi": market or f"{district} Mandi" if district else "All Markets",
            "price_per_quintal": p.get("modal_price", 0),
            "min_price": p.get("min_price", 0),
            "max_price": p.get("max_price", 0),
        })

    summary = result.get("summary", {})
    return {
        "crop": commodity,
        "commodity": commodity,
        "state": state,
        "district": district,
        "market": market,
        "prices": prices_formatted,
        "trend": summary.get("trend", "stable"),
        "latest_price": summary.get("latest_price", 0),
        "average_price": summary.get("average_price", 0),
        "data_points": summary.get("data_points", 0),
        "source": result.get("source", "agmarknet"),
    }


@router.get("/market/metadata")
async def get_market_metadata_endpoint():
    """Return available states, districts, markets, and commodities for dropdown filters."""
    metadata = get_market_metadata()
    return metadata


@router.get("/market/commodities")
async def get_market_commodities(
    state: str = Query(default="", description="State name"),
    district: str = Query(default="", description="District name"),
):
    """Return available commodities for a state/district."""
    commodities = get_commodities_for_location(state, district)
    return {"commodities": commodities, "total": len(commodities)}


# ── Pest Alerts ──────────────────────────────────────────

@router.get("/pests/alerts")
async def get_pest_alerts_endpoint(
    state: str = Query(default="", description="State name"),
    season: str = Query(default="", description="Season: kharif, rabi, zaid"),
):
    """Get pest alerts for a state and season."""
    if not state:
        return {"error": "State is required", "crops": []}
    result = get_pest_alerts(state, season or None)
    return result


@router.get("/pests/crop/{crop_key}")
async def get_pest_for_crop_endpoint(crop_key: str):
    """Get pest profile for a specific crop."""
    result = get_pest_for_crop(crop_key)
    return result


@router.get("/pests/season")
async def get_season_info_endpoint():
    """Get current agricultural season info."""
    return get_season_info()


@router.get("/pests/states")
async def get_pest_states_endpoint():
    """Get available states in the pest knowledge base."""
    states = get_pest_states()
    return {"states": states, "total": len(states)}


# ── Fertilizer Recommendation ────────────────────────────

@router.post("/fertilizer/recommend")
async def fertilizer_recommend_endpoint(req: FertilizerRequest):
    """Get ML-based fertilizer recommendation."""
    result = recommend_fertilizer(
        temperature=req.temperature, moisture=req.moisture,
        rainfall=req.rainfall, ph=req.ph,
        nitrogen=req.nitrogen, phosphorous=req.phosphorous,
        potassium=req.potassium, carbon=req.carbon,
        soil=req.soil, crop=req.crop,
    )
    return result


@router.post("/fertilizer/organic")
async def organic_remedies_endpoint(req: OrganicRequest):
    """Get organic fertilizer recommendations for low NPK values."""
    result = get_organic_remedies(
        nitrogen=req.nitrogen,
        phosphorous=req.phosphorous,
        potassium=req.potassium,
    )
    return result


@router.get("/fertilizer/metadata")
async def fertilizer_metadata_endpoint():
    """Get fertilizer model metadata (available types, soils, crops)."""
    return get_fertilizer_metadata()


# ── Community Chat ───────────────────────────────────────

@router.get("/community/messages")
async def get_community_messages(
    limit: int = Query(default=50, ge=1, le=200),
    before: Optional[int] = Query(default=None, description="Get messages before this ID"),
):
    """Get community chat messages (paginated)."""
    from db import get_supabase
    sb = get_supabase()

    query = sb.table("community_messages").select("*").order("created_at", desc=True).limit(limit)
    if before:
        query = query.lt("id", before)

    result = query.execute()
    messages = list(reversed(result.data or []))  # Oldest first for chat display
    return {"messages": messages, "total": len(messages)}


@router.post("/community/messages")
async def send_community_message(req: CommunityMessageRequest, request: Request):
    """Send a message to the community chat."""
    user = _extract_user(request)

    from db import get_supabase
    sb = get_supabase()

    msg_data = {
        "user_id": user["user_id"],
        "user_name": user.get("name", "Anonymous"),
        "message": req.message.strip(),
        "message_type": "text",
    }

    result = sb.table("community_messages").insert(msg_data).execute()

    if result.data and len(result.data) > 0:
        return {"message": result.data[0], "success": True}
    raise HTTPException(status_code=500, detail="Failed to send message")


@router.get("/community/online")
async def get_online_count():
    """Get approximate online user count."""
    # Simple approximation — count messages in last 5 minutes
    import datetime
    from db import get_supabase
    sb = get_supabase()
    cutoff = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).isoformat()
    result = sb.table("community_messages").select("user_id").gte("created_at", cutoff).execute()
    unique_users = set(m["user_id"] for m in (result.data or []))
    return {"online_count": max(1, len(unique_users)), "active_in_last_5min": len(unique_users)}


# ── Feedback ─────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    area: str  # e.g. 'crop_recommendation', 'market_prices', etc.
    message: str


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, request: Request):
    """Submit user feedback to Supabase."""
    user = _extract_user(request)

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")
    if not req.area:
        raise HTTPException(status_code=400, detail="Feedback area is required")

    from db import get_supabase
    sb = get_supabase()

    feedback_data = {
        "user_id": user["user_id"],
        "user_name": user.get("name", "Anonymous"),
        "area": req.area.strip(),
        "message": req.message.strip(),
    }

    result = sb.table("feedback").insert(feedback_data).execute()

    if result.data and len(result.data) > 0:
        return {"feedback": result.data[0], "success": True}
    raise HTTPException(status_code=500, detail="Failed to submit feedback")


@router.get("/feedback")
async def get_feedback_history(
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
):
    """Get the current user's feedback history."""
    user = _extract_user(request)

    from db import get_supabase
    sb = get_supabase()

    result = (
        sb.table("feedback")
        .select("*")
        .eq("user_id", user["user_id"])
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"feedback": result.data or [], "total": len(result.data or [])}


# ── Speech-to-Text (Azure) ──────────────────────────────

@router.post("/speech-to-text")
async def speech_to_text_endpoint(
    audio: UploadFile = File(...),
    language: str = Form(default="en-IN"),
):
    """
    Convert speech audio to text using Azure Cognitive Services.
    Accepts audio file (WAV/WebM/OGG) and optional language code.
    """
    from speech_service import transcribe_audio

    result = await transcribe_audio(audio, language)

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "Speech recognition failed"))

    return result


# ── Azure AI Translation Proxy ──────────────────────────

class TranslateRequest(BaseModel):
    texts: List[str]
    target_language: str
    source_language: str = "en"

@router.post("/translate")
async def translate_endpoint(req: TranslateRequest):
    """
    Secure proxy for translating dynamic blocks using Azure Cognitive Services.
    """
    from translator_service import translate_texts
    try:
        translated = translate_texts(req.texts, req.target_language, req.source_language)
        return {"translations": translated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
