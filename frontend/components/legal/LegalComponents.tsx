import type { ReactNode } from 'react'
import Link from 'next/link'

// ── Prose wrapper ─────────────────────────────────────────────────────────────

export function LegalDoc({ children }: { children: ReactNode }) {
  return (
    <div className="text-white/65 text-sm leading-relaxed">
      {children}
    </div>
  )
}

// ── Section with heading ──────────────────────────────────────────────────────

export function Section({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-8">
      <h2 className="text-[15px] font-semibold text-white mb-3 pb-2 border-b border-white/10">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// ── Data table ────────────────────────────────────────────────────────────────

export function LegalTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <div className="overflow-x-auto mt-3 rounded-lg border border-white/10">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-white/[0.05]">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left text-white/80 font-semibold py-2.5 px-4 first:rounded-tl-lg last:rounded-tr-lg"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? '' : 'bg-white/[0.02]'}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="py-2.5 px-4 border-t border-white/[0.06] text-white/60 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── List ──────────────────────────────────────────────────────────────────────

export function LegalList({
  items,
  ordered = false,
}: {
  items: ReactNode[]
  ordered?: boolean
}) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`mt-2 space-y-2 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
      {items.map((item, i) => (
        <li key={i} className="text-white/60 leading-relaxed">
          {item}
        </li>
      ))}
    </Tag>
  )
}

// ── Callout box ───────────────────────────────────────────────────────────────

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 px-4 py-3 rounded-lg border border-white/10 bg-white/[0.04] text-white/60 text-xs leading-relaxed">
      {children}
    </div>
  )
}

// ── Subtle warning ────────────────────────────────────────────────────────────

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] text-amber-200/70 text-xs leading-relaxed">
      {children}
    </div>
  )
}

// ── Inter-page nav ────────────────────────────────────────────────────────────

export function LegalNav({ current }: { current: 'terms' | 'privacy' | 'copyright' }) {
  const links = [
    { href: '/terms',     label: 'Terms of Use'     },
    { href: '/privacy',   label: 'Privacy Policy'   },
    { href: '/copyright', label: 'Copyright Policy' },
  ]
  return (
    <nav className="flex flex-wrap gap-2 mb-10" aria-label="Legal pages">
      <Link
        href="/"
        className="px-3 py-1 rounded-full text-xs font-medium bg-white/5
                   text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors"
      >
        ← Home
      </Link>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            href === `/${current}`
              ? 'bg-white/15 text-white'
              : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/8'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
