/**
 * shareInsight.ts
 * ───────────────
 * Architecture for shareable insight cards.
 *
 * Phase 1  (live now):    copy deep-link URL to clipboard.
 * Phase 2  (planned):     POST to /api/share-card → get a rendered PNG →
 *                         use navigator.share({ files }) or trigger download.
 */

export type ShareMethod = 'link' | 'image'

export interface ShareInsightOptions {
  /** Relative path for the insight deep-link, e.g. "/actors/rajinikanth" */
  href: string
  /** Actor name for the share title */
  actorName?: string
  /** The stat value, used as share description */
  statValue?: string | number
  /** 'link' = copy URL (Phase 1); 'image' = render PNG (Phase 2) */
  method?: ShareMethod
}

/**
 * Phase 1 — copies the insight deep-link to the clipboard.
 *
 * Phase 2 hook: when method='image', this function will call
 * POST /api/share-card to generate an OG-style PNG via Puppeteer /
 * @vercel/og, then offer it via navigator.share or download.
 */
export async function shareInsight(
  options: ShareInsightOptions,
): Promise<{ ok: boolean; message: string }> {
  const { href, actorName, statValue, method = 'link' } = options

  if (method === 'image') {
    // ── Phase 2 placeholder ──────────────────────────────────────────────────
    // const origin = typeof window !== 'undefined' ? window.location.origin : ''
    // const res = await fetch('/api/share-card', {
    //   method: 'POST',
    //   body: JSON.stringify({ href, actorName, statValue }),
    //   headers: { 'Content-Type': 'application/json' },
    // })
    // const { imageUrl } = await res.json()
    // if (navigator.share) {
    //   const blob = await fetch(imageUrl).then(r => r.blob())
    //   const file = new File([blob], 'cinetrace-stat.png', { type: 'image/png' })
    //   await navigator.share({ title: `CineTrace — ${actorName ?? ''}`, url: origin + href, files: [file] })
    //   return { ok: true, message: 'Shared!' }
    // }
    // ── end Phase 2 ──────────────────────────────────────────────────────────
    console.warn('[shareInsight] Image export (Phase 2) not yet implemented — falling back to link copy.')
  }

  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${origin}${href.startsWith('/') ? href : `/${href}`}`

    // Try Web Share API first (iOS / Android native sheet)
    if (navigator.share) {
      const shareData: ShareData = {
        title: `CineTrace${actorName ? ` — ${actorName}` : ''}`,
        text:  statValue != null ? String(statValue) : undefined,
        url,
      }
      if (navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
        return { ok: true, message: 'Shared!' }
      }
    }

    await navigator.clipboard.writeText(url)
    return { ok: true, message: 'Link copied!' }
  } catch {
    return { ok: false, message: 'Could not copy link' }
  }
}
