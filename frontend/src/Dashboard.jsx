import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

/* Body font for charts (matches CSS --font-body: Inter stack) */
const FONT_BODY = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"

/* API base URL: set VITE_API_URL in build env for production (e.g. https://your-api.railway.app). Leave unset for dev (Vite proxy) or same-origin deploy. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

const DEFAULT_ALLOCATION = [
  { label: 'Equities', weight: 45.3, color: '#3b82f6' },
  { label: 'Bonds', weight: 30, color: '#22c55e' },
  { label: 'Cash', weight: 10, color: '#eab308' },
  { label: 'Alternatives', weight: 14.7, color: '#a855f7' },
]

const DEFAULT_POSITIONS = [
  { company: 'UnitedHealth Group Inc.', ticker: 'UNH', allocation: 6.4, category: 'Healthcare' },
  { company: 'Amazon.com, Inc.', ticker: 'AMZN', allocation: 4.2, category: 'AI Hyperscaler' },
  { company: 'Alphabet Inc.', ticker: 'GOOGL', allocation: 3.7, category: 'AI Hyperscaler' },
]

export default function Dashboard() {
  const [chartData, setChartData] = useState([])
  const [allocationSlices, setAllocationSlices] = useState(DEFAULT_ALLOCATION)
  const [topPositions, setTopPositions] = useState(DEFAULT_POSITIONS)

  useEffect(() => {
    fetch(`${API_BASE}/api/performance`)
      .then((res) => res.json())
      .then((data) => setChartData(data.chartData || []))
      .catch(() => setChartData(sampleChartData()))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/allocation`)
      .then((res) => res.json())
      .then((data) => setAllocationSlices(data.slices?.length ? data.slices : DEFAULT_ALLOCATION))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/positions`)
      .then((res) => res.json())
      .then((data) => {
        const next =
          Array.isArray(data.positions) && data.positions.length
            ? data.positions
            : DEFAULT_POSITIONS
        setTopPositions(next)
      })
      .catch(() => {})
  }, [])

  return (
    <section className="dashboard">
      <h2>YTD % Performance vs S&P 500 % Change</h2>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 12, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis
              dataKey="date"
              stroke="#8b949e"
              tick={{ fill: '#8b949e', fontSize: 11, fontFamily: FONT_BODY }}
              tickFormatter={(d) => {
                if (!d || d.length < 10) return d
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                const monthNum = parseInt(d.slice(5, 7), 10)
                const monthStr = months[monthNum - 1] || d.slice(5, 7)
                const day = d.slice(8, 10)
                return `${day}/${monthStr}`
              }}
            />
            <YAxis
              stroke="#8b949e"
              tick={{ fill: '#8b949e', fontFamily: FONT_BODY }}
              domain={['auto', 'auto']}
              tickFormatter={(v) => (v != null && v !== '' ? `${v}%` : '')}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                fontFamily: FONT_BODY,
              }}
              labelStyle={{ color: '#e6edf3', fontFamily: FONT_BODY }}
              labelFormatter={(label) => label}
            />
            <Legend wrapperStyle={{ fontFamily: FONT_BODY }} />
            <Line
              type="monotone"
              dataKey="ytd"
              name="YTD % Change"
              stroke="#58a6ff"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="sp500"
              name="S&P 500 % Change"
              stroke="#1e40af"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h2 className="allocation-heading">Assets Allocation</h2>
      <div className="allocation-wrap">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={allocationSlices}
              dataKey="weight"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={({ label, weight }) => `${label} ${weight}%`}
              labelLine={{ stroke: '#8b949e' }}
            >
              {allocationSlices.map((entry, i) => (
                <Cell key={entry.label} fill={entry.color || '#6b7280'} />
              ))}
            </Pie>
            <Tooltip
              wrapperStyle={{ color: '#fff', fontFamily: FONT_BODY }}
              contentStyle={{
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#fff',
                fontFamily: FONT_BODY,
              }}
              labelStyle={{ color: '#fff', fontFamily: FONT_BODY }}
              itemStyle={{ color: '#fff', fontFamily: FONT_BODY }}
              formatter={(value) => [`${value}%`, 'Weight']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <h2 className="positions-heading">Top Companies Positions</h2>
      <div className="positions-wrap">
        <table className="positions-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Ticker</th>
              <th>Category</th>
              <th>Allocation %</th>
            </tr>
          </thead>
          <tbody>
            {topPositions.map((pos) => (
              <tr key={pos.ticker}>
                <td>{pos.company}</td>
                <td>{pos.ticker}</td>
                <td>{pos.category ?? '—'}</td>
                <td>{pos.allocation}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="philosophy-heading">My Investing Routine and Philosophy</h2>
      <ul className="philosophy-list">
        <li>The portfolio is split into smaller Equity/BTC/Gold Portfolios with a dynamic ratio relative to T-Bills</li>
        <li>Positions last a long-term horizon (&gt;2 years), small tactical rebalancings swing trade sentiment cycles, especially in volatile assets like Bitcoin</li>
        <li>Disciplined, small weekly DCA rebalancing every Tuesday guided by macroeconomic headwinds, sentiment indicators (fear &amp; greed), technical analysis etc.</li>
      </ul>
    </section>
  )
}

function sampleChartData() {
  const points = []
  const now = new Date()
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    points.push({
      date: dateStr,
      ytd: 100 + (30 - i) * 0.5 + Math.random() * 1,
      sp500: null,
    })
  }
  return points
}
