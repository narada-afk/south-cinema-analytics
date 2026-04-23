'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ActorAvatar from '@/components/ActorAvatar'
import { capture } from '@/lib/posthog'
import { trackSearch } from '@/lib/analytics'

interface SearchResult {
  id: number
  name: string
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SearchBar() {
  const [query, setQuery]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [results, setResults]     = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [focused, setFocused]     = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()

  // Live search — debounced 180ms
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const tid = setTimeout(async () => {
      try {
        const res    = await fetch(`/api/backend/actors/search?q=${encodeURIComponent(query.trim())}`)
        const data: SearchResult[] = await res.json()
        // Prioritise exact match → starts-with → contains
        const q = query.trim().toLowerCase()
        const sorted = [...data].sort((a, b) => {
          const an = a.name.toLowerCase()
          const bn = b.name.toLowerCase()
          if (an === q && bn !== q) return -1
          if (bn === q && an !== q) return 1
          if (an.startsWith(q) && !bn.startsWith(q)) return -1
          if (bn.startsWith(q) && !an.startsWith(q)) return 1
          return 0
        })
        setResults(sorted.slice(0, 7))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 180)
    return () => clearTimeout(tid)
  }, [query])

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        dropRef.current?.contains(e.target as Node) ||
        inputRef.current?.contains(e.target as Node)
      ) return
      setFocused(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const showDropdown = focused && results.length > 0

  function navigate(name: string, source: 'suggestion' | 'submit') {
    void capture('search_performed', { query: name, source })
    trackSearch(name)
    setFocused(false); setQuery(''); setResults([])
    router.push(`/actors/${toSlug(name)}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (activeIdx >= 0 && results[activeIdx]) { navigate(results[activeIdx].name, 'submit'); return }
    const q = query.trim()
    if (!q) return
    setLoading(true)
    try {
      const res    = await fetch(`/api/backend/actors/search?q=${encodeURIComponent(q)}`)
      const data: SearchResult[] = await res.json()
      if (data.length > 0) navigate(data[0].name, 'submit')
    } catch {}
    finally { setLoading(false) }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Escape')    { setFocused(false); setActiveIdx(-1) }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit}>
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-10">
          {loading || searching ? (
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIdx(-1) }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search actors…"
          disabled={loading}
          autoComplete="off"
          className="w-full pl-9 pr-4 py-2 text-sm bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/25 focus:bg-white/[0.08] transition-colors disabled:opacity-60"
          style={{ borderRadius: showDropdown ? '0.9rem 0.9rem 0 0' : '9999px' }}
        />
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropRef}
          className="absolute left-0 right-0 z-50 overflow-hidden"
          style={{
            top:           'calc(100% - 1px)',
            background:    'rgba(10,10,20,0.97)',
            border:        '1px solid rgba(255,255,255,0.10)',
            borderTop:     '1px solid rgba(255,255,255,0.05)',
            borderRadius:  '0 0 0.9rem 0.9rem',
            boxShadow:     '0 16px 40px rgba(0,0,0,0.65)',
            backdropFilter:'blur(24px)',
          }}
        >
          {results.map((item, idx) => (
            <button
              key={item.id}
              data-testid={`actor-suggestion-${item.id}`}
              onMouseDown={() => navigate(item.name, 'suggestion')}
              onMouseEnter={() => setActiveIdx(idx)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
              style={{
                background: idx === activeIdx ? 'rgba(255,255,255,0.06)' : 'transparent',
                position: 'relative',
                zIndex: 1,
                pointerEvents: 'auto',
              }}
            >
              <ActorAvatar name={item.name} size={24} />
              <span className="text-xs text-white/75 pointer-events-none">{item.name}</span>
            </button>
          ))}
          <div className="h-1.5" />
        </div>
      )}
    </div>
  )
}
