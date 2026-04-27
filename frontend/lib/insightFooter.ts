/**
 * insightFooter.ts
 * ────────────────
 * Deterministic cinematic footer phrases for each insight type.
 *
 * Uses a simple hash of the seed string so the phrase is stable across
 * server → client renders (no hydration mismatch from Math.random()).
 */

const PHRASES: Record<string, readonly string[]> = {
  cross_industry: [
    'Across every border',
    'One face, five worlds',
    'Rare crossover run',
  ],
  collab_shock: [
    'Nobody saw this coming',
    'Wait… them?',
    'Unexpected duo',
  ],
  hidden_dominance: [
    'Silent legend',
    'Always there',
    'More than you realised',
  ],
  career_peak: [
    'Golden stretch',
    'Prime years hit different',
    'Era of dominance',
  ],
  network_power: [
    'Connected everywhere',
    'Industry magnet',
    'Everyone knows them',
  ],
  director_loyalty: [
    'Trust built over time',
    'Repeated magic',
    'Some bonds stay',
  ],
  // Legacy types
  collaboration: [
    'They defined an era',
    'South cinema never forgot',
    'An unforgettable pair',
  ],
  director: [
    'Shaped by one vision',
    'Same director, every time',
    'A creative partnership',
  ],
  supporting: [
    'Never the lead. Never forgotten.',
    'Always in the frame',
    'Scene-stealer',
  ],
  director_box_office: [
    'Every release, an event',
    'Box office on repeat',
    'Prints money on screen',
  ],
}

const FALLBACK: readonly string[] = [
  'Cinema is forever',
  'South India remembers',
  'Written in film history',
]

/** djb2-style hash → stable index, no Math.random() */
function stableIndex(seed: string, len: number): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i)
    h = h >>> 0 // keep as unsigned 32-bit
  }
  return h % len
}

/**
 * Returns a cinematic footer phrase for the given insight type.
 *
 * @param type     - insight type key
 * @param seed     - stable seed string (e.g. actor name or headline) for phrase selection
 * @param override - explicit override bypasses the phrase map entirely
 */
export function getInsightFooter(
  type: string,
  seed = '',
  override?: string,
): string {
  if (override) return override
  const list = PHRASES[type] ?? FALLBACK
  return list[stableIndex(seed || type, list.length)]
}
