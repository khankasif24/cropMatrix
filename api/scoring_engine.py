"""
Scoring Engine — Applies constraint penalties and bonuses to ML base scores.
Implements the logic from scoring_engine_spec.md.
Updated for 149-crop dataset with state-aware recommendations.
"""

# ── Crop Master Data ──────────────────────────────────────
CROP_FAMILIES = {
    # Cereals
    "rice": "cereals", "paddy": "cereals", "wheat": "cereals", "wheat atta": "cereals",
    "maize": "cereals", "bajra": "cereals", "jowar": "cereals",
    "ragi": "cereals", "barley": "cereals", "millet": "cereals",
    "maida atta": "cereals",

    # Pulses
    "chickpea": "pulses", "lentil": "pulses", "blackgram": "pulses", "black gram": "pulses",
    "mungbean": "pulses", "green gram": "pulses", "mothbeans": "pulses",
    "pigeonpeas": "pulses", "pigeon pea": "pulses", "red gram": "pulses",
    "kidneybeans": "pulses", "bengal gram": "pulses", "field pea": "pulses",
    "moong dal": "pulses", "masur dal": "pulses", "soyabean": "pulses",
    "cowpea": "pulses", "french beans": "pulses", "beans": "pulses",
    "cluster beans": "pulses", "surat beans": "pulses", "duster beans": "pulses",
    "peas": "pulses", "peas cod": "pulses", "chholia": "pulses",

    # Fibers
    "cotton": "fibers", "jute": "fibers",

    # Fruits
    "apple": "fruits", "banana": "fruits", "green banana": "fruits",
    "grapes": "fruits", "mango": "fruits", "orange": "fruits",
    "papaya": "fruits", "pomegranate": "fruits", "watermelon": "fruits",
    "water melon": "fruits", "muskmelon": "fruits", "musk melon": "fruits",
    "pineapple": "fruits", "guava": "fruits", "sapota": "fruits",
    "kinnow": "fruits", "lemon": "fruits", "lime": "fruits",
    "sweet lime": "fruits", "pear": "fruits", "amla": "fruits",
    "zizyphus": "fruits",

    # Vegetables
    "potato": "vegetables", "tomato": "vegetables", "onion": "vegetables",
    "green onion": "vegetables", "brinjal": "vegetables", "cabbage": "vegetables",
    "cauliflower": "vegetables", "carrot": "vegetables", "raddish": "vegetables",
    "spinach": "vegetables", "ladies finger": "vegetables",
    "bitter gourd": "vegetables", "bottle gourd": "vegetables",
    "ridge gourd": "vegetables", "sponge gourd": "vegetables",
    "little gourd": "vegetables", "cucumber": "vegetables",
    "pumpkin": "vegetables", "sweet pumpkin": "vegetables", "white pumpkin": "vegetables",
    "capsicum": "vegetables", "chilly capsicum": "vegetables",
    "green chilli": "vegetables", "dry chillies": "vegetables",
    "coriander": "vegetables", "methi leaves": "vegetables",
    "mint": "vegetables", "leafy vegetable": "vegetables",
    "knool khol": "vegetables", "drumstick": "vegetables",
    "colacasia": "vegetables", "sweet potato": "vegetables",
    "elephat yam": "vegetables", "tinda": "vegetables",
    "round gourd": "vegetables", "long melon": "vegetables",
    "seam": "vegetables", "squash": "vegetables", "turnip": "vegetables",
    "beetroot": "vegetables", "amaranthus": "vegetables",
    "snakeguard": "vegetables", "seemebadnekai": "vegetables",
    "suvarna gadde": "vegetables", "green avare": "vegetables",
    "rajgir": "vegetables", "parval": "vegetables",
    "cluster beans": "vegetables", "guar": "vegetables",

    # Plantation
    "coconut": "plantation", "coconut seed": "plantation",
    "coconut oil": "plantation", "coffee": "plantation",
    "arecanut": "plantation", "black pepper": "plantation",
    "pepper garbled": "plantation", "rubber": "plantation",
    "cashewnuts": "plantation", "copra": "plantation",
    "tender coconut": "plantation",

    # Spices & Condiments
    "ginger": "spices", "garlic": "spices", "turmeric": "spices",
    "mushrooms": "spices",

    # Oilseeds
    "mustard": "oilseeds", "groundnut": "oilseeds",
    "castor seed": "oilseeds", "linseed": "oilseeds",
    "niger seed": "oilseeds",

    # Others
    "sugarcane": "sugarcane", "tapioca": "tubers",
    "amphophalus": "tubers", "ash gourd": "vegetables",
    "wood": "forestry",
}

CROP_SEASONS = {
    "rice": ["kharif"], "paddy": ["kharif", "rabi"], "wheat": ["rabi"],
    "wheat atta": ["rabi"], "maize": ["kharif", "rabi"],
    "chickpea": ["rabi"], "bengal gram": ["rabi"],
    "lentil": ["rabi"], "blackgram": ["kharif"], "black gram": ["kharif"],
    "mungbean": ["kharif", "zaid"], "green gram": ["kharif", "zaid"],
    "cotton": ["kharif"], "jute": ["kharif"],
    "banana": ["kharif", "rabi", "zaid"], "green banana": ["kharif", "rabi", "zaid"],
    "apple": ["rabi"], "grapes": ["rabi"],
    "coffee": ["kharif"], "coconut": ["kharif", "rabi", "zaid"],
    "mango": ["kharif"], "orange": ["rabi"],
    "papaya": ["kharif", "zaid"], "watermelon": ["zaid"],
    "muskmelon": ["zaid"], "pomegranate": ["rabi"],
    "pigeonpeas": ["kharif"], "pigeon pea": ["kharif"],
    "red gram": ["kharif"],
    "mothbeans": ["kharif"], "kidneybeans": ["rabi"],
    "sugarcane": ["kharif", "rabi"],
    "mustard": ["rabi"], "bajra": ["kharif"],
    "jowar": ["kharif"],
    "potato": ["rabi"], "tomato": ["rabi", "kharif"],
    "onion": ["rabi"], "cabbage": ["rabi"],
    "cauliflower": ["rabi"], "carrot": ["rabi"],
    "soyabean": ["kharif"], "groundnut": ["kharif"],
}

CROP_PH_RANGE = {
    "rice": (5.0, 8.0), "paddy": (5.0, 8.0),
    "wheat": (6.0, 8.0), "wheat atta": (6.0, 8.0),
    "maize": (5.5, 7.5),
    "chickpea": (6.0, 8.0), "bengal gram": (6.0, 8.0),
    "lentil": (6.0, 7.5), "cotton": (6.0, 8.0),
    "banana": (5.5, 7.5), "green banana": (5.5, 7.5),
    "apple": (5.5, 6.5), "coffee": (5.0, 6.5),
    "mango": (5.5, 7.5), "orange": (5.0, 6.5),
    "grapes": (6.0, 7.5), "watermelon": (6.0, 7.0),
    "coconut": (5.5, 7.0),
    "potato": (5.0, 7.0), "tomato": (5.5, 7.5),
    "onion": (6.0, 7.5), "sugarcane": (5.0, 8.0),
    "mustard": (5.5, 7.5), "groundnut": (5.5, 7.0),
    "soyabean": (6.0, 7.5),
}

CROP_TEMP_RANGE = {
    "rice": (20, 37), "paddy": (20, 37),
    "wheat": (10, 25), "wheat atta": (10, 25),
    "maize": (18, 35),
    "chickpea": (15, 30), "bengal gram": (15, 30),
    "lentil": (15, 25), "cotton": (20, 40),
    "banana": (20, 35), "green banana": (20, 35),
    "apple": (10, 25), "coffee": (15, 30),
    "mango": (24, 40), "orange": (15, 30),
    "grapes": (15, 35), "sugarcane": (20, 38),
    "potato": (15, 25), "tomato": (18, 35),
    "onion": (13, 28), "mustard": (10, 25),
}

# Sowing window data (month ranges)
SOWING_WINDOWS = {
    "rice": {"kharif": ("Jun 15", "Jul 15")},
    "paddy": {"kharif": ("Jun 15", "Jul 15"), "rabi": ("Nov 01", "Dec 15")},
    "wheat": {"rabi": ("Nov 01", "Nov 30")},
    "wheat atta": {"rabi": ("Nov 01", "Nov 30")},
    "maize": {"kharif": ("Jun 15", "Jul 15"), "rabi": ("Oct 15", "Nov 15")},
    "chickpea": {"rabi": ("Oct 15", "Nov 15")},
    "bengal gram": {"rabi": ("Oct 15", "Nov 15")},
    "lentil": {"rabi": ("Oct 20", "Nov 15")},
    "cotton": {"kharif": ("Apr 15", "May 30")},
    "banana": {"kharif": ("Jun 01", "Jul 15")},
    "mungbean": {"kharif": ("Jun 15", "Jul 15"), "zaid": ("Mar 01", "Apr 15")},
    "green gram": {"kharif": ("Jun 15", "Jul 15"), "zaid": ("Mar 01", "Apr 15")},
    "blackgram": {"kharif": ("Jun 15", "Jul 30")},
    "black gram": {"kharif": ("Jun 15", "Jul 30")},
    "mothbeans": {"kharif": ("Jul 01", "Aug 15")},
    "pigeonpeas": {"kharif": ("Jun 01", "Jul 15")},
    "pigeon pea": {"kharif": ("Jun 01", "Jul 15")},
    "kidneybeans": {"rabi": ("Oct 15", "Nov 15")},
    "sugarcane": {"kharif": ("Feb 15", "Mar 30")},
    "potato": {"rabi": ("Oct 01", "Nov 15")},
    "tomato": {"rabi": ("Sep 15", "Oct 30")},
    "onion": {"rabi": ("Oct 15", "Nov 30")},
    "mustard": {"rabi": ("Oct 01", "Oct 30")},
}

# Fertilizer recommendation baselines (N, P, K in kg/ha)
FERTILIZER_BASELINES = {
    "rice": {"N": 120, "P": 60, "K": 60},
    "paddy": {"N": 120, "P": 60, "K": 60},
    "wheat": {"N": 120, "P": 60, "K": 40},
    "wheat atta": {"N": 120, "P": 60, "K": 40},
    "maize": {"N": 120, "P": 60, "K": 40},
    "chickpea": {"N": 20, "P": 40, "K": 20},
    "bengal gram": {"N": 20, "P": 40, "K": 20},
    "lentil": {"N": 20, "P": 40, "K": 20},
    "cotton": {"N": 80, "P": 40, "K": 40},
    "banana": {"N": 200, "P": 60, "K": 300},
    "green banana": {"N": 200, "P": 60, "K": 300},
    "mungbean": {"N": 20, "P": 40, "K": 20},
    "green gram": {"N": 20, "P": 40, "K": 20},
    "blackgram": {"N": 20, "P": 40, "K": 20},
    "black gram": {"N": 20, "P": 40, "K": 20},
    "sugarcane": {"N": 150, "P": 80, "K": 80},
    "potato": {"N": 120, "P": 80, "K": 100},
    "tomato": {"N": 100, "P": 60, "K": 80},
    "onion": {"N": 80, "P": 40, "K": 60},
    "mustard": {"N": 80, "P": 40, "K": 30},
    "soyabean": {"N": 30, "P": 60, "K": 30},
}


def apply_scoring(base_results: list[dict],
                   previous_crop: str | None = None,
                   season: str = "kharif",
                   ph: float = 6.5,
                   temperature: float = 25.0,
                   nitrogen: float = 80.0,
                   phosphorus: float = 40.0,
                   potassium: float = 40.0,
                   state: str = None,
                   state_crops: list = None) -> list[dict]:
    """
    Apply constraint penalties and bonuses to base ML scores.
    Returns enriched results with adjusted scores, reasons, sowing windows, and fertilizer advice.
    """
    prev_crop_lower = previous_crop.lower().strip() if previous_crop else None
    prev_family = CROP_FAMILIES.get(prev_crop_lower, "unknown") if prev_crop_lower else None

    # Build lowercase set of state crops for fast lookup
    state_crops_lower = set()
    if state_crops:
        state_crops_lower = {c.lower().strip() for c in state_crops}

    scored_results = []
    for item in base_results:
        crop = item["crop"]
        crop_lower = crop.lower().strip()
        base_score = item["score"]
        adjustments = []
        reasons = []

        family = CROP_FAMILIES.get(crop_lower, "other")

        # ── Constraint Penalties ───────────────────────
        # Same crop repeat
        if prev_crop_lower and crop_lower == prev_crop_lower:
            adjustments.append({"rule": "same_crop_repeat", "value": -0.30})

        # Same family repeat
        elif prev_family and family == prev_family:
            adjustments.append({"rule": "same_family_penalty", "value": -0.15})

        # pH out of range
        ph_range = CROP_PH_RANGE.get(crop_lower, (4.5, 9.0))
        if ph < ph_range[0] or ph > ph_range[1]:
            adjustments.append({"rule": "ph_out_of_range", "value": -0.20})
        else:
            reasons.append(f"Optimal soil pH ({ph}) within range {ph_range[0]}-{ph_range[1]}")

        # Temperature mismatch
        temp_range = CROP_TEMP_RANGE.get(crop_lower, (10, 45))
        if temperature < temp_range[0] or temperature > temp_range[1]:
            adjustments.append({"rule": "temperature_mismatch", "value": -0.20})
        else:
            reasons.append(f"Suitable temperature ({temperature}°C)")

        # Season mismatch (soft penalty, dataset has no season column so be lenient)
        crop_seasons = CROP_SEASONS.get(crop_lower, ["kharif", "rabi", "zaid"])
        if season.lower() not in crop_seasons:
            adjustments.append({"rule": "season_mismatch", "value": -0.15})

        # ── Bonuses ───────────────────────────────────
        # Legume after cereal
        if family == "pulses" and prev_family == "cereals":
            adjustments.append({"rule": "legume_rotation_bonus", "value": 0.10})
            reasons.append(f"Good rotation — legume after cereal improves soil nitrogen")

        # STATE-BASED CROP INFO — note in reasons (filtering done in ML service)
        if state and state_crops_lower and crop_lower in state_crops_lower:
            reasons.append(f"Commonly grown in {state}")

        # ── Final Score ───────────────────────────────
        adjustment_total = sum(a["value"] for a in adjustments)
        final_score = max(0.0, min(1.0, base_score + adjustment_total))

        # ── Sowing Window ─────────────────────────────
        sowing_data = SOWING_WINDOWS.get(crop_lower, {})
        sowing_window = sowing_data.get(season.lower(), None)
        if not sowing_window:
            # Default sowing window
            if season.lower() == "kharif":
                sowing_window = ("Jun 15", "Jul 30")
            elif season.lower() == "rabi":
                sowing_window = ("Oct 15", "Nov 30")
            else:
                sowing_window = ("Mar 01", "Apr 30")

        # ── Fertilizer Recommendation ─────────────────
        baseline = FERTILIZER_BASELINES.get(crop_lower, {"N": 80, "P": 40, "K": 30})
        fert_n = max(0, baseline["N"] - nitrogen * 0.5)
        fert_p = max(0, baseline["P"] - phosphorus * 0.5)
        fert_k = max(0, baseline["K"] - potassium * 0.5)

        if not reasons:
            reasons.append(f"Model confidence: {item['confidence_pct']}%")

        scored_results.append({
            "rank": item["rank"],
            "crop": crop,
            "crop_family": family,
            "base_score": round(base_score, 4),
            "final_score": round(final_score, 4),
            "confidence_pct": round(final_score * 100, 1),
            "adjustments": adjustments,
            "reason": "; ".join(reasons[:3]) + ".",
            "sowing_window": {
                "start": sowing_window[0],
                "end": sowing_window[1],
            },
            "fertilizer": {
                "nitrogen_kg_ha": round(fert_n, 1),
                "phosphorus_kg_ha": round(fert_p, 1),
                "potassium_kg_ha": round(fert_k, 1),
            },
        })

    # Re-rank by final score
    scored_results.sort(key=lambda x: x["final_score"], reverse=True)
    for i, item in enumerate(scored_results, 1):
        item["rank"] = i

    return scored_results
