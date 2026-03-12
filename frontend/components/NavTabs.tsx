// NavTabs — Server Component
// Uses <Link> so every tab click is a real navigation that the Server Component
// page re-renders with the correct ?industry= searchParam.
// No 'use client' needed — no hooks, no browser state.

import Link from 'next/link'

const TABS = [
  { label: 'All Cinema', value: 'all',       href: '/' },
  { label: 'Telugu',     value: 'telugu',    href: '/?industry=telugu' },
  { label: 'Tamil',      value: 'tamil',     href: '/?industry=tamil' },
  { label: 'Malayalam',  value: 'malayalam', href: '/?industry=malayalam' },
  { label: 'Kannada',    value: 'kannada',   href: '/?industry=kannada' },
  { label: 'Explore',    value: 'explore',   href: '/?industry=explore' },
]

interface NavTabsProps {
  /** Passed from the parent Server Component which reads searchParams. */
  activeIndustry?: string
}

export default function NavTabs({ activeIndustry = 'all' }: NavTabsProps) {
  return (
    <nav className="flex justify-center mt-4">
      <div className="inline-flex items-center gap-1 px-2 py-2 rounded-full glass">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            className={`
              px-4 py-1.5 rounded-full text-sm font-medium transition-all
              ${
                activeIndustry === tab.value
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
              }
            `}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
