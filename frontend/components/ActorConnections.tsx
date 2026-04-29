'use client'

/**
 * ActorConnections — inline connection finder pre-filled with the current actor.
 *
 * Actor 1 is locked (non-clearable) to the page's actor.
 * Actor 2 is freely searchable. Submitting runs BFS and renders ConnectionResult inline.
 */

import { useState, useEffect, useRef } from 'react'
import ActorAvatar from './ActorAvatar'
import ConnectionResult from '@/components/ConnectionResult'
import { searchActors, getActorConnection, type Actor, type ConnectionPath } from '@/lib/api'

// ── Reusable actor search box ─────────────────────────────────────────────────

function ActorBox({
  label,
  selected,
  onSelect,
  onClear,
  colorClass,
  locked = false,
  placeholder = 'Search actor…',
}: {
  label: string
  selected: Actor | null
  onSelect: (a: Actor) => void
  onClear: () => void
  colorClass: string
  locked?: boolean
  placeholder?: string
}) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Actor[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); setOpen(false); return }
    setLoading(true)
    const tid = setTimeout(async () => {
      try {
        const res = await searchActors(query)
        setResults(res.slice(0, 7))
        setOpen(res.length > 0)
      } catch { setResults([]) }
      finally  { setLoading(false) }
    }, 220)
    return () => clearTimeout(tid)
  }, [query, selected])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropRef.current?.contains(e.target as Node) ||
        inputRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="flex-1 min-w-0">
      <p className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-2 ${colorClass}`}>
        {label}
      </p>

      {selected ? (
        <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3">
          <ActorAvatar name={selected.name} size={44} />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{selected.name}</p>
            {selected.industry && (
              <p className="text-white/40 text-xs">{selected.industry}</p>
            )}
          </div>
          {!locked && (
            <button
              onClick={() => {
                onClear()
                setQuery('')
                setTimeout(() => inputRef.current?.focus(), 0)
              }}
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
              aria-label="Remove"
            >
              ✕
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <div className="input-premium flex items-center px-4 gap-2">
            <span className="text-white/25 flex-shrink-0">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent py-3.5 text-white placeholder-white/28 outline-none text-sm"
            />
            {loading && (
              <span className="text-white/30 text-xs animate-pulse flex-shrink-0">…</span>
            )}
          </div>

          {open && results.length > 0 && (
            <div
              ref={dropRef}
              className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50 shadow-2xl border border-white/[0.10]"
              style={{ background: '#1e1e2c' }}
            >
              {results.map(a => (
                <button
                  key={a.id}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    onSelect(a)
                    setQuery('')
                    setResults([])
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.08] transition-colors text-left border-b border-white/[0.05] last:border-0"
                >
                  <ActorAvatar name={a.name} size={32} />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.name}</p>
                    {a.industry && (
                      <p className="text-white/35 text-xs">{a.industry}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface ActorConnectionsProps {
  actor: { id: number; name: string; industry?: string }
}

export default function ActorConnections({ actor }: ActorConnectionsProps) {
  const lockedActor: Actor = {
    id:       actor.id,
    name:     actor.name,
    industry: actor.industry,
  }

  const [actor2,  setActor2]  = useState<Actor | null>(null)
  const [result,  setResult]  = useState<ConnectionPath | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const resultRef  = useRef<HTMLDivElement>(null)
  const canSearch  = actor2 !== null && actor2.id !== actor.id

  async function handleFind() {
    if (!canSearch) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await getActorConnection(actor.id, actor2!.id)
      setResult(res)
      // Scroll result into view after a tick
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    } catch {
      setError('Failed to fetch connection — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="connections"
      className="p-6 sm:p-8"
      style={{
        background: 'linear-gradient(145deg, #0d1018 0%, #0c0c18 100%)',
        borderRadius: 24,
        border: '1px solid rgba(34,211,238,0.10)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(34,211,238,0.04) inset',
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          🔗 Connection Finder
        </h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
          How many handshakes from <span className="text-white/60 font-medium">{actor.name}</span> to any star in the database?
        </p>
      </div>

      {/* Actor pickers */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        <ActorBox
          label="From"
          selected={lockedActor}
          onSelect={() => {}}
          onClear={() => {}}
          colorClass="text-amber-400/70"
          locked={true}
        />

        {/* Connector visual */}
        <div className="flex sm:flex-col items-center justify-center gap-1.5 flex-shrink-0 py-2">
          <div className="h-px sm:h-6 w-8 sm:w-px" style={{ background: 'rgba(34,211,238,0.18)' }} />
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 28,
              height: 28,
              background: 'rgba(34,211,238,0.10)',
              border: '1px solid rgba(34,211,238,0.22)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.70)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </div>
          <div className="h-px sm:h-6 w-8 sm:w-px" style={{ background: 'rgba(34,211,238,0.18)' }} />
        </div>

        <ActorBox
          label="To"
          selected={actor2}
          onSelect={setActor2}
          onClear={() => { setActor2(null); setResult(null) }}
          colorClass="text-cyan-400/70"
          placeholder="Search any actor…"
        />
      </div>

      {/* Find button */}
      <div className="mt-5">
        <button
          onClick={handleFind}
          disabled={loading || !canSearch}
          className="px-8 py-3 rounded-full font-bold text-sm transition-all duration-200"
          style={canSearch && !loading ? {
            background: 'rgba(34,211,238,0.15)',
            border: '1px solid rgba(34,211,238,0.35)',
            color: 'rgba(34,211,238,0.95)',
            cursor: 'pointer',
          } : {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            if (!canSearch || loading) return
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(34,211,238,0.22)'
            el.style.transform = 'scale(1.03) translateY(-1px)'
            el.style.boxShadow = '0 6px 20px rgba(34,211,238,0.20)'
          }}
          onMouseLeave={e => {
            if (!canSearch || loading) return
            const el = e.currentTarget as HTMLButtonElement
            el.style.background = 'rgba(34,211,238,0.15)'
            el.style.transform = 'scale(1) translateY(0)'
            el.style.boxShadow = 'none'
          }}
        >
          {loading ? 'Finding path…' : 'Find Connection →'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/30 animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {/* Result — key forces remount (animation reset) on each new search */}
      {result && !loading && (
        <div ref={resultRef}>
          <ConnectionResult
            key={`${result.path[0]?.id}-${result.path.at(-1)?.id}-${result.depth}`}
            result={result}
          />
        </div>
      )}
    </section>
  )
}
