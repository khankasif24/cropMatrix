# Testing Strategy — Smart Crop Advisory (SIH25010)

**Version:** 1.0 | **Date:** 2026-03-07

---

## 1. Testing Pyramid

```
            ┌──────────┐
            │  E2E     │  ← Few, high-value user flows
            │ (Cypress) │
           ┌┴──────────┴┐
           │ Integration │  ← API + DB + service tests
           │ (pytest)    │
          ┌┴────────────┴┐
          │  Unit Tests   │  ← Bulk of tests; fast, isolated
          │(pytest/vitest)│
         ┌┴──────────────┴┐
         │  Static Analysis│  ← Lint, type check, format
         │(ESLint/ruff/mypy)│
         └────────────────┘
```

| Level | Coverage Target | Run Frequency |
|-------|----------------|---------------|
| Static Analysis | 100% of codebase | Every commit (pre-commit hook) |
| Unit | >80% line coverage | Every PR (CI) |
| Integration | Critical API paths | Every PR (CI) |
| E2E | Core user flows | Nightly + pre-release |
| Performance | Key endpoints | Weekly + pre-release |
| Security | OWASP Top-10 | Pre-release |

---

## 2. Backend Testing (Python / pytest)

### 2.1 Unit Tests

**Scope:** Pure business logic, scoring engine, feature engineering, validators.

| Module | Test Focus | Example Tests |
|--------|-----------|---------------|
| `scoring_engine.py` | Score calculation, penalties, bonuses | `test_same_crop_penalty`, `test_legume_bonus`, `test_score_clamping` |
| `feature_engineer.py` | Feature vector assembly, missing data handling | `test_feature_vector_shape`, `test_missing_soil_defaults` |
| `validators.py` | Input validation | `test_invalid_ph_range`, `test_area_bounds` |
| `security.py` | JWT encode/decode, hashing | `test_jwt_roundtrip`, `test_token_expiry` |
| `geospatial.py` | GPS → station mapping | `test_nearest_station_lookup` |

**Tools:** `pytest`, `pytest-cov`, `unittest.mock`

```python
# Example: scoring engine test
def test_same_crop_penalty():
    score = calculate_final_score(
        base_score=0.80,
        previous_crop="wheat",
        recommended_crop="wheat"
    )
    assert score == pytest.approx(0.50, abs=0.01)  # -0.30 penalty
```

### 2.2 Integration Tests

**Scope:** API endpoints with real database (test DB).

| Area | Test Focus | Example Tests |
|------|-----------|---------------|
| Auth | OTP flow, JWT issuance | `test_otp_send_verify`, `test_expired_otp_rejected` |
| Plots | CRUD operations | `test_create_plot`, `test_list_user_plots`, `test_delete_cascade` |
| Recommendations | End-to-end inference | `test_recommend_returns_top3`, `test_missing_soil_uses_defaults` |
| Planner | Rotation CRUD + validation | `test_update_rotation`, `test_conflict_409_response` |
| Weather | Forecast API | `test_weather_forecast_returns_7_days` |
| Market | Price list + trends | `test_price_filter_by_district` |

**Setup:**
```python
# conftest.py
@pytest.fixture(scope="session")
def test_db():
    """Spin up test PostgreSQL (testcontainers or separate DB)."""
    ...

@pytest.fixture
def client(test_db):
    """FastAPI TestClient with test DB session."""
    ...

@pytest.fixture
def auth_headers(client):
    """Pre-authenticated JWT headers for test user."""
    ...
```

### 2.3 ML Model Tests

| Test | Purpose |
|------|---------|
| `test_model_loads` | Model file loads without errors |
| `test_prediction_shape` | Output has correct shape (n_crops,) |
| `test_known_inputs` | Known input produces expected top crop |
| `test_all_scores_in_range` | All probabilities in [0, 1] |
| `test_model_deterministic` | Same input → same output |
| `test_inference_latency` | Single inference < 100ms |

---

## 3. Frontend Testing (TypeScript / Vitest)

### 3.1 Unit Tests

**Scope:** Utility functions, hooks, store logic.

| Module | Test Focus |
|--------|-----------|
| `formatDate.ts` | Date formatting across locales |
| `validators.ts` | Form validation (phone, area, pH) |
| `plannerStore.ts` | State mutations (add/remove/move crop block) |
| `useAuth.ts` | Auth state transitions |

**Tools:** `vitest`, `@testing-library/react`

### 3.2 Component Tests

**Scope:** React components render correctly with props.

| Component | Tests |
|-----------|-------|
| `CropBlock` | Renders crop name, score, color band; click fires callback |
| `SoilHealthCard` | Shows correct status badge (good/moderate/poor) |
| `PriceList` | Renders rows from mock data; filter works |
| `WeatherForecast` | 7 days rendered; icons correct |
| `PlannerGrid` | Correct rows/columns; empty slots show "+" |

### 3.3 Snapshot Tests

- Component library (`packages/ui/`) — all Storybook stories have snapshot tests.
- Run on every PR to detect unintended visual changes.

---

## 4. End-to-End Tests (Cypress)

### Critical User Flows

| # | Flow | Steps | Assertions |
|---|------|-------|-----------|
| 1 | **Onboarding** | Open app → enter phone → OTP → profile → add plot → soil | Plot appears in list |
| 2 | **Get Recommendation** | Select plot → tap "Get Recommendation" → see top-3 | 3 crop cards displayed with scores |
| 3 | **Plan Rotation** | Open planner → drag crop to slot → save | Crop block persisted, no conflict |
| 4 | **Conflict Detection** | Drag same-family crop to consecutive slot | Conflict toast shown, block reverts |
| 5 | **Export PDF** | Open planner → tap export → download | PDF file downloaded |
| 6 | **Market Prices** | Navigate to Market tab → filter by crop | Price list updates |
| 7 | **Weather** | Navigate to plot detail → view forecast | 7-day forecast shown |

### Setup
```javascript
// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      apiUrl: 'http://localhost:8000',
      testPhone: '+919999999999',
      testOTP: '123456'   // mock OTP provider
    }
  }
}
```

---

## 5. Performance Testing

### Tools
| Tool | Purpose |
|------|---------|
| **Locust** (Python) | API load testing |
| **Lighthouse** | Frontend performance audit |

### Scenarios

| Scenario | Tool | Target |
|----------|------|--------|
| Recommendation API under load | Locust: 100 concurrent users | p95 < 2s, 0% errors |
| Planner with 50 plots | Lighthouse | Re-render < 100ms |
| PDF export queue | Locust: 50 concurrent exports | Complete in < 30s each |
| Auth endpoint | Locust: 200 req/min | p95 < 500ms |

### Locust Example
```python
class CropAdvisoryUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def get_recommendation(self):
        self.client.post("/api/recommend/crop",
            json={"plot_id": "test-uuid", "season": "rabi"},
            headers=self.auth_headers)

    @task(1)
    def get_weather(self):
        self.client.get(f"/api/weather/{self.plot_id}/forecast",
            headers=self.auth_headers)
```

---

## 6. Security Testing

| Check | Tool / Method | Frequency |
|-------|--------------|-----------|
| Dependency vulnerabilities | Snyk / Dependabot | Every PR |
| Container vulnerabilities | Trivy | Every Docker build |
| OWASP Top-10 | Manual review + OWASP ZAP | Pre-release |
| SQL injection | SQLAlchemy parameterized queries + test | Integration tests |
| JWT manipulation | Test expired/tampered tokens | Unit tests |
| Rate limiting | Locust-based brute force test | Pre-release |
| Input sanitization | Pydantic validation + XSS test payloads | Integration tests |

---

## 7. CI Integration

### PR Pipeline (ci.yml)
```
1. Lint     → ESLint (frontend) + ruff (backend) + mypy (types)
2. Test     → pytest (backend) + vitest (frontend)
3. Build    → Docker build (verify Dockerfiles)
4. Coverage → Report to PR comment (>80% required)
5. Security → Snyk dependency scan
```

### Nightly Pipeline
```
1. Full E2E suite (Cypress against staging)
2. Performance tests (Locust against staging)
3. ML model regression tests
4. Security scan (Trivy + OWASP ZAP)
```

---

## 8. Test Data Strategy

| Data Type | Strategy |
|-----------|----------|
| DB fixtures | Factory functions using `factory_boy` (Python) |
| API mocks | `httpx.MockTransport` for external APIs (weather, market) |
| ML test inputs | Fixed feature vectors with known expected outputs |
| Frontend mocks | MSW (Mock Service Worker) for API mocking |
| Seed data | `scripts/seed-db.sh` with 20 crops, 5 districts, sample plots |

---

## 9. Quality Gates

| Gate | Criteria | Enforced By |
|------|----------|-------------|
| PR merge | Lint passes, tests pass, coverage ≥ 80% | GitHub branch protection |
| Staging deploy | E2E tests pass | GitHub Actions |
| Production deploy | Manual approval + smoke tests green | GitHub environment protection |
| Model deploy | Accuracy ≥ 70%, no regression | ML pipeline checks |
