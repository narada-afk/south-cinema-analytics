'use client'

/**
 * CareerTimeline
 * SVG line chart showing films released per year for a selected actor.
 * Actor is searchable; renders an animated SVG path.
 */

import { useState, useEffect, useRef } from 'react'
import { searchActors, getCareerTimeline, type Actor, type CareerTimeline as CTData, type TimelinePoint } from '@/lib/api'
import ActorAvatar from '@/components/ActorAvatar'

// ── SVG line chart ────────────────────────────────────────────────────────────

const W = 560, H = 140, PX = 36, PY = 18

function LineChart({ points }: { points: TimelinePoint[] }) {
  const [drawn, setDrawn] = useState(false)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    setDrawn(false)
    const tid = setTimeout(() => setDrawn(true), 50)
    return () => clearTimeout(tid)
  }, [points])

  if (points.length < 2) return null

  const years  = points.map(p => p.year)
  const counts = points.map(p => p.count)
  const minY   = Math.min(...years), maxY = Math.max(...years)
  const maxC   = Math.max(...counts, 1)

  function toX(yr: number) { return PX + ((yr - minY) / (maxY - minY || 1)) * (W - 2 * PX) }
  function toY(c: number)  { return H - PY - (c / maxC) * (H - 2 * PY) }

  const lineD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.year).toFixed(1)},${toY(p.count).toFixed(1)}`)
    .join(' ')

  const areaD = `M ${toX(minY).toFixed(1)},${(H - PY).toFixed(1)} `
    + points.map(p => `L ${toX(p.year).toFixed(1)},${toY(p.count).toFixed(1)}`).join(' ')
    + ` L ${toX(maxY).toFixed(1)},${(H - PY).toFixed(1)} Z`

  // Year tick marks (every 5 years)
  const ticks: number[] = []
  const start = Math.ceil(minY / 5) * 5
  for (let y = start; y <= maxY; y += 5) ticks.push(y)

  // Peak detection
  const peak = points.reduce((a, b) => b.count > a.count ? b : a)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f}
          x1={PX} y1={toY(maxC * f)} x2={W - PX} y2={toY(maxC * f)}
          stroke="rgba(255,255,255,0.06)" strokeDasharray="3 4"
        />
      ))}

      {/* Year ticks */}
      {ticks.map(yr => (
        <text key={yr}
          x={toX(yr)} y={H - 2}
          textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.25)"
        >{yr}</text>
      ))}

      {/* Area fill */}
      {drawn && (
        <path d={areaD} fill="url(#areaGrad)" />
      )}

      {/* Line */}
      <path
        ref={pathRef}
        d={lineD}
        fill="none"
        stroke="#06b6d4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        style={{
          strokeDasharray: drawn ? 'none' : '2000',
          strokeDashoffset: drawn ? '0' : '2000',
          transition: 'stroke-dashoffset 1.2s ease-out',
        }}
      />

      {/* Data dots */}
      {drawn && points.map(p => (
        <circle key={p.year}
          cx={toX(p.year)} cy={toY(p.count)} r={p.year === peak.year ? 4 : 2.5}
          fill={p.year === peak.year ? '#fff' : '#06b6d4'}
          opacity={p.year === peak.year ? 1 : 0.7}
        />
      ))}

      {/* Peak label */}
      {drawn && (
        <g>
          <text
            x={toX(peak.year)} y={toY(peak.count) - 8}
            textAnchor="middle" fontSize="9.5" fill="white" fontWeight="600"
          >
            {peak.count} films
          </text>
          <text
            x={toX(peak.year)} y={toY(peak.count) - 18}
            textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)"
          >
            {peak.year}
          </text>
        </g>
      )}
    </svg>
  )
}

// ── Actor search inline ───────────────────────────────────────────────────────

function ActorSearch({ onSelect }: { onSelect: (a: Actor) => void }) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState<Actor[]>([])
  const [open, setOpen]       = useState(false)
  const dropRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); setOpen(false); return }
    const tid = setTimeout(async () => {
      try {
        const res = await searchActors(q)
        setResults(res.slice(0, 6)); setOpen(res.length > 0)
      } catch { setResults([]) }
    }, 220)
    return () => clearTimeout(tid)
  }, [q])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search actor…"
        className="w-full bg-white/[0.06] rounded-xl px-4 py-2 text-sm text-white placeholder-white/25 outline-none border border-white/[0.08] focus:border-cyan-500/40 transition-colors"
      />
      {open && results.length > 0 && (
        <div
          ref={dropRef}
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-xl border border-white/[0.10]"
          style={{ background: '#1e1e2c' }}
        >
          {results.map(a => (
            <button
              key={a.id}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(a); setQ(''); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/[0.08] text-left border-b border-white/[0.05] last:border-0 transition-colors"
            >
              <ActorAvatar name={a.name} size={28} />
              <span className="text-white text-sm">{a.name}</span>
              {a.industry && <span className="text-white/35 text-xs ml-auto">{a.industry}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CareerTimeline({
  initialData,
}: {
  initialData: CTData
}) {
  const [data,    setData]    = useState<CTData>(initialData)
  const [loading, setLoading] = useState(false)

  async function loadActor(a: Actor) {
    setLoading(true)
    try {
      const d = await getCareerTimeline(a.id)
      setData(d)
    } catch {}
    finally { setLoading(false) }
  }

  const totalFilms  = data.data.reduce((s, p) => s + p.count, 0)
  const activeYears = data.data.length
  const peakCount   = Math.max(...data.data.map(p => p.count), 0)

  return (
    <div className="glass rounded-3xl p-6 flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-base">📈 Career Timeline</h2>
          <p className="text-white/40 text-xs mt-1">Films released per year</p>
        </div>
        <div className="flex-1 min-w-0 max-w-[180px]">
          <ActorSearch onSelect={loadActor} />
        </div>
      </div>

      {/* Selected actor */}
      <div className="flex items-center gap-3">
        <ActorAvatar name={data.actor_name} size={40} />
        <div>
          <p className="text-white font-semibold text-sm">{data.actor_name}</p>
          <p className="text-white/35 text-xs">
            {totalFilms} films across {activeYears} active years · peak {peakCount}/yr
          </p>
        </div>
        {loading && <span className="ml-auto text-white/30 text-xs animate-pulse">Loading…</span>}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        {data.data.length >= 2
          ? <LineChart points={data.data} />
          : <p className="text-white/25 text-sm text-center py-8">Not enough data to plot</p>
        }
      </div>
    </div>
  )
}
