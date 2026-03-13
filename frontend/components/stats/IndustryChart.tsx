'use client'

/**
 * IndustryChart
 * Stacked decade breakdown per industry + total bar.
 * Animates on viewport entry.
 */

import { useEffect, useRef, useState } from 'react'
import type { IndustryBucket } from '@/lib/api'

const IND_META: Record<string, { color: string; emoji: string }> = {
  Tamil:     { color: '#e11d48', emoji: '🎬' },
  Telugu:    { color: '#f59e0b', emoji: '🎥' },
  Malayalam: { color: '#06b6d4', emoji: '📽️' },
  Kannada:   { color: '#8b5cf6', emoji: '🎞️' },
}

const DECADE_KEYS = ['pre_1980','s1980s','s2000s','s2010s','s2020s'] as const
const DECADE_LABELS: Record<string, string> = {
  pre_1980: 'Pre‑1980',
  s1980s:   '1980s',
  s2000s:   '2000s',
  s2010s:   '2010s',
  s2020s:   '2020s',
}
const DECADE_COLORS = ['#374151','#4b5563','#6b7280','#9ca3af','#d1d5db']

export default function IndustryChart({ data }: { data: IndustryBucket[] }) {
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let done = false
    const obs = new IntersectionObserver(([e]) => {
      if (done) return
      done = true
      if (e.isIntersecting) setAnimated(true)
    }, { threshold: 0.15 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const maxTotal = Math.max(...data.map(d => d.total), 1)

  return (
    <div ref={ref} className="glass rounded-3xl p-6 flex flex-col gap-6 h-full">
      <div>
        <h2 className="text-white font-bold text-base">🎬 Industry Distribution</h2>
        <p className="text-white/40 text-xs mt-1">Films per industry, broken down by decade</p>
      </div>

      {/* Industry bars */}
      <div className="flex flex-col gap-5 flex-1">
        {data.map((row, i) => {
          const meta  = IND_META[row.industry] ?? { color: '#6b7280', emoji: '🎬' }
          const pct   = (row.total / maxTotal) * 100

          return (
            <div key={row.industry}>
              {/* Label row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span>{meta.emoji}</span>
                  <span className="text-white/80 text-sm font-semibold">{row.industry}</span>
                </div>
                <span className="text-white/50 text-xs font-mono tabular-nums">
                  {row.total.toLocaleString()} films
                </span>
              </div>

              {/* Main bar */}
              <div className="h-7 rounded-lg bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: animated ? `${pct}%` : '0%',
                    background: meta.color,
                    transitionDelay: `${i * 80}ms`,
                    opacity: 0.85,
                  }}
                />
              </div>

              {/* Decade mini-bars */}
              <div className="flex gap-1 mt-1.5">
                {DECADE_KEYS.map((key, di) => {
                  const val = row[key]
                  const mini = (val / (row.total || 1)) * 100
                  return (
                    <div key={key} className="flex-1 flex flex-col gap-0.5">
                      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: animated ? `${mini}%` : '0%',
                            background: DECADE_COLORS[di],
                            transitionDelay: `${i * 80 + di * 30 + 300}ms`,
                          }}
                        />
                      </div>
                      <p className="text-white/25 text-[9px] text-center leading-none">
                        {DECADE_LABELS[key]}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
