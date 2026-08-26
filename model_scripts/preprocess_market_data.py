"""
Pre-process the Agmarknet 89MB CSV into a small aggregated summary file.
Run this ONCE to create the summary. The server loads only the summary.
"""

import pandas as pd
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_CSV = PROJECT_ROOT / "datasets" / "agmarknet_india_historical_prices_2024_2025.csv"
OUTPUT_PATH = PROJECT_ROOT / "datasets" / "market_summary.pkl"

def preprocess():
    print(f"[1/4] Loading raw CSV: {RAW_CSV}")
    print(f"  Size: {os.path.getsize(RAW_CSV) / (1024*1024):.1f} MB")
    
    df = pd.read_csv(RAW_CSV, low_memory=False)
    print(f"  Rows: {len(df):,}")
    print(f"  Columns: {list(df.columns)}")
    
    # Rename columns
    col_map = {}
    for col in df.columns:
        lower = col.strip().lower()
        if "state" in lower:
            col_map[col] = "State"
        elif "district" in lower:
            col_map[col] = "District"
        elif "market" in lower:
            col_map[col] = "Market"
        elif "commodity" in lower:
            col_map[col] = "Commodity"
        elif "modal" in lower and "price" in lower:
            col_map[col] = "Modal_Price"
        elif "min" in lower and "price" in lower:
            col_map[col] = "Min_Price"
        elif "max" in lower and "price" in lower:
            col_map[col] = "Max_Price"
        elif ("arrival" in lower and "date" in lower) or ("price" in lower and "date" in lower):
            col_map[col] = "Date"
        elif "variety" in lower:
            col_map[col] = "Variety"
    
    df = df.rename(columns=col_map)
    
    print(f"\n[2/4] Parsing dates...")
    if "Date" in df.columns:
        df["Date"] = pd.to_datetime(df["Date"], format="mixed", dayfirst=True, errors="coerce")
        df = df.dropna(subset=["Date"])
    
    # Clean prices
    for col in ["Modal_Price", "Min_Price", "Max_Price"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=["Modal_Price"])
    
    # Strip strings
    for col in ["State", "District", "Market", "Commodity"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()
    
    print(f"  Clean rows: {len(df):,}")
    
    # ── Aggregate: daily price by State + Commodity ──
    print(f"\n[3/4] Aggregating daily prices by State + Commodity...")
    daily = df.groupby(["State", "Commodity", pd.Grouper(key="Date", freq="D")]).agg({
        "Modal_Price": "mean",
        "Min_Price": "mean",
        "Max_Price": "mean",
    }).reset_index()
    
    daily = daily.dropna(subset=["Modal_Price"])
    daily = daily.sort_values(["State", "Commodity", "Date"])
    
    print(f"  Aggregated rows: {len(daily):,}")
    print(f"  States: {daily['State'].nunique()}")
    print(f"  Commodities: {daily['Commodity'].nunique()}")
    
    # ── Build metadata ──
    metadata = {
        "states": {},
        "commodities": sorted(df["Commodity"].unique().tolist()),
    }
    
    if "State" in df.columns:
        for state in sorted(df["State"].unique()):
            state_df = df[df["State"] == state]
            districts = {}
            if "District" in df.columns:
                for district in sorted(state_df["District"].unique()):
                    district_df = state_df[state_df["District"] == district]
                    markets = sorted(district_df["Market"].unique().tolist()) if "Market" in df.columns else []
                    districts[district] = markets
            metadata["states"][state] = districts
    
    # ── Save ──
    print(f"\n[4/4] Saving to {OUTPUT_PATH}...")
    import pickle
    with open(OUTPUT_PATH, "wb") as f:
        pickle.dump({
            "daily_prices": daily,
            "metadata": metadata,
            "source": "agmarknet",
            "raw_rows": len(df),
            "date_range": {
                "min": str(daily["Date"].min()),
                "max": str(daily["Date"].max()),
            }
        }, f)
    
    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)
    print(f"\n  Done! Summary file: {size_mb:.1f} MB (vs {os.path.getsize(RAW_CSV)/(1024*1024):.1f} MB raw)")
    print(f"  Reduction: {(1 - size_mb / (os.path.getsize(RAW_CSV)/(1024*1024))) * 100:.0f}%")

if __name__ == "__main__":
    preprocess()
