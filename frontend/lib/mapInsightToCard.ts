/**
 * mapInsightToCard.ts
 * ───────────────────
 * Maps the raw Insight API type (from lib/api.ts) directly to InsightCardProps
 * for the new premium card component.
 *
 * Use this when building pages that consume raw Insight[] from the backend.
 * The homepage still goes through the InsightCardData → InsightCard wrapper
 * for backwards compatibility; future pages can use this mapper directly.
 */

import type { Insight } from '@/lib/api'
import type { InsightCardProps } from '@/components/insights/InsightCard'
import { getInsightFooter } from '@/lib/insightFooter'
import { toActorSlug } from '@/lib/api'

// ── Avatar resolution ─────────────────────────────────────────────────────────
// Client-side only (no fs access). Uses known-good slugs or falls back to null.
function avatarUrl(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `/avatars/${slug}.png`
}

// ── href builder ─────────────────────────────────────────────────────────────
function buildHref(insight: Insight): string {
  const { type, actors } = insight
  if ((type === 'collaboration' || type === 'collab_shock') && actors.length >= 2) {
    return `/compare/${toActorSlug(actors[0])}-vs-${toActorSlug(actors[1])}`
  }
  if (actors.length > 0) return `/actors/${toActorSlug(actors[0])}`
  return '#'
}

/**
 * Maps a raw Insight object to InsightCardProps for the premium card.
 *
 * @param insight  - Insight returned from GET /analytics/insights
 * @param index    - position in list (used for stable footer seed variation)
 */
export function mapInsightToCard(insight: Insight, index = 0): InsightCardProps {
  const { type, value, unit, actors, subtext, headline } = insight

  // Hero stat — keep the full string so InsightCard can split it internally
  const stat =
    typeof value === 'string'
      ? value
      : `${value} ${unit ?? 'films'}`

  // Label: subtext (WOW context) takes priority; fall back to headline blurb
  const label = subtext ?? headline ?? ''

  // Footer: cinematic phrase, seeded by actor name for stability
  const footer = getInsightFooter(type, actors[0] ?? String(index))

  const [a1, a2] = actors
  const isDirector = type === 'director'

  return {
    type,
    title:               insight.category ?? type.replace(/_/g, ' ').toUpperCase(),
    value:               stat,
    label,
    footer,
    imageUrl:            a1 ? avatarUrl(a1) : undefined,
    actorName:           a1,
    secondaryImageUrl:   !isDirector && a2 ? avatarUrl(a2) : undefined,
    href:                buildHref(insight),
  }
}

/** Convenience: map an array of insights to card props */
export function mapInsightsToCards(insights: Insight[]): InsightCardProps[] {
  return insights.map((ins, i) => mapInsightToCard(ins, i))
}
