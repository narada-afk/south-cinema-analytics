'use client'

/**
 * TopCoStarsChart
 * Grid of actor cards showing the top network connectors —
 * actors who bridge the most co-stars across industries.
 * Animates on viewport entry.
 */

import { useEffect, useRef, useState } from 'react'
import ActorAvatar from '@/components/ActorAvatar'
import type { CoStarStat } from '@/lib/api'

const IND_COLOR: Record<string, string> = {
  Tamil:     '#e11d48',
  Telugu:    '#f59e0b',
  Malayalam: '#06b6d4',
  Kannada:   '#8b5cf6',
}
const IND_BG: Record<string, string> = {
  Tamil:     'rgba(225,29,72,0.12)',
  Telugu:    'rgba(245,158,11,0.12)',
  Malayalam: 'rgba(6,182,212,0.12)',
  Kannada:   'rgba(139,92,246,0.12)',
}

export default function TopCoStarsChart({ data }: { data: CoStarStat[] }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    let done = false
    const obs = new IntersectionObserver(([e]) => {
      if (done) return; done = true
      if (e.isIntersecting) setVisible(true)
    }, { threshold: 0.1 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const max = Math.max(...data.map(d => d.unique_costars), 1)

  return (
    <div ref={ref} className="glass rounded-3xl p-6 flex flex-col gap-5 h-full">
      <div>
        <h2 className="text-white font-bold text-base">🕸️ Top Co-Star Networks</h2>
        <p className="text-white/40 text-xs mt-1">
          Actors who connect the most unique co-stars across all industries
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {data.map((actor, i) => {
          const color  = IND_COLOR[actor.industry]  ?? '#6b7280'
          const bg     = IND_BG[actor.industry]     ?? 'rgba(107,114,128,0.12)'
          const pct    = (actor.unique_costars / max) * 100
          const delay  = `${i * 45}ms`

          return (
            <div
              key={actor.id}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.04] group"
            >
              {/* Rank badge */}
              <span
                className="text-[10px] font-bold w-5 text-center flex-shrink-0 tabular-nums"
                style={{ color: i < 3 ? color : 'rgba(255,255,255,0.2)' }}
              >
                {i + 1}
              </span>

              {/* Avatar */}
              <ActorAvatar name={actor.name} size={36} />

              {/* Info + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-white/80 text-xs font-semibold truncate">
                    {actor.name}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: bg, color }}
                  >
                    {actor.industry}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: visible ? `${pct}%` : '0%',
                      background: color,
                      transitionDelay: delay,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="text-white/70 text-xs font-mono tabular-nums font-bold">
                  {actor.unique_costars.toLocaleString()}
                </p>
                <p className="text-white/25 text-[9px]">co-stars</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
