import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Backfills the stage transition a parked lead is missing — idempotent. Run once, then `pnpm db:baseline`.
 *
 * Every On Hold / Lost lead was seeded with a single log, the one that parked it ("Contacted -> Lost"). Nothing
 * recorded when it ENTERED Contacted, so the Lead stages card had no span to measure and every completed row read
 * "--" where the mock (858:25211) shows a duration. The card is right; the history was incomplete.
 *
 * The transition is placed between the lead's creation and the moment it was parked, so both stages get a real,
 * whole-day span: two days in New where there is room, otherwise half the span. The payload is `{"quick":true}` —
 * the move happened, no details were captured — rather than an invented contact log with a channel and an outcome.
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const DAY = 86_400

const parked = await client.execute(`
  SELECT l.id, l.name, l.created_at, s.from_stage, s.created_at AS parked_at
  FROM leads l JOIN stage_logs s ON s.lead_id = l.id
  WHERE l.stage IN ('On Hold', 'Lost') AND l.deleted_at IS NULL
`)

let added = 0
for (const row of parked.rows) {
  const id = String(row.id)
  const from = String(row.from_stage)            // the stage it was parked FROM — the one with no recorded entry
  if (from === 'New') continue                   // nothing missing: New is entered at creation
  const created = Number(row.created_at)
  const parkedAt = Number(row.parked_at)

  const already = await client.execute({ sql: 'SELECT 1 FROM stage_logs WHERE lead_id = ? AND to_stage = ?', args: [id, from] })
  if (already.rows.length) continue

  const span = parkedAt - created
  const inNew = Math.min(2 * DAY, Math.floor(span / 2 / DAY) * DAY) || DAY
  await client.execute({
    sql: 'INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)',
    args: [randomUUID(), id, 'New', from, JSON.stringify({ quick: true }), created + inNew],
  })
  added++
  console.log(`  ${String(row.name).padEnd(14)} New -> ${from}  (New ${inNew / DAY}d, ${from} ${Math.floor((parkedAt - created - inNew) / DAY)}d)`)
}
console.log(added ? `\nbackfilled ${added} stage log(s) — run \`pnpm db:baseline\` to snapshot` : 'nothing to backfill')
await client.close()
