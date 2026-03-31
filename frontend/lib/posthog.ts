/**
 * lib/posthog.ts
 * PostHog singleton for client-side analytics.
 * Import `capture` anywhere in client components.
 *
 * Silently no-ops when NEXT_PUBLIC_POSTHOG_KEY is unset (dev / CI).
 */

let initialised = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ph: any = null

async function loadPostHog() {
  if (ph) return ph
  try {
    const mod = await import('posthog-js')
    ph = mod.default
  } catch {
    // posthog-js not installed — analytics disabled
  }
  return ph
}

export async function initPostHog() {
  if (initialised || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  const posthog = await loadPostHog()
  if (!posthog) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
  })
  initialised = true
}

export async function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  const posthog = await loadPostHog()
  posthog?.capture(event, props)
}
