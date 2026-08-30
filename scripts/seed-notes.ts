import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Lead Details › Notes (931:44865) demo records for Olivia — idempotent (skips when she already has notes). Run once, then `pnpm db:baseline`.
 *  note "Customer has 10 cats" / "Design and build cat-friendly features" (the mock's copy) with four Q-101 attachments
 *  contact log: WhatsApp · Callback requested · next follow-up In person (frame 163)
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const r = await client.execute({ sql: 'SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', args: ['Olivia Martinez'] })
const olivia = String(r.rows[0]?.id ?? '')
if (!olivia) throw new Error('lead not found: Olivia Martinez')
const n = Number((await client.execute({ sql: 'SELECT count(*) AS n FROM lead_notes WHERE lead_id = ?', args: [olivia] })).rows[0]?.n ?? 0)
if (n > 0) { console.log('seed-notes: already seeded'); client.close(); process.exit(0) }
const noteId = randomUUID()
const t1 = sec('2026-08-26T12:34:00+05:30')
await client.execute({ sql: 'INSERT INTO lead_notes (id, lead_id, kind, title, body, author_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
  args: [noteId, olivia, 'note', 'Customer has 10 cats', 'Design and build cat-friendly features', 'dane', t1, t1] })
const files = (await client.execute({ sql: "SELECT id FROM lead_files WHERE lead_id = ? AND kind != 'folder' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY created_at LIMIT 4", args: [olivia] })).rows
for (const f of files) await client.execute({ sql: 'INSERT INTO note_attachments (note_id, file_id, created_at) VALUES (?,?,?)', args: [noteId, String(f.id), t1] })
const t2 = sec('2026-08-26T15:00:00+05:30')
await client.execute({ sql: 'INSERT INTO lead_notes (id, lead_id, kind, title, body, channel, contacted_at, outcome, next_step_at, next_step_mode, author_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
  args: [randomUUID(), olivia, 'contact', '', '', 'WhatsApp', t2, 'Callback requested', sec('2026-08-28T15:00:00+05:30'), 'In person', 'dane', t2 + 60, t2 + 60] })
console.log(`seed-notes: 2 notes, ${files.length} attachments`)
client.close()
