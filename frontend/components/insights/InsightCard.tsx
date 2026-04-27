'use client'

/**
 * components/insights/InsightCard.tsx
 * ────────────────────────────────────
 * Premium, cinematic stat card — the visual heart of CineTrace.
 *
 * Design goals
 *  • Netflix polish + Spotify Wrapped clarity + StatMuse simplicity
 *  • Type-specific dark gradients with accent glow
 *  • Actor portrait bleeds to right edge; soft left-fade blends into bg
 *  • Huge dominant stat number with glow text-shadow
 *  • Grain overlay (4 %), top accent line, bottom CineTrace brand
 *  • Type-specific decorative SVG / animation layer
 *  • Hover: translateY(-4px) lift + enhanced box-shadow + image zoom
 *  • No Framer Motion — pure CSS transitions for zero JS overhead
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { shareInsight } from '@/lib/shareInsight'

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightType =
  | 'cross_industry'
  | 'collab_shock'
  | 'hidden_dominance'
  | 'career_peak'
  | 'network_power'
  | 'director_loyalty'
  | string // allows legacy types without breaking ts

export interface InsightCardProps {
  /** Insight type — controls gradient theme and bg decoration */
  type: InsightType
  /** Small category tag at the top (e.g. "ICONIC DUO") */
  title: string
  /** Hero stat — full string (e.g. "14 films together", "2005–2010").
   *  The card splits it internally into big-number + unit. */
  value: string | number
  /** Context sentence shown below the stat (blurb / subtext) */
  label: string
  /** Cinematic footer phrase (bottom-left) */
  footer?: string
  /** Primary actor portrait URL */
  imageUrl?: string
  /** Primary actor name (used for alt text + share data) */
  actorName?: string
  /** Second actor portrait for collab duo cards */
  secondaryImageUrl?: string
  /** Arbitrary extra data — reserved for future use */
  extraMeta?: unknown
  /** Navigation href when card is clicked */
  href?: string
}

// ── Theme system ──────────────────────────────────────────────────────────────

interface CardTheme {
  bg: string          // CSS background (gradient)
  darkStop: string    // darkest colour stop — used for image left-fade colour
  accent: string      // vibrant accent: glow, labels, lines
  statGlow: string    // text-shadow on the big stat number
  restShadow: string  // idle box-shadow
  hoverShadow: string // hover box-shadow
  accentLine: string  // rgba colour for the top 1.5 px edge line
}

const THEMES: Record<string, CardTheme> = {
  cross_industry: {
    bg:          'linear-gradient(145deg, #0e5f3b 0%, #073d26 55%, #0a2e1f 100%)',
    darkStop:    '#0a2e1f',
    accent:      '#4ade80',
    statGlow:    '0 0 28px rgba(74,222,128,0.50)',
    restShadow:  '0 4px 24px rgba(14,95,59,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(74,222,128,0.20) inset, 0 0 52px rgba(74,222,128,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(74,222,128,0.45)',
  },
  collab_shock: {
    bg:          'linear-gradient(145deg, #7a2400 0%, #4a1500 55%, #2b0d05 100%)',
    darkStop:    '#2b0d05',
    accent:      '#fb923c',
    statGlow:    '0 0 28px rgba(251,146,60,0.50)',
    restShadow:  '0 4px 24px rgba(122,36,0,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(251,146,60,0.20) inset, 0 0 52px rgba(251,146,60,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(251,146,60,0.45)',
  },
  hidden_dominance: {
    bg:          'linear-gradient(145deg, #5b1aa8 0%, #35087a 55%, #180428 100%)',
    darkStop:    '#180428',
    accent:      '#c084fc',
    statGlow:    '0 0 28px rgba(192,132,252,0.50)',
    restShadow:  '0 4px 24px rgba(91,26,168,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(192,132,252,0.20) inset, 0 0 52px rgba(192,132,252,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(192,132,252,0.45)',
  },
  career_peak: {
    bg:          'linear-gradient(145deg, #8c6a00 0%, #5a4000 55%, #241800 100%)',
    darkStop:    '#241800',
    accent:      '#fbbf24',
    statGlow:    '0 0 28px rgba(251,191,36,0.50)',
    restShadow:  '0 4px 24px rgba(140,106,0,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(251,191,36,0.20) inset, 0 0 52px rgba(251,191,36,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(251,191,36,0.45)',
  },
  network_power: {
    bg:          'linear-gradient(145deg, #004f8a 0%, #003060 55%, #071a2e 100%)',
    darkStop:    '#071a2e',
    accent:      '#60a5fa',
    statGlow:    '0 0 28px rgba(96,165,250,0.50)',
    restShadow:  '0 4px 24px rgba(0,79,138,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(96,165,250,0.20) inset, 0 0 52px rgba(96,165,250,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(96,165,250,0.45)',
  },
  director_loyalty: {
    bg:          'linear-gradient(145deg, #006a66 0%, #004040 55%, #081d1d 100%)',
    darkStop:    '#081d1d',
    accent:      '#2dd4bf',
    statGlow:    '0 0 28px rgba(45,212,191,0.50)',
    restShadow:  '0 4px 24px rgba(0,106,102,0.50), 0 1px 0 rgba(255,255,255,0.04) inset',
    hoverShadow: '0 -1px 0 rgba(45,212,191,0.20) inset, 0 0 52px rgba(45,212,191,0.22), 0 22px 44px rgba(0,0,0,0.65)',
    accentLine:  'rgba(45,212,191,0.45)',
  },
}

// Legacy / director_box_office fallbacks
THEMES.collaboration      = THEMES.collab_shock
THEMES.director           = THEMES.director_loyalty
THEMES.supporting         = THEMES.hidden_dominance
THEMES.director_box_office = THEMES.career_peak

function getTheme(type: string): CardTheme {
  return THEMES[type] ?? THEMES.collab_shock
}

// ── Stat parser ───────────────────────────────────────────────────────────────

function splitStat(v: string | number): { main: string; unit: string | null } {
  const s = String(v).trim()
  if (/^\d{4}[–\-]\d{4}$/.test(s)) return { main: s, unit: null }   // "2005–2010"
  if (/^[\d,]+$/.test(s))           return { main: s, unit: null }   // "42", "1,200"
  const idx = s.indexOf(' ')
  if (idx > 0) return { main: s.slice(0, idx), unit: s.slice(idx + 1) }
  return { main: s, unit: null }
}

// ── Type-specific background decorations ──────────────────────────────────────

function TypeDecoration({ type, accent }: { type: string; accent: string }) {
  switch (type) {
    // career_peak — tiny upward line chart, bottom-left
    case 'career_peak':
      return (
        <svg
          className="absolute bottom-3 left-4 pointer-events-none"
          width="76" height="30" viewBox="0 0 76 30" fill="none"
          aria-hidden="true"
        >
          <polyline
            points="0,26 10,18 22,21 34,10 46,14 58,4 68,7 76,1"
            stroke={accent} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"
            opacity="0.28"
          />
          <polyline
            points="0,26 10,18 22,21 34,10 46,14 58,4 68,7 76,1"
            stroke="white" strokeWidth="0.8"
            strokeLinecap="round" strokeLinejoin="round"
            opacity="0.10"
          />
        </svg>
      )

    // network_power — faint node + connection graph across the card
    case 'network_power':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 380 260" fill="none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {([
            [35,40, 110,130], [110,130, 230,70], [230,70, 340,190],
            [110,130, 190,215], [35,40, 230,70], [190,215, 340,190],
            [280,35, 230,70],
          ] as [number,number,number,number][]).map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={accent} strokeWidth="0.7" opacity="0.16"/>
          ))}
          {([
            [35,40,3.5], [110,130,5.5], [230,70,3.5], [340,190,3],
            [190,215,3], [280,35,2.5], [55,185,2],
          ] as [number,number,number][]).map(([cx,cy,r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={accent} opacity="0.22"/>
          ))}
        </svg>
      )

    // cross_industry — dot-grid (faint world map texture)
    case 'cross_industry':
      return (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 380 260"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, row) =>
            Array.from({ length: 16 }, (_, col) => (
              <circle
                key={`${row}-${col}`}
                cx={col * 26 + 13} cy={row * 38 + 19}
                r="1.4" fill={accent} opacity="0.11"
              />
            ))
          )}
        </svg>
      )

    // hidden_dominance — pulsing radial aura (royal glow)
    case 'hidden_dominance':
      return (
        <div
          className="absolute inset-0 pointer-events-none animate-pulse"
          style={{
            background: `radial-gradient(ellipse 62% 55% at 72% 48%, ${accent}16 0%, transparent 62%)`,
            animationDuration: '3.2s',
          }}
        />
      )

    // director_loyalty — director chair silhouette, right-of-image area
    case 'director_loyalty':
      return (
        <svg
          className="absolute bottom-3 right-24 pointer-events-none"
          width="44" height="44" viewBox="0 0 44 44" fill="none"
          aria-hidden="true" opacity="0.13"
        >
          <rect x="6" y="24" width="32" height="3.5" rx="1.75" fill={accent}/>
          <rect x="8" y="27.5" width="3.5" height="13" rx="1.5" fill={accent}/>
          <rect x="32.5" y="27.5" width="3.5" height="13" rx="1.5" fill={accent}/>
          <rect x="10" y="8" width="24" height="16" rx="2.5" fill={accent}/>
          <line x1="5" y1="16" x2="10" y2="16" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
          <line x1="34" y1="16" x2="39" y2="16" stroke={accent} strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )

    default:
      return null
  }
}

// ── Grain texture (static data URI — browser-cached across renders) ───────────

const GRAIN = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

// ── Main component ────────────────────────────────────────────────────────────

export default function InsightCard({
  type,
  title,
  value,
  label,
  footer,
  imageUrl,
  actorName,
  secondaryImageUrl,
  href = '#',
}: InsightCardProps) {
  const [hovered,    setHovered]    = useState(false)
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle')

  const theme = getTheme(type)
  const { main: statMain, unit: statUnit } = splitStat(value)

  const hasDuo    = !!imageUrl && !!secondaryImageUrl
  const hasSingle = !!imageUrl && !hasDuo
  const hasImage  = hasSingle || hasDuo

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const r = await shareInsight({ href, actorName, statValue: value })
    if (r.ok) {
      setShareState('copied')
      setTimeout(() => setShareState('idle'), 1800)
    }
  }

  return (
    <Link href={href} className="block h-full" tabIndex={-1}>
      <article
        aria-label={`${title}: ${value}${label ? ` — ${label}` : ''}`}
        className="
          group relative rounded-2xl overflow-hidden cursor-pointer
          border border-white/[0.08]
          h-[240px] sm:h-[280px]
        "
        style={{
          background:  theme.bg,
          boxShadow:   hovered ? theme.hoverShadow : theme.restShadow,
          transform:   hovered ? 'translateY(-4px)' : 'translateY(0)',
          transition:  'transform 240ms cubic-bezier(.34,1.56,.64,1), box-shadow 240ms ease',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >

        {/* ── Grain texture overlay (4 %) ─────────────────────────────────── */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            backgroundImage: GRAIN,
            opacity: 0.038,
            mixBlendMode: 'overlay',
          }}
        />

        {/* ── Type-specific bg decoration ─────────────────────────────────── */}
        <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
          <TypeDecoration type={type} accent={theme.accent} />
        </div>

        {/* ── Top 1.5 px accent line ──────────────────────────────────────── */}
        <div
          className="absolute top-0 inset-x-0 h-[1.5px] z-20 pointer-events-none rounded-t-2xl"
          style={{
            background: `linear-gradient(to right,
              transparent 3%,
              ${theme.accentLine} 32%,
              ${theme.accentLine} 68%,
              transparent 97%)`,
          }}
        />

        {/* ── Single-actor portrait — bleeds to right edge ────────────────── */}
        {hasSingle && (
          <div
            className="absolute top-0 right-0 bottom-0 z-[2] pointer-events-none"
            style={{ width: '44%' }}
          >
            <div className="relative w-full h-full">
              {/* Left-edge fade: portrait → background colour */}
              <div
                className="absolute inset-y-0 left-0 w-20 z-10"
                style={{
                  background: `linear-gradient(to right, ${theme.darkStop} 0%, transparent 100%)`,
                }}
              />
              {/* Bottom vignette */}
              <div
                className="absolute bottom-0 inset-x-0 h-14 z-10"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 100%)' }}
              />
              <Image
                src={imageUrl!}
                alt={actorName ?? 'Actor portrait'}
                fill
                className="object-cover object-top"
                style={{
                  transform:  hovered ? 'scale(1.05)' : 'scale(1.0)',
                  transition: 'transform 420ms ease',
                }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            </div>
          </div>
        )}

        {/* ── Duo portraits — overlapping circles ─────────────────────────── */}
        {hasDuo && (
          <div className="absolute bottom-0 right-0 z-[2] pointer-events-none flex items-end pb-4 pr-3">
            {[
              { src: imageUrl!,          name: actorName ?? '', zIdx: 2 },
              { src: secondaryImageUrl!, name: '',              zIdx: 1 },
            ].map((a, i) => (
              <div
                key={i}
                className="relative rounded-full overflow-hidden flex-shrink-0"
                style={{
                  width:       82,
                  height:      82,
                  marginLeft:  i === 0 ? 0 : -22,
                  zIndex:      a.zIdx,
                  border:      '2.5px solid rgba(0,0,0,0.55)',
                  boxShadow:   '0 4px 18px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.07)',
                  transform:   hovered ? 'scale(1.06)' : 'scale(1)',
                  transition:  `transform ${340 + i * 50}ms ease`,
                }}
              >
                <Image
                  src={a.src}
                  alt={a.name || 'Actor portrait'}
                  fill
                  className="object-cover object-top"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Text content ────────────────────────────────────────────────── */}
        <div
          className="relative z-10 flex flex-col h-full p-5 pb-4"
          style={{ maxWidth: hasImage ? '62%' : '100%' }}
        >

          {/* Category label — small, spaced, accent tint */}
          <p
            className="text-[10px] font-semibold uppercase leading-none"
            style={{
              letterSpacing: '0.25em',
              color: `${theme.accent}cc`,
            }}
          >
            {title}
          </p>

          {/* Stat block — hero content */}
          <div className="mt-3 flex-1 min-h-0">
            {/* Big number */}
            <div
              className="font-black leading-none tracking-tighter"
              style={{
                fontSize:   'clamp(2.5rem, 9vw, 3.4rem)',
                color:      '#ffffff',
                textShadow: theme.statGlow,
              }}
            >
              {statMain}
            </div>

            {/* Unit (e.g. "films together", "industries") */}
            {statUnit && (
              <p
                className="text-[11px] font-bold mt-1 leading-none tracking-wide"
                style={{ color: theme.accent }}
              >
                {statUnit}
              </p>
            )}

            {/* Context blurb */}
            {label && (
              <p
                className="text-[12px] font-medium mt-2 leading-snug"
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {label}
              </p>
            )}
          </div>

          {/* Footer row — cinematic phrase + CineTrace brand */}
          <div className="mt-auto pt-2 flex items-end justify-between gap-2">
            {footer ? (
              <p
                className="text-[10px] font-medium leading-tight"
                style={{ color: `${theme.accent}80` }}
              >
                {footer}
              </p>
            ) : (
              <span />
            )}
            <span
              className="text-[8px] uppercase tracking-[0.22em] flex-shrink-0"
              style={{ color: 'rgba(255,255,255,0.28)' }}
            >
              CineTrace
            </span>
          </div>
        </div>

        {/* ── Share button — top-right, appears on hover ──────────────────── */}
        <button
          onClick={handleShare}
          className="
            absolute top-3.5 right-3.5 z-30
            w-7 h-7 rounded-full flex items-center justify-center
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
          "
          style={{
            background:    'rgba(255,255,255,0.12)',
            backdropFilter:'blur(6px)',
            border:        '1px solid rgba(255,255,255,0.14)',
          }}
          aria-label={shareState === 'copied' ? 'Copied!' : 'Share this insight'}
          title={shareState === 'copied' ? 'Copied!' : 'Share'}
        >
          {shareState === 'copied' ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="#4ade80" strokeWidth="3" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.72)" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3"/>
              <circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          )}
        </button>

      </article>
    </Link>
  )
}
