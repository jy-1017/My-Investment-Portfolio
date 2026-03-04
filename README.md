# Investment Portfolio Dashboard

My personal investment portfolio website: performance chart (YTD vs S&P 500), allocation pie chart, top positions table, and investing philosophy.

**This project was created with the assistance of Agentic AI tools.**

- **Frontend:** React + Vite + Recharts  
- **Backend:** Node + Express + sql.js (SQLite in-process)

## Prerequisites

- Node.js (v18+ recommended)

## Run locally

**1. Backend** (API + DB)

```bash
cd backend
npm install
npm start
```

Runs at `http://localhost:3000`. API: `/api/performance`, `/api/allocation`, `/api/positions`.

**2. Frontend** (dev server with API proxy)

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:5173`. Requests to `/api/*` are proxied to the backend.

## Environment

| Variable        | Where   | Default              | Description |
|----------------|--------|----------------------|-------------|
| `PORT`         | Backend| `3000`               | API server port |
| `DB_PATH`      | Backend| `backend/data/portfolio.db` | SQLite file path |
| `API_URL`      | Backend scripts | `http://localhost:3000` | Used by import scripts (e.g. `import-csv.js`) |
| `VITE_API_URL` | Frontend (build) | _(unset)_ | Set when building for production if the API is on a different origin (e.g. `https://your-api.railway.app`). Leave unset for same-origin or local dev. |

## Production build

```bash
cd frontend
npm run build
```

Output in `frontend/dist/`. For a **separate** API host, set `VITE_API_URL` when building, e.g.:

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

(No trailing slash.)

## Render deploy checklist (why CSV data might not show)

- **Redeploy both services** after pushing: use **Manual Deploy → Deploy latest commit** for both the **Static Site** (frontend) and **Web Service** (backend). The site uses CSV data from `frontend/src/defaultData.js` and, when the API is available, from `backend/data/portfolio.db`.
- **Frontend (Static Site):** Root Directory = `frontend`, Build Command = `npm run build`, Publish Directory = `dist`. Add env **`VITE_API_URL`** = your backend URL (e.g. `https://your-backend.onrender.com`, no trailing slash) so the app calls the API; if the API fails, it falls back to the embedded CSV defaults.
- **Backend (Web Service):** Root Directory = `backend`, Start Command = `npm start`. The repo includes `backend/data/portfolio.db`; ensure Build Filters / Included Paths don’t exclude `backend/data/` so the DB is in the deploy.

## Data import (backend)

From `backend/`:

- Performance (line chart): `node import-csv.js < path/to/performance.csv`
- Allocation (pie): `node import-allocation-csv.js < path/to/allocation.csv`
- Positions (table): `node import-positions-csv.js < path/to/positions.csv`

See sample CSVs in `backend/` and `docs/`.
