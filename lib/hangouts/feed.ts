/**
 * (pending modules S27 — Hangouts) The seam to Qanvast's Hangouts feed — pure, server- and script-safe. In 1.0 the events, their shifts and the
 * studio's place at each (applied → confirmed, the tables it was given) lived in Qanvast's own tables, written by its staff console
 * (Admin › Hangouts — platform admin, outside the studio's app). These are those tables' shapes as 1.0 typed them (src/types/database.ts
 * DbHangoutEvent · DbHangoutShift · DbHangoutStudioParticipation), and the one mapper from them to the studio's copy (lib/db/schema.ts
 * `hangout_*`): the demo's sample events (lib/hangouts/demo.ts) are written in the feed's own shape and go through this mapper, so a real feed is
 * the developers' fetch of the same payload into `feedStatements` — nothing on a page changes.
 *
 * 1.0 kept an event's days as weekday names ("Saturday") beside its dates in words ("Mar 21 – 22, 2026"); the feed here also carries the first
 * day (`start_date`, ISO) — when it is missing, the words are read.
 */

export type FeedEvent = {
  id: string; name: string; dates: string; days: string[]; venue: string; status: string
  price_per_table: number; min_tables: number; total_tables: number; promised_meetings: number; tables_per_studio: number
  start_time: string; end_time: string; customer_profile_summary: string | null; studio_expectations: string | null; description: string | null
  /** the first day, YYYY-MM-DD (2.0's addition to 1.0's shape) */
  start_date?: string
  /** the venue's street address, when Qanvast gives one */
  address?: string | null
  /** studios Qanvast has confirmed so far (1.0 counted hangout_studio_participations where status = confirmed) */
  confirmed_studios?: number
  /** written for the demo — never set by a real feed */
  sample?: boolean
}
export type FeedShift = { id: string; event_id: string; label: string; day: string; start_time: string; end_time: string; sort_order: number }
/** The studio's own place at an event, as Qanvast answers its application (1.0's hangout_studio_participations, this studio's rows). */
export type FeedPlace = { event_id: string; status: 'applied' | 'confirmed' | 'declined'; assigned_tables: number[]; confirmed_at?: string | null }
export type FeedPayload = { events: FeedEvent[]; shifts: FeedShift[]; places: FeedPlace[] }

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const clean = (v: unknown, max = 2000) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return s || null }
const hhmm = (v: unknown, fallback: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(v ?? '').trim()); return m && Number(m[1]) < 24 && Number(m[2]) < 60 ? `${String(Number(m[1])).padStart(2, '0')}:${m[2]}` : fallback }
const localDay = (y: number, m: number, d: number): number | null => { const t = new Date(y, m, d); return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d ? t.getTime() : null }

/** The event's first day at local midnight: `start_date` when the feed sends it, else 1.0's words ("Feb 28 – Mar 1, 2026", "Mar 21 – 22, 2026"). */
export function firstDayOf(e: Pick<FeedEvent, 'start_date' | 'dates'>): number | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.start_date ?? '')
  if (iso) return localDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
  const w = (e.dates ?? '').toLowerCase()
  const year = /(\d{4})/.exec(w)?.[1]
  const first = /([a-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(w)
  if (!year || !first) return null
  const m = MONTHS.indexOf(first[1]!)
  return m < 0 ? null : localDay(Number(year), m, Number(first[2]))
}

export type FeedRows = {
  events: { id: string; feedRef: string; name: string; venue: string; address: string | null; startsOn: number; dayCount: number; startTime: string; endTime: string; pricePerTableMinor: number; tablesPerStudio: number; totalTables: number; studiosTaking: number; promisedMeetings: number; customerProfile: string | null; studioExpectations: string | null; description: string | null; feedStatus: string; sample: boolean }[]
  shifts: { id: string; eventId: string; label: string; dayAt: number; startTime: string; endTime: string; position: number }[]
  places: { eventId: string; status: 'applied' | 'confirmed' | 'declined'; tables: number[]; confirmedAt: number | null }[]
}
/** The studio's ids for the feed's records — the feed's own id, prefixed by kind, so a second sync finds the same row. */
export const eventId = (feedId: string) => `hge-${feedId}`
export const shiftId = (feedId: string) => `hgs-${feedId}`
const STATUSES = ['upcoming', 'active', 'closed', 'cancelled']

export function rowsFromFeed(feed: FeedPayload): FeedRows {
  const out: FeedRows = { events: [], shifts: [], places: [] }
  for (const e of feed.events) {
    const first = firstDayOf(e)
    if (first === null || !clean(e.name) || !clean(e.venue)) continue
    const id = eventId(e.id)
    const dayCount = Math.max(1, Math.min(7, e.days?.length || 1))
    out.events.push({
      id, feedRef: e.id, name: clean(e.name, 120)!, venue: clean(e.venue, 160)!, address: clean(e.address, 200), startsOn: first, dayCount,
      startTime: hhmm(e.start_time, '10:00'), endTime: hhmm(e.end_time, '18:00'),
      pricePerTableMinor: Math.max(0, Math.round(Number(e.price_per_table) * 100) || 0), tablesPerStudio: Math.max(1, Math.round(Number(e.tables_per_studio) || 1)),
      totalTables: Math.max(0, Math.round(Number(e.total_tables) || 0)), studiosTaking: Math.max(0, Math.round(Number(e.confirmed_studios) || 0)),
      promisedMeetings: Math.max(0, Math.round(Number(e.promised_meetings) || 0)), customerProfile: clean(e.customer_profile_summary), studioExpectations: clean(e.studio_expectations),
      description: clean(e.description), feedStatus: STATUSES.includes(e.status) ? e.status : 'upcoming', sample: !!e.sample,
    })
    /* a shift's day is a weekday name (1.0) — the event's day that falls on it; or a date */
    const days = Array.from({ length: dayCount }, (_, i) => { const d = new Date(first); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getTime() })
    feed.shifts.filter((s) => s.event_id === e.id && clean(s.label)).forEach((s, i) => {
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.day ?? '')
      const wd = WEEKDAYS.indexOf((s.day ?? '').trim().toLowerCase())
      const dayAt = iso ? localDay(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : wd >= 0 ? days.find((d) => new Date(d).getDay() === wd) ?? null : days[0]!
      if (dayAt === null || !days.includes(dayAt)) return
      out.shifts.push({ id: shiftId(s.id), eventId: id, label: clean(s.label, 40)!, dayAt, startTime: hhmm(s.start_time, '10:00'), endTime: hhmm(s.end_time, '18:00'), position: Number.isFinite(s.sort_order) ? s.sort_order : i })
    })
  }
  for (const p of feed.places) {
    const ev = out.events.find((e) => e.feedRef === p.event_id)
    if (!ev || !['applied', 'confirmed', 'declined'].includes(p.status)) continue
    const t = p.confirmed_at ? Date.parse(p.confirmed_at) : NaN
    out.places.push({ eventId: ev.id, status: p.status, tables: [...new Set((p.assigned_tables ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b), confirmedAt: Number.isFinite(t) ? t : null })
  }
  return out
}

type Stmt = { sql: string; args: (string | number | null)[] }
/**
 * The writes that bring the studio's copy in line with the feed, in one batch. Events and shifts are upserted by id (a sample event keeps the
 * day it was first written — the demo's days ride the demo day through restoreBaseline, never the repair); a shift the feed stopped sending
 * goes. Qanvast's answer to the studio's application lands on its participation: confirmed (with its tables) or declined — never applied (only
 * the studio applies), never over a withdrawal. Nothing the studio wrote (the plan, its page, the bookings) is touched.
 */
export function feedStatements(rows: FeedRows, now: number, newId: (seed: string) => string): Stmt[] {
  const s: Stmt[] = []
  for (const e of rows.events) {
    s.push({ sql: `INSERT INTO hangout_events (id, feed_ref, name, venue, address, starts_on, day_count, start_time, end_time, price_per_table_minor, tables_per_studio, total_tables, studios_taking, promised_meetings, customer_profile, studio_expectations, description, feed_status, sample, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT(id) DO UPDATE SET feed_ref = excluded.feed_ref, name = excluded.name, venue = excluded.venue, address = excluded.address,
                     starts_on = CASE WHEN hangout_events.sample = 1 AND excluded.sample = 1 THEN hangout_events.starts_on ELSE excluded.starts_on END, day_count = excluded.day_count,
                     start_time = excluded.start_time, end_time = excluded.end_time, price_per_table_minor = excluded.price_per_table_minor, tables_per_studio = excluded.tables_per_studio, total_tables = excluded.total_tables,
                     studios_taking = excluded.studios_taking, promised_meetings = excluded.promised_meetings, customer_profile = excluded.customer_profile, studio_expectations = excluded.studio_expectations,
                     description = excluded.description, feed_status = excluded.feed_status, sample = excluded.sample, updated_at = excluded.updated_at`,
      args: [e.id, e.feedRef, e.name, e.venue, e.address, e.startsOn, e.dayCount, e.startTime, e.endTime, e.pricePerTableMinor, e.tablesPerStudio, e.totalTables, e.studiosTaking, e.promisedMeetings, e.customerProfile, e.studioExpectations, e.description, e.feedStatus, e.sample ? 1 : 0, now] })
    const mine = rows.shifts.filter((x) => x.eventId === e.id)
    const keep = mine.length ? mine.map((x) => `'${x.id.replace(/'/g, "''")}'`).join(',') : "''"
    s.push({ sql: `DELETE FROM hangout_shifts WHERE event_id = ? AND id NOT IN (${keep})`, args: [e.id] })
    for (const x of mine) {
      /* a sample event's shift keeps its day as its event does: the day it lands on is the event's own, counted from the event's kept first day */
      s.push({ sql: `INSERT INTO hangout_shifts (id, event_id, label, day_at, start_time, end_time, position) VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(id) DO UPDATE SET label = excluded.label, start_time = excluded.start_time, end_time = excluded.end_time, position = excluded.position,
                       day_at = CASE WHEN (SELECT sample FROM hangout_events WHERE id = excluded.event_id) = 1 THEN hangout_shifts.day_at ELSE excluded.day_at END`,
        args: [x.id, x.eventId, x.label, x.dayAt, x.startTime, x.endTime, x.position] })
    }
  }
  for (const p of rows.places) {
    if (p.status === 'applied') {
      s.push({ sql: `INSERT OR IGNORE INTO hangout_participations (id, event_id, status, tables, applied_at, updated_at) VALUES (?, ?, 'applied', '[]', ?, ?)`, args: [newId(p.eventId), p.eventId, now, now] })
      continue
    }
    s.push({ sql: `INSERT OR IGNORE INTO hangout_participations (id, event_id, status, tables, applied_at, updated_at) VALUES (?, ?, 'applied', '[]', ?, ?)`, args: [newId(p.eventId), p.eventId, p.confirmedAt ?? now, now] })
    s.push({ sql: `UPDATE hangout_participations SET status = ?, tables = ?, confirmed_at = CASE WHEN ? = 'confirmed' THEN COALESCE(confirmed_at, ?) ELSE confirmed_at END, updated_at = ? WHERE event_id = ? AND status <> 'withdrawn'`,
      args: [p.status, JSON.stringify(p.tables), p.status, p.confirmedAt ?? now, now, p.eventId] })
  }
  return s
}
