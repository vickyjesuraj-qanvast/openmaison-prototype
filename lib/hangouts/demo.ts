/**
 * (pending modules S27 — Hangouts) The demo's sample Hangouts, written in Qanvast's feed's own shape (lib/hangouts/feed.ts) and counted from
 * the demo day: one that ended three days ago (the studio took part), one on today (taking part — its tables are open), one in three and a half
 * weeks still open for applications. Every one is a sample (`sample: true` — the pages say so); the venues are real Singapore halls, the
 * figures (prices, tables, places) 1.0's seed's own (supabase/seeds/041_seed_hangout_data.sql). Invented copy, in the steps' register rows.
 */
import type { FeedPayload } from './feed'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const plus = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
/** 1.0's dates in words: "Oct 24, 2026" · "Oct 24 – 25, 2026" */
const words = (a: Date, n: number) => { const b = plus(a, n - 1); return n === 1 ? `${MONTHS[a.getMonth()]} ${a.getDate()}, ${a.getFullYear()}` : `${MONTHS[a.getMonth()]} ${a.getDate()} – ${a.getMonth() === b.getMonth() ? '' : `${MONTHS[b.getMonth()]} `}${b.getDate()}, ${b.getFullYear()}` }
const daysOf = (a: Date, n: number) => Array.from({ length: n }, (_, i) => WEEKDAYS[plus(a, i).getDay()]!)

/** The feed's ids for the three samples — the studio's rows are `hge-<id>` (lib/hangouts/feed.ts `eventId`). */
export const DEMO_EVENTS = { past: 'qh-2026-suntec', today: 'qh-2026-marina', next: 'qh-2026-onenorth' } as const

export function demoFeed(today: Date): FeedPayload {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const past = plus(t0, -3), next = plus(t0, 24)
  const common = { price_per_table: 7500, min_tables: 2, tables_per_studio: 2, start_time: '10:00', end_time: '18:00', sample: true }
  return {
    events: [
      {
        ...common, id: DEMO_EVENTS.past, name: 'Qanvast Hangout · Suntec', dates: words(past, 1), days: daysOf(past, 1), start_date: iso(past),
        venue: 'Suntec Singapore Convention Centre, Hall 401', address: '1 Raffles Boulevard, Singapore 039593', status: 'closed',
        total_tables: 40, confirmed_studios: 18, promised_meetings: 12,
        customer_profile_summary: 'Mostly HDB and condo homeowners in the East and Central regions, budgets between S$40K and S$80K, keys within three to six months.',
        studio_expectations: 'Two designers at your tables each shift. Bring printed portfolios and a laptop for floor plans.',
        description: 'Meet homeowners planning their renovation, a table at a time.',
      },
      {
        ...common, id: DEMO_EVENTS.today, name: 'Qanvast Hangout · Marina Bay', dates: words(t0, 1), days: daysOf(t0, 1), start_date: iso(t0),
        start_time: '11:00', end_time: '19:00',
        venue: 'Marina Bay Sands Expo, Hall B', address: '10 Bayfront Avenue, Singapore 018956', status: 'active',
        total_tables: 50, confirmed_studios: 22, promised_meetings: 10,
        customer_profile_summary: 'A mix of HDB, condo and landed homeowners from every region, budgets from S$30K to over S$100K.',
        studio_expectations: 'At least one designer at your tables each shift. Chats run about 45 minutes.',
        description: 'Homeowners book a chat with the studios they like, then come to their table.',
      },
      {
        ...common, id: DEMO_EVENTS.next, name: 'Qanvast Hangout · One-North', dates: words(next, 2), days: daysOf(next, 2), start_date: iso(next),
        venue: 'Singapore Expo, Hall 5', address: '1 Expo Drive, Singapore 486150', status: 'upcoming',
        total_tables: 40, confirmed_studios: 14, promised_meetings: 20,
        customer_profile_summary: 'New BTO owners collecting their keys in the next six to nine months, budgets between S$30K and S$60K.',
        studio_expectations: 'Two designers at your tables each shift. Bring BTO layouts you have done.',
        description: 'A weekend for new BTO owners to meet designers before their keys come.',
      },
    ],
    shifts: [
      { id: `${DEMO_EVENTS.past}-am`, event_id: DEMO_EVENTS.past, label: 'Morning', day: WEEKDAYS[past.getDay()]!, start_time: '10:00', end_time: '14:00', sort_order: 0 },
      { id: `${DEMO_EVENTS.past}-pm`, event_id: DEMO_EVENTS.past, label: 'Afternoon', day: WEEKDAYS[past.getDay()]!, start_time: '14:00', end_time: '18:00', sort_order: 1 },
      { id: `${DEMO_EVENTS.today}-am`, event_id: DEMO_EVENTS.today, label: 'Morning', day: WEEKDAYS[t0.getDay()]!, start_time: '11:00', end_time: '15:00', sort_order: 0 },
      { id: `${DEMO_EVENTS.today}-pm`, event_id: DEMO_EVENTS.today, label: 'Evening', day: WEEKDAYS[t0.getDay()]!, start_time: '15:00', end_time: '19:00', sort_order: 1 },
      ...[0, 1].flatMap((i) => [
        { id: `${DEMO_EVENTS.next}-d${i + 1}-am`, event_id: DEMO_EVENTS.next, label: 'Morning', day: WEEKDAYS[plus(next, i).getDay()]!, start_time: '10:00', end_time: '14:00', sort_order: i * 2 },
        { id: `${DEMO_EVENTS.next}-d${i + 1}-pm`, event_id: DEMO_EVENTS.next, label: 'Afternoon', day: WEEKDAYS[plus(next, i).getDay()]!, start_time: '14:00', end_time: '18:00', sort_order: i * 2 + 1 },
      ]),
    ],
    places: [
      { event_id: DEMO_EVENTS.past, status: 'confirmed', assigned_tables: [11, 12], confirmed_at: plus(past, -12).toISOString() },
      { event_id: DEMO_EVENTS.today, status: 'confirmed', assigned_tables: [7, 8], confirmed_at: plus(t0, -10).toISOString() },
    ],
  }
}
