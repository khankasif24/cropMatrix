"""
Weather Service — Real weather data using OpenWeatherMap API.
Provides current weather, 5-day forecast, and severe weather detection.
"""

import os
import requests
import datetime

OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY", "")

# Map OWM condition IDs to our icons
# See: https://openweathermap.org/weather-conditions
CONDITION_MAP = {
    "Clear": ("sunny", "sunny"),
    "Clouds": ("partly_cloudy", "partly_cloudy"),
    "Drizzle": ("light_rain", "rainy"),
    "Rain": ("rainy", "rainy"),
    "Thunderstorm": ("thunderstorm", "thunderstorm"),
    "Snow": ("snow", "snow"),
    "Mist": ("foggy", "foggy"),
    "Smoke": ("foggy", "foggy"),
    "Haze": ("foggy", "foggy"),
    "Dust": ("foggy", "foggy"),
    "Fog": ("foggy", "foggy"),
    "Tornado": ("thunderstorm", "thunderstorm"),
}


def get_current_weather(lat: float, lon: float) -> dict:
    """Get current weather for a location."""
    if not OPENWEATHERMAP_API_KEY:
        return {"error": "OPENWEATHERMAP_API_KEY not configured"}

    try:
        url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHERMAP_API_KEY,
            "units": "metric",
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()

        if data.get("cod") != 200:
            return {"error": data.get("message", "Unknown error")}

        main_condition = data.get("weather", [{}])[0].get("main", "Clear")
        condition, icon = CONDITION_MAP.get(main_condition, ("partly_cloudy", "partly_cloudy"))

        return {
            "temperature": data["main"]["temp"],
            "feels_like": data["main"]["feels_like"],
            "humidity": data["main"]["humidity"],
            "pressure": data["main"]["pressure"],
            "wind_speed": data["wind"]["speed"],
            "wind_deg": data["wind"].get("deg", 0),
            "condition": condition,
            "icon": icon,
            "description": data["weather"][0].get("description", ""),
            "clouds": data["clouds"]["all"],
            "visibility": data.get("visibility", 10000),
            "rain_1h": data.get("rain", {}).get("1h", 0),
            "city_name": data.get("name", ""),
            "source": "openweathermap",
        }
    except Exception as e:
        return {"error": f"Weather API failed: {str(e)}"}


def get_forecast(lat: float, lon: float) -> list:
    """
    Get 5-day / 3-hour forecast and aggregate to daily.
    Returns list of 7 daily forecasts (or fewer if data is limited).
    """
    if not OPENWEATHERMAP_API_KEY:
        return []

    try:
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHERMAP_API_KEY,
            "units": "metric",
        }
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()

        if data.get("cod") != "200":
            return []

        # Group by date
        daily = {}
        for item in data.get("list", []):
            dt = datetime.datetime.fromtimestamp(item["dt"])
            date_key = dt.date().isoformat()

            if date_key not in daily:
                daily[date_key] = {
                    "date": date_key,
                    "day_name": dt.strftime("%A"),
                    "temps": [],
                    "humidity": [],
                    "rainfall": 0,
                    "wind_speeds": [],
                    "conditions": [],
                }

            d = daily[date_key]
            d["temps"].append(item["main"]["temp"])
            d["humidity"].append(item["main"]["humidity"])
            d["rainfall"] += item.get("rain", {}).get("3h", 0)
            d["wind_speeds"].append(item["wind"]["speed"])
            d["conditions"].append(item["weather"][0]["main"])

        # Aggregate
        forecast = []
        for date_key in sorted(daily.keys())[:7]:
            d = daily[date_key]
            # Most common condition
            from collections import Counter
            condition_counts = Counter(d["conditions"])
            main_condition = condition_counts.most_common(1)[0][0]
            condition, icon = CONDITION_MAP.get(main_condition, ("partly_cloudy", "partly_cloudy"))

            forecast.append({
                "date": d["date"],
                "day_name": d["day_name"],
                "temp_min": round(min(d["temps"]), 1),
                "temp_max": round(max(d["temps"]), 1),
                "humidity": round(sum(d["humidity"]) / len(d["humidity"])),
                "rainfall_mm": round(d["rainfall"], 1),
                "wind_speed_max": round(max(d["wind_speeds"]), 1),
                "condition": condition,
                "icon": icon,
            })

        return forecast

    except Exception as e:
        print(f"  [WARN] Forecast API failed: {e}")
        return []


def check_severe_weather(lat: float, lon: float, days_ahead: int = 2) -> list:
    """
    Check for severe weather in the next N days.
    Returns list of alerts if rain > 50mm or wind > 60 km/h.
    """
    forecast = get_forecast(lat, lon)
    alerts = []

    for day in forecast[:days_ahead]:
        # Heavy rain alert: > 50mm in a day
        if day.get("rainfall_mm", 0) > 50:
            alerts.append({
                "type": "rain",
                "severity": "severe" if day["rainfall_mm"] > 100 else "warning",
                "date": day["date"],
                "day_name": day["day_name"],
                "message": f"Heavy rainfall expected: {day['rainfall_mm']}mm on {day['day_name']}",
                "value": day["rainfall_mm"],
                "unit": "mm",
            })
        elif day.get("rainfall_mm", 0) > 20:
            alerts.append({
                "type": "rain",
                "severity": "advisory",
                "date": day["date"],
                "day_name": day["day_name"],
                "message": f"Moderate rainfall expected: {day['rainfall_mm']}mm on {day['day_name']}",
                "value": day["rainfall_mm"],
                "unit": "mm",
            })

        # Wind storm alert: > 60 km/h (wind_speed is in m/s, convert)
        wind_kmh = day.get("wind_speed_max", 0) * 3.6
        if wind_kmh > 60:
            alerts.append({
                "type": "storm",
                "severity": "severe" if wind_kmh > 90 else "warning",
                "date": day["date"],
                "day_name": day["day_name"],
                "message": f"Strong winds expected: {round(wind_kmh)}km/h on {day['day_name']}",
                "value": round(wind_kmh),
                "unit": "km/h",
            })

        # Extreme heat
        if day.get("temp_max", 0) > 45:
            alerts.append({
                "type": "heatwave",
                "severity": "warning",
                "date": day["date"],
                "day_name": day["day_name"],
                "message": f"Extreme heat expected: {day['temp_max']}C on {day['day_name']}",
                "value": day["temp_max"],
                "unit": "C",
            })

    return alerts
