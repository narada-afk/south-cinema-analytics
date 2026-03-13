'use client'

/**
 * DirectorPartnerships — horizontal bar chart
 * Shows the most prolific actor-director pairings.
 */

import { useEffect, useRef, useState } from 'react'
import type { DirectorPartnership } from '@/lib/api'

const IND_COLOR: Record<string, string> = {
  Tamil:     '#e11d48',
  Telugu:    '#f59e0b',
  Malayalam: '#06b6d4',
  Kannada:   '#8b5cf6',
}

export default function DirectorPartnerships({ data }: { data: DirectorPartnership[] }) {
  const [animated, setAnimated] = useState(false)
  const [hovered, setHovered]   = useState<number | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let done = false
    const obs = new IntersectionObserver(([e]) => {
      if (done) return; done = true
      if (e.isIntersecting) setAnimated(true)
    }, { threshold: 0.1 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const max = Math.max(...data.map(d => d.film_count), 1)

  return (
    <div ref={ref} className="glass rounded-3xl p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-white font-bold text-base">🎬 Actor–Director Partnerships</h2>
        <p className="text-white/40 text-xs mt-1">
          Most prolific actor–director pairs (min. 3 films together)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
        {data.map((row, i) => {
          const pct   = (row.film_count / max) * 100
          const color = IND_COLOR[row.industry] ?? '#6b7280'
          const isHov = hovered === i

          return (
            <div
              key={i}
              className="flex items-center gap-3 group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Rank */}
              <span className="text-white/20 text-[10px] font-mono w-4 text-right flex-shrink-0">
                {i + 1}
              </span>

              {/* Names + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-1 gap-2">
                  <p className="text-white/75 text-xs font-medium truncate leading-none">
                    {row.actor}
                    <span className="text-white/30 mx-1">×</span>
                    {row.director}
                  </p>
                  <span
                    className="text-[10px] font-bold tabular-nums flex-shrink-0"
                    style={{ color }}
                  >
                    {row.film_count}
                  </span>
                </div>

                {/* Bar */}
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-600 ease-out"
                    style={{
                      width: animated ? `${pct}%` : '0%',
                      background: color,
                      transitionDelay: `${i * 35}ms`,
                      opacity: isHov ? 1 : 0.7,
                    }}
                  />
                </div>

                {/* Tooltip: recent films */}
                {isHov && row.films.length > 0 && (
                  <p className="text-white/30 text-[10px] mt-1 truncate leading-tight">
                    {row.films.slice(0, 3).join(' · ')}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
