'use client'

/**
 * ChartBuilder — Build Your Own Chart
 *
 * Chart type auto-selected by X axis + actor count:
 *   year               → SVG line chart (animated stroke-dashoffset)
 *   decade / actor /
 *   industry           → SVG grouped vertical bar chart
 *   director + 1 actor → horizontal bar chart (ranked directors)
 *   director + 2+actors→ scatter plot (shared-director overlap)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { searchActors, getChartData, type Actor, type ChartData } from '@/lib/api'
import ActorAvatar from '@/components/ActorAvatar'

// ── Constants ─────────────────────────────────────────────────────────────────

const X_OPTIONS = [
  { value: 'year',     label: 'Year' },
  { value: 'decade',   label: 'Decade' },
  { value: 'actor',    label: 'Actor' },
  { value: 'industry', label: 'Industry' },
  { value: 'director', label: 'Director' },
]

// Director Collaborations is meaningless on a Director axis (always = 1)
// — hidden dynamically when xAxis === 'director'
const Y_OPTIONS = [
  { value: 'film_count',              label: 'Film Count', directorOk: true },
  { value: 'avg_rating',              label: 'Avg Rating', directorOk: true },
  { value: 'unique_costars',          label: 'Unique Co-Stars', directorOk: false },
  { value: 'director_collaborations', label: 'Director Collaborations', directorOk: false },
  { value: 'total_collaborations',    label: 'Total Collaborations', directorOk: false },
]

const INDUSTRY_OPTIONS = ['All', 'Tamil', 'Telugu', 'Malayalam', 'Kannada']

const ACTOR_COLORS = [
  '#f43f5e', '#f59e0b', '#06b6d4', '#8b5cf6',
  '#10b981', '#3b82f6', '#ec4899', '#84cc16', '#f97316', '#a855f7',
]

// ── Actor picker ───────────────────────────────────────────────────────────────

function ActorPicker({ selectedActors, onAdd, onRemove }: {
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
      <div className="flex flex-wrap gap-2 min-h-[36px]">
        {selectedActors.map((a, i) => (
          <div key={a.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
            style={{ background: ACTOR_COLORS[i % ACTOR_COLORS.length] + '33', border: `1px solid ${ACTOR_COLORS[i % ACTOR_COLORS.length]}66` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: ACTOR_COLORS[i % ACTOR_COLORS.length] }} />
            {a.name}
            <button onClick={() => onRemove(a.id)} className="ml-1 text-white/60 hover:text-white text-xs">✕</button>
          </div>
        ))}
        {selectedActors.length === 0 && <span className="text-white/25 text-sm italic">No actors selected yet</span>}
      </div>
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
            <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 border border-white/[0.10]"
              style={{ background: '#1a1a2e' }}>
              {results.map(a => (
                <button key={a.id} onMouseDown={e => e.preventDefault()}
                  onClick={() => { onAdd(a); setQuery(''); setResults([]); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.08] transition-colors text-left border-b border-white/[0.05] last:border-0">
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

// ── SVG Line Chart (year X) ────────────────────────────────────────────────────

function LineChart({ data }: { data: ChartData }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [data])

  const W = 800, H = 320, PAD = { top: 24, right: 20, bottom: 40, left: 52 }
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom
  const allX = [...new Set(data.series.flatMap(s => s.points.map(p => Number(p.x))))].sort((a, b) => a - b)
  const allY = data.series.flatMap(s => s.points.map(p => p.y))
  const maxY = Math.max(...allY) * 1.1 || 1
  const xScale = (x: number) => PAD.left + ((x - allX[0]) / ((allX[allX.length - 1] - allX[0]) || 1)) * innerW
  const yScale = (y: number) => PAD.top + innerH - (y / maxY) * innerH
  const yTicks = Array.from({ length: 5 }, (_, i) => maxY * i / 4)
  const step = Math.max(1, Math.ceil(allX.length / 10))
  const xTicks = allX.filter((_, i) => i % step === 0)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 320 }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="white" strokeOpacity={0.06} />
          <text x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">
            {t % 1 === 0 ? t : t.toFixed(1)}
          </text>
        </g>
      ))}
      {xTicks.map((t, i) => (
        <text key={i} x={xScale(t)} y={H - PAD.bottom + 16} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">{t}</text>
      ))}
      {data.series.map((s, si) => {
        const color = ACTOR_COLORS[si % ACTOR_COLORS.length]
        const pts = s.points.map(p => ({ x: xScale(Number(p.x)), y: yScale(p.y) }))
        const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
        const totalLen = pts.reduce((acc, p, i) => i === 0 ? 0 : acc + Math.hypot(p.x - pts[i-1].x, p.y - pts[i-1].y), 0)
        return (
          <g key={s.actor_id}>
            <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={totalLen} strokeDashoffset={animated ? 0 : totalLen}
              style={{ transition: `stroke-dashoffset ${0.8 + si * 0.2}s ease-out` }} />
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

// ── SVG Vertical Bar Chart (actor / decade / industry X) ──────────────────────

function BarChart({ data }: { data: ChartData }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [data])

  const categories = data.series[0]?.points.map(p => String(p.x)) ?? []
  const numSeries = data.series.length
  const W = 800, H = 300, PAD = { top: 20, right: 20, bottom: 48, left: 52 }
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom
  const maxY = Math.max(...data.series.flatMap(s => s.points.map(p => p.y))) * 1.1 || 1
  const yTicks = Array.from({ length: 5 }, (_, i) => maxY * i / 4)
  const yScale = (y: number) => PAD.top + innerH - (y / maxY) * innerH
  const groupW = innerW / categories.length
  const barW = Math.min(32, (groupW * 0.8) / numSeries)
  const barGap = barW * 0.15

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 300 }}>
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={yScale(t)} y2={yScale(t)} stroke="white" strokeOpacity={0.06} />
          <text x={PAD.left - 6} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">
            {t % 1 === 0 ? Math.round(t) : t.toFixed(1)}
          </text>
        </g>
      ))}
      {categories.map((cat, ci) => {
        const groupX = PAD.left + ci * groupW + groupW / 2 - (numSeries * (barW + barGap)) / 2
        return (
          <g key={cat}>
            {data.series.map((s, si) => {
              const val = s.points[ci]?.y ?? 0
              const bh = animated ? (val / maxY) * innerH : 0
              const color = ACTOR_COLORS[si % ACTOR_COLORS.length]
              return (
                <rect key={s.actor_id} x={groupX + si * (barW + barGap)} y={yScale(val)}
                  width={barW} height={bh} rx={3} fill={color} opacity={0.85}
                  style={{ transition: `y 0.5s ${si * 0.08}s ease-out, height 0.5s ${si * 0.08}s ease-out` }} />
              )
            })}
            <text x={PAD.left + ci * groupW + groupW / 2} y={H - PAD.bottom + 16}
              textAnchor="middle" fontSize={categories.length > 8 ? 8 : 10} fill="rgba(255,255,255,0.5)">
              {cat.length > 14 ? cat.slice(0, 13) + '…' : cat}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Horizontal Bar Chart (director X, 1 actor) ─────────────────────────────────

function HorizontalBarChart({ data }: { data: ChartData }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [data])

  const numSeries = data.series.length
  const categories = data.series[0]?.points.map(p => String(p.x)) ?? []
  const maxVal = Math.max(...data.series.flatMap(s => s.points.map(p => p.y))) * 1.1 || 1
  const ROW = 32 + numSeries * 6
  const PAD = { top: 8, right: 60, bottom: 16, left: 168 }
  const W = 760
  const H = PAD.top + categories.length * ROW + PAD.bottom
  const barMaxW = W - PAD.left - PAD.right

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 520 }}>
      {categories.map((cat, ci) => {
        const rowY = PAD.top + ci * ROW
        return (
          <g key={cat}>
            {/* subtle row stripe */}
            <rect x={PAD.left} y={rowY + 2} width={barMaxW} height={ROW - 4} rx={4}
              fill="white" fillOpacity={ci % 2 === 0 ? 0.025 : 0} />
            {/* Director label */}
            <text x={PAD.left - 10} y={rowY + ROW / 2 + 4} textAnchor="end"
              fontSize={10} fill="rgba(255,255,255,0.65)">
              {cat.length > 24 ? cat.slice(0, 23) + '…' : cat}
            </text>
            {/* Bars */}
            {data.series.map((s, si) => {
              const val = s.points[ci]?.y ?? 0
              const bw = animated ? (val / maxVal) * barMaxW : 0
              const barH = Math.max(6, ROW / numSeries - 5)
              const barY = rowY + si * (barH + 3) + (ROW - numSeries * (barH + 3)) / 2 + 2
              const color = ACTOR_COLORS[si % ACTOR_COLORS.length]
              return (
                <g key={s.actor_id}>
                  <rect x={PAD.left} y={barY} width={bw} height={barH} rx={3}
                    fill={color} opacity={0.85}
                    style={{ transition: `width 0.55s ${ci * 0.025 + si * 0.04}s ease-out` }} />
                  {animated && (
                    <text x={PAD.left + bw + 6} y={barY + barH / 2 + 3.5}
                      fontSize={9} fill="rgba(255,255,255,0.5)">
                      {val % 1 === 0 ? val : val.toFixed(1)}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

// ── Scatter Plot (director X, 2+ actors) ──────────────────────────────────────

function ScatterPlot({ data }: { data: ChartData }) {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t) }, [data])

  const s1 = data.series[0], s2 = data.series[1]
  if (!s1 || !s2) return null

  const W = 640, H = 440
  const PAD = { top: 28, right: 28, bottom: 68, left: 64 }
  const innerW = W - PAD.left - PAD.right, innerH = H - PAD.top - PAD.bottom

  // Merge both series by category (director name)
  const s2map: Record<string, number> = Object.fromEntries(s2.points.map(p => [String(p.x), p.y]))
  const points = s1.points
    .map(p => ({ label: String(p.x), x: p.y, y: s2map[String(p.x)] ?? 0 }))
    .filter(p => p.x > 0 || p.y > 0)

  const maxV = Math.max(...points.flatMap(p => [p.x, p.y])) * 1.15 || 1
  const scale = (v: number, axis: 'x' | 'y') =>
    axis === 'x'
      ? PAD.left + (v / maxV) * innerW
      : PAD.top + innerH - (v / maxV) * innerH

  // Top N to always label (highest combined value)
  const topN = new Set([...points].sort((a, b) => b.x + b.y - a.x - b.y).slice(0, 10).map(p => p.label))

  const c1 = ACTOR_COLORS[0], c2 = ACTOR_COLORS[1]
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxV * f))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 440 }}>
      {/* Grid */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={scale(t, 'x')} y1={PAD.top} x2={scale(t, 'x')} y2={PAD.top + innerH}
            stroke="white" strokeOpacity={0.05} />
          <line x1={PAD.left} y1={scale(t, 'y')} x2={PAD.left + innerW} y2={scale(t, 'y')}
            stroke="white" strokeOpacity={0.05} />
          <text x={scale(t, 'x')} y={PAD.top + innerH + 14} textAnchor="middle"
            fontSize={9} fill="rgba(255,255,255,0.3)">{t}</text>
          <text x={PAD.left - 6} y={scale(t, 'y') + 3.5} textAnchor="end"
            fontSize={9} fill="rgba(255,255,255,0.3)">{t}</text>
        </g>
      ))}

      {/* Diagonal equality line */}
      <line x1={PAD.left} y1={PAD.top + innerH} x2={PAD.left + innerW} y2={PAD.top}
        stroke="white" strokeOpacity={0.09} strokeDasharray="5 5" />

      {/* Quadrant hints */}
      <text x={PAD.left + innerW - 4} y={PAD.top + innerH - 6} textAnchor="end"
        fontSize={8} fill={c1 + '55'}>← {s1.actor_name} only</text>
      <text x={PAD.left + 4} y={PAD.top + 10} textAnchor="start"
        fontSize={8} fill={c2 + '55'}>{s2.actor_name} only ↑</text>

      {/* Axis labels */}
      <text x={PAD.left + innerW / 2} y={H - 6} textAnchor="middle"
        fontSize={11} fill={c1 + 'cc'}>{s1.actor_name} — films with director</text>
      <text x={14} y={PAD.top + innerH / 2} textAnchor="middle"
        fontSize={11} fill={c2 + 'cc'}
        transform={`rotate(-90, 14, ${PAD.top + innerH / 2})`}>{s2.actor_name} — films with director</text>

      {/* Scatter points */}
      {points.map((p, i) => {
        const cx = scale(p.x, 'x'), cy = scale(p.y, 'y')
        const isHov = hovered === i
        const color = p.x > p.y ? c1 : p.y > p.x ? c2 : '#a3e635'
        const showLabel = topN.has(p.label) || isHov
        return (
          <g key={p.label} style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <circle cx={cx} cy={cy} r={isHov ? 9 : 7}
              fill={color} opacity={animated ? (isHov ? 1 : 0.78) : 0} stroke="white"
              strokeWidth={isHov ? 1.5 : 0} strokeOpacity={0.6}
              style={{ transition: `opacity 0.4s ${i * 0.025}s, r 0.1s` }} />
            {showLabel && (
              <text x={cx + 11} y={cy + 4} fontSize={9} fill="rgba(255,255,255,0.8)"
                style={{ pointerEvents: 'none' }}>
                {p.label.length > 18 ? p.label.slice(0, 17) + '…' : p.label}
              </text>
            )}
            {isHov && (
              <text x={cx + 11} y={cy + 16} fontSize={8} fill="rgba(255,255,255,0.45)"
                style={{ pointerEvents: 'none' }}>
                {s1.actor_name}: {p.x} · {s2.actor_name}: {p.y}
              </text>
            )}
          </g>
        )
      })}

      {/* Legend */}
      {[s1, s2].map((s, i) => (
        <g key={s.actor_id}>
          <circle cx={PAD.left + i * 130} cy={H - 22} r={5} fill={ACTOR_COLORS[i]} />
          <text x={PAD.left + i * 130 + 12} y={H - 18} fontSize={10} fill="rgba(255,255,255,0.6)">
            {s.actor_name}
          </text>
        </g>
      ))}
      {data.series.length > 2 && (
        <text x={PAD.left + 280} y={H - 18} fontSize={9} fill="rgba(255,255,255,0.3)">
          (scatter shows first two actors)
        </text>
      )}
    </svg>
  )
}

// ── Legend strip ───────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

interface ActiveCtx { xAxis: string; numActors: number }

export default function ChartBuilder() {
  const [selectedActors, setSelectedActors] = useState<Actor[]>([])
  const [xAxis, setXAxis] = useState('year')
  const [yAxis, setYAxis] = useState('film_count')
  const [industry, setIndustry] = useState('All')
  const [yearFrom, setYearFrom] = useState(1970)
  const [yearTo, setYearTo] = useState(2024)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [activeCtx, setActiveCtx] = useState<ActiveCtx | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addActor = (a: Actor) => { if (selectedActors.length < 10) { setSelectedActors(p => [...p, a]); setChartData(null) } }
  const removeActor = (id: number) => { setSelectedActors(p => p.filter(a => a.id !== id)); setChartData(null) }

  // When xAxis switches to director, reset a Y that doesn't work
  const handleXChange = (v: string) => {
    setXAxis(v)
    if (v === 'director' && !Y_OPTIONS.find(o => o.value === yAxis)?.directorOk) {
      setYAxis('film_count')
    }
    setChartData(null)
  }

  const buildChart = async () => {
    if (selectedActors.length === 0 && xAxis !== 'industry') {
      setError('Select at least one actor to build a chart.'); return
    }
    setLoading(true); setError(null)
    try {
      const data = await getChartData(
        xAxis, yAxis, selectedActors.map(a => a.id),
        industry === 'All' ? undefined : industry,
        xAxis === 'year' ? yearFrom : undefined,
        xAxis === 'year' ? yearTo : undefined,
      )
      setChartData(data)
      setActiveCtx({ xAxis, numActors: selectedActors.length })
    } catch {
      setError('Failed to build chart. Please try again.')
    } finally { setLoading(false) }
  }

  const yLabel = Y_OPTIONS.find(o => o.value === yAxis)?.label ?? yAxis
  const xLabel = X_OPTIONS.find(o => o.value === xAxis)?.label ?? xAxis
  const availableY = xAxis === 'director' ? Y_OPTIONS.filter(o => o.directorOk) : Y_OPTIONS

  const presets = [
    { label: 'Rajini vs Kamal — films over time', actors: [{ id: 11, name: 'Rajinikanth', industry: 'Tamil' }, { id: 12, name: 'Kamal Haasan', industry: 'Tamil' }], x: 'year', y: 'film_count' },
    { label: 'Big 3 Malayalam — co-stars by decade', actors: [{ id: 381, name: 'Mohanlal', industry: 'Malayalam' }, { id: 1286, name: 'Mammootty', industry: 'Malayalam' }, { id: 96, name: 'Fahadh Faasil', industry: 'Malayalam' }], x: 'decade', y: 'unique_costars' },
    { label: 'Telugu stars — avg rating', actors: [{ id: 1, name: 'Allu Arjun', industry: 'Telugu' }, { id: 3, name: 'Mahesh Babu', industry: 'Telugu' }, { id: 4, name: 'Prabhas', industry: 'Telugu' }], x: 'actor', y: 'avg_rating' },
    { label: 'Rajini & Kamal — shared directors ↗', actors: [{ id: 11, name: 'Rajinikanth', industry: 'Tamil' }, { id: 12, name: 'Kamal Haasan', industry: 'Tamil' }], x: 'director', y: 'film_count' },
  ]

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">📊</span>
        <h2 className="text-white font-bold text-lg">Build Your Own Chart</h2>
      </div>
      <p className="text-white/40 text-sm mb-6">
        Select actors, axes and filters to create custom cinema analytics.
        {xAxis === 'director' && selectedActors.length >= 2 &&
          <span className="text-cyan-400/70"> Scatter plot mode — comparing shared directors.</span>}
      </p>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p, i) => (
          <button key={i}
            onClick={() => { setSelectedActors(p.actors as Actor[]); setXAxis(p.x); setYAxis(p.y); setChartData(null) }}
            className="text-xs px-3 py-1.5 rounded-full border border-white/[0.12] text-white/50 hover:text-white hover:border-white/25 transition-all">
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Actors (up to 10)</label>
          <ActorPicker selectedActors={selectedActors} onAdd={addActor} onRemove={removeActor} />
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">X Axis</label>
            <select value={xAxis} onChange={e => handleXChange(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/25 transition-colors">
              {X_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Y Axis</label>
            <select value={yAxis} onChange={e => { setYAxis(e.target.value); setChartData(null) }}
              className="w-full bg-white/[0.05] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-white/25 transition-colors">
              {availableY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-white/[0.07]">
        <div>
          <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Industry</label>
          <div className="flex gap-1.5 flex-wrap">
            {INDUSTRY_OPTIONS.map(ind => (
              <button key={ind} onClick={() => { setIndustry(ind); setChartData(null) }}
                className={`px-3 py-1.5 rounded-full text-xs transition-all ${industry === ind ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70 border border-white/[0.08] hover:border-white/20'}`}>
                {ind}
              </button>
            ))}
          </div>
        </div>
        {xAxis === 'year' && (
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-wider mb-1.5">Year Range</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1950} max={2024} value={yearFrom}
                onChange={e => { setYearFrom(Number(e.target.value)); setChartData(null) }}
                className="w-20 bg-white/[0.05] border border-white/[0.10] rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center" />
              <span className="text-white/30 text-sm">–</span>
              <input type="number" min={1950} max={2026} value={yearTo}
                onChange={e => { setYearTo(Number(e.target.value)); setChartData(null) }}
                className="w-20 bg-white/[0.05] border border-white/[0.10] rounded-lg px-2 py-1.5 text-sm text-white outline-none text-center" />
            </div>
          </div>
        )}
        <div className="ml-auto flex items-end">
          <button onClick={buildChart} disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
            {loading ? 'Building…' : '▶ Build Chart'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Chart area */}
      {chartData && activeCtx ? (
        <div>
          <div className="text-xs text-white/30 mb-4">
            {activeCtx.xAxis === 'director' && activeCtx.numActors >= 2
              ? `Shared-director scatter — ${chartData.series[0]?.actor_name} vs ${chartData.series[1]?.actor_name}`
              : `${xLabel} vs ${yLabel}${industry !== 'All' ? ` · ${industry}` : ''}${activeCtx.xAxis === 'year' ? ` · ${yearFrom}–${yearTo}` : ''}`
            }
          </div>

          {activeCtx.xAxis === 'year' && <LineChart data={chartData} />}
          {activeCtx.xAxis !== 'year' && activeCtx.xAxis !== 'director' && <BarChart data={chartData} />}
          {activeCtx.xAxis === 'director' && activeCtx.numActors >= 2 && <ScatterPlot data={chartData} />}
          {activeCtx.xAxis === 'director' && activeCtx.numActors < 2 && <HorizontalBarChart data={chartData} />}

          <Legend series={chartData.series} />
        </div>
      ) : !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <div className="text-5xl mb-3">📈</div>
          <p className="text-sm">Configure your axes above and click Build Chart</p>
          {xAxis === 'director' && (
            <p className="text-xs mt-1 text-white/15">
              {selectedActors.length >= 2 ? 'Scatter plot: each dot = a director shared by both actors' : 'Add 2 actors for a scatter plot, or 1 for a ranked list'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
