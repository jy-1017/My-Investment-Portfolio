/**
 * Clear all performance data. Table structure is kept.
 * Usage: node clear-performance-data.js
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

  const result = db.exec('SELECT COUNT(*) as n FROM performance');
  const count = result[0] ? result[0].values[0][0] : 0;
  if (count === 0) {
    console.log('Performance table is already empty.');
    return;
  }

  db.run('DELETE FROM performance');
  const data = db.export();
  writeFileSync(dbPath, Buffer.from(data));
  console.log('Cleared', count, 'row(s). Performance table is now empty.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
