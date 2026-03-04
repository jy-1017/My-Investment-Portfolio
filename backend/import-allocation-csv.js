/**
 * Import allocation (pie chart) data from CSV.
 * Usage: node import-allocation-csv.js <path-to.csv>
 *
 * CSV: first column = Label, second = Weight (e.g. 25.20% or 25.2). Optional third column = Color (hex).
 * Header row is skipped. Examples: "Label,Weight" or ",Allocation %"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const ALLOCATION_URL = `${API_URL.replace(/\/$/, '')}/api/allocation`;

const DEFAULT_COLORS = [
  '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444',
  '#06b6d4', '#f97316', '#8b5cf6', '#ec4899', '#6b7280',
];

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
  const rawHeaders = parseCSVLine(lines[0]).map((c) => c.toLowerCase().replace(/\s+/g, ' '));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const label = (cells[0] ?? '').trim();
    const weightRaw = cells[1] ?? cells[rawHeaders.findIndex((h) => /weight|allocation|%/.test(h)) >= 0 ? cells[1] : ''];
    const weight = parseNumber(weightRaw);
    const color = (cells[2] ?? '').trim() || null;
    if (label) {
      rows.push({
        label,
        weight: weight ?? 0,
        color: color || undefined,
      });
    }
  }
  return rows;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node import-allocation-csv.js <path-to.csv>');
    process.exit(1);
  }

  let content;
  try {
    content = readFileSync(resolve(csvPath), 'utf8');
  } catch (e) {
    console.error('Could not read file:', csvPath, e.message);
    process.exit(1);
  }

  const slices = parseCSV(content);
  if (slices.length === 0) {
    console.error('No allocation rows found in CSV.');
    process.exit(1);
  }

  // Assign default colors where missing
  const defaultPalette = [...DEFAULT_COLORS];
  const slicesWithColor = slices.map((s, i) => ({
    ...s,
    color: s.color || defaultPalette[i % defaultPalette.length],
  }));

  const res = await fetch(ALLOCATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slices: slicesWithColor }),
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
  console.log(`Imported ${slices.length} allocation slices.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
