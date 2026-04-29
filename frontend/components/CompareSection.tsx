'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ActorAvatar from './ActorAvatar'
import { searchActors, toActorSlug, type Actor } from '@/lib/api'

interface CompareSectionProps {
  currentActor: { id: number; name: string }
  suggestions: Actor[]
  actorGender?: 'M' | 'F' | null
}

export default function CompareSection({ currentActor, suggestions, actorGender }: CompareSectionProps) {
  const router = useRouter()

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Actor[]>([])
  const [loading, setLoading] = useState(false)
  const [open,    setOpen]    = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)

  // Debounced search — filter to same gender when known
  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    const tid = setTimeout(async () => {
      try {
        const res = await searchActors(query)
        const filtered = res
          .filter(a => a.id !== currentActor.id)
          .filter(a => !actorGender || !a.gender || a.gender === actorGender)
          .slice(0, 7)
        setResults(filtered)
        setOpen(filtered.length > 0)
      } catch { setResults([]) }
      finally  { setLoading(false) }
    }, 220)
    return () => clearTimeout(tid)
  }, [query, currentActor.id, actorGender])

  // Close on outside click
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

  function navigate(targetName: string) {
    router.push(`/compare/${toActorSlug(currentActor.name)}-vs-${toActorSlug(targetName)}`)
  }

  return (
    <div
      className="rounded-[24px] p-6 sm:p-8"
      style={{
        background: 'linear-gradient(135deg, #111120 0%, #0e0e1c 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.30)',
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl flex items-center gap-2">
          ⚡ Compare with another {actorGender === 'F' ? 'actress' : 'actor'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
          Who wins by the numbers?
        </p>
      </div>

      {/* Quick suggestions — larger, more inviting */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-6">
          {suggestions.slice(0, 6).map(s => (
            <button
              key={s.id}
              onClick={() => navigate(s.name)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border hover:scale-[1.04] hover:-translate-y-0.5 transition-all duration-200 group"
              style={{
                background: '#13131f',
                borderColor: 'rgba(255,255,255,0.09)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.40)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.08)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.09)'
                ;(e.currentTarget as HTMLButtonElement).style.background = '#13131f'
              }}
            >
              <ActorAvatar name={s.name} size={34} />
              <span className="text-sm font-medium transition-colors" style={{ color: 'rgba(255,255,255,0.58)' }}>
                {s.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="input-premium flex items-center px-4 gap-2">
          <span className="text-white/25 flex-shrink-0">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search any ${actorGender === 'F' ? 'actress' : 'actor'}…`}
            className="flex-1 bg-transparent py-4 text-white placeholder-white/25 outline-none text-sm"
          />
          {loading && (
            <span className="text-white/30 text-xs animate-pulse flex-shrink-0">…</span>
          )}
        </div>

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div
            ref={dropRef}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl overflow-hidden z-50 shadow-2xl border border-white/[0.10]"
            style={{ background: '#1a1a28' }}
          >
            {results.map(a => (
              <button
                key={a.id}
                onMouseDown={e => e.preventDefault()}
                onClick={() => navigate(a.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.07] transition-colors text-left border-b border-white/[0.05] last:border-0"
              >
                <ActorAvatar name={a.name} size={36} />
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
    </div>
  )
}
