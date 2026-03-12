// Force dynamic rendering so ?industry= is always fresh
export const dynamic = 'force-dynamic'

// /more — Directors & Production Houses browser
// Server Component: fetches both leaderboards server-side.
// Industry filter comes from the ?industry= search param (same pattern as homepage).

import Header from '@/components/Header'
import NavTabs from '@/components/NavTabs'
import Link from 'next/link'
import { getTopDirectors, getTopProductionHouses, type DirectorStat, type ProductionHouseStat } from '@/lib/api'

// ── Industry filter tabs ──────────────────────────────────────────────────────

const INDUSTRIES = [
  { label: 'All',       value: 'all' },
  { label: 'Telugu',    value: 'telugu' },
  { label: 'Tamil',     value: 'tamil' },
  { label: 'Malayalam', value: 'malayalam' },
  { label: 'Kannada',   value: 'kannada' },
]

function IndustryFilter({ active }: { active: string }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {INDUSTRIES.map(({ label, value }) => (
        <Link
          key={value}
          href={value === 'all' ? '/more' : `/more?industry=${value}`}
          className={`
            px-4 py-1.5 rounded-full text-sm font-medium transition-all
            ${
              active === value
                ? 'bg-white/15 text-white'
                : 'text-white/40 glass hover:text-white/70 hover:bg-white/[0.07]'
            }
          `}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

// ── Leaderboard table ─────────────────────────────────────────────────────────

interface LeaderboardProps<T extends { name: string; film_count: number; industries: string | null }> {
  title: string
  emoji: string
  rows: T[]
  emptyMessage: string
  /** Optional: render a clickable link for each row name */
  buildHref?: (row: T) => string
}

function Leaderboard<T extends { name: string; film_count: number; industries: string | null }>({
  title,
  emoji,
  rows,
  emptyMessage,
  buildHref,
}: LeaderboardProps<T>) {
  if (rows.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-bold text-white/80 mb-4">
          {emoji} {title}
        </h2>
        <div className="glass rounded-2xl px-6 py-10 text-center text-white/30 text-sm">
          {emptyMessage}
        </div>
      </section>
    )
  }

  const max = rows[0].film_count

  return (
    <section>
      <h2 className="text-lg font-bold text-white/80 mb-4">
        {emoji} {title}
      </h2>

      <div className="glass rounded-2xl overflow-hidden">
        {rows.map((row, i) => {
          const pct = Math.round((row.film_count / max) * 100)
          const nameNode = buildHref ? (
            <a
              href={buildHref(row)}
              className="text-white font-medium hover:text-white/80 transition-colors truncate"
            >
              {row.name}
            </a>
          ) : (
            <span className="text-white font-medium truncate">{row.name}</span>
          )

          return (
            <div
              key={row.name}
              className="relative flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.05] last:border-b-0"
            >
              {/* Fill bar (background) */}
              <div
                className="absolute inset-0 bg-white/[0.025] rounded-none"
                style={{ width: `${pct}%` }}
              />

              {/* Rank */}
              <span className="relative text-white/25 text-xs font-mono w-6 flex-shrink-0 text-right">
                {i + 1}
              </span>

              {/* Name + industries tag */}
              <div className="relative flex-1 min-w-0 flex items-center gap-2">
                {nameNode}
                {row.industries && (
                  <span className="text-[10px] font-medium text-white/25 bg-white/[0.06] px-2 py-0.5 rounded-full flex-shrink-0">
                    {row.industries}
                  </span>
                )}
              </div>

              {/* Film count */}
              <span className="relative text-white/60 text-sm font-semibold flex-shrink-0 tabular-nums">
                {row.film_count}
                <span className="text-white/25 text-xs font-normal ml-1">
                  {row.film_count === 1 ? 'film' : 'films'}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams?: { industry?: string }
}

export default async function MorePage({ searchParams }: PageProps) {
  const industry = searchParams?.industry ?? 'all'

  const [directors, productionHouses] = await Promise.all([
    getTopDirectors(industry, 30).catch(() => [] as DirectorStat[]),
    getTopProductionHouses(industry, 20).catch(() => [] as ProductionHouseStat[]),
  ])

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Header />

      <div className="max-w-[1200px] mx-auto px-6">
        <NavTabs activeTab="more" />
      </div>

      <main className="max-w-[1200px] mx-auto px-6 mt-10 pb-20">
        {/* Page title */}
        <h1 className="text-xl font-bold text-white/80 mt-10 mb-2">
          🎬 Cinema Database
        </h1>
        <p className="text-white/35 text-sm mb-8">
          Directors and production houses behind South Indian cinema
        </p>

        {/* Industry filter */}
        <IndustryFilter active={industry} />

        {/* Two-column grid on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Leaderboard
            title="Top Directors"
            emoji="🎬"
            rows={directors}
            emptyMessage="No director data for this filter — try selecting a different industry."
          />

          <Leaderboard
            title="Production Houses"
            emoji="🏢"
            rows={productionHouses}
            emptyMessage="No production data for this filter. Production data requires Wikipedia enrichment to be complete."
          />
        </div>
      </main>
    </div>
  )
}
