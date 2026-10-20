'use server'

import { DEMO_STANDING_SESSION } from '@/lib/auth/paths'
import { clearStudioCookies, leaveThisStudio } from '@/lib/auth/session'
import { openStudio, openStudioKey, prototypeStudios } from '@/lib/studios/registry'

/**
 * (pending modules S31 — his "build all of them" 2026-10-11; card onboarding:studio-sign-up) The studio block's Studios group — demo only, as
 * View as is: open another of this prototype's studios (the demo's, or one started here) without a code. This browser leaves the open studio
 * (its session there ends) and becomes the other's own session — signed in as whoever that studio was last used as (its Owner, after
 * signing up). A real build has no such switch (`DEMO_STANDING_SESSION` false): a member signs in to their studio.
 */
export async function openPrototypeStudio(key: string): Promise<{ error: string } | { to: string; name: string }> {
  if (!DEMO_STANDING_SESSION) return { error: 'Sign in to your studio with its number' }
  const all = await prototypeStudios()
  const s = all.find((x) => x.key === key)
  if (!s) return { error: 'That studio is no longer on this prototype' }
  if (key === openStudioKey()) return { to: '/', name: s.name }
  await leaveThisStudio()
  if (!(await openStudio(key))) return { error: 'That studio is no longer on this prototype' }
  await clearStudioCookies()   // this browser is the studio's own session now (the demo's rule, DEMO_STANDING_SESSION)
  /* no revalidatePath: the page loads in full next (a new document — nothing cached of the studio before), and a refresh in place would draw
     the other studio's records under the old page for a moment (and take the sentence meant for the new one) */
  return { to: '/', name: s.name }
}
