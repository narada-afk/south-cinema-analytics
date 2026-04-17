'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, capture } from '@/lib/posthog'
import { trackPageView } from '@/lib/analytics'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  // Initialise PostHog once
  useEffect(() => { void initPostHog() }, [])

  // Fire pageview to BOTH PostHog and GA4 on every SPA route change
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    void capture('$pageview', { $current_url: url })
    trackPageView(url)
  }, [pathname, searchParams])

  return <>{children}</>
}
