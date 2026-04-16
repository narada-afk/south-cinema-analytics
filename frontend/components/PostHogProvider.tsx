'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, capture } from '@/lib/posthog'

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initialise once
  useEffect(() => { void initPostHog() }, [])

  // Manual pageview on every route change
  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    void capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return <>{children}</>
}
