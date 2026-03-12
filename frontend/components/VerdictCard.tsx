'use client'
/**
 * VerdictCard — client component
 *
 * Each metric gets ONE shared scale container.
 * Both actor fills live inside that container so they race on the same track.
 *
 *  ┌── ONE container (overflow-hidden, shared bg) ────────────────────────┐
 *  │  Actor A  ████████████████████████████████████████████████████  27   │  ← 100 %
 *  │  ─────────────────────────────────────────────────────────────────── │
 *  │  Actor B  ██████████████████████████████████████████░░░░░░░░░░  25   │  ← 92 %
 *  └──────────────────────────────────────────────────────────────────────┘
 *
 * Fills animate 0 → target via CSS transition, triggered once by
 * IntersectionObserver. Each metric delays 100 ms more than the previous.
 */

import { useRef, useEffect, useState } from 'react'
import type { ActorProfile, ActorMovie, Collaborator, DirectorCollab } from '@/lib/api'
import { calcYearsActive, calcAvgRating } from '@/lib/metrics'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActorData {
  profile: ActorProfile
  movies: ActorMovie[]
  collaborators: Collaborator[]
  directors: DirectorCollab[]
}

// ── VerdictCard ───────────────────────────────────────────────────────────────

export default function VerdictCard({ data1, data2 }: { data1: ActorData; data2: ActorData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimated(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const p1 = data1.profile
  const p2 = data2.profile

  const yrs1 = calcYearsActive(p1)
  const yrs2 = calcYearsActive(p2)
  const rat1 = calcAvgRating(data1.movies)
  const rat2 = calcAvgRating(data2.movies)

  const METRICS = [
    { label: 'Films',            v1: p1.film_count,              v2: p2.film_count,              d1: String(p1.film_count),          d2: String(p2.film_count),          delay: 0.1 },
    { label: 'Years Active',     v1: yrs1,                       v2: yrs2,                       d1: String(yrs1),                   d2: String(yrs2),                   delay: 0.2 },
    { label: 'Avg Rating',       v1: rat1,                       v2: rat2,                       d1: rat1.toFixed(1),                d2: rat2.toFixed(1),                delay: 0.3 },
    { label: 'Unique Directors', v1: data1.directors.length,     v2: data2.directors.length,     d1: String(data1.directors.length), d2: String(data2.directors.length), delay: 0.4 },
    { label: 'Co-Stars',         v1: data1.collaborators.length, v2: data2.collaborators.length, d1: String(data1.collaborators.length), d2: String(data2.collaborators.length), delay: 0.5 },
  ]

  const wins1 = METRICS.filter((m) => m.v1 > m.v2).length
  const wins2 = METRICS.filter((m) => m.v2 > m.v1).length
  const winner = wins1 > wins2 ? p1 : wins2 > wins1 ? p2 : null
  const winnerLeads = Math.max(wins1, wins2)
  const winnerColor = winner?.name === p1.name ? '#f59e0b' : '#06b6d4'

  return (
    <div ref={containerRef} className="glass rounded-3xl p-6 sm:p-8 flex flex-col gap-8">

      {/* Trophy header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-2xl">🏆</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Verdict</p>
        {winner ? (
          <p className="text-lg font-bold" style={{ color: winnerColor }}>
            {winner.name} leads in {winnerLeads} of 5 metrics
          </p>
        ) : (
          <p className="text-lg font-bold text-white/60">All square — perfectly matched</p>
        )}
      </div>

      {/* Metrics — one shared-scale container per metric */}
      <div className="flex flex-col gap-5">
        {METRICS.map((m) => {
          const maxV = Math.max(m.v1, m.v2) || 1
          const pct1 = (m.v1 / maxV) * 100   // leading actor is always 100 %
          const pct2 = (m.v2 / maxV) * 100
          const lead = m.v1 > m.v2 ? 1 : m.v2 > m.v1 ? 2 : 0  // 0 = tie

          // Colors: leading actor → accent; trailing → dim grey; tie → both accent
          const fill1 = (lead === 0 || lead === 1) ? '#f59e0b' : 'rgba(255,255,255,0.08)'
          const fill2 = (lead === 0 || lead === 2) ? '#06b6d4' : 'rgba(255,255,255,0.08)'

          // Text on coloured fill → white; text on dim fill → faded
          const isLead1 = lead === 0 || lead === 1
          const isLead2 = lead === 0 || lead === 2
          const name1Color  = isLead1 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)'
          const name2Color  = isLead2 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.40)'
          const value1Color = isLead1 ? '#ffffff' : 'rgba(255,255,255,0.35)'
          const value2Color = isLead2 ? '#ffffff' : 'rgba(255,255,255,0.35)'

          return (
            <div key={m.label} className="flex flex-col gap-2">

              {/* Label */}
              <p className="text-[11px] text-white/35 uppercase tracking-widest text-center">
                {m.label}
              </p>

              {/* ── ONE shared-scale container ─────────────────────── */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                {/* Actor 1 row */}
                <div className="relative h-11">
                  {/* Fill — grows from 0 to pct1 on animate */}
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{
                      width: animated ? `${pct1}%` : '0%',
                      background: fill1,
                      transition: `width 0.8s ease-out ${m.delay}s`,
                    }}
                  />
                  {/* Name + value */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                    <span className="text-sm font-semibold truncate pr-3" style={{ color: name1Color }}>
                      {p1.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: value1Color }}>
                      {m.d1}
                    </span>
                  </div>
                </div>

                {/* Divider between the two rows */}
                <div className="mx-4" style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

                {/* Actor 2 row */}
                <div className="relative h-11">
                  {/* Fill — grows from 0 to pct2 on animate */}
                  <div
                    className="absolute left-0 top-0 bottom-0"
                    style={{
                      width: animated ? `${pct2}%` : '0%',
                      background: fill2,
                      transition: `width 0.8s ease-out ${m.delay}s`,
                    }}
                  />
                  {/* Name + value */}
                  <div className="absolute inset-0 flex items-center justify-between px-4 z-10">
                    <span className="text-sm font-semibold truncate pr-3" style={{ color: name2Color }}>
                      {p2.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color: value2Color }}>
                      {m.d2}
                    </span>
                  </div>
                </div>
              </div>
              {/* ────────────────────────────────────────────────────── */}

            </div>
          )
        })}
      </div>
    </div>
  )
}
