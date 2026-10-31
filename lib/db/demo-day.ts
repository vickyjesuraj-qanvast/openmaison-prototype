/**
 * (S42 audit A-03, 2026-10-14 — the demo's recent moments aged) **The whole demo rides the demo day.**
 *
 * REG-341 moved open tasks' due dates with the calendar on every restore and kept every other stamp where it was; S08b, S23, S24, S25, S27
 * and fix-G each added one more thing that rides (the credits month, planned meetings, the Marketplace, Market Insights, Hangouts still
 * ahead, live share links). Everything else aged: a file shown to a client "an hour ago" left the portal's 7-day "new" window, the
 * Dashboard's fortnight of site updates emptied, "added in the last 7 days" and Studio Health thinned, the bell's "1d ago" grew — and the
 * base itself aged between snapshots, because the daily re-snapshot restores the old fixture first (pbuild's after-step) and only the few
 * riders moved. A rule per column could never keep up: moving one moment without the records around it breaks their order (a lead created
 * after its first contact), and every new table would need its own line.
 *
 * So a restore now moves **every moment of the demo** by the same whole days — every timestamp column the schema types (seconds or
 * milliseconds, `timeColumns` in lib/db/baseline.ts reads them off the schema, so a new table rides without anyone remembering it), the few
 * plain integers that hold a moment (`PLAIN_TIMES`), and the moments written inside text (`EMBEDDED`): the Move stage window's log dates,
 * an event's "when", a shared schedule's snapshot, a quote's preparer stamp, a pin's replies, settings' "last at" stamps, the client bell's
 * read keys, a date answer, and the dates the app itself wrote into a bell row, its WhatsApp / email copy, an Activity line's from → to and
 * a meeting brief. Every gap between two records is kept to the second, so every "n days ago", "new for 7 days", "this week" and "overdue
 * by 2 days" reads exactly as it did on the snapshot's day. What people typed (a message, a quote's notes, an update's words) and what was
 * signed (a contract's frozen copy) keep their words — (the close-out round 2026-10-31, call C-04) all but the days a signed copy's fields
 * print from its records (`DATE_FIELDS`: the contract's date, the signing day, Valid until, the handover's days), which ride with those
 * records; its fingerprint is then made again over the copy it holds (lib/db/demo-fingerprints.ts, in lib/db/baseline.ts).
 *
 * The AI credits story keeps its own move (lib/credits/demo-month.ts — normally the same days; more when the snapshot's own month had
 * already ended): its rows are left to it here (`skip`), and their other stamps move by its days (`daysFor`).
 *
 * Whole days keep every hour (a task due at 10:00 is still due at 10:00) — but a restore earlier in the day than the snapshot was taken would
 * put the snapshot's last hours a few hours ahead of now. So, given the snapshot's moment (`clock`), what HAPPENED (created, sent, read …) in
 * the last day before the snapshot is eased into the last day before now — one straight squeeze, so nothing changes order and nothing is ever
 * after now — while what is PLANNED (a due date, an expiry, a meeting, a schedule's dates — `PLANNED`) keeps its whole days.
 * Pure — no database; lib/db/baseline.ts `restoreBaseline` applies it to the fixture's rows.
 */

export type Row = Record<string, unknown>
export type SnapshotRows = Partial<Record<string, Row[]>>
export type TimeColumn = { column: string; unit: 's' | 'ms' }
export type TimeColumns = Record<string, TimeColumn[]>

const DAY_MS = 86_400_000

/** The snapshot's moment and the restore's (ms) — what lets a restore keep what happened from landing after now. */
export type Clock = { takenAt: number; now: number }

/** A column or a JSON key that holds a PLANNED moment — when something is due, ends, starts, expires, resumes — rather than one that happened. */
export const PLANNED = /due|expire|valid_until|needed_by|send_after|next_try|period_(start|end)|resume|until|_date$|^starts?_(at|on)$|^ends?_(at|on)$|starts_?on|day_at|repeat_next|grace|trial_ends|expected|follow_?up|next_?step|^start$|^end$|^(from|to)_(end|day)$/i

/**
 * How one moment (ms) moves: by whole days — and, for what happened, eased so it is never after `clock.now` (see the file's head). The ease
 * maps the span from a day before now to the snapshot's own moment (moved) straight onto the last day before now, whole seconds.
 */
export function moverFor(days: number, clock?: Clock): { planned: (ms: number) => number; happened: (ms: number) => number } {
  const shift = days * DAY_MS
  const planned = (ms: number) => ms + shift
  if (!clock || !Number.isFinite(clock.takenAt) || !Number.isFinite(clock.now) || clock.takenAt + shift <= clock.now) return { planned, happened: planned }
  const T = clock.takenAt + shift, A = clock.now - DAY_MS
  return {
    planned,
    happened: (ms) => {
      const u = ms + shift
      if (ms > clock.takenAt || u <= A) return u   // ahead of the snapshot (planned by its nature), or older than a day before now
      return Math.floor((A + ((u - A) * (clock.now - A)) / (T - A)) / 1000) * 1000
    },
  }
}
type Mover = ReturnType<typeof moverFor>

/** Moments the schema stores as a plain integer (no timestamp mode). */
export const PLAIN_TIMES: TimeColumns = {
  projects: [{ column: 'on_hold_until', unit: 'ms' }],   // the day a paused project should resume (lib/projects/hold.ts)
}

/**
 * Moments written inside a text column.
 *  · `json` — a JSON value: date strings (2026-10-14 · an ISO instant · the input fields' 14/10/2026 and 14/10/2026, 3:00 PM) and epoch
 *    numbers under a time key (`at`, `…At`, `when`); `anyNumber` shifts every epoch number (a map of moments keyed by name);
 *    `words` also moves the dates the app spelled out in its strings ("Thu 15 Oct", "8 Aug ’26").
 *  · `words` — plain text the app wrote with dates spelled out.
 *  · `rowKey` — a derived row's key ending in its moment in ms (`update:<id>:<ms>`), so a read row stays read.
 *  · `inputDate` — the whole value is an input date (a questionnaire's date answer, picked in the date field).
 *  · `fields` — a signed contract's kept copy: only the days its fields print from the records (`DATE_FIELDS`); every other word as signed.
 * `anchor` names the row's own stamp, to tell the year of a date spelled without one.
 */
export const EMBEDDED: { table: string; column: string; kind: 'json' | 'words' | 'rowKey' | 'inputDate' | 'fields'; words?: boolean; anyNumber?: boolean; anchor?: string; unless?: { column: string; values: readonly string[] } }[] = [
  { table: 'stage_logs', column: 'payload', kind: 'json', anchor: 'created_at' },
  { table: 'lead_events', column: 'detail', kind: 'json', words: true, anchor: 'at' },
  { table: 'project_schedule_shares', column: 'snapshot', kind: 'json' },
  { table: 'project_schedule_shares', column: 'changes', kind: 'json' },
  { table: 'floor_plan_marks', column: 'shape', kind: 'json' },
  { table: 'quotes', column: 'prepared_json', kind: 'json' },
  { table: 'render_annotations', column: 'comments_json', kind: 'json' },
  { table: 'settings', column: 'value', kind: 'json', unless: { column: 'key', values: ['credit_alerts'] } },   // the credits' month is lib/credits/demo-month.ts's
  { table: 'nudge_state', column: 'spent', kind: 'json', anyNumber: true },
  { table: 'nudge_state', column: 'offer_json', kind: 'json' },
  { table: 'nudge_state', column: 'answers_json', kind: 'json', anyNumber: true },
  { table: 'meetings', column: 'brief_json', kind: 'json', words: true, anchor: 'created_at' },
  { table: 'notifications', column: 'title', kind: 'words', anchor: 'created_at' },
  { table: 'notifications', column: 'body', kind: 'words', anchor: 'created_at' },
  { table: 'notification_outbox', column: 'subject', kind: 'words', anchor: 'created_at' },
  { table: 'notification_outbox', column: 'body', kind: 'words', anchor: 'created_at' },
  { table: 'portal_bell_reads', column: 'row_key', kind: 'rowKey' },
  { table: 'questions', column: 'answer', kind: 'inputDate' },
  { table: 'contracts', column: 'signed_body', kind: 'fields', anchor: 'contract_date' },   // (the close-out round 2026-10-31, C-04) the kept copy's printed days
]

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'bigint' ? Number(v) : null)
/** An epoch number in the demo's range — seconds or milliseconds (2020 … 2040). */
const epochUnit = (n: number): 's' | 'ms' | null => (n >= 1.58e12 && n <= 2.21e12 ? 'ms' : n >= 1.58e9 && n <= 2.21e9 ? 's' : null)
const TIME_KEY = /^(at|when)$|At$|On$/

const pad = (n: number) => String(n).padStart(2, '0')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** A local calendar day moved by whole days (the hour kept). */
function plusDays(y: number, m: number, d: number, days: number): Date {
  return new Date(y, m, d + days)
}

/** One date string moved by whole days, in the same shape — or null when it is not one of the shapes the app writes. A string with a time
    moves through `move` (a restore's ease for what happened); a day alone by whole days. */
export function shiftDateString(s: string, days: number, move: (ms: number) => number = (ms) => ms + days * DAY_MS): string | null {
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) { const d = plusDays(Number(m[1]), Number(m[2]) - 1, Number(m[3]), days); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
  m = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(\.\d{3})?)?Z$/.exec(s)
  if (m) {
    const t = Date.parse(s)
    if (!Number.isFinite(t)) return null
    const iso = new Date(move(t)).toISOString()   // whole days in ms: the zone has no DST
    return m[1] ? iso : s.length === 20 ? iso.replace('.000Z', 'Z') : `${iso.slice(0, 16)}Z`
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(,?\s*)(\d{1,2}):(\d{2})(\s*)([AaPp][Mm])$/.exec(s)
  if (m) {
    const h12 = Number(m[5]) % 12 + (/^[Pp]/.test(m[8]!) ? 12 : 0)
    const d = new Date(move(new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h12, Number(m[6])).getTime()))
    const h = d.getHours() % 12 || 12, pm = d.getHours() >= 12
    const ap = /^[ap]/.test(m[8]!) ? (pm ? 'pm' : 'am') : (pm ? 'PM' : 'AM')
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}${m[4]}${h}:${pad(d.getMinutes())}${m[7]}${ap}`
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m) { const d = plusDays(Number(m[3]), Number(m[2]) - 1, Number(m[1]), days); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` }
  return null
}

/* The app's spelled-out dates (lib/format.ts): "15 Oct", "Thu 15 Oct", "Thu, 15 Oct", "8 Aug ’26", "Tue, 25 Aug ’26", "17 September 2026",
   "Sunday, 7 February 2026". A month only counts as a word on its own ("12 Marina Boulevard" is not a date). */
const WORD_DATE = new RegExp(
  String.raw`\b(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)(day|sday|nesday|rsday|urday)?(,?) )?(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(uary|ruary|ch|il|e|y|ust|tember|ober|ember)?\b( ’\d{2}| \d{4})?`,
  'g',
)

/**
 * The dates the app spelled out in `text`, each moved by whole days in its own shape (the weekday renamed, the month and year as written).
 * A date without a year is read as the one nearest `nearMs` (the row's own stamp).
 */
export function shiftDateWords(text: string, days: number, nearMs: number | null): string {
  if (!days || !text) return text
  return text.replace(WORD_DATE, (all, wd: string | undefined, wdLong: string | undefined, comma: string, dd: string, mon: string, monLong: string | undefined, yr: string | undefined) => {
    const mi = MONTHS.indexOf(mon)
    const full = MONTHS_FULL[mi]!
    if (monLong && full !== mon + monLong) return all   // "Mayy" — not a month
    let year: number
    if (yr) year = yr.startsWith(' ’') ? 2000 + Number(yr.slice(2)) : Number(yr.slice(1))
    else {
      const near = nearMs ?? Date.now()
      const y0 = new Date(near).getFullYear()
      year = [y0 - 1, y0, y0 + 1].reduce((best, y) => (Math.abs(new Date(y, mi, Number(dd)).getTime() - near) < Math.abs(new Date(best, mi, Number(dd)).getTime() - near) ? y : best), y0)
    }
    const at = new Date(year, mi, Number(dd))
    if (at.getMonth() !== mi) return all   // "31 Sep" — not a day
    const d = plusDays(year, mi, Number(dd), days)
    const weekday = wd ? `${wdLong ? DAYS_FULL[d.getDay()] : DAYS[d.getDay()]}${comma} ` : ''
    const month = monLong ? MONTHS_FULL[d.getMonth()] : MONTHS[d.getMonth()]
    const year2 = yr ? (yr.startsWith(' ’') ? ` ’${String(d.getFullYear()).slice(2)}` : ` ${d.getFullYear()}`) : ''
    return `${weekday}${d.getDate()} ${month}${year2}`
  })
}

/**
 * (the close-out round 2026-10-31 — call C-04, the UI audit's 4-05) The fields of a signed contract's kept copy that print a day its records
 * hold (lib/contracts/snapshot.ts `tokenValuesFor`): the contract's date, Today's date (the signing day), the quote's Valid until and the
 * handover's completion and defects days. Those records ride the demo day, so the days they printed ride with them.
 */
export const DATE_FIELDS: readonly string[] = ['date.contract', 'date.today', 'quote.validUntil', 'project.completedOn', 'project.defectsUntil']
/* One resolved field of a kept copy (lib/contracts/tokens.ts `resolveTokens`): <span class="om-token-value" data-token="key">value</span> */
const FIELD = /(<span\b[^>]*\bdata-token="([a-zA-Z.]+)"[^>]*>)([^<]*)(<\/span>)/g
const isValue = (open: string) => /\bom-token-value\b/.test(open)

/** A kept copy with the day each of its `DATE_FIELDS` prints moved by whole days, in its own words ("22 July 2026"); every other word as it was. */
export function shiftDateFields(html: string, days: number, nearMs: number | null): string {
  if (!days || !html) return html
  return html.replace(FIELD, (all, open: string, key: string, value: string, close: string) =>
    (DATE_FIELDS.includes(key) && isValue(open) ? `${open}${shiftDateWords(value, days, nearMs)}${close}` : all))
}

/** The day a kept copy's field prints (local midnight, ms) — null when the copy has no such field or it prints no whole date ("22 July 2026"). */
export function fieldDay(html: string, key: string): number | null {
  for (const m of html.matchAll(FIELD)) {
    if (m[2] !== key || !isValue(m[1]!)) continue
    const d = /^(\d{1,2}) ([A-Z][a-z]+) (\d{4})$/.exec(m[3]!.trim())
    const mi = d ? MONTHS_FULL.indexOf(d[2]!) : -1
    if (!d || mi < 0) return null
    const at = new Date(Number(d[3]), mi, Number(d[1]))
    return at.getMonth() === mi ? at.getTime() : null
  }
  return null
}

/** A JSON value with every moment inside it moved (see `EMBEDDED`) — a key naming a planned moment keeps whole days. */
function shiftJsonValue(v: unknown, days: number, o: { words: boolean; anyNumber: boolean; nearMs: number | null; mover: Mover }, key: string | null): unknown {
  const move = key !== null && PLANNED.test(key) ? o.mover.planned : o.mover.happened
  if (typeof v === 'string') {
    const s = shiftDateString(v, days, move)
    if (s !== null) return s
    return o.words ? shiftDateWords(v, days, o.nearMs) : v
  }
  if (typeof v === 'number') {
    const unit = (o.anyNumber || (key !== null && TIME_KEY.test(key))) ? epochUnit(v) : null
    return unit === 'ms' ? move(v) : unit === 's' ? Math.round(move(v * 1000) / 1000) : v
  }
  if (Array.isArray(v)) return v.map((x) => shiftJsonValue(x, days, o, key))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shiftJsonValue(x, days, o, k)]))
  return v
}

/** A text column holding JSON, moved — returned as it was when it is not JSON. */
export function shiftJsonText(text: unknown, days: number, o: { words?: boolean; anyNumber?: boolean; nearMs?: number | null; mover?: Mover } = {}): unknown {
  if (typeof text !== 'string' || !days || !text) return text
  try {
    const parsed = JSON.parse(text) as unknown
    if (parsed === null || typeof parsed !== 'object') return text
    const moved = JSON.stringify(shiftJsonValue(parsed, days, { words: !!o.words, anyNumber: !!o.anyNumber, nearMs: o.nearMs ?? null, mover: o.mover ?? moverFor(days) }, null))
    return moved === JSON.stringify(parsed) ? text : moved   // nothing inside moved: the text stays byte for byte
  } catch { return text }
}

/** A derived row's key ending in its moment (ms) — moved, so the row it names stays read. */
export function shiftRowKey(key: unknown, days: number, move: (ms: number) => number = (ms) => ms + days * DAY_MS): unknown {
  if (typeof key !== 'string' || !days) return key
  const m = /^(.*:)(\d{13})$/.exec(key)
  return m && epochUnit(Number(m[2])) === 'ms' ? `${m[1]}${move(Number(m[2]))}` : key   // a key names something that happened: it moves as that moment did
}

/**
 * Every moment of the snapshot moved by whole days (new row lists; the input is left as it is). `daysFor` gives a row its own days (the
 * credits story's); `skip` leaves a stamp or an embedded column to another mover (lib/credits/demo-month.ts).
 */
export function shiftDemoRows(base: SnapshotRows, days: number, times: TimeColumns, opts: { daysFor?: (table: string, row: Row) => number; skip?: (table: string, row: Row, column: string) => boolean; /** the snapshot's and the restore's moments — what happened never lands after now */ clock?: Clock } = {}): SnapshotRows {
  const movers = new Map<number, Mover>()
  const moverOf = (d: number) => { let m = movers.get(d); if (!m) { m = moverFor(d, opts.clock); movers.set(d, m) } return m }
  const out: SnapshotRows = { ...base }
  const embeddedBy = new Map<string, typeof EMBEDDED>()
  for (const e of EMBEDDED) embeddedBy.set(e.table, [...(embeddedBy.get(e.table) ?? []), e])
  const tables = new Set([...Object.keys(times), ...Object.keys(PLAIN_TIMES), ...embeddedBy.keys()])
  for (const table of tables) {
    const rows = base[table]
    if (!rows?.length) continue
    const cols = [...(times[table] ?? []), ...(PLAIN_TIMES[table] ?? [])]
    const embedded = embeddedBy.get(table) ?? []
    out[table] = rows.map((r) => {
      const d = opts.daysFor ? opts.daysFor(table, r) : days
      if (!d) return r
      const n: Row = { ...r }
      const mv = moverOf(d)
      for (const c of cols) {
        if (opts.skip?.(table, r, c.column)) continue
        const v = num(r[c.column])
        if (v == null) continue
        const move = PLANNED.test(c.column) ? mv.planned : mv.happened
        n[c.column] = c.unit === 'ms' ? move(v) : Math.round(move(v * 1000) / 1000)
      }
      for (const e of embedded) {
        if (e.unless && e.unless.values.includes(String(r[e.unless.column]))) continue
        if (opts.skip?.(table, r, e.column)) continue
        const anchor = e.anchor ? num(r[e.anchor]) : null
        const nearMs = anchor == null ? null : epochUnit(anchor) === 's' ? anchor * 1000 : anchor
        const v = r[e.column]
        if (e.kind === 'json') n[e.column] = shiftJsonText(v, d, { words: e.words, anyNumber: e.anyNumber, nearMs, mover: mv })
        else if (e.kind === 'words') n[e.column] = typeof v === 'string' ? shiftDateWords(v, d, nearMs) : v
        else if (e.kind === 'rowKey') n[e.column] = shiftRowKey(v, d, mv.happened)
        else if (e.kind === 'fields') n[e.column] = typeof v === 'string' ? shiftDateFields(v, d, nearMs) : v
        else if (typeof v === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v.trim())) n[e.column] = shiftDateString(v.trim(), d) ?? v
      }
      return n
    })
  }
  return out
}
