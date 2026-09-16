import { createClient } from '@libsql/client'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Seeds two STUDIO tasks (REG-466) — tasks that belong to no lead, the rail's Tasks page's own case: one overdue (so the
 * rail badge has something to count), one ahead. Idempotent by id. Run after seed-tasks; then `npm run db:repair` and
 * `npm run db:baseline`.
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (d: Date) => Math.floor(d.getTime() / 1000)
const now = new Date()
const days = (n: number, h = 10) => sec(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, h, 0))

const member = async (name: string) => String((await client.execute({ sql: 'SELECT id FROM members WHERE name = ?', args: [name] })).rows[0]?.id ?? '')
const me = await member('Dane'); const sarah = await member('Sarah')
if (!me) throw new Error('members not seeded')
const tag = String((await client.execute({ sql: "SELECT id FROM tags WHERE name = 'Generic'", args: [] })).rows[0]?.id ?? '')

const STUDIO = [
  { id: 'studio-task-price-list', title: 'Update the showroom price list for Q4', description: 'Laminate and quartz suppliers revised their rates in September — refresh the price book before the next quote goes out.', due: days(9), assignee: sarah, created: days(-6, 9) },
  { id: 'studio-task-samples', title: 'Chase the supplier for the laminate sample board', description: 'The walnut and oak boards promised two weeks ago have not arrived; the showroom wall is missing both.', due: days(-3), assignee: me, created: days(-12, 11) },
]
for (const t of STUDIO) {
  const exists = (await client.execute({ sql: 'SELECT 1 FROM lead_tasks WHERE id = ?', args: [t.id] })).rows.length > 0
  if (exists) { console.log(`seed-studio-tasks: ${t.id} present`); continue }
  await client.execute({ sql: `INSERT INTO lead_tasks (id, lead_id, title, kind, description, due_at, done, created_at, updated_at, seen_at, creator_id) VALUES (?, NULL, ?, 'General', ?, ?, 0, ?, NULL, ?, ?)`,
    args: [t.id, t.title, t.description, t.due, t.created, t.created, me] })
  if (t.assignee) await client.execute({ sql: 'INSERT INTO task_assignees (task_id, member_id) VALUES (?, ?)', args: [t.id, t.assignee] })
  if (tag) await client.execute({ sql: 'INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', args: [t.id, tag] })
  console.log(`seed-studio-tasks: added ${t.title}`)
}
client.close()
