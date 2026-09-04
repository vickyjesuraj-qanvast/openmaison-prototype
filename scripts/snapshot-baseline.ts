import { createClient } from '@libsql/client'
import { writeFile } from 'node:fs/promises'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/** Snapshot every table into fixtures/baseline.json — the state "Reset prototype" returns to. Run after curating demo data. */
// Keep in sync with BASELINE_TABLES in lib/db/baseline.ts (restore order = this order).
const TABLES = ['users', 'organizations', 'memberships', 'members', 'leads', 'lead_assignees', 'lead_tasks', 'stage_logs', 'imports', 'import_rows', 'settings', 'quotes', 'contracts', 'lead_files', 'lead_questionnaires', 'lead_returns', 'tags', 'task_tags', 'task_assignees', 'task_comments', 'task_attachments', 'task_templates', 'template_tasks', 'file_comments', 'lead_notes', 'note_attachments', 'questions', 'return_attachments']
/* (REG-341) `demoDay` = the calendar day the base state was curated on, in the demo's time zone (the owner's machine
   runs IST, and the data repair rebases its due dates to that day's midnight). restoreBaseline() shifts open tasks'
   due dates by the whole days elapsed since it, so the fixture has to say which day "today" was. */
const DEMO_TZ = 'Asia/Kolkata'
const demoDay = new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())  // en-CA prints YYYY-MM-DD
if (!/^\d{4}-\d{2}-\d{2}$/.test(demoDay)) throw new Error(`demoDay formatted as "${demoDay}", expected YYYY-MM-DD`)
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const out: Record<string, unknown[]> = {}
let total = 0
for (const t of TABLES) {
  const res = await client.execute(`SELECT * FROM ${t}`)
  out[t] = res.rows.map((r) => Object.fromEntries(res.columns.map((c, i) => [c, r[i] === undefined ? null : r[i]])))
  total += res.rows.length
}
await writeFile('fixtures/baseline.json', JSON.stringify({ takenAt: new Date().toISOString(), demoDay, ...out }, null, 0))
console.log(`baseline snapshot: ${TABLES.length} tables, ${total} rows, demoDay ${demoDay} (${DEMO_TZ}) → fixtures/baseline.json`)
client.close()
