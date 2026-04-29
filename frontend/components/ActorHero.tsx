'use client'

import Image from 'next/image'
import type { ActorProfile } from '@/lib/api'

interface ActorHeroProps {
  actor: ActorProfile
  collaboratorCount: number
  directorCount: number
  firstFilm?: { title: string; year: number } | null
}

export default function ActorHero({
  actor,
  collaboratorCount,
  directorCount,
  firstFilm,
}: ActorHeroProps) {
  const slug = actor.name.toLowerCase().replace(/[^a-z0-9]/g, '')

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: '#0f0f1a',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.32)',
      }}
    >

      {/* ── Background layers ──────────────────────────────────── */}
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c35] via-[#0f0f1a] to-[#0a0a0f]" />

      {/* Radial glow — top-right, wider and stronger */}
      <div
        className="absolute right-0 top-0 w-3/4 h-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 85% 15%, rgba(100,60,240,0.12) 0%, transparent 58%)',
        }}
      />

      {/* Second glow — bottom-left accent */}
      <div
        className="absolute left-0 bottom-0 w-1/2 h-1/2 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 10% 90%, rgba(60,80,200,0.07) 0%, transparent 60%)',
        }}
      />

      {/* Noise texture — 2.5% opacity film grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* ── Layout ─────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-row items-end" style={{ gap: 0 }}>

        {/* ── Avatar ─────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 self-end group"
          style={{ marginBottom: -1, transform: 'translateX(8px)' }}
        >
          {/* Subtle glow halo behind portrait */}
          <div
            style={{
              position: 'absolute',
              inset: '-20px',
              background: 'radial-gradient(ellipse at 50% 60%, rgba(100,60,240,0.14) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              width: 185,
              height: 232,
              position: 'relative',
            }}
          >
            <Image
              src={`/avatars/${slug}.png`}
              alt={actor.name}
              fill
              priority
              sizes="(max-width: 640px) 140px, 185px"
              className="object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
              style={{
                maskImage:       'radial-gradient(ellipse 88% 92% at 50% 52%, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 88% 92% at 50% 52%, rgba(0,0,0,1) 58%, rgba(0,0,0,0) 100%)',
                filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.50))',
                transform: 'scale(1.05)',
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

        {/* ── Text block ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5 px-5 py-8 sm:py-11 flex-1 min-w-0">

          {/* Industry pill */}
          <div>
            <span
              className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
              style={{
                color: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.05)',
              }}
            >
              {actor.industry}
            </span>
          </div>

          {/* Actor name — headline-scale */}
          <h1
            className="text-white tracking-tight leading-[1.04]"
            style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800 }}
          >
            {actor.name}
          </h1>

          {/* Premium stat chips */}
          <div className="flex flex-wrap gap-2 mt-0.5">
            <StatChip icon="🎬" value={actor.film_count}   label="Films"     />
            <StatChip icon="🤝" value={collaboratorCount}  label="Co-stars"  />
            <StatChip icon="🎥" value={directorCount}      label="Directors" />
          </div>

          {/* First film */}
          {firstFilm && (
            <p className="text-white/40 text-xs mt-0.5 leading-snug">
              First film{' '}
              <span className="text-white/60 font-medium">{firstFilm.title}</span>
              {firstFilm.year > 0 && (
                <span className="text-white/30"> ({firstFilm.year})</span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatChip({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-white font-bold text-sm tabular-nums">{value.toLocaleString()}</span>
      <span className="text-white/40 text-xs">{label}</span>
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
