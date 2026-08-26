"""
Market Service — Load pre-processed market summary for fast startup.
Uses the small pickle file (1.4 MB) instead of raw CSV (85 MB).
Run model_scripts/preprocess_market_data.py first to generate the summary.
"""

import pickle
import numpy as np
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SUMMARY_PATH = PROJECT_ROOT / "datasets" / "market_summary.pkl"

_daily_prices = None
_metadata_cache = None
_source_info = None


def load_market_data():
    """Load pre-processed market summary. ~1.4 MB, loads in <1 second."""
    global _daily_prices, _metadata_cache, _source_info

    try:
        if not SUMMARY_PATH.exists():
            print(f"  [WARN] Market summary not found at {SUMMARY_PATH}")
            print(f"         Run: python model_scripts/preprocess_market_data.py")
            return

        with open(SUMMARY_PATH, "rb") as f:
            data = pickle.load(f)

        _daily_prices = data["daily_prices"]
        _metadata_cache = data["metadata"]
        _source_info = {
            "source": data.get("source", "agmarknet"),
            "raw_rows": data.get("raw_rows", 0),
            "date_range": data.get("date_range", {}),
        }

        rows = len(_daily_prices)
        states = _daily_prices["State"].nunique() if "State" in _daily_prices.columns else 0
        commodities = _daily_prices["Commodity"].nunique() if "Commodity" in _daily_prices.columns else 0
        print(f"  [OK] Market summary loaded ({rows:,} aggregated rows, {states} states, {commodities} commodities)")

    except Exception as e:
        print(f"  [ERROR] Failed to load market summary: {e}")


def get_market_metadata() -> dict:
    """Return cascading metadata for dropdowns."""
    if _metadata_cache:
        return _metadata_cache
    return {"states": {}, "commodities": []}


def get_historical_prices(commodity: str, state: str = None, district: str = None,
                           market: str = None, days: int = 90) -> dict:
    """Get historical prices for a commodity, optionally filtered by state."""
    if _daily_prices is None or _daily_prices.empty:
        return {"commodity": commodity, "state": state, "prices": [], "message": "Market data not loaded"}

    df = _daily_prices.copy()

    # Filter by commodity
    if commodity:
        mask = df["Commodity"].str.lower() == commodity.strip().lower()
        df = df[mask]

    # Filter by state
    if state:
        mask = df["State"].str.lower() == state.strip().lower()
        df = df[mask]

    if df.empty:
        return {
            "commodity": commodity,
            "state": state,
            "prices": [],
            "message": "No data found for these filters",
        }

    # Sort by date descending, take most recent N days of data
    df = df.sort_values("Date", ascending=False).head(days)
    df = df.sort_values("Date", ascending=True)  # Reverse for chart display

    # Build price list
    price_data = []
    for _, row in df.iterrows():
        d = row["Date"]
        date_str = d.strftime("%Y-%m-%d") if hasattr(d, 'strftime') else str(d)
        price_data.append({
            "date": date_str,
            "modal_price": round(float(row["Modal_Price"]), 2),
            "min_price": round(float(row["Min_Price"]), 2) if not np.isnan(row["Min_Price"]) else None,
            "max_price": round(float(row["Max_Price"]), 2) if not np.isnan(row["Max_Price"]) else None,
        })

    # Summary stats
    latest_price = price_data[-1]["modal_price"] if price_data else 0
    avg_price = round(np.mean([p["modal_price"] for p in price_data]), 2) if price_data else 0
    trend = "up" if len(price_data) >= 2 and price_data[-1]["modal_price"] > price_data[0]["modal_price"] else "down"

    return {
        "commodity": commodity,
        "state": state,
        "district": district,
        "market": market,
        "prices": price_data,
        "summary": {
            "latest_price": latest_price,
            "average_price": avg_price,
            "trend": trend,
            "data_points": len(price_data),
        },
        "source": "agmarknet",
    }


def get_commodities_for_location(state: str, district: str = None) -> list:
    """Get available commodities for a state."""
    if _daily_prices is None:
        return []

    df = _daily_prices
    if state:
        df = df[df["State"].str.lower() == state.strip().lower()]

    if "Commodity" in df.columns:
        return sorted(df["Commodity"].unique().tolist())
    return []
