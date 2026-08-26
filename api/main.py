"""
CropMatrix -- FastAPI Backend
=============================
AI-powered agriculture backend for crop advisory, disease detection,
weather intelligence, market analysis, fertilizer recommendations,
yield prediction and CropMatrix AI Assistant.
"""

import os
import asyncio
import httpx

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel


# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load api/.env
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Also load project-root .env if present
load_dotenv(os.path.join(BASE_DIR, "..", ".env"))


# ============================================================
# EXISTING CROPMATRIX SERVICES
# ============================================================

from ml_service import load_models
from disease_service import load_disease_models
from auth_service import init_db as init_auth_db
from pest_service import load_pest_data
from fertilizer_service import load_fertilizer_models
from market_service import load_market_data
from ai_orchestrator import build_project_context
from routes import router


# ============================================================
# GEMINI CONFIGURATION
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = "gemini-3.7-flash"

GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/"
    f"v1beta/models/{GEMINI_MODEL}:generateContent"
)


# ============================================================
# WEATHER ALERT SCHEDULER
# ============================================================

ALERT_CHECK_INTERVAL_HOURS = 6


async def _weather_alert_loop():
    """
    Background task:
    check weather alerts every N hours and send emails.
    """

    from email_service import check_and_send_alerts_for_all_users

    # Wait before first scheduler execution
    await asyncio.sleep(60)

    while True:

        try:

            print(
                "\n[SCHEDULER] Running weather alert check..."
            )

            count = (
                check_and_send_alerts_for_all_users()
            )

            print(
                f"[SCHEDULER] Done. Alerts sent: {count}"
            )

        except Exception as e:

            print(
                f"[SCHEDULER ERROR] {e}"
            )

        await asyncio.sleep(
            ALERT_CHECK_INTERVAL_HOURS * 3600
        )


# ============================================================
# FASTAPI LIFESPAN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("=" * 60)
    print("  CropMatrix -- Starting Server")
    print("=" * 60)

    # --------------------------------------------------------
    # ML MODELS
    # --------------------------------------------------------

    try:
        load_models()
    except Exception as e:
        print(
            f"[WARN] Core ML models failed to load: {e}"
        )

    try:
        load_disease_models()
    except Exception as e:
        print(
            f"[WARN] Disease models failed to initialize: {e}"
        )

    # --------------------------------------------------------
    # DATABASE
    # --------------------------------------------------------

    try:
        init_auth_db()
    except Exception as e:
        print(
            f"[WARN] Database initialization failed: {e}"
        )

    # --------------------------------------------------------
    # AGRICULTURE SERVICES
    # --------------------------------------------------------

    try:
        load_pest_data()
    except Exception as e:
        print(
            f"[WARN] Pest service failed to load: {e}"
        )

    try:
        load_fertilizer_models()
    except Exception as e:
        print(
            f"[WARN] Fertilizer service failed to load: {e}"
        )

    try:
        load_market_data()
    except Exception as e:
        print(
            f"[WARN] Market service failed to load: {e}"
        )

    # --------------------------------------------------------
    # GEMINI
    # --------------------------------------------------------

    if GEMINI_API_KEY:

        print(
            "[OK] CropMatrix Gemini AI Assistant configured"
        )

        print(
            f"[OK] Gemini model: {GEMINI_MODEL}"
        )

    else:

        print(
            "[WARN] GEMINI_API_KEY not found -- "
            "CropMatrix AI Assistant will not work"
        )

    print("=" * 60)
    print("  CropMatrix systems ready!")
    print("=" * 60)

    # Start scheduler
    alert_task = asyncio.create_task(
        _weather_alert_loop()
    )

    yield

    # Shutdown
    alert_task.cancel()

    try:
        await alert_task
    except asyncio.CancelledError:
        pass

    print(
        "Shutting down CropMatrix..."
    )


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(

    title="CropMatrix API",

    description=(
        "AI-powered smart agriculture platform for crop "
        "recommendation, disease detection, yield prediction, "
        "market intelligence, weather insights, pest alerts, "
        "fertilizer recommendations and AI farming assistance."
    ),

    version="4.4.0",

    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ============================================================
# EXISTING API ROUTES
# ============================================================

app.include_router(router)


# ============================================================
# CROPMATRIX AI REQUEST MODEL
# ============================================================

class CropMatrixChatRequest(BaseModel):

    message: str

    language: str = "English"


# ============================================================
# CROPMATRIX AI ASSISTANT
# Local CropMatrix services first; Gemini only as fallback.
# ============================================================

def _pretty_name(value):
    """Convert snake_case/internal names to readable labels."""
    return str(value or "").replace("_", " ").strip().title()


def _format_number(value, digits=1):
    """Format numeric values without crashing on missing values."""
    try:
        number = float(value)
        if number.is_integer():
            return str(int(number))
        return f"{number:.{digits}f}"
    except (TypeError, ValueError):
        return str(value) if value is not None else "N/A"


def _format_crop_context(context):
    data = context.get("data") or {}

    if context.get("needs_input"):
        missing = data.get("missing_inputs") or []
        missing_text = ", ".join(_pretty_name(x) for x in missing)
        return (
            "🌾 **Crop Recommendation**\n\n"
            "I need a few more farm details before CropMatrix can make a "
            "personalized recommendation.\n\n"
            f"**Required:** {missing_text}\n\n"
            "You can also use **AI Crop Advisory** to enter the complete soil "
            "and weather values."
        )

    crops = data.get("crops") or []
    state = data.get("state")

    if crops:
        crop_names = []
        for crop in crops:
            if isinstance(crop, dict):
                name = (
                    crop.get("crop")
                    or crop.get("name")
                    or crop.get("Crop")
                    or crop.get("label")
                )
                if name:
                    crop_names.append(str(name))
            elif crop is not None:
                crop_names.append(str(crop))

        if crop_names:
            lines = "\n".join(
                f"- {name}" for name in crop_names[:15]
            )
            location = f" for **{state}**" if state else ""
            return (
                f"🌾 **Crops available in CropMatrix{location}**\n\n"
                f"{lines}\n\n"
                "These are state-level CropMatrix dataset results, not a "
                "personalized farm prediction. For a personalized result, "
                "provide N, P, K, temperature, humidity, soil pH and rainfall."
            )

    return (
        "🌾 CropMatrix has validated your crop-advisory inputs. "
        "Use **AI Crop Advisory** for the final model-ranked recommendation."
    )


def _format_weather_context(context):
    data = context.get("data") or {}

    if context.get("needs_input"):
        return (
            "🌦️ **Weather Intelligence**\n\n"
            "Please provide a city/location name, for example "
            "**weather in Patna**, or provide latitude and longitude."
        )

    current = data.get("current") or {}

    if current.get("error"):
        return (
            "🌦️ **Weather Intelligence**\n\n"
            "CropMatrix could not retrieve live weather right now.\n\n"
            f"**Reason:** {current.get('error')}"
        )

    location = data.get("requested_location") or {}
    city = (
        current.get("city_name")
        or location.get("city")
        or "your selected location"
    )

    temperature = _format_number(current.get("temperature"))
    feels_like = _format_number(current.get("feels_like"))
    humidity = _format_number(current.get("humidity"))
    wind_ms = current.get("wind_speed")
    description = current.get("description") or current.get("condition") or "N/A"

    try:
        wind_kmh = round(float(wind_ms) * 3.6, 1)
    except (TypeError, ValueError):
        wind_kmh = "N/A"

    reply = (
        f"🌦️ **Current Weather in {city}**\n\n"
        f"- Temperature: **{temperature}°C**\n"
        f"- Feels like: **{feels_like}°C**\n"
        f"- Humidity: **{humidity}%**\n"
        f"- Wind speed: **{wind_kmh} km/h**\n"
        f"- Condition: **{str(description).title()}**"
    )

    alerts = data.get("alerts") or []
    if alerts:
        alert_lines = []
        for alert in alerts[:3]:
            if isinstance(alert, dict):
                message = alert.get("message")
                if message:
                    alert_lines.append(f"- {message}")
        if alert_lines:
            reply += "\n\n⚠️ **Weather Alerts**\n" + "\n".join(alert_lines)

    reply += "\n\n*Source: OpenWeatherMap via CropMatrix Weather Service.*"
    return reply


def _format_market_context(context):
    data = context.get("data") or {}

    if context.get("needs_input"):
        return (
            "💰 **Market Intelligence**\n\n"
            "Please tell me which crop/commodity price you want to check. "
            "You can also include the state."
        )

    if not data or not data.get("prices"):
        message = data.get("message") or "No matching market data was found."
        return f"💰 **Market Intelligence**\n\n{message}"

    summary = data.get("summary") or {}
    commodity = data.get("commodity") or "Commodity"
    state = data.get("state")
    latest = _format_number(summary.get("latest_price"), 2)
    average = _format_number(summary.get("average_price"), 2)
    trend = summary.get("trend") or "N/A"
    points = summary.get("data_points") or len(data.get("prices") or [])

    location_text = f" in {state}" if state else ""

    return (
        f"💰 **{commodity} Market Data{location_text}**\n\n"
        f"- Latest available modal price: **₹{latest}**\n"
        f"- Average price: **₹{average}**\n"
        f"- Trend: **{str(trend).title()}**\n"
        f"- Data points used: **{points}**\n\n"
        "*This is CropMatrix's latest available historical Agmarknet dataset "
        "data, not guaranteed real-time mandi pricing.*"
    )


def _format_pest_context(context):
    data = context.get("data") or {}

    if context.get("needs_input"):
        return (
            "🐛 **Pest Alerts**\n\n"
            "Please tell me the **state or crop** you want pest information for."
        )

    if data.get("error"):
        return f"🐛 **Pest Alerts**\n\n{data.get('error')}"

    crops = data.get("crops")
    if isinstance(crops, list):
        state = data.get("state") or ""
        season = data.get("season") or ""
        sections = []

        for crop in crops[:8]:
            if not isinstance(crop, dict):
                continue
            name = crop.get("common_name") or crop.get("crop") or "Crop"
            pests = crop.get("top_pests") or []

            pest_names = []
            for pest in pests[:5]:
                if isinstance(pest, dict):
                    pest_name = (
                        pest.get("name")
                        or pest.get("common_name")
                        or pest.get("pest")
                    )
                    if pest_name:
                        pest_names.append(str(pest_name))
                elif pest:
                    pest_names.append(str(pest))

            if pest_names:
                sections.append(
                    f"**{name}:** " + ", ".join(pest_names)
                )

        if sections:
            heading = f"🐛 **Pest Information for {state}**"
            if season:
                heading += f" — {str(season).title()} season"
            return (
                heading
                + "\n\n"
                + "\n\n".join(sections)
                + "\n\n*These are known pest profiles, not a diagnosis of "
                  "your field.*"
            )

    top_pests = data.get("top_pests") or []
    crop_name = data.get("common_name") or data.get("crop_key") or "Crop"
    pest_names = []

    for pest in top_pests[:8]:
        if isinstance(pest, dict):
            name = pest.get("name") or pest.get("common_name") or pest.get("pest")
            if name:
                pest_names.append(str(name))
        elif pest:
            pest_names.append(str(pest))

    if pest_names:
        return (
            f"🐛 **Common pests for {crop_name}**\n\n"
            + "\n".join(f"- {name}" for name in pest_names)
            + "\n\n*Use field evidence or the relevant CropMatrix feature "
              "before treating an infestation.*"
        )

    return "🐛 CropMatrix did not find a pest profile for that request."


def _format_fertilizer_context(context):
    data = context.get("data") or {}

    if context.get("needs_input"):
        missing = data.get("missing_inputs") or []
        return (
            "🧪 **Fertilizer Advisor**\n\n"
            "I need more information before using the CropMatrix fertilizer "
            "workflow.\n\n"
            f"**Missing:** {', '.join(_pretty_name(x) for x in missing)}\n\n"
            "Please provide these values or open **Fertilizer Advisor**."
        )

    return (
        "🧪 CropMatrix has received the important fertilizer inputs. "
        "Please use **Fertilizer Advisor** for the final ML recommendation, "
        "where the remaining model inputs can be captured safely."
    )


def _format_yield_context(context):
    data = context.get("data") or {}
    missing = data.get("missing_inputs") or []

    return (
        "📈 **Yield Prediction**\n\n"
        "CropMatrix needs the complete yield-model inputs before predicting.\n\n"
        f"**Still needed:** {', '.join(_pretty_name(x) for x in missing)}\n\n"
        "Please provide them or use the **Yield Prediction** feature."
    )


def _format_disease_context(context):
    data = context.get("data") or {}
    crop = data.get("crop")
    crop_text = f" for **{crop}**" if crop else ""

    return (
        f"🍃 **Disease Scanner{crop_text}**\n\n"
        "A reliable disease prediction needs a clear crop-leaf image. "
        "Please open **Disease Scanner** and upload a clear photo of the "
        "affected leaf.\n\n"
        "CropMatrix should not claim a certain disease diagnosis from text alone."
    )


def _local_cropmatrix_reply(context):
    """
    Return a deterministic response for CropMatrix-owned intents.

    This intentionally bypasses Gemini so CropMatrix's own models,
    datasets and external service integrations keep working even if
    Gemini is rate-limited or unavailable.
    """
    if not context.get("handled"):
        return None

    intent = context.get("intent")

    formatters = {
        "crop": _format_crop_context,
        "weather": _format_weather_context,
        "market": _format_market_context,
        "pest": _format_pest_context,
        "fertilizer": _format_fertilizer_context,
        "yield": _format_yield_context,
        "disease": _format_disease_context,
    }

    formatter = formatters.get(intent)

    if formatter is None:
        return None

    try:
        return formatter(context)
    except Exception as e:
        print(f"[CROPMATRIX LOCAL FORMATTER WARNING] {intent}: {e}")
        return (
            "CropMatrix processed your request, but could not format the "
            "result correctly. Please use the relevant CropMatrix feature."
        )


@app.post("/api/ai/chat")
async def cropmatrix_ai_chat(
    request: CropMatrixChatRequest
):
    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    message = request.message.strip()

    if not message:
        return {
            "success": False,
            "reply": "Please enter a farming question."
        }

    # --------------------------------------------------------
    # CROPMATRIX PROJECT CONTEXT — ALWAYS TRY THIS FIRST
    # --------------------------------------------------------

    try:
        project_context = build_project_context(message)

        print(
            "[CROPMATRIX AI ROUTER]",
            f"intent={project_context.get('intent', 'general')}",
            f"handled={project_context.get('handled', False)}"
        )

    except Exception as e:
        print(f"[AI ORCHESTRATOR WARNING] {e}")

        project_context = {
            "handled": False,
            "intent": "general",
            "instruction": (
                "Answer using safe general agricultural knowledge. "
                "Do not invent live CropMatrix data."
            ),
            "data": {},
        }

    # --------------------------------------------------------
    # LOCAL CROPMATRIX ANSWER
    # --------------------------------------------------------
    # IMPORTANT:
    # If CropMatrix itself can handle the intent, return that answer
    # immediately. Gemini is NOT required for these requests.

    local_reply = _local_cropmatrix_reply(project_context)

    if local_reply:
        return {
            "success": True,
            "reply": local_reply,
            "model": "cropmatrix-local",
            "intent": project_context.get("intent"),
            "source": project_context.get("source"),
        }

    # --------------------------------------------------------
    # GEMINI FALLBACK FOR GENERAL CONVERSATION
    # --------------------------------------------------------

    if not GEMINI_API_KEY:
        return {
            "success": True,
            "reply": (
                "CropMatrix's farming services are available, but the general "
                "AI assistant is currently unavailable because the Gemini API "
                "key is not configured. You can still ask about crops, weather, "
                "market prices, pests, fertilizer, yield or disease scanning."
            ),
            "model": "cropmatrix-local",
            "intent": "general",
        }

    system_prompt = """
You are CropMatrix AI Assistant.

You are an intelligent agriculture assistant primarily designed for Indian
farmers.

Your goal is to provide practical, understandable and responsible
agricultural guidance.

You can help with crop management, seasons, soil health, irrigation,
crop rotation, harvest planning, post-harvest management, storage,
sustainable farming, Indian agricultural practices and government
agriculture awareness.

IMPORTANT RULES:

1. Use simple farmer-friendly language.
2. Provide practical and actionable suggestions.
3. Prefer concise answers unless the farmer asks for detailed information.
4. Consider Indian agricultural conditions whenever relevant.
5. Never guarantee crop yield, income, market price, weather or profitability.
6. Never claim a crop disease diagnosis is certain without sufficient evidence.
7. For serious disease, pesticide or crop-loss problems, recommend consulting
   a local agricultural officer, KVK, agronomist or qualified expert.
8. Never invent live weather or live mandi prices.
9. Respond in the language requested by the farmer.
10. Keep pesticide and fertilizer advice responsible.
11. Be helpful, respectful and easy to understand.
"""

    payload = {
        "systemInstruction": {
            "parts": [
                {
                    "text": system_prompt
                }
            ]
        },
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"Preferred response language: {request.language}\n\n"
                            f"Farmer question:\n{message}\n\n"
                            "Answer as CropMatrix AI Assistant. This is a general "
                            "question that was not handled by a dedicated "
                            "CropMatrix service. Do not invent live project data."
                        )
                    }
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 600,
            "thinkingConfig": {
                "thinkingLevel": "low"
            }
        }
    }

    # --------------------------------------------------------
    # GEMINI REQUEST
    # --------------------------------------------------------

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(45.0)
        ) as client:

            response = None

            for attempt in range(3):
                response = await client.post(
                    GEMINI_URL,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": GEMINI_API_KEY,
                    },
                    json=payload,
                )

                if response.status_code == 200:
                    break

                if response.status_code in (429, 503):
                    if attempt < 2:
                        wait_seconds = 2 ** attempt

                        print(
                            "[CROPMATRIX GEMINI RETRY] "
                            f"Attempt {attempt + 1}/3 failed "
                            f"with status {response.status_code}. "
                            f"Retrying in {wait_seconds}s..."
                        )

                        await asyncio.sleep(wait_seconds)

                    continue

                break

        if response is None:
            return {
                "success": True,
                "reply": (
                    "The general AI assistant is temporarily unavailable. "
                    "CropMatrix's dedicated farming services are still available."
                ),
                "model": "cropmatrix-local",
                "intent": "general",
            }

        if response.status_code != 200:
            print(
                "[CROPMATRIX GEMINI ERROR]",
                response.status_code,
                response.text
            )

            # Do NOT mark the whole CropMatrix chatbot as failed merely
            # because the optional Gemini fallback is unavailable.
            if response.status_code == 429:
                reply = (
                    "The general CropMatrix AI assistant has reached its current "
                    "Gemini usage limit. CropMatrix's dedicated crop, weather, "
                    "market, pest, fertilizer, yield and disease services are "
                    "still available."
                )

            elif response.status_code in (401, 403):
                reply = (
                    "The general AI assistant is temporarily unavailable because "
                    "of its Gemini API configuration. CropMatrix's dedicated "
                    "farming services are still available."
                )

            elif response.status_code == 404:
                reply = (
                    "The configured Gemini model is currently unavailable. "
                    "CropMatrix's dedicated farming services are still available."
                )

            elif response.status_code == 503:
                reply = (
                    "The general AI assistant is temporarily busy. "
                    "CropMatrix's dedicated farming services are still available."
                )

            else:
                reply = (
                    "The general AI assistant is temporarily unavailable. "
                    "CropMatrix's dedicated farming services are still available."
                )

            return {
                "success": True,
                "reply": reply,
                "model": "cropmatrix-local-fallback",
                "intent": "general",
                "gemini_status_code": response.status_code,
            }

        data = response.json()

        candidates = data.get("candidates", [])

        if not candidates:
            print(
                "[CROPMATRIX GEMINI WARNING] No candidates returned:",
                data
            )

            return {
                "success": True,
                "reply": (
                    "The general AI assistant could not generate an answer this "
                    "time. CropMatrix's dedicated farming services are still "
                    "available."
                ),
                "model": "cropmatrix-local-fallback",
                "intent": "general",
            }

        parts = (
            candidates[0]
            .get("content", {})
            .get("parts", [])
        )

        text_parts = [
            part.get("text", "")
            for part in parts
            if part.get("text")
        ]

        reply = "\n".join(text_parts).strip()

        if not reply:
            return {
                "success": True,
                "reply": (
                    "The general AI assistant returned an empty answer. "
                    "Please try asking again."
                ),
                "model": "cropmatrix-local-fallback",
                "intent": "general",
            }

        return {
            "success": True,
            "reply": reply,
            "model": GEMINI_MODEL,
            "intent": "general",
        }

    except httpx.TimeoutException:
        print(
            "[CROPMATRIX GEMINI ERROR] Gemini request timed out"
        )

        return {
            "success": True,
            "reply": (
                "The general AI assistant is taking too long to respond. "
                "CropMatrix's dedicated farming services are still available."
            ),
            "model": "cropmatrix-local-fallback",
            "intent": "general",
        }

    except httpx.RequestError as e:
        print(f"[CROPMATRIX GEMINI NETWORK ERROR] {e}")

        return {
            "success": True,
            "reply": (
                "The general AI assistant cannot reach Gemini right now. "
                "CropMatrix's dedicated farming services are still available."
            ),
            "model": "cropmatrix-local-fallback",
            "intent": "general",
        }

    except Exception as e:
        print(
            f"[CROPMATRIX GEMINI ERROR] {type(e).__name__}: {e}"
        )

        return {
            "success": True,
            "reply": (
                "The general AI assistant encountered an unexpected error. "
                "CropMatrix's dedicated farming services are still available."
            ),
            "model": "cropmatrix-local-fallback",
            "intent": "general",
        }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
async def root():

    return {

        "name": "CropMatrix API",

        "version": "4.4.0",

        "database": "supabase",

        "ai_assistant": "CropMatrix Local + Gemini fallback",

        "ai_model": GEMINI_MODEL,

        "ai_orchestrator": "enabled",

        "docs": "/docs",

        "health": "/api/health",

        "features": [

            "AI Crop Recommendation",

            "Yield Prediction",

            "Market Price Intelligence",

            "Disease Detection",

            "Location Intelligence",

            "Weather Intelligence",

            "Weather Email Alerts",

            "Pest Alert System",

            "Fertilizer Recommendation",

            "CropMatrix Gemini AI Assistant",

            "Community",

            "Field Management",

            "Recommendation History",

            "Disease Scan History",

            "Crop Rotation Planner",

            "Profit Planning",

            "Government Schemes",

            "Farmer Loans",

        ],
    }