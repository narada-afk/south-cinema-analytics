'use client'

/**
 * StatsSearchBar
 * Smart search that routes typed queries to the right dashboard panel.
 *
 * - Actor name typed → scroll to Career Timeline + preload actor
 * - Keywords (director, industry, network, connection) → scroll to panel
 * - Quick-chip shortcuts below the input
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchActors, type Actor } from '@/lib/api'

interface QuickChip {
  label:   string
  emoji:   string
  targetId: string
}

const CHIPS: QuickChip[] = [
  { label: 'Most Connected',      emoji: '🌐', targetId: 'most-connected'   },
  { label: 'Director Duos',       emoji: '🎬', targetId: 'partnerships'     },
  { label: 'Industry Breakdown',  emoji: '📊', targetId: 'industry'         },
  { label: 'Actor Connection',    emoji: '🔗', targetId: 'connection-finder'},
  { label: 'Career Timeline',     emoji: '📈', targetId: 'career-timeline'  },
]

const KEYWORD_MAP: { pattern: RegExp; targetId: string }[] = [
  { pattern: /connect|path|degree|bacon/i,       targetId: 'connection-finder' },
  { pattern: /direct|partner|collaborat/i,       targetId: 'partnerships'      },
  { pattern: /industry|language|tamil|telugu|malayalam|kannada/i, targetId: 'industry' },
  { pattern: /career|timeline|year|film.*(per|by)/i, targetId: 'career-timeline' },
  { pattern: /most|network|co.star|collab/i,     targetId: 'most-connected'    },
]

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface Props {
  /** Called when user selects an actor, so Career Timeline can load them */
  onActorSelect?: (actor: Actor) => void
}

export default function StatsSearchBar({ onActorSelect }: Props) {
  const [query,   setQuery]   = useState('')
  const [actors,  setActors]  = useState<Actor[]>([])
  const [open,    setOpen]    = useState(false)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  // Fetch actor suggestions
  useEffect(() => {
    if (!query.trim()) { setActors([]); setOpen(false); return }
    const tid = setTimeout(async () => {
      try {
        const res = await searchActors(query)
        setActors(res.slice(0, 6))
        setOpen(res.length > 0)
      } catch { setActors([]) }
    }, 200)
    return () => clearTimeout(tid)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node) &&
          !inputRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    // Keyword → scroll
    for (const { pattern, targetId } of KEYWORD_MAP) {
      if (pattern.test(q)) {
        scrollTo(targetId)
        setQuery('')
        setOpen(false)
        return
      }
    }
    // Default: try actor search (already shown in dropdown)
    if (actors.length > 0) {
      handleActorPick(actors[0])
    }
  }

  function handleActorPick(actor: Actor) {
    setQuery('')
    setOpen(false)
    onActorSelect?.(actor)
    // Small delay so state propagates before scroll
    setTimeout(() => scrollTo('career-timeline'), 80)
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            flex items-center gap-3 rounded-2xl px-5 py-4 transition-all border
            ${focused
              ? 'border-white/20 bg-white/[0.08]'
              : 'border-white/[0.06] bg-white/[0.04]'}
          `}
        >
          <span className="text-white/30 text-lg flex-shrink-0">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search cinema stats… try &quot;Kamal Haasan career&quot; or &quot;director partnerships&quot;"
            className="flex-1 bg-transparent text-white placeholder-white/25 outline-none text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setActors([]); setOpen(false) }}
              className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0"
            >✕</button>
          )}
        </div>

        {/* Actor suggestions dropdown */}
        {open && actors.length > 0 && (
          <div
            ref={dropRef}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 shadow-2xl border border-white/[0.10]"
            style={{ background: '#1e1e2c' }}
          >
            <p className="text-white/30 text-[10px] uppercase tracking-widest px-4 pt-3 pb-1">
              Load career timeline →
            </p>
            {actors.map(a => (
              <button
                key={a.id}
                onMouseDown={e => e.preventDefault()}
                onClick={() => handleActorPick(a)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.08] transition-colors text-left border-b border-white/[0.05] last:border-0"
              >
                <span className="text-white/60 text-sm font-medium">{a.name}</span>
                {a.industry && (
                  <span className="text-white/30 text-xs ml-auto">{a.industry}</span>
                )}
                <span className="text-white/20 text-xs">→ timeline</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Quick-pick chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {CHIPS.map(chip => (
          <button
            key={chip.targetId}
            onClick={() => scrollTo(chip.targetId)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium
                       bg-white/[0.05] text-white/50 hover:bg-white/[0.10] hover:text-white/80
                       border border-white/[0.06] transition-all"
          >
            <span>{chip.emoji}</span>
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
