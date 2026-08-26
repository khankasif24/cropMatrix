# Scoring Engine Specification — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Date:** 2026-03-07

---

## 1. Overview

The Scoring Engine is responsible for generating crop recommendations. It takes a plot's soil, weather, season, irrigation, and rotation history and produces a **ranked list of top-3 crops** with confidence scores, reasons, sowing windows, and fertilizer suggestions.

---

## 2. Architecture

```
Input Features
    │
    ▼
┌──────────────────┐
│ Feature Engineer  │ ← Soil, weather, season, irrigation, history
└────────┬─────────┘
         │  Feature vector (numeric)
         ▼
┌──────────────────┐     ┌──────────────┐
│   ML Model       │────►│  Post-Process │── Top-3 crops + scores + reasons
│ (RandomForest /  │     │  & Ranking    │
│  XGBoost)        │     └──────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────┐
│ Constraint Layer  │ ← Rotation rules, crop calendar, water budgets
└────────┬─────────┘
         │
         ▼
    Final Output (JSON)
```

---

## 3. Input Schema

```json
{
  "plot_id": "uuid",
  "soil": {
    "nitrogen": 140.5,       // kg/ha
    "phosphorus": 28.3,      // kg/ha
    "potassium": 200.0,      // kg/ha
    "ph": 6.8,
    "organic_carbon": 0.65   // % (optional)
  },
  "weather": {
    "avg_temp": 25.0,        // °C (seasonal average)
    "avg_rainfall_mm": 120,  // mm (seasonal total)
    "avg_humidity": 60       // %
  },
  "season": "rabi",          // kharif | rabi | zaid
  "irrigation_type": "tubewell",
  "previous_crop": "rice",
  "previous_crop_family": "cereals",
  "location": {
    "latitude": 25.3176,
    "longitude": 82.9739,
    "agro_zone": "indo_gangetic_plain"
  }
}
```

---

## 4. Feature Engineering

### 4.1 Feature Vector

| # | Feature | Type | Source | Transformation |
|---|---------|------|--------|---------------|
| 1 | `nitrogen` | float | soil_tests | Latest value; regional mean if missing |
| 2 | `phosphorus` | float | soil_tests | Latest value; regional mean if missing |
| 3 | `potassium` | float | soil_tests | Latest value; regional mean if missing |
| 4 | `ph` | float | soil_tests | Latest value; 6.5 default if missing |
| 5 | `avg_temperature` | float | weather_observations | 30-day rolling average |
| 6 | `total_rainfall` | float | weather_observations | Seasonal total (forecast + historical) |
| 7 | `avg_humidity` | float | weather_observations | 30-day rolling average |
| 8 | `season_encoded` | int | user input | Ordinal: kharif=0, rabi=1, zaid=2 |
| 9 | `irrigation_encoded` | int | plots | Ordinal: rainfed=0, canal=1, tubewell=2, drip=3, sprinkler=4 |
| 10 | `prev_crop_family_encoded` | int | rotations | One-hot or ordinal encoding of crop family |
| 11 | `agro_zone_encoded` | int | location lookup | Label-encoded agro-ecological zone |

### 4.2 Missing Data Handling

| Field | Strategy |
|-------|----------|
| Soil NPK/pH | Use district-level averages from `crop_master` / government datasets |
| Weather | Use nearest station historical averages |
| Previous crop | Assume "unknown" — no rotation penalty applied |

---

## 5. Models

### 5.1 Primary: Random Forest Classifier

| Parameter | Value (MVP) |
|-----------|-------------|
| Algorithm | `RandomForestClassifier` (scikit-learn) |
| n_estimators | 100 |
| max_depth | 12 |
| min_samples_split | 5 |
| class_weight | `balanced` |
| Training data | Labeled dataset: soil/weather/season → crop suitability |
| Output | `predict_proba()` for all crop classes |

### 5.2 Secondary: XGBoost (A/B test)

| Parameter | Value |
|-----------|-------|
| Algorithm | `XGBClassifier` |
| n_estimators | 200 |
| max_depth | 8 |
| learning_rate | 0.1 |
| eval_metric | `mlogloss` |

### 5.3 Market Price Prediction

| Parameter | Value |
|-----------|-------|
| Algorithm | ARIMA (short-term), LSTM (if data available) |
| Input | Historical mandi prices (30–180 days) |
| Output | 7-day price forecast + confidence interval |

---

## 6. Scoring Logic

### 6.1 Base Score (from ML model)

```python
probabilities = model.predict_proba(feature_vector)  # shape: (1, n_crops)
```

Each crop gets a base probability score (0.0 – 1.0).

### 6.2 Constraint Penalties

| Rule | Penalty | Condition |
|------|---------|-----------|
| **Same crop repeat** | −0.30 | Same crop as previous season |
| **Same family repeat** | −0.15 | Same crop family in consecutive seasons |
| **pH out of range** | −0.20 | Current pH outside crop's ideal_ph_min–ideal_ph_max |
| **Water budget exceeded** | −0.25 | Crop water_req_mm > (rainfall + irrigation estimate) |
| **Temperature mismatch** | −0.20 | Avg temp outside crop's min_temp–max_temp |
| **Season mismatch** | −1.00 | Crop not suitable for the current season (hard filter) |

### 6.3 Bonus Factors

| Rule | Bonus | Condition |
|------|-------|-----------|
| **Legume after cereal** | +0.10 | Pulse/legume recommended after cereal crop |
| **High market price** | +0.05 | Crop price trending up (>5% in 30 days) |
| **Soil recovery** | +0.08 | Green manure crop if soil health = "poor" |

### 6.4 Final Score Calculation

```python
final_score = base_probability + sum(constraint_penalties) + sum(bonuses)
final_score = max(0.0, min(1.0, final_score))  # clamp to [0, 1]
```

### 6.5 Ranking & Output

1. Filter out all crops with `final_score < 0.10` or season mismatch.
2. Sort by `final_score` descending.
3. Take top 3.
4. Generate human-readable `reason` string for each.

---

## 7. Reason Generation

Template-based explanations combining top contributing factors:

```python
reasons = []
if soil_match:    reasons.append(f"Optimal soil pH ({ph})")
if rain_match:    reasons.append(f"Expected rainfall ({rainfall}mm) suits {crop}")
if rotation_good: reasons.append(f"Good rotation after {prev_crop}")
if market_up:     reasons.append(f"Market price rising ({trend_pct}%)")

reason_text = "; ".join(reasons[:3]) + "."
```

---

## 8. Fertilizer Recommendation Logic

```
deficit_N = max(0, crop.ideal_n_mid - soil.nitrogen)
deficit_P = max(0, crop.ideal_p_mid - soil.phosphorus)
deficit_K = max(0, crop.ideal_k_mid - soil.potassium)

recommended_N = deficit_N * adjustment_factor
recommended_P = deficit_P * adjustment_factor
recommended_K = deficit_K * adjustment_factor
```

Where `adjustment_factor` accounts for irrigation type (rainfed = 0.8, irrigated = 1.0).

---

## 9. Output Schema

```json
{
  "recommendations": [
    {
      "rank": 1,
      "crop": "wheat",
      "score": 0.87,
      "base_score": 0.82,
      "adjustments": [
        {"rule": "legume_rotation_bonus", "value": 0.10},
        {"rule": "same_family_penalty", "value": -0.05}
      ],
      "reason": "Optimal soil pH (6.8); expected rainfall suits wheat; good rotation after rice.",
      "sowing_window": {"start": "2026-11-10", "end": "2026-11-30"},
      "expected_yield_kg_ha": 4200,
      "fertilizer": {"nitrogen_kg_ha": 50, "phosphorus_kg_ha": 25, "potassium_kg_ha": 15}
    }
  ],
  "model_version": "rf-v1-20260301",
  "inference_ms": 145
}
```

---

## 10. Caching Strategy

| Key Pattern | TTL | Invalidation |
|-------------|-----|-------------|
| `reco:{plot_id}:{season}:{soil_hash}` | 5 min | On new soil test or weather update |
| `features:{plot_id}` | 1 hour | On soil/weather change |
| `market_trend:{crop}:{district}` | 6 hours | On new price ingestion |

---

## 11. Model Lifecycle

| Phase | Trigger | Action |
|-------|---------|--------|
| **Training** | Monthly scheduled + manual | Run training pipeline on updated dataset |
| **Evaluation** | Post-training | Compare accuracy, F1, confusion matrix vs. current active model |
| **Deployment** | Manual approval | Update `model_registry.is_active`; load new model in service |
| **Monitoring** | Continuous | Track inference latency, score distribution drift, error rate |
| **Rollback** | Alert on degradation | Revert `is_active` to previous version |

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Single inference latency | < 100 ms |
| End-to-end API (with feature fetch) | < 2 s (p95) |
| Cache hit rate | > 40% |
| Model accuracy (cross-val) | > 70% |
