# System Architecture — Smart Crop Advisory (SIH25010)

**Version:** 1.0
**Date:** 2026-03-07

---

## 1. Architecture Overview

The Smart Crop Advisory platform follows a **layered microservice architecture**, organized into:

1. **Client Layer** — Web (React) + Mobile (Flutter)
2. **API Gateway** — Authentication, rate-limiting, routing
3. **Service Layer** — Domain-specific microservices
4. **Data Layer** — Databases, caches, object storage
5. **ML Infrastructure** — Model registry, inference, retraining
6. **Observability** — Monitoring, logging, alerting

---

## 2. High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│          React Web (SPA)  ·  Flutter Mobile (iOS/Android)        │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼─────────────────────────────────────┐
│                         API GATEWAY                              │
│   ┌─────────────┐ ┌───────────────┐ ┌─────────────────────────┐ │
│   │ JWT / OAuth2 │ │ Rate Limiter  │ │ Request Router / LB     │ │
│   └─────────────┘ └───────────────┘ └─────────────────────────┘ │
└──┬──────────┬──────────┬──────────────┬──────────┬──────────────┘
   │          │          │              │          │
┌──▼──┐  ┌───▼───┐  ┌───▼────┐  ┌─────▼───┐  ┌───▼──────────────┐
│User │  │Planner│  │Recomm. │  │Weather  │  │Notification      │
│& Plot│  │Service│  │Service │  │& Market │  │Service           │
│Svc  │  │       │  │(ML)    │  │Ingestion│  │(Push/SMS/WA)     │
└──┬──┘  └───┬───┘  └───┬────┘  └────┬────┘  └───┬──────────────┘
   │         │          │             │            │
┌──▼─────────▼──────────▼─────────────▼────────────▼──────────────┐
│                       DATA & STORAGE LAYER                       │
│  ┌───────────┐ ┌───────┐ ┌───────┐ ┌──────────┐ ┌───────────┐  │
│  │ PostgreSQL│ │ Redis │ │  S3   │ │InfluxDB  │ │  RabbitMQ │  │
│  │ (primary) │ │(cache)│ │(files)│ │(tsdb-opt)│ │  (queue)  │  │
│  └───────────┘ └───────┘ └───────┘ └──────────┘ └───────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      ML INFRASTRUCTURE                           │
│  ┌───────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Model Registry│ │ Inference    │ │ Retraining Pipeline      │ │
│  │ (S3 + metadata│ │ Endpoints    │ │ (Airflow / Prefect)      │ │
│  │  in Postgres) │ │ (FastAPI)    │ │                          │ │
│  └───────────────┘ └──────────────┘ └──────────────────────────┘ │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                       OBSERVABILITY                              │
│  ┌──────────────┐ ┌─────────────┐ ┌────────┐ ┌───────────────┐  │
│  │ Prometheus   │ │ Grafana     │ │ Sentry │ │ ELK / CW Logs │  │
│  │ (metrics)    │ │ (dashboards)│ │(errors)│ │ (centralized) │  │
│  └──────────────┘ └─────────────┘ └────────┘ └───────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Service Breakdown

### 3.1 User & Plot Service

| Aspect | Details |
|--------|---------|
| **Responsibility** | User registration (OTP), profile CRUD, plot CRUD, soil test CRUD |
| **Tech** | Python + FastAPI |
| **Database** | PostgreSQL — `users`, `plots`, `soil_tests` tables |
| **Key Endpoints** | `POST /api/users`, `POST /api/plots`, `GET /api/plots/{id}`, `POST /api/soil-tests` |
| **Auth** | JWT issued on OTP verification; scoped to user_id |

### 3.2 Planner Service

| Aspect | Details |
|--------|---------|
| **Responsibility** | Rotation plan CRUD, constraint validation, conflict detection, undo stack |
| **Tech** | Python + FastAPI |
| **Database** | PostgreSQL — `rotations` table, `planner_history` (undo stack) |
| **Key Endpoints** | `GET /api/plots/{id}/planner`, `PUT /api/plots/{id}/rotation`, `POST /api/plots/{id}/rotation/validate` |
| **Integration** | Calls Recommendation Service for suggestion when a slot is empty |

### 3.3 Recommendation Service (ML)

| Aspect | Details |
|--------|---------|
| **Responsibility** | Crop recommendation, scoring, model inference, feature assembly |
| **Tech** | Python + FastAPI; scikit-learn / XGBoost model |
| **Database** | PostgreSQL — `recommendation_logs`; reads from Feature Store (Redis / computed tables) |
| **Key Endpoints** | `POST /api/recommend/crop` |
| **Model Serving** | Loaded in-process (pickle / joblib) for MVP; TorchServe / TF Serving for scale |
| **Caching** | Redis cache by (plot_id + date + soil_hash) with 5-min TTL |

### 3.4 Weather & Market Ingestion Service

| Aspect | Details |
|--------|---------|
| **Responsibility** | Fetch external weather and market price data; normalize and store |
| **Tech** | Python scheduled workers (cron / Airflow DAG) |
| **Database** | PostgreSQL / InfluxDB — `weather_observations`, `market_prices` |
| **External APIs** | OpenWeatherMap / IMD (weather), AGMARKNET (prices) |
| **Schedule** | Weather: hourly; Market: daily |

### 3.5 Notification Service

| Aspect | Details |
|--------|---------|
| **Responsibility** | Send alerts via push, SMS, WhatsApp based on rule triggers |
| **Tech** | Python + FastAPI + RabbitMQ consumer |
| **Providers** | Firebase Cloud Messaging (push), Twilio / Gupshup (SMS/WhatsApp) |
| **Trigger Sources** | Weather alert rules, sowing window reminders, market price thresholds |
| **SLA** | Alert delivered within 60 seconds of trigger |

### 3.6 Export Service

| Aspect | Details |
|--------|---------|
| **Responsibility** | Generate PDF exports of rotation plans |
| **Tech** | Node.js headless Chrome (Puppeteer) or Python wkhtmltopdf |
| **Storage** | Generated PDFs stored in S3; URL returned to client |
| **Queue** | PDF generation runs as async task via RabbitMQ |

---

## 4. Data Flow

### 4.1 Recommendation Flow (Synchronous)

```
1. Farmer taps "Get Recommendation" on plot detail
2. Client → POST /api/recommend/crop {plot_id, season}
3. API Gateway validates JWT → routes to Recommendation Service
4. Recommendation Service:
   a. Fetch plot data (soil, irrigation, location) from PostgreSQL
   b. Fetch weather features from Redis / Feature Store
   c. Assemble feature vector
   d. Run model.predict() → top-3 crops with scores
   e. Log to recommendation_logs
5. Return JSON → Client renders results
```

### 4.2 Planner Update Flow (Optimistic)

```
1. Farmer drags crop block to new slot
2. Client validates constraints locally (fail → revert with animation)
3. Client updates local state immediately (optimistic)
4. Client → PUT /api/plots/{id}/rotation {rotation_data}
5. Planner Service validates constraints server-side
6. If valid → persist to DB → return 200
7. If invalid → return 409 Conflict → Client reverts
```

### 4.3 Ingestion Flow (Background)

```
1. Scheduled job (every hour for weather, daily for market) wakes up
2. Fetch data from external APIs (OpenWeatherMap, AGMARKNET)
3. Normalize → upsert into weather_observations / market_prices
4. Compute derived features (rolling averages, anomaly flags)
5. Write to Feature Store (Redis / materialized views)
6. Check alert rules → if triggered → push to Notification queue
```

---

## 5. Deployment Topology (AWS)

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Region                          │
│                                                             │
│  ┌──────────────┐                                           │
│  │ CloudFront   │ ←── Static assets (React SPA)             │
│  │ (CDN)        │                                           │
│  └──────┬───────┘                                           │
│         │                                                   │
│  ┌──────▼───────┐     ┌──────────────────────────┐          │
│  │ ALB (HTTPS)  │────►│ ECS Fargate Cluster      │          │
│  └──────────────┘     │ ┌────────┐ ┌───────────┐ │          │
│                       │ │User Svc│ │Planner Svc│ │          │
│                       │ ├────────┤ ├───────────┤ │          │
│                       │ │Rec. Svc│ │Notif. Svc │ │          │
│                       │ ├────────┤ ├───────────┤ │          │
│                       │ │Ingest  │ │Export Svc  │ │          │
│                       │ └────────┘ └───────────┘ │          │
│                       └────────────┬─────────────┘          │
│                                    │                        │
│  ┌─────────────┐  ┌───────────┐  ┌▼────────────┐           │
│  │ Elasticache │  │ SQS /     │  │ RDS Postgres│           │
│  │ (Redis)     │  │ RabbitMQ  │  │ (Multi-AZ)  │           │
│  └─────────────┘  └───────────┘  └─────────────┘           │
│                                                             │
│  ┌─────────────┐  ┌──────────────────────────┐              │
│  │ S3 Buckets  │  │ CloudWatch Logs          │              │
│  │ (media,PDF, │  │ Prometheus + Grafana     │              │
│  │  models)    │  │ Sentry                   │              │
│  └─────────────┘  └──────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

| Component | AWS Service | Spec (MVP) |
|-----------|-------------|------------|
| Frontend Hosting | S3 + CloudFront | Static SPA |
| API Servers | ECS Fargate | 2 tasks × 0.5 vCPU / 1 GB RAM (auto-scale) |
| Database | RDS PostgreSQL 15 | db.t3.medium, Multi-AZ |
| Cache | Elasticache Redis | cache.t3.micro |
| Object Storage | S3 Standard | Models, PDFs, images |
| Queue | SQS Standard | PDF gen, notification dispatch |
| Secrets | AWS Secrets Manager | API keys, DB credentials |
| CI/CD | GitHub Actions → ECR → ECS | Auto-deploy on main push |

---

## 6. Security Architecture

### 6.1 Authentication & Authorization

```
┌─────────┐   OTP    ┌─────────────────┐  JWT    ┌────────────┐
│  Client  │────────►│  Auth Service    │────────►│ API Gateway│
│          │◄────────│ (verify OTP,     │         │(validate   │
│          │  JWT    │  issue JWT)      │         │ JWT, RBAC) │
└─────────┘         └─────────────────┘         └────────────┘
```

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | Phone OTP → JWT (access + refresh tokens) |
| **Authorization** | Role-based: `farmer`, `agronomist`, `fpo_manager`, `admin` |
| **Token Lifespan** | Access: 15 min; Refresh: 7 days |
| **Transport** | TLS 1.3 everywhere (HTTPS) |
| **Secrets** | AWS Secrets Manager; never in code or env vars |
| **Data at Rest** | RDS encryption; S3 SSE-S3 |
| **Rate Limiting** | 100 req/min per user; 10 req/min for recommendation endpoint |

### 6.2 Role-Based Access Control (RBAC)

| Resource | Farmer | Agronomist | FPO Manager | Admin |
|----------|--------|-----------|-------------|-------|
| Own plots | CRUD | Read (assigned region) | Read (members) | Full |
| Recommendations | Read own | Read + annotate | Read aggregated | Full |
| Rotations | CRUD own | Read + annotate | Read aggregated | Full |
| Market prices | Read | Read | Read | Full |
| User management | — | — | — | Full |
| Model registry | — | — | — | Full |

---

## 7. Scaling & Performance Patterns

| Pattern | Implementation |
|---------|---------------|
| **Horizontal Scaling** | Stateless services behind ALB; ECS auto-scaling (CPU > 60%) |
| **Caching** | Redis: recommendation results (5-min TTL), weather data (1-hour TTL), session tokens |
| **CDN** | CloudFront for static assets, exported PDFs |
| **Database Read Replicas** | RDS read replica for analytics/reporting queries (v1) |
| **Async Processing** | SQS / RabbitMQ for: PDF generation, bulk notifications, batch predictions |
| **Connection Pooling** | PgBouncer or SQLAlchemy pool for DB connections |
| **Model Inference** | In-process for MVP; TorchServe / Triton for GPU-accelerated inference at scale |

### Performance Targets

| Metric | Target |
|--------|--------|
| Recommendation API (p95) | ≤ 2 seconds |
| Planner read (p95) | ≤ 300 ms |
| PDF export | ≤ 10 seconds |
| Alert delivery | ≤ 60 seconds from trigger |
| UI planner re-render | ≤ 100 ms for 50 plots |

---

## 8. Inter-Service Communication

| Type | Protocol | Use Case |
|------|----------|----------|
| **Synchronous** | REST (HTTP/JSON) | Client → API → Service calls |
| **Asynchronous** | Message queue (SQS/RabbitMQ) | PDF generation, notification dispatch, batch ML jobs |
| **Event-Driven** | Event bus (SNS or custom) | Ingestion complete → trigger feature recompute |

### Service Dependency Map

```
Client
  └── API Gateway
        ├── User & Plot Service
        │     └── PostgreSQL
        ├── Planner Service
        │     ├── PostgreSQL
        │     └── Recommendation Service (optional call)
        ├── Recommendation Service
        │     ├── PostgreSQL (plot/soil data)
        │     ├── Redis (feature store / cache)
        │     └── Model artifacts (S3 / in-memory)
        ├── Weather & Market Ingestion
        │     ├── External APIs
        │     ├── PostgreSQL / InfluxDB
        │     └── Notification Service (event trigger)
        ├── Notification Service
        │     ├── RabbitMQ (consumer)
        │     ├── FCM / Twilio / Gupshup
        │     └── PostgreSQL (notification log)
        └── Export Service
              ├── RabbitMQ (consumer)
              ├── Puppeteer / wkhtmltopdf
              └── S3 (output)
```

---

## 9. Disaster Recovery & Backup

| Resource | Strategy | RPO / RTO |
|----------|----------|-----------|
| **PostgreSQL** | Daily automated snapshots + continuous WAL archiving | RPO: 5 min, RTO: 1 hour |
| **S3** | Versioning enabled; cross-region replication (v1) | RPO: 0, RTO: instant |
| **Redis** | Non-critical (cache); rebuild from DB | RPO: N/A, RTO: minutes |
| **Model Artifacts** | Versioned in S3; model registry tracks active version | RPO: 0, RTO: minutes |
| **Secrets** | AWS Secrets Manager with auto-rotation | — |

---

## 10. Observability & SLOs

### Service-Level Objectives

| SLO | Target |
|-----|--------|
| Availability | 99.5% monthly |
| API latency (p95, reads) | < 300 ms |
| Recommendation latency (p95) | < 2 s |
| Error rate (5xx) | < 0.5% |

### Dashboards (Grafana)

| Dashboard | Key Panels |
|-----------|-----------|
| **API Health** | Request rate, latency (p50/p95/p99), error rate by service |
| **Recommendation** | Inference latency, cache hit rate, model version distribution |
| **Ingestion** | Weather/market fetch success rate, data freshness |
| **Queue** | Depth, processing time, dead-letter count |
| **Business** | Active users, recommendations served, plots registered |

### Alerting Rules

| Alert | Condition | Channel |
|-------|-----------|---------|
| High error rate | 5xx rate > 1% for 5 min | PagerDuty / Slack |
| Slow recommendations | p95 > 3s for 10 min | Slack |
| Queue backlog | Depth > 1000 for 15 min | Slack |
| DB CPU | > 80% for 10 min | PagerDuty |
| External API failure | Weather/market fetch failure 3× consecutive | Slack |
