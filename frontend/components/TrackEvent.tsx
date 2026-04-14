'use client'

import { useEffect } from 'react'

interface TrackEventProps {
  event: string
  props?: Record<string, unknown>
}

export default function TrackEvent({ event, props }: TrackEventProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).posthog) {
      ;(window as any).posthog.capture(event, props)
    }
  }, [event, props])

  return null
}
