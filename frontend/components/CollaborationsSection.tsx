'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ActorAvatar from './ActorAvatar'
import DirectorsSection from './DirectorsSection'
import ScrollRow from './ScrollRow'
import { toActorSlug } from '@/lib/api'
import type { Collaborator, DirectorCollab, Actor, ActorMovie, Blockbuster } from '@/lib/api'
import {
  buildBlockbustersCanvas,
  buildCollaboratorsCanvas,
  shareCanvasCard,
} from '@/lib/shareSectionCard'

// ── Generic canvas-share button ───────────────────────────────────────────────
// Runs the supplied `buildFn` to produce a canvas then shares/downloads it.

function CanvasShareButton({
  label,
  buildFn,
  filename,
  actorName,
  sectionId,
}: {
  label: string
  buildFn: () => Promise<HTMLCanvasElement>
  filename: string
  actorName: string
  sectionId: string
}) {
  const [state, setState] = useState<'idle' | 'building' | 'done'>('idle')

  async function handleShare() {
    if (state === 'building') return
    setState('building')
    try {
      const canvas = await buildFn()
      await shareCanvasCard(canvas, filename, actorName, `${window.location.pathname}#${sectionId}`)
    } catch {
      try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${sectionId}`) } catch {}
    }
    setState('done')
    setTimeout(() => setState('idle'), 1800)
  }

  return (
    <button
      onClick={handleShare}
      aria-label={`Share ${label}`}
      className="flex items-center justify-center w-7 h-7 rounded-full opacity-50 hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {state === 'done' ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : state === 'building' ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5"
          className="animate-spin">
          <path d="M12 2a10 10 0 0 1 10 10"/>
        </svg>
      ) : (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      )}
    </button>
  )
}

interface CollaborationsSectionProps {
  collaborators: Collaborator[]
  leadCollaborators: Collaborator[]
  /** Heroines identified via TMDB billing_order ≤ 4 (more accurate than leadCollaborators) */
  heroineCollaborators: Collaborator[]
  directors: DirectorCollab[]
  blockbusters: Blockbuster[]
  movies: ActorMovie[]
  allActors: Actor[]
  allFemaleActors: Actor[]
  actorIdMap: Record<string, number>
  actorGender?: 'M' | 'F' | null
  /** Actor whose page this is — used to label canvas share cards. */
  actorName?: string
  actorSlug?: string
}

export default function CollaborationsSection({
  collaborators,
  leadCollaborators,
  heroineCollaborators,
  directors,
  blockbusters,
  movies,
  allActors,
  allFemaleActors,
  actorIdMap,
  actorGender,
  actorName = '',
  actorSlug = '',
}: CollaborationsSectionProps) {
  // Build gender maps
  const femaleNames = new Set(allFemaleActors.map(a => a.name.toLowerCase()))

  const genderMap: Record<string, 'M' | 'F'> = {}
  for (const a of allActors) {
    if (a.name && a.gender) {
      genderMap[a.name.toLowerCase()] = a.gender
    }
  }

  // Primary-tier names — used to filter male co-stars on an actress's page
  const primaryNames = new Set(
    allActors
      .filter(a => a.actor_tier === 'primary')
      .map(a => a.name.toLowerCase())
  )

  // For a male actor → show heroines from the billing-order endpoint
  // For a female actor → show male primary-tier co-stars
  const leadLabel = actorGender === 'F' ? '🎬 Lead Actors' : '✨ Lead Actresses'

  // heroineCollaborators comes from /heroine-collaborators (backend uses billing_order ≤ 4).
  // This correctly identifies lead actresses regardless of TMDB's role_type tagging,
  // which marks all heroines as 'supporting' because the male lead is top-billed.
  const actresses = actorGender === 'F'
    // actress page: show known primary male actors she worked with
    ? collaborators.filter(c => {
        const low = c.actor.toLowerCase()
        return genderMap[low] === 'M' && primaryNames.has(low)
      })
    // actor page: heroines identified by billing position — already correctly filtered
    : heroineCollaborators

  // Build latest year each director worked with this actor (from movies already fetched)
  const dirLatestYear: Record<string, number> = {}
  for (const m of movies) {
    if (m.director && m.release_year > 0) {
      if (!dirLatestYear[m.director] || m.release_year > dirLatestYear[m.director]) {
        dirLatestYear[m.director] = m.release_year
      }
    }
  }

  // Two-tier sort:
  //   Tier 1 (3+ films): ranked by film count DESC, then recency as tiebreaker
  //   Tier 2 (1–2 films): ranked by most recent collaboration first
  const topDirs = [...directors]
    .sort((a, b) => {
      const aHigh = a.films >= 3
      const bHigh = b.films >= 3
      if (aHigh !== bHigh) return aHigh ? -1 : 1          // tier 1 always above tier 2
      if (aHigh) {
        if (b.films !== a.films) return b.films - a.films  // more films first within tier 1
        return (dirLatestYear[b.director] ?? 0) - (dirLatestYear[a.director] ?? 0)
      }
      return (dirLatestYear[b.director] ?? 0) - (dirLatestYear[a.director] ?? 0) // recency within tier 2
    })
    .slice(0, 20)

  const hasActresses   = actresses.length > 0
  const hasDirs        = topDirs.length > 0
  const hasBlockbusters = blockbusters.length > 0

  if (!hasActresses && !hasDirs && !hasBlockbusters) return null

  return (
    <div className="flex flex-col gap-10">

      {/* ── Lead Actresses / Lead Actors ────────────────── */}
      {hasActresses && (
        <div id="collaborators" className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white leading-snug">{leadLabel}</h2>
              <p className="text-sm text-white/35 mt-0.5">Most frequent collaborators</p>
            </div>
            {actorName && (
              <CanvasShareButton
                label={leadLabel}
                buildFn={() => buildCollaboratorsCanvas({
                  actorName,
                  avatarSlug: actorSlug,
                  sectionLabel: leadLabel.replace(/^[^\w]+/, '').trim(), // strip emoji
                  collaborators: actresses.map(c => ({ actor: c.actor, films: c.films })),
                })}
                filename="cinetrace-collaborators.png"
                actorName={actorName}
                sectionId="collaborators"
              />
            )}
          </div>
          <ScrollRow>
            <div className="flex gap-5 pb-2 px-1" style={{ width: 'max-content' }}>
              {actresses.map(c => {
                const actorId = actorIdMap[c.actor]
                const inner = (
                  <div className="flex flex-col items-center gap-2 flex-shrink-0 group">
                    <div className={`ring-2 rounded-full transition-all duration-200 ${
                      actorId
                        ? 'ring-white/[0.08] group-hover:ring-violet-400/50 group-hover:scale-[1.06] cursor-pointer'
                        : 'ring-white/[0.04]'
                    }`}>
                      <ActorAvatar name={c.actor} size={64} />
                    </div>
                    <p className={`text-xs font-medium text-center w-20 truncate transition-colors ${
                      actorId
                        ? 'text-white/55 group-hover:text-white/85'
                        : 'text-white/35'
                    }`}>
                      {c.actor.split(' ').slice(0, 2).join(' ')}
                    </p>
                    <p className="text-white/28 text-[10px] -mt-1 tabular-nums">{c.films} {c.films === 1 ? 'film' : 'films'}</p>
                  </div>
                )
                return actorId ? (
                  <Link key={c.actor} href={`/actors/${toActorSlug(c.actor)}`}>{inner}</Link>
                ) : (
                  <div key={c.actor}>{inner}</div>
                )
              })}
            </div>
          </ScrollRow>
        </div>
      )}

      {/* ── Directors ───────────────────────────────────── */}
      {hasDirs && (
        <DirectorsSection
          directors={topDirs}
          movies={movies}
          actorName={actorName}
          actorSlug={actorSlug}
        />
      )}

      {/* ── Blockbusters ─────────────────────────────────── */}
      {hasBlockbusters && (
        <BlockbustersList
          blockbusters={blockbusters}
          actorName={actorName}
          actorSlug={actorSlug}
        />
      )}


    </div>
  )
}

// ── Blockbusters sub-component (needs animation state) ────────────────────────

const MICRO_COPY = [
  'Career peak performance',
  'Record-breaking opener',
  'Fan-favorite blockbuster',
  'Major box office success',
  'Powerful commercial hit',
  'Solid crowd-pleaser',
  'Profitable theatrical run',
  'Strong commercial outing',
  'Dependable box office draw',
  'Impressive theatrical run',
]

function formatCrore(val: number) {
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K Cr`
  return `₹${Math.round(val)} Cr`
}

function BlockbustersList({
  blockbusters,
  actorName = '',
  actorSlug = '',
}: {
  blockbusters: Blockbuster[]
  actorName?: string
  actorSlug?: string
}) {
  const [barsReady, setBarsReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAnimated  = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const t = setTimeout(() => setBarsReady(true), 80)
          return () => clearTimeout(t)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const maxCrore = blockbusters[0]?.box_office_crore ?? 1

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      <style>{`
        @keyframes bb-shimmer {
          0%   { left: -40%; }
          100% { left: 120%; }
        }
        .bb-bar::after {
          content: "";
          position: absolute;
          top: 0;
          left: -40%;
          width: 35%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          animation: bb-shimmer 2.5s ease-in-out infinite;
        }
      `}</style>
      <div id="blockbusters" className="flex flex-col gap-1">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white leading-snug">💰 Blockbusters</h2>
            <p className="text-sm text-white/35 mt-0.5">Box office collection</p>
          </div>
          {actorName && (
            <CanvasShareButton
              label="Blockbusters"
              buildFn={() => buildBlockbustersCanvas({
                actorName,
                avatarSlug: actorSlug,
                blockbusters: blockbusters.map(b => ({
                  title: b.title,
                  release_year: b.release_year,
                  box_office_crore: b.box_office_crore,
                })),
              })}
              filename="cinetrace-blockbusters.png"
              actorName={actorName}
              sectionId="blockbusters"
            />
          )}
        </div>
        <p className="text-[11px] text-white/30 leading-snug">
          Box office figures sourced from{' '}
          <a
            href="https://www.themoviedb.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-white/50 transition-colors"
          >
            TMDB
          </a>
          {' '}(community-contributed, worldwide gross converted to ₹ crore).
          Numbers are approximate and may differ from official figures.
        </p>
      </div>
      {/* Prestige leaderboard card */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          background: '#0e0c08',
          border: '1px solid rgba(207,175,107,0.14)',
          borderRadius: 20,
          boxShadow: '0 4px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(207,175,107,0.06) inset',
        }}
      >
        {blockbusters.map((b, i) => {
          const pct     = (b.box_office_crore / maxCrore) * 100
          const isFirst = i === 0
          const isTop3  = i < 3

          const posterW = isFirst ? 56 : isTop3 ? 44 : 38
          const posterH = isFirst ? 84 : isTop3 ? 66 : 57
          const py      = isFirst ? 'py-5' : isTop3 ? 'py-3.5' : 'py-3'
          const px      = 'px-5'

          const rankColor =
            i === 0 ? '#F5D98B'
            : i === 1 ? 'rgba(200,210,220,0.75)'
            : i === 2 ? 'rgba(180,120,60,0.80)'
            : 'rgba(255,255,255,0.18)'

          const rowBg    = isFirst ? 'rgba(207,175,107,0.07)' : 'transparent'
          const rowHover = isFirst ? 'rgba(207,175,107,0.12)' : 'rgba(255,255,255,0.04)'
          const borderL  = isFirst ? '3px solid rgba(245,217,139,0.55)' : '3px solid transparent'
          const glow     = isFirst ? '0 0 40px rgba(245,217,139,0.08) inset' : 'none'
          const barGlow  = isFirst ? '0 0 12px rgba(245,217,139,0.40)' : '0 0 8px rgba(207,175,107,0.20)'
          const divider  = i < blockbusters.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'

          return (
            <div
              key={b.title}
              className={`${px} ${py} transition-all duration-200 cursor-default`}
              style={{
                background: rowBg,
                borderLeft: borderL,
                boxShadow: glow,
                borderBottom: divider,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = rowHover }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = rowBg   }}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-7 text-center">
                  <span
                    className="font-bold tabular-nums"
                    style={{ fontSize: isFirst ? 15 : isTop3 ? 13 : 11, color: rankColor }}
                  >
                    #{i + 1}
                  </span>
                </div>

                {/* Poster */}
                <div
                  className="flex-shrink-0 overflow-hidden shadow-lg"
                  style={{
                    width: posterW,
                    height: posterH,
                    borderRadius: isFirst ? 12 : 8,
                    boxShadow: isFirst ? '0 6px 20px rgba(0,0,0,0.55)' : '0 4px 12px rgba(0,0,0,0.45)',
                  }}
                >
                  {b.poster_url ? (
                    <Image
                      src={b.poster_url}
                      alt={b.title}
                      width={posterW}
                      height={posterH}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/[0.04]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isFirst && (
                        <p
                          className="text-[9px] font-bold uppercase tracking-[0.18em] mb-1.5"
                          style={{ color: 'rgba(245,217,139,0.70)' }}
                        >
                          🏆 Highest Grosser
                        </p>
                      )}
                      <p
                        className="truncate leading-snug font-semibold"
                        style={{
                          fontSize: isFirst ? 16 : isTop3 ? 14 : 13,
                          color: isFirst ? '#fff' : isTop3 ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.62)',
                        }}
                      >
                        {b.title}
                      </p>
                      <p
                        className="mt-0.5 tabular-nums"
                        style={{ fontSize: 11, color: isFirst ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)' }}
                      >
                        {b.release_year}
                      </p>
                    </div>

                    {/* Revenue block */}
                    <div className="flex-shrink-0 text-right">
                      <span
                        className="font-bold tabular-nums block"
                        style={{
                          fontSize: isFirst ? 22 : isTop3 ? 15 : 13,
                          color: isFirst ? '#F5D98B' : isTop3 ? 'rgba(207,175,107,0.85)' : 'rgba(207,175,107,0.55)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.1,
                        }}
                      >
                        {formatCrore(b.box_office_crore)}
                      </span>
                      {b.budget_crore && b.budget_crore > 0 && (
                        <span className="text-[10px] tabular-nums" style={{ color: 'rgba(255,255,255,0.28)' }}>
                          {(b.box_office_crore / b.budget_crore).toFixed(1)}× ROI
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Budget */}
                  {b.budget_crore && b.budget_crore > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>Budget</span>
                      <span className="text-[10px] font-medium tabular-nums" style={{ color: 'rgba(255,255,255,0.38)' }}>
                        {formatCrore(b.budget_crore)}
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-[3px] rounded-full w-full mt-0.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="bb-bar h-full rounded-full relative overflow-hidden"
                      style={{
                        width: barsReady ? `${pct}%` : '0%',
                        background: isFirst
                          ? 'linear-gradient(90deg, #B8903A, #F5D98B, #E8C96A)'
                          : 'linear-gradient(90deg, #CFAF6B, #E8C96A)',
                        boxShadow: barGlow,
                        transition: `width ${700 + i * 40}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-white/18 text-[10px] text-right">
        Box office: TMDB · Budget: TMDB / Wikipedia
      </p>
    </div>
  )
}
