import { redirect } from 'next/navigation'
import { loginPath } from '@/lib/portal/model'
import { currentPortalSlug } from '@/lib/portal/queries'

export const dynamic = 'force-dynamic'

/** (pending modules S02 — D-11) 1.0's `/my/login` signpost: the studio's own sign-in (the prototype holds one studio). */
export default async function OldPortalLogin() {
  redirect(loginPath(await currentPortalSlug()))
}
