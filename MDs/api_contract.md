# API Contract — Smart Crop Advisory (SIH25010)

**Version:** 1.0
**Date:** 2026-03-07
**Base URL:** `https://api.smartcrop.in/v1`
**Auth:** Bearer JWT (all endpoints unless marked `[public]`)

---

## 1. Common Standards

### Request/Response Format
- Content-Type: `application/json`
- Date format: `YYYY-MM-DD` (dates), `ISO 8601` (timestamps)
- All IDs are UUIDs

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {"field": "area_ha", "reason": "Must be greater than 0"}
    ]
  }
}
```

### Error Codes
| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request payload |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Insufficient role/permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Constraint violation (e.g., rotation conflict) |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8
  }
}
```

---

## 2. Authentication

### `POST /auth/otp/send` [public]
Send OTP to phone number.

**Request:**
```json
{
  "phone": "+919876543210"
}
```

**Response (200):**
```json
{
  "message": "OTP sent successfully",
  "expires_in_seconds": 300
}
```

---

### `POST /auth/otp/verify` [public]
Verify OTP and receive JWT tokens.

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUz...",
  "refresh_token": "eyJhbGciOiJIUz...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "phone": "+919876543210",
    "name": null,
    "role": "farmer",
    "is_new_user": true
  }
}
```

---

### `POST /auth/token/refresh`
Refresh access token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUz..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUz...",
  "expires_in": 900
}
```

---

## 3. Users

### `GET /users/me`
Get current user profile.

**Response (200):**
```json
{
  "id": "uuid",
  "phone": "+919876543210",
  "name": "Ramesh Kumar",
  "language_pref": "hi",
  "district": "Varanasi",
  "state": "Uttar Pradesh",
  "role": "farmer",
  "created_at": "2026-03-01T10:00:00Z"
}
```

---

### `PUT /users/me`
Update user profile.

**Request:**
```json
{
  "name": "Ramesh Kumar",
  "language_pref": "hi",
  "district": "Varanasi",
  "state": "Uttar Pradesh"
}
```

**Response (200):** Updated user object.

---

### `DELETE /users/me`
Request account deletion (GDPR-like).

**Request:**
```json
{
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "message": "Account scheduled for deletion within 24 hours"
}
```

---

### `GET /users/me/export`
Request data export.

**Response (202):**
```json
{
  "message": "Data export initiated. Download link will be sent via SMS.",
  "estimated_ready_at": "2026-03-07T22:00:00Z"
}
```

---

## 4. Plots

### `POST /plots`
Register a new plot.

**Request:**
```json
{
  "label": "South Field",
  "latitude": 25.3176,
  "longitude": 82.9739,
  "geojson": {
    "type": "Polygon",
    "coordinates": [[[82.973, 25.317], [82.974, 25.317], [82.974, 25.318], [82.973, 25.318], [82.973, 25.317]]]
  },
  "area_ha": 1.5,
  "irrigation_type": "tubewell",
  "previous_crop": "rice"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "label": "South Field",
  "latitude": 25.3176,
  "longitude": 82.9739,
  "area_ha": 1.5,
  "irrigation_type": "tubewell",
  "weather_station_id": null,
  "created_at": "2026-03-07T12:00:00Z"
}
```

---

### `GET /plots`
List all plots for current user.

**Query Params:** `page`, `page_size`

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "label": "South Field",
      "area_ha": 1.5,
      "irrigation_type": "tubewell",
      "soil_summary": {"health_status": "moderate", "last_test_date": "2026-01-15"},
      "weather_station_id": "IN_VAR_001",
      "previous_crop": "rice",
      "created_at": "2026-03-07T12:00:00Z"
    }
  ],
  "pagination": {"page": 1, "page_size": 20, "total_items": 3, "total_pages": 1}
}
```

---

### `GET /plots/{plot_id}`
Get plot details.

**Response (200):** Full plot object with nested latest soil test and active rotation entries.

---

### `PUT /plots/{plot_id}`
Update plot details.

---

### `DELETE /plots/{plot_id}`
Delete a plot and all associated data.

---

## 5. Soil Tests

### `POST /plots/{plot_id}/soil-tests`
Add a soil test result.

**Request:**
```json
{
  "nitrogen": 140.5,
  "phosphorus": 28.3,
  "potassium": 200.0,
  "ph": 6.8,
  "organic_carbon": 0.65,
  "moisture": 35.0,
  "test_date": "2026-01-15",
  "lab_name": "KVK Varanasi"
}
```

**Response (201):** Created soil test object.

---

### `GET /plots/{plot_id}/soil-tests`
List soil test history for a plot. Ordered by `test_date` descending.

---

## 6. Crop Recommendation

### `POST /recommend/crop`
Get crop recommendations for a plot.

**Request:**
```json
{
  "plot_id": "uuid",
  "season": "rabi",
  "override_soil": null
}
```

**Response (200):**
```json
{
  "plot_id": "uuid",
  "season": "rabi",
  "recommendations": [
    {
      "rank": 1,
      "crop": "wheat",
      "score": 0.87,
      "reason": "Optimal soil pH (6.8), adequate nitrogen, suitable temperature range for rabi season.",
      "sowing_window": {
        "start": "2026-11-10",
        "end": "2026-11-30"
      },
      "expected_yield_kg_ha": 4200,
      "fertilizer": {
        "nitrogen_kg_ha": 50,
        "phosphorus_kg_ha": 25,
        "potassium_kg_ha": 15
      }
    },
    {
      "rank": 2,
      "crop": "mustard",
      "score": 0.74,
      "reason": "Good soil potassium levels; moderate rainfall expected suits mustard.",
      "sowing_window": {
        "start": "2026-10-15",
        "end": "2026-11-10"
      },
      "expected_yield_kg_ha": 1600,
      "fertilizer": {
        "nitrogen_kg_ha": 40,
        "phosphorus_kg_ha": 20,
        "potassium_kg_ha": 10
      }
    },
    {
      "rank": 3,
      "crop": "chickpea",
      "score": 0.68,
      "reason": "Previous crop was rice (cereal) — legume rotation improves soil nitrogen fixation.",
      "sowing_window": {
        "start": "2026-10-20",
        "end": "2026-11-15"
      },
      "expected_yield_kg_ha": 1200,
      "fertilizer": {
        "nitrogen_kg_ha": 20,
        "phosphorus_kg_ha": 30,
        "potassium_kg_ha": 15
      }
    }
  ],
  "model_version": "rf-v1-20260301",
  "inference_ms": 145,
  "warnings": [],
  "timestamp": "2026-03-07T12:00:00Z"
}
```

---

## 7. Rotation Planner

### `GET /plots/{plot_id}/planner`
Get rotation plan for a plot.

**Query Params:** `year` (default: current year)

**Response (200):**
```json
{
  "plot_id": "uuid",
  "year": 2026,
  "rotations": [
    {
      "id": "uuid",
      "crop": "rice",
      "crop_family": "cereals",
      "season": "kharif",
      "start_date": "2026-06-15",
      "end_date": "2026-10-30",
      "fertilizer_json": {"N": 60, "P": 30, "K": 20},
      "status": "harvested"
    },
    {
      "id": "uuid",
      "crop": "wheat",
      "crop_family": "cereals",
      "season": "rabi",
      "start_date": "2026-11-15",
      "end_date": "2027-03-15",
      "fertilizer_json": {"N": 50, "P": 25, "K": 15},
      "status": "planned"
    }
  ]
}
```

---

### `PUT /plots/{plot_id}/rotation`
Update (replace) the rotation plan for a plot.

**Request:**
```json
{
  "rotations": [
    {
      "crop": "wheat",
      "season": "rabi",
      "start_date": "2026-11-15",
      "end_date": "2027-03-15",
      "fertilizer_json": {"N": 50, "P": 25, "K": 15}
    }
  ]
}
```

**Response (200):** Updated plan.

**Response (409 — Conflict):**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Rotation constraint violated",
    "details": [
      {
        "rule": "soil_rest_period",
        "message": "Same crop family (cereals) planted in consecutive seasons. Consider a legume rotation."
      }
    ]
  }
}
```

---

### `POST /plots/{plot_id}/rotation/validate`
Validate a proposed rotation without saving.

**Request:** Same as `PUT` body.

**Response (200):**
```json
{
  "valid": false,
  "violations": [
    {
      "rule": "soil_rest_period",
      "severity": "warning",
      "message": "Same crop family in consecutive seasons."
    }
  ]
}
```

---

## 8. Weather

### `GET /weather/{plot_id}/forecast`
Get 7-day weather forecast for a plot.

**Response (200):**
```json
{
  "plot_id": "uuid",
  "station_id": "IN_VAR_001",
  "forecast": [
    {
      "date": "2026-03-07",
      "temp_min": 18.5,
      "temp_max": 32.0,
      "rainfall_mm": 0.0,
      "humidity": 45,
      "condition": "sunny",
      "icon": "☀️"
    }
  ],
  "last_updated": "2026-03-07T06:00:00Z"
}
```

---

## 9. Market Prices

### `GET /market/prices`
Get latest market prices.

**Query Params:**
| Param | Type | Required | Example |
|-------|------|----------|---------|
| `crop` | string | yes | `wheat` |
| `district` | string | yes | `Varanasi` |
| `days` | int | no (default 7) | `30` |

**Response (200):**
```json
{
  "crop": "wheat",
  "district": "Varanasi",
  "prices": [
    {
      "date": "2026-03-06",
      "mandi": "Varanasi Mandi",
      "price_per_quintal": 2250.00
    }
  ],
  "trend": "rising",
  "trend_pct": 3.2
}
```

---

## 10. Notifications

### `GET /notifications`
List notifications for current user.

**Query Params:** `page`, `page_size`, `unread_only` (bool)

---

### `PUT /notifications/{id}/read`
Mark a notification as read.

---

### `GET /notifications/preferences`
Get notification preferences.

### `PUT /notifications/preferences`
Update notification preferences.

**Request:**
```json
{
  "push_enabled": true,
  "sms_enabled": true,
  "wa_enabled": false,
  "weather_alerts": true,
  "sowing_reminders": true,
  "market_alerts": true
}
```

---

## 11. Export

### `POST /plots/{plot_id}/export/pdf`
Generate and download rotation plan PDF.

**Response (202):**
```json
{
  "task_id": "uuid",
  "status": "processing",
  "estimated_seconds": 10
}
```

### `GET /export/status/{task_id}`
Check export task status.

**Response (200):**
```json
{
  "task_id": "uuid",
  "status": "completed",
  "download_url": "https://cdn.smartcrop.in/exports/uuid.pdf",
  "expires_at": "2026-03-08T12:00:00Z"
}
```

---

## 12. Admin (Role: admin / agronomist)

### `GET /admin/farmers`
List farmers (with filtering).

**Query Params:** `district`, `state`, `page`, `page_size`, `search` (name/phone)

---

### `GET /admin/farmers/{user_id}/plots`
Get all plots for a specific farmer (read-only).

---

### `POST /admin/recommendations/{reco_id}/note`
Add agronomist annotation to a recommendation.

**Request:**
```json
{
  "note": "Based on field visit, soil is more sandy than test suggests. Consider millet instead."
}
```

---

## 13. Health & System

### `GET /health` [public]
Health check.

**Response (200):**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "redis": "up",
    "queue": "up"
  }
}
```

---

## 14. Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| Auth (OTP send) | 5 req / phone / hour |
| Recommendation | 10 req / user / minute |
| General read | 100 req / user / minute |
| General write | 30 req / user / minute |
| Admin | 200 req / user / minute |
