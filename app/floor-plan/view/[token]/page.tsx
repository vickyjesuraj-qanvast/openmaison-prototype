import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's shared 3D floor plan (`/floor-plan/view/<token>`): 2.0's 3D layout link — a port keeps the share's token. */
export default async function OldFloorPlanView({ params }: { params: Promise<{ token: string }> }) {
  redirect(`/space/${encodeURIComponent((await params).token)}`)
}
