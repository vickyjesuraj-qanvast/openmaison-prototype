import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Seeds the Lead Details › Contracts demo record (931:38666) — idempotent. Run once, then `pnpm db:baseline`.
 *  Olivia Martinez → "General Contract Agreement", Draft, created with the quote (25 Aug ’26)
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const r = await client.execute({ sql: 'SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', args: ['Olivia Martinez'] })
const olivia = r.rows[0]?.id
if (!olivia) throw new Error('lead not found: Olivia Martinez')
const n = Number((await client.execute({ sql: 'SELECT count(*) AS n FROM contracts WHERE lead_id = ?', args: [olivia] })).rows[0]?.n ?? 0)
if (n === 0) {
  await client.execute({ sql: 'INSERT INTO contracts (id, lead_id, title, status, created_at) VALUES (?,?,?,?,?)',
    args: [randomUUID(), String(olivia), 'General Contract Agreement', 'Draft', sec('2026-08-25T10:20:00+08:00')] })
  console.log('seed-contracts: 1 row inserted')
} else console.log('seed-contracts: already seeded')
client.close()
