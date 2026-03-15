/**
 * Import only performance (line chart) data from one CSV directly into the database.
 * Upserts by date to avoid duplicates. No server needed.
 * Usage: node import-line-chart-only.js [pathToLineChartData.csv]
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');
const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'portfolio.db');
const LINE_CSV = process.argv[2] || join(docsDir, 'Line Chart Data.csv');

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const HEADER_ALIASES = {
  date: 'date', ytd: 'ytd', oneyear: 'oneYear', '1 year': 'oneYear', '1y': 'oneYear',
  's&p 500': 'sp500', 's&p500': 'sp500', sp500: 'sp500',
};

function parseCSVLine(line) {
  const cells = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (line[i] === '"') { cell += '"'; i++; } else break;
        } else cell += line[i++];
      }
      cells.push(cell.trim());
      if (line[i] === ',') i++;
    } else {
      let cell = '';
      while (i < line.length && line[i] !== ',') cell += line[i++];
      cells.push(cell.trim());
      if (i < line.length) i++;
    }
  }
  return cells;
}

function parseNumber(val) {
  if (val === '' || val == null) return null;
  const v = String(val).trim();
  if (v.toLowerCase() === '#n/a' || v === '') return null;
  const n = Number(v.replace(/,/g, '').replace(/%/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDate(input) {
  const s = (input || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const match = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (match) {
    const [, day, monthStr, yy] = match;
    const month = MONTH_NAMES.indexOf(monthStr.toLowerCase());
    if (month === -1) return s;
    const year = 2000 + parseInt(yy, 10);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(parseInt(day, 10)).padStart(2, '0')}`;
  }
  return s;
}

function parsePerformanceCSV(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rawHeaders = parseCSVLine(lines[0]).map((c) => c.toLowerCase().replace(/\s+/g, ' '));
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h.replace(/\s+/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((name, idx) => { if (name) row[name] = cells[idx] ?? ''; });
    rows.push(row);
  }
  return rows.map((row) => {
    const dateRaw = (row.date || row.Date || '').trim();
    const date = parseDate(dateRaw) || dateRaw;
    const ytd = parseNumber(row.ytd ?? row.YTD);
    const oneYear = parseNumber(row.oneYear ?? row['1 year'] ?? row['1y']);
    const sp500 = parseNumber(row.sp500 ?? row['s&p 500'] ?? row['s&p500']);
    return { date, ytd, oneYear, sp500 };
  }).filter((r) => r.date);
}

async function main() {
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  let content;
  try {
    content = readFileSync(LINE_CSV, 'utf8');
  } catch (e) {
    console.error('Could not read CSV:', LINE_CSV, e.message);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = existsSync(dbPath)
    ? new SQL.Database(readFileSync(dbPath))
    : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      ytd REAL,
      one_year REAL,
      sp500 REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  try { db.run('ALTER TABLE performance ADD COLUMN sp500 REAL'); } catch (_) {}

  const performanceRows = parsePerformanceCSV(content);
  const checkStmt = db.prepare('SELECT 1 FROM performance WHERE date = ?');
  const updateStmt = db.prepare('UPDATE performance SET ytd = ?, one_year = ?, sp500 = ? WHERE date = ?');
  const insertStmt = db.prepare('INSERT INTO performance (date, ytd, one_year, sp500) VALUES (?, ?, ?, ?)');
  let updated = 0, inserted = 0;
  for (const r of performanceRows) {
    checkStmt.bind([r.date]);
    const exists = checkStmt.step();
    checkStmt.reset();
    if (exists) {
      updateStmt.run([r.ytd, r.oneYear, r.sp500, r.date]);
      updated++;
    } else {
      insertStmt.run([r.date, r.ytd ?? null, r.oneYear ?? null, r.sp500 ?? null]);
      inserted++;
    }
  }
  checkStmt.free();
  updateStmt.free();
  insertStmt.free();

  writeFileSync(dbPath, Buffer.from(db.export()));
  console.log(`Performance: ${inserted} inserted, ${updated} updated (no duplicates). Database saved.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
