/**
 * Import top positions data from CSV.
 * Usage: node import-positions-csv.js <path-to.csv>
 *
 * CSV expected format:
 * Company,Ticker,Allocation %,Category
 * UnitedHealth Group Inc.,UNH,6.40%,Healthcare
 * "Amazon.com, Inc.",AMZN,4.20%,AI Hyperscaler
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const POSITIONS_URL = `${API_URL.replace(/\/$/, '')}/api/positions`;

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

function parseNumber(val) {
  if (val === '' || val == null) return null;
  const v = String(val).trim().replace(/%/g, '');
  if (v === '' || v.toLowerCase() === '#n/a') return null;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Assume header row with Company,Ticker,Allocation %,Category
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const company = (cells[0] ?? '').trim();
    const ticker = (cells[1] ?? '').trim();
    const allocationRaw = cells[2] ?? '';
    const allocation = parseNumber(allocationRaw);
    const category = (cells[3] ?? '').trim() || null;
    if (company && ticker) {
      rows.push({
        company,
        ticker,
        allocation: allocation ?? 0,
        category: category || undefined,
      });
    }
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node import-positions-csv.js <path-to.csv>');
    process.exit(1);
  }

  let content;
  try {
    content = readFileSync(resolve(csvPath), 'utf8');
  } catch (e) {
    console.error('Could not read file:', csvPath, e.message);
    process.exit(1);
  }

  const positions = parseCSV(content);
  if (positions.length === 0) {
    console.error('No positions found in CSV.');
    process.exit(1);
  }

  const res = await fetch(POSITIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ positions }),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    console.error('Import failed:', data.error || res.status);
    process.exit(1);
  }
  console.log(`Imported ${positions.length} positions.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

