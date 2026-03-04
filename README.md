# Personal Investment Portfolio Public Dashboard

Posted on https://my-investment-portfolio.onrender.com via Render.com

My personal investment portfolio website: performance chart (Inception to Date vs S&P 500), allocation pie chart, top positions table, and investing philosophy.

Monorepo: frontend (React, Vite, Recharts) built to static assets and served from a CDN; backend (Node, Express, sql.js) runs as a single-instance Web Service with a file-based SQLite DB. CSVs are the source of truth, imported into the DB and mirrored into frontend default data for fast load and API fallback. Frontend calls the API when VITE_API_URL is set; otherwise it uses embedded defaults. Created with Cursor.
