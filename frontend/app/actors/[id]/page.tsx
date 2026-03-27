// Legacy numeric ID URLs → redirect to name-based slugs
import { redirect, notFound } from 'next/navigation'
import { getActor } from '@/lib/api'

interface PageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export default async function ActorIdRedirect({ params }: PageProps) {
  // Only redirect numeric IDs; non-numeric paths shouldn't reach here
  if (!/^\d+$/.test(params.id)) notFound()

  const actor = await getActor(params.id).catch(() => null)
  if (!actor) notFound()

  const slug = actor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  redirect(`/actors/${slug}`)
}
