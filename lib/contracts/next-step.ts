/**
 * (Contracts on the move, P-01 · Q-07 — his "please check and built accordingly" 2026-10-22) The Contract screen's one line and one primary
 * per state, pure and client-safe — the quote's model (lib/quotes/next-step.ts) on the contract's states. Q-07's map, as picked:
 * Draft → Send · Sent to Client → Remind (Send again once the link expired) · Signed → Move to Won while the lead is not Won, else Download
 * signed copy. `linkState`'s facts and `awaitingLine`'s words (lib/contracts/model.ts) give the sentence; everything else lives behind ⋮.
 */
import { ago } from '@/lib/templates/ago'
import { contractStatusLabel } from './status-words'
import { linkLife } from './link'
import { displayDate } from '@/lib/format'

export type ContractPrimary = 'send' | 'remind' | 'resend' | 'won' | 'download'
export type ContractNext = {
  /** The one filled button — null when nothing is this member's to do (a letter sent to read, a Signed contract on a Won lead with no copy to fetch). */
  primary: ContractPrimary | null
  /** The button's words. */
  label: string | null
  /** The line itself, after its lead-in ("Next:" — none for a state that reads where it stands). */
  text: string
  /** "Next" while something is still to do; null for a state that is reported, not asked for. */
  lead: 'Next' | null
  /** The state's longer words (the desk's banner), one tap further. */
  more: string | null
  /** The line's glyph, by state. */
  icon: string
}

export type ContractFacts = {
  status: string
  /** The recipient's first name. */
  clientFirst: string
  /** (S44R, C9) a letter sent to read and keep — nothing to sign */
  toRead: boolean
  /** an uploaded PDF — the client reads the file on the link and signs under it */
  uploaded: boolean
  /** Send's first blocking check (lib/contracts/readiness.ts), in the screen's words — null when it can go. */
  blocker: string | null
  sentAt: number | null
  viewedAt: number | null
  expiresAt: number | null
  signedAt: number | null
  /** The name the client typed online; null = the studio marked it signed. */
  signedBy: string | null
  /** The quote it names, when one is. */
  quoteNumber: string | null
  /** The lead's stage — a signed contract offers Move to Won until the lead is there. */
  leadStage: string | null
  /** Sent together with other documents on one link. */
  bundled: boolean
  /** The studio's Signing links window, for the words a resend says. */
  linkDays: number
}

/** "sent 3d ago" · "sent on 12 Sep ’26" — a span reads "… ago", a date "on …" (the quote's rule, fix-G G-13). */
const when = (at: number | null, now: number): string => {
  if (!at) return ''
  const s = ago(at, now)
  return /ago$|^just now$/.test(s) ? ` ${s}` : ` on ${s}`
}
const lower = (s: string) => `${s.charAt(0).toLowerCase()}${s.slice(1)}`

export function contractNextStep(f: ContractFacts, now: number): ContractNext {
  const first = f.clientFirst || 'the client'
  if (f.status === 'Draft') {
    if (f.blocker) return { primary: 'send', label: 'Send', lead: 'Next', icon: 'edit', text: `${lower(f.blocker)}.`, more: null }
    if (f.toRead) return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: `send the letter to ${first} — they read and keep it; there is nothing to sign.`, more: null }
    if (f.uploaded) return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: `send the PDF to ${first} for signature — they read it on the link and sign under it.`, more: `Copy signing link sends it too: the contract waits for a signature once the link is on your clipboard.` }
    return { primary: 'send', label: 'Send', lead: 'Next', icon: 'send', text: `send it to ${first} for signature — the client signature box is in place.`, more: `Copy signing link sends it too: the contract waits for a signature once the link is on your clipboard.` }
  }
  if (f.status === 'Sent to Client') {
    const seen = f.viewedAt ? `opened ${ago(f.viewedAt, now)}` : 'not opened yet'
    if (f.toRead) return { primary: null, label: null, lead: null, icon: 'send', text: `Sent to ${first} to read and keep${f.sentAt ? `, ${ago(f.sentAt, now)}` : ''} · ${seen}. There is nothing for them to sign.`, more: 'Edits reach their page when it next opens.' }
    const life = linkLife({ status: f.status, signExpiresAt: f.expiresAt ? new Date(f.expiresAt) : null }, now)
    if (life?.state === 'expired') {
      return { primary: 'resend', label: 'Send again', lead: 'Next', icon: 'schedule', text: `the link closed on ${displayDate(life.until)} — send it again so ${first} can sign.`, more: `${first} can’t sign until you send it again; a new link opens for ${f.linkDays} days from then.${f.bundled ? ' Every document sent together opens on it.' : ''}` }
    }
    const window = life ? (life.short.startsWith('Link ') ? lower(life.short) : `link ${lower(life.short)}`) : null
    const bits = [`sent${when(f.sentAt, now)}`.trim(), seen, window].filter(Boolean)
    return { primary: 'remind', label: 'Remind', lead: null, icon: 'hourglass_top', text: `With ${first} for signature${f.bundled ? ' (sent together)' : ''} — ${bits.join(' · ')}.`,
      more: `A reminder goes on WhatsApp with the same link. Edits reach their page when it next opens; if it is open, they are asked to read the new text before they can sign.` }
  }
  if (f.status === 'Signed') {
    const who = f.signedBy ? `by ${f.signedBy} online` : '· marked by the studio'   // (landing) "Signed 2d ago · marked by the studio" — a day and a hand need the house separator; "Signed on 22 Sep ’26 by Ryan online" reads on its own
    const open = f.leadStage && f.leadStage !== 'Won' && f.leadStage !== 'Lost'
    const bits = [`Signed${when(f.signedAt, now)} ${who}`, f.quoteNumber ? `${f.quoteNumber} is signed through it` : null, open ? `the lead is still in ${f.leadStage}` : null].filter(Boolean)
    const more = f.signedBy ? 'This is the copy they signed, kept as it was — it stays signed; duplicate it to change the terms.' : 'This copy is locked. An Owner or Admin can undo the signing from the status menu.'   /* (the calm UI build 2026-10-27, 4-51) */
    if (open) return { primary: 'won', label: 'Move to Won', lead: null, icon: 'lock', text: `${bits.join(' · ')}.`, more }
    return { primary: 'download', label: 'Download signed copy', lead: null, icon: 'lock', text: `${bits.join(' · ')}.`, more }
  }
  return { primary: null, label: null, lead: null, icon: 'info', text: `${contractStatusLabel(f.status)}.`, more: null }
}

/** The Contract screen's Activity fold: what the record itself holds, newest first — honest data, no event log read (lib/leads/activity.ts stays the lead's). */
export type ContractMoment = { at: number; text: string }
export function contractTimeline(c: { createdAt: number | null; createdByName: string | null; sentAt: number | null; sentByName?: string | null; recipient: string; viewedAt: number | null; acceptedAt: number | null; signedAt: number | null; signedBy: string | null; markedByName?: string | null; caseTrustAt?: number | null; toRead: boolean; /** (the calm UI build 2026-10-27, 4-11) the header's "From template" tag left; the record's first line says it */ fromTemplate?: boolean }): ContractMoment[] {
  const out: ContractMoment[] = []
  if (c.createdAt) out.push({ at: c.createdAt, text: `${c.createdByName ? `Created by ${c.createdByName}` : 'Created'}${c.fromTemplate ? ' from a template' : ''}` })
  if (c.sentAt) out.push({ at: c.sentAt, text: `${c.toRead ? 'Sent' : 'Sent for signature'} to ${c.recipient}${c.sentByName ? ` by ${c.sentByName}` : ''}` })
  if (c.viewedAt) out.push({ at: c.viewedAt, text: `${c.recipient} opened the link` })
  if (c.caseTrustAt) out.push({ at: c.caseTrustAt, text: `${c.recipient} ticked the CaseTrust disclosure` })
  if (c.acceptedAt) out.push({ at: c.acceptedAt, text: `${c.recipient} ticked the words` })
  if (c.signedAt) out.push({ at: c.signedAt, text: c.signedBy ? `Signed by ${c.signedBy} online` : `Marked signed${c.markedByName ? ` by ${c.markedByName}` : ' by the studio'}` })
  return out.map((m, i) => ({ m, i })).sort((a, b) => b.m.at - a.m.at || b.i - a.i).map((x) => x.m)   // newest first; at the same moment the later step (a signing) above the earlier (its creation)
}
