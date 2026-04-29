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
      <div className="flex flex-col gap-2">
        {blockbusters.map((b, i) => {
          const pct       = (b.box_office_crore / maxCrore) * 100
          const isFirst   = i === 0
          const isTop3    = i < 3

          // Size tiers
          const posterW   = isFirst ? 52 : isTop3 ? 42 : 36
          const posterH   = isFirst ? 78 : isTop3 ? 63 : 54
          const py        = isFirst ? 'py-4' : isTop3 ? 'py-3' : 'py-2.5'

          const rankColor =
            i === 0 ? 'text-yellow-400'
            : i === 1 ? 'text-slate-300/80'
            : i === 2 ? 'text-amber-600/80'
            : 'text-white/18'

          const bgColor   = isFirst ? 'rgba(207,175,107,0.07)' : 'rgba(255,255,255,0.02)'
          const bgHover   = isFirst ? 'rgba(207,175,107,0.11)' : 'rgba(255,255,255,0.045)'
          const border    = isFirst ? '1px solid rgba(207,175,107,0.22)' : '1px solid rgba(255,255,255,0.05)'
          const glow      = isFirst ? '0 0 28px rgba(245,217,139,0.10)' : 'none'
          const barGlow   = isFirst ? '0 0 14px rgba(245,217,139,0.35)' : '0 0 10px rgba(245,217,139,0.2)'

          return (
            <div
              key={b.title}
              className={`rounded-xl px-4 ${py} transition-all duration-200 cursor-default`}
              style={{ background: bgColor, border, boxShadow: glow }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1.01)'
                el.style.background = bgHover
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'scale(1)'
                el.style.background = bgColor
              }}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <span
                  className={`flex-shrink-0 font-bold w-6 text-center tabular-nums ${rankColor}`}
                  style={{ fontSize: isFirst ? 14 : isTop3 ? 12 : 11 }}
                >
                  #{i + 1}
                </span>

                {/* Poster */}
                <div
                  className="flex-shrink-0 rounded-lg overflow-hidden bg-white/[0.04] shadow-md"
                  style={{ width: posterW, height: posterH }}
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
                    <div className="w-full h-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {/* Top row: title + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {isFirst && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#F5D98B', opacity: 0.8 }}>
                          🏆 Highest Grossing
                        </p>
                      )}
                      <p className={`font-semibold truncate leading-snug ${
                        isFirst ? 'text-white text-[15px]'
                        : isTop3 ? 'text-white/85 text-sm'
                        : 'text-white/70 text-sm'
                      }`}>
                        {b.title}
                      </p>
                      <p className={`mt-0.5 ${isFirst ? 'text-white/35 text-xs' : 'text-white/25 text-[11px]'}`}>
                        {b.release_year}
                      </p>
                    </div>
                    {/* Collection + ROI */}
                    <div className="flex-shrink-0 text-right">
                      <span className={`font-bold tabular-nums block ${
                        isFirst ? 'text-[#F5D98B] text-base'
                        : isTop3 ? 'text-[#CFAF6B]/90 text-sm'
                        : 'text-[#CFAF6B]/60 text-xs'
                      }`}>
                        {formatCrore(b.box_office_crore)}
                      </span>
                      {b.budget_crore && b.budget_crore > 0 && (
                        <span className="text-[10px] text-white/30 tabular-nums">
                          {(b.box_office_crore / b.budget_crore).toFixed(1)}x ROI
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Budget row */}
                  {b.budget_crore && b.budget_crore > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-white/25">Budget</span>
                      <span className="text-[10px] text-white/40 font-medium tabular-nums">{formatCrore(b.budget_crore)}</span>
                      <span className="text-[9px] text-white/15">({b.budget_source})</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="h-[4px] rounded-full w-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div
                      className="bb-bar h-full rounded-full relative overflow-hidden"
                      style={{
                        width: barsReady ? `${pct}%` : '0%',
                        background: 'linear-gradient(90deg, #CFAF6B, #F5D98B, #CFAF6B)',
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
      <p className="text-white/20 text-[11px] text-right">
        Box office: TMDB · Budget: TMDB / Wikipedia
      </p>
    </div>
  )
}
