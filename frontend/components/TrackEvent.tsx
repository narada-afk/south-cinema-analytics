'use client'

/**
 * TrackEvent — fire-and-forget analytics for Server Component pages.
 *
 * Usage (in a Server Component):
 *   <TrackEvent event="actor_viewed" props={{ actor_name: actor.name, actor_id: actor.id }} />
 *
 * Renders nothing; fires once on mount.
 */

import { useEffect } from 'react'
import { capture } from '@/lib/posthog'

interface Props {
  event: string
  props?: Record<string, unknown>
}

export default function TrackEvent({ event, props }: Props) {
  useEffect(() => {
    void capture(event, props)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
