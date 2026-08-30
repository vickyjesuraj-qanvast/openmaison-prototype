import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Seeds the Lead Details › Overview demo records (858-24770 / 858-24094) — idempotent: a lead that already has a
 * record of a kind is left alone. Run once, then `pnpm db:baseline`.
 *
 *  Olivia Martinez  → quote OM-10001 (Draft, S$70,500, Private) · 13 files (Kitchen folder + 12 × Q-101) · questionnaire 7 / 11
 *  Muthu Vinay      → return in processing (returned by Dane, "No response from lead")
 *  Arjun Mehta      → return rejected with a 7-day appeal window ("Homeowner did not shortlist ID to proceed")
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const leadId = async (name: string) => {
  const r = await client.execute({ sql: 'SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', args: [name] })
  const id = r.rows[0]?.id
  if (!id) throw new Error(`lead not found: ${name}`)
  return String(id)
}
const count = async (table: string, id: string) => Number((await client.execute({ sql: `SELECT count(*) AS n FROM ${table} WHERE lead_id = ?`, args: [id] })).rows[0]?.n ?? 0)

const olivia = await leadId('Olivia Martinez')
const muthu = await leadId('Muthu Vinay')
const arjun = await leadId('Arjun Mehta')
let inserted = 0

if ((await count('quotes', olivia)) === 0) {
  await client.execute({ sql: 'INSERT INTO quotes (id, lead_id, number, title, amount_minor, visibility, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
    args: [randomUUID(), olivia, 'OM-10001', 'Whole-home renovation', 7050000, 'Private', 'Draft', sec('2026-08-25T10:15:00+08:00')] })
  inserted++
}
if ((await count('lead_files', olivia)) === 0) {
  const base = sec('2026-08-25T11:00:00+08:00')
  await client.execute({ sql: 'INSERT INTO lead_files (id, lead_id, kind, name, thumb, created_at) VALUES (?,?,?,?,?,?)', args: [randomUUID(), olivia, 'folder', 'Kitchen', null, base] })
  for (let i = 0; i < 12; i++) {
    await client.execute({ sql: 'INSERT INTO lead_files (id, lead_id, kind, name, thumb, created_at) VALUES (?,?,?,?,?,?)',
      args: [randomUUID(), olivia, 'image', 'Q-101', i % 2 === 0 ? '/figma-assets/file-thumb-1.png' : '/figma-assets/file-thumb-2.png', base + 60 * (i + 1)] })
  }
  inserted += 13
}
if ((await count('lead_questionnaires', olivia)) === 0) {
  await client.execute({ sql: 'INSERT INTO lead_questionnaires (lead_id, total, client_answered, studio_answered, updated_at) VALUES (?,?,?,?,?)', args: [olivia, 11, 0, 7, sec('2026-08-26T09:00:00+08:00')] })
  inserted++
}
if ((await count('lead_returns', muthu)) === 0) {
  await client.execute({ sql: 'INSERT INTO lead_returns (id, lead_id, status, returned_by_id, returned_at, reason, created_at) VALUES (?,?,?,?,?,?,?)',
    args: [randomUUID(), muthu, 'processing', 'dane', sec('2026-08-28T16:30:00+08:00'), 'No response from lead', sec('2026-08-28T16:30:00+08:00')] })
  inserted++
}
if ((await count('lead_returns', arjun)) === 0) {
  await client.execute({ sql: 'INSERT INTO lead_returns (id, lead_id, status, returned_by_id, returned_at, reason, replied_by, replied_at, status_text, appeal_days, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    args: [randomUUID(), arjun, 'rejected', 'dane', sec('2026-08-26T10:00:00+08:00'), 'Homeowner did not shortlist ID to proceed', 'Qanvast - Business Team', sec('2026-08-28T16:30:00+08:00'), 'Return Rejected', 7, sec('2026-08-26T10:00:00+08:00')] })
  inserted++
}
console.log(`seed-overview: ${inserted} rows inserted`)
client.close()
