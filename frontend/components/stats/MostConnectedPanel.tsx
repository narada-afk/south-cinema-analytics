'use client'

/**
 * MostConnectedPanel
 * Horizontal bar chart of actors ranked by unique co-stars.
 * Bars animate in when the panel scrolls into view.
 */

import { useEffect, useRef, useState } from 'react'
import type { ConnectedActor } from '@/lib/api'

const IND_COLOR: Record<string, string> = {
  Tamil:     '#e11d48',
  Telugu:    '#f59e0b',
  Malayalam: '#06b6d4',
  Kannada:   '#8b5cf6',
}

function getColor(industry: string) {
  return IND_COLOR[industry] ?? '#6b7280'
}

export default function MostConnectedPanel({ data }: { data: ConnectedActor[] }) {
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

  const max = Math.max(...data.map(d => d.unique_costars), 1)

  return (
    <div ref={ref} className="glass rounded-3xl p-6 flex flex-col gap-5 h-full">
      <div>
        <h2 className="text-white font-bold text-base">🌐 Most Connected Actors</h2>
        <p className="text-white/40 text-xs mt-1">Ranked by unique co-stars across all films</p>
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        {data.slice(0, 15).map((actor, i) => {
          const pct = (actor.unique_costars / max) * 100
          const color = getColor(actor.industry)
          return (
            <div key={actor.id} className="flex items-center gap-3">
              {/* Rank */}
              <span className="text-white/20 text-xs font-mono w-5 text-right flex-shrink-0">
                {i + 1}
              </span>
              {/* Name */}
              <span className="text-white/70 text-xs w-28 truncate flex-shrink-0">
                {actor.name}
              </span>
              {/* Bar track */}
              <div className="flex-1 h-5 rounded bg-white/[0.05] overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 rounded transition-all duration-700 ease-out"
                  style={{
                    width: animated ? `${pct}%` : '0%',
                    background: color,
                    transitionDelay: `${i * 40}ms`,
                    opacity: 0.8,
                  }}
                />
                <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-mono text-white/50">
                  {actor.unique_costars.toLocaleString()}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-white/[0.06]">
        {Object.entries(IND_COLOR).map(([ind, col]) => (
          <div key={ind} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: col }} />
            <span className="text-white/35 text-[10px]">{ind}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
