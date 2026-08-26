# Design & System Spec — UI, UX, and Mapping to System Components

**Reference:** [Dribbble — Crop Rotation Planner (Tanguy Desurmont)](https://dribbble.com/shots/24651371-Crop-Rotation-Planner)  
> Use the same visual language, spacing, card layouts, and micro-interactions as the inspiration.

---

## 1. Design Principles

| Principle | Description |
|---|---|
| **Clarity First** | Visual planner (grid) should explain rotations at-a-glance. |
| **Progressive Disclosure** | Show summary on cards, detailed modal on tap. |
| **Mobile-First** | Simplified interactions for single-handed use. |
| **Localization** | Flexible for languages and RTL if needed. |

---

## 2. Visual System & Assets

### Color Palette
Use calm greens, soft neutrals, and high-contrast accent for CTA (follow the Dribbble tones).

### Typography
Legible sans-serif for mobile — e.g., **Inter** or **Poppins**.

| Element | Size |
|---|---|
| Body | 16px |
| Headings | 20–24px |

### Components

- **Planner grid** — rows = plots, columns = months/weeks
- **Crop blocks** — draggable, color-coded by crop family
- **Summary cards** — per plot: soil, last crop, recommended crop
- **Modal / detail panel** — recommended inputs, reason, expected yield
- **Alerts banner** — weather/pests
- **Bottom navigation** — Plan · Field · Market · Profile

### Design Tokens

| Token | Values |
|---|---|
| **Spacing scale** | 4 / 8 / 12 / 16 / 24 |
| **Corner radii** | 6px / 12px |
| **Elevation** | Shadows for cards |

### Prototype
Create Figma file with components + auto-layout and export tokens *(Dribbble author linked to Figma in description)*.

---

## 3. Screens & Flows

### Onboarding / Add Field
> Steps: Create account → Add field (map + polygon) → Quick soil input or *"I'll enter later"*

### Planner (Home)
- **Default view:** Calendar grid with plot rows
- **Interactions:** Tap crop block → open modal; drag to reassign; long-press to repeat/shift

### Plot Details
- Soil history, last 3 crops, recommended rotations

### Market & Alerts
- Price charts; active alerts; export to PDF/Share

### Profile / Settings
- Languages, notification preferences, data export

---

## 4. Component Interactions (Detailed)

### Crop Block
- Shows crop icon, short name, sowing window, and color band for risk.
- **Tap** → shows modal with expected yield, fertilizer, reason (model explanation).

### Planner Drag/Drop
- Snap to month/season columns.
- On drop, run constraint validation (soil crop compatibility, water constraints).

### Conflict Detection
- If rotation violates soil-rest period → show toast and highlight offending blocks.

### Undo / History
- Every planner action recorded as a transaction.
- Allow undo for last **5 actions**.

---

## 5. Accessibility

- Minimum contrast ratio: **4.5:1** for text.
- All important actions reachable with screen readers.
- Test keyboard / TalkBack flows.

---

## 6. Export / Print Visual Spec

- PDF export uses the same grid as the planner.
- Generate server-side PDF with HTML/CSS rendering (`wkhtmltopdf` or headless Chrome).
- Ensure icons and fonts are embedded.

---

## 7. Handoff Notes for Engineers

### Component Library
Deliver a component library (**React + Storybook** or Flutter widgets) matching design tokens.

### Planner State JSON Schema

```json
{
  "user_id": "string",
  "plots": [
    {
      "plot_id": "string",
      "polygon": [[lat, long]],
      "area_ha": 0.5,
      "rotation": [
        {
          "crop": "wheat",
          "start": "2026-11-15",
          "end": "2027-03-01",
          "fertilizer": { "N": 50 }
        }
      ]
    }
  ]
}
```

### API Mapping
Map interactions to API calls:
> Drag/drop modifies local state → **optimistic UI update** → sync with `PUT /api/plots/{id}/rotation`

---

## 8. Animation & Micro-Interaction Spec

| Interaction | Spec |
|---|---|
| **Drag** | Slight scale up (1.03×), shadow increase |
| **Save confirmation** | Green snackbar with checkmark; 1.2s auto-dismiss |
| **Conflict** | Shake animation on invalid drop + tooltip |

---

## 9. Design QA Checklist

- [ ] Pixel-perfect with reference design for spacing and color.
- [ ] Responsive across **360–412 px** width phones and **1280 px** desktop.
- [ ] Performance: planner re-renders **< 100ms** for 50 plots.
