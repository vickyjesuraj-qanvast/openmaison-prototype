'use server'

import { recordAsk } from '@/lib/portal/ask'   // (parity map, CP-110)
import { revalidateLead } from '@/lib/leads/queries'

/*
 * (REG-609, parity Q-22) Ask the client › Send leaves a record — the link's stamps, read back as "Asked on" and as Activity lines.
 * WhatsApp still opens on the press: the platform's own send is not the prototype's to make. (pending modules S02) The old
 * `invitePortal` — Invite to Portal's Send, with 1.0's *Show chat history* (H-Q16 dropped it, REG-1327) — had no caller since the
 * Client access panel took the invite (`inviteClient`, app/portal/studio-actions.ts); it is gone with its unmounted modal.
 */
/** The quick ask with no list (every question): (gaps build D, item 9) 1.0's five minutes between asks; (parity map, CP-110) the client told —
    the portal's bell, `client_questions` — and invited by the ask when they never were (lib/portal/ask.ts `recordAsk`). */
export async function askClient(leadId: string): Promise<void | { error: string }> {
  const r = await recordAsk(leadId, null)   /* (REG-613) the Activity line inside */
  if ('error' in r) return r
  revalidateLead(leadId)
}
