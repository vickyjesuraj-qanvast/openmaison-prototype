/*
 * (pending modules S34) The seams, proved in one Node process — the half of verify-pm2-s34.cjs a running server can't show: each real-service
 * slot swapped for a test adapter (in THIS process, exactly as lib/services/install.ts would at start-up), its contract exercised, its records
 * read back, the stand-in put back. Run by the probe on a COPY of its scratch database (it writes freely there; the copy is thrown away):
 *   DATABASE_URL=file:<copy> npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s34-seams.mts
 * Prints one JSON line per check ({ ok, label }) and a last line { done, pass, fail }; exits 1 on any failure. Refuses local.db.
 * (Things that revalidate a page — a lead captured, a checkout's route — need a request and are proved over HTTP by the probe itself.)
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

const url = process.env.DATABASE_URL ?? ''
if (!url.startsWith('file:') || /(^|\/)local\.db$/.test(url.slice(5))) { console.log(JSON.stringify({ ok: false, label: 'refuses to run without a scratch DATABASE_URL (never local.db)' })); process.exit(1) }

let pass = 0, fail = 0
const ok = (cond: unknown, label: string, extra?: unknown) => { if (cond) pass++; else fail++; console.log(JSON.stringify({ ok: !!cond, label, ...(cond ? {} : { extra }) })) }
const step = async (label: string, fn: () => Promise<void>) => { try { await fn() } catch (e) { ok(false, `${label} — threw`, e instanceof Error ? e.stack?.split('\n').slice(0, 4).join(' | ') : String(e)) } }

const { db, client } = await import('@/lib/db')
const schema = await import('@/lib/db/schema')
const { eq, and, like, desc } = await import('drizzle-orm')
const slots = await import('@/lib/services/slots')
const { SERVICES, SIMULATED_WORDS } = await import('@/lib/services/registry')
const delivery = await import('@/lib/notifications/delivery')
const { RETRY_MAX } = await import('@/lib/notifications/safeguards')
const { readMetaEnvelope, sameSecret } = await import('@/lib/notifications/webhook-read')
const { fileInbound, localDigits } = await import('@/lib/notifications/inbound')
const { parseAllowlist, allowedBy } = await import('@/lib/notifications/allowlist')
const { emailHtml } = await import('@/lib/notifications/email-html')
const provider = await import('@/lib/auth/provider')
const studios = await import('@/lib/studios/create')
const payments = await import('@/lib/credits/payments')
const checkout = await import('@/lib/credits/checkout')
const fileStore = await import('@/lib/leads/file-store')
const pdf = await import('@/lib/services/pdf')
const { paperPath } = await import('@/lib/paper-print')
const cal = await import('@/lib/meetings/calendar-sync')
const tr = await import('@/lib/meetings/transcribe')
const feeds = await import('@/lib/services/feeds')
const xero = await import('@/lib/finance/xero-server')
const sweep = await import('@/lib/services/sweep')
const { isAuthorizedCron } = await import('@/lib/services/cron-auth')
const { serviceWarnings, serviceStates } = await import('@/lib/services/install')
const { readWebhookPayload } = await import('@/lib/leads/webhook-payload')

const sec = (ms = Date.now()) => new Date(Math.floor(ms / 1000) * 1000)
const outboxRow = async (id: string) => (await db.select().from(schema.notificationOutbox).where(eq(schema.notificationOutbox.id, id)).limit(1))[0]
const byKey = async (key: string) => (await db.select().from(schema.notificationOutbox).where(eq(schema.notificationOutbox.key, key)).limit(1))[0]

/* ── 1. the registry and the slots ── */
await step('registry', async () => {
  ok(SLOT_KEYS_ALL(), 'every slot starts as the stand-in in a fresh process')
  const keys = SERVICES.map((s) => s.key)
  ok(new Set(keys).size === keys.length, 'registry keys are unique', keys)
  const missing = SERVICES.filter((s) => { try { return !readFileSync(s.swap.file, 'utf8').includes(s.swap.symbol) } catch { return true } }).map((s) => `${s.key} → ${s.swap.file}#${s.swap.symbol}`)
  ok(!missing.length, 'every seam the registry names exists in the file it names', missing)
  const slotted = new Set(SERVICES.map((s) => s.slot).filter(Boolean))
  ok(slots.SLOT_KEYS.every((k) => slotted.has(k)), 'every slot is described in the registry', [...slotted])
  ok(Object.values(SIMULATED_WORDS).every((w) => w.startsWith('Simulated on this prototype')), 'every studio-facing stand-in line says “Simulated on this prototype”')
  const doc = readFileSync('design-source/context/parity/30-pending-modules-build-2026-10-11/services.md', 'utf8')
  const undocumented = SERVICES.filter((s) => !doc.includes(`\`${s.key}\``)).map((s) => s.key)
  ok(!undocumented.length, 'the developers’ document names every seam of the registry', undocumented)
  ok(serviceWarnings({ RESEND_API_KEY: 'x' }).some((w) => w.includes('RESEND_API_KEY') && w.includes('delivery')), 'a real key with the stand-in still answering is warned about')
  ok(!serviceWarnings({ NOTIFY_ALLOWLIST: 'a@b.sg' }).length && !serviceWarnings({}).length, '…and nothing is warned about on the prototype')
  ok(serviceStates({}).every((s) => !s.plugged && s.adapter === 'stand-in'), 'the ops report reads every slot as the stand-in')
})
function SLOT_KEYS_ALL() { return slots.SLOT_KEYS.every((k) => !slots.isPlugged(k)) }

/* ── 2. message delivery: the stand-in, a real adapter, the allow-list, not_in_plan, receipts, retries and the final failure ── */
type Sent = { address: string; html: string | null; event: string; channel: string }
const sent: Sent[] = []
let failNext = false
const realAdapter = {
  name: 'probe-provider',
  send: async (m: { address: string; html: () => Promise<string | null>; event: string; channel: string }) => {
    sent.push({ address: m.address, html: await m.html(), event: m.event, channel: m.channel })
    if (failNext || m.address.includes('fail')) return { status: 'failed' as const, error: 'Mailbox unavailable (probe)' }
    return { status: 'sent' as const, providerRef: `wamid.probe-${sent.length}-${randomUUID().slice(0, 8)}` }
  },
}
const msg = (o: Partial<{ key: string; channel: 'email' | 'whatsapp'; memberId: string | null; email: string | null; phone: string | null; event: string; leadId: string | null }>) => ({
  key: o.key ?? `s34:${randomUUID()}`, event: (o.event ?? 'client_message') as never, channel: o.channel ?? 'email',
  to: { memberId: o.memberId ?? null, name: 'Probe Client', email: o.email ?? 'probe.client@example.com', phone: o.phone ?? null },
  subject: 'Probe subject', body: 'Hello\n\nYour update is ready: https://example.com/x', href: '/projects/x', leadId: o.leadId ?? null, notificationId: null,
})
await step('delivery', async () => {
  ok(delivery.deliveryIsStandIn(), 'delivery: the outbox stand-in answers by default')
  const k1 = `s34:stand:${randomUUID()}`
  ok((await delivery.deliver(msg({ key: k1 }))) === 'sent', 'stand-in: a message is recorded as sent')
  const r1 = await byKey(k1)
  ok(r1?.provider === 'outbox' && r1.providerRef === null && sent.length === 0, 'stand-in: provider outbox, no provider id, no adapter called', r1)

  delivery.setDeliveryAdapter(realAdapter)
  ok(!delivery.deliveryIsStandIn() && slots.isPlugged('delivery') && slots.pluggedName('delivery') === 'probe-provider', 'setDeliveryAdapter plugs the slot (one answer for the process, globalThis)')
  const k2 = `s34:real:${randomUUID()}`
  ok((await delivery.deliver(msg({ key: k2 }))) === 'sent', 'real adapter: the message goes through it')
  const r2 = await byKey(k2)
  ok(r2?.provider === 'probe-provider' && !!r2.providerRef?.startsWith('wamid.probe-'), 'real adapter: its name and its provider id are on the row', r2)
  const html = sent.at(-1)?.html ?? ''
  ok(html.includes('<!DOCTYPE html>') && html.includes('Probe subject') && html.includes('href="https://example.com/x"') && !/openmaison/i.test(html.replace(/https?:\/\/[^"]+/g, '')), 'html(): the studio’s own page, the words’ link live, never OpenMaison’s name', html.slice(0, 300))
  ok((await delivery.deliver(msg({ key: k2 }))) === 'duplicate', 'a key already sent never goes twice')
  const kw = `s34:wa:${randomUUID()}`
  await delivery.deliver(msg({ key: kw, channel: 'whatsapp', email: null, phone: '91234567' }))
  ok(sent.at(-1)?.address === '+6591234567' && sent.at(-1)?.html === null, 'WhatsApp: the number as +65 and no HTML part')

  /* receipts */
  await delivery.applyReceipts([{ providerRef: r2!.providerRef!, status: 'delivered', at: Date.now(), error: null }])
  ok(!!(await byKey(k2))?.deliveredAt, 'a Delivered receipt marks the row by its provider id')
  await delivery.applyReceipts([{ providerRef: r2!.providerRef!, status: 'read', at: Date.now(), error: null }])
  const read = await byKey(k2)
  ok(!!read?.readAt && read.status === 'sent', 'a Read receipt marks it read (still sent)')
  ok((await delivery.applyReceipts([{ providerRef: r2!.providerRef!, status: 'read', at: Date.now(), error: null }])) === 0, 'a receipt told twice changes nothing')
  ok((await delivery.applyReceipts([{ providerRef: 'wamid.not-ours', status: 'read', at: Date.now(), error: null }])) === 0, 'a receipt for another studio’s message is left alone')

  /* a failure after it was sent, on its last try → the studio's runners hear message_failed */
  const k3 = `s34:late:${randomUUID()}`
  await delivery.deliver(msg({ key: k3 }))
  const r3 = await byKey(k3)
  await db.update(schema.notificationOutbox).set({ attempts: RETRY_MAX }).where(eq(schema.notificationOutbox.id, r3!.id))
  const before = (await db.select().from(schema.notifications).where(eq(schema.notifications.kind, 'message_failed'))).length
  await delivery.applyReceipts([{ providerRef: r3!.providerRef!, status: 'failed', at: Date.now(), error: '131026 · Message undeliverable' }])
  const r3b = await byKey(k3)
  const after = (await db.select().from(schema.notifications).where(eq(schema.notifications.kind, 'message_failed'))).length
  ok(r3b?.status === 'failed' && r3b.error?.includes('131026') && r3b.nextTryAt === null && after > before, 'a failed receipt on the last try: failed with the provider’s words, Owners and Admins hear message_failed', { r3b, before, after })
  const k4 = `s34:late2:${randomUUID()}`
  await delivery.deliver(msg({ key: k4 }))
  const r4 = await byKey(k4)
  await delivery.applyReceipts([{ providerRef: r4!.providerRef!, status: 'failed', at: Date.now(), error: 'Rate limited' }])
  ok((await byKey(k4))?.nextTryAt instanceof Date, 'a failed receipt with tries left is tried again by the sweep')

  /* a failing provider: retried, then the final failure — a client's tells the runners, an invitation tells its inviter */
  failNext = true
  const k5 = `s34:fail:${randomUUID()}`
  ok((await delivery.deliver(msg({ key: k5 }))) === 'failed', 'a failing provider: the message is failed')
  const r5 = await byKey(k5)
  ok(r5?.nextTryAt instanceof Date && r5.attempts === 0 && r5.error?.includes('probe'), '…with its words and its first retry due', r5)
  await db.update(schema.notificationOutbox).set({ attempts: RETRY_MAX - 1, nextTryAt: sec(Date.now() - 60_000) }).where(eq(schema.notificationOutbox.id, r5!.id))
  await delivery.releaseHeldMessages(new Date())
  const r5b = await byKey(k5)
  ok(r5b?.status === 'failed' && r5b.attempts === RETRY_MAX && r5b.nextTryAt === null, 'the last retry fails and none is due after it', r5b)

  const [inviter] = await db.select({ id: schema.members.id }).from(schema.members).where(and(eq(schema.members.role, 'Admin'), eq(schema.members.isActive, true))).limit(1)
  const [invitee] = await db.select({ id: schema.members.id, name: schema.members.name }).from(schema.members).where(eq(schema.members.role, 'Designer')).limit(1)
  const invId = randomUUID()
  await db.insert(schema.studioInvitations).values({ id: invId, memberId: invitee!.id, invitedBy: inviter!.id, fullName: invitee!.name, phone: null, email: 'fail.invite@example.com', role: 'Designer', token: randomUUID().replace(/-/g, ''), status: 'pending', expiresAt: new Date(Date.now() + 86_400_000), sentAt: new Date(), sendCount: 1, channels: 'email', createdAt: new Date() })
  const ki = `i:${invId}:1:email`
  await delivery.deliver({ key: ki, event: 'member_invite' as never, channel: 'email', to: { memberId: invitee!.id, name: invitee!.name, email: 'fail.invite@example.com', phone: null }, subject: 'Join', body: 'Join us', href: '/join/x', leadId: null, notificationId: null })
  const ri = await byKey(ki)
  await db.update(schema.notificationOutbox).set({ attempts: RETRY_MAX - 1, nextTryAt: sec(Date.now() - 60_000) }).where(eq(schema.notificationOutbox.id, ri!.id))
  await delivery.releaseHeldMessages(new Date())
  const told = await db.select().from(schema.notifications).where(and(eq(schema.notifications.kind, 'message_failed'), eq(schema.notifications.memberId, inviter!.id), like(schema.notifications.title, `The invitation to ${invitee!.name}%`)))
  ok(told.length > 0 && told[0]!.href?.includes(`/company/members?open=${invitee!.id}`), 'an invitation that finally fails tells whoever sent it, opening their row on Members', told)
  failNext = false

  /* NOTIFY_ALLOWLIST — only with a real provider */
  process.env.NOTIFY_ALLOWLIST = 'ok.listed@example.com, +65 9999 0000'
  const n0 = sent.length
  const kb = `s34:block:${randomUUID()}`
  ok((await delivery.deliver(msg({ key: kb, email: 'not.listed@example.com' }))) === 'blocked' && sent.length === n0, 'NOTIFY_ALLOWLIST: someone off the list is blocked, never handed to the provider')
  ok((await byKey(kb))?.error === 'recipient not in NOTIFY_ALLOWLIST' && (await byKey(kb))?.nextTryAt === null, '…written with 1.0’s reason and never tried again')
  ok((await delivery.deliver(msg({ email: 'OK.Listed@example.com' }))) === 'sent', '…someone on it is sent (case kept loose)')
  ok((await delivery.deliver(msg({ channel: 'whatsapp', email: null, phone: '99990000' }))) === 'sent', '…a listed number is sent')
  slots.serviceSlot('delivery', { name: 'x' }).reset()
  ok(delivery.deliveryIsStandIn(), 'reset: the stand-in answers again')
  ok((await delivery.deliver(msg({ email: 'not.listed@example.com' }))) === 'sent', 'the stand-in ignores the allow-list (it sends to no one anyway)')
  delete process.env.NOTIFY_ALLOWLIST
  ok(parseAllowlist('a@b.sg;  +65 8123 4567\n').active && allowedBy(parseAllowlist('+6581234567'), '+6581234567') && !allowedBy(parseAllowlist('+6581234567'), '+6581234568') && allowedBy(parseAllowlist(''), 'anyone@x.sg'), 'the allow-list reads 1.0’s format; unset = no limit')

  /* not_in_plan — a WhatsApp message on Free is never handed to an adapter, even a real one */
  delivery.setDeliveryAdapter(realAdapter)
  const subId = randomUUID()
  await db.insert(schema.subscriptions).values({ id: subId, planId: 'free', billingCycle: 'monthly', status: 'active', seats: 1, currentPeriodStart: sec(), currentPeriodEnd: sec(Date.now() + 30 * 86_400_000), trialEndsAt: null, cancelAtPeriodEnd: false, cancelledAt: null, graceUntil: null, createdBy: null, createdAt: sec(Date.now() + 86_400_000), updatedAt: sec() })
  const n1 = sent.length
  const kp = `s34:free:${randomUUID()}`
  ok((await delivery.deliver(msg({ key: kp, channel: 'whatsapp', email: null, phone: '91112222' }))) === 'not_in_plan' && sent.length === n1, 'on Free a WhatsApp is written not_in_plan and never reaches the provider')
  await db.update(schema.notificationOutbox).set({ status: 'failed', attempts: 0, nextTryAt: sec(Date.now() - 1000) }).where(eq(schema.notificationOutbox.key, kp))
  await delivery.releaseHeldMessages(new Date())
  ok((await byKey(kp))?.status === 'not_in_plan' && sent.length === n1, '…a retry on Free turns it back to not_in_plan, unsent')
  await db.delete(schema.subscriptions).where(eq(schema.subscriptions.id, subId))
  slots.serviceSlot('delivery', { name: 'x' }).reset()
})

/* ── 3. the WhatsApp webhook's reader and the replies that come in ── */
await step('inbound', async () => {
  const env = { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.A', status: 'delivered', timestamp: '1790000000' }, { id: 'wamid.B', status: 'failed', timestamp: '1790000001', errors: [{ code: 131047, title: 'Re-engagement message' }] }, { id: 'wamid.C', status: 'weird' }], messages: [{ id: 'wamid.M1', from: '6591234567', timestamp: '1790000002', type: 'text', text: { body: 'Hi there' }, context: { id: 'wamid.Z' } }, { id: 'wamid.M2', from: '6591234567', type: 'image', image: { caption: 'The tiles' } }] } }] }] }
  const r = readMetaEnvelope(env, 0)
  ok(r.receipts.length === 2 && r.receipts[0]!.status === 'delivered' && r.receipts[0]!.at === 1790000000000 && r.receipts[1]!.error === '131047 · Re-engagement message', 'Meta’s envelope: receipts with their times and a failure’s code and words (an unknown status left out)', r.receipts)
  ok(r.inbound.length === 2 && r.inbound[0]!.from === '+6591234567' && r.inbound[0]!.replyTo === 'wamid.Z' && r.inbound[1]!.text === 'The tiles' && r.inbound[1]!.kind === 'image', 'Meta’s envelope: replies with the number, the message answered and a picture’s caption', r.inbound)
  ok(readMetaEnvelope('nonsense').receipts.length === 0 && readMetaEnvelope(null).inbound.length === 0, 'a body that isn’t Meta’s reads as nothing')
  ok(sameSecret('abc', 'abc') && !sameSecret('abc', 'abd') && !sameSecret('ab', 'abc'), 'the token compare')
  ok(localDigits('+6591234567') === '91234567' && localDigits('+447700900123') === '447700900123', 'a Singapore number reads as its eight digits')

  /* a project's client (Benjamin Han in the demo) and a lead with no project */
  const withProject = (await client.execute(`select l.id, l.phone, l.name, p.id pid from leads l join projects p on p.lead_id = l.id and p.deleted_at is null where l.deleted_at is null and l.phone <> '' and (select count(*) from leads x where x.phone = l.phone and x.deleted_at is null) = 1 and not exists (select 1 from homeowner_profiles h where h.phone = l.phone) limit 1`)).rows[0]
  const bare = (await client.execute(`select l.id, l.phone, l.name from leads l where l.deleted_at is null and l.phone <> '' and not exists (select 1 from projects p where p.lead_id = l.id and p.deleted_at is null) and (select count(*) from leads x where x.phone = l.phone and x.deleted_at is null) = 1 and not exists (select 1 from homeowner_profiles h where h.phone = l.phone) and not exists (select 1 from members m where m.phone = l.phone) limit 1`)).rows[0]
  const [member] = await db.select({ phone: schema.members.phone }).from(schema.members).where(like(schema.members.phone, '9%')).limit(1)
  const ref = () => `wamid.in-${randomUUID()}`
  const a = await fileInbound([{ providerRef: ref(), from: `+65${String(bare!.phone)}`, kind: 'text', text: 'Can we move Saturday?', replyTo: null, at: Date.now() }])
  const lm = a[0]?.messageId ? (await db.select().from(schema.leadMessages).where(eq(schema.leadMessages.id, a[0].messageId)))[0] : undefined
  ok(a[0]?.status === 'filed' && lm?.leadId === bare!.id && lm.authorKind === 'client' && lm.body === 'Can we move Saturday?', 'a reply from a lead’s number is filed in the lead’s conversation, as the client', { a, lm })
  const b = await fileInbound([{ providerRef: ref(), from: `+65${String(withProject!.phone)}`, kind: 'text', text: 'Thanks, received', replyTo: null, at: Date.now() }])
  const pm = b[0]?.messageId ? (await db.select().from(schema.projectMessages).where(eq(schema.projectMessages.id, b[0].messageId)))[0] : undefined
  ok(b[0]?.status === 'filed' && pm?.projectId === String(withProject!.pid) && pm.channel === 'client' && (pm.meta as { via?: string } | null)?.via === 'whatsapp', 'once Won it lands in the project’s Client conversation, marked as WhatsApp’s', { b, pm })
  const bell = await db.select().from(schema.notifications).where(and(eq(schema.notifications.kind, 'chat_message'), like(schema.notifications.href, `/projects/${String(withProject!.pid)}/messages%`))).orderBy(desc(schema.notifications.createdAt)).limit(1)
  ok(bell.length === 1, 'the team hears it on the bell, as a message from the portal', bell)
  /* a reply to one of our own messages to a client finds its lead by the wamid it answers */
  const ours = `wamid.ours-${randomUUID()}`
  await db.insert(schema.notificationOutbox).values({ id: randomUUID(), key: `s34:ours:${ours}`, event: 'client_message', channel: 'whatsapp', memberId: null, toName: 'X', toAddress: '+6580000000', subject: null, body: 'x', href: null, leadId: bare!.id, status: 'sent', provider: 'probe', providerRef: ours, createdAt: new Date(), attempts: 0 })
  const c = await fileInbound([{ providerRef: ref(), from: '+6580000000', kind: 'text', text: 'Yes please', replyTo: ours, at: Date.now() }])
  ok(c[0]?.status === 'filed' && c[0].leadId === bare!.id, 'a reply to one of the studio’s messages is placed by the message it answers', c)
  const again = await fileInbound([{ providerRef: (await db.select().from(schema.inboundMessages).orderBy(desc(schema.inboundMessages.receivedAt)).limit(1))[0]!.providerRef, from: '+6580000000', kind: 'text', text: 'Yes please', replyTo: ours, at: Date.now() }])
  ok(again[0]?.status === 'duplicate', 'the same message delivered twice is kept once')
  const d = await fileInbound([{ providerRef: ref(), from: '+6580001234', kind: 'text', text: 'Who is this?', replyTo: null, at: Date.now() }])
  ok(d[0]?.status === 'unmatched' && !d[0].messageId, 'a number on no lead is kept as it came, filed nowhere')
  if (member?.phone) { const e = await fileInbound([{ providerRef: ref(), from: `+65${member.phone}`, kind: 'text', text: 'ok', replyTo: null, at: Date.now() }]); ok(e[0]?.status === 'from_member', 'a member’s own number is kept, not filed as a client', e) }
  const f = await fileInbound([{ providerRef: ref(), from: `+65${String(bare!.phone)}`, kind: 'audio', text: null, replyTo: null, at: Date.now() }])
  ok(f[0]?.status === 'not_text' && !f[0].messageId, 'a voice note with no words is kept (its media is the provider’s to fetch)')

  /* the route itself, in process */
  const route = await import('@/app/api/webhooks/whatsapp/route')
  const { NextRequest } = await import('next/server')
  delete process.env.WHATSAPP_WEBHOOK_SECRET
  ok((await route.POST(new NextRequest('http://x/api/webhooks/whatsapp?token=a', { method: 'POST', body: '{}' }))).status === 503, 'route: no secret set — the webhook is off (503)')
  process.env.WHATSAPP_WEBHOOK_SECRET = 'seam-secret'
  ok((await route.POST(new NextRequest('http://x/api/webhooks/whatsapp?token=nope', { method: 'POST', body: '{}' }))).status === 401, 'route: a wrong token is refused (401)')
  ok((await route.POST(new NextRequest('http://x/api/webhooks/whatsapp?token=seam-secret', { method: 'POST', body: 'not json' }))).status === 200, 'route: a body that isn’t JSON answers 200 (no day of retries)')
  const v = await route.GET(new NextRequest('http://x/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=seam-secret&hub.challenge=12345'))
  ok(v.status === 200 && (await v.text()) === '12345', 'route: Meta’s subscription check echoes its challenge')
  /* an adapter with its own envelope (and signature) reads it instead */
  delivery.setDeliveryAdapter({ ...realAdapter, readWebhook: (raw) => (raw.headers.get('x-probe-sig') === 'good' ? { receipts: [], inbound: [] } : null) })
  ok((await route.POST(new NextRequest('http://x/api/webhooks/whatsapp?token=seam-secret', { method: 'POST', body: '{}', headers: { 'x-probe-sig': 'bad' } }))).status === 401, 'route: the adapter’s own reader refuses a bad signature')
  ok((await route.POST(new NextRequest('http://x/api/webhooks/whatsapp?token=seam-secret', { method: 'POST', body: '{}', headers: { 'x-probe-sig': 'good' } }))).status === 200, '…and takes a good one')
  slots.serviceSlot('delivery', { name: 'x' }).reset()
  delete process.env.WHATSAPP_WEBHOOK_SECRET
})

/* ── 4. the branded email page ── */
await step('email html', async () => {
  const h = emailHtml({ subject: 'A <b>bold</b> "subject"', body: 'Line one\n\nSee https://example.com/a?b=1&c=2.', link: 'https://example.com/rec', settingsLink: null }, { studio: 'Arthaus & Co', logoUrl: null, ink: 'red;}', grey: '#666', accent: '#00AA00', contact: ['6123 4567', ''] })
  ok(h.includes('A &lt;b&gt;bold&lt;/b&gt; &quot;subject&quot;') && h.includes('Arthaus &amp; Co') && !h.includes('<b>bold'), 'every value is escaped')
  ok(h.includes('href="https://example.com/a?b=1&amp;c=2"') && !h.includes('c=2.</a>'), 'a URL in the words is a link (its trailing full stop left out)')
  ok(h.includes('#00AA00') && h.includes('#1A1A1A') && !h.includes('red;}'), 'the studio’s accent; a colour that isn’t one falls back')
  ok(h.includes('Open it') && h.includes('https://example.com/rec'), 'the record’s own link line when the words don’t carry it')
  ok(!emailHtml({ subject: 's', body: 'b', link: null, settingsLink: 'https://x/profile' }, { studio: 'S', logoUrl: null, ink: '#000', grey: '#666', accent: '#000', contact: [] }).includes('Open it'), '…and none when there is no record')
})

/* ── 5. sign-in, the tenancy ── */
await step('sign-in and studios', async () => {
  ok(provider.isStandInProvider() && (await provider.signInProvider().checkCode({ kind: 'phone', value: '91234567' }, '424242')), 'the sign-in stand-in takes any six digits')
  const tried: string[] = []
  provider.setSignInProvider({ name: 'probe-sms', sendCode: async (c) => { tried.push(`send:${c.value}`); return { ok: true } }, checkCode: async (_c, code) => code === '135790' })
  ok(!provider.isStandInProvider() && slots.pluggedName('sign-in') === 'probe-sms', 'setSignInProvider plugs the sign-in slot')
  ok(!(await provider.signInProvider().checkCode({ kind: 'phone', value: '91234567' }, '424242')) && (await provider.signInProvider().checkCode({ kind: 'phone', value: '91234567' }, '135790')), 'a real provider decides the code')
  slots.serviceSlot('sign-in', { name: 'x' }).reset()
  ok(provider.isStandInProvider(), 'reset: the stand-in answers again')
  let asked = 0
  studios.setStudioProvisioner({ name: 'probe-tenancy', create: async () => { asked++; return { key: 'probe-studio', ownerId: 'probe-owner' } } })
  const made = await studios.createStudio({ kind: 'studio', studioName: 'Probe', ownerName: 'P', phone: '91234567', email: null }, { via: 'sign-up' })
  ok(asked === 1 && 'key' in made && made.key === 'probe-studio' && !studios.studiosAreStandIn(), 'setStudioProvisioner: sign-up’s one call goes to the tenancy plugged in')
  slots.serviceSlot('studios', { name: 'x' }).reset()
})

/* ── 6. payments ── */
await step('payments', async () => {
  ok(payments.paymentsAreStandIn(), 'payments: the demo checkout answers by default')
  const [owner] = await db.select({ id: schema.members.id }).from(schema.members).where(and(eq(schema.members.role, 'Owner'), eq(schema.members.isActive, true))).limit(1)
  const sid = randomUUID()
  await db.insert(schema.billingCheckoutSessions).values({ id: sid, memberId: owner!.id, kind: 'topup', planId: null, seats: 1, period: 'monthly', status: 'pending', creditsRequested: 500, createdAt: new Date() })
  const bal0 = (await db.select().from(schema.studioCreditBalances).limit(1))[0]
  const f1 = await checkout.finishCheckout(sid)
  const bal1 = (await db.select().from(schema.studioCreditBalances).limit(1))[0]
  const sess = (await db.select().from(schema.billingCheckoutSessions).where(eq(schema.billingCheckoutSessions.id, sid)))[0]
  ok('ok' in f1 && f1.granted === 500 && sess?.status === 'completed' && (bal1!.topupCredits - bal0!.topupCredits) === 500, 'a paid checkout lands once: the session completed, the credits added', { f1, sess })
  ok('error' in (await checkout.finishCheckout(sid)) && (await db.select().from(schema.studioCreditBalances).limit(1))[0]!.topupCredits === bal1!.topupCredits, '…a second webhook finishes nothing twice')
  const charged: number[] = []
  payments.setPaymentProvider({ name: 'probe-pay', checkout: async (a) => ({ url: `https://pay.example/${a.sessionId}` }), charge: async (o) => { charged.push(o.amountCents); return o.amountCents > 1_000_000 ? { error: 'Card declined' } : { ok: true } }, readWebhook: async (raw) => (raw.headers.get('x-sig') === 'ok' ? { paid: [], failed: [] } : null), billingPortal: async () => 'https://pay.example/portal' })
  ok(!payments.paymentsAreStandIn(), 'setPaymentProvider plugs the payments slot')
  const { completeCheckout, startTopUp, updateCard } = await import('@/app/credits/actions')
  const s2 = await startTopUp({ credits: 1000 })
  ok('payUrl' in s2 && typeof s2.payUrl === 'string' && s2.payUrl.startsWith('https://pay.example/'), 'with a real provider a top-up opens its checkout page (payUrl)', s2)
  ok('sessionId' in s2 && 'error' in (await completeCheckout(s2.sessionId)), '…and the browser can no longer complete a checkout itself')
  const u = await updateCard()
  ok('url' in u && u.url === 'https://pay.example/portal', 'Manage billing’s changes open the provider’s billing page')
  const route = await import('@/app/api/webhooks/payments/route')
  const { NextRequest } = await import('next/server')
  ok((await route.POST(new NextRequest('http://x/api/webhooks/payments', { method: 'POST', body: '{}', headers: { 'x-sig': 'bad' } }))).status === 401, 'the payments webhook refuses a call its adapter can’t verify')
  ok((await route.POST(new NextRequest('http://x/api/webhooks/payments', { method: 'POST', body: '{}', headers: { 'x-sig': 'ok' } }))).status === 200, '…and takes one it can')
  ok(await checkout.failCheckout((s2 as { sessionId: string }).sessionId), 'a failed payment keeps its session as failed')
  slots.serviceSlot('payments', { name: 'x' }).reset()
  ok(payments.paymentsAreStandIn(), 'reset: the demo checkout again')
})

/* ── 7. file storage ── */
await step('storage', async () => {
  const [file] = await db.select({ id: schema.leadFiles.id, leadId: schema.leadFiles.leadId }).from(schema.leadFiles).limit(1)
  const pic = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const objects = new Map<string, string>()
  fileStore.setFileStore({ name: 'probe-store', put: async (o) => { const ref = `obj/${o.fileId}/${o.part}`; objects.set(ref, o.dataUrl); return ref }, get: async (ref) => objects.get(ref) ?? null })
  const id = randomUUID()
  await db.insert(schema.leadFiles).values({ id, leadId: file!.leadId, kind: 'image', name: 'probe.png', thumb: `/files/img/${id}`, createdAt: new Date(), parentId: null, ownerId: null, sizeBytes: 68, mime: 'image/png', updatedAt: new Date() })
  await fileStore.keepBytes(db, id, pic)
  const row = (await db.select().from(schema.leadFileImages).where(eq(schema.leadFileImages.fileId, id)))[0]
  ok(row?.data === `store:obj/${id}/bytes` && objects.get(`obj/${id}/bytes`) === pic, 'a plugged store keeps the bytes; the table keeps only its reference')
  ok((await fileStore.storedBytes(id)) === pic, 'storedBytes asks the store for them back')
  const copy = randomUUID()
  await db.insert(schema.leadFiles).values({ id: copy, leadId: file!.leadId, kind: 'image', name: 'copy.png', thumb: `/files/img/${copy}`, createdAt: new Date(), parentId: null, ownerId: null, sizeBytes: 68, mime: 'image/png', updatedAt: new Date() })
  const c = await fileStore.copyStored(db, id, copy)
  ok(c.bytes && objects.get(`obj/${copy}/bytes`) === pic, 'a copy keeps its own object')
  const old = (await client.execute(`select file_id from lead_file_images where data like 'data:%' limit 1`)).rows[0]
  ok(!old || ((await fileStore.storedBytes(String(old.file_id))) ?? '').startsWith('data:'), 'rows written before the swap read as they were')
  slots.serviceSlot('storage', { name: 'x' }).reset()
  const plain = randomUUID()
  await db.insert(schema.leadFiles).values({ id: plain, leadId: file!.leadId, kind: 'image', name: 'p.png', thumb: `/files/img/${plain}`, createdAt: new Date(), parentId: null, ownerId: null, sizeBytes: 68, mime: 'image/png', updatedAt: new Date() })
  await fileStore.keepBytes(db, plain, pic)
  ok((await db.select().from(schema.leadFileImages).where(eq(schema.leadFileImages.fileId, plain)))[0]?.data === pic, 'the stand-in keeps the data URL itself, as before')
})

/* ── 8. PDF files ── */
await step('pdf', async () => {
  ok(paperPath('/projects/a/invoices/b?print=1') === '/projects/a/invoices/b' && paperPath('/quote/tok?x=1&print=1') === '/quote/tok?x=1', 'a paper’s address keeps its query without print')
  ok([null, '', '//evil.com/x', '/files/raw/a', '/quote/%2e%2e', '/projects/a/../b/invoices/c', 'https://x/quote/a', '/settings'].every((p) => paperPath(p) === null), 'anything that isn’t a paper page is refused')
  ok(['/quotes/q/preview', '/contracts/c/preview', '/sign/tok', '/sign/tok/quote', '/invoice/t', '/receipt/t', '/po/t', '/confirm/t', '/planner/l/print', '/my/home/money/invoice/i', '/my/home/choices/receipt/s', '/projects/p/floor-plan/f', '/projects/p/credit-notes/c', '/projects/p/purchase-orders/o', '/projects/p/selection-receipts/s', '/projects/p/receipts/r'].every((p) => paperPath(p) === p), 'every paper page the app prints is allowed')
  const route = await import('@/app/papers/pdf/route')
  const { NextRequest } = await import('next/server')
  ok((await route.GET(new NextRequest('http://x/papers/pdf?path=/invoice/abc'))).status === 501, 'stand-in: 501 — the browser prints')
  let seen: { url: string; cookie: string | null } | null = null
  pdf.setPdfRenderer({ name: 'probe-pdf', render: async (o) => { seen = o; return new TextEncoder().encode('%PDF-1.4 probe') } })
  const res = await route.GET(new NextRequest('http://x/papers/pdf?path=/invoice/abc?print=1', { headers: { cookie: 'om_session=abc.d' } }))
  ok(res.status === 200 && res.headers.get('content-type') === 'application/pdf' && /attachment; filename="abc\.pdf"/.test(res.headers.get('content-disposition') ?? '') && (await res.text()).startsWith('%PDF'), 'a plugged renderer: the PDF file, as a download', res.headers)
  ok(!!seen && (seen as { url: string }).url.endsWith('/invoice/abc') && (seen as { cookie: string | null }).cookie === 'om_session=abc.d', '…drawn at the page’s own address with the visitor’s own cookies', seen)
  pdf.setPdfRenderer({ name: 'probe-pdf', render: async () => { throw new Error('Chromium gone') } })
  ok((await route.GET(new NextRequest('http://x/papers/pdf?path=/invoice/abc'))).status === 502, 'a renderer that fails answers 502 (print from the page)')
  ok((await route.GET(new NextRequest('http://x/papers/pdf?path=/files/raw/x'))).status === 400, 'a path that isn’t a paper answers 400')
  slots.serviceSlot('pdf', { name: 'x' }).reset()
})

/* ── 9. the studio's calendar, transcription ── */
await step('calendar and transcription', async () => {
  const lead = (await client.execute(`select lead_id from meetings where deleted_at is null and status <> 'cancelled' group by lead_id limit 1`)).rows[0]
  ok(!(await cal.syncLeadMeetings(String(lead!.lead_id))), 'stand-in: no calendar, nothing synced')
  const got: { leadId: string; n: number; titles: string[]; members: number }[] = []
  cal.setCalendarSync({ name: 'probe-calendar', sync: async (leadId, events) => { got.push({ leadId, n: events.length, titles: events.map((e) => e.title), members: events.reduce((n, e) => n + e.members.length, 0) }) } })
  ok(await cal.syncLeadMeetings(String(lead!.lead_id)), 'a plugged calendar is handed the lead’s meetings')
  const live = Number((await client.execute({ sql: `select count(*) n from meetings where lead_id = ? and deleted_at is null and status <> 'cancelled'`, args: [String(lead!.lead_id)] })).rows[0]!.n)
  ok(got[0]?.n === live && got[0].titles.every((t) => t.includes(' · ')) && got[0].members > 0, 'every meeting not cancelled or deleted, titled and with its members', got)
  cal.queueCalendarSync(String(lead!.lead_id))
  await new Promise((r) => setTimeout(r, 200))
  ok(got.length === 2, 'queueCalendarSync outside a request syncs at once (after() inside one)')
  slots.serviceSlot('calendar', { name: 'x' }).reset()
  ok('error' in (await tr.transcribeRecording({ name: 'a.m4a', dataUrl: 'data:audio/mp4;base64,AAAA' })), 'stand-in transcriber: no words, said')
  tr.setTranscriber({ name: 'probe-stt', transcribe: async () => ({ text: 'Dane: Hello\nClient: Hi' }) })
  const t = await tr.transcribeRecording({ name: 'a.m4a', dataUrl: 'data:audio/mp4;base64,AAAA' })
  ok('text' in t && t.text.startsWith('Dane:') && !tr.transcriberIsStandIn(), 'a plugged transcriber answers the words')
  tr.setTranscriber({ name: 'probe-stt', transcribe: async () => { throw new Error('quota') } })
  ok('error' in (await tr.transcribeRecording({ name: 'a.m4a', dataUrl: 'x' })), '…and a throw is an error, never a crash')
  slots.serviceSlot('transcription', { name: 'x' }).reset()
})

/* ── 10. feeds, Xero, the sweep, the cron guard ── */
await step('feeds xero sweep', async () => {
  ok('skipped' in ((await sweep.runJobs(['feeds'])).jobs.feeds ?? {}), 'feeds job: skipped while no source is plugged')
  const rss = `<?xml version="1.0"?><rss><channel><item><title>HDB resale prices rise</title><link>https://news.example/hdb</link><pubDate>Mon, 12 Oct 2026 08:00:00 GMT</pubDate><description>Prices rose 1.2%.</description></item></channel></rss>`
  feeds.setFeedSource({ name: 'probe-feeds', fetchText: async () => rss })
  const pulled = await feeds.pullFeeds(Date.now())
  ok(typeof pulled.headlines === 'number' && pulled.headlines > 0 && pulled.marketplace === 'off', 'a plugged source: Industry News headlines written through the one mapper; the feeds it lacks stay off', pulled)
  const hl = (await client.execute(`select title, category, author from market_insights where category = 'industry-news' and removed_at is null`)).rows
  ok(hl.some((r) => String(r.title) === 'HDB resale prices rise'), 'the headline is a Market Insights article in Industry News', hl)
  feeds.setFeedSource({ name: 'probe-feeds', fetchText: async () => { throw new Error('offline') } })
  const r2 = await sweep.runJobs(['feeds'])
  const still = (await client.execute(`select count(*) n from market_insights where category = 'industry-news' and removed_at is null`)).rows[0]!.n
  ok('error' in (r2.jobs.feeds ?? {}) && Number(still) === hl.length, 'every source failing: the job says so and the headlines stay (an empty answer never empties the copy)', { r2, still })
  slots.serviceSlot('feeds', { name: 'x' }).reset()

  ok('skipped' in ((await sweep.runJobs(['accounting'])).jobs.accounting ?? {}), 'accounting job: skipped while Xero is simulated')
  await xero.saveXeroSettings({ connected: true, connectedAt: Date.now(), connectedBy: null, organisations: [], auto: true, accounts: {}, taxes: {}, lastSyncAt: null })
  const pushed: string[] = []
  xero.setAccountingProvider({ name: 'probe-xero', push: async (item) => { pushed.push(item.kind); return { outcome: 'created', message: null, remoteId: `XERO-${item.id.slice(0, 6)}` } } })
  const job = await sweep.runJobs(['accounting'])
  const links = (await client.execute(`select remote_id from xero_links where remote_id like 'XERO-%'`)).rows
  ok('ran' in (job.jobs.accounting ?? {}) && pushed.length > 0 && links.length === pushed.length, 'a plugged Xero: the sweep pushes what is due through it and keeps Xero’s ids', { job, pushed: pushed.length, links: links.length })
  slots.serviceSlot('accounting', { name: 'x' }).reset()

  const k0 = Number((await client.execute(`select count(*) n from notification_outbox where key like 'd:%'`)).rows[0]!.n)
  const a = await sweep.runJobs()
  const k1 = Number((await client.execute(`select count(*) n from notification_outbox where key like 'd:%'`)).rows[0]!.n)
  const b = await sweep.runJobs()
  const k2 = Number((await client.execute(`select count(*) n from notification_outbox where key like 'd:%'`)).rows[0]!.n)
  /* (pending modules, a deliberate change of this rule) S41b-3 added 1.0's anon-sweep and anon-storage-gc as two jobs — every job runs, however many */
  ok(Object.keys(a.jobs).length === sweep.JOB_KEYS.length && sweep.JOB_KEYS.length >= 8 && k1 >= k0 && k2 === k1 && ((b.jobs.messages as { ran: number }).ran === 0), 'the sweep runs every job, and a second run sends nothing new (idempotent)', { a, b, k0, k1, k2 })
  ok(!isAuthorizedCron(null, { secret: undefined, production: true }) && !isAuthorizedCron('Bearer x', { secret: 'y', production: true }) && isAuthorizedCron('Bearer y', { secret: 'y', production: true }) && isAuthorizedCron(null, { secret: undefined, production: false }) && !isAuthorizedCron(null, { secret: 'y', production: false }), 'the cron guard: fails closed in production, a set secret is always asked')
})

/* ── 11. the lead webhook's reader ── */
await step('lead webhook reader', async () => {
  const g = readWebhookPayload({ google_key: 'k', lead_id: 'L1', user_column_data: [{ column_id: 'FIRST_NAME', string_value: 'Wei' }, { column_id: 'LAST_NAME', string_value: 'Tan' }, { column_id: 'PHONE_NUMBER', string_value: '+65 9123 4567' }, { column_id: 'what_reno', string_value: 'Kitchen' }, { column_id: 'CITY', string_value: 'Singapore' }] }, 'google_ads')
  ok(g.name === 'Wei Tan' && g.phone === '+6591234567' && g.externalId === 'L1' && g.message?.includes('what_reno → Kitchen') && g.message.includes('CITY → Singapore'), 'Google’s Lead Form: the name, the number, the other columns and its questions in the notes', g)
  ok(readWebhookPayload({ is_test: true }, 'google_ads').isTest, 'Google’s test lead is known as one')
  const p = readWebhookPayload({ full_name: 'A B', mobile: '9123 4567', budget_cents: 5000000, propertyType: 'Condo', comments: 'hi' }, 'generic')
  ok(p.name === 'A B' && p.phone === '91234567' && p.budget === '50000' && p.propertyType === 'Condo' && p.message === 'hi', '1.0’s aliases; budget_cents alone is cents', p)
})

console.log(JSON.stringify({ done: true, pass, fail }))
process.exit(fail ? 1 : 0)
