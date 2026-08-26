# Product Requirements — Smart Crop Advisory (SIH25010)

**Version:** 1.0
**Date:** 2026-03-07
**Status:** Draft

---

## 1. Problem Statement

Small and marginal farmers in India lack access to timely, data-driven advice on:
- Which crop to sow in a given season on a specific plot.
- Optimal crop rotation sequences for long-term soil health.
- Real-time weather-based sowing/irrigation windows.
- Market price trends to maximize profit at harvest.

**SIH25010** aims to build an intelligent crop advisory platform that brings together soil science, weather data, market intelligence, and machine learning to deliver actionable, localized recommendations through a simple, mobile-first interface.

---

## 2. Product Vision

> *"Every farmer, regardless of literacy or connectivity, gets a personalized crop plan that maximizes yield and profit while preserving soil health."*

---

## 3. Goals & Success Metrics

### Primary Goals
| # | Goal |
|---|------|
| G1 | Help farmers choose crops and rotations that **maximize yield and profit** while conserving soil health. |
| G2 | Provide an intuitive seasonal/field-planning UI for **visualizing rotations** across plots. |
| G3 | Deliver **timely alerts** (weather, pest, market) so farmers can act before windows close. |
| G4 | Serve as a **decision-support tool** for extension officers, agronomists, and FPO managers. |

### Success Metrics (First 6 Months)

| Metric | Target |
|--------|--------|
| Active farmers on pilot | 1,000 |
| Users reporting "recommendation was useful" (survey) | ≥ 70% |
| Average time to get a recommendation | < 30 seconds |
| Model recommendation accuracy (historic backtest) | > 70% crop suitability |
| Message delivery reliability (push / SMS / WhatsApp) | 99.5% |
| Onboarding completion rate (1 plot registered) | ≥ 80% |

---

## 4. Target Users & Personas

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Smallholder Farmer** | Low digital literacy, mobile-first, 0.5–5 ha holdings. | Simple language, voice/SMS, quick answers. |
| **Extension Officer / Agronomist** | Field agent monitoring clusters of farmers; validates recommendations. | Dashboard view, bulk data, override capability. |
| **Co-op / FPO Manager** | Plans crop rotation across member farms; monitors market signals. | Multi-farm planning, aggregated reports, export. |
| **Admin / Data Scientist** | Manages models, data pipelines, and system health. | Model registry, retraining UI, observability. |

---

## 5. Functional Requirements

### 5.1 User Onboarding & Field Registration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | User can register via phone number (OTP-based auth). | P0 |
| FR-02 | User can add one or more farm plots with GPS location (auto-detect or manual pin). | P0 |
| FR-03 | Plot registration captures: area (hectares), irrigation type (rainfed/tube-well/canal), and optional GeoJSON polygon. | P0 |
| FR-04 | User can input soil lab data (N, P, K, pH) per plot, or skip with "I'll enter later". | P0 |
| FR-05 | App maps plot GPS to the nearest weather station automatically. | P0 |
| FR-06 | Onboarding must complete in < 5 minutes for 1 plot. | P0 |

### 5.2 Crop Recommendation Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-07 | System recommends top-3 crops per plot with confidence scores and human-readable reasons. | P0 |
| FR-08 | Recommendations factor in: soil (NPK, pH), season, historical weather, previous crop, and irrigation type. | P0 |
| FR-09 | Each recommendation includes a sowing window (start/end dates). | P0 |
| FR-10 | Recommendation API returns results in ≤ 2 seconds (p95). | P0 |
| FR-11 | System logs every recommendation (input features, output, model version) for auditability. | P1 |

### 5.3 Crop Rotation Planner

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-12 | Visual calendar/grid to plan crop sequences per plot (rows = plots, columns = months). | P0 |
| FR-13 | Crop blocks are drag-and-drop capable, color-coded by crop family. | P0 |
| FR-14 | Conflict detection: if rotation violates soil-rest/compatibility rules, highlight offending blocks with toast notification. | P1 |
| FR-15 | Undo / redo support for last 5 planner actions. | P1 |
| FR-16 | Planner state is persisted and synced to backend via optimistic UI update. | P0 |

### 5.4 Soil & Fertilizer Suggestion

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-17 | Display soil health status per plot (good / moderate / poor) based on latest test data. | P0 |
| FR-18 | Suggest fertilizer doses (N, P, K amounts) per crop per plot. | P0 |
| FR-19 | Show soil test history chart per plot. | P1 |

### 5.5 Weather Integration & Alerts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | Display 7-day localized weather forecast per plot. | P0 |
| FR-21 | Push/SMS/WhatsApp alerts for rule-based triggers (e.g., "rain next 2 days — delay irrigation"). | P0 |
| FR-22 | Alert rule engine supports configurable triggers (rain threshold, temperature extremes, humidity). | P1 |

### 5.6 Market Price Snapshot

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-23 | Show latest mandi prices for recommended crops, filtered by district. | P0 |
| FR-24 | Display 7–30 day price trend chart. | P0 |
| FR-25 | Price prediction (short-term ARIMA / LSTM) with confidence interval. | P2 |

### 5.7 Export & Share

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-26 | Export rotation plan as PDF preserving the planner visual layout. | P0 |
| FR-27 | Share plan via WhatsApp / SMS deep link. | P1 |

### 5.8 Future / v1 Features

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-28 | Disease/pest detection via leaf image upload (MobileNet / EfficientNet). | P2 |
| FR-29 | Satellite NDVI / remote sensing overlay on plot map. | P2 |
| FR-30 | Multi-language voice guidance (Hindi + regional). | P2 |
| FR-31 | Bulk rotation planning for FPOs across member farms. | P2 |

---

## 6. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-01 | **Performance** | Recommendation API response ≤ 2s (p95). |
| NFR-02 | **Availability** | System uptime ≥ 99.5%. |
| NFR-03 | **Data Retention** | Raw sensor/soil data retained 2 years; aggregated stats 7 years. |
| NFR-04 | **Security** | OAuth2 / JWT authentication with role-based access control. |
| NFR-05 | **Privacy** | GDPR-like compliance — users can request deletion/export of their data. |
| NFR-06 | **Scalability** | Horizontally scalable to 100K concurrent users at national scale. |
| NFR-07 | **Localization** | Support Hindi, English; extensible for regional languages. |
| NFR-08 | **Accessibility** | Minimum contrast ratio 4.5:1; screen reader support. |
| NFR-09 | **Offline** | Core planner view cached for offline access; sync when online. |
| NFR-10 | **Audit** | All recommendation and rotation changes logged with timestamps. |

---

## 7. Data Sources & Integrations

| Source | Provider | Integration Method | Frequency |
|--------|----------|-------------------|-----------|
| **Weather Forecast** | OpenWeatherMap / IMD | REST API | Hourly |
| **Market Prices** | AGMARKNET / local mandi APIs | REST / CSV scrape | Daily |
| **Soil Lab Data** | Manual entry / CSV upload | User input | Per test event |
| **Satellite Imagery** | Sentinel-2 (NDVI) | Batch API | Weekly (v1) |
| **SMS / WhatsApp** | Twilio / Gupshup | Webhook | Event-triggered |

---

## 8. Constraints & Assumptions

### Constraints
- MVP targets a single Indian state or district for pilot.
- Mobile network connectivity may be intermittent in rural areas.
- Soil data quality varies; system must handle missing/partial inputs.

### Assumptions
- Farmers have access to a smartphone with basic internet.
- Government/open-data APIs (IMD, AGMARKNET) remain available.
- An agronomist or extension officer assists with initial onboarding in low-literacy areas.

---

## 9. Acceptance Criteria (High-Level)

| # | Criterion |
|---|-----------|
| AC-01 | New user completes onboarding (account + 1 plot) in < 5 minutes. |
| AC-02 | Crop recommendation matches historical truth table for sample dataset (backend test). |
| AC-03 | Planner UI saves, loads, and exports plans as PDF preserving visual layout. |
| AC-04 | Weather alerts delivered within 60 seconds of trigger condition. |
| AC-05 | Mandi prices displayed are no more than 24 hours stale. |
| AC-06 | System handles 500 concurrent recommendation requests without degradation. |

---

## 10. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Low digital literacy among farmers | High | High | SMS/WhatsApp fallback, voice interface, field agent support. |
| Poor soil data quality | Medium | High | Accept ranges; validate inputs; offer soil-test kit partnerships. |
| Weather API mismatch or downtime | Medium | Medium | Use multiple data sources (IMD + OpenWeatherMap) with fallback. |
| Market API unavailability | Medium | Medium | Cache last-known prices; display "stale data" warning. |
| Model drift over seasons | Medium | Medium | Scheduled retraining pipeline; A/B model comparison. |

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **NPK** | Nitrogen, Phosphorus, Potassium — key soil nutrients. |
| **Mandi** | Agricultural marketplace in India. |
| **FPO** | Farmer Producer Organization. |
| **NDVI** | Normalized Difference Vegetation Index — satellite-derived plant health metric. |
| **AGMARKNET** | Agricultural Marketing Information Network (Government of India). |
| **SIH** | Smart India Hackathon. |
