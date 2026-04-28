/**
 * components/InsightCard.tsx
 * ──────────────────────────
 * Backwards-compatible wrapper around the new premium InsightCard.
 *
 * The InsightsCarousel (and page.tsx) pass InsightCardData props — this
 * file maps them to InsightCardProps and delegates rendering to the new
 * component so no changes are needed in the carousel or homepage.
 *
 * The only new field added to InsightCardData is `insightType?: string`.
 * page.tsx sets this to `insight.type` (e.g. "collab_shock") so the
 * new card gets the correct gradient theme instead of a round-robin guess.
 */

import NewInsightCard from '@/components/insights/InsightCard'
import type { InsightCardProps } from '@/components/insights/InsightCard'
import { getInsightFooter } from '@/lib/insightFooter'

// ── Public interface ──────────────────────────────────────────────────────────
// Keep all existing fields; `insightType` is the only addition.

export interface InsightCardData {
  emoji:       string
  label:       string   // category tag shown at top of card
  headline:    string   // context blurb (personalised one-liner)
  stat:        string | number
  subtext?:    string
  actors?:     Array<{ name: string; avatarSlug?: string }>
  gradient:    'red' | 'purple' | 'orange' | 'blue' | 'green' | 'amber'
  href?:       string
  /** NEW: insight type from the backend (e.g. "collab_shock", "career_peak").
   *  When set, overrides the gradient→type fallback so the correct theme
   *  colours are used. Set this to `insight.type` in page.tsx. */
  insightType?: string
}

// ── Gradient → type fallback (used when insightType is missing) ───────────────

const GRADIENT_TO_TYPE: Record<InsightCardData['gradient'], string> = {
  red:    'collab_shock',
  purple: 'hidden_dominance',
  orange: 'career_peak',
  blue:   'network_power',
  green:  'cross_industry',
  amber:  'director_loyalty',
}

// ── Mapping function ─────────────────────────────────────────────────────────

function mapToCardProps(data: InsightCardData): InsightCardProps {
  const type      = data.insightType ?? GRADIENT_TO_TYPE[data.gradient] ?? 'collab_shock'
  const [a1, a2]  = data.actors ?? []
  const isDirector = type === 'director'

  return {
    type,
    title:               data.label,
    value:               data.stat,
    label:               data.headline,
    footer:              getInsightFooter(type, data.headline),
    imageUrl:            a1?.avatarSlug ? `/avatars/${a1.avatarSlug}.png` : undefined,
    actorName:           a1?.name,
    secondaryImageUrl:   !isDirector && a2?.avatarSlug ? `/avatars/${a2.avatarSlug}.png` : undefined,
    secondaryActorName:  a2?.name,
    href:                data.href,
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InsightCard(props: InsightCardData) {
  return <NewInsightCard {...mapToCardProps(props)} />
}
