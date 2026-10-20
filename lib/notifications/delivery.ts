import 'server-only'
import { planAllowsNow } from '@/lib/credits/plan-gate'
import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'
import { and, asc, eq, inArray, isNotNull, lt, lte, like } from 'drizzle-orm'
import { db } from '@/lib/db'
import { leads, members, notificationOutbox, projects, quotes } from '@/lib/db/schema'
import { siteConfig } from '@/lib/config'
import { titleCaseName } from '@/lib/format'
import { fetchStudio } from '@/lib/settings/queries'
import { shortStudioName } from '@/lib/settings/types'
import { fetchMessageTemplates } from '@/lib/notifications/queries'
import { templateFor, type Channel, type EventKey, type FeedRow } from '@/lib/notifications/model'
import { compose, waNumber, type Notice } from '@/lib/notifications/outbox'
import { HELD_EVENTS, heldIds, type HeldMail } from '@/lib/notifications/held'   // (simplify round 2, R2-C) held client emails
import type { ClientEvent } from '@/lib/portal/client-messages'
import type { InviteEvent } from '@/lib/company/invitations'   // (pending modules S09)
import { messagesPaused } from '@/lib/platform'   // (parity map, UC-082) OpenMaison's pause on the studio's messages (Qanvast Ops › Studios)
import { FANOUT_MAX, RETRY_AFTER_MS, RETRY_MAX, batchOf } from '@/lib/notifications/safeguards'
import { emailModeOf, waitsForSummary } from '@/lib/notifications/personal'   // (pending modules S18) a member's daily summary
import type { SummaryEvent } from '@/lib/notifications/summary'
import { serviceSlot } from '@/lib/services/slots'   // (pending modules S34) the one slot a real provider plugs into
import { ALLOWLIST_BLOCK_REASON, allowedBy, parseAllowlist, type Allowlist } from '@/lib/notifications/allowlist'
import { emailHtml } from '@/lib/notifications/email-html'
import { emailLogoFor } from '@/lib/notifications/email-logo'   // (S44O — rows 314 · 337)
import type { Receipt, WebhookRead } from '@/lib/notifications/webhook-read'
import type { SiteEvent } from '@/lib/site/team-mail'   // (pending modules S35)

/*
 * (gaps build E, item 5) The delivery layer — the ONE way an email or a WhatsApp message leaves OpenMaison. `notify` (emit.ts) hands it every
 * notice whose event has Email or WhatsApp switched on in Settings › Notifications; the bell's derived reminders (a task due, a milestone
 * late, an invoice overdue) come through `deliverDerived`; a later sender (the client's messages, Phase B) calls `deliver` itself. Each
 * message is the studio's own words for the event (Settings › Notifications › Messages) with its fields filled for the person it is to.
 *
 * The prototype's adapter sends nothing: it records the message in `notification_outbox` (Settings › Notifications › Sent messages lists
 * them, and says so while the stand-in answers). PRODUCTION: the developers set a real adapter with `setDeliveryAdapter` — an email service
 * and a WhatsApp Business provider (1.0 used Resend and 360dialog's approved templates; lib/services/registry.ts names the env) — and their
 * scheduler calls `/api/cron/notification-scheduled` (lib/services/sweep.ts runs `deliverDerived` for every member, 1.0's five minutes).
 * The row is written either way, with the provider's status.
 *
 * (pending modules S34) THE ADAPTER'S CONTRACT — `send(message)` with the address its channel needs and `html()` (an email's dressed copy in
 * the studio's colours, lib/notifications/email-html.ts; null for WhatsApp) → `{ status: 'sent' | 'failed', error?, providerRef? }`. Answer
 * `providerRef` (the wamid, the email's id) and the provider's receipts mark the row Delivered / Read or failed (`applyReceipts`, from
 * app/api/webhooks/whatsapp); a client's reply comes in the same way (lib/notifications/inbound.ts). A throw is a failure, tried again by the
 * retries. `event` names 1.0's approved template for a WhatsApp message sent outside the 24-hour window (D360_DEFAULT_TEMPLATE otherwise).
 * The layer itself keeps every rule a real provider runs under: the keys (never twice), Who hears, the daily summary, the plan's WhatsApp
 * (`not_in_plan` is never handed to an adapter), OpenMaison's pause, a large send for the Owner, the retries and — on a deployment that sets
 * `NOTIFY_ALLOWLIST` — only the listed people (`blocked` for the rest).
 */

export type OutboundChannel = Exclude<Channel, 'in_app'>
export type Recipient = { memberId: string | null; name: string; email: string | null; phone: string | null }
export type Outbound = {
  /** What keeps it from going twice — `n:<notification>:<channel>` · `d:<derived row>:<member>:<channel>`. */
  key: string
  event: EventKey | ClientEvent | InviteEvent | SummaryEvent | SiteEvent   // (pending modules S35) the website's word to OpenMaison's team — (gaps build H, H-Q17) a client's message (lib/portal/client-messages-send.ts) goes the same way — (pending modules S09) and an invitation to a new member — (S18) and a member's daily summary
  channel: OutboundChannel
  to: Recipient
  subject: string | null
  body: string
  href: string | null
  leadId: string | null
  notificationId: string | null
}
export type DeliveryStatus = 'sent' | 'failed' | 'no_address'
  /** (pending modules S19 — 1.0's plan gating: WhatsApp notifications are Pro) written, never sent, never tried again — 1.0's "Not included in plan" */
  | 'not_in_plan'
  /** (pending modules S34 — 1.0's NOTIFY_ALLOWLIST) a deployment that sends only to its test list: written, never sent, never tried again */
  | 'blocked'
/** What the adapter answers for one message. `providerRef` = the provider's own id for it (a wamid, an email's id) — its receipts find the row by it. */
export type DeliveryResult = { status: 'sent' | 'failed'; error?: string | null; providerRef?: string | null }
/** What a provider does with one message — the address is the email or the mobile number the channel needs. */
export type DeliveryAdapter = {
  name: string
  send: (m: Outbound & { address: string; /** an email's HTML in the studio's colours (null for WhatsApp) — built only when asked */ html: () => Promise<string | null> }) => Promise<DeliveryResult>
  /** (pending modules S34) The provider's webhook, read: its receipts and the replies that came in. Absent = Meta's own envelope (360dialog,
      the WhatsApp Cloud API — lib/notifications/webhook-read.ts `readMetaEnvelope`). Answer null to refuse it (a signature that doesn't match). */
  readWebhook?: (raw: { body: unknown; text: string; headers: Headers }) => WebhookRead | null
}

/** The prototype's adapter: the message is recorded as sent — nothing leaves the machine. */
const OUTBOX: DeliveryAdapter = { name: 'outbox', send: async () => ({ status: 'sent' }) }
/* (pending modules S34) the slot (lib/services/slots.ts) — on globalThis, so the adapter the developers plug in at start-up is the one every
   bundle's copy of this module sends through */
const slot = serviceSlot<DeliveryAdapter>('delivery', OUTBOX)
/** PRODUCTION: plug the real provider in once, at start-up (lib/services/install.ts). */
export function setDeliveryAdapter(a: DeliveryAdapter): void { slot.set(a) }
/** The adapter answering now — the webhook route reads its `readWebhook`. */
export const deliveryAdapter = (): DeliveryAdapter => slot.use()
/** Whether the prototype's outbox still answers (nothing really sent) — Sent messages says "Simulated on this prototype" while it does. */
export const deliveryIsStandIn = (): boolean => slot.standIn()

/* (pending modules S34) 1.0's NOTIFY_ALLOWLIST, read once per value of the variable */
let listCache: { raw: string; list: Allowlist } | null = null
function allowlist(): Allowlist {
  const raw = process.env.NOTIFY_ALLOWLIST ?? ''
  if (listCache?.raw !== raw) listCache = { raw, list: parseAllowlist(raw) }
  return listCache.list
}

/** (pending modules S34) The one place a message meets the adapter — the first send, a release, a retry. The stand-in sends to no one, so the
    allow-list only ever holds back a real send. Never throws: a provider's throw is a failure, its words on the row. */
async function sendThrough(m: Outbound, address: string | null): Promise<{ status: 'sent' | 'failed' | 'no_address' | 'blocked'; error: string | null; providerRef: string | null; provider: string }> {
  const a = slot.use()
  if (!address) return { status: 'no_address', error: null, providerRef: null, provider: a.name }
  if (!slot.standIn() && !allowedBy(allowlist(), address)) return { status: 'blocked', error: ALLOWLIST_BLOCK_REASON, providerRef: null, provider: a.name }
  try {
    const r = await a.send({ ...m, address, html: () => (m.channel === 'email' ? emailHtmlFor(m) : Promise.resolve(null)) })
    const sent = r?.status === 'sent'
    const ref = typeof r?.providerRef === 'string' && r.providerRef.trim() ? r.providerRef.trim().slice(0, 200) : null
    return { status: sent ? 'sent' : 'failed', error: sent ? null : (typeof r?.error === 'string' && r.error.trim() ? r.error.trim().slice(0, 500) : 'The provider didn’t take it'), providerRef: sent ? ref : null, provider: a.name }
  } catch (e) {
    return { status: 'failed', error: (e instanceof Error ? e.message : String(e)).slice(0, 500) || 'The provider didn’t take it', providerRef: null, provider: a.name }
  }
}

/** (pending modules S34) An email's HTML part — the studio's page (lib/notifications/email-html.ts), its logo when the kit has one an email
    can carry (an address, not a data URL or an SVG; else its name), its colours, its contact lines. */
async function emailHtmlFor(m: Outbound): Promise<string> {
  const { fetchBrand } = await import('@/lib/templates/queries')
  const { DEFAULT_BRAND } = await import('@/lib/templates/model')
  const b = await fetchBrand()
  /* (S44O — rows 314 · 337, M15) the kit's hosted PNG copy with its own size — an upload (a data URL) or an SVG reaches every mail app now; only
     OpenMaison's own mark (a kit never changed) is left out, the email then names the studio */
  const logo = b.kit.logo && b.kit.logo !== DEFAULT_BRAND.logo ? await emailLogoFor(b.kit.logo, (h) => linkOf(h)).catch(() => null) : null
  const studio = shortStudioName(b.details.name)
  return emailHtml(
    { subject: m.subject ?? studio, body: m.body, link: m.href ? linkOf(m.href) : null, settingsLink: m.to.memberId ? linkOf('/profile#notifications') : null },
    { studio, logoUrl: logo?.url ?? null, logoSize: logo?.size ?? null, ink: b.kit.colors.ink, grey: b.kit.colors.grey, accent: b.kit.colors.accent, contact: [b.details.phone, b.details.email, b.details.website] },
  )
}
/** (pending modules S34) The same page for an outbox row — the developers' preview (app/api/dev/email-preview). */
export async function emailHtmlOfRow(r: Pick<typeof notificationOutbox.$inferSelect, 'key' | 'event' | 'channel' | 'memberId' | 'toName' | 'toAddress' | 'subject' | 'body' | 'href' | 'leadId' | 'notificationId'>): Promise<string> {
  return emailHtmlFor({ key: r.key, event: r.event as Outbound['event'], channel: 'email', to: { memberId: r.memberId, name: r.toName, email: r.toAddress, phone: null }, subject: r.subject, body: r.body, href: r.href, leadId: r.leadId, notificationId: r.notificationId })
}

/** The address a channel needs: an email, or a mobile number as WhatsApp takes it (+65 and the eight digits). */
export function addressFor(channel: OutboundChannel, to: Recipient): string | null {
  return channel === 'email' ? to.email?.trim() || null : waNumber(to.phone)
}

/* ── (simplify round 2 — R2-C, his "fix all the pending things" 2026-10-09) Held client emails ─────────────────────────────────────────
   An action that answers with Undo runs its sends inside `holdClientMail(window, …)`: every message to a client it raises of the events it
   names (`HELD_EVENTS` — paused, running again, handed over, an invoice sent, the schedule shared, an update; a recipient who is not a studio
   member — `tellClient`'s) is written to the outbox HELD (`status = 'held'`, `send_after = now + window`) instead of reaching the
   adapter. The Undo deletes the rows still held (`cancelHeldMessages`); `releaseHeldMessages` sends the ones come due through the same adapter —
   run at the top of every delivery, when Settings › Notifications › Sent messages is read, and on the bell's read (`deliverDerived`), so held
   mail never waits long in the demo. PRODUCTION: the sweep that runs `deliverDerived` runs `releaseHeldMessages` too; a real provider only ever
   sees released mail. The scope travels with the action's own async calls (AsyncLocalStorage), so senders in other modules — money's
   `sendInvoice`, the schedule's share, an update's go-out — need no flag, and no browser can set it. Messages to studio members never wait. */

type HoldScope = { until: Date; rows: { id: string; to: string }[] }
const holdScope = new AsyncLocalStorage<HoldScope>()

/** Run `work` with every message to a client it raises held for `ms` — the action's Undo window. Answers its result and what it held. */
export async function holdClientMail<T>(ms: number, work: () => Promise<T>): Promise<{ result: T; held: HeldMail }> {
  const outer = holdScope.getStore()
  const scope: HoldScope = { until: new Date(Date.now() + Math.max(0, ms)), rows: [] }
  const result = await holdScope.run(scope, work)
  if (outer) outer.rows.push(...scope.rows)   // a moment inside another (a sheet's tick) — the outer Undo takes them back too
  return { result, held: { ids: scope.rows.map((r) => r.id), to: [...new Set(scope.rows.map((r) => r.to))] } }
}

/**
 * The held messages an Undo takes back — deleted while still held (one that went can't be unsent), and only the lead's own (the Undo's own
 * project, which its action already checked the viewer may change). Answers what it took back, for the Undo's sentence. Never throws.
 */
export async function cancelHeldMessages(ids: unknown, leadId: string): Promise<HeldMail> {
  const list = heldIds(ids)
  if (!list.length || !leadId) return { ids: [], to: [] }
  return cancelWhere(and(inArray(notificationOutbox.id, list), eq(notificationOutbox.leadId, leadId), eq(notificationOutbox.status, 'held')))
}
/** Every message of one kind still held for a lead — a Reopen inside the handover's Undo window keeps "handed over" from going. */
export async function cancelHeldEvent(leadId: string, event: ClientEvent): Promise<HeldMail> {
  if (!leadId) return { ids: [], to: [] }
  return cancelWhere(and(eq(notificationOutbox.leadId, leadId), eq(notificationOutbox.event, event), eq(notificationOutbox.status, 'held')))
}
async function cancelWhere(where: ReturnType<typeof and>): Promise<HeldMail> {
  try {
    /* one statement: a row a release claimed a moment ago (no longer 'held') is not taken back, and is not said to be */
    const rows = await db.delete(notificationOutbox).where(where).returning({ id: notificationOutbox.id, to: notificationOutbox.toName })
    return { ids: rows.map((r) => r.id), to: [...new Set(rows.map((r) => r.to))] }
  } catch { return { ids: [], to: [] } }
}

/**
 * Send every held message whose window has passed, through the adapter, oldest first. Each row is claimed before it goes (`held` → `sending`,
 * compare-and-set), so two releases at once send it once; it then reads how it went, and its time is when it went. Answers how many went.
 * Never throws.
 */
let releasing = false   // (parity map, UC-083) a release that raises `message_failed` delivers it — never a release inside a release
export async function releaseHeldMessages(now: Date = new Date()): Promise<number> {
  if (releasing) return 0
  releasing = true
  try {
    /* (parity map, UC-082) while OpenMaison pauses the studio's messages, a held message that comes due waits on as paused */
    if (await pausedNow()) {
      await db.update(notificationOutbox).set({ status: 'paused' }).where(and(eq(notificationOutbox.status, 'held'), lte(notificationOutbox.sendAfter, now)))
      return 0
    }
    const due = await db.select().from(notificationOutbox).where(and(eq(notificationOutbox.status, 'held'), lte(notificationOutbox.sendAfter, now))).orderBy(asc(notificationOutbox.createdAt)).limit(100)
    /* …and what waited out a pause goes once it lifts */
    const waited = await db.select().from(notificationOutbox).where(eq(notificationOutbox.status, 'paused')).orderBy(asc(notificationOutbox.createdAt)).limit(200)
    let sent = 0
    for (const r of [...due, ...waited]) {
      const claim = await db.update(notificationOutbox).set({ status: 'sending' }).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, r.status)))
      if (!claim.rowsAffected) continue
      if ((await sendRow(r, { retry: false })) === 'sent') sent++
    }
    sent += await retryDue(now)   // (UC-083) the failed messages whose next try has come
    return sent
  } catch { return 0 } finally { releasing = false }
}

/** Send one message through the adapter and record it. Answers how it went; a key already sent (or held) answers 'duplicate' and sends
    nothing; (simplify round 2) a message to a client inside `holdClientMail` answers 'held' — written, not sent. */
export async function deliver(m: Outbound, o: { /** the caller swept already (one notice's several messages sweep once) */ swept?: boolean; /** the caller read the pause already */ paused?: boolean } = {}): Promise<DeliveryStatus | 'duplicate' | 'held'> {
  if (!o.swept) await releaseHeldMessages()   // (simplify round 2) what has come due goes first
  const [have] = await db.select({ id: notificationOutbox.id }).from(notificationOutbox).where(eq(notificationOutbox.key, m.key)).limit(1)
  if (have) return 'duplicate'
  const address = addressFor(m.channel, m.to)
  if (await planHoldsWhatsApp(m)) {
    const wrote = await written(() => db.insert(notificationOutbox).values({
      id: randomUUID(), key: m.key, notificationId: m.notificationId, event: m.event, channel: m.channel, memberId: m.to.memberId, toName: m.to.name, toAddress: address,
      subject: null, body: m.body, href: m.href, leadId: m.leadId, status: 'not_in_plan', sendAfter: null, error: null, provider: slot.use().name, createdAt: new Date(),
    }).onConflictDoNothing({ target: notificationOutbox.key }))
    return wrote.rowsAffected ? 'not_in_plan' : 'duplicate'
  }
  /* (parity map, UC-082) while OpenMaison pauses the studio's messages, every one waits in the outbox — written, never sent; it goes once the
     pause lifts (the next release). The bell inside the app is not a message and keeps ringing. */
  if (o.paused ?? await pausedNow()) {
    const wrote = await written(() => db.insert(notificationOutbox).values({
      id: randomUUID(), key: m.key, notificationId: m.notificationId, event: m.event, channel: m.channel, memberId: m.to.memberId, toName: m.to.name, toAddress: address,
      subject: m.channel === 'email' ? m.subject : null, body: m.body, href: m.href, leadId: m.leadId, status: 'paused', sendAfter: null, error: null, provider: slot.use().name, createdAt: new Date(),
    }).onConflictDoNothing({ target: notificationOutbox.key }))
    return wrote.rowsAffected ? 'held' : 'duplicate'
  }
  /* (simplify round 2) a client's message inside an Undo's window waits — the address is read now, the adapter sees it once released. Only the
     events those actions raise (`HELD_EVENTS`); any other — "A payment is due today", a receipt, a reply — goes at once, scope or not */
  const hold = m.to.memberId === null && HELD_EVENTS.has(m.event) ? holdScope.getStore() : undefined
  if (hold) {
    const id = randomUUID()
    const wrote = await written(() => db.insert(notificationOutbox).values({
      id, key: m.key, notificationId: m.notificationId, event: m.event, channel: m.channel, memberId: null, toName: m.to.name, toAddress: address,
      subject: m.channel === 'email' ? m.subject : null, body: m.body, href: m.href, leadId: m.leadId, status: 'held', sendAfter: hold.until, error: null, provider: slot.use().name, createdAt: new Date(),
    }).onConflictDoNothing({ target: notificationOutbox.key }))
    if (!wrote.rowsAffected) return 'duplicate'
    hold.rows.push({ id, to: m.to.name })
    return 'held'
  }
  const res = await sendThrough(m, address)   // (pending modules S34) the adapter, the allow-list, the provider's id
  const now = new Date()
  await written(() => db.insert(notificationOutbox).values({
    id: randomUUID(), key: m.key, notificationId: m.notificationId, event: m.event, channel: m.channel, memberId: m.to.memberId,
    toName: m.to.name, toAddress: address, subject: m.channel === 'email' ? m.subject : null, body: m.body, href: m.href, leadId: m.leadId,
    status: res.status, error: res.error, provider: res.provider, providerRef: res.providerRef, createdAt: now,
    /* (parity map, UC-083) a failed message is tried again — the first retry after RETRY_AFTER_MS[0], on the release sweep */
    ...(res.status === 'failed' ? { attempts: 0, nextTryAt: new Date(now.getTime() + RETRY_AFTER_MS[0]!) } : {}),
  }).onConflictDoNothing({ target: notificationOutbox.key }))
  return res.status
}

/** (parity map — the gap-e probe's dropped WhatsApp copy, 2026-10-10) libsql answers "database is locked" at once, with no wait (app/visualizer/
    actions.ts says so too): an outbox row written while another connection holds the file — a transaction elsewhere, a reader — is tried again
    a few times, so a message is never lost to a moment's lock. For a single autocommit statement only (retrying a transaction can leave a lock). */
const locked = (e: unknown): boolean => {
  /* drizzle wraps the driver's error ("Failed query: …") — the lock is on its cause */
  for (let x: unknown = e, depth = 0; x && typeof x === 'object' && depth < 4; x = (x as { cause?: unknown }).cause, depth++) {
    if (/SQLITE_BUSY|SQLITE_LOCKED|database is locked/i.test(`${String((x as { code?: unknown }).code ?? '')} ${String((x as { message?: unknown }).message ?? '')}`)) return true
  }
  return false
}
async function written<T>(write: () => Promise<T>): Promise<T> {
  for (let n = 0; ; n++) {
    try { return await write() } catch (e) {
      if (n >= 8 || !locked(e)) throw e
      await new Promise((r) => setTimeout(r, 25 * (n + 1)))
    }
  }
}

/* ── (parity map 2026-10-10 — UC-082 · UC-083) the sending safeguards: OpenMaison's pause, a large send held for the Owner, retries ──────────
   1.0 dropped duplicates (2.0's keys already do), never sent for a demo studio (2.0's adapter sends nothing anyway — the outbox is silent),
   let an operator pause a studio's notices, raised an alarm on a big fan-out and tried failed emails again three times. Here: the pause is
   Qanvast Ops › Studios' switch (`settings.platform.messagesPaused`, lib/platform.ts) — every message waits as `paused` and goes when it
   lifts; one raise that would message more than FANOUT_MAX people waits as `held_large`, the Owner hears `send_held` and sends or drops it
   from Settings › Notifications › Sent messages; a failure is tried again up to RETRY_MAX times (`attempts` · `next_try_at`, on the release
   sweep), then Owners and Admins hear `message_failed`. PRODUCTION: the sweep that runs `deliverDerived` runs `releaseHeldMessages`. */
/** (pending modules S19 — 1.0's plan gating: "the gate lives in sendWhatsAppNotification … record a row, never retried") A WhatsApp
    message on a Free studio is not sent — every automatic one: a member's notice, a reminder, a client's message. An invitation to join is
    not a notification and still goes (1.0 sends it on its own path). Email and the bell are every plan's. */
async function planHoldsWhatsApp(m: { channel: string; event: string }): Promise<boolean> {
  if (m.channel !== 'whatsapp' || m.event === 'member_invite') return false
  try { return !(await planAllowsNow('whatsapp_notifications')) } catch { return false }
}
async function pausedNow(): Promise<boolean> {
  try { return await messagesPaused() } catch { return false }
}

/** Send one outbox row through the adapter now (it is already claimed — `sending`), and say how it went on the row. A failure schedules its
    next try, or — the last of them — raises `message_failed` (a message to a client; a member's own bell row already told them). */
async function sendRow(r: typeof notificationOutbox.$inferSelect, o: { retry: boolean }): Promise<DeliveryStatus> {
  const channel = r.channel as OutboundChannel
  /* (pending modules S19) a WhatsApp message written while the studio was on Pro and released after it moved to Free is not sent either */
  if (await planHoldsWhatsApp({ channel, event: r.event })) {
    await written(() => db.update(notificationOutbox).set({ status: 'not_in_plan', error: null, createdAt: new Date(), nextTryAt: null }).where(eq(notificationOutbox.id, r.id)))
    return 'not_in_plan'
  }
  const m: Outbound = {
    key: r.key, event: r.event as Outbound['event'], channel, subject: r.subject, body: r.body, href: r.href, leadId: r.leadId, notificationId: r.notificationId,
    to: { memberId: r.memberId, name: r.toName, email: channel === 'email' ? r.toAddress : null, phone: channel === 'whatsapp' ? r.toAddress : null },
  }
  const res = await sendThrough(m, r.toAddress)   // (pending modules S34)
  const now = new Date()
  const tries = o.retry ? r.attempts + 1 : r.attempts
  const again = res.status === 'failed' && tries < RETRY_MAX ? new Date(now.getTime() + (RETRY_AFTER_MS[tries] ?? RETRY_AFTER_MS[RETRY_AFTER_MS.length - 1]!)) : null
  await written(() => db.update(notificationOutbox).set({ status: res.status, error: res.error, provider: res.provider, providerRef: res.providerRef, deliveredAt: null, readAt: null, createdAt: now, attempts: tries, nextTryAt: again }).where(eq(notificationOutbox.id, r.id)))
  if (res.status === 'failed' && !again && o.retry) await tellFinalFailure(r)
  return res.status
}

/** (pending modules S34 — split out of `sendRow` so a provider's later "failed" receipt rings the same bells) A message whose last try failed:
    a client's tells the studio's Owners and Admins (`message_failed`; a member's own bell row already told them), an invitation tells whoever
    sent it. Never throws. */
async function tellFinalFailure(r: typeof notificationOutbox.$inferSelect): Promise<void> {
  if (r.memberId === null) {
    try {
      const { notify } = await import('./emit')
      const { studioRunnerIds } = await import('./queries')
      await notify('message_failed', await studioRunnerIds(), { title: `A message to ${r.toName} could not be sent`, body: `${r.channel === 'email' ? 'Email' : 'WhatsApp'} · tried ${RETRY_MAX + 1} times`, href: '/settings?section=notifications#sent-messages', leadId: r.leadId, actorId: null })
    } catch { /* the bell is best-effort; the row says what happened */ }
  }
  /* (pending modules S18 — the steps' note after S09: "a finally-failed invitation doesn't ring the inviter's bell yet") an invitation to a new
     member that could not go after its last try tells whoever sent it (else the studio's Owners and Admins), and opens that member's row on
     Members, where Send again and Copy link are */
  if (r.event === 'member_invite') {
    try {
      const invitation = /^i:([^:]+):/.exec(r.key)?.[1]
      const { studioInvitations } = await import('@/lib/db/schema')
      const [inv] = invitation ? await db.select({ invitedBy: studioInvitations.invitedBy, memberId: studioInvitations.memberId }).from(studioInvitations).where(eq(studioInvitations.id, invitation)).limit(1) : []
      const by = inv?.invitedBy ? (await db.select({ id: members.id }).from(members).where(and(eq(members.id, inv.invitedBy), eq(members.isActive, true))).limit(1))[0]?.id ?? null : null
      const { notify } = await import('./emit')
      const { studioRunnerIds } = await import('./queries')
      const who = inv?.memberId ?? r.memberId
      await notify('message_failed', by ? [by] : await studioRunnerIds(), { title: `The invitation to ${r.toName} could not be sent`, body: `${r.channel === 'email' ? 'Email' : 'WhatsApp'} · tried ${RETRY_MAX + 1} times — send it again or copy the link`, href: who ? `/company/members?open=${encodeURIComponent(who)}` : '/company/members', leadId: null, actorId: null })
    } catch { /* the bell is best-effort; the member's row says the invitation didn't go */ }
  }
}

/** (UC-083) The failed messages whose next try has come — tried again now, oldest first. Each is claimed before it goes. */
async function retryDue(now: Date): Promise<number> {
  const due = await db.select().from(notificationOutbox).where(and(eq(notificationOutbox.status, 'failed'), isNotNull(notificationOutbox.nextTryAt), lte(notificationOutbox.nextTryAt, now), lt(notificationOutbox.attempts, RETRY_MAX))).orderBy(asc(notificationOutbox.createdAt)).limit(50)
  let sent = 0
  for (const r of due) {
    const claim = await db.update(notificationOutbox).set({ status: 'sending' }).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, 'failed')))
    if (!claim.rowsAffected) continue
    if ((await sendRow(r, { retry: true })) === 'sent') sent++
  }
  return sent
}
/** (UC-083) Try Again Now — a failed message still being retried (or one whose tries ran out) goes through the adapter at once; it counts
    as a try. Answers how it went, or null when the row is not one that failed. */
export async function retryMessageNow(id: string): Promise<DeliveryStatus | null> {
  if (await pausedNow()) return null
  const [r] = await db.select().from(notificationOutbox).where(and(eq(notificationOutbox.id, id), eq(notificationOutbox.status, 'failed'))).limit(1)
  if (!r) return null
  const claim = await db.update(notificationOutbox).set({ status: 'sending' }).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, 'failed')))
  if (!claim.rowsAffected) return null
  return sendRow({ ...r, attempts: Math.min(r.attempts, RETRY_MAX - 1) }, { retry: true })
}
/** (UC-082) The Owner's Send on a large send held for them — every message of the batch goes now (or waits, while paused). Answers how many went. */
export async function sendHeldBatch(batch: string): Promise<number> {
  const rows = await db.select().from(notificationOutbox).where(and(eq(notificationOutbox.status, 'held_large'), eq(notificationOutbox.error, batchOf(batch)))).orderBy(asc(notificationOutbox.createdAt))
  let sent = 0
  const paused = await pausedNow()
  for (const r of rows) {
    const claim = await db.update(notificationOutbox).set({ status: paused ? 'paused' : 'sending', error: null }).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, 'held_large')))
    if (!claim.rowsAffected || paused) continue
    if ((await sendRow(r, { retry: false })) === 'sent') sent++
  }
  return sent
}
/** (UC-082) The Owner's Drop — the batch's messages never go; the log keeps them as dropped, by whom. Answers how many. */
export async function dropHeldBatch(batch: string, by: string): Promise<number> {
  const r = await db.update(notificationOutbox).set({ status: 'dropped', error: `Dropped by ${by}` }).where(and(eq(notificationOutbox.status, 'held_large'), eq(notificationOutbox.error, batchOf(batch))))
  return r.rowsAffected
}

/* ── (pending modules S34 — card api:message-delivery-providers, "Delivered and Read receipts from WhatsApp") The provider's receipts ─────
   A real provider answers `providerRef` on each send and later reports how it went (app/api/webhooks/whatsapp reads Meta's envelope, or the
   adapter's own `readWebhook`): delivered to the phone or the inbox, read, or failed after all. Delivered / Read only ever add a time to a
   row that went (never twice, never earlier than it went); a failure after the send turns the row failed and into the retries like any
   other — its last one ringing the same bells (`tellFinalFailure`). A receipt for a row this studio doesn't hold is left alone (the central
   router of 1.0's shared number forwards each to its own studio). The prototype's outbox reports nothing, so nothing here runs on the demo. */
export async function applyReceipts(list: readonly Receipt[]): Promise<number> {
  let changed = 0
  for (const rc of list) {
    try {
      if (!rc?.providerRef) continue
      const [r] = await db.select().from(notificationOutbox).where(eq(notificationOutbox.providerRef, rc.providerRef)).limit(1)
      if (!r || r.status === 'sending') continue
      const at = new Date(Math.max(Number.isFinite(rc.at) ? rc.at : Date.now(), r.createdAt.getTime()))
      if (rc.status === 'delivered' || rc.status === 'read') {
        if (r.status !== 'sent') continue
        const set = rc.status === 'read' ? { readAt: r.readAt ?? at, deliveredAt: r.deliveredAt ?? at } : { deliveredAt: r.deliveredAt ?? at }
        if ((rc.status === 'read' && r.readAt) || (rc.status === 'delivered' && r.deliveredAt)) continue
        const u = await written(() => db.update(notificationOutbox).set(set).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, 'sent'))))
        changed += u.rowsAffected
      } else if (rc.status === 'failed') {
        if (r.status !== 'sent') continue
        const again = r.attempts < RETRY_MAX ? new Date(Date.now() + (RETRY_AFTER_MS[r.attempts] ?? RETRY_AFTER_MS[RETRY_AFTER_MS.length - 1]!)) : null
        const u = await written(() => db.update(notificationOutbox).set({ status: 'failed', error: (rc.error ?? 'Failed').slice(0, 500), deliveredAt: null, readAt: null, nextTryAt: again }).where(and(eq(notificationOutbox.id, r.id), eq(notificationOutbox.status, 'sent'))))
        changed += u.rowsAffected
        if (u.rowsAffected && !again) await tellFinalFailure(r)
      }
    } catch (e) { console.error('[delivery] a receipt wasn’t applied:', e instanceof Error ? e.message : e) }
  }
  return changed
}

/* ── the message as the recipient reads it ─────────────────────────────────────────────────────────────────────────────────────────── */

const linkOf = (href: string | null | undefined) => (href ? (/^https?:/.test(href) ? href : `${siteConfig.url.replace(/\/$/, '')}${href.startsWith('/') ? '' : '/'}${href}`) : siteConfig.url)
/** (pending modules S18) The app's address for a record, as every message carries it — the daily summary's links too. */
export const absoluteLink = linkOf

/** The fields every message can fill from the records, under the sender's own (`fields` wins). */
async function commonFields(n: Notice): Promise<Record<string, string>> {
  const [studio, lead, quote, actor] = await Promise.all([
    fetchStudio(),
    n.leadId ? db.select({ name: leads.name, source: leads.source, stage: leads.stage }).from(leads).where(eq(leads.id, n.leadId)).limit(1).then((r) => r[0] ?? null) : null,
    n.quoteId ? db.select({ number: quotes.number }).from(quotes).where(eq(quotes.id, n.quoteId)).limit(1).then((r) => r[0] ?? null) : null,
    n.actorId ? db.select({ name: members.name }).from(members).where(eq(members.id, n.actorId)).limit(1).then((r) => r[0] ?? null) : null,
  ])
  const f: Record<string, string> = { '{studio}': shortStudioName(studio.name), '{link}': linkOf(n.href) }
  if (lead) { f['{lead_name}'] = titleCaseName(lead.name); if (lead.source) f['{source}'] = lead.source; if (lead.stage) f['{stage}'] = lead.stage }
  if (quote) f['{quote_number}'] = quote.number
  if (actor) f['{actor}'] = actor.name
  return { ...f, ...(n.fields ?? {}) }
}
/** The lead a derived row's link points at — a lead's page, or a project's (its lead carries the client's name). */
async function leadOfHref(href: string | null): Promise<string | null> {
  const lead = /^\/leads\/([^/?#]+)/.exec(href ?? '')?.[1]
  if (lead) return lead
  const project = /^\/projects\/([^/?#]+)/.exec(href ?? '')?.[1]
  if (!project) return null
  const [p] = await db.select({ leadId: projects.leadId }).from(projects).where(eq(projects.id, project)).limit(1)
  return p?.leadId ?? null
}

async function recipients(ids: string[]): Promise<Map<string, Recipient & { active: boolean; /** (S18) how their emails come */ summary: ReturnType<typeof emailModeOf> }>> {
  if (!ids.length) return new Map()
  const rows = await db.select({ id: members.id, name: members.name, email: members.email, phone: members.phone, active: members.isActive, noticeEmail: members.noticeEmail }).from(members).where(inArray(members.id, ids))
  return new Map(rows.map((r) => [r.id, { memberId: r.id, name: r.name, email: r.email, phone: r.phone, active: r.active, summary: emailModeOf(r.noticeEmail) }]))
}

/**
 * A raised notice's email and WhatsApp messages (emit.ts `notify`): one per bell row and channel, to the member the row is for — a member who
 * has left the studio gets none. Never throws: a provider's failure is recorded on its row and the action that raised the notice carries on.
 */
export async function deliverNotice(kind: EventKey, channels: OutboundChannel[], rows: { id: string; memberId: string }[], n: Notice): Promise<number> {
  if (!channels.length || !rows.length) return 0
  try {
    const [templates, fields, people] = await Promise.all([fetchMessageTemplates(), commonFields(n), recipients(rows.map((r) => r.memberId))])
    /* (parity map, UC-082) one raise that would message more than FANOUT_MAX people at once waits for the Owner (Sent messages: Send · Drop) */
    const live = rows.filter((r) => people.get(r.memberId)?.active)
    const batch = live.length > FANOUT_MAX && kind !== 'send_held' ? randomUUID() : null
    /* one sweep and one read of the pause for the notice's every message — each message no longer waits on its own (the gap between a
       notice's email and its WhatsApp stays as short as it was before the safeguards) */
    await releaseHeldMessages()
    const paused = await pausedNow()
    let sent = 0
    for (const r of live) {
      const to = people.get(r.memberId)!
      for (const channel of channels) {
        /* (pending modules S18) a member who takes their emails as a daily summary gets this one in it, not now — unless it is urgent */
        if (channel === 'email' && waitsForSummary(to.summary, kind)) continue
        /* each message on its own: one that fails to be written never takes the notice's other messages with it */
        try {
          const words = templateFor(templates, kind, channel)
          const msg = compose(channel, words, fields, n, to.name)   // a member's name is already the short one the studio calls them ("Hui Min")
          if (batch) {
            await written(() => db.insert(notificationOutbox).values({
              id: randomUUID(), key: `n:${r.id}:${channel}`, notificationId: r.id, event: kind, channel, memberId: to.memberId, toName: to.name, toAddress: addressFor(channel, to),
              subject: channel === 'email' ? msg.subject : null, body: msg.body, href: n.href ?? null, leadId: n.leadId ?? null, status: 'held_large', sendAfter: null, error: batchOf(batch), provider: slot.use().name, createdAt: new Date(),
            }).onConflictDoNothing({ target: notificationOutbox.key }))
            continue
          }
          const st = await deliver({ key: `n:${r.id}:${channel}`, event: kind, channel, to, subject: msg.subject, body: msg.body, href: n.href ?? null, leadId: n.leadId ?? null, notificationId: r.id }, { swept: true, paused })
          if (st === 'sent') sent++
        } catch (e) { console.error(`[delivery] ${kind} · ${channel} to ${to.name} wasn’t written:`, e instanceof Error ? e.message : e) }
      }
    }
    if (batch) {
      const { notify } = await import('./emit')
      const owners = (await db.select({ id: members.id }).from(members).where(and(eq(members.role, 'Owner'), eq(members.isActive, true)))).map((m) => m.id)
      await notify('send_held', owners, { title: `A large send waits for your OK — ${live.length} people`, body: n.title, href: '/settings?section=notifications#sent-messages', leadId: n.leadId ?? null, actorId: null })
    }
    return sent
  } catch { return 0 }
}

/**
 * The bell's derived reminders for one member — never stored as bell rows, so each goes out once per occurrence, keyed by the row's own id.
 * The prototype runs it when the member opens their bell (app/notifications/actions.ts); PRODUCTION runs it from a sweep for every member.
 */
export async function deliverDerived(memberId: string, due: FeedRow[]): Promise<number> {
  await releaseHeldMessages()   // (simplify round 2, R2-C) the bell's read — a path the studio hits often — lets held client mail that came due go
  const rows = due.filter((r) => r.derived && r.channels.some((c) => c !== 'in_app'))
  if (!rows.length) return 0
  try {
    const keys = rows.flatMap((r) => r.channels.filter((c): c is OutboundChannel => c !== 'in_app').map((c) => `d:${r.id}:${memberId}:${c}`))
    const done = new Set((await db.select({ key: notificationOutbox.key }).from(notificationOutbox).where(and(like(notificationOutbox.key, 'd:%'), inArray(notificationOutbox.key, keys)))).map((r) => r.key))
    const fresh = rows.filter((r) => r.channels.some((c) => c !== 'in_app' && !done.has(`d:${r.id}:${memberId}:${c}`)))
    if (!fresh.length) return 0
    const [templates, people] = await Promise.all([fetchMessageTemplates(), recipients([memberId])])
    const to = people.get(memberId)
    if (!to || !to.active) return 0
    let sent = 0
    for (const r of fresh) {
      const leadId = await leadOfHref(r.href)
      const n: Notice = { title: r.title, body: r.body, href: r.href, leadId, fields: r.fields }   // (S42 audit A-09) the row's own fields fill the studio's wording
      const fields = await commonFields(n)
      for (const channel of r.channels.filter((c): c is OutboundChannel => c !== 'in_app')) {
        const key = `d:${r.id}:${memberId}:${channel}`
        if (done.has(key)) continue
        if (channel === 'email' && waitsForSummary(to.summary, r.kind)) continue   // (pending modules S18) it is in their summary's Due part
        const msg = compose(channel, templateFor(templates, r.kind, channel), fields, n, to.name)
        const st = await deliver({ key, event: r.kind, channel, to, subject: msg.subject, body: msg.body, href: r.href, leadId, notificationId: null }, { swept: true })   // the bell's read swept above
        if (st === 'sent') sent++
      }
    }
    return sent
  } catch { return 0 }
}
