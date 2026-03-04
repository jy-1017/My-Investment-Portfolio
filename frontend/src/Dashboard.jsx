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
import { DEFAULT_CHART_DATA, DEFAULT_ALLOCATION, DEFAULT_POSITIONS } from './defaultData'

/* Body font for charts (matches CSS --font-body: Inter stack) */
const FONT_BODY = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"

/* API base URL: set VITE_API_URL in build env for production (e.g. https://your-api.railway.app). Leave unset for dev (Vite proxy) or same-origin deploy. */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export default function Dashboard() {
  const [chartData, setChartData] = useState(DEFAULT_CHART_DATA)
  const [allocationSlices, setAllocationSlices] = useState(DEFAULT_ALLOCATION)
  const [topPositions, setTopPositions] = useState(DEFAULT_POSITIONS)

  useEffect(() => {
    fetch(`${API_BASE}/api/performance`)
      .then((res) => res.json())
      .then((data) => setChartData(data.chartData?.length ? data.chartData : DEFAULT_CHART_DATA))
      .catch(() => setChartData(DEFAULT_CHART_DATA))
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/api/allocation`)
      .then((res) => res.json())
      .then((data) => setAllocationSlices(data.slices?.length ? data.slices : DEFAULT_ALLOCATION))
      .catch(() => setAllocationSlices(DEFAULT_ALLOCATION))
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
      .catch(() => setTopPositions(DEFAULT_POSITIONS))
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

