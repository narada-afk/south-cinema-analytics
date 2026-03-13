'use client'

/**
 * CinemaUniverse — Force-Directed Collaboration Graph
 *
 * Shows all 142 ingested actors as nodes connected by edges representing
 * shared films. Uses a Fruchterman-Reingold force simulation implemented
 * directly on canvas (no external lib required).
 *
 * Node size  → proportional to costar_count
 * Node color → industry
 * Edge width → proportional to shared film count
 * Hover      → shows actor name, industry, film/costar counts
 * Click      → highlights node + its direct connections, dims the rest
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { type CinemaUniverse as UniverseData, type UniverseNode, type UniverseEdge } from '@/lib/api'

// ── Industry colors ────────────────────────────────────────────────────────────
const IND_COLOR: Record<string, string> = {
  Tamil:     '#f43f5e',
  Telugu:    '#f59e0b',
  Malayalam: '#06b6d4',
  Kannada:   '#8b5cf6',
  Unknown:   '#6b7280',
}

// ── Force simulation (Fruchterman-Reingold) ────────────────────────────────────

interface SimNode extends UniverseNode {
  x: number; y: number; vx: number; vy: number
}

function runForceLayout(nodes: SimNode[], edges: UniverseEdge[], W: number, H: number, iters = 250) {
  const N = nodes.length
  if (N === 0) return

  // Build index map
  const idxMap: Record<number, number> = {}
  nodes.forEach((n, i) => { idxMap[n.id] = i })

  // Optimal distance
  const K = Math.sqrt((W * H) / N) * 1.4
  const maxDisp = Math.min(W, H) / 8

  const dx = new Float64Array(N)
  const dy = new Float64Array(N)

  for (let iter = 0; iter < iters; iter++) {
    const temp = maxDisp * (1 - iter / iters)
    dx.fill(0); dy.fill(0)

    // Repulsion (all pairs — O(n²))
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const ddx = nodes[j].x - nodes[i].x
        const ddy = nodes[j].y - nodes[i].y
        const d = Math.sqrt(ddx * ddx + ddy * ddy) || 0.1
        const f = (K * K) / d
        dx[i] -= (f * ddx) / d
        dy[i] -= (f * ddy) / d
        dx[j] += (f * ddx) / d
        dy[j] += (f * ddy) / d
      }
    }

    // Attraction (edges)
    for (const e of edges) {
      const si = idxMap[e.source], ti = idxMap[e.target]
      if (si === undefined || ti === undefined) continue
      const ddx = nodes[ti].x - nodes[si].x
      const ddy = nodes[ti].y - nodes[si].y
      const d = Math.sqrt(ddx * ddx + ddy * ddy) || 0.1
      const f = (d * d) / (K * (1 + Math.log1p(e.weight) * 0.3))
      dx[si] += (f * ddx) / d
      dy[si] += (f * ddy) / d
      dx[ti] -= (f * ddx) / d
      dy[ti] -= (f * ddy) / d
    }

    // Apply with cooling + center gravity
    for (let i = 0; i < N; i++) {
      const disp = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) || 0.1
      nodes[i].x += (dx[i] / disp) * Math.min(disp, temp)
      nodes[i].y += (dy[i] / disp) * Math.min(disp, temp)
      // gentle center pull
      nodes[i].x += (W / 2 - nodes[i].x) * 0.008
      nodes[i].y += (H / 2 - nodes[i].y) * 0.008
      // clamp
      nodes[i].x = Math.max(24, Math.min(W - 24, nodes[i].x))
      nodes[i].y = Math.max(24, Math.min(H - 24, nodes[i].y))
    }
  }
}

// ── Canvas renderer ────────────────────────────────────────────────────────────

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  edges: UniverseEdge[],
  idxMap: Record<number, number>,
  W: number,
  H: number,
  hovered: number | null,
  selected: number | null,
  dpr: number,
) {
  ctx.clearRect(0, 0, W * dpr, H * dpr)
  ctx.save()
  ctx.scale(dpr, dpr)

  const maxCostar = Math.max(...nodes.map(n => n.costar_count)) || 1
  const nodeR = (n: SimNode) => 4 + (n.costar_count / maxCostar) * 16
  const maxWeight = Math.max(...edges.map(e => e.weight)) || 1

  // Which node IDs are neighbours of the selected/hovered node?
  const focusId = selected ?? hovered
  const neighbourSet = new Set<number>()
  if (focusId !== null) {
    for (const e of edges) {
      if (e.source === focusId) neighbourSet.add(e.target)
      if (e.target === focusId) neighbourSet.add(e.source)
    }
  }

  // Draw edges
  for (const e of edges) {
    const si = idxMap[e.source], ti = idxMap[e.target]
    if (si === undefined || ti === undefined) continue
    const sn = nodes[si], tn = nodes[ti]
    const isActive = focusId === null ||
      e.source === focusId || e.target === focusId
    const alpha = isActive ? 0.15 + (e.weight / maxWeight) * 0.4 : 0.03
    ctx.beginPath()
    ctx.moveTo(sn.x, sn.y)
    ctx.lineTo(tn.x, tn.y)
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`
    ctx.lineWidth = 0.5 + (e.weight / maxWeight) * 2
    ctx.stroke()
  }

  // Draw nodes
  for (const n of nodes) {
    const r = nodeR(n)
    const color = IND_COLOR[n.industry] ?? IND_COLOR.Unknown
    const isHovered  = n.id === hovered
    const isFocused  = n.id === focusId
    const isNeighbor = neighbourSet.has(n.id)
    const dimmed = focusId !== null && !isFocused && !isNeighbor

    ctx.globalAlpha = dimmed ? 0.18 : 1

    // Glow for highlighted nodes
    if (isFocused || isHovered) {
      ctx.shadowColor = color
      ctx.shadowBlur = 16
    }

    ctx.beginPath()
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // Ring for hovered/selected
    if (isFocused || isHovered) {
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1

    // Labels for large nodes or focused
    if (r > 9 || isFocused || (isNeighbor && focusId !== null)) {
      const alpha = dimmed ? 0 : (isFocused || r > 9 ? 1 : 0.7)
      ctx.globalAlpha = alpha
      ctx.font = `${isFocused ? 600 : 400} ${Math.max(9, Math.min(r * 0.85, 13))}px Inter, sans-serif`
      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.fillText(n.name.split(' ')[0], n.x, n.y + r + 11)
      ctx.globalAlpha = 1
    }
  }

  ctx.restore()
}

// ── Tooltip ─────────────────────────────────────────────────────────────────────

function Tooltip({ node, x, y }: { node: UniverseNode; x: number; y: number }) {
  return (
    <div
      className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl text-xs text-white shadow-xl"
      style={{
        left: Math.min(x + 14, window.innerWidth - 200),
        top: Math.max(y - 56, 8),
        background: 'rgba(15,15,28,0.95)',
        border: `1px solid ${IND_COLOR[node.industry] ?? '#444'}55`,
      }}
    >
      <div className="font-semibold">{node.name}</div>
      <div className="flex gap-3 mt-0.5 text-white/50">
        <span>{node.industry}</span>
        <span>{node.film_count} films</span>
        <span>{node.costar_count} co-stars</span>
      </div>
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-white/50 mt-3">
      {Object.entries(IND_COLOR).filter(([k]) => k !== 'Unknown').map(([ind, col]) => (
        <div key={ind} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: col }} />
          {ind}
        </div>
      ))}
      <div className="ml-auto text-white/30">Node size = co-star count · Edge width = shared films</div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CinemaUniverse({ data }: { data: UniverseData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [simNodes, setSimNodes] = useState<SimNode[] | null>(null)
  const [idxMap, setIdxMap] = useState<Record<number, number>>({})
  const [hovered, setHovered] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<{ node: UniverseNode; x: number; y: number } | null>(null)
  const [simulating, setSimulating] = useState(true)

  const W = 900, H = 560

  // Run force simulation once
  useEffect(() => {
    if (!data.nodes.length) return
    setSimulating(true)
    setTimeout(() => {
      const sn: SimNode[] = data.nodes.map((n, i) => {
        const angle = (2 * Math.PI * i) / data.nodes.length
        const radius = Math.min(W, H) * 0.35
        return { ...n, x: W / 2 + radius * Math.cos(angle), y: H / 2 + radius * Math.sin(angle), vx: 0, vy: 0 }
      })
      runForceLayout(sn, data.edges, W, H, 260)
      const im: Record<number, number> = {}
      sn.forEach((n, i) => { im[n.id] = i })
      setSimNodes(sn)
      setIdxMap(im)
      setSimulating(false)
    }, 50)
  }, [data])

  // Redraw whenever state changes
  useEffect(() => {
    if (!simNodes || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    drawGraph(ctx, simNodes, data.edges, idxMap, W, H, hovered, selected, dpr)
  }, [simNodes, data.edges, idxMap, hovered, selected])

  // Mouse tracking
  const findNode = useCallback((ex: number, ey: number): SimNode | null => {
    if (!simNodes || !canvasRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const mx = (ex - rect.left) * scaleX
    const my = (ey - rect.top) * scaleY
    const maxCostar = Math.max(...simNodes.map(n => n.costar_count)) || 1
    let best: SimNode | null = null, bestDist = 30
    for (const n of simNodes) {
      const r = 4 + (n.costar_count / maxCostar) * 16
      const d = Math.hypot(n.x - mx, n.y - my)
      if (d < r + 4 && d < bestDist) { best = n; bestDist = d }
    }
    return best
  }, [simNodes])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const node = findNode(e.clientX, e.clientY)
    setHovered(node?.id ?? null)
    setTooltip(node ? { node, x: e.clientX, y: e.clientY } : null)
  }, [findNode])

  const onMouseLeave = useCallback(() => { setHovered(null); setTooltip(null) }, [])

  const onClick = useCallback((e: React.MouseEvent) => {
    const node = findNode(e.clientX, e.clientY)
    setSelected(prev => prev === node?.id ? null : (node?.id ?? null))
  }, [findNode])

  const industryStats = Object.entries(
    data.nodes.reduce<Record<string, number>>((acc, n) => {
      const k = n.industry in IND_COLOR && n.industry !== 'Unknown' ? n.industry : 'Other'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})
  ).filter(([k]) => k !== 'Other').sort((a, b) => b[1] - a[1])

  return (
    <div className="glass rounded-3xl p-6 sm:p-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🌐</span>
            <h2 className="text-white font-bold text-lg">Cinema Universe</h2>
          </div>
          <p className="text-white/40 text-sm">
            {data.nodes.length} actors · {data.edges.length} collaboration edges · hover or click to explore
          </p>
        </div>
        {/* Industry breakdown pills */}
        <div className="hidden sm:flex gap-2 flex-wrap justify-end">
          {industryStats.map(([ind, cnt]) => (
            <div key={ind} className="flex items-center gap-1.5 text-xs text-white/60 px-2 py-1 rounded-full"
              style={{ background: (IND_COLOR[ind] ?? '#666') + '22', border: `1px solid ${(IND_COLOR[ind] ?? '#666')}44` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: IND_COLOR[ind] ?? '#666' }} />
              {ind} ({cnt})
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative mt-4 rounded-2xl overflow-hidden" style={{ background: '#0d0d1a' }}>
        {simulating ? (
          <div className="flex items-center justify-center" style={{ height: H }}>
            <div className="text-center text-white/30">
              <div className="text-3xl mb-3">⚡</div>
              <p className="text-sm">Simulating force layout…</p>
              <p className="text-xs mt-1 text-white/20">Placing {data.nodes.length} actors in space</p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: hovered ? 'pointer' : 'default', maxWidth: '100%' }}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
            onClick={onClick}
          />
        )}
        {tooltip && <Tooltip node={tooltip.node} x={tooltip.x} y={tooltip.y} />}
        {selected && (
          <button
            onClick={() => setSelected(null)}
            className="absolute top-3 right-3 text-xs px-3 py-1.5 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/15 transition-all"
          >
            Clear selection
          </button>
        )}
      </div>
      <GraphLegend />
    </div>
  )
}
