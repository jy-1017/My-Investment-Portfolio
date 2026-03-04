/**
 * CSV import script for performance data.
 * Usage: node import-csv.js <path-to.csv>
 * Example: node import-csv.js performance_march_2025.csv
 *
 * Supports:
 * - Columns: Date, YTD, S&P 500 (or date, ytd, sp500, oneYear). Extra columns (e.g. Dummy) are ignored.
 * - Date formats: YYYY-MM-DD or DD-Mon-YY (e.g. 22-Sep-25, 01-Oct-25).
 * - YTD: numbers, with or without commas or % (e.g. "3,722,947" or "0.17%" or "-2.75%"); #N/A or empty → null.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000/api/performance';

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Normalize header to match expected keys
const HEADER_ALIASES = {
  date: 'date',
  ytd: 'ytd',
  oneyear: 'oneYear',
  '1 year': 'oneYear',
  '1y': 'oneYear',
  's&p 500': 'sp500',
  's&p500': 'sp500',
  sp500: 'sp500',
};

/** Parse one CSV line respecting quoted fields (e.g. "3,722,947"). */
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
          if (line[i] === '"') {
            cell += '"';
            i++;
          } else break;
        } else {
          cell += line[i++];
        }
      }
      cells.push(cell.trim());
      if (line[i] === ',') i++;
    } else {
      let cell = '';
      while (i < line.length && line[i] !== ',') {
        cell += line[i++];
      }
      cells.push(cell.trim());
      if (i < line.length) i++;
    }
  }
  return cells;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const rawHeaders = parseCSVLine(lines[0]).map((c) => c.toLowerCase().replace(/\s+/g, ' '));
  const headers = rawHeaders.map((h) => HEADER_ALIASES[h] || h.replace(/\s+/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((name, idx) => {
      if (name) row[name] = cells[idx] ?? '';
    });
    rows.push(row);
  }
  return { headers, rows };
}

/** Parse DD-Mon-YY or DD-MMM-YY to YYYY-MM-DD; pass through YYYY-MM-DD. */
function parseDate(input) {
  const s = (input || '').trim();
  if (!s) return '';
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-Mon-YY or DD-MMM-YY
  const match = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (match) {
    const [, day, monthStr, yy] = match;
    const month = MONTH_NAMES.indexOf(monthStr.toLowerCase());
    if (month === -1) return s;
    const year = 2000 + parseInt(yy, 10);
    const d = String(parseInt(day, 10)).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }
  return s;
}

/** Parse number: strip commas and %; #N/A or empty → null. */
function parseNumber(val) {
  if (val === '' || val == null) return null;
  const v = String(val).trim();
  if (v.toLowerCase() === '#n/a' || v === '') return null;
  const cleaned = v.replace(/,/g, '').replace(/%/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(row) {
  const dateRaw = (row.date || row.Date || '').trim();
  const date = parseDate(dateRaw) || dateRaw;
  const ytd = parseNumber(row.ytd ?? row.YTD);
  const oneYear = parseNumber(row.oneYear ?? row['1 year'] ?? row['1y']);
  const sp500 = parseNumber(row.sp500 ?? row['s&p 500'] ?? row['s&p500']);
  return { date, ytd, oneYear, sp500 };
}

async function postRow(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node import-csv.js <path-to.csv>');
    console.error('Example: node import-csv.js performance_march_2025.csv');
    process.exit(1);
  }

  let content;
  try {
    const fullPath = resolve(csvPath);
    content = readFileSync(fullPath, 'utf8');
  } catch (e) {
    console.error('Could not read file:', csvPath);
    console.error(e.message);
    process.exit(1);
  }

  const { rows } = parseCSV(content);
  if (rows.length === 0) {
    console.error('No data rows found in CSV (header-only or empty file).');
    process.exit(1);
  }

  let imported = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const payload = buildPayload(rows[i]);
    const rowNum = i + 2; // 1-based, +1 for header
    if (!payload.date) {
      errors.push({ row: rowNum, message: 'date is required' });
      continue;
    }
    try {
      await postRow(payload);
      imported++;
    } catch (e) {
      errors.push({
        row: rowNum,
        message: e.body?.error || e.message,
      });
    }
  }

  if (errors.length > 0) {
    errors.forEach(({ row, message }) => {
      console.error(`Row ${row}: ${message}`);
    });
  }

  console.log(`Imported ${imported} rows.`);
  if (errors.length > 0) {
    console.error(`Failed ${errors.length} rows.`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
