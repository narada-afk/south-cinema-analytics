/**
 * lib/shareSectionCard.ts
 * ─────────────────────────
 * Canvas PNG generators for actor profile sections:
 *   • buildBlockbustersCanvas  — top box office films
 *   • buildDirectorsCanvas     — most-worked-with directors
 *   • buildCollaboratorsCanvas — lead co-stars
 *
 * Canvas is 1 200 × 630 (standard OG / Twitter card ratio).
 * Actor avatars are same-origin (/public/avatars/) — zero CORS risk.
 * Movie posters are TMDB CDN (cross-origin) — skipped; clean text layout only.
 */

const W = 1200, H = 630
const SYS = '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", sans-serif'

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

async function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Round-rect fill with plain-rect fallback for older browsers. */
function fillRR(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath()
  if (typeof (ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ctx as any).roundRect(x, y, w, h, r)
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.fill()
}

/** Scale font size to keep actor name on one line within ~740 px. */
function nameFontSize(name: string): number {
  const len = name.length
  if (len <= 9)  return 72
  if (len <= 13) return 64
  if (len <= 17) return 54
  return 44
}

function formatCrore(v: number): string {
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K Cr`
  return `₹${Math.round(v)} Cr`
}

// ── Shared canvas foundation ──────────────────────────────────────────────────

interface Theme { bg: string; accent: string; emoji: string; label: string }

/**
 * Draw background, portrait, accent bar; return the canvas + usable right boundary.
 */
async function makeBase(
  theme: Theme,
  actorName: string,
  avatarSlug: string | null,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; rightEdge: number }> {
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Solid background
  ctx.fillStyle = theme.bg
  ctx.fillRect(0, 0, W, H)

  // Subtle radial tint — warms the text area
  const glow = ctx.createRadialGradient(300, H * 0.45, 0, 300, H * 0.45, 550)
  glow.addColorStop(0, hexA(theme.accent, 0.05))
  glow.addColorStop(1, hexA(theme.bg, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Actor portrait — right column, tall circle
  const R  = 210
  const CX = W - 175
  const CY = H / 2 + 20

  let rightEdge = W * 0.60   // default boundary when no avatar

  if (avatarSlug) {
    const img = await loadImg(`/avatars/${avatarSlug}.png`)
    if (img) {
      rightEdge = CX - R - 20   // text must stay left of fade

      // Circular clip
      ctx.save()
      ctx.beginPath()
      ctx.arc(CX, CY, R, 0, Math.PI * 2)
      ctx.clip()
      const aspect = img.naturalWidth / img.naturalHeight || 1
      const dW = R * 2, dH = dW / aspect
      ctx.drawImage(img, CX - R, CY - dH * 0.30, dW, dH * 1.25)
      ctx.restore()

      // Horizontal fade: bg → transparent, covers leftmost 160 px of portrait column
      const hFade = ctx.createLinearGradient(rightEdge - 10, 0, rightEdge + 150, 0)
      hFade.addColorStop(0, theme.bg)
      hFade.addColorStop(1, hexA(theme.bg, 0))
      ctx.fillStyle = hFade
      ctx.fillRect(rightEdge - 10, 0, 160, H)

      // Bottom vignette over portrait
      const vFade = ctx.createLinearGradient(0, H - 180, 0, H)
      vFade.addColorStop(0, hexA(theme.bg, 0))
      vFade.addColorStop(1, hexA(theme.bg, 0.72))
      ctx.fillStyle = vFade
      ctx.fillRect(rightEdge - 10, H - 180, W, 180)
    }
  }

  // Top accent bar — 5 px, full-width gradient
  const bar = ctx.createLinearGradient(0, 0, W, 0)
  bar.addColorStop(0,    'transparent')
  bar.addColorStop(0.10, hexA(theme.accent, 0.72))
  bar.addColorStop(0.90, hexA(theme.accent, 0.72))
  bar.addColorStop(1,    'transparent')
  ctx.fillStyle = bar
  ctx.fillRect(0, 0, W, 5)

  return { canvas, ctx, rightEdge }
}

/** Header block: section label (small caps) + actor name (hero text). */
function drawHeader(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  actorName: string,
): number /* returns y of divider */ {
  const px = 72

  // Section label
  ctx.font      = `700 22px ${SYS}`
  ctx.fillStyle = hexA(theme.accent, 0.82)
  ctx.fillText(`${theme.emoji}  ${theme.label.toUpperCase()}`, px, 78)

  // Actor name
  const fs = nameFontSize(actorName)
  ctx.font      = `900 ${fs}px ${SYS}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(actorName, px, 78 + 28 + fs * 0.88)

  // Divider
  const divY = 78 + 28 + fs + 20
  ctx.strokeStyle = hexA(theme.accent, 0.16)
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(px, divY)
  ctx.lineTo(760, divY)
  ctx.stroke()

  return divY
}

/** CINETRACE.IN brand mark — bottom-left. */
function drawBrand(ctx: CanvasRenderingContext2D): void {
  ctx.font      = `500 19px ${SYS}`
  ctx.fillStyle = 'rgba(255,255,255,0.20)'
  ctx.fillText('CINETRACE.IN', 72, H - 32)
}

/** Horizontal bar chart row: label left, value right, thin bar below. */
function drawRow(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  y: number,
  label: string,
  valueText: string,
  fraction: number,
  rank: number,          // 0-based
  barMaxRight: number,
) {
  const px        = 72
  const alpha     = Math.max(0.28, 0.92 - rank * 0.12)
  const titleSize = rank < 2 ? 24 : 21

  // Trim long labels
  const trimmed = label.length > 32 ? label.slice(0, 30) + '…' : label

  ctx.font      = `${rank === 0 ? '700' : '500'} ${titleSize}px ${SYS}`
  ctx.fillStyle = `rgba(255,255,255,${alpha})`
  ctx.fillText(trimmed, px, y)

  ctx.font      = `600 ${rank < 2 ? 21 : 18}px ${SYS}`
  ctx.fillStyle = hexA(theme.accent, rank === 0 ? 0.96 : alpha * 0.8)
  ctx.textAlign = 'right'
  ctx.fillText(valueText, barMaxRight, y)
  ctx.textAlign = 'left'

  // Bar track
  const bW  = barMaxRight - px
  const bY  = y + 10
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  fillRR(ctx, px, bY, bW, 3, 1.5)

  // Bar fill
  ctx.fillStyle = hexA(theme.accent, rank === 0 ? 0.65 : 0.35)
  fillRR(ctx, px, bY, Math.max(4, bW * fraction), 3, 1.5)
}

// ── Blockbusters ──────────────────────────────────────────────────────────────

export interface BlockbusterEntry {
  title: string
  release_year: number
  box_office_crore: number
}

export interface BlockbustersShareData {
  actorName: string
  avatarSlug: string | null
  blockbusters: BlockbusterEntry[]
}

export async function buildBlockbustersCanvas(d: BlockbustersShareData): Promise<HTMLCanvasElement> {
  const theme: Theme = { bg: '#0F0B00', accent: '#F5D98B', emoji: '💰', label: 'Blockbusters' }
  const { canvas, ctx, rightEdge } = await makeBase(theme, d.actorName, d.avatarSlug)
  const divY = drawHeader(ctx, theme, d.actorName)

  const top     = d.blockbusters.slice(0, 5)
  const maxVal  = top[0]?.box_office_crore ?? 1
  const barRight = Math.min(rightEdge - 40, 760)
  const rowH    = (H - divY - 14 - 60) / Math.max(top.length, 1)
  const rankClr = ['#F5D98B', '#C8C8C8', '#CD7F32', 'rgba(255,255,255,0.40)', 'rgba(255,255,255,0.22)']

  top.forEach((b, i) => {
    const baseY = divY + 14 + rowH * i
    const y     = baseY + rowH * 0.60

    // Rank badge
    ctx.font      = `700 17px ${SYS}`
    ctx.fillStyle = rankClr[i] ?? 'rgba(255,255,255,0.18)'
    ctx.fillText(`#${i + 1}`, 72, y)

    const px     = 106
    const alpha  = Math.max(0.28, 0.95 - i * 0.12)
    const tSize  = i < 2 ? 24 : 21
    const label  = b.title.length > 30 ? b.title.slice(0, 28) + '…' : b.title

    ctx.font      = `${i === 0 ? '700' : '500'} ${tSize}px ${SYS}`
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fillText(label, px, y)

    // Year tag — small, below title
    ctx.font      = `400 15px ${SYS}`
    ctx.fillStyle = 'rgba(255,255,255,0.32)'
    ctx.fillText(`${b.release_year}`, px, y + 18)

    // Box office — right-aligned
    ctx.font      = `700 ${i === 0 ? 22 : 19}px ${SYS}`
    ctx.fillStyle = hexA(theme.accent, i === 0 ? 0.96 : 0.62)
    ctx.textAlign = 'right'
    ctx.fillText(formatCrore(b.box_office_crore), barRight, y)
    ctx.textAlign = 'left'

    // Progress bar
    const bW = barRight - px
    const bY = y + 24
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    fillRR(ctx, px, bY, bW, 3, 1.5)
    ctx.fillStyle = hexA(theme.accent, i === 0 ? 0.65 : 0.35)
    fillRR(ctx, px, bY, Math.max(4, bW * (b.box_office_crore / maxVal)), 3, 1.5)
  })

  drawBrand(ctx)
  return canvas
}

// ── Directors ─────────────────────────────────────────────────────────────────

export interface DirectorsShareData {
  actorName: string
  avatarSlug: string | null
  directors: Array<{ director: string; films: number }>
}

export async function buildDirectorsCanvas(d: DirectorsShareData): Promise<HTMLCanvasElement> {
  const theme: Theme = { bg: '#0B0514', accent: '#a78bfa', emoji: '🎬', label: 'Directors Worked With' }
  const { canvas, ctx, rightEdge } = await makeBase(theme, d.actorName, d.avatarSlug)
  const divY = drawHeader(ctx, theme, d.actorName)

  const top      = d.directors.slice(0, 6)
  const maxFilms = top[0]?.films ?? 1
  const barRight = Math.min(rightEdge - 40, 760)
  const rowH     = (H - divY - 14 - 60) / Math.max(top.length, 1)

  top.forEach((dir, i) => {
    const y = divY + 14 + rowH * i + rowH * 0.60
    drawRow(ctx, theme, y, dir.director, `${dir.films} film${dir.films === 1 ? '' : 's'}`, dir.films / maxFilms, i, barRight)
  })

  drawBrand(ctx)
  return canvas
}

// ── Lead Collaborators ────────────────────────────────────────────────────────

export interface CollaboratorsShareData {
  actorName: string
  avatarSlug: string | null
  sectionLabel: string   // e.g. "Lead Actresses" or "Lead Actors"
  collaborators: Array<{ actor: string; films: number }>
}

export async function buildCollaboratorsCanvas(d: CollaboratorsShareData): Promise<HTMLCanvasElement> {
  const theme: Theme = { bg: '#00100F', accent: '#5eead4', emoji: '✨', label: d.sectionLabel }
  const { canvas, ctx, rightEdge } = await makeBase(theme, d.actorName, d.avatarSlug)
  const divY = drawHeader(ctx, theme, d.actorName)

  const top      = d.collaborators.slice(0, 6)
  const maxFilms = top[0]?.films ?? 1
  const barRight = Math.min(rightEdge - 40, 760)
  const rowH     = (H - divY - 14 - 60) / Math.max(top.length, 1)

  top.forEach((c, i) => {
    const y = divY + 14 + rowH * i + rowH * 0.60
    drawRow(ctx, theme, y, c.actor, `${c.films} film${c.films === 1 ? '' : 's'}`, c.films / maxFilms, i, barRight)
  })

  drawBrand(ctx)
  return canvas
}

// ── Shared share helper ───────────────────────────────────────────────────────

/**
 * Converts a canvas to a PNG and delivers it via:
 *   • native share sheet with file  (mobile only — Web Share API)
 *   • automatic PNG download        (desktop — Brave/Chrome/Safari safe)
 *   • clipboard URL copy            (last resort if canvas API is fully blocked)
 *
 * Desktop deliberately skips navigator.share() — on Brave/Chrome desktop it
 * either requires an explicit user gesture in a popup or throws AbortError,
 * which previously caused silent fallback to clipboard copy.
 */
export async function shareCanvasCard(
  canvas: HTMLCanvasElement,
  filename: string,
  actorName: string,
  pageHref: string,
): Promise<{ ok: boolean }> {
  const origin  = typeof window !== 'undefined' ? window.location.origin : ''
  const fullUrl = `${origin}${pageHref.startsWith('/') ? pageHref : `/${pageHref}`}`

  // ── 1. Get a Blob from the canvas ────────────────────────────────────────────
  // Try toBlob first; if Brave's fingerprint-protection returns null, fall back
  // to toDataURL → fetch() to get the same Blob another way.
  let blob: Blob | null = null

  try {
    blob = await new Promise<Blob | null>(res =>
      canvas.toBlob(b => res(b), 'image/png'),
    )
  } catch { /* browser blocked toBlob */ }

  if (!blob) {
    try {
      const dataUrl = canvas.toDataURL('image/png')
      const r = await fetch(dataUrl)
      blob = await r.blob()
    } catch { /* also blocked */ }
  }

  if (!blob) {
    // Canvas API entirely blocked — copy link as last resort
    try { await navigator.clipboard.writeText(fullUrl) } catch { /* noop */ }
    return { ok: false }
  }

  // ── 2. Mobile: native share sheet (file attachment) ──────────────────────────
  const isMobile = /Android|iPhone|iPad|iPod/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
  )

  if (isMobile) {
    const file = new File([blob], filename, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `CineTrace — ${actorName}`, url: fullUrl })
        return { ok: true }
      } catch { /* user cancelled or unsupported — fall through to download */ }
    }
  }

  // ── 3. Desktop (or mobile fallback): direct PNG download ────────────────────
  try {
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = filename
    // Anchor must be in the DOM for Chromium-based browsers to honour .download
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5_000)
    return { ok: true }
  } catch (err) {
    console.error('[shareCanvasCard] download failed', err)
    try { await navigator.clipboard.writeText(fullUrl) } catch { /* noop */ }
    return { ok: false }
  }
}
