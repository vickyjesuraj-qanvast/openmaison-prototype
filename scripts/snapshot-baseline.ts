import { createClient } from '@libsql/client'
import { writeFile } from 'node:fs/promises'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/** Snapshot every table into fixtures/baseline.json — the state "Reset prototype" returns to. Run after curating demo data. */
// Keep in sync with BASELINE_TABLES in lib/db/baseline.ts (restore order = this order).
const TABLES = ['users', 'organizations', 'memberships', 'members', 'leads', 'lead_assignees', 'lead_tasks', 'stage_logs', 'imports', 'import_rows', 'settings', 'quotes', 'contracts', 'lead_files', 'lead_questionnaires', 'lead_returns', 'tags', 'task_tags', 'task_assignees', 'task_comments', 'task_attachments', 'task_templates', 'template_tasks', 'file_comments', 'lead_notes', 'note_attachments', 'questions', 'return_attachments']
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const out: Record<string, unknown[]> = {}
let total = 0
for (const t of TABLES) {
  const res = await client.execute(`SELECT * FROM ${t}`)
  out[t] = res.rows.map((r) => Object.fromEntries(res.columns.map((c, i) => [c, r[i] === undefined ? null : r[i]])))
  total += res.rows.length
}
await writeFile('fixtures/baseline.json', JSON.stringify({ takenAt: new Date().toISOString(), ...out }, null, 0))
console.log(`baseline snapshot: ${TABLES.length} tables, ${total} rows → fixtures/baseline.json`)
client.close()
