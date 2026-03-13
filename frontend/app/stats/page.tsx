/**
 * /stats — Stats for Nerds
 *
 * Server Component: pre-fetches all panel data in parallel.
 * Interactive charts + Connection Finder are Client Components.
 */

import Header    from '@/components/Header'
import NavTabs   from '@/components/NavTabs'
import ConnectionFinder    from '@/components/stats/ConnectionFinder'
import MostConnectedPanel  from '@/components/stats/MostConnectedPanel'
import IndustryChart       from '@/components/stats/IndustryChart'
import DirectorPartnerships from '@/components/stats/DirectorPartnerships'
import CareerTimeline      from '@/components/stats/CareerTimeline'
import TopCoStarsChart     from '@/components/stats/TopCoStarsChart'
import StatsSearchClient   from '@/components/stats/StatsSearchClient'

import {
  getStatsOverview,
  getMostConnected,
  getIndustryDistribution,
  getTopPartnerships,
  getCareerTimeline,
  getTopCoStars,
} from '@/lib/api'

// ── Hero metric pill ──────────────────────────────────────────────────────────

function StatPill({
  value, label, emoji,
}: { value: string; label: string; emoji: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 glass rounded-2xl flex-1 min-w-[110px]">
      <span className="text-2xl">{emoji}</span>
      <span className="text-white font-bold text-xl tabular-nums">{value}</span>
      <span className="text-white/40 text-xs text-center leading-tight">{label}</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  id, children, className = '',
}: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      {children}
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams?: { actor?: string }
}

export default async function StatsPage({ searchParams }: PageProps) {
  // Parallel fetch — all panels load simultaneously
  const [overview, connected, industry, partnerships, costars] = await Promise.all([
    getStatsOverview(),
    getMostConnected(20),
    getIndustryDistribution(),
    getTopPartnerships(14),
    getTopCoStars(15),
  ])

  // Career timeline: respect ?actor= query param, else use the most-connected actor
  const actorIdParam  = searchParams?.actor ? parseInt(searchParams.actor, 10) : null
  const timelineActorId = actorIdParam ?? (connected[0]?.id ?? null)
  const timeline = timelineActorId
    ? await getCareerTimeline(timelineActorId).catch(() => null)
    : null

  // Default actors for Connection Finder demo: cross-industry pair
  const defaultActors = [
    { id: 1,   name: 'Allu Arjun',  industry: 'Telugu'   },
    { id: 381, name: 'Mohanlal',    industry: 'Malayalam' },
  ]

  return (
    <main className="min-h-screen" style={{ background: '#0a0a0f' }}>
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <Header />
        <NavTabs activeTab="stats" />

        {/* ── Page title ── */}
        <div className="text-center mt-10 mb-8">
          <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
            Stats for Nerds
          </h1>
          <p className="text-white/35 text-sm mt-2">
            Explore {overview.total_movies.toLocaleString()} films ·{' '}
            {overview.total_actors} actors · {overview.total_links.toLocaleString()} collaborations
            across {overview.industries} South Indian industries
          </p>
        </div>

        {/* ── Hero metrics ── */}
        <div className="flex flex-wrap gap-3 justify-center mb-10">
          <StatPill
            emoji="🎬"
            value={overview.total_movies.toLocaleString()}
            label="Films indexed"
          />
          <StatPill
            emoji="🎭"
            value={overview.total_actors.toLocaleString()}
            label="Fully ingested actors"
          />
          <StatPill
            emoji="🤝"
            value={overview.total_links.toLocaleString()}
            label="Actor–film links"
          />
          <StatPill
            emoji="🏭"
            value={String(overview.industries)}
            label="Industries"
          />
        </div>

        {/* ── Search bar (Client Component — needs actor-select callback) ── */}
        <Section id="search" className="mb-10">
          <StatsSearchClient />
        </Section>

        {/* ── Connection Finder ── */}
        <Section id="connection-finder" className="mb-8">
          <ConnectionFinder defaultActors={defaultActors} />
        </Section>

        {/* ── Row: Most Connected | Industry Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Section id="most-connected">
            <MostConnectedPanel data={connected} />
          </Section>
          <Section id="industry">
            <IndustryChart data={industry} />
          </Section>
        </div>

        {/* ── Director Partnerships (full width) ── */}
        <Section id="partnerships" className="mb-6">
          <DirectorPartnerships data={partnerships} />
        </Section>

        {/* ── Row: Career Timeline | Top Co-Star Networks ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Section id="career-timeline">
            {timeline ? (
              <CareerTimeline initialData={timeline} />
            ) : (
              <div className="glass rounded-3xl p-6 flex items-center justify-center min-h-[280px]">
                <p className="text-white/30 text-sm">Career timeline unavailable</p>
              </div>
            )}
          </Section>
          <Section id="top-costars">
            <TopCoStarsChart data={costars} />
          </Section>
        </div>

        {/* ── Footer note ── */}
        <p className="text-center text-white/20 text-xs mt-12">
          Data sourced from TMDB · {overview.total_actors} actors fully ingested ·
          Collaboration graph: {overview.total_links.toLocaleString()} edges
        </p>
      </div>
    </main>
  )
}
