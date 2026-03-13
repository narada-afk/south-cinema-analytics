'use client'

/**
 * StatsSearchClient
 * Thin 'use client' wrapper for StatsSearchBar.
 * When an actor is selected, we navigate to /stats?actor=<id>
 * so the Server Component re-renders with that actor's career data.
 * Keyword chips just scroll to the relevant section.
 */

import { useRouter } from 'next/navigation'
import StatsSearchBar from './StatsSearchBar'
import type { Actor } from '@/lib/api'

export default function StatsSearchClient() {
  const router = useRouter()

  function handleActorSelect(actor: Actor) {
    router.push(`/stats?actor=${actor.id}`)
  }

  return <StatsSearchBar onActorSelect={handleActorSelect} />
}
