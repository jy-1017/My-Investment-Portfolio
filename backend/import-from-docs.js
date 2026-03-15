/**
 * Import data from the three docs CSVs directly into the database (no server needed).
 * Avoids duplicate performance rows by updating existing dates.
 * Usage: node import-from-docs.js [lineCsv] [pieCsv] [positionsCsv]
 * Default paths: ../docs/Line Chart Data.csv, ../docs/Pie Chart Data.csv, ../docs/Top Positions Data.csv
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsDir = join(__dirname, '..', 'docs');
const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'portfolio.db');

const LINE_CSV = process.argv[2] || join(docsDir, 'Line Chart Data.csv');
const PIE_CSV = process.argv[3] || join(docsDir, 'Pie Chart Data.csv');
const POSITIONS_CSV = process.argv[4] || join(docsDir, 'Top Positions Data.csv');

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

// ---- Line Chart (performance) ----
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

// ---- Pie Chart (allocation) ----
function parseAllocationCSV(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const label = (cells[0] ?? '').trim();
    const weight = parseNumber(cells[1] ?? '');
    const color = (cells[2] ?? '').trim() || null;
    if (label) rows.push({ label, weight: weight ?? 0, color });
  }
  return rows;
}

// ---- Top Positions ----
function parsePositionsCSV(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const company = (cells[0] ?? '').trim();
    const ticker = (cells[1] ?? '').trim();
    const allocation = parseNumber(cells[2] ?? '');
    const category = (cells[3] ?? '').trim() || null;
    if (company && ticker) rows.push({ company, ticker, allocation: allocation ?? 0, category });
  }
  return rows;
}

async function main() {
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

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
  db.run(`
    CREATE TABLE IF NOT EXISTS allocation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      weight REAL NOT NULL,
      color TEXT
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      ticker TEXT NOT NULL,
      allocation REAL NOT NULL,
      category TEXT
    );
  `);
  try { db.run('ALTER TABLE positions ADD COLUMN category TEXT'); } catch (_) {}

  const saveDb = () => {
    writeFileSync(dbPath, Buffer.from(db.export()));
  };

  // 1. Performance (upsert by date to avoid duplicates)
  let lineContent;
  try {
    lineContent = readFileSync(LINE_CSV, 'utf8');
  } catch (e) {
    console.error('Could not read Line Chart CSV:', LINE_CSV, e.message);
    process.exit(1);
  }
  const performanceRows = parsePerformanceCSV(lineContent);
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
  console.log(`Performance: ${inserted} inserted, ${updated} updated (no duplicates).`);

  // 2. Allocation (replace all)
  let pieContent;
  try {
    pieContent = readFileSync(PIE_CSV, 'utf8');
  } catch (e) {
    console.error('Could not read Pie Chart CSV:', PIE_CSV, e.message);
    process.exit(1);
  }
  const allocationRows = parseAllocationCSV(pieContent);
  const defaultColors = ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#8b5cf6'];
  db.run('DELETE FROM allocation');
  allocationRows.forEach((s, i) => {
    const color = s.color || defaultColors[i % defaultColors.length];
    db.run('INSERT INTO allocation (label, weight, color) VALUES (?, ?, ?)', [s.label, s.weight, color]);
  });
  console.log(`Allocation: ${allocationRows.length} slices replaced.`);

  // 3. Positions (replace all)
  let posContent;
  try {
    posContent = readFileSync(POSITIONS_CSV, 'utf8');
  } catch (e) {
    console.error('Could not read Top Positions CSV:', POSITIONS_CSV, e.message);
    process.exit(1);
  }
  const positionRows = parsePositionsCSV(posContent);
  db.run('DELETE FROM positions');
  positionRows.forEach((p) => {
    db.run(
      'INSERT INTO positions (company, ticker, allocation, category) VALUES (?, ?, ?, ?)',
      [p.company, p.ticker, p.allocation, p.category]
    );
  });
  console.log(`Positions: ${positionRows.length} positions replaced.`);

  saveDb();
  console.log('Database saved to', dbPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
