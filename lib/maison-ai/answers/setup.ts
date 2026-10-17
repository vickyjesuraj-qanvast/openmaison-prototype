import 'server-only'
import { fetchSetupFacts } from '@/lib/studio-setup/queries'
import { SETUP_HREF, SETUP_RULE, setupRows } from '@/lib/studio-setup/model'
import type { MaisonAnswer } from '@/lib/maison-ai'
import { go, plural, row, type Ctx } from './common'
import { fetchListingRead } from '@/lib/qanvast-listing/queries'   // (pending modules S37)
import { LISTING_WORDS } from '@/lib/qanvast-listing/model'
import { displayDate } from '@/lib/format'

/** (pending modules S10 — the steps' note after S08: "What's left to set up?" from `setupRows(fetchSetupFacts())`) Settings › Studio's Set up
    your studio, as it stands — the open steps first, each opening where it is done; Owners and Admins only (its own rule). */
export async function setupAnswer(c: Ctx): Promise<MaisonAnswer> {
  if (!c.runs) return { title: 'Owners and Admins only', text: `${SETUP_RULE} — Settings › Roles & access.` }   // (pending modules S14) the module's name
  const rows = setupRows(await fetchSetupFacts())
  const open = rows.filter((r) => !r.done)
  const link = { label: 'Open Set up your studio', href: go(c, SETUP_HREF) }
  if (!open.length) return { title: 'Everything is set up', text: `All ${rows.length} steps are done — every document prints your details, and clients and leads can reach you.`, link }
  return { title: `${plural(open.length, 'step')} left to set up`, text: `${rows.length - open.length} of ${rows.length} done. Open one to do it on its own page.`,
    rows: open.map((r) => row(c, r.key, r.label, r.line, `${r.home.href}${r.home.hash ? `#${r.home.hash}` : ''}`)), link }
}

/** (pending modules S37) "Are we listed on Qanvast?" — the listing as Company › Profile keeps it: listed (since when), waiting (since when),
    Qanvast's ask for changes (its note), or not applied — with the door to the card. Everyone may ask; Owners and Admins apply. */
export async function listingAnswer(c: Ctx): Promise<MaisonAnswer> {
  const r = await fetchListingRead()
  /* Accounting keeps the books — Company › Profile isn't theirs to open (lib/settings/roles.ts), so their answer carries no door */
  const link = c.acct ? undefined : { label: r.state === 'not_applied' && c.runs ? LISTING_WORDS.apply : 'Open Listed on Qanvast', href: go(c, '/company/profile#qanvast') }
  const day = (ms: number | null | undefined) => (ms ? displayDate(new Date(ms)) : '')
  const played = (via: string | null | undefined) => (via === 'demo' ? ' (played in the demo)' : '')
  if (r.listed) {
    const since = r.listed.kind === 'outside' ? 'Listed before the studio used OpenMaison.' : `Listed since ${day(r.since)}${played(r.listed.via)}.`
    const more = r.pending ? ` Changes sent on ${day(r.pending.submittedAt)} are waiting for Qanvast’s review.` : r.asked ? ` Qanvast asked for changes to the last update: “${r.asked.note ?? ''}”` : ''
    return { title: 'Yes — the studio is listed on Qanvast', text: `${since}${more}`, ...(link ? { link } : {}) }
  }
  if (r.pending) return { title: 'Waiting for Qanvast', text: `The application went on ${day(r.pending.submittedAt)}${r.pending.submittedBy ? ` from ${r.pending.submittedBy}` : ''}. Qanvast usually answers within 3–5 working days.`, ...(link ? { link } : {}) }
  if (r.asked) return { title: 'Qanvast asks for changes', text: `On ${day(r.asked.reviewedAt)}${played(r.asked.via)}: “${r.asked.note ?? 'see the application'}”${c.runs ? ' Fix it and send it again on Company › Profile.' : ''}`, ...(link ? { link } : {}) }
  return { title: 'Not listed on Qanvast yet', text: c.runs ? 'Apply on Company › Profile — the application is made from your studio’s records; you add a description and your proof.' : 'An Owner or an Admin applies on Company › Profile.', ...(link ? { link } : {}) }
}
