/**
 * components/insights/InsightsGrid.tsx
 * ─────────────────────────────────────
 * Responsive grid layout for InsightCards.
 *
 * Columns:
 *   mobile  — 1 column
 *   tablet  — 2 columns (sm: 640 px+)
 *   desktop — 3 columns (lg: 1024 px+) when space allows
 *
 * Equal heights: each grid cell stretches to match its row sibling,
 * so all cards in a row are the same height.
 *
 * Usage (e.g. on a dedicated /insights page):
 *   import InsightsGrid from '@/components/insights/InsightsGrid'
 *   import { mapInsightsToCards } from '@/lib/mapInsightToCard'
 *
 *   const cards = mapInsightsToCards(insights)
 *   <InsightsGrid cards={cards} />
 */

import InsightCard, { type InsightCardProps } from '@/components/insights/InsightCard'

export default function InsightsGrid({ cards }: { cards: InsightCardProps[] }) {
  if (cards.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        // h-full lets the card fill the grid cell so rows are even-height
        <div key={i} className="h-full">
          <InsightCard {...card} />
        </div>
      ))}
    </div>
  )
}
