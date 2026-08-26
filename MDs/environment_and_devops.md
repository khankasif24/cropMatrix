# Environment & DevOps — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Date:** 2026-03-07

---

## 1. Environment Overview

| Environment | Purpose | Branch | URL |
|-------------|---------|--------|-----|
| **Local** | Development & debugging | `feature/*` | `localhost:3000` (web), `localhost:8000` (API) |
| **Staging** | Integration testing, beta pilot | `develop` | `staging.smartcrop.in` |
| **Production** | Live users | `main` | `app.smartcrop.in` |

---

## 2. Local Development Setup

### Prerequisites
| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 LTS | Frontend build |
| pnpm | 9+ | Package manager |
| Python | 3.11+ | Backend |
| Docker Desktop | Latest | Services (Postgres, Redis, RabbitMQ) |
| Flutter | 3.x | Mobile app (optional) |

### Quick Start
```bash
# 1. Clone & install
git clone git@github.com:team/smart-crop-advisory.git
cd smart-crop-advisory
pnpm install                          # Frontend deps
cd apps/api && pip install -r requirements.txt  # Backend deps

# 2. Start infrastructure
docker compose up -d                  # Postgres, Redis, RabbitMQ

# 3. Apply DB migrations
cd apps/api && alembic upgrade head

# 4. Seed sample data
bash scripts/seed-db.sh

# 5. Start services
pnpm dev:web                          # React app → localhost:3000
cd apps/api && uvicorn app.main:app --reload --port 8000
```

### Environment Variables (`.env.example`)
```env
# Database
DATABASE_URL=postgresql://dev:devpass@localhost:5432/smartcrop

# Redis
REDIS_URL=redis://localhost:6379/0

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Auth
JWT_SECRET_KEY=dev-secret-key-change-in-prod
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# OTP
OTP_EXPIRY_SECONDS=300
SMS_PROVIDER=mock  # mock | twilio | gupshup

# External APIs
OPENWEATHERMAP_API_KEY=your-key
AGMARKNET_BASE_URL=https://agmarknet.gov.in/api

# ML
MODEL_PATH=apps/api/app/ml/models/crop_model_v1.joblib

# AWS (staging/prod only)
AWS_REGION=ap-south-1
S3_BUCKET=smartcrop-assets
```

---

## 3. Docker Configuration

### Docker Compose (Local)
| Service | Image | Ports | Volumes |
|---------|-------|-------|---------|
| `postgres` | `postgis/postgis:15-3.3` | 5432 | Named volume `pgdata` |
| `redis` | `redis:7-alpine` | 6379 | — |
| `rabbitmq` | `rabbitmq:3-management` | 5672, 15672 | — |

### Dockerfiles
| Service | Base Image | Build |
|---------|------------|-------|
| API | `python:3.11-slim` | Multi-stage: deps → app |
| Web | `node:20-alpine` → `nginx:alpine` | Build SPA → serve static |
| Workers | `python:3.11-slim` | Same as API + worker entrypoint |

---

## 4. CI/CD Pipeline (GitHub Actions)

### `ci.yml` — On Pull Request
```
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Lint   │──►│  Test    │──►│  Build   │──►│  Report  │
│(ESLint, │   │(pytest,  │   │(Docker   │   │(coverage,│
│ ruff)   │   │ vitest)  │   │ build)   │   │ summary) │
└─────────┘   └──────────┘   └──────────┘   └──────────┘
```

### `deploy-staging.yml` — On merge to `develop`
```
┌─────────┐   ┌───────────┐   ┌───────────┐   ┌───────────┐
│  Build  │──►│ Push to   │──►│ Deploy to │──►│ Smoke     │
│ Docker  │   │ ECR       │   │ ECS (stg) │   │ Tests     │
└─────────┘   └───────────┘   └───────────┘   └───────────┘
```

### `deploy-prod.yml` — On merge to `main`
```
Same as staging + manual approval gate before deploy
```

### `ml-pipeline.yml` — Manual trigger
```
Train model → Evaluate → Upload to S3 → Update model registry
```

---

## 5. AWS Infrastructure (Terraform)

### Resources
| Resource | Service | Config |
|----------|---------|--------|
| VPC | VPC + subnets | 2 AZs, public + private subnets |
| Database | RDS PostgreSQL 15 | `db.t3.medium`, Multi-AZ, encrypted |
| Cache | ElastiCache Redis | `cache.t3.micro` |
| Compute | ECS Fargate | 2 tasks per service, auto-scale on CPU |
| Storage | S3 | 3 buckets: assets, exports, models |
| CDN | CloudFront | Frontend SPA + exported PDFs |
| Queue | SQS Standard | PDF gen, notifications |
| Secrets | Secrets Manager | DB creds, API keys, JWT secret |
| Load Balancer | ALB | HTTPS termination, path-based routing |
| DNS | Route53 | `smartcrop.in` domain |
| SSL | ACM | Wildcard cert `*.smartcrop.in` |

### Terraform Layout
```
infra/terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── vpc/
│   ├── rds/
│   ├── ecs/
│   ├── s3/
│   ├── redis/
│   ├── sqs/
│   └── monitoring/
├── environments/
│   ├── staging.tfvars
│   └── prod.tfvars
└── backend.tf              # S3 backend for state
```

---

## 6. Monitoring & Observability

### Stack
| Tool | Purpose | Integration |
|------|---------|------------|
| **Prometheus** | Metrics collection | FastAPI metrics middleware |
| **Grafana** | Dashboards | Connected to Prometheus + CloudWatch |
| **Sentry** | Error tracking | Python SDK + React SDK |
| **CloudWatch Logs** | Centralized logging | ECS container logs |
| **AWS X-Ray** (optional) | Distributed tracing | FastAPI middleware |

### Key Dashboards
| Dashboard | Panels |
|-----------|--------|
| API Health | Request rate, latency (p50/p95/p99), error rate |
| Recommendation | Inference latency, cache hit rate, model version |
| Infrastructure | CPU/memory usage, DB connections, queue depth |
| Business | Active users, recommendations/day, plots registered |

### Alerting
| Alert | Condition | Channel |
|-------|-----------|---------|
| High error rate | 5xx > 1% for 5 min | Slack + PagerDuty |
| DB CPU | > 80% for 10 min | PagerDuty |
| Queue backlog | Depth > 500 for 15 min | Slack |
| External API failure | 3 consecutive failures | Slack |

---

## 7. Security Practices

| Practice | Implementation |
|----------|---------------|
| Secrets management | AWS Secrets Manager; never in code or env files |
| HTTPS everywhere | ACM certs + ALB termination |
| Rate limiting | API Gateway / Nginx: per-user limits |
| Input validation | Pydantic schemas on all endpoints |
| Dependency scanning | Dependabot + Snyk in CI |
| Container scanning | Trivy scan in Docker build step |
| RBAC | JWT claims with role field; middleware check |
| Audit logging | All mutations logged to `audit_logs` table |

---

## 8. Database Operations

| Operation | Tool / Process |
|-----------|---------------|
| Migrations | Alembic (Python); run in CI before deploy |
| Backups | RDS automated daily snapshots + WAL archiving |
| Restore | Point-in-time recovery (RDS feature) |
| Monitoring | RDS Performance Insights + CloudWatch |
| Connection pooling | PgBouncer sidecar or SQLAlchemy pool (max 20) |

---

## 9. Cost Estimate (MVP Monthly)

| Service | Estimated Cost |
|---------|---------------|
| ECS Fargate (2 services × 0.5 vCPU) | ~$30 |
| RDS PostgreSQL (db.t3.medium) | ~$60 |
| ElastiCache (cache.t3.micro) | ~$15 |
| S3 + CloudFront | ~$5 |
| SQS | ~$1 |
| Secrets Manager | ~$2 |
| OpenWeatherMap API | Free tier |
| SMS (Twilio, 1000 msgs) | ~$10 |
| **Total** | **~$125/month** |
