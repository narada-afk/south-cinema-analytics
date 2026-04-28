'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import ScrollRow from './ScrollRow'
import type { DirectorCollab, ActorMovie } from '@/lib/api'
import {
  buildDirectorsCanvas,
  shareCanvasCard,
} from '@/lib/shareSectionCard'

// ── Share button — builds a canvas PNG then shares/downloads it ───────────────
function DirectorsShareButton({
  actorName,
  avatarSlug,
  directors,
}: {
  actorName: string
  avatarSlug: string
  directors: DirectorCollab[]
}) {
  const [state, setState] = useState<'idle' | 'building' | 'done'>('idle')

  async function handleShare() {
    if (state === 'building') return
    setState('building')
    try {
      const canvas = await buildDirectorsCanvas({ actorName, avatarSlug, directors })
      await shareCanvasCard(canvas, 'cinetrace-directors.png', actorName, window.location.pathname + '#directors')
    } catch {
      // fallback: copy URL
      try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#directors`) } catch {}
    }
    setState('done')
    setTimeout(() => setState('idle'), 1800)
  }

  return (
    <button
      onClick={handleShare}
      aria-label="Share Directors Worked With"
      className="flex items-center justify-center w-7 h-7 rounded-full opacity-50 hover:opacity-100 transition-opacity duration-150 flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {state === 'done' ? (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : state === 'building' ? (
        /* tiny spinner */
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

interface DirectorsSectionProps {
  directors: DirectorCollab[]
  movies: ActorMovie[]
  /** Actor whose page this section lives on — needed for the share card. */
  actorName?: string
  actorSlug?: string
}

export default function DirectorsSection({ directors, movies, actorName = '', actorSlug = '' }: DirectorsSectionProps) {
  const [selected, setSelected] = useState<string | null>(null)

  // Pre-build the film list for every director once, keyed by director name.
  // Using the same filter the dropdown renders ensures the chip count always
  // matches the number of cards that actually open — no more "says 2, shows 1".
  const directorMovies = useRef<Record<string, ActorMovie[]>>({})
  const topDirs = directors
    .map(d => {
      const films = movies
        .filter(m => m.director === d.director && m.release_year > 0)
        .sort((a, b) => (b.release_year ?? 0) - (a.release_year ?? 0))
      directorMovies.current[d.director] = films
      // Use the real displayable count, not the API count
      return { ...d, films: films.length }
    })
    // Only show directors that have at least 1 displayable film
    .filter(d => d.films > 0)
    .slice(0, 20)

  function handleChip(director: string) {
    setSelected(prev => prev === director ? null : director)
  }

  const selectedMovies = selected ? (directorMovies.current[selected] ?? []) : []
  const isOpen = selected !== null

  return (
    <div id="directors" className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-white/80 flex-1">🎬 Directors Worked With</h2>
        {actorName && (
          <DirectorsShareButton
            actorName={actorName}
            avatarSlug={actorSlug}
            directors={topDirs}
          />
        )}
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        {topDirs.map(d => {
          const active = selected === d.director
          return (
            <button
              key={d.director}
              onClick={() => handleChip(d.director)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
                border transition-all duration-200 cursor-pointer
                ${active
                  ? 'border-violet-500/60 text-white/90 bg-violet-500/15'
                  : 'border-white/[0.08] text-white/60 hover:text-white/80 hover:border-white/20'
                }
              `}
              style={{ background: active ? undefined : '#13131a' }}
            >
              {d.director}
              <span className={`text-xs font-medium ml-0.5 ${active ? 'text-violet-300/70' : 'text-white/25'}`}>
                {d.films}
              </span>
            </button>
          )
        })}
      </div>

      {/* Expandable panel */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div
            style={{
              opacity: isOpen ? 1 : 0,
              transform: isOpen ? 'translateY(0)' : 'translateY(-6px)',
              transition: 'opacity 220ms ease, transform 220ms ease',
            }}
          >
            {/* Panel */}
            <div
              className="rounded-2xl border border-white/[0.07] overflow-hidden mt-1"
              style={{ background: '#0d0d15' }}
            >
              {/* Header */}
              {selected && (
                <div className="px-5 pt-4 pb-3 border-b border-white/[0.05] flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    {selected}
                  </span>
                </div>
              )}

              {/* Movie scroll */}
              <div className="px-4 py-4">
                {selectedMovies.length === 0 ? (
                  <p className="text-white/25 text-sm py-2 px-1">No films found</p>
                ) : (
                  <ScrollRow>
                    <div className="flex gap-3 pb-1 px-1" style={{ width: 'max-content' }}>
                      {selectedMovies.map(movie => (
                        <MovieCard key={`${movie.title}-${movie.release_year}`} movie={movie} />
                      ))}
                    </div>
                  </ScrollRow>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MovieCard({ movie }: { movie: ActorMovie }) {
  const rating = movie.vote_average && movie.vote_average > 0
    ? movie.vote_average.toFixed(1)
    : null

  return (
    <div
      className="flex-shrink-0 group cursor-default"
      style={{ width: 90 }}
    >
      <div
        className="relative rounded-xl overflow-hidden bg-white/[0.04] shadow-sm group-hover:shadow-lg transition-all duration-200 group-hover:scale-[1.04]"
        style={{ aspectRatio: '2/3' }}
      >
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            sizes="90px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center pb-3 px-2">
            <p className="text-white/20 text-[9px] text-center leading-snug line-clamp-3">
              {movie.title}
            </p>
          </div>
        )}

        {/* Year badge */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent pt-5 pb-1.5 px-2">
          <p className="text-white/55 text-[10px] font-medium">{movie.release_year}</p>
        </div>

        {/* Rating badge */}
        {rating && (
          <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-[9px] font-bold text-yellow-400">
            ★ {rating}
          </div>
        )}
      </div>

      <p className="text-white/45 text-[10px] leading-snug line-clamp-2 mt-1.5 px-0.5">
        {movie.title}
      </p>
    </div>
  )
}
