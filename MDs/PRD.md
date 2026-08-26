# Product Requirements Document (PRD) — Smart Crop Advisory
## Crop Rotation Planner UI

**Version:** 1.0  
## **Author:** ANKUR PRATAP SINGH
**Reference Design:** [Crop Rotation Planner — Dribbble (Tanguy Desurmont)](https://dribbble.com/shots/24651371-Crop-Rotation-Planner)
---

## 1. Executive Summary

Build a **Smart Crop Advisory** product for small and marginal farmers that uses a modern dashboard and crop-rotation planning UX (inspired by the referenced Dribbble layout) to deliver:

- Crop recommendations
- Sowing windows
- Irrigation suggestions
- Soil & fertilizer advice
- Market predictions

The MVP targets **quick on-field decisions** and **simple visual planning** for rotational cropping.

---

## 2. Goals & Success Metrics

### Primary Goals

- Help farmers choose crops and rotations that **maximize yield and profit** while conserving soil health.
- Provide an intuitive seasonal/field planning UI for **visualizing rotations** across plots.

### Success Metrics *(First 6 Months)*

| Metric | Target |
|---|---|
| Active farmers on pilot | 1,000 |
| Users reporting "recommendation was useful" (survey) | ≥ 70% |
| Average time to get recommendation | < 30 seconds |
| Model recommendation accuracy (historic backtest) | > 70% crop suitability |
| Message delivery reliability (notifications, SMS/WhatsApp) | 99.5% |

---

## 3. Target Users & Personas

| Persona | Description |
|---|---|
| **Smallholder Farmer** | Low digital literacy, mobile-first, wants simple instructions (local language and voice). |
| **Extension Officer / Agronomist** | Uses dashboard to monitor clusters of farmers and validate recommendations. |
| **Co-op Manager / FPO** | Plans crop rotation across member farms and monitors market signals. |

---

## 4. Key Features

### MVP — Must Have

- **User Onboarding & Field Registration**
  - Register farm plot(s) with location (GPS), area, and irrigation type.

- **Crop Recommendation Engine (Basic)**
  - Recommend 2–3 best crops per plot based on soil (NPK, pH), season, and weather forecast.

- **Crop Rotation Planner UI**
  - Visual calendar/grid to plan crop sequences per plot (desktop & mobile), using the Dribbble layout patterns for clarity.

- **Soil & Fertilizer Suggestion**
  - Soil health status and fertilizer dose suggestions.

- **7-Day Weather Integration & Alerts**
  - Localized weather forecasts + sowing/irrigation alerts.

- **Market Price Snapshot**
  - Latest mandi price & simple price trend (7–30 days).

- **Export / Share Plan**
  - Download or share plan (PDF/WhatsApp).

### v1 — Nice to Have

- Disease/pest detection via leaf images.
- Satellite NDVI / remote sensing integration.
- Multi-language voice guidance (Hindi + regional languages).
- Bulk planning for FPOs.

---

## 5. User Stories

1. As a **farmer**, I want the app to tell me which crop to sow next on my 0.5 ha field, so I can maximize profit.
2. As an **agronomist**, I want to visualize crop rotations for 10 plots in a season to advise farmers on soil recovery.
3. As an **FPO manager**, I want to see predicted market price trends to schedule harvest/sell decisions.

---

## 6. Functional Requirements

| ID | Requirement |
|---|---|
| **FR1** | App must collect plot GPS coordinates and map them to nearest weather station. |
| **FR2** | System must accept soil lab inputs (N, P, K, pH) and store them per plot. |
| **FR3** | Crop recommendation endpoint returns top-3 crops with confidence scores and reasons. |
| **FR4** | Rotation planner UI must allow drag/drop of crop blocks across calendar lanes (mobile-friendly). |
| **FR5** | Export to PDF with the visual layout matching the planner UI. |
| **FR6** | Notification system (push/SMS/WhatsApp) must support rule-based triggers (e.g., *"rain next 2 days — delay irrigation"*). |

---

## 7. Non-Functional Requirements (NFR)

| ID | Requirement |
|---|---|
| **NFR1** | Response times for recommendation API ≤ 2s (95th percentile). |
| **NFR2** | System availability 99.5% (MVP). |
| **NFR3** | Data retention: raw sensor/soil data retained 2 years; aggregated stats retained 7 years. |
| **NFR4** | Secure authentication and role-based access (farmers / agronomists / admins). |
| **NFR5** | GDPR-like privacy — farmers can request deletion/export of their data. |

---

## 8. Data & Integrations

| Source | Details |
|---|---|
| **Weather API** | OpenWeatherMap / IMD (if available) |
| **Market Prices** | AGMARKNET or local mandi APIs |
| **Soil Labs** | CSV/manual entry; later integrate common lab vendors |
| **Satellite (Optional)** | Sentinel-2 / NDVI services for green cover metrics |

---

## 9. Acceptance Criteria

- Onboarding completes in **< 5 minutes** for a new user (including 1 plot).
- Crop recommendation aligns with historical truth table for a sample dataset (backend test).
- Planner UI correctly saves, loads, and exports plans in PDF preserving visuals.

---

## 10. Roadmap — 8-Week MVP

| Week | Milestone |
|---|---|
| **Week 1** | Finalize data sources, wireframes, user flows (use Dribbble layout as base). |
| **Week 2–3** | Backend & data ingestion (weather/market); basic ML model. |
| **Week 4** | Frontend UIs (planner, onboarding). |
| **Week 5** | Integrate notifications, export. |
| **Week 6** | Beta pilot with 50 farmers, collect feedback. |
| **Week 7** | Iterate on UI/algorithms. |
| **Week 8** | Prepare demo & SIH deliverables. |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Low digital literacy | SMS/WhatsApp & voice interface |
| Poor soil data quality | Accept ranges; offer soil test kit partnerships |
| Weather API mismatch | Use multiple data sources and fallback |

---

## 12. Appendices

- Wireframe specs
- Sample API contract → see `system_design.md`
- Dataset checklist
