import 'server-only'
import { isMarketing, ON_DESK } from '@/lib/settings/roles'
import { refuse, type Refusal } from '@/lib/company/template-rules'
import { roleNow } from '@/lib/settings/desk'   // (S45C) one role read per request, shared with the workspace's rule

/**
 * (S44Z — S44O's note to the developers; as recommended — his ask 2026-10-15) THE QUOTE AND CONTRACT EDITORS' ROLE RULE ON THE SERVER.
 * Their pages answer a Marketing member with the house gate before a record is read (S44O); their server actions trusted that gate, as they
 * did for Accounting, so a call made by hand was refused only where an action asked the role. Now the editors' actions ask here:
 *
 *   · every studio action of app/quotes/* and app/contracts/* answers `deskRefusal()` first — `{ error: ON_DESK }`, the house refusal in
 *     the role's own words (lib/settings/roles.ts) — before a quote, a line, a payment, a text, a file link, a comment or a contract is read
 *     or written; the lists they load for a picker or a reload answer nothing (`listQuoteItems`' rule under Who sees leads, S41b-1);
 *   · their shared loaders (`quoteOf` · `itemOf` · `load` · `rowOf` …) call `keepOffDesk()`, so an action added later is refused even before
 *     it learns its first line.
 *
 * Marketing only: Accounting keeps the reads its own pages make (a quote's Preview, the money papers — each with its own gate), and the
 * client's own pages (the confirmation link, the signing link, the view-only link) never ask a role — a client has none. The role is read
 * once per request (React's `cache`), from this browser's member (lib/db/session.ts).
 */
/** The editors' refusal for the signed-in member — ON_DESK's words for Marketing — else null. An action's first line answers it. */
export async function deskRefusal(): Promise<Refusal | null> {
  return isMarketing(await roleNow()) ? refuse(ON_DESK) : null
}

/** Whether the signed-in member's role keeps off the editors (Marketing) — for an action whose answer is a list: it answers nothing. */
export async function offDesk(): Promise<boolean> {
  return !!(await deskRefusal())
}

/** A loader's backstop: throws the rule before a record is read, so no action — one added later included — reads or writes for Marketing. */
export async function keepOffDesk(): Promise<void> {
  const no = await deskRefusal()
  if (no) throw new Error(no.error)
}
