# Tech Stack & MVP Technical Document

---

## 1. Overview & Principles

- Use **stable, well-known technologies** to deliver a robust MVP quickly.
- Prioritize **developer productivity** and managed services to reduce ops burden.
- Use modular microservices where helpful, but keep MVP straightforward (monolith or few services).

---

## 2. Suggested Stack (MVP)

### Frontend

| Tool | Purpose |
|---|---|
| **React (Web)** + TypeScript + Tailwind CSS | Fast styling + design tokens |
| **React Native** or **Flutter** | Cross-platform mobile *(Flutter recommended for consistent design tokens)* |
| **Storybook** | Component library |

### Backend

| Tool | Purpose |
|---|---|
| **Python + FastAPI** (async, lightweight) | Recommendation engine & API |
| **ML inference via FastAPI endpoints** | Or TensorFlow Serving / TorchServe for heavy workloads |

### Database & Storage

| Tool | Purpose |
|---|---|
| **PostgreSQL** | Relational data (users, plots, rotations) |
| **InfluxDB** *(optional)* or PostgreSQL timeseries extension | Sensor/time-series logs |
| **S3-compatible object storage** | Images, PDFs, models |

### Caching & Queue

| Tool | Purpose |
|---|---|
| **Redis** | Caching and session management |
| **RabbitMQ** or **AWS SQS** | Async tasks (PDF generation, batch prediction) |

### ML

| Tool | Purpose |
|---|---|
| **scikit-learn** (RandomForest / XGBoost) | Crop recommendation baseline |
| **TensorFlow / PyTorch** | CV (disease detection) |
| **Airflow** or **Prefect** | Scheduled training pipelines *(if needed)* |

### Hosting / Infrastructure

| Option | Services |
|---|---|
| **AWS** *(recommended)* | ECS/EKS, RDS (Postgres), S3, CloudFront, Elasticache (Redis) |
| **GCP** *(alternative)* | Cloud Run / GKE |
| **Azure** *(alternative)* | — |

### Monitoring / Observability

| Tool | Purpose |
|---|---|
| **Prometheus + Grafana** | Metrics |
| **ELK** or **AWS CloudWatch** | Logs |
| **Sentry** | Error tracking |

### CI/CD

| Tool | Purpose |
|---|---|
| **GitHub Actions** | Builds / tests / deploys |
| **Docker** + container registry | DockerHub or ECR |

---

## 3. Security & Compliance

- **OAuth2 / JWT** for auth; separate user roles.
- **TLS everywhere** (HTTPS).
- Encryption at rest for sensitive fields (soil lab results — optional).
- **Rate limiting** for APIs (Nginx / API Gateway).

---

## 4. Development & Release Plan (MVP)

| Sprint | Weeks | Focus |
|---|---|---|
| **Sprint 0** | 0–1 | Repo scaffolding, infra, dev environments, component library seed (reflect Dribbble layout) |
| **Sprint 1** | 1–2 | Core data model, user & plot onboarding, basic planner UI (static) |
| **Sprint 2** | 3 | Recommendation API (rule-based → ML integration) |
| **Sprint 3** | 4 | Weather/market ingestion, notifications |
| **Sprint 4** | 5 | Export, pilot testing, bug fixes |
| **Sprint 5** | 6 | Hardening & SIH packaging |

---

## 5. ML Model Choices & Evaluation

### Crop Recommendation

- **Baseline:** Rule-based (soil thresholds + season constraints)
- **Model:** RandomForest or XGBoost trained on labeled dataset (crop suitability by soil/season)
- **Features:** Location (agro-ecological zone), soil NPK, pH, rainfall, temp stats, previous crop
- **Evaluation:** Cross-validated accuracy, precision/recall per crop, confusion matrix, backtest on historical yields

### Market Prediction

- **ARIMA** for short-term
- **LSTM** if longer sequences available
- **Input:** Historical mandi prices, local supply signals

### Disease Detection

- **MobileNet / EfficientNet** finetuned on labeled leaf images
- **On-device inference** (TensorFlow Lite) for immediate feedback, or server-side for better accuracy

---

## 6. APIs (Examples)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users` | Create account |
| `POST` | `/api/plots` | Register plot (GeoJSON) |
| `GET` | `/api/plots/{id}/planner` | Get rotation plan |
| `PUT` | `/api/plots/{id}/rotation` | Update rotation |
| `POST` | `/api/recommend/crop` | Returns recommendations JSON |
| `GET` | `/api/market/prices?crop=wheat&district=XYZ` | Mandi prices |

### Recommendation Response Example

```json
{
  "recommendations": [
    {
      "crop": "wheat",
      "score": 0.81,
      "reason": "suitable pH and expected rainfall",
      "sowing_window": {
        "start": "2026-11-15",
        "end": "2026-11-30"
      }
    }
  ],
  "model_version": "rf-v1-20260301"
}
```

---

## 7. Data Pipeline (MVP)

```
Ingest
  └── Weather & market via scheduled jobs → raw_weather, raw_market

Preprocess
  └── Hourly batch or streaming (normalize, fill gaps)

Feature Store
  └── Computed features for model inference (soil aggregates, rolling rainfall)

Infer
  ├── Synchronous inference — single-plot requests
  └── Batch jobs — region-level planning
```

---

## 8. Costs & Scaling Notes

- Start on **single region**; use serverless (Cloud Run / ECS Fargate) for predictable scaling.
- Use **managed DB** (RDS) and **S3** to reduce ops overhead.
- **Cache** heavy assets & model artifacts; use CDN (CloudFront).
