import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Lead Details › Files (931:39056) — enriches the overview seed's files for Olivia (idempotent: skips rows already owned).
 *  every file: owner James (the mock's "J" avatar), JPEG 711 KB (931:40181), updated = created
 *  four Q-101 images move into the "Kitchen" folder (→ "4 items"), the rest stay at the root
 *  first root image gets one comment (the mock's comment chip "1") — copy is invented (REG-182)
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (iso: string) => Math.floor(new Date(iso).getTime() / 1000)
const r = await client.execute({ sql: 'SELECT id FROM leads WHERE name = ? AND deleted_at IS NULL', args: ['Olivia Martinez'] })
const olivia = String(r.rows[0]?.id ?? '')
if (!olivia) throw new Error('lead not found: Olivia Martinez')
const rows = (await client.execute({ sql: 'SELECT id, kind, name, created_at, owner_id FROM lead_files WHERE lead_id = ? ORDER BY created_at', args: [olivia] })).rows
const todo = rows.filter((f) => f.owner_id === null)
if (todo.length === 0) { console.log('seed-files: already seeded'); client.close(); process.exit(0) }
const folder = rows.find((f) => f.kind === 'folder')
let moved = 0
for (const f of todo) {
  const isFolder = f.kind === 'folder'
  const intoFolder = !isFolder && folder && moved < 4 && rows.indexOf(f) >= rows.length - 4   // the last four images live in Kitchen
  if (intoFolder) moved++
  await client.execute({
    sql: 'UPDATE lead_files SET owner_id = ?, size_bytes = ?, mime = ?, updated_at = ?, parent_id = ? WHERE id = ?',
    args: ['james', isFolder ? null : 728064, isFolder ? null : 'image/jpeg', Number(f.created_at), intoFolder ? String(folder!.id) : null, String(f.id)],
  })
}
const first = rows.find((f) => f.kind !== 'folder')
if (first) {
  const n = Number((await client.execute({ sql: 'SELECT count(*) AS n FROM file_comments WHERE file_id = ?', args: [String(first.id)] })).rows[0]?.n ?? 0)
  if (n === 0) await client.execute({ sql: 'INSERT INTO file_comments (id, file_id, author_id, body, created_at) VALUES (?,?,?,?,?)', args: [randomUUID(), String(first.id), 'james', 'Client wants the island moved to the window side — see the marked-up plan.', sec('2026-08-26T14:10:00+08:00')] })
}
console.log(`seed-files: ${todo.length} files enriched, ${moved} moved into Kitchen`)
client.close()
