/**
 * (simplify S-17 · S-18 · S-19 · P2 §6.8 — the owner's "build everything", 2026-10-09; contract D between the packages) Telling the client:
 * the WhatsApp draft each of the project's moments ends with — Start (the invite and the deposit in ONE message), Mark {stage} done, a hold
 * and its resume, the handover. Pure and client-safe: the sheets, the Resume snackbar (the frame's) and the server's answers read the same
 * words. WhatsApp opens on the press, never later (REG-534 — `pendingWindow` in components/portal/wa-window.ts when the press waits on the
 * server); the platform's own send stays the developers' (Q-41). Never "OpenMaison" in a message — the portal wears the studio's name.
 * All of it is invented copy (Q-12), logged with the round.
 */
import { inviteMessage, waLink as portalWaLink } from '@/lib/portal/model'

export type TellKind = 'start' | 'done' | 'hold' | 'resume' | 'handover'

/** What a message knows. Days are ms (local midnight is fine); amounts are already in words ("S$4,860.00"). */
export type TellFacts = {
  /** The client's name — the message greets them by their first name. */
  client: string
  /** The studio's name as the portal wears it. */
  studio: string
  /** The client's page (absolute) — null when they hold no portal access. */
  url?: string | null
  /* start */
  /** Works start on this day. */
  start?: number | null
  /** The invite rides in this message (the Start sheet's ☑ Invite). */
  invite?: boolean
  /** The deposit (or any stage) invoice that went with the press. */
  invoice?: { stage: string; amount: string; number?: string | null; due?: string | null; link?: string | null } | null
  /* done */
  milestone?: string | null
  /** The client is asked to confirm the stage on their page. */
  confirm?: boolean
  /** Photos went out as an update. */
  photos?: boolean
  /* hold */
  reason?: string | null
  /** The day it should pick up again (ms) — null = not known yet. */
  until?: number | null
}

const firstOf = (name: string) => name.trim().split(/\s+/)[0] ?? name
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
/** "Mon 12 Oct" — the schedule's own day words. */
export const tellDay = (ms: number): string => { const d = new Date(ms); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}` }
const trimEnd = (s: string) => s.trim().replace(/[.!?]+$/, '')

/** The invoice's line inside a message that already carries the client's page. */
function invoiceLine(i: NonNullable<TellFacts['invoice']>, onPage: boolean): string {
  const what = i.number ? `invoice ${i.number}` : `the ${i.stage.toLowerCase()} invoice`
  const due = i.due ? `, due ${i.due}` : ''
  if (onPage) return `Your ${i.stage.toLowerCase()} payment — ${what}, ${i.amount}${due} — is on your page too, with how to pay.`
  return `Here is ${what} for the ${i.stage.toLowerCase()} payment: ${i.amount}${due}.${i.link ? ` ${i.link}` : ''}`
}

/**
 * The draft for one moment. `start` with `invite` is the invite's own words (the Client access panel's, `inviteMessage`) and the deposit's
 * line; without the invite, the works' start and the invoice. `done` names the stage, the ask to confirm and what went out. `hold` gives
 * the reason and the day it picks up ("We're pausing the works — … We'll pick up around Mon 16 Nov."), `resume` says it runs again,
 * `handover` thanks them and points at their page.
 */
export function tellClientText(kind: TellKind, f: TellFacts): string {
  const first = firstOf(f.client)
  const url = f.url ?? null
  if (kind === 'start') {
    const when = f.start != null ? `Works on your home start ${tellDay(f.start)}.` : 'Works on your home are starting.'
    if (f.invite && url) {
      const invite = inviteMessage({ client: f.client, studio: f.studio, url })
      return [invite, when, f.invoice ? invoiceLine(f.invoice, true) : ''].filter(Boolean).join('\n\n')
    }
    const head = `Hi ${first}, ${f.studio} here. ${when}`
    const money = f.invoice ? invoiceLine(f.invoice, !!url) : ''
    return [head, money, url ? `Everything is on your page: ${url}` : ''].filter(Boolean).join('\n\n')
  }
  if (kind === 'done') {
    const m = f.milestone ? trimEnd(f.milestone) : 'This stage'
    const parts = [`Hi ${first}, ${m} is done.`]
    if (f.photos) parts.push('We’ve posted photos of it on your page.')
    if (f.confirm) parts.push('When you have a moment, please have a look and confirm it on your page — or tell us if something isn’t right.')
    const body = parts.join(' ')
    return [body, f.invoice ? invoiceLine(f.invoice, !!url) : '', url ? `Your page: ${url}` : '', `— ${f.studio}`].filter(Boolean).join('\n\n')
  }
  if (kind === 'hold') {
    const why = f.reason?.trim() ? ` — ${trimEnd(f.reason)}` : ''
    const back = f.until != null ? `We’ll pick up around ${tellDay(f.until)}.` : 'We’ll let you know as soon as we can pick up again.'
    return [`Hi ${first}, we’re pausing the works on your home${why}. ${back}`, url ? `Your page keeps the schedule as it stands: ${url}` : '', `— ${f.studio}`].filter(Boolean).join('\n\n')
  }
  if (kind === 'resume') {
    return [`Hi ${first}, good news — the works on your home are running again.`, url ? `The schedule ahead is on your page: ${url}` : '', `— ${f.studio}`].filter(Boolean).join('\n\n')
  }
  /* handover */
  return [`Hi ${first}, your home has been handed over — thank you for trusting ${f.studio} with it.`, url ? `Everything from the project stays on your page: ${url}` : '', `— ${f.studio}`].filter(Boolean).join('\n\n')
}

/** wa.me with the drafted text — the house helper (lib/portal/model.ts), re-exported so a moment imports one module. */
export const waLink = (phone: string, text: string): string => portalWaLink(phone, text)
