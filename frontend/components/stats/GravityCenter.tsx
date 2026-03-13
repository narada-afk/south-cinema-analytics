'use client'

/**
 * GravityCenter — Cinema Gravity Center
 *
 * Shows the betweenness centrality leaderboard: actors who connect the most
 * paths in the South Indian collaboration network (Brandes algorithm, backend).
 *
 * Each entry shows: rank, actor name, industry, centrality score bar,
 * film count, and co-star count.
 */

import { useRef, useEffect, useState } from 'react'
import ActorAvatar from '@/components/ActorAvatar'
import { type GravityActor } from '@/lib/api'

const IND_COLOR: Record<string, string> = {
  Tamil:     '#f43f5e',
  Telugu:    '#f59e0b',
  Malayalam: '#06b6d4',
  Kannada:   '#8b5cf6',
  Unknown:   '#6b7280',
}

const RANK_BG: Record<number, string> = {
  1: 'linear-gradient(135deg, #f59e0b, #d97706)',
  2: 'linear-gradient(135deg, #94a3b8, #64748b)',
  3: 'linear-gradient(135deg, #cd7c4a, #a16207)',
}

function CentralityBar({
  value,
  max,
  color,
  rank,
}: {
  value: number
  max: number
  color: string
  rank: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setWidth((value / max) * 100), rank * 30)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value, max, rank])

  return (
    <div ref={ref} className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex-1">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, background: color }}
      />
    </div>
  )
}

export default function GravityCenter({ data }: { data: GravityActor[] }) {
  const maxCentrality = Math.max(...data.map(a => a.centrality)) || 1

  // Explanation tooltip state
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🪐</span>
          <div>
            <h2 className="text-white font-bold text-lg">Cinema Gravity Center</h2>
            <p className="text-white/40 text-sm">
              Actors who bridge the most paths across the collaboration network
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowInfo(v => !v)}
          className="text-white/30 hover:text-white/60 text-xs border border-white/[0.10] rounded-full px-3 py-1 transition-colors"
        >
          {showInfo ? '✕ close' : 'ℹ what is this?'}
        </button>
      </div>

      {/* Explainer */}
      {showInfo && (
        <div className="mb-5 p-4 rounded-2xl text-xs text-white/50 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <strong className="text-white/70">Betweenness Centrality</strong> measures how often an actor appears
          on the shortest path between any two other actors in the collaboration network.
          Actors with high centrality are the &ldquo;bridges&rdquo; of South Indian cinema —
          they connect performers who would otherwise be far apart in the network.
          Computed using the Brandes algorithm on {data.length > 0 ? '142' : '?'} fully ingested actors.
        </div>
      )}

      {/* Top 3 spotlight */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {data.slice(0, 3).map((a, i) => (
          <div
            key={a.id}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: RANK_BG[i + 1] ?? '#333' }}
            >
              {i + 1}
            </div>
            <ActorAvatar name={a.name} size={48} industry={a.industry} />
            <div className="text-white text-sm font-semibold leading-tight">{a.name}</div>
            <div
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                color: IND_COLOR[a.industry] ?? '#888',
                background: (IND_COLOR[a.industry] ?? '#888') + '22',
              }}
            >
              {a.industry}
            </div>
            <div className="text-white/30 text-xs">
              score {(a.centrality * 1000).toFixed(2)}‰
            </div>
          </div>
        ))}
      </div>

      {/* Full leaderboard */}
      <div className="space-y-2">
        {data.slice(3).map((a, i) => {
          const rank = i + 4
          const color = IND_COLOR[a.industry] ?? IND_COLOR.Unknown
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
            >
              {/* Rank */}
              <span className="text-white/25 text-xs w-5 text-right tabular-nums">{rank}</span>

              {/* Avatar */}
              <ActorAvatar name={a.name} size={32} industry={a.industry} />

              {/* Name + industry */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium truncate">{a.name}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full hidden sm:block"
                    style={{ color, background: color + '22' }}
                  >
                    {a.industry}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <CentralityBar value={a.centrality} max={maxCentrality} color={color} rank={rank} />
                  <span className="text-white/30 text-xs tabular-nums w-14 text-right shrink-0">
                    {(a.centrality * 1000).toFixed(2)}‰
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex flex-col items-end gap-0.5 text-right">
                <span className="text-white/50 text-xs tabular-nums">{a.film_count} films</span>
                <span className="text-white/30 text-xs tabular-nums">{a.costar_count} co-stars</span>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-white/20 text-xs mt-5 text-center">
        Score = normalised betweenness centrality × 1000‰ · higher = more cross-industry bridging
      </p>
    </div>
  )
}
