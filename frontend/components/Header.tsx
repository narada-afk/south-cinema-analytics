'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-300"
      style={{
        background:           scrolled ? 'rgba(10,10,15,0.72)' : 'transparent',
        backdropFilter:       scrolled ? 'blur(18px) saturate(160%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(18px) saturate(160%)' : 'none',
        borderBottom:         scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        boxShadow:            scrolled ? '0 2px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-[66px] flex items-center">

        {/* ── Wordmark ─────────────────────────────────────────── */}
        <Link href="/" className="group flex flex-col gap-[3px]">
          <span className="text-[16px] font-extrabold tracking-[0.015em] leading-none select-none">
            <span className="text-white/90 group-hover:text-white transition-colors duration-200">
              Cine
            </span>
            <span className="bg-gradient-to-r from-[#4FACFE] to-[#A855F7] bg-clip-text text-transparent">
              Trace
            </span>
          </span>
          <span
            className="text-[10px] leading-none select-none tracking-[0.06em] italic"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            South Indian Cinema… traced.
          </span>
        </Link>

      </div>
    </header>
  )
}
