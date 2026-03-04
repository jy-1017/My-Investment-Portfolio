# Personal Investment Portfolio Public Dashboard

https://my-investment-portfolio.onrender.com

My personal investment portfolio website, includes a performance line chart vs S&P 500, allocation pie chart, top companies positions table, and brief notes on investing philosophy.

Frontend (React, Vite, Recharts) built to static assets and served from Render
Backend (Node, Express, sql.js) runs as a single-instance Web Service with a file-based SQLite DB. Manually updated CSVs are the source of truth, imported into the DB and mirrored into frontend default data for fast load and API fallback. 
Frontend calls the API when VITE_API_URL is set; otherwise it uses embedded defaults. 
Created with Cursor.
