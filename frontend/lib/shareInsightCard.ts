/**
 * shareInsightCard.ts
 * ────────────────────
 * Builds a 1 200 × 630 share-card PNG for an insight and offers it via the
 * native Web Share API (mobile) or a PNG download (desktop).
 *
 * Uses the same Canvas API pattern as shareCard.ts — no external libraries.
 * Actor portraits are loaded from /public/avatars/ (same-origin, zero CORS risk).
 *
 * Theme colours are kept in sync with components/insights/InsightCard.tsx.
 */

// ── Theme map ─────────────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; accent: string }> = {
  cross_industry:      { bg: '#0B5D3D', accent: '#6ee7b7' },
  collab_shock:        { bg: '#7A2208', accent: '#fca47c' },
  hidden_dominance:    { bg: '#5A189A', accent: '#d8b4fe' },
  career_peak:         { bg: '#8A6A00', accent: '#fde68a' },
  network_power:       { bg: '#005B96', accent: '#93c5fd' },
  director_loyalty:    { bg: '#006D67', accent: '#5eead4' },
  director_box_office: { bg: '#8A6A00', accent: '#fde68a' },
  collaboration:       { bg: '#7A2208', accent: '#fca47c' },
  director:            { bg: '#006D67', accent: '#5eead4' },
  supporting:          { bg: '#5A189A', accent: '#d8b4fe' },
}
const FALLBACK_THEME = { bg: '#1E293B', accent: '#94a3b8' }

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse hex colour to rgba() string with custom alpha (0–1). */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Load an image element from src, resolving to null on error. */
async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Split "42 films" → { main: "42", unit: "films" }. */
function splitStat(v: string | number): { main: string; unit: string } {
  const s = String(v).trim()
  const idx = s.indexOf(' ')
  if (idx > 0) return { main: s.slice(0, idx), unit: s.slice(idx + 1) }
  return { main: s, unit: '' }
}

/** Font size for the giant stat number based on character count. */
function statFontSize(len: number): number {
  if (len <= 3) return 220
  if (len <= 6) return 165
  return 118
}

/**
 * Skip leading single-letter initials — e.g. "I. V. Sasi" → "Sasi".
 * Matches the shortName() helper in InsightCard.tsx.
 */
function shortName(full: string): string {
  const parts = full.trim().split(/\s+/)
  return parts.find(p => p.replace(/\./g, '').length > 2) ?? parts[parts.length - 1] ?? full
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface InsightCardShareData {
  type:                 string
  title:                string   // category label, e.g. "THE ULTIMATE CONNECTOR"
  value:                string | number
  footer:               string   // cinematic phrase, e.g. "Some bonds stay"
  actorName?:           string
  avatarSlug?:          string   // loaded from /avatars/{slug}.png (same-origin)
  secondaryActorName?:  string
  secondaryAvatarSlug?: string
}

// ── Canvas builder ────────────────────────────────────────────────────────────

export async function buildInsightCanvas(d: InsightCardShareData): Promise<HTMLCanvasElement> {
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const theme  = THEMES[d.type] ?? FALLBACK_THEME
  const splitX = W * 0.58   // text / portrait boundary

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)

  // ── Portraits ─────────────────────────────────────────────────────────────
  const p1 = d.avatarSlug          ? await loadImg(`/avatars/${d.avatarSlug}.png`)          : null
  const p2 = d.secondaryAvatarSlug ? await loadImg(`/avatars/${d.secondaryAvatarSlug}.png`) : null

  if (p1 && !p2) {
    // Single portrait — full-bleed right column
    const aspect = p1.naturalWidth / p1.naturalHeight || 1
    const dH = H, dW = dH * aspect
    ctx.drawImage(p1, splitX, 0, dW, dH)

    // Left-edge colour fade (matches card CSS gradient)
    const fade = ctx.createLinearGradient(splitX, 0, splitX + 180, 0)
    fade.addColorStop(0, theme.bg)
    fade.addColorStop(1, hexA(theme.bg, 0))
    ctx.fillStyle = fade
    ctx.fillRect(splitX, 0, 180, H)

    // Bottom vignette
    const vign = ctx.createLinearGradient(0, H - 200, 0, H)
    vign.addColorStop(0, hexA(theme.bg, 0))
    vign.addColorStop(1, hexA(theme.bg, 0.75))
    ctx.fillStyle = vign
    ctx.fillRect(splitX, H - 200, W, 200)

  } else if (p1 && p2) {
    // Duo — overlapping circles, bottom-right (mirrors card UI layout)
    const r   = 115
    const cx1 = W - 230, cy1 = H - r - 30
    const cx2 = cx1 + (r * 2 - 32), cy2 = cy1

    // Draw p2 (behind)
    ctx.save()
    ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI * 2); ctx.clip()
    const a2 = p2.naturalWidth / p2.naturalHeight || 1
    ctx.drawImage(p2, cx2 - r, cy2 - r / a2 * 1.1, r * 2, r * 2 / a2 * 1.6)
    ctx.restore()

    // Draw p1 (front)
    ctx.save()
    ctx.beginPath(); ctx.arc(cx1, cy1, r, 0, Math.PI * 2); ctx.clip()
    const a1 = p1.naturalWidth / p1.naturalHeight || 1
    ctx.drawImage(p1, cx1 - r, cy1 - r / a1 * 1.1, r * 2, r * 2 / a1 * 1.6)
    ctx.restore()

    // Circle borders
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 4
    for (const cx of [cx1, cx2]) {
      ctx.beginPath(); ctx.arc(cx, cy1, r, 0, Math.PI * 2); ctx.stroke()
    }

    // Names above each circle
    ctx.font = '600 22px -apple-system, system-ui, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.68)'
    if (d.actorName)          ctx.fillText(shortName(d.actorName),          cx1, cy1 - r - 14)
    if (d.secondaryActorName) ctx.fillText(shortName(d.secondaryActorName), cx2, cy2 - r - 14)
    ctx.textAlign = 'left'
  }

  // ── Top accent line ───────────────────────────────────────────────────────
  const accentLine = ctx.createLinearGradient(0, 0, W, 0)
  accentLine.addColorStop(0,    'transparent')
  accentLine.addColorStop(0.12, hexA(theme.accent, 0.7))
  accentLine.addColorStop(0.88, hexA(theme.accent, 0.7))
  accentLine.addColorStop(1,    'transparent')
  ctx.fillStyle = accentLine
  ctx.fillRect(0, 0, W, 6)

  // ── Text — left column ────────────────────────────────────────────────────
  const px  = 72
  const { main: statMain, unit: statUnit } = splitStat(d.value)
  const fs  = statFontSize(statMain.length)

  // Category label
  ctx.fillStyle = hexA(theme.accent, 0.82)
  ctx.font = `700 22px -apple-system, system-ui, BlinkMacSystemFont, sans-serif`
  ctx.fillText(d.title.toUpperCase(), px, 88)

  // Giant stat number
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${fs}px -apple-system, system-ui, BlinkMacSystemFont, sans-serif`
  const statY = 88 + 50 + fs * 0.84
  ctx.fillText(statMain, px, statY)

  // Stat unit / metric label
  if (statUnit) {
    ctx.fillStyle = hexA(theme.accent, 0.94)
    ctx.font = `700 50px -apple-system, system-ui, BlinkMacSystemFont, sans-serif`
    ctx.fillText(statUnit, px, statY + 66)
  }

  // Footer phrase
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = `600 34px -apple-system, system-ui, BlinkMacSystemFont, sans-serif`
  ctx.fillText(d.footer, px, H - 88)

  // CINETRACE branding
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.font = `500 20px -apple-system, system-ui, BlinkMacSystemFont, sans-serif`
  ctx.fillText('CINETRACE.IN', px, H - 44)

  return canvas
}

// ── Main share function ───────────────────────────────────────────────────────

/**
 * Build the insight share-card canvas and offer it via:
 *   • Web Share API with PNG file attached  (mobile — triggers native share sheet)
 *   • PNG download                          (desktop — no Web Share file support)
 *
 * Falls back gracefully to clipboard URL copy if canvas generation fails.
 */
export async function shareInsightCard(
  data: InsightCardShareData,
  href: string,
): Promise<{ ok: boolean }> {
  try {
    const canvas = await buildInsightCanvas(data)

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob(b => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    )

    const file    = new File([blob], 'cinetrace-insight.png', { type: 'image/png' })
    const origin  = typeof window !== 'undefined' ? window.location.origin : ''
    const fullUrl = `${origin}${href.startsWith('/') ? href : `/${href}`}`

    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      // Mobile — native share sheet with PNG
      await navigator.share({
        files: [file],
        title: `CineTrace${data.actorName ? ` — ${data.actorName}` : ''}`,
        url:   fullUrl,
      })
    } else {
      // Desktop — download the PNG
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url; a.download = 'cinetrace-insight.png'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5_000)
    }

    return { ok: true }
  } catch (err) {
    console.error('[shareInsightCard]', err)
    // Graceful fallback — copy URL to clipboard
    try {
      const origin  = typeof window !== 'undefined' ? window.location.origin : ''
      const fullUrl = `${origin}${href.startsWith('/') ? href : `/${href}`}`
      await navigator.clipboard.writeText(fullUrl)
    } catch { /* clipboard may also be unavailable */ }
    return { ok: false }
  }
}
