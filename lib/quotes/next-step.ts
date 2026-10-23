/**
 * (Quotes on the move, P-01 · Q-07 — his "please go ahead" 2026-10-22) The Quote screen's one line and one primary per state, pure and
 * client-safe: what this quote needs next, said in a sentence, and the one filled button that does it. Q-07's map, as picked:
 * Draft → Send ▾ · Sent for Approval → Approve (an approver) / nothing · Approved → Send ▾ · Sent to Client → Remind · Confirmed → Send for
 * signature · Signed → Open contract (or Move to Won when there is none) · Expired → Revise. A variation order follows the same map in its own
 * words (it is approved on its link, never signed — REG-1066). Everything else lives behind ⋮.
 */
import { ago } from '@/lib/templates/ago'

export type NextPrimary = 'send' | 'approve' | 'remind' | 'signature' | 'contract' | 'won' | 'revise'
export type NextStep = {
  /** The one filled button — null when nothing is this member's to do (someone else approves, the lead is Won). */
  primary: NextPrimary | null
  /** The button's words. */
  label: string | null
  /** The line itself, after its lead-in ("Next:" — none for a state that is finished). */
  text: string
  /** "Next" while something is still to do; null for a finished state. */
  lead: 'Next' | null
  /** The state's longer words (the desk's banner), one tap further. */
  more: string | null
  /** The line's glyph, by state. */
  icon: string
}

export type QuoteFacts = {
  status: string
  variation: boolean
  version: number
  approval: string
  canApprove: boolean
  /** The client's first name. */
  clientFirst: string
  /** The validity has passed while the client holds it (lib/quotes/policy.ts `validityPassed`), as the date reads. */
  validityEnded: string | null
  /** When it went to the client (Sent to Client), was confirmed, or was signed — for "sent 3d ago". */
  at: number | null
  /** The client opened their link since it went out (pending modules S04). */
  opened: { at: number; count: number } | null
  /** Waiting for approval: who sent it and when. */
  waiting: { by: string | null; at: number | null } | null
  /** Sent back with a note, until the next send (REG-624). */
  changes: { by: string | null; at: number; note: string } | null
  confirmedBy: string | null
  /** Confirmed by hand from a status menu: who marked it (S44F — NB-04). */
  markedBy: string | null
  /** A contract raised from this quote. */
  contract: { title: string; status: string } | null
  /** The lead's stage — a signed quote on a lead not yet Won offers the move. */
  leadStage: string | null
  /** The total as signed, when today's edits moved the total away from it (pending modules S03). */
  signedTotal: string | null
}

/** "sent 3d ago" · "sent on 12 Sep ’26" — a date reads "on …", a span "… ago" (fix-G, G-13). */
const when = (at: number | null, now: number): string => {
  if (!at) return ''
  const s = ago(at, now)
  return /ago$|^just now$/.test(s) ? ` ${s}` : ` on ${s}`
}
const timesWord = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`)

export function nextStep(f: QuoteFacts, now: number): NextStep {
  const noun = f.variation ? 'variation order' : 'quote'
  const first = f.clientFirst || 'the client'
  const clientWays = f.variation ? `send it to ${first} for approval on its link.` : `send it to ${first} for confirmation, or with the T&Cs for signature.`
  if (f.status === 'Draft') {
    const needsApprover = f.approval === 'required' && !f.canApprove
    if (f.changes) {
      const by = f.changes.by ?? 'The approver'
      return { primary: 'send', label: 'Send', lead: 'Next', icon: 'edit', text: `${by} asked for changes${when(f.changes.at, now)} — “${f.changes.note}”. Send it again when it’s ready.`, more: null }
    }
    if (needsApprover) return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: `send it for approval — an Owner or an Admin checks it before it goes to ${first}.`, more: null }
    return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: f.version > 1 ? `version ${f.version} is a draft again — ${clientWays}` : clientWays, more: null }
  }
  if (f.status === 'Sent for Approval') {
    const by = f.waiting?.by ?? 'A designer'
    const sent = `${by} sent it for approval${when(f.waiting?.at ?? null, now)}.`
    if (f.canApprove) return { primary: 'approve', label: 'Approve', lead: 'Next', icon: 'approval', text: `${sent} Approve it, or request changes from ⋮.`, more: null }
    return { primary: null, label: null, lead: null, icon: 'approval', text: `${sent} Waiting for an Owner, an Admin or the backup approver.`, more: null }
  }
  /* (landing fix 2026-10-22, REG-2601 — the Contracts audit's C-21) a contract raised from this quote and already with the client for
     signature is the live path: the line says where it stands and the primary opens it — never a second "Send for signature" while the
     first is out. A contract still in Draft leaves the quote's own map in place (the desk's Contract chip names it; P-11 of the Contracts page). */
  if (f.contract && f.contract.status === 'Sent to Client' && !f.variation && (f.status === 'Approved' || f.status === 'Sent to Client' || f.status === 'Confirmed')) {
    return { primary: 'contract', label: 'Open contract', lead: 'Next', icon: 'draw', text: `${f.contract.title} is with ${first} for signature — open it to see whether it was opened, or to remind.`, more: `The quote is ${f.status.toLowerCase()}; the agreement carries the signing now. Sending for signature again would raise a second contract.` }
  }
  if (f.status === 'Approved') return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: `approved — ${clientWays}`, more: null }
  if (f.status === 'Sent to Client') {
    const seen = f.opened ? `, opened ${timesWord(f.opened.count)} (last ${ago(f.opened.at, now)})` : ''
    const more = `${first} has version ${f.version} on their link. Edits here change what they see; to change the ${noun} and keep what they saw, revise it from ⋮.`
    if (f.validityEnded) return { primary: 'revise', label: 'Revise', lead: 'Next', icon: 'event', text: `its validity ended on ${f.validityEnded} while ${first} has it — revise it, or extend Valid until if the price still stands.`, more }
    return { primary: 'remind', label: 'Remind', lead: 'Next', icon: 'hourglass_top', text: `sent${when(f.at, now)}${seen} — waiting for ${first} to ${f.variation ? 'approve the change' : 'confirm'}. A reminder goes on WhatsApp.`, more }
  }
  if (f.status === 'Confirmed') {
    const did = f.variation ? 'approved' : 'confirmed'
    const who = f.markedBy ? `Marked ${did} by ${f.markedBy}` : `${f.confirmedBy ?? first} ${did} version ${f.version}`
    if (f.variation) return { primary: null, label: null, lead: null, icon: 'task_alt', text: `${who}${when(f.at, now)} — the contract value has moved.`, more: `To change it, revise from ⋮ — this version stays as it was approved.` }
    return { primary: 'signature', label: 'Send for signature', lead: 'Next', icon: 'draw', text: `${who}${when(f.at, now)} — send the agreement with the T&Cs for signature.`, more: `To change the quote, revise from ⋮ — this version stays as they confirmed it.` }
  }
  if (f.status === 'Signed') {
    const signed = `signed${when(f.at, now)} — version ${f.version} is the agreed quote`
    const more = f.signedTotal ? `The client signed for ${f.signedTotal} — edits here don’t change the contract; a change after signing is a variation order.` : 'To change it, revise from ⋮ — this version stays as signed.'
    if (f.contract) return { primary: 'contract', label: 'Open contract', lead: 'Next', icon: 'contract', text: `${signed}. The signed copy is on ${f.contract.title}.`, more }
    if (f.leadStage && f.leadStage !== 'Won' && f.leadStage !== 'Lost') return { primary: 'won', label: 'Move to Won', lead: 'Next', icon: 'task_alt', text: `${signed}. Move ${first}’s lead to Won to start the project.`, more }
    return { primary: null, label: null, lead: null, icon: 'lock', text: `${signed[0]!.toUpperCase()}${signed.slice(1)}.`, more }
  }
  return { primary: null, label: null, lead: null, icon: 'info', text: `${f.status}.`, more: null }
}

/** (P-01 · Q-07) The reminder's WhatsApp draft — a nudge with the same link, nothing changes on the quote (invented copy, the confirmation draft as its model). */
export function reminderMessage(o: { clientFirst: string; studio: string; number: string; link: string; variation: boolean; validUntil: string | null }): string {
  const what = o.variation ? `variation order ${o.number}` : `quote ${o.number}`
  const until = o.validUntil ? ` It stands until ${o.validUntil}.` : ''
  return `Hi ${o.clientFirst}, a gentle reminder on ${what} from ${o.studio}: ${o.link}${until}\n\nDo let me know if anything needs a change — happy to go through it with you.`
}
