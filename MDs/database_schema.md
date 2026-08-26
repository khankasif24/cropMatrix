# Database Schema — Smart Crop Advisory (SIH25010)

**Version:** 1.0
**Date:** 2026-03-07
**Engine:** PostgreSQL 15+

---

## 1. ER Diagram

```
┌───────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    users      │       │     plots        │       │   soil_tests     │
├───────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)       │──1:N──│ id (PK)          │──1:N──│ id (PK)          │
│ phone         │       │ user_id (FK)     │       │ plot_id (FK)     │
│ name          │       │ label            │       │ nitrogen         │
│ language_pref │       │ geojson          │       │ phosphorus       │
│ district      │       │ area_ha          │       │ potassium        │
│ role          │       │ irrigation_type  │       │ ph               │
│ created_at    │       │ weather_station  │       │ organic_carbon   │
│ updated_at    │       │ created_at       │       │ test_date        │
└───────────────┘       │ updated_at       │       │ created_at       │
                        └──────────────────┘       └──────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
           ┌───────▼────────┐      ┌───────▼───────────────┐
           │   rotations    │      │ recommendation_logs   │
           ├────────────────┤      ├───────────────────────┤
           │ id (PK)        │      │ id (PK)               │
           │ plot_id (FK)   │      │ plot_id (FK)          │
           │ crop           │      │ input_features (JSON) │
           │ season         │      │ result_json (JSON)    │
           │ start_date     │      │ model_version         │
           │ end_date       │      │ score                 │
           │ fertilizer_json│      │ created_at            │
           │ status         │      └───────────────────────┘
           │ created_at     │
           │ updated_at     │
           └────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│ weather_observations │       │   market_prices      │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │
│ station_id           │       │ crop                 │
│ date                 │       │ mandi                │
│ temp_min             │       │ district             │
│ temp_max             │       │ date                 │
│ rainfall_mm          │       │ price_per_quintal    │
│ humidity             │       │ created_at           │
│ wind_speed           │       └──────────────────────┘
│ weather_condition    │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│ notifications        │       │ audit_logs           │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │       │ id (PK)              │
│ user_id (FK)         │       │ user_id (FK)         │
│ type                 │       │ action               │
│ title                │       │ resource_type        │
│ body                 │       │ resource_id          │
│ channel              │       │ before_state (JSON)  │
│ status               │       │ after_state (JSON)   │
│ read_at              │       │ ip_address           │
│ created_at           │       │ created_at           │
└──────────────────────┘       └──────────────────────┘
```

---

## 2. Table Definitions

### 2.1 `users`

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           VARCHAR(15) NOT NULL UNIQUE,
    phone_hash      VARCHAR(64) NOT NULL,
    name            VARCHAR(100),
    language_pref   VARCHAR(5) DEFAULT 'en',
    district        VARCHAR(100),
    state           VARCHAR(100),
    role            VARCHAR(20) NOT NULL DEFAULT 'farmer'
                    CHECK (role IN ('farmer', 'agronomist', 'fpo_manager', 'admin')),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_users_district ON users (district);
CREATE INDEX idx_users_role ON users (role);
```

### 2.2 `plots`

```sql
CREATE TABLE plots (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label             VARCHAR(100) DEFAULT 'My Plot',
    latitude          DOUBLE PRECISION,
    longitude         DOUBLE PRECISION,
    geojson           JSONB,
    area_ha           DECIMAL(10,2) NOT NULL CHECK (area_ha > 0 AND area_ha <= 500),
    irrigation_type   VARCHAR(20) NOT NULL DEFAULT 'rainfed'
                      CHECK (irrigation_type IN ('rainfed', 'tubewell', 'canal', 'drip', 'sprinkler')),
    weather_station_id VARCHAR(50),
    soil_summary      JSONB,                   -- cached latest soil test summary
    previous_crop     VARCHAR(50),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plots_user_id ON plots (user_id);
CREATE INDEX idx_plots_location ON plots USING GIST (
    ST_MakePoint(longitude, latitude)          -- requires PostGIS
);
```

### 2.3 `soil_tests`

```sql
CREATE TABLE soil_tests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id         UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    nitrogen        DECIMAL(8,2),              -- kg/ha
    phosphorus      DECIMAL(8,2),              -- kg/ha
    potassium       DECIMAL(8,2),              -- kg/ha
    ph              DECIMAL(4,2) CHECK (ph >= 0 AND ph <= 14),
    organic_carbon  DECIMAL(5,2),              -- percentage
    moisture        DECIMAL(5,2),              -- percentage
    test_date       DATE NOT NULL,
    lab_name        VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_soil_tests_plot_id ON soil_tests (plot_id);
CREATE INDEX idx_soil_tests_date ON soil_tests (plot_id, test_date DESC);
```

### 2.4 `rotations`

```sql
CREATE TABLE rotations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id         UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop            VARCHAR(50) NOT NULL,
    crop_family     VARCHAR(30),               -- cereals, pulses, oilseeds, vegetables
    season          VARCHAR(20)
                    CHECK (season IN ('kharif', 'rabi', 'zaid', 'annual')),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    fertilizer_json JSONB,                     -- {"N": 50, "P": 30, "K": 20}
    expected_yield  DECIMAL(10,2),             -- kg/ha
    status          VARCHAR(15) DEFAULT 'planned'
                    CHECK (status IN ('planned', 'active', 'harvested', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_rotations_plot_id ON rotations (plot_id);
CREATE INDEX idx_rotations_date ON rotations (plot_id, start_date);
CREATE INDEX idx_rotations_crop ON rotations (crop);
```

### 2.5 `recommendation_logs`

```sql
CREATE TABLE recommendation_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id         UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    input_features  JSONB NOT NULL,            -- snapshot of all model inputs
    result_json     JSONB NOT NULL,            -- full recommendation response
    top_crop        VARCHAR(50),
    top_score       DECIMAL(4,3),
    model_version   VARCHAR(50) NOT NULL,
    inference_ms    INTEGER,                   -- latency in milliseconds
    agronomist_note TEXT,                      -- optional override note
    agronomist_id   UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reco_logs_plot ON recommendation_logs (plot_id, created_at DESC);
CREATE INDEX idx_reco_logs_model ON recommendation_logs (model_version);
```

### 2.6 `weather_observations`

```sql
CREATE TABLE weather_observations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id        VARCHAR(50) NOT NULL,
    observation_date  DATE NOT NULL,
    temp_min          DECIMAL(5,2),            -- °C
    temp_max          DECIMAL(5,2),            -- °C
    rainfall_mm       DECIMAL(8,2),            -- mm
    humidity          DECIMAL(5,2),            -- %
    wind_speed_kmh    DECIMAL(6,2),
    weather_condition VARCHAR(50),             -- sunny, cloudy, rainy, etc.
    source            VARCHAR(30) DEFAULT 'openweathermap',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, observation_date)
);

CREATE INDEX idx_weather_station_date ON weather_observations (station_id, observation_date DESC);
```

### 2.7 `market_prices`

```sql
CREATE TABLE market_prices (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop              VARCHAR(50) NOT NULL,
    mandi             VARCHAR(100) NOT NULL,
    district          VARCHAR(100) NOT NULL,
    state             VARCHAR(100),
    price_date        DATE NOT NULL,
    price_per_quintal DECIMAL(10,2) NOT NULL,
    source            VARCHAR(30) DEFAULT 'agmarknet',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (crop, mandi, price_date)
);

CREATE INDEX idx_market_crop_date ON market_prices (crop, price_date DESC);
CREATE INDEX idx_market_district ON market_prices (district, crop);
```

### 2.8 `notifications`

```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(30) NOT NULL
                CHECK (type IN ('weather_alert', 'sowing_reminder', 'market_alert', 'system')),
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    channel     VARCHAR(10) NOT NULL
                CHECK (channel IN ('push', 'sms', 'whatsapp')),
    status      VARCHAR(15) DEFAULT 'pending'
                CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    read_at     TIMESTAMPTZ,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_status ON notifications (status) WHERE status = 'pending';
```

### 2.9 `notification_preferences`

```sql
CREATE TABLE notification_preferences (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled  BOOLEAN DEFAULT TRUE,
    wa_enabled   BOOLEAN DEFAULT FALSE,
    weather_alerts BOOLEAN DEFAULT TRUE,
    sowing_reminders BOOLEAN DEFAULT TRUE,
    market_alerts BOOLEAN DEFAULT TRUE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.10 `weather_stations`

```sql
CREATE TABLE weather_stations (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(200),
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    district    VARCHAR(100),
    state       VARCHAR(100),
    source      VARCHAR(30),
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stations_location ON weather_stations USING GIST (
    ST_MakePoint(longitude, latitude)
);
```

### 2.11 `audit_logs`

```sql
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id),
    action        VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id   UUID,
    before_state  JSONB,
    after_state   JSONB,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs (resource_type, resource_id);
```

### 2.12 `crop_master`

```sql
CREATE TABLE crop_master (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    family          VARCHAR(30),               -- cereals, pulses, oilseeds, vegetables, fruits
    season          VARCHAR(20)[],             -- {'kharif', 'rabi', 'zaid'}
    min_temp        DECIMAL(5,2),
    max_temp        DECIMAL(5,2),
    water_req_mm    DECIMAL(8,2),
    growth_days     INTEGER,
    ideal_ph_min    DECIMAL(4,2),
    ideal_ph_max    DECIMAL(4,2),
    ideal_n_min     DECIMAL(8,2),
    ideal_n_max     DECIMAL(8,2),
    ideal_p_min     DECIMAL(8,2),
    ideal_p_max     DECIMAL(8,2),
    ideal_k_min     DECIMAL(8,2),
    ideal_k_max     DECIMAL(8,2),
    icon_url        TEXT,
    color_hex       VARCHAR(7),                -- for planner UI
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.13 `model_registry`

```sql
CREATE TABLE model_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name      VARCHAR(100) NOT NULL,
    version         VARCHAR(50) NOT NULL UNIQUE,
    algorithm       VARCHAR(50),               -- random_forest, xgboost, lstm
    metrics_json    JSONB,                     -- {"accuracy": 0.87, "f1": 0.84}
    artifact_path   TEXT NOT NULL,             -- S3 path
    is_active       BOOLEAN DEFAULT FALSE,
    trained_at      TIMESTAMPTZ,
    deployed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_model_active ON model_registry (is_active) WHERE is_active = TRUE;
```

---

## 3. Extensions Required

```sql
-- PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

---

## 4. Data Retention Policy

| Table | Retention | Strategy |
|-------|-----------|----------|
| `users`, `plots`, `crop_master` | Indefinite | Active data |
| `soil_tests` | 2 years | Archive after 2 years |
| `rotations` | 7 years (aggregated) | Raw data → 2 years; aggregated → 7 years |
| `weather_observations` | 2 years | Partition by month; drop old partitions |
| `market_prices` | 2 years | Partition by month |
| `recommendation_logs` | 2 years | Archive to S3 after 2 years |
| `notifications` | 90 days | Auto-delete after 90 days |
| `audit_logs` | 2 years | Immutable; archive to S3 |

---

## 5. Migration Strategy

- Use **Alembic** (Python / SQLAlchemy) for all schema migrations.
- Every migration has an `upgrade()` and `downgrade()` function.
- Migrations run as part of CI/CD pipeline before deployment.
- Naming convention: `YYYYMMDD_HHMM_short_description.py`
