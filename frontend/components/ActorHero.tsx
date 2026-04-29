'use client'

import Image from 'next/image'
import type { ActorProfile } from '@/lib/api'

interface ActorHeroProps {
  actor: ActorProfile
  collaboratorCount: number
  directorCount: number
  firstFilm?: { title: string; year: number } | null
  biggestHit?: { title: string; crore: number; year: number } | null
}

const CURRENT_YEAR = new Date().getFullYear()

function formatCrore(val: number) {
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K Cr`
  return `₹${Math.round(val)} Cr`
}

function generateSubtitle(industry: string, careerYears: number, filmCount: number): string {
  const ind = industry.charAt(0).toUpperCase() + industry.slice(1).toLowerCase()
  if (careerYears >= 45) return `${ind} cinema's timeless icon — ${careerYears} years of superstardom`
  if (careerYears >= 35) return `Redefining ${ind} cinema for over three decades`
  if (careerYears >= 25) return `A quarter century defining ${ind} cinema`
  if (careerYears >= 15) return `${filmCount} films deep into a celebrated ${ind} career`
  if (careerYears >= 8)  return `Building a landmark career in ${ind} cinema`
  return `${ind} cinema's rising powerhouse`
}

export default function ActorHero({
  actor,
  collaboratorCount,
  directorCount,
  firstFilm,
  biggestHit,
}: ActorHeroProps) {
  const slug      = actor.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const debutYear = actor.first_film_year ?? firstFilm?.year ?? null
  const careerYears = debutYear ? CURRENT_YEAR - debutYear : 0
  const subtitle    = debutYear ? generateSubtitle(actor.industry, careerYears, actor.film_count) : null
  const hasPanel    = !!(debutYear || biggestHit)

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: '#0b0b18',
        borderRadius: 32,
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 16px 56px rgba(0,0,0,0.50)',
      }}
    >
      {/* ── Background layers ──────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1430] via-[#0e0e1e] to-[#080810]" />

      {/* Deep violet glow — portrait left */}
      <div
        className="absolute left-0 top-0 pointer-events-none"
        style={{
          width: '50%',
          height: '100%',
          background: 'radial-gradient(ellipse at 15% 60%, rgba(90,50,220,0.22) 0%, transparent 65%)',
        }}
      />

      {/* Ambient glow — right side, behind panel */}
      <div
        className="absolute right-0 top-0 pointer-events-none"
        style={{
          width: '55%',
          height: '100%',
          background: 'radial-gradient(ellipse at 85% 35%, rgba(110,65,240,0.12) 0%, transparent 60%)',
        }}
      />

      {/* Warm gold accent — bottom right, subtle prestige */}
      <div
        className="absolute right-0 bottom-0 pointer-events-none"
        style={{
          width: '35%',
          height: '50%',
          background: 'radial-gradient(ellipse at 95% 95%, rgba(200,158,50,0.07) 0%, transparent 65%)',
        }}
      />

      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.028,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* ── Layout ─────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-row items-end">

        {/* ── Portrait ───────────────────────────────────── */}
        <div
          className="flex-shrink-0 self-end relative"
          style={{ marginBottom: -1, transform: 'translateX(8px)' }}
        >
          {/* Halo glow */}
          <div
            style={{
              position: 'absolute',
              inset: '-28px',
              background: 'radial-gradient(ellipse at 45% 55%, rgba(100,55,245,0.26) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ width: 200, height: 252, position: 'relative' }}>
            <Image
              src={`/avatars/${slug}.png`}
              alt={actor.name}
              fill
              priority
              sizes="(max-width: 640px) 140px, 200px"
              className="object-cover object-top"
              style={{
                maskImage:       'radial-gradient(ellipse 88% 90% at 50% 52%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 88% 90% at 50% 52%, rgba(0,0,0,1) 52%, rgba(0,0,0,0) 100%)',
                filter: 'drop-shadow(0 18px 40px rgba(0,0,0,0.65))',
                transform: 'scale(1.06)',
                opacity: 0.98,
              }}
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement
                el.style.display = 'none'
                const parent = el.parentElement
                if (parent) {
                  parent.style.background = initialsColor(actor.name)
                  parent.innerHTML = `<span style="font-size:56px;color:rgba(255,255,255,0.9);font-weight:700;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${initials(actor.name)}</span>`
                }
              }}
            />
          </div>
        </div>

        {/* ── Text block ─────────────────────────────────── */}
        <div className="flex flex-col gap-3 px-6 py-10 sm:py-14 flex-1 min-w-0">

          {/* Industry pill */}
          <div>
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.15em] px-3 py-1 rounded-full"
              style={{
                color: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.13)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {actor.industry}
            </span>
          </div>

          {/* Actor name */}
          <h1
            className="text-white tracking-tight leading-[1.0]"
            style={{ fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 800, letterSpacing: '-0.02em' }}
          >
            {actor.name}
          </h1>

          {/* Editorial subtitle */}
          {subtitle && (
            <p
              className="leading-snug max-w-md"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', marginTop: -4 }}
            >
              {subtitle}
            </p>
          )}

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 mt-0.5">
            <StatChip icon="🎬" value={actor.film_count}  label="Films"     />
            <StatChip icon="🤝" value={collaboratorCount} label="Co-stars"  />
            <StatChip icon="🎥" value={directorCount}     label="Directors" />
          </div>

          {/* Debut line */}
          {firstFilm && (
            <p className="text-white/28 text-xs mt-0.5 leading-snug">
              Debut{' '}
              <span className="text-white/48 font-medium">{firstFilm.title}</span>
              {firstFilm.year > 0 && (
                <span className="text-white/22"> ({firstFilm.year})</span>
              )}
            </p>
          )}
        </div>

        {/* ── Right panel — Career Snapshot ──────────────── */}
        {hasPanel && (
          <div className="hidden md:flex flex-col flex-shrink-0 self-center mr-8" style={{ width: 186 }}>
            <div
              className="flex flex-col gap-3.5 p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: 22,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
              }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/28">
                Career Snapshot
              </p>

              {debutYear && (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Since</p>
                  <p
                    className="text-white tabular-nums font-bold"
                    style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: '-0.02em' }}
                  >
                    {debutYear}
                  </p>
                  <p className="text-[11px] text-white/38">
                    {careerYears} {careerYears === 1 ? 'year' : 'years'} in cinema
                  </p>
                </div>
              )}

              {debutYear && biggestHit && (
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              )}

              {biggestHit && (
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">Biggest Hit</p>
                  <p className="text-sm font-semibold text-white/90 leading-snug line-clamp-2">
                    {biggestHit.title}
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: '#F5D98B', letterSpacing: '-0.01em' }}>
                    {formatCrore(biggestHit.crore)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.11)',
      }}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-white font-bold text-sm tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>{label}</span>
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = ['#7c3aed','#db2777','#ea580c','#2563eb','#16a34a','#0891b2']
function initialsColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}
