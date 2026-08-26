# Monorepo Structure — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Package Manager:** pnpm (workspace) + pip (Python)

---

## Root Layout

```
smart-crop-advisory/
├── .github/workflows/          # CI/CD (ci.yml, deploy-staging.yml, deploy-prod.yml, ml-pipeline.yml)
├── apps/
│   ├── web/                    # React + TypeScript + Tailwind SPA
│   ├── mobile/                 # Flutter Mobile App (iOS/Android)
│   ├── api/                    # FastAPI Backend (Python)
│   └── ml/                     # ML training scripts & notebooks
├── packages/
│   ├── ui/                     # Shared React component library (Storybook)
│   ├── types/                  # Shared TypeScript types / API contracts
│   ├── utils/                  # Common utilities
│   └── config/                 # Shared ESLint, Prettier, TSConfig
├── services/
│   ├── notification-worker/    # Notification dispatch worker
│   ├── ingestion-worker/       # Weather & market data ingestion
│   └── export-worker/          # PDF export worker
├── infra/
│   ├── terraform/              # AWS IaC (RDS, ECS, S3, etc.)
│   ├── docker/                 # Dockerfiles per service
│   └── k8s/                    # Kubernetes manifests (optional)
├── docs/                       # All project documentation (.md files)
├── model scripts/              # Existing ML scripts
├── scripts/                    # Dev tooling (setup-dev, seed-db, run-all)
├── data/                       # Sample datasets & fixtures
├── docker-compose.yml          # Local dev stack
├── pnpm-workspace.yaml
├── package.json
├── pyproject.toml
└── README.md
```

---

## apps/web/ — React Web App

```
apps/web/src/
├── main.tsx, App.tsx
├── routes/                     # LoginPage, OnboardingPage, PlannerPage, FieldsPage, PlotDetailPage, MarketPage, ProfilePage
├── components/
│   ├── Planner/                # PlannerGrid, CropBlock, PlannerToolbar, ConflictToast
│   ├── Plot/                   # PlotMap, PlotCard, SoilHealthCard
│   ├── Market/                 # PriceList, PriceTrendChart
│   ├── Weather/                # WeatherForecast
│   ├── Layout/                 # BottomNav, Header, PageContainer
│   └── common/                 # Button, Modal, Toast, Card, Loader
├── hooks/                      # useAuth, usePlots, usePlanner, useRecommendation, useWeather
├── services/                   # api.ts (Axios+JWT), authService, plotService, recommendService, etc.
├── store/                      # Zustand stores: authStore, plotStore, plannerStore
├── i18n/                       # en.json, hi.json
├── styles/                     # index.css (design tokens), planner.css
└── utils/                      # formatDate, validators, constants
```

---

## apps/api/ — FastAPI Backend

```
apps/api/app/
├── main.py                     # FastAPI app factory
├── config.py                   # pydantic-settings
├── database.py                 # SQLAlchemy engine & session
├── dependencies.py             # Auth & DB dependency injection
├── models/                     # SQLAlchemy ORM: user, plot, soil_test, rotation, recommendation_log, weather, market_price, notification, audit_log
├── schemas/                    # Pydantic schemas: auth, user, plot, soil_test, rotation, recommendation, weather, market, notification
├── routers/                    # Route handlers: auth, users, plots, soil_tests, recommendations, planner, weather, market, notifications, export, admin, health
├── services/                   # Business logic: auth, plot, recommendation, planner, weather, market, notification, export
├── ml/                         # model_loader, feature_engineer, scoring_engine
├── workers/                    # pdf_worker, notification_worker, ingestion_worker
├── utils/                      # security (JWT), geospatial, validators
└── migrations/                 # Alembic migrations
```

---

## apps/mobile/ — Flutter App

```
apps/mobile/lib/
├── main.dart, app.dart
├── config/                     # routes, theme, constants
├── models/                     # Dart data models
├── screens/                    # login, onboarding, planner, fields, plot_detail, market, profile
├── widgets/                    # Reusable widgets
├── services/                   # API client
├── providers/                  # Riverpod / Provider state management
└── l10n/                       # app_en.arb, app_hi.arb
```

---

## apps/ml/ — ML Training

```
apps/ml/
├── notebooks/                  # EDA & model comparison Jupyter notebooks
├── training/                   # train_crop_model.py, evaluate_model.py, export_model.py
├── configs/                    # model_config.yaml (hyperparams, feature list)
├── data/                       # Training data (gitignored, use DVC)
└── models/                     # Trained outputs (gitignored)
```

---

## Docker Compose (Local Dev)

| Service | Image | Port |
|---------|-------|------|
| `postgres` | `postgis/postgis:15-3.3` | 5432 |
| `redis` | `redis:7-alpine` | 6379 |
| `rabbitmq` | `rabbitmq:3-management` | 5672, 15672 |
| `api` | Custom (api.Dockerfile) | 8000 |
| `web` | Custom (web.Dockerfile) | 3000 |

---

## Root Scripts

| Script | Command |
|--------|---------|
| `dev:web` | `pnpm --filter web dev` |
| `dev:api` | `uvicorn app.main:app --reload --port 8000` |
| `test:api` | `pytest` |
| `storybook` | `pnpm --filter ui storybook` |
| `docker:up` | `docker compose up -d` |
| `db:migrate` | `alembic upgrade head` |
| `db:seed` | `bash scripts/seed-db.sh` |

---

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|-----------|
| `main` | Production-ready | Production |
| `develop` | Integration | Staging |
| `feature/*` | Feature development | PR to develop |
| `hotfix/*` | Critical fixes | PR to main + develop |
