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
import { trackEvent, trackActorView, trackCompare } from '@/lib/analytics'

interface Props {
  event: string
  props?: Record<string, unknown>
}

export default function TrackEvent({ event, props }: Props) {
  useEffect(() => {
    // PostHog
    void capture(event, props)

    // GA4 — map known event names to typed helpers; fall back to generic trackEvent
    if (event === 'actor_viewed') {
      trackActorView(
        props?.actor_name as string,
        props?.actor_id   as number | undefined,
        props?.industry   as string | undefined,
      )
    } else if (event === 'compare_used') {
      trackCompare(props?.actor1 as string, props?.actor2 as string)
    } else {
      trackEvent(event, props)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
