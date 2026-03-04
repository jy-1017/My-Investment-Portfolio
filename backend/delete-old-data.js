/**
 * One-off: delete performance rows for Jan, Feb, Mar 2024.
 * Usage: node delete-old-data.js
 */

import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'portfolio.db');

async function main() {
  if (!existsSync(dbPath)) {
    console.error('Database not found:', dbPath);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync(dbPath));

  // Find rows in Jan, Feb, Mar 2024
  const result = db.exec(
    "SELECT id, date, ytd, one_year FROM performance WHERE date LIKE '2024-01%' OR date LIKE '2024-02%' OR date LIKE '2024-03%' ORDER BY date"
  );
  const rows = result[0] ? result[0].values : [];
  if (rows.length === 0) {
    console.log('No rows found for Jan/Feb/Mar 2024.');
    return;
  }

  console.log('Found', rows.length, 'row(s) to delete:');
  rows.forEach((r) => console.log('  ', r[1], '| ytd:', r[2], '| one_year:', r[3]));

  db.run(
    "DELETE FROM performance WHERE date LIKE '2024-01%' OR date LIKE '2024-02%' OR date LIKE '2024-03%'"
  );
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
  console.log('Deleted', rows.length, 'row(s). Database saved.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
