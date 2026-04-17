/**
 * lib/analytics.ts
 * ─────────────────────────────────────────────────────────────
 * Thin GA4 (gtag) wrapper. All helpers are safe to call from
 * client components — they no-op silently when:
 *   • running on the server (SSR)
 *   • NEXT_PUBLIC_GA_ID is not set
 *   • gtag hasn't loaded yet
 *
 * PostHog is handled separately via lib/posthog.ts — this file
 * only concerns GA4 so the two pipelines stay independent.
 * ─────────────────────────────────────────────────────────────
 */

/* Extend Window so TypeScript knows about gtag */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

/** Internal: fire a GA4 event. Safe on server + before gtag loads. */
function gtagEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Generic event. Use for one-off events not covered by the
 * specific helpers below.
 */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  gtagEvent(name, params)
}

/**
 * Track a page view. Called on every client-side route change
 * from PostHogProvider so GA4 follows SPA navigation.
 */
export function trackPageView(url: string): void {
  if (!process.env.NEXT_PUBLIC_GA_ID) return
  gtagEvent('page_view', {
    page_path:  url,
    page_title: typeof document !== 'undefined' ? document.title : undefined,
  })
}

/**
 * Track a search query.
 * GA4 standard event: `search` (shows up in Search reports).
 * Also fires a custom `actor_search` event with the raw query.
 */
export function trackSearch(query: string): void {
  if (!query.trim()) return
  gtagEvent('search',       { search_term: query.trim() })
  gtagEvent('actor_search', { query: query.trim() })
}

/**
 * Track an actor profile view.
 * Fires GA4's standard `view_item` plus a custom `actor_view`.
 */
export function trackActorView(
  actorName: string,
  actorId?: number,
  industry?: string,
): void {
  gtagEvent('view_item', {
    items: [{ item_name: actorName, item_id: actorId, item_category: industry }],
  })
  gtagEvent('actor_view', { actor_name: actorName, actor_id: actorId, industry })
}

/**
 * Track an actor comparison.
 */
export function trackCompare(actorA: string, actorB: string): void {
  gtagEvent('compare_actors', { actor_a: actorA, actor_b: actorB })
}
