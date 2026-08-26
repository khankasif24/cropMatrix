"""
Location Service — IP-based geolocation using ipstack API
and city-name geocoding using OpenWeatherMap.

Detects user's state, district/city, and coordinates from their IP address.
Also resolves a typed city/place name such as "Patna" to coordinates.
"""

import os
import requests

IPSTACK_API_KEY = os.environ.get("IPSTACK_API_KEY", "")
OPENWEATHERMAP_API_KEY = os.environ.get("OPENWEATHERMAP_API_KEY", "")

# Map ipstack region names to our standard Indian state names
STATE_NAME_MAP = {
    "uttar pradesh": "Uttar Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "himachal pradesh": "Himachal Pradesh",
    "jammu and kashmir": "Jammu and Kashmir",
    "tamil nadu": "Tamil Nadu",
    "west bengal": "West Bengal",
    "maharashtra": "Maharashtra",
    "karnataka": "Karnataka",
    "gujarat": "Gujarat",
    "rajasthan": "Rajasthan",
    "bihar": "Bihar",
    "punjab": "Punjab",
    "haryana": "Haryana",
    "jharkhand": "Jharkhand",
    "chhattisgarh": "Chhattisgarh",
    "uttarakhand": "Uttarakhand",
    "kerala": "Kerala",
    "telangana": "Telangana",
    "odisha": "Odisha",
    "assam": "Assam",
    "goa": "Goa",
    "tripura": "Tripura",
    "meghalaya": "Meghalaya",
    "manipur": "Manipur",
    "mizoram": "Mizoram",
    "nagaland": "Nagaland",
    "sikkim": "Sikkim",
    "delhi": "Delhi",
    "national capital territory of delhi": "Delhi",
    "chandigarh": "Chandigarh",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
}


def _normalize_state(region_name: str) -> str:
    """Normalize a region/state name to our standard state name."""
    if not region_name:
        return ""

    lower = region_name.strip().lower()

    if lower in STATE_NAME_MAP:
        return STATE_NAME_MAP[lower]

    return region_name.strip().title()


def get_coordinates_from_city(city: str) -> dict:
    """
    Resolve a city/place name to latitude and longitude using
    OpenWeatherMap's geocoding API.

    Example:
        get_coordinates_from_city("Patna")

    Returns:
        {
            "city": "Patna",
            "state": "Bihar",
            "country": "IN",
            "latitude": 25.59,
            "longitude": 85.14,
            "source": "openweathermap_geocoding"
        }
    """

    city = (city or "").strip()

    if not city:
        return {
            "error": "City name is required",
            "city": "",
            "state": "",
            "country": "",
            "latitude": 0,
            "longitude": 0,
        }

    if not OPENWEATHERMAP_API_KEY:
        return {
            "error": "OPENWEATHERMAP_API_KEY not configured",
            "city": city,
            "state": "",
            "country": "",
            "latitude": 0,
            "longitude": 0,
        }

    try:
        url = "https://api.openweathermap.org/geo/1.0/direct"

        params = {
            # Bias toward Indian locations because CropMatrix is India-focused.
            "q": f"{city},IN",
            "limit": 5,
            "appid": OPENWEATHERMAP_API_KEY,
        }

        resp = requests.get(
            url,
            params=params,
            timeout=8,
        )

        resp.raise_for_status()

        results = resp.json()

        if not results:
            # Fallback without forcing India in case the user typed
            # a location that OpenWeatherMap resolves differently.
            params["q"] = city

            resp = requests.get(
                url,
                params=params,
                timeout=8,
            )

            resp.raise_for_status()
            results = resp.json()

        if not results:
            return {
                "error": f"Location not found: {city}",
                "city": city,
                "state": "",
                "country": "",
                "latitude": 0,
                "longitude": 0,
            }

        # Prefer an Indian result when available.
        selected = None

        for item in results:
            if str(item.get("country", "")).upper() == "IN":
                selected = item
                break

        if selected is None:
            selected = results[0]

        return {
            "city": selected.get("name", city),
            "state": _normalize_state(
                selected.get("state", "")
            ),
            "country": selected.get("country", ""),
            "latitude": float(
                selected.get("lat", 0) or 0
            ),
            "longitude": float(
                selected.get("lon", 0) or 0
            ),
            "source": "openweathermap_geocoding",
        }

    except requests.Timeout:
        return {
            "error": "OpenWeatherMap geocoding request timed out",
            "city": city,
            "state": "",
            "country": "",
            "latitude": 0,
            "longitude": 0,
        }

    except requests.RequestException as e:
        return {
            "error": f"Location lookup failed: {str(e)}",
            "city": city,
            "state": "",
            "country": "",
            "latitude": 0,
            "longitude": 0,
        }

    except Exception as e:
        return {
            "error": f"Location lookup failed: {str(e)}",
            "city": city,
            "state": "",
            "country": "",
            "latitude": 0,
            "longitude": 0,
        }


def get_location_from_ip(ip: str) -> dict:
    """
    Call ipstack API to get location from IP address.

    Returns:
        {
            state,
            city,
            latitude,
            longitude,
            country,
            source
        }
    """

    if not IPSTACK_API_KEY:
        return {
            "state": "",
            "city": "",
            "latitude": 0,
            "longitude": 0,
            "country": "",
            "error": "IPSTACK_API_KEY not configured",
        }

    try:
        url = f"http://api.ipstack.com/{ip}"

        params = {
            "access_key": IPSTACK_API_KEY,
            "fields": (
                "country_name,region_name,city,"
                "latitude,longitude,zip"
            ),
        }

        resp = requests.get(
            url,
            params=params,
            timeout=5,
        )

        data = resp.json()

        if data.get("error"):
            error_info = data["error"].get(
                "info",
                "Unknown error",
            )

            return {
                "state": "",
                "city": "",
                "latitude": 0,
                "longitude": 0,
                "country": "",
                "error": (
                    f"ipstack error: {error_info}"
                ),
            }

        state = _normalize_state(
            data.get("region_name", "")
        )

        city = data.get("city", "")
        latitude = data.get("latitude", 0)
        longitude = data.get("longitude", 0)
        country = data.get("country_name", "")

        return {
            "state": state,
            "city": city,
            "latitude": latitude or 0,
            "longitude": longitude or 0,
            "country": country,
            "source": "ipstack",
        }

    except requests.Timeout:
        return {
            "state": "",
            "city": "",
            "latitude": 0,
            "longitude": 0,
            "country": "",
            "error": "ipstack request timed out",
        }

    except Exception as e:
        return {
            "state": "",
            "city": "",
            "latitude": 0,
            "longitude": 0,
            "country": "",
            "error": (
                f"Location detection failed: {str(e)}"
            ),
        }