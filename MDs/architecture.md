# Architecture — System & Deployment Blueprint

---

## 1. High-Level Components

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT APPS                       │
│              Web (React)  ·  Mobile (Flutter)            │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                     API GATEWAY                          │
│         Authentication · Rate-limiting · Routing         │
└──┬──────────┬──────────┬──────────────┬──────────────────┘
   │          │          │              │
┌──▼──┐  ┌───▼───┐  ┌───▼────┐  ┌─────▼──────────────────┐
│User │  │Planner│  │Recomm. │  │Market & Weather        │
│&Plot│  │Service│  │Service │  │Ingestion Service       │
│Svc  │  │       │  │(ML)    │  │                        │
└──┬──┘  └───┬───┘  └───┬────┘  └─────┬──────────────────┘
   │          │          │              │
┌──▼──────────▼──────────▼──────────────▼──────────────────┐
│                   DATA & STORAGE LAYER                   │
│   Postgres  ·  S3  ·  Redis  ·  Time-series / Logs      │
└──────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                     ML INFRASTRUCTURE                    │
│       Model Registry · Inference Endpoints · Retraining  │
└──────────────────────────────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│                    OBSERVABILITY                         │
│           Monitoring · Logging · Error Tracking          │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

1. **Farmer adds plot** (client) → `POST /api/plots` → Postgres store.
2. Background job maps **plot GPS → nearest weather station**.
3. Farmer requests recommendation → Frontend calls `POST /api/recommend/crop`.
4. API Gateway routes to **Recommendation Service** → fetch features from Feature Store → run model → return JSON.
5. User drags crop block in planner → Frontend sends `PUT /api/plots/{id}/rotation` → **Planner Service** validates rules (soil-rest, irrigation) → persists change → triggers background recalculation (if needed).
6. **Scheduled ingestion** pulls weather & market; features updated and stored for model retraining.

---

## 3. Deployment Topology (AWS Example)

| Layer | Service |
|---|---|
| **Frontend** | CloudFront → S3 (static SPA) or Cloud Run |
| **API** | ECS Fargate / EKS cluster with autoscaling |
| **Database** | RDS Postgres (multi-AZ) |
| **Object Storage** | S3 |
| **Cache** | Elasticache (Redis) |
| **Queue** | SQS for long-running tasks |
| **Model Storage** | S3 + ECR for containerized model server |
| **CI/CD** | GitHub Actions → ECR → ECS/Fargate |

---

## 4. Scaling & Performance Patterns

| Pattern | Description |
|---|---|
| **Stateless app servers** | Scale horizontally behind a load balancer |
| **Caching** | Cache recommendations for identical requests (plot + date) with short TTL to reduce compute |
| **Batching** | Batch predictions for region-level operations |
| **CDN** | Serve static assets and exported PDFs via CloudFront |

---

## 5. Data Model (ER Summary)

### Tables

| Table | Key Columns |
|---|---|
| `users` | `id`, `name`, `phone`, `language_pref` |
| `plots` | `id`, `user_id`, `geojson`, `area`, `irrigation_type`, `soil_summary` |
| `soil_tests` | `id`, `plot_id`, `n`, `p`, `k`, `ph`, `test_date` |
| `rotations` | `id`, `plot_id`, `crop`, `start_date`, `end_date`, `fertilizer_json` |
| `weather_observations` | `station_id`, `date`, `rainfall`, `temp`, `humidity` |
| `market_prices` | `crop`, `mandi`, `date`, `price` |
| `recommendation_logs` | `plot_id`, `input_features`, `result_json`, `model_version`, `ts` |

---

## 6. Security & Privacy

- **Role-based permissions:** farmer (own plots only) · agronomist (assigned regions)
- Hash + salt passwords; support **OTP** for phone-based auth.
- **Audit logs** for critical operations (rotation changes, data exports).

---

## 7. Backup & Disaster Recovery

| Resource | Strategy |
|---|---|
| **Postgres** | Daily snapshots + WAL archiving |
| **S3** | Versioning for exported PDFs and model artifacts |
| **Multi-region** | Read replicas if expanding to national scale |

---

## 8. Observability & SLOs

| Metric | Target |
|---|---|
| API latency (p95, read endpoints) | < 300ms |
| Availability | 99.5% |

### Key Dashboards
- API latency
- Recommendation errors
- Queue depth
- Active users

---

## 9. Sequence Diagram

```
User (frontend)         API Gateway        Planner Service     Feature Store     Recommendation Svc     Model Server
      │                      │                    │                  │                    │                    │
      │── GET /planner ──────►│                    │                  │                    │                    │
      │                      │── read rotations ──►│                  │                    │                    │
      │                      │                    │── request ───────►│                    │                    │
      │                      │                    │   features        │                    │                    │
      │                      │                    │◄── features ──────│                    │                    │
      │                      │                    │── suggest? ───────────────────────────►│                    │
      │                      │                    │                   │                    │── inference ───────►│
      │                      │                    │                   │                    │◄── result ─────────│
      │                      │                    │◄── recommendation ─────────────────────│                    │
      │◄── render ───────────│◄── response ───────│                   │                    │                    │
```
