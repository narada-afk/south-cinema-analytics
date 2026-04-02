'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ActorAvatar from './ActorAvatar'

export interface InsightCardData {
  emoji: string
  label: string
  headline: string
  stat: string | number
  subtext?: string
  actors?: Array<{ name: string; avatarSlug?: string }>
  gradient: 'red' | 'purple' | 'orange' | 'blue' | 'green' | 'amber'
  href?: string
}

const CARD_BG: Record<InsightCardData['gradient'], string> = {
  red:    '#130507',
  purple: '#0b0613',
  orange: '#130904',
  blue:   '#030f19',
  green:  '#031308',
  amber:  '#130b02',
}

const ACCENT: Record<InsightCardData['gradient'], string> = {
  red:    '#f87171',
  purple: '#c084fc',
  orange: '#fb923c',
  blue:   '#60a5fa',
  green:  '#4ade80',
  amber:  '#fbbf24',
}

const GLOW: Record<InsightCardData['gradient'], string> = {
  red:    'rgba(239,68,68,0.18)',
  purple: 'rgba(168,85,247,0.18)',
  orange: 'rgba(249,115,22,0.18)',
  blue:   'rgba(59,130,246,0.18)',
  green:  'rgba(34,197,94,0.18)',
  amber:  'rgba(251,191,36,0.18)',
}

export default function InsightCard({
  emoji,
  label,
  headline,
  stat,
  subtext,
  actors = [],
  gradient,
  href = '#',
}: InsightCardData) {
  const accentColor = ACCENT[gradient]
  const bgColor     = CARD_BG[gradient]
  const glowColor   = GLOW[gradient]

  const [copied, setCopied] = useState(false)

  function handleShare(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url = typeof window !== 'undefined' ? `${window.location.origin}${href}` : href
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }).catch(() => {})
  }

  const singleActor = actors.length === 1
  const multiActor  = actors.length >= 2

  return (
    <Link href={href} className="block h-full">
      <div
        className="group relative rounded-2xl overflow-hidden h-[168px] flex cursor-pointer
                   hover:scale-[1.02] hover:brightness-110 transition-all duration-200
                   border border-white/5"
        style={{ background: bgColor }}
      >
        {/* Share button — appears on hover */}
        <button
          onClick={handleShare}
          className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(255,255,255,0.10)' }}
          title={copied ? 'Copied!' : 'Share'}
          aria-label="Share"
        >
          {copied ? (
            <span className="text-[10px] text-green-400 font-bold">✓</span>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          )}
        </button>
        {/* Left radial glow — colour bleed from the accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 90% 90% at 0% 50%, ${glowColor}, transparent 70%)`,
          }}
        />

        {/* ── LEFT: text content ───────────────────────────── */}
        <div className="relative z-10 flex flex-col justify-between p-5 pr-3 flex-1 min-w-0" style={{ maxWidth: '62%' }}>

          {/* Label */}
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: accentColor }}
          >
            {label}
          </span>

          {/* Big stat — primary visual focus */}
          <div className="text-[3rem] font-black text-white leading-none tracking-tight">
            {stat}
          </div>

          {/* Supporting line — single line, low opacity */}
          <p className="text-[11px] text-white/38 leading-snug line-clamp-1 min-w-0">
            {headline}
          </p>
        </div>

        {/* ── RIGHT: actor portrait(s) ─────────────────────── */}
        {actors.length > 0 && (
          <div className="relative flex-shrink-0 flex items-center self-stretch">

            {/* Single actor — large portrait bleeding off bottom-right, no circle */}
            {singleActor && (
              <div className="relative self-end mb-[-24px] mr-[-20px]">
                {/* Glow halo behind portrait */}
                <div
                  className="absolute inset-0 blur-2xl scale-75"
                  style={{ background: glowColor }}
                />
                {actors[0].avatarSlug ? (
                  <Image
                    src={`/avatars/${actors[0].avatarSlug}.png`}
                    alt={actors[0].name}
                    width={160}
                    height={160}
                    className="relative object-cover object-top"
                    style={{
                      maskImage: 'radial-gradient(ellipse 80% 85% at 50% 45%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 50% 45%, rgba(0,0,0,1) 55%, rgba(0,0,0,0) 100%)',
                      filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))',
                    }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <ActorAvatar name={actors[0].name} size={150} />
                )}
              </div>
            )}

            {/* Two actors — overlapping portraits, no circle */}
            {multiActor && (
              <div className="relative flex items-end self-end mb-[-24px] mr-[-16px]">
                {actors.slice(0, 2).map((actor, i) => (
                  <div
                    key={actor.name}
                    className="relative"
                    style={{
                      marginLeft: i === 0 ? 0 : -28,
                      zIndex: i === 0 ? 2 : 1,
                    }}
                  >
                    <div
                      className="absolute inset-0 blur-xl scale-75"
                      style={{ background: glowColor, opacity: 0.5 }}
                    />
                    {actor.avatarSlug ? (
                      <Image
                        src={`/avatars/${actor.avatarSlug}.png`}
                        alt={actor.name}
                        width={110}
                        height={110}
                        className="relative object-cover object-top"
                        style={{
                          maskImage: 'radial-gradient(ellipse 80% 85% at 50% 45%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
                          WebkitMaskImage: 'radial-gradient(ellipse 80% 85% at 50% 45%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
                          filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.6))',
                        }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <ActorAvatar name={actor.name} size={100} />
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </Link>
  )
}
