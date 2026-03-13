'use client'

/**
 * ChartBuilder — Build Your Own Chart
 *
 * Users select X/Y axes, actors (multi-select, up to 10), industry filter,
 * and year range to generate custom SVG charts.
 *
 * Chart types auto-selected based on X axis:
 *   year | decade → Line chart (animated stroke-dashoffset)
 *   actor | industry | director → Grouped bar chart
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { searchActors, getChartData, type Actor, type ChartData, type ChartSeries } from '@/lib/api'
import ActorAvatar from '@/components/ActorAvatar'

// ── Constants ─────────────────────────────────────────────────────────────────

const X_OPTIONS = [
  { value: 'year',     label: 'Year' },
  { value: 'decade',   label: 'Decade' },
  { value: 'actor',    label: 'Actor' },
  { value: 'industry', label: 'Industry' },
  { value: 'director', label: 'Director' },
]

const Y_OPTIONS = [
  { value: 'film_count',              label: 'Film Count' },
  { value: 'avg_rating',              label: 'Avg Rating' },
  { value: 'unique_costars',          label: 'Unique Co-Stars' },
  { value: 'director_collaborations', label: 'Director Collaborations' },
  { value: 'total_collaborations',    label: 'Total Collaborations' },
]

const INDUSTRY_OPTIONS = ['All', 'Tamil', 'Telugu', 'Malayalam', 'Kannada']

const ACTOR_COLORS = [
  '#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6',
  '#10b981', '#3b82f6', '#ec4899', '#84cc16', '#f97316', '#a855f7',
]

const INDUSTRY_COLOR: Record<string, string> = {
  Tamil: '#f43f5e', Telugu: '#f59e0b', Malayalam: '#06b6d4', Kannada: '#8b5cf6', Unknown: '#6b7280',
}

// ── Tiny actor search picker ───────────────────────────────────────────────────

function ActorPicker({
  selectedActors,
  onAdd,
  onRemove,
}: {
  selectedActors: Actor[]
  onAdd: (a: Actor) => void
  onRemove: (id: number) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Actor[]>([])
  const [open, setOpen] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>()

  const search = useCallback((q: string) => {
    setQuery(q)
    clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      const res = await searchActors(q, true).catch(() => [])
      const filtered = res.filter(a => !selectedActors.find(s => s.id === a.id))
      setResults(filtered.slice(0, 6))
      setOpen(filtered.length > 0)
    }, 200)
  }, [selectedActors])

  return (
    <div className="space-y-3">
      {/* Selected actors */}
      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {selectedActors.map((a, i) => (
          <div
            key={a.id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
            style={{ background: ACTOR_COLORS[i % ACTOR_COLORS.length] + '33', border: `1px solid ${ACTOR_COLORS[i % ACTOR_COLORS.length]}66` }}
          >
            <div className="w-2 h-2 rounded-full" style={{ background: ACTOR_COLORS[i % ACTOR_COLORS.length] }} />
            {a.name}
            <button onClick={() => onRemove(a.id)} className="ml-1 text-white/60 hover:text-white text-xs">✕</button>
          </div>
        ))}
        {selectedActors.length === 0 && (
          <span className="text-white/25 text-sm italic">No actors selected yet</span>
        )}
      </div>

      {/* Add actor search */}
      {selectedActors.length < 10 && (
        <div className="relative">
          <input
            className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/25 transition-colors"
            placeholder="+ Add actor (search by name)…"
            value={query}
            onChange={e => search(e.target.value)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onFocus={() => results.length > 0 && setOpen(true)}
          />
          {open && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 border border-white/[0.10]" style={{ background: '#1a1a2e' }}>
              {results.map(a => (
                <button
                  key={a.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { onAdd(a); setQuery(''); setResults([]); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.08] transition-colors text-left border-b border-white/[0.05] last:border-0"
                >
                  <ActorAvatar name={a.name} size={28} />
                  <span className="text-sm text-white">{a.name}</span>
                  <span className="text-xs text-white/40 ml-auto">{a.industry}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function LineChart({ data }: { data: ChartData }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [data])

  if (!data.series.length || !data.series[0].points.length) return null

  const W = 800, H = 320, PAD = { top: 24, right: 20, bottom: 40, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // Collect all x values (years)
  const allX = [...new Set(data.series.flatMap(s => s.points.map(p => Number(p.x))))].sort((a, b) => a - b)
  const allY = data.series.flatMap(s => s.points.map(p => p.y))
  const minY = 0, maxY = Math.max(...allY) * 1.1 || 1

  const xScale = (x: number) => PAD.left + ((x - allX[0]) / (allX[allX.length - 1] - allX[0] || 1)) * innerW
  const yScale = (y: number) => PAD.top + innerH - ((y - minY) / (maxY - minY)) * innerH

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + (maxY - minY) * i / 4)
  // X-axis ticks (every 5 years or so)
  const step = Math.max(1, Math.ceil(allX.length / 10))
  const xTicks = allX.filter((_, i) => i % step === 0)

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="white" strokeOpacity={0.06} />
          <text x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">
            {t % 1 === 0 ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <text key={i} x={xScale(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">
          {t}
        </text>
      ))}

      {/* Lines */}
      {data.series.map((s, si) => {
        const color = ACTOR_COLORS[si % ACTOR_COLORS.length]
        const pts = s.points.map(p => ({ x: xScale(Number(p.x)), y: yScale(p.y) }))
        const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        const totalLen = pts.reduce((acc, p, i) => {
          if (i === 0) return 0
          const prev = pts[i - 1]
          return acc + Math.hypot(p.x - prev.x, p.y - prev.y)
        }, 0)
        return (
          <g key={s.actor_id}>
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={totalLen}
              strokeDashoffset={animated ? 0 : totalLen}
              style={{ transition: `stroke-dashoffset ${0.8 + si * 0.2}s ease-out` }}
            />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} opacity={animated ? 1 : 0}
                style={{ transition: `opacity 0.3s ${0.8 + si * 0.2}s` }} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────────

function BarChart({ data }: { data: ChartData }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [data])

  if (!data.series.length || !data.series[0].points.length) return null

  const categories = data.series[0].points.map(p => String(p.x))
  const numSeries = data.series.length
  const W = 800, H = 300, PAD = { top: 20, right: 20, bottom: 48, left: 52 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxY = Math.max(...data.series.flatMap(s => s.points.map(p => p.y))) * 1.1 || 1
  const yTicks = Array.from({ length: 5 }, (_, i) => maxY * i / 4)
  const yScale = (y: number) => PAD.top + innerH - (y / maxY) * innerH

  const groupW = innerW / categories.length
  const barW = Math.min(32, (groupW * 0.8) / numSeries)
  const barGap = barW * 0.15

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
      {/* Grid */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="white" strokeOpacity={0.06} />
          <text x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">
            {t % 1 === 0 ? Math.round(t) : t.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Bars */}
      {categories.map((cat, ci) => {
        const groupX = PAD.left + ci * groupW + groupW / 2 - (numSeries * (barW + barGap)) / 2
        return (
          <g key={cat}>
            {data.series.map((s, si) => {
              const val = s.points[ci]?.y ?? 0
              const bx = groupX + si * (barW + barGap)
              const bh = animated ? (val / maxY) * innerH : 0
              const by = yScale(val)
              const color = ACTOR_COLORS[si % ACTOR_COLORS.length]
              return (
                <rect
                  key={s.actor_id}
                  x={bx}
                  y={by}
                  width={barW}
                  height={bh}
                  rx={3}
                  fill={color}
                  opacity={0.85}
                  style={{ transition: `y 0.5s ${si * 0.08}s ease-out, height 0.5s ${si * 0.08}s ease-out` }}
                />
              )
            })}
            {/* Category label */}
            <text
              x={PAD.left + ci * groupW + groupW / 2}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize={categories.length > 8 ? 8 : 10}
              fill="rgba(255,255,255,0.5)"
            >
              {cat.length > 14 ? cat.slice(0, 13) + '…' : cat}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function Legend({ series }: { series: ChartData['series'] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {series.map((s, i) => (
        <div key={s.actor_id} className="flex items-center gap-1.5 text-xs text-white/60">
          <div className="w-3 h-3 rounded-sm" style={{ background: ACTOR_COLORS[i % ACTOR_COLORS.length] }} />
          {s.actor_name}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ChartBuilder() {
  const [selectedActors, setSelectedActors] = useState<Actor[]>([])
  const [xAxis, setXAxis] = useState('year')
  const [yAxis, setYAxis] = useState('film_count')
  const [industry, setIndustry] = useState('All')
  const [yearFrom, setYearFrom] = useState(1970)
  const [yearTo, setYearTo] = useState(2024)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addActor = (a: Actor) => {
    if (selectedActors.length >= 10) return
    setSelectedActors(prev => [...prev, a])
    setChartData(null)
  }
  const removeActor = (id: number) => {
    setSelectedActors(prev => prev.filter(a => a.id !== id))
    setChartData(null)
  }

  const buildChart = async () => {
    if (selectedActors.length === 0 && xAxis !== 'industry') {
      setError('Select at least one actor to build a chart.')
      return
    }
    setLoading(true); setError(null)
    try {
      const data = await getChartData(
        xAxis, yAxis,
        selectedActors.map(a => a.id),
        industry === 'All' ? undefined : industry,
        xAxis === 'year' ? yearFrom : undefined,
        xAxis === 'year' ? yearTo : undefined,
      )
      setChartData(data)
    } catch {
      setError('Failed to build chart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const yLabel = Y_OPTIONS.find(o => o.value === yAxis)?.label ?? yAxis
  const xLabel = X_OPTIONS.find(o => o.value === xAxis)?.label ?? xAxis

  // Quick-start presets
  const presets = [
    { label: 'Rajini vs Kamal — film count over time', actors: [{ id: 4, name: 'Rajinikanth', industry: 'Tamil' }, { id: 3, name: 'Kamal Haasan', industry: 'Tamil' }], x: 'year', y: 'film_count' },
    { label: 'Big 3 Malayalam — co-stars by decade', actors: [{ id: 381, name: 'Mohanlal', industry: 'Malayalam' }, { id: 10, name: 'Mammootty', industry: 'Malayalam' }, { id: 9, name: 'Fahadh Faasil', industry: 'Malayalam' }], x: 'decade', y: 'unique_costars' },
    { label: 'Telugu stars — rating comparison', actors: [{ id: 1, name: 'Allu Arjun', industry: 'Telugu' }, { id: 37, name: 'Mahesh Babu', industry: 'Telugu' }, { id: 2, name: 'Prabhas', industry: 'Telugu' }], x: 'actor', y: 'avg_rating' },
  ]

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">📊</span>
        <h2 className="text-white font-bold text-lg">Build Your Own Chart</h2>
      </div>
      <p className="text-white/40 text-sm mb-6">
        Select actors, axes, and filters to create custom cinema analytics charts.
      </p>

      {/* Quick-start presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setSelectedActors(p.actors as Actor[])
              setXAxis(p.x); setYAxis(p.y)
              setChartData(null)
            }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/[0.12] text-white/50 hover:text-white hover:border-white/25 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Actor multi-select */}
        <div className="lg:col-span-2">
          <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Actors (up to 10)</label>
          <ActorPicker selectedActors={selectedActors} onAdd={addActor} onRemove={removeActor} />
        </div>

        {/* Axis selectors */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">X Axis</label>
            <select
              value={xAxis}
              onChange={e => { setXAxis(e.target.value); setChartData(null) }}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/25 transition-colors"
            >
              {X_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Y Axis</label>
            <select
              value={yAxis}
              onChange={e => { setYAxis(e.target.value); setChartData(null) }}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/25 transition-colors"
            >
              {Y_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Industry</label>
          <div className="flex gap-1.5">
            {INDUSTRY_OPTIONS.map(ind => (
              <button
                key={ind}
                onClick={() => { setIndustry(ind); setChartData(null) }}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                  industry === ind
                    ? 'bg-white/15 text-white'
                    : 'text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/20'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {xAxis === 'year' && (
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Year Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1950} max={2024} value={yearFrom}
                onChange={e => { setYearFrom(Number(e.target.value)); setChartData(null) }}
                className="w-20 bg-white/[0.05] border border-white/[0.10] rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center"
              />
              <span className="text-white/30 text-sm">–</span>
              <input
                type="number" min={1950} max={2026} value={yearTo}
                onChange={e => { setYearTo(Number(e.target.value)); setChartData(null) }}
                className="w-20 bg-white/[0.05] border border-white/[0.10] rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center"
              />
            </div>
          </div>
        )}

        <div className="ml-auto flex items-end">
          <button
            onClick={buildChart}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}
          >
            {loading ? 'Building…' : '▶ Build Chart'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Chart area */}
      {chartData ? (
        <div>
          <div className="text-xs text-white/30 mb-4">
            {xLabel} vs {yLabel}
            {industry !== 'All' && ` · ${industry}`}
            {xAxis === 'year' && ` · ${yearFrom}–${yearTo}`}
          </div>
          {chartData.chart_type === 'line' ? (
            <LineChart data={chartData} />
          ) : (
            <BarChart data={chartData} />
          )}
          <Legend series={chartData.series} />
        </div>
      ) : !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <div className="text-5xl mb-3">📈</div>
          <p className="text-sm">Configure your axes above and click Build Chart</p>
        </div>
      )}
    </div>
  )
}
