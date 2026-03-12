'use client'
/**
 * VerdictCard — client component
 *
 * ONE bar per metric, split by share:
 *
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  Prabhas     75  ████████████████████████████████████████████   │ ← amber, 75 %
 *  │                  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████  25  Allu  │ ← cyan,  25 %
 *  └─────────────────────────────────────────────────────────────────┘
 *
 *  pct1 = v1 / (v1 + v2)   pct2 = v2 / (v1 + v2)   → always sum to 100 %
 *
 * Amber fills left → right; cyan fills right → left.
 * Both animate 0 → target on first IntersectionObserver trigger.
 */

import { useRef, useEffect, useState } from 'react'
import type { ActorProfile, ActorMovie, Collaborator, DirectorCollab } from '@/lib/api'
import { calcYearsActive, calcAvgRating } from '@/lib/metrics'

interface ActorData {
  profile: ActorProfile
  movies: ActorMovie[]
  collaborators: Collaborator[]
  directors: DirectorCollab[]
}

export default function VerdictCard({ data1, data2 }: { data1: ActorData; data2: ActorData }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); observer.disconnect() } },
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
    { label: 'Films',            v1: p1.film_count,              v2: p2.film_count,              d1: String(p1.film_count),              d2: String(p2.film_count),              delay: 0.1 },
    { label: 'Years Active',     v1: yrs1,                       v2: yrs2,                       d1: String(yrs1),                       d2: String(yrs2),                       delay: 0.2 },
    { label: 'Avg Rating',       v1: rat1,                       v2: rat2,                       d1: rat1.toFixed(1),                    d2: rat2.toFixed(1),                    delay: 0.3 },
    { label: 'Unique Directors', v1: data1.directors.length,     v2: data2.directors.length,     d1: String(data1.directors.length),     d2: String(data2.directors.length),     delay: 0.4 },
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

      {/* One split bar per metric */}
      <div className="flex flex-col gap-5">
        {METRICS.map((m) => {
          const total = m.v1 + m.v2 || 1            // avoid ÷0
          const pct1  = (m.v1 / total) * 100        // actor 1 share (left)
          const pct2  = (m.v2 / total) * 100        // actor 2 share (right)

          return (
            <div key={m.label} className="flex flex-col gap-2">

              {/* Metric label */}
              <p className="text-[11px] text-white/35 uppercase tracking-widest text-center">
                {m.label}
              </p>

              {/* ── Single split bar ───────────────────────────────── */}
              <div
                className="relative h-11 rounded-xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                {/* Actor 1 — amber, grows left → right */}
                <div
                  className="absolute left-0 top-0 bottom-0 flex items-center overflow-hidden"
                  style={{
                    width: animated ? `${pct1}%` : '0%',
                    background: '#f59e0b',
                    transition: `width 0.8s ease-out ${m.delay}s`,
                  }}
                >
                  <span className="pl-4 text-sm font-semibold text-white whitespace-nowrap leading-none">
                    {p1.name}
                  </span>
                  <span className="ml-auto pr-3 text-sm font-bold text-white tabular-nums leading-none">
                    {m.d1}
                  </span>
                </div>

                {/* Actor 2 — cyan, grows right → left */}
                <div
                  className="absolute right-0 top-0 bottom-0 flex items-center overflow-hidden"
                  style={{
                    width: animated ? `${pct2}%` : '0%',
                    background: '#06b6d4',
                    transition: `width 0.8s ease-out ${m.delay}s`,
                  }}
                >
                  <span className="pl-3 text-sm font-semibold text-white whitespace-nowrap leading-none">
                    {m.d2}
                  </span>
                  <span className="mr-auto pl-1 pr-4 text-sm font-bold text-white tabular-nums leading-none">
                    {p2.name}
                  </span>
                </div>
              </div>
              {/* ─────────────────────────────────────────────────────── */}

            </div>
          )
        })}
      </div>
    </div>
  )
}
