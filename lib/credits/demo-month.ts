/**
 * (pending modules S08b, 2026-10-11 — moved forward from S19, `held:ai-credits`: "the demo credits month riding the demo day on restore")
 * The demo's AI credits month rides the demo day, as open tasks' due dates do (REG-341).
 *
 * R63 wrote the demo's credits story on 28 Sep 2026: Free from 1 Aug, Kevin Ng's five Fast renders on 14 Aug, the 1,000 top-up on 20 Aug,
 * Pro — Studio from 10 Sep and the showroom's High render on 14 Sep — so on its day the month (10 Sep → 10 Oct) was 18 days in, with this
 * month's and last month's usage both there to read. A month that has ended is rolled by the app on the first read (`ensurePeriod`):
 * a new, empty month and a `credits_renewed` bell row — the demo then reads "nothing used this month" and every probe's first page writes.
 *
 * So the demo's whole credits story — the plan's months, the ledger, the invoices, the checkouts, the asks, the monthly amounts, the alerts'
 * month, the credits bell rows — moves by whole days, keeping its shape:
 *  · on restore (`restoreBaseline`): by the same whole days as open tasks (demoDay → today); and when the snapshot's own month had already
 *    ended on its demo day, on to where R63 made it (`reanchorDays`);
 *  · in the demo data (repair R111): only when the demo's month has ended, never rolled, and is still R63's shape — the plan R63 wrote is
 *    the current one and its period is the balance's (a studio's own plan has another id; a month the app rolled has not ended).
 * The renders themselves keep their own day (only the charges ride), as everything but an open task keeps its stamp on restore.
 * Pure — no database; the restore and the repair each write it their own way.
 */

const DAY_S = 86_400

/** How far into its month the demo reads: R63's day (28 Sep) in its month (10 Sep → 10 Oct). */
export const DEMO_DAYS_IN = 18

/** The AI credits bell rows (lib/notifications/model.ts) — they tell the same story, so they ride with it. */
export const CREDIT_BELL_KINDS = ['credits_low', 'credits_out', 'credit_request', 'credit_request_answered', 'credit_amount_reached', 'credits_renewed', 'payment_failed', 'credit_receipt'] as const

/** Every stamp of the credits story, table by table (unix seconds); `only` keeps a shared table to the credits' rows. */
export const DEMO_CREDIT_TIMES: { table: string; key: string; times: readonly string[]; only?: { column: string; values: readonly string[] } }[] = [
  { table: 'subscriptions', key: 'id', times: ['current_period_start', 'current_period_end', 'trial_ends_at', 'cancelled_at', 'grace_until', 'created_at', 'updated_at'] },
  { table: 'studio_credit_balances', key: 'id', times: ['period_start', 'period_end', 'enforcement_starts_at', 'updated_at'] },
  { table: 'credit_ledger', key: 'id', times: ['created_at'] },
  { table: 'studio_member_credit_caps', key: 'member_id', times: ['updated_at'] },
  { table: 'billing_checkout_sessions', key: 'id', times: ['created_at', 'completed_at'] },
  { table: 'invoices', key: 'id', times: ['billing_period_start', 'billing_period_end', 'issued_at', 'paid_at'] },
  { table: 'credit_requests', key: 'id', times: ['created_at', 'answered_at'] },
  { table: 'notifications', key: 'id', times: ['created_at', 'read_at'], only: { column: 'kind', values: CREDIT_BELL_KINDS } },
  { table: 'notification_outbox', key: 'id', times: ['created_at', 'send_after', 'next_try_at'], only: { column: 'event', values: CREDIT_BELL_KINDS } },
]

/**
 * (S43B · F1-10 — her "fix all the pending things" 2026-10-15, as recommended; S42A's probe found the balance ~1.5 h ahead of now after a restore)
 * The credits story's bookkeeping stamps — when the balance, the plan or a member's cap was last written. The repairs touch them on the demo day,
 * so they can sit later in that day than anything the story tells (the ledger's newest charge): a whole-day move capped by the story then lands
 * them a few hours past now. No page reads them, and moving the whole story a day less for them would part Kevin Ng's renders from his lead, so
 * each is held at now instead — by the restore (`clampCreditBookkeeping`) and by repair R111.
 */
export const CREDIT_BOOKKEEPING: readonly { table: string; column: string }[] = [
  { table: 'studio_credit_balances', column: 'updated_at' },
  { table: 'subscriptions', column: 'updated_at' },
  { table: 'studio_member_credit_caps', column: 'updated_at' },
]
/** The snapshot's bookkeeping stamps held at `nowSec` (unix seconds) — never after it. Returns new row lists; the input is left as it is. */
export function clampCreditBookkeeping(base: SnapshotRows, nowSec: number): SnapshotRows {
  const out: SnapshotRows = { ...base }
  for (const { table, column } of CREDIT_BOOKKEEPING) {
    const rows = base[table]
    if (!rows) continue
    out[table] = rows.map((r) => { const v = num(r[column]); return v != null && v > nowSec ? { ...r, [column]: nowSec } : r })
  }
  return out
}

/** Local midnight of `sec`'s calendar day (the process clock), in seconds. */
function dayStart(sec: number): number {
  const d = new Date(sec * 1000)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000)
}
const daysBetween = (fromSec: number, toSec: number) => Math.round((dayStart(toSec) - dayStart(fromSec)) / DAY_S)   // round: a DST edge is ±1h

/**
 * The whole days that move a month [start, end) so `now` sits DEMO_DAYS_IN days into it, as R63 made it — capped so nothing the story
 * holds (`latest`, its newest stamp) lands after `now`. null when no whole-day move can do both (the story is newer than its month).
 */
export function reanchorDays(o: { periodStart: number; periodEnd: number; latest: number; now: number }): number | null {
  const target = daysBetween(o.periodStart, o.now) - DEMO_DAYS_IN
  const cap = Math.floor((o.now - o.latest) / DAY_S)
  const d = Math.min(target, cap)
  return o.periodStart + d * DAY_S <= o.now && o.periodEnd + d * DAY_S > o.now ? d : null
}

/** An invoice's number names the month it was issued ("INV-202609-0002", lib/credits/ledger.ts) — the month follows a moved date. */
export function invoiceNumberAt(number: string, issuedAt: number): string {
  const m = /^INV-\d{6}-(\d+)$/.exec(number)
  if (!m) return number
  const d = new Date(issuedAt * 1000)
  return `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${m[1]}`
}

/** The alerts' month (settings `credit_alerts`, { period: "<period start, seconds>", sent }) — moved with the period it names. */
export function shiftAlertsValue(value: string, days: number): string {
  try {
    const v = JSON.parse(value) as { period?: unknown }
    if (typeof v.period !== 'string' || !/^\d+$/.test(v.period)) return value
    return JSON.stringify({ ...v, period: String(Number(v.period) + days * DAY_S) })
  } catch { return value }
}

/** A ledger row's period ref ("period:<seconds>", a month's boundary) — moved with it. */
export function shiftPeriodRef(ref: unknown, days: number): unknown {
  return typeof ref === 'string' && /^period:\d+$/.test(ref) ? `period:${Number(ref.slice(7)) + days * DAY_S}` : ref
}

export type SnapshotRows = Partial<Record<string, Record<string, unknown>[]>>
type Row = Record<string, unknown>
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'bigint' ? Number(v) : null)

/**
 * The snapshot's credits story moved by `days` (restoreBaseline): every stamp, the ledger's period refs, the invoice numbers' months
 * (kept as they were if moving them would make two the same), the alerts' month. Returns new row lists; the input is left as it is.
 */
export function shiftCreditSnapshot(base: SnapshotRows, days: number): SnapshotRows {
  if (!days) return base
  const out: SnapshotRows = { ...base }
  for (const t of DEMO_CREDIT_TIMES) {
    const rows = base[t.table]
    if (!rows) continue
    out[t.table] = rows.map((r) => {
      if (t.only && !t.only.values.includes(String(r[t.only.column]))) return r
      const n: Row = { ...r }
      for (const c of t.times) { const v = num(r[c]); if (v != null) n[c] = v + days * DAY_S }
      if (t.table === 'credit_ledger') n.ref_id = shiftPeriodRef(r.ref_id, days)
      return n
    })
  }
  const inv = out.invoices
  if (inv) {
    const renamed = inv.map((r) => { const at = num(r.issued_at); return typeof r.invoice_number === 'string' && at != null ? invoiceNumberAt(r.invoice_number, at) : r.invoice_number })
    if (new Set(renamed).size === renamed.length) out.invoices = inv.map((r, i) => ({ ...r, invoice_number: renamed[i] }))
  }
  const settings = out.settings
  if (settings) out.settings = settings.map((r) => (r.key === 'credit_alerts' && typeof r.value === 'string' ? { ...r, value: shiftAlertsValue(r.value, days) } : r))
  return shiftPaidWork(out, days, paidWorkIds(base))
}

/** The snapshot's own month: the balance row's period, and the newest stamp of the story (for `reanchorDays`) — the paid work's too, so a
    move never lands a version, a pin or a client's answer after now (pending modules S19). */
export function snapshotMonth(base: SnapshotRows): { periodStart: number; periodEnd: number; latest: number } | null {
  const bal = (base.studio_credit_balances ?? []).find((r) => r.id === 'studio')
  const periodStart = num(bal?.period_start), periodEnd = num(bal?.period_end)
  if (periodStart == null || periodEnd == null) return null
  let latest = periodStart
  for (const r of base.credit_ledger ?? []) { const at = num(r.created_at); if (at != null && at > latest) latest = at }
  const ids = paidWorkIds(base)
  for (const t of PAID_WORK_TIMES) {
    for (const r of base[t.table] ?? []) {
      if (!ids[t.table]?.has(String(r[t.key]))) continue
      for (const c of t.times) { if (c === 'expires_at') continue; const at = num(r[c]); if (at != null && at > latest) latest = at }
    }
  }
  return { periodStart, periodEnd, latest }
}

/* ── (pending modules S19 — the S08b note: "the charges move with the demo day but renders keep their own day (REG-341), so Usage ›
   Activity can date a charge after the version it paid for") ──────────────────────────────────────────────────────────────────────────
   Decided: **the AI work the credits story paid for rides with its charges.** A charge is taken when the work starts (Q-31), so a render's
   charge and the render are one moment; the demo's month can only hold today if its charges move, so the work they paid for moves with them
   — the Visualizer designs whose renders the ledger charged, and everything dated inside them: their rooms, their versions, the pins on
   those versions (and their replies), their client links, what the client answered there, the renders filed in the lead's Files, and the
   bell rows those answers rang — all by the same days, so their order and their gaps (a link that closed stays closed) are kept. Nothing
   else about the lead moves. One definition, used by the restore (above) and repair R111 when it re-anchors the month; repair R118 lined
   the base up once (each charged render onto its charge's day, with the pins made on it before then). */

/** The paid work's tables and their stamps (unix seconds); `ms` names a JSON list whose items carry `createdAt` in milliseconds. */
export const PAID_WORK_TIMES: { table: string; key: string; times: readonly string[]; ms?: string }[] = [
  { table: 'visualizer_designs', key: 'id', times: ['created_at', 'updated_at', 'deleted_at'] },
  { table: 'project_rooms', key: 'id', times: ['created_at', 'updated_at', 'deleted_at'] },
  { table: 'render_jobs', key: 'id', times: ['created_at', 'completed_at'] },
  { table: 'render_annotations', key: 'id', times: ['created_at', 'updated_at', 'deleted_at'], ms: 'comments_json' },
  { table: 'render_share_links', key: 'id', times: ['created_at', 'last_viewed_at', 'revoked_at', 'expires_at'] },
  { table: 'render_consultation_requests', key: 'id', times: ['created_at'] },
  { table: 'lead_files', key: 'id', times: ['created_at', 'updated_at', 'deleted_at', 'shown_to_client_at'] },
  { table: 'notifications', key: 'id', times: ['created_at', 'read_at'] },
]

type Rows = Partial<Record<string, Record<string, unknown>[]>>
/**
 * Which rows are the paid work, table by table (their ids): the designs holding a render the ledger charged (`render:<job>` spends), then
 * everything of those designs. Works on a snapshot's row lists and on rows read from the database alike.
 */
export function paidWorkIds(rows: Rows): Record<string, Set<string>> {
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
  const paidJobs = new Set((rows.credit_ledger ?? []).filter((r) => r.reason === 'spend' && /^render:/.test(str(r.ref_id))).map((r) => str(r.ref_id).slice(7)))
  const jobsAll = rows.render_jobs ?? [], roomsAll = rows.project_rooms ?? []
  const roomOf = new Map(roomsAll.map((r) => [str(r.id), str(r.design_id)]))
  const designs = new Set(jobsAll.filter((j) => paidJobs.has(str(j.id))).map((j) => roomOf.get(str(j.room_id)) ?? '').filter(Boolean))
  const rooms = new Set(roomsAll.filter((r) => designs.has(str(r.design_id))).map((r) => str(r.id)))
  const jobs = new Set(jobsAll.filter((j) => rooms.has(str(j.room_id))).map((j) => str(j.id)))
  const links = new Set((rows.render_share_links ?? []).filter((l) => designs.has(str(l.design_id))).map((l) => str(l.id)))
  const files = new Set((rows.lead_file_renders ?? []).filter((f) => designs.has(str(f.design_id))).map((f) => str(f.file_id)))
  const bell = new Set((rows.notifications ?? []).filter((n) => n.kind === 'render_feedback' && [...designs].some((d) => str(n.href).includes(`/visualizer/${d}`))).map((n) => str(n.id)))
  return {
    visualizer_designs: designs, project_rooms: rooms, render_jobs: jobs,
    render_annotations: new Set((rows.render_annotations ?? []).filter((a) => jobs.has(str(a.job_id))).map((a) => str(a.id))),
    render_share_links: links,
    render_consultation_requests: new Set((rows.render_consultation_requests ?? []).filter((c) => links.has(str(c.share_link_id))).map((c) => str(c.id))),
    lead_files: files, notifications: bell,
  }
}

/** A JSON list's items' `createdAt` (milliseconds) moved by whole days — a pin's replies, which are dated inside it. */
export function shiftMsList(value: unknown, days: number): unknown {
  if (typeof value !== 'string' || !days) return value
  try {
    const list = JSON.parse(value) as unknown
    if (!Array.isArray(list)) return value
    return JSON.stringify(list.map((x) => (x && typeof x === 'object' && typeof (x as { createdAt?: unknown }).createdAt === 'number' ? { ...(x as object), createdAt: (x as { createdAt: number }).createdAt + days * DAY_S * 1000 } : x)))
  } catch { return value }
}

/** The paid work moved by `days` (new row lists; the input is left as it is). */
export function shiftPaidWork(rows: SnapshotRows, days: number, ids: Record<string, Set<string>>): SnapshotRows {
  if (!days) return rows
  const out: SnapshotRows = { ...rows }
  for (const t of PAID_WORK_TIMES) {
    const list = rows[t.table], set = ids[t.table]
    if (!list || !set?.size) continue
    out[t.table] = list.map((r) => {
      if (!set.has(String(r[t.key]))) return r
      const n: Row = { ...r }
      for (const c of t.times) { const v = num(r[c]); if (v != null) n[c] = v + days * DAY_S }
      if (t.ms) n[t.ms] = shiftMsList(r[t.ms], days)
      return n
    })
  }
  return out
}

/**
 * (repair R118) How far each design's paid work sits from its charges, in whole days — the base's renders were charged on a later day than
 * they ran (S08b moved the charges alone). A design is lined up only when every charged render of it is the same whole number of days from
 * its charge; anything else (a studio's own renders, charged the moment they ran) is left as it is.
 */
export function paidWorkOffsets(rows: Rows): Map<string, number> {
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v))
  const chargeAt = new Map((rows.credit_ledger ?? []).filter((r) => r.reason === 'spend' && /^render:/.test(str(r.ref_id))).map((r) => [str(r.ref_id).slice(7), num(r.created_at) ?? 0]))
  const roomOf = new Map((rows.project_rooms ?? []).map((r) => [str(r.id), str(r.design_id)]))
  const per = new Map<string, Set<number>>()
  for (const j of rows.render_jobs ?? []) {
    const at = chargeAt.get(str(j.id)), made = num(j.created_at), design = roomOf.get(str(j.room_id))
    if (at == null || made == null || !design) continue
    const gap = at - made, days = Math.round(gap / DAY_S)
    const off = Math.abs(gap - days * DAY_S) <= 60 ? days : NaN   // whole days apart (to the minute), else not ours to move
    const set = per.get(design) ?? new Set<number>(); set.add(off); per.set(design, set)
  }
  const out = new Map<string, number>()
  for (const [design, offs] of per) { const [only] = [...offs]; if (offs.size === 1 && only != null && Number.isFinite(only) && only !== 0) out.set(design, only) }
  return out
}

/**
 * (S42 audit A-03) Which stamps of a snapshot this module moves — so the whole-demo move (lib/db/demo-day.ts) leaves them to it: `owns` a
 * row's stamp (the credits story's listed stamps, the paid work's, a pin's replies), and `isStoryRow` for a row of either, whose other
 * stamps then move by the credits' days too, so a row never splits across two moves.
 */
export function creditOwnership(base: SnapshotRows): { owns: (table: string, row: Record<string, unknown>, column: string) => boolean; isStoryRow: (table: string, row: Record<string, unknown>) => boolean } {
  const ids = paidWorkIds(base)
  const story = new Map(DEMO_CREDIT_TIMES.map((t) => [t.table, t]))
  const paid = new Map(PAID_WORK_TIMES.map((t) => [t.table, t]))
  const inStory = (table: string, row: Record<string, unknown>) => { const t = story.get(table); return !!t && (!t.only || t.only.values.includes(String(row[t.only.column]))) }
  const inPaid = (table: string, row: Record<string, unknown>) => { const t = paid.get(table); return !!t && !!ids[table]?.has(String(row[t.key])) }
  return {
    owns: (table, row, column) => (inStory(table, row) && !!story.get(table)?.times.includes(column)) || (inPaid(table, row) && (!!paid.get(table)?.times.includes(column) || paid.get(table)?.ms === column)),
    isStoryRow: (table, row) => inStory(table, row) || inPaid(table, row),
  }
}
