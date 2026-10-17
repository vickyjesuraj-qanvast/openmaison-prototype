import { redirect } from 'next/navigation'
import { portalPath } from '@/lib/portal/model'
import { currentPortalSlug } from '@/lib/portal/queries'

export const dynamic = 'force-dynamic'

/** `/my` alone — the studio's portal (the prototype holds one studio). */
export default async function MyRoot() {
  redirect(portalPath(await currentPortalSlug()))
}
