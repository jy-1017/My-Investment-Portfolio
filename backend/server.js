import express from 'express'
import cors from 'cors'
import initSqlJs from 'sql.js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const port = process.env.PORT || 3000
const dbPath = process.env.DB_PATH || join(__dirname, 'data', 'portfolio.db')

const dataDir = dirname(dbPath)
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const SQL = await initSqlJs()
const fileExistedAtStartup = existsSync(dbPath)
let db = fileExistedAtStartup
  ? new SQL.Database(readFileSync(dbPath))
  : new SQL.Database()

db.run(`
  CREATE TABLE IF NOT EXISTS performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    ytd REAL,
    one_year REAL,
    sp500 REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`)
try {
  db.run('ALTER TABLE performance ADD COLUMN sp500 REAL')
} catch (_) {
  // column may already exist
}

db.run(`
  CREATE TABLE IF NOT EXISTS allocation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    weight REAL NOT NULL,
    color TEXT
  );
`)
const allocationCount = db.exec('SELECT COUNT(*) FROM allocation')[0]?.values[0][0] ?? 0
const performanceCount = db.exec('SELECT COUNT(*) FROM performance')[0]?.values[0][0] ?? 0
if (allocationCount === 0) {
  const seed = [
    ['Equities', 45.3, '#3b82f6'],
    ['Bonds', 30, '#22c55e'],
    ['Cash', 10, '#eab308'],
    ['Alternatives', 14.7, '#a855f7'],
  ]
  seed.forEach(([label, weight, color]) => {
    db.run('INSERT INTO allocation (label, weight, color) VALUES (?, ?, ?)', [label, weight, color])
  })
  // Only write to disk if we aren't overwriting existing performance data with an empty table
  if (!fileExistedAtStartup || performanceCount > 0) {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  }
}

db.run(`
  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    ticker TEXT NOT NULL,
    allocation REAL NOT NULL,
    category TEXT
  );
`)
try {
  db.run('ALTER TABLE positions ADD COLUMN category TEXT')
} catch (_) {
  // column may already exist
}

function saveDb() {
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/performance', (req, res) => {
  try {
    const result = db.exec(
      'SELECT date, ytd, one_year AS oneYear, sp500 FROM performance ORDER BY date'
    )
    const rows = result[0] ? result[0].values : []
    const chartData = rows.map((r) => ({
      date: r[0],
      ytd: r[1] != null && r[1] !== '' ? Number(r[1]) : null,
      oneYear: r[2] != null && r[2] !== '' ? Number(r[2]) : null,
      sp500: r[3] != null && r[3] !== '' ? Number(r[3]) : null,
    }))
    res.json({ chartData })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/allocation', (req, res) => {
  try {
    const result = db.exec('SELECT label, weight, color FROM allocation ORDER BY id')
    const rows = result[0] ? result[0].values : []
    const slices = rows.map((r) => ({
      label: r[0],
      weight: r[1] != null && r[1] !== '' ? Number(r[1]) : null,
      color: r[2] || null,
    }))
    res.json({ slices })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/allocation', (req, res) => {
  const { slices } = req.body || {}
  if (!Array.isArray(slices) || slices.length === 0) {
    return res.status(400).json({ error: 'slices array is required' })
  }
  try {
    db.run('DELETE FROM allocation')
    for (const s of slices) {
      const label = s.label != null ? String(s.label).trim() : ''
      const weight = s.weight != null && s.weight !== '' ? Number(s.weight) : null
      const color = s.color != null ? String(s.color).trim() : null
      if (label) {
        db.run('INSERT INTO allocation (label, weight, color) VALUES (?, ?, ?)', [label, weight, color])
      }
    }
    saveDb()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/positions', (req, res) => {
  try {
    const result = db.exec('SELECT company, ticker, allocation, category FROM positions ORDER BY allocation DESC')
    const rows = result[0] ? result[0].values : []
    const positions = rows.map((r) => ({
      company: r[0],
      ticker: r[1],
      allocation: r[2] != null && r[2] !== '' ? Number(r[2]) : null,
      category: r[3] ?? null,
    }))
    res.json({ positions })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/positions', (req, res) => {
  const { positions } = req.body || {}
  if (!Array.isArray(positions) || positions.length === 0) {
    return res.status(400).json({ error: 'positions array is required' })
  }
  try {
    db.run('DELETE FROM positions')
    for (const p of positions) {
      const company = p.company != null ? String(p.company).trim() : ''
      const ticker = p.ticker != null ? String(p.ticker).trim() : ''
      const allocation =
        p.allocation != null && p.allocation !== '' ? Number(p.allocation) : null
      const category = p.category != null ? String(p.category).trim() : null
      if (company && ticker) {
        db.run(
          'INSERT INTO positions (company, ticker, allocation, category) VALUES (?, ?, ?, ?)',
          [company, ticker, allocation ?? 0, category]
        )
      }
    }
    saveDb()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/performance', (req, res) => {
  const { date, ytd, oneYear, sp500 } = req.body || {}
  if (!date) {
    return res.status(400).json({ error: 'date is required' })
  }
  try {
    db.run(
      'INSERT INTO performance (date, ytd, one_year, sp500) VALUES (?, ?, ?, ?)',
      [date, ytd ?? null, oneYear ?? null, sp500 ?? null]
    )
    saveDb()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`)
})
