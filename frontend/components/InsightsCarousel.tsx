'use client'

/**
 * InsightsCarousel — paginated slide carousel.
 *
 * Behaviour
 * ─────────
 * • Shows 3 cards / 2 cards / 1 card per page (desktop / tablet / mobile)
 *   Breakpoints are measured from the container width via ResizeObserver.
 * • Auto-advances every AUTO_MS ms with a smooth cubic-bezier slide.
 * • Left / right chevron buttons (appear on hover) navigate one page at a time.
 * • Touch swipe left/right does the same; vertical page scrolls are ignored.
 * • Dot / pill indicators below show position; any manual nav resets the timer.
 * • Infinite loop — last page wraps to first.
 */

import { useEffect, useRef, useState } from 'react'
import InsightCard, { type InsightCardData } from '@/components/InsightCard'

const AUTO_MS  = 4500   // ms each page is visible before auto-advance
const SLIDE_MS = 480    // CSS transition duration (ms)

// Shared button style — matches previous nav button look
const BTN: React.CSSProperties = {
  background:     'rgba(10,10,20,0.82)',
  border:         '1px solid rgba(255,255,255,0.13)',
  backdropFilter: 'blur(10px)',
  boxShadow:      '0 4px 20px rgba(0,0,0,0.55)',
}

export default function InsightsCarousel({ cards }: { cards: InsightCardData[] }) {
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Stable refs — readable from interval callbacks without stale closures
  const cppRef   = useRef(3)       // cards per page
  const pageRef  = useRef(0)       // current page index
  const lockRef  = useRef(false)   // animation lock — prevents double-fire
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // React state — drives re-renders
  const [cpp,  setCpp]  = useState(3)
  const [page, setPage] = useState(0)

  // ── Responsive cards-per-page ─────────────────────────────────────────────────
  useEffect(() => {
    function recalc() {
      const w = wrapRef.current?.offsetWidth ?? window.innerWidth
      const n = w >= 900 ? 3 : w >= 560 ? 2 : 1
      if (n === cppRef.current) return
      cppRef.current = n
      setCpp(n)
      // Reset to page 0 on resize — avoids out-of-bounds page index
      pageRef.current = 0
      setPage(0)
    }
    recalc()
    const ro = new ResizeObserver(recalc)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function totalPages() {
    return Math.max(1, Math.ceil(cards.length / cppRef.current))
  }

  /** Advance by +1 or -1 pages with animation lock */
  function goPage(delta: 1 | -1) {
    if (lockRef.current) return
    lockRef.current = true
    const tp   = totalPages()
    const next = ((pageRef.current + delta) % tp + tp) % tp
    pageRef.current = next
    setPage(next)
    setTimeout(() => { lockRef.current = false }, SLIDE_MS + 60)
  }

  /** Jump directly to a page index (used by dot indicators) */
  function jumpPage(i: number) {
    if (lockRef.current || i === pageRef.current) return
    lockRef.current = true
    pageRef.current = i
    setPage(i)
    resetTimer()
    setTimeout(() => { lockRef.current = false }, SLIDE_MS + 60)
  }

  // ── Auto-advance ──────────────────────────────────────────────────────────────

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => goPage(1), AUTO_MS)
  }

  useEffect(() => {
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, []) // goPage / resetTimer read only refs → no stale closure

  // ── Touch swipe ───────────────────────────────────────────────────────────────

  const txRef = useRef(0)
  const tyRef = useRef(0)

  // ── Early exit ────────────────────────────────────────────────────────────────

  if (cards.length === 0) return null

  // ── Derived values ────────────────────────────────────────────────────────────

  const tp       = Math.max(1, Math.ceil(cards.length / cpp))
  const safePage = Math.min(page, tp - 1)   // guard during cpp transitions

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div ref={wrapRef} className="relative group">

      {/* ── Left chevron ──────────────────────────────────────────────────── */}
      <button
        onClick={() => { resetTimer(); goPage(-1) }}
        aria-label="Previous cards"
        className="
          hidden sm:flex
          absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2
          z-20 w-11 h-11 rounded-full items-center justify-center
          opacity-0 group-hover:opacity-100
          hover:scale-110 active:scale-95
          transition-all duration-200
        "
        style={BTN}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15,18 9,12 15,6" />
        </svg>
      </button>

      {/* ── Right chevron ─────────────────────────────────────────────────── */}
      <button
        onClick={() => { resetTimer(); goPage(1) }}
        aria-label="Next cards"
        className="
          hidden sm:flex
          absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2
          z-20 w-11 h-11 rounded-full items-center justify-center
          opacity-0 group-hover:opacity-100
          hover:scale-110 active:scale-95
          transition-all duration-200
        "
        style={BTN}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9,18 15,12 9,6" />
        </svg>
      </button>

      {/* ── Slide viewport ────────────────────────────────────────────────── */}
      <div
        className="overflow-hidden"
        onTouchStart={e => {
          txRef.current = e.touches[0].clientX
          tyRef.current = e.touches[0].clientY
        }}
        onTouchEnd={e => {
          const dx = e.changedTouches[0].clientX - txRef.current
          const dy = e.changedTouches[0].clientY - tyRef.current
          // Only act on clear horizontal swipes (≥40 px, more horizontal than vertical)
          if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return
          resetTimer()
          goPage(dx < 0 ? 1 : -1)
        }}
      >
        <div
          className="flex"
          style={{
            transform:  `translateX(-${safePage * 100}%)`,
            transition: `transform ${SLIDE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            willChange: 'transform',
          }}
        >
          {Array.from({ length: tp }, (_, pi) => {
            // Lazy render — only mount InsightCard components for the current
            // page and its immediate neighbours.  All other pages stay in the
            // flex track as lightweight placeholder divs so translateX maths
            // remain correct, but their DOM cost is essentially zero.
            const isNear = Math.abs(pi - safePage) <= 1

            return (
              <div
                key={pi}
                className="min-w-full"
              >
                {isNear ? (
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${cpp}, 1fr)` }}
                  >
                    {cards.slice(pi * cpp, (pi + 1) * cpp).map((card, ci) => (
                      <InsightCard key={`${pi}-${ci}`} {...card} />
                    ))}
                  </div>
                ) : (
                  /* Same height as a card so track height never collapses */
                  <div className="h-[220px] sm:h-[250px]" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Page indicators ───────────────────────────────────────────────── */}
      {tp > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-5">
          {tp <= 9 ? (
            /* Pill dots — one per page */
            Array.from({ length: tp }, (_, i) => (
              <button
                key={i}
                onClick={() => jumpPage(i)}
                aria-label={`Go to page ${i + 1}`}
                className="rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  height:     6,
                  width:      i === safePage ? 24 : 6,
                  background: i === safePage
                    ? 'rgba(255,255,255,0.85)'
                    : 'rgba(255,255,255,0.22)',
                }}
              />
            ))
          ) : (
            /* Compact counter for very long lists */
            <span className="text-[11px] tracking-widest text-white/35 tabular-nums">
              {safePage + 1} / {tp}
            </span>
          )}
        </div>
      )}

    </div>
  )
}
