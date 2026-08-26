# User Stories & Acceptance Criteria — Smart Crop Advisory (SIH25010)

**Version:** 1.0
**Date:** 2026-03-07

---

## Legend

| Label | Meaning |
|-------|---------|
| **P0** | Must-have for MVP |
| **P1** | Should-have (include if time permits) |
| **P2** | Nice-to-have / v1+ |

---

## 1. Onboarding & Account Management

### US-101 — Phone OTP Registration (P0)
**As a** farmer,
**I want to** register using my phone number and OTP,
**so that** I can quickly create an account without remembering a password.

**Acceptance Criteria:**
- [ ] User enters a 10-digit Indian mobile number.
- [ ] System sends a 6-digit OTP via SMS within 10 seconds.
- [ ] OTP is valid for 5 minutes.
- [ ] After 3 failed attempts, the user is locked out for 15 minutes.
- [ ] On successful verification, user is redirected to profile setup.
- [ ] Phone number is stored hashed/encrypted at rest.

### US-102 — Profile Setup (P0)
**As a** farmer,
**I want to** enter my name, preferred language, and district,
**so that** the app can personalize my experience.

**Acceptance Criteria:**
- [ ] Name field accepts Unicode characters (for Hindi/regional names).
- [ ] Language selector offers Hindi and English (extensible list).
- [ ] District picker uses a searchable dropdown with Indian districts.
- [ ] User can skip optional fields and complete later.

### US-103 — Role Assignment (P1)
**As an** admin,
**I want to** assign roles (farmer / agronomist / FPO manager) to users,
**so that** each role sees the appropriate dashboard and permissions.

**Acceptance Criteria:**
- [ ] Admin panel lists all users with current role.
- [ ] Role change takes effect on next login or token refresh.
- [ ] Farmers see only their own plots; agronomists see assigned regions.

---

## 2. Field / Plot Registration

### US-201 — Add Plot with GPS (P0)
**As a** farmer,
**I want to** register my farm plot by tapping my location on a map,
**so that** the system knows where my field is.

**Acceptance Criteria:**
- [ ] Map view defaults to user's current GPS location.
- [ ] User can place a pin or draw a polygon boundary (GeoJSON stored).
- [ ] System resolves GPS to nearest weather station (background job within 30s).
- [ ] If GPS is unavailable, user can manually search for a village/pin-code.

### US-202 — Enter Plot Details (P0)
**As a** farmer,
**I want to** enter my plot's area and irrigation type,
**so that** recommendations account for my field conditions.

**Acceptance Criteria:**
- [ ] Area input in hectares or acres (auto-convert).
- [ ] Irrigation type dropdown: Rainfed, Tube-well, Canal, Drip, Sprinkler.
- [ ] Validation: area > 0 and ≤ 500 ha.
- [ ] Data persisted to `plots` table with `user_id` foreign key.

### US-203 — Enter Soil Data (P0)
**As a** farmer,
**I want to** input my soil lab results (N, P, K, pH),
**so that** recommendations are based on my actual soil health.

**Acceptance Criteria:**
- [ ] Input fields for N (kg/ha), P (kg/ha), K (kg/ha), pH with sensible ranges and validation.
- [ ] "I'll enter later" button skips soil input (defaults to regional averages for recommendations).
- [ ] Soil test date is recorded; latest test data is used for recommendations.
- [ ] Historical soil tests are viewable per plot.

### US-204 — View My Plots (P0)
**As a** farmer,
**I want to** see all my registered plots on a map and list view,
**so that** I can manage them easily.

**Acceptance Criteria:**
- [ ] Map view shows all plots with color-coded pins (by last crop or soil health status).
- [ ] List view shows plot name/label, area, and last recommendation date.
- [ ] Tapping a plot navigates to its detail page.

---

## 3. Crop Recommendation

### US-301 — Get Crop Recommendation (P0)
**As a** farmer,
**I want to** get the top 3 recommended crops for my plot this season,
**so that** I can choose the most profitable and suitable crop.

**Acceptance Criteria:**
- [ ] User taps "Get Recommendation" on a plot details page.
- [ ] System returns 3 crops, each with: name, confidence score (0–1), human-readable reason, and sowing window (start/end dates).
- [ ] Results are displayed within 2 seconds (p95).
- [ ] If soil data is missing, system uses regional defaults and shows a warning banner.
- [ ] Recommendation considers: soil NPK, pH, season, weather forecast, irrigation type, and previous crop.

### US-302 — View Recommendation Details (P0)
**As a** farmer,
**I want to** tap on a recommended crop to see details,
**so that** I understand why it was recommended and what inputs are needed.

**Acceptance Criteria:**
- [ ] Modal shows: expected yield range, recommended fertilizer doses, irrigation schedule, and model explanation text.
- [ ] Model version and timestamp are shown (for agronomist audit).
- [ ] "Add to Planner" button adds the crop block to the rotation planner.

### US-303 — Agronomist Override (P1)
**As an** agronomist,
**I want to** override or annotate a recommendation for a farmer,
**so that** field-specific knowledge is captured.

**Acceptance Criteria:**
- [ ] Agronomist can add a note to any recommendation.
- [ ] Override is logged with agronomist ID and reason.
- [ ] Farmer sees the override annotation alongside the original recommendation.

---

## 4. Crop Rotation Planner

### US-401 — View Rotation Calendar (P0)
**As a** farmer,
**I want to** see my crop rotation plan in a calendar grid,
**so that** I can visualize what to sow and when across my plots.

**Acceptance Criteria:**
- [ ] Grid layout: rows = plots, columns = months (12-month view default).
- [ ] Crop blocks are color-coded by crop family (cereals, pulses, oilseeds, vegetables).
- [ ] Current month is highlighted.
- [ ] Empty slots show a "+" icon to add a crop.

### US-402 — Drag & Drop Crop Blocks (P0)
**As a** farmer,
**I want to** drag crop blocks to rearrange my rotation plan,
**so that** I can experiment with different sequences easily.

**Acceptance Criteria:**
- [ ] Crop blocks snap to month/season columns on drop.
- [ ] Drag provides visual feedback: scale up 1.03×, increased shadow.
- [ ] On drop, constraint validation runs (soil-rest compatibility, water requirements).
- [ ] If constraints violated: shake animation, toast with explanation, block reverts.
- [ ] Optimistic UI: save to local state immediately, sync to backend via `PUT /api/plots/{id}/rotation`.

### US-403 — Conflict Detection (P1)
**As a** farmer,
**I want to** be warned if my rotation violates soil-rest rules,
**so that** I can prevent soil degradation.

**Acceptance Criteria:**
- [ ] System checks: same crop family not repeated within N seasons (configurable).
- [ ] System checks: legume rotation recommended every 3 seasons.
- [ ] Conflict blocks highlighted with red border and tooltip.

### US-404 — Undo / Redo (P1)
**As a** farmer,
**I want to** undo my last planner action,
**so that** I can recover from mistakes.

**Acceptance Criteria:**
- [ ] Undo supports last 5 actions.
- [ ] Redo restores undone actions.
- [ ] Undo/redo buttons visible in planner toolbar.

---

## 5. Soil & Fertilizer

### US-501 — Soil Health Dashboard (P0)
**As a** farmer,
**I want to** see my soil health status at a glance,
**so that** I know if my soil needs attention.

**Acceptance Criteria:**
- [ ] Soil health card shows: status badge (Good / Moderate / Poor), NPK bar chart, pH indicator.
- [ ] Status is computed from latest soil test vs. crop-specific thresholds.
- [ ] "No data" state shown if no soil test entered.

### US-502 — Fertilizer Recommendations (P0)
**As a** farmer,
**I want to** see recommended fertilizer doses for my chosen crop,
**so that** I apply the right amount.

**Acceptance Criteria:**
- [ ] Recommendation shows N, P, K quantities in kg/ha.
- [ ] Doses are adjusted based on soil test data (higher deficiency = higher recommendation).
- [ ] Source of recommendation (model / agronomist override) is indicated.

---

## 6. Weather

### US-601 — 7-Day Forecast (P0)
**As a** farmer,
**I want to** see the 7-day weather forecast for my plot,
**so that** I can plan field activities.

**Acceptance Criteria:**
- [ ] Forecast shows: date, temp (min/max), rainfall (mm), humidity (%), weather icon.
- [ ] Data sourced from nearest weather station (mapped during plot registration).
- [ ] Forecast updates at least every 6 hours.

### US-602 — Weather-Based Alerts (P0)
**As a** farmer,
**I want to** receive timely alerts about weather events,
**so that** I can protect my crops and adjust irrigation.

**Acceptance Criteria:**
- [ ] Alerts delivered via push notification, SMS, and/or WhatsApp (user preference).
- [ ] Alert triggers include: heavy rain (>50mm), frost (<2°C), heat wave (>42°C), dry spell (>7 days no rain).
- [ ] Alert delivered within 60 seconds of trigger condition.
- [ ] User can enable/disable specific alert types in settings.

---

## 7. Market Prices

### US-701 — View Mandi Prices (P0)
**As a** farmer,
**I want to** see the latest mandi prices for crops in my district,
**so that** I can decide when and where to sell.

**Acceptance Criteria:**
- [ ] Price list shows: crop name, mandi name, price (₹/quintal), date.
- [ ] Filter by crop and district.
- [ ] Data no more than 24 hours stale; stale data shows warning.

### US-702 — Price Trend Chart (P0)
**As a** farmer,
**I want to** see a 7–30 day price trend chart,
**so that** I can identify rising or falling prices.

**Acceptance Criteria:**
- [ ] Line chart with date (x-axis) and price (y-axis).
- [ ] Toggle between 7-day, 14-day, and 30-day views.
- [ ] Trend indicator (↑ rising / ↓ falling / → stable) shown alongside chart.

### US-703 — Price Prediction (P2)
**As an** FPO manager,
**I want to** see predicted price trends for the next 7 days,
**so that** I can advise farmers on harvest timing.

**Acceptance Criteria:**
- [ ] Prediction shown as a dashed line on the price trend chart.
- [ ] Confidence interval displayed as a shaded band.
- [ ] Model version and last training date shown.

---

## 8. Export & Share

### US-801 — Export Plan as PDF (P0)
**As a** farmer,
**I want to** download my rotation plan as a PDF,
**so that** I can print it or share it offline.

**Acceptance Criteria:**
- [ ] PDF mirrors the planner grid layout with crop blocks, dates, and fertilizer notes.
- [ ] Icons and fonts are embedded in the PDF.
- [ ] Generated server-side (headless Chrome or wkhtmltopdf).
- [ ] File is available for download within 10 seconds.

### US-802 — Share via WhatsApp (P1)
**As a** farmer,
**I want to** share my plan via WhatsApp,
**so that** I can discuss it with my co-op.

**Acceptance Criteria:**
- [ ] Share button generates a deep link with a preview of the plan.
- [ ] Recipient can view a read-only version of the plan via the link.
- [ ] Link expires after 30 days.

---

## 9. Notifications & Alerts

### US-901 — Notification Preferences (P0)
**As a** farmer,
**I want to** choose how I receive notifications (push, SMS, WhatsApp),
**so that** I get alerts through my preferred channel.

**Acceptance Criteria:**
- [ ] Settings page shows toggles for: Push, SMS, WhatsApp.
- [ ] At least one channel must remain enabled.
- [ ] Changes are saved immediately.

### US-902 — Sowing Reminder (P1)
**As a** farmer,
**I want to** receive a reminder when my sowing window is approaching,
**so that** I don't miss the optimal planting time.

**Acceptance Criteria:**
- [ ] Reminder sent 7 days and 3 days before sowing window opens.
- [ ] Reminder includes crop name, plot name, and sowing date range.

---

## 10. Admin & Agronomist Dashboard

### US-1001 — Agronomist Multi-Farm View (P1)
**As an** agronomist,
**I want to** view crop rotations for all farmers in my assigned region,
**so that** I can provide targeted advice and monitor adoption.

**Acceptance Criteria:**
- [ ] Dashboard shows a list of farmers with plot counts and last activity date.
- [ ] Clicking a farmer opens their planner in read-only mode.
- [ ] Agronomist can add notes visible to the farmer.

### US-1002 — FPO Aggregated Report (P2)
**As an** FPO manager,
**I want to** generate an aggregated report of crops planned across member farms,
**so that** I can coordinate market access and input procurement.

**Acceptance Criteria:**
- [ ] Report shows: crop-wise area (total ha), expected production, and planned harvest dates.
- [ ] Exportable as CSV and PDF.

### US-1003 — Data Export / Deletion (P1)
**As a** farmer,
**I want to** export or delete all my data,
**so that** my privacy is respected.

**Acceptance Criteria:**
- [ ] "Export My Data" generates a ZIP file with all personal data in JSON format within 24 hours.
- [ ] "Delete My Account" removes all personal data; anonymized aggregates may be retained.
- [ ] Confirmation prompt with OTP required for deletion.

---

## 11. System / Cross-Cutting

### US-1101 — Audit Logging (P1)
**As an** admin,
**I want to** see an audit trail of all recommendation and rotation changes,
**so that** I can investigate issues and ensure compliance.

**Acceptance Criteria:**
- [ ] Log includes: timestamp, user_id, action, before/after state, IP address.
- [ ] Logs are immutable and retained for 2 years.
- [ ] Searchable by user, date range, and action type.

### US-1102 — Multi-Language Support (P1)
**As a** farmer,
**I want to** use the app in my local language,
**so that** I can understand all information clearly.

**Acceptance Criteria:**
- [ ] All UI strings externalized in i18n resource files.
- [ ] Language toggle available in header/settings.
- [ ] Hindi and English fully supported; other languages are plugin-ready.

### US-1103 — Error & Offline Handling (P0)
**As a** farmer,
**I want to** see clear messages when something goes wrong or I'm offline,
**so that** I'm never confused.

**Acceptance Criteria:**
- [ ] API errors show user-friendly messages (not raw HTTP codes).
- [ ] Offline state shows cached planner data with "Offline — changes will sync" banner.
- [ ] Network recovery triggers automatic sync.
