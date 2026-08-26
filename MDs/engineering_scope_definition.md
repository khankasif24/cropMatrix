# Engineering Scope Definition — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Date:** 2026-03-07

---

## 1. Project Scope Summary

Build an intelligent crop advisory platform that delivers personalized crop recommendations, rotation planning, weather & market intelligence, and alert notifications to small and marginal farmers in India.

---

## 2. In-Scope (MVP)

### Frontend
| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Phone OTP authentication | Login/register with OTP |
| 2 | Onboarding flow | Profile + first plot registration (GPS + soil) |
| 3 | Crop rotation planner UI | Calendar grid, drag-drop, color-coded crop blocks |
| 4 | Plot management | List/map view, plot detail, soil health dashboard |
| 5 | Recommendation display | Top-3 crops with scores, reasons, sowing windows |
| 6 | 7-day weather forecast | Per-plot weather card |
| 7 | Market price snapshot | Price list + trend chart (7/14/30 day) |
| 8 | PDF export | Server-generated PDF of rotation plan |
| 9 | Notification center | In-app alert inbox |
| 10 | Responsive design | Mobile-first (360–412px) + desktop (1280px) |

### Backend
| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Auth service | OTP send/verify, JWT issue/refresh, RBAC |
| 2 | User & plot CRUD | Registration, profile, plots, soil tests |
| 3 | Recommendation API | ML-powered top-3 crop suggestion per plot |
| 4 | Planner API | Rotation CRUD, constraint validation |
| 5 | Weather ingestion | Scheduled fetch from OpenWeatherMap/IMD |
| 6 | Market price ingestion | Scheduled fetch from AGMARKNET |
| 7 | Notification engine | Rule-based triggers + dispatch (push, SMS) |
| 8 | Export service | PDF generation (async via queue) |
| 9 | Health & admin endpoints | Health check, farmer list (admin role) |

### ML / Data
| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Crop recommendation model | RandomForest / XGBoost, trained on labeled dataset |
| 2 | Feature engineering pipeline | Soil + weather + season → feature vector |
| 3 | Scoring engine | Predict + constraint penalties + bonuses → ranked output |
| 4 | Model registry | Version tracking, S3 artifact storage |

### Infrastructure
| # | Deliverable | Details |
|---|-------------|---------|
| 1 | Docker Compose local stack | Postgres, Redis, RabbitMQ, API, Web |
| 2 | CI/CD pipeline | GitHub Actions: lint, test, build, deploy |
| 3 | AWS deployment | ECS Fargate, RDS, S3, Elasticache, SQS |
| 4 | Database migrations | Alembic with upgrade/downgrade |

---

## 3. Out of Scope (MVP)

| # | Item | Reason |
|---|------|--------|
| 1 | Disease/pest detection via leaf images | Requires labeled image dataset + CV model |
| 2 | Satellite NDVI integration | Complex pipeline; planned for v1 |
| 3 | Multi-language voice guidance | Requires voice synthesis service |
| 4 | Bulk FPO planning across farms | Complex multi-tenant logic |
| 5 | Real-time IoT sensor integration | Hardware dependency |
| 6 | Offline-first mobile with sync | Complex sync logic; planned for v1 |
| 7 | Advanced market prediction (LSTM) | Requires extensive historical data |
| 8 | Payment / subscription system | Not needed for MVP |
| 9 | Multi-region deployment | Single AWS region for MVP |

---

## 4. Technical Boundaries

| Boundary | Decision |
|----------|----------|
| **Architecture** | Monolith-first (single FastAPI app) with logical service boundaries; extract to microservices post-MVP |
| **Mobile** | Flutter (single codebase for iOS/Android); web-first for SIH demo |
| **Auth** | Phone OTP only (no email/social login for MVP) |
| **Database** | Single PostgreSQL instance (PostGIS enabled) |
| **ML inference** | In-process (joblib model loaded at FastAPI startup); no separate model server |
| **File generation** | Server-side PDF only (no Excel/CSV export for MVP) |
| **Localization** | English + Hindi only |
| **Third-party APIs** | OpenWeatherMap (free tier) + AGMARKNET (public) |

---

## 5. Team Roles & Ownership

| Role | Responsibility | Scope |
|------|---------------|-------|
| **Frontend Dev** | React web app, responsive UI, planner grid, component library | `apps/web/`, `packages/ui/` |
| **Backend Dev** | FastAPI services, database, APIs, integrations | `apps/api/`, `services/` |
| **ML Engineer** | Model training, scoring engine, feature engineering | `apps/ml/`, `apps/api/app/ml/` |
| **Flutter Dev** | Mobile app (post-web MVP) | `apps/mobile/` |
| **DevOps** | Docker, CI/CD, AWS infra, monitoring | `infra/`, `.github/` |
| **Designer** | UI/UX design, Figma, design tokens | Figma → `packages/ui/` |

---

## 6. Dependencies & Risks

| Dependency | Risk | Mitigation |
|-----------|------|-----------|
| OpenWeatherMap API | Rate limits / downtime | Cache aggressively; fallback to IMD |
| AGMARKNET | Inconsistent data format | Parser + validation layer; manual data entry fallback |
| Labeled crop dataset | Quality / coverage | Start with Kaggle dataset; augment with government data |
| PostGIS | Additional setup | Use standard Docker image `postgis/postgis` |
| SMS / WhatsApp provider | Cost / deliverability | Budget estimation; use Firebase for push (free) |

---

## 7. Acceptance Gates

| Gate | Criteria | Owner |
|------|----------|-------|
| **Code Complete** | All MVP user stories implemented | Dev team |
| **QA Pass** | >90% test pass rate, 0 critical bugs | QA |
| **Performance** | API p95 < 2s, planner render < 100ms | Backend + Frontend |
| **Security** | OWASP top-10 review passed | DevOps |
| **Demo Ready** | End-to-end flow works on staging | Full team |
