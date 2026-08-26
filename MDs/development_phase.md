# Development Phases — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Date:** 2026-03-07 | **Total Duration:** 8 Weeks

---

## Phase Overview

```
Week:  1        2        3        4        5        6        7        8
      ├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
      │ Sprint │ Sprint │ Sprint │ Sprint │ Sprint │ Sprint │ Sprint │
      │   0    │   1    │   1    │   2    │   3    │   4    │   5    │
      │ Setup  │ Core   │ Core   │ ML +   │ Integ. │ Beta   │ Polish │
      │        │ Data   │ Data   │ Planner│ + Notif│ Pilot  │ + Demo │
```

---

## Sprint 0 — Foundation (Week 1)

**Goal:** Dev infrastructure, repo scaffold, design system seed.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | Init monorepo (pnpm + Python) | DevOps | Repo structure as per `monorepo_structure.md` |
| 2 | Setup Docker Compose (Postgres, Redis, RabbitMQ) | DevOps | `docker-compose.yml` working |
| 3 | CI pipeline (lint + test on PR) | DevOps | `.github/workflows/ci.yml` |
| 4 | PostgreSQL schema + Alembic setup | Backend | All tables from `database_schema.md` created |
| 5 | FastAPI boilerplate (health endpoint, config, DB) | Backend | `GET /health` returning 200 |
| 6 | React + Vite + Tailwind scaffold | Frontend | Empty SPA with routing shell |
| 7 | Design tokens + component library seed | Frontend | `packages/ui/` with Button, Card, Modal in Storybook |
| 8 | Figma wireframes for planner + onboarding | Designer | Approved Figma artboards |
| 9 | Seed `crop_master` data | ML/Backend | 20+ crops with attributes populated |

**Exit Criteria:** `docker compose up` starts all services; CI passes on empty project; DB schema applied.

---

## Sprint 1 — Core Data & Onboarding (Weeks 2–3)

**Goal:** User auth, plot registration, soil tests, and basic planner UI.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | OTP auth (send/verify + JWT) | Backend | `POST /auth/otp/send`, `POST /auth/otp/verify` |
| 2 | User CRUD API | Backend | `GET/PUT /users/me` |
| 3 | Plot CRUD + GPS → weather station mapping | Backend | `POST/GET /plots`, background job |
| 4 | Soil test CRUD | Backend | `POST/GET /plots/{id}/soil-tests` |
| 5 | Login + onboarding screens | Frontend | OTP flow, profile form, add-plot map |
| 6 | Plot list/map view + detail page | Frontend | Fields tab with plot cards |
| 7 | Soil health dashboard (NPK chart, pH) | Frontend | Per-plot soil card |
| 8 | Planner grid (static, read-only) | Frontend | Calendar grid rendering rotations |
| 9 | API client setup (Axios + JWT interceptor) | Frontend | `services/api.ts` |
| 10 | Unit tests for auth + plots | Backend | pytest tests passing |

**Exit Criteria:** New user can register, add a plot with soil data, and see the planner grid (empty).

---

## Sprint 2 — Recommendation Engine & Planner (Week 4)

**Goal:** ML-powered crop suggestions and interactive planner.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | Feature engineering pipeline | ML | `feature_engineer.py` with all 11 features |
| 2 | Train crop recommendation model | ML | RandomForest model saved to S3 |
| 3 | Scoring engine (predict + penalties + bonuses) | ML/Backend | `scoring_engine.py` |
| 4 | Recommendation API | Backend | `POST /api/recommend/crop` |
| 5 | Recommendation caching (Redis) | Backend | Cache by plot+season+soil_hash |
| 6 | Planner drag-and-drop | Frontend | Crop blocks draggable, snapping |
| 7 | Constraint validation + conflict toast | Frontend/Backend | `POST /plots/{id}/rotation/validate` |
| 8 | Recommendation UI (top-3 + detail modal) | Frontend | Recommendation cards + modal |
| 9 | "Add to Planner" from recommendation | Frontend | Crop block created in planner |
| 10 | Fertilizer suggestion display | Frontend | Per-crop fertilizer card |

**Exit Criteria:** Farmer gets top-3 recommendations; can drag crops in planner; conflicts detected.

---

## Sprint 3 — Integrations (Week 5)

**Goal:** Weather, market data, notifications, and export.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | Weather ingestion worker | Backend | Hourly fetch from OpenWeatherMap |
| 2 | Weather forecast API + UI | Backend/Frontend | `GET /weather/{plot_id}/forecast`, weather card |
| 3 | Market price ingestion worker | Backend | Daily fetch from AGMARKNET |
| 4 | Market price API + trend chart | Backend/Frontend | `GET /market/prices`, PriceTrendChart |
| 5 | Notification rule engine | Backend | Alert triggers for weather, sowing |
| 6 | Push notification (FCM) | Backend | Firebase integration |
| 7 | SMS notification (Twilio/Gupshup) | Backend | SMS dispatch worker |
| 8 | Notification preferences UI | Frontend | Settings → toggles |
| 9 | Notification center inbox | Frontend | Bell icon → notification list |
| 10 | PDF export (async) | Backend | `POST /plots/{id}/export/pdf`, download |

**Exit Criteria:** Weather + market data flowing; alerts delivered; PDF downloads working.

---

## Sprint 4 — Beta Pilot (Week 6)

**Goal:** Deploy to staging; pilot with 50 farmers; collect feedback.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | Deploy to AWS staging | DevOps | All services running on ECS Fargate |
| 2 | Staging environment config | DevOps | RDS, S3, Elasticache provisioned |
| 3 | Monitoring setup (Prometheus + Grafana) | DevOps | API health dashboard |
| 4 | Error tracking (Sentry) | DevOps | Sentry project configured |
| 5 | Seed production-like data | Backend | 20 crops, 5 districts, sample weather/market |
| 6 | Recruit 50 pilot farmers | Product | Farmers using the app |
| 7 | Collect feedback (in-app survey) | Product | Survey responses analyzed |
| 8 | Bug triage & fix | Full team | Critical bugs resolved |

**Exit Criteria:** 50 farmers actively using staging; feedback collected; no critical bugs.

---

## Sprint 5 — Polish & SIH Demo (Weeks 7–8)

**Goal:** Iterate on feedback; harden; prepare SIH submission.

| # | Task | Owner | Deliverable |
|---|------|-------|------------|
| 1 | UI/UX improvements from feedback | Frontend | Updated designs applied |
| 2 | Algorithm tuning (retrain with pilot data) | ML | Improved model accuracy |
| 3 | Performance optimization | Backend | API latency targets met |
| 4 | Hindi localization | Frontend | All UI strings translated |
| 5 | Accessibility audit | Frontend | WCAG 2.1 AA compliance |
| 6 | Security hardening | DevOps | Rate limiting, input sanitization, HTTPS |
| 7 | Production deployment | DevOps | Main branch → production |
| 8 | Demo preparation | Full team | Demo script, presentation deck, video |
| 9 | Documentation finalization | Full team | All docs updated & reviewed |
| 10 | SIH submission package | Full team | Code repo, docs, demo video, poster |

**Exit Criteria:** Production-ready app; SIH submission complete; demo rehearsed.

---

## Key Milestones

| Date | Milestone |
|------|-----------|
| End of Week 1 | Infrastructure ready, CI green |
| End of Week 3 | Core onboarding + planner working |
| End of Week 4 | ML recommendations live |
| End of Week 5 | Full feature set integrated |
| End of Week 6 | Beta pilot feedback collected |
| End of Week 8 | **SIH demo-ready** |

---

## Risk Mitigation per Phase

| Phase | Risk | Mitigation |
|-------|------|-----------|
| Sprint 0 | Infra delays | Pre-configured Docker images; documented setup |
| Sprint 1 | Auth complexity | Use existing OTP libraries (pyotp) |
| Sprint 2 | Low model accuracy | Start with rule-based fallback; iterate |
| Sprint 3 | API rate limits | Aggressive caching; batch requests |
| Sprint 4 | Low pilot adoption | Extension officer assists onboarding |
| Sprint 5 | Scope creep | Strict feature freeze after Sprint 3 |
