# Architecture Prompt: Personal Investment Portfolio Website (Wealth Management)

Use this prompt when designing or implementing the investment portfolio website. Follow these constraints and preferences throughout.

---

## 1. Product scope (keep it simple)

- **Two main areas only:**
  1. **Short introduction** — A brief landing/welcome section (e.g. one screen): professional tagline, purpose of the dashboard, no sensitive data.
  2. **Dashboard** — Single main view with performance overview and one chart.

- Do not add extra pages (e.g. detailed holdings, settings, user accounts) unless explicitly requested later.

---

## 2. Privacy: no portfolio value

- **Never display:**
  - Total portfolio value (in any currency).
  - Individual position sizes, notional amounts, or cash balances.
  - Any numeric data that could be used to infer portfolio size.

- **Only display:**
  - **Relative performance** (e.g. percentages): YTD, 1Y, and similar.
  - **Indexed or normalized series** (e.g. "100 at start of period") for charts.
  - **Allocations** as percentages (e.g. equity 60%, fixed income 40%), not in currency.

- Storage and backend may hold actual values for calculations; the UI must never expose them.

---

## 3. Data model / asset types

- **Supported position types and units:**
  - **US stocks** — in **shares** (quantity only in storage; no $ in UI).
  - **Bitcoin** — in **BTC** (quantity only).
  - **Physical gold** — in **grams (g)** or **ounces (oz)** (user or config choice; quantity only).
  - **Mutual funds** — in **units** (quantity only).

- The system stores quantities (and dates, identifiers, etc.) for performance and allocation calculations. The UI never displays position sizes, notional value, or portfolio value—only relative performance and allocation percentages, as already specified in the privacy section.

- Data-entry forms (and CSV template) should have clear fields per asset type (e.g. "Quantity (shares)", "Quantity (g or oz)", "Quantity (units)") so non-technical users know what to enter.

---

## 4. Charts and performance

- **One main chart** on the dashboard showing:
  - **YTD (Year-to-Date)** performance (e.g. growth of a normalized index from Jan 1 to today).
  - **1Y (1-Year)** performance (e.g. last 12 months from today).

- Prefer a single chart with two series (YTD and 1Y) or two clear time ranges, with:
  - Normalized/base-100 or percentage growth on the vertical axis.
  - Time on the horizontal axis.
  - Legend and axis labels that avoid any mention of "value" or "amount".

- No tooltips or labels that show absolute monetary values.

---

## 5. Backend: simple and maintainable

- Target **junior or less advanced developers**; avoid unnecessary complexity.

- **Preferred options (choose one and stick to it):**
  - **SQLite** + a thin REST or RPC API (e.g. Node/Express, Python/FastAPI, or similar).
  - **File-based storage** (e.g. JSON/CSV) with a simple server that reads/writes files and exposes a minimal API.
  - **Managed BaaS** (e.g. Supabase, Firebase) only if the team is already comfortable with it; keep usage minimal (e.g. one or two tables, simple CRUD).

- **Avoid:** microservices, message queues, heavy ORMs, or multiple databases unless strictly required.

- **API surface:** a small set of endpoints, e.g.:
  - Get performance series (e.g. by period: YTD, 1Y).
  - Submit or update performance/position data (for the easy data-entry flow below).

- Keep environment config (e.g. DB path, API URL) in one config file or env vars; no hardcoded secrets.

---

## 6. Data entry and updates (non-technical users)

- **Primary users:** wealth management professionals who are **not** developers. Data entry must be **easy and convenient**.

- **Preferred patterns:**
  - **Simple web forms** with clear labels, dropdowns where appropriate, and validation messages (e.g. "Enter a valid date", "Percentage 0–100").
  - **Optional: CSV/Excel upload** for bulk updates (one standard format, with a template download and clear column headers). Parsing and validation should be straightforward and report row-level errors.
  - **Single "Save" or "Update" action** with clear success/error feedback; avoid multi-step wizards unless necessary.

- **No requirement for:** Git, config files, or command-line tools for routine data updates. All updates should be doable via the browser (or a simple admin/form page).

- Document the expected data format (e.g. date format, required columns for uploads) in a short "Data entry" section in the app or in README.

---

## 7. Aesthetics and UX

- **Overall style:** tech-savvy, professional, **dark mode**.
  - Dark background (e.g. near-black or dark gray).
  - High-contrast text and subtle borders/accents (e.g. cool blue, cyan, or muted green for positive performance).
  - Avoid "playful" or consumer-app aesthetics; keep it suitable for wealth management professionals.

- **Typography:** clean, readable sans-serif; clear hierarchy (e.g. one main title, section headings, readable body).
- **Charts:** dark theme to match (dark background, light grid/labels, distinct colors for YTD vs 1Y).
- **Layout:** uncluttered dashboard; introduction short and above the fold; chart as the main focus.

---

## 8. Tech stack suggestions (optional)

- **Frontend:** React, Vue, or Svelte with a simple charting library (e.g. Chart.js, Lightweight Charts, or Recharts) and CSS or Tailwind for dark theme.
- **Backend:** Node + Express + SQLite, or Python + FastAPI + SQLite, or file-based JSON/CSV + minimal server.
- **Hosting:** single frontend (static or SPA) + single backend service; no complex infra.

---

## 9. Out of scope (unless later requested)

- User authentication / multi-user.
- Real-time market data feeds or live pricing.
- Mobile app or native desktop app.
- Display of portfolio value or any absolute monetary figures.
- Extra pages beyond intro + dashboard.

---

When implementing, prioritise: **privacy (no value shown), simple backend, easy data entry, and a tech-savvy dark-mode dashboard with one clear YTD/1Y performance chart.**
