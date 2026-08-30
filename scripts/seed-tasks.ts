import { createClient } from '@libsql/client'
import { randomUUID } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'

/**
 * Seeds the Lead Details › Tasks demo records (902-36216) — idempotent (skips when the tag catalogue exists).
 *
 *  tags       Generic · Focus · Tag 1 · Tag 2                                  (Manage Tags 902:27709)
 *  Olivia     four tasks as the listing mock (frame 191): a new open task nobody has opened (band, no assignee / due / tags),
 *             an open overdue task with 1 comment + 1 attachment + 4 tags, two completed tasks with an attachment + 4 tags —
 *             the completed ones created by James (frame 190 "Tasks added by other team member")
 *  comments   James: "Client asked for the walnut laminate finish, please change the material." · You: "Got it, thanks! 👍"  (902:28517)
 *  templates  "Template 1" (1 task) and "Leads Template" (Choose Template 902:29198 · Save as Template 902:29220)
 */
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const sec = (d: Date) => Math.floor(d.getTime() / 1000)
const local = (y: number, m: number, d: number, h = 10, mi = 0) => sec(new Date(y, m - 1, d, h, mi))
const now = new Date()
const daysAgo = (n: number, h = 10) => sec(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, h, 0))

const existingTags = Number((await client.execute('SELECT count(*) AS n FROM tags')).rows[0]?.n ?? 0)
if (existingTags > 0) { console.log('seed-tasks: tags already present — nothing to do'); client.close(); process.exit(0) }

const lead = (await client.execute({ sql: "SELECT id FROM leads WHERE name = 'Olivia Martinez' AND deleted_at IS NULL", args: [] })).rows[0]?.id
if (!lead) throw new Error('Olivia Martinez not found')
const leadId = String(lead)
const files = (await client.execute({ sql: "SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'image' ORDER BY created_at", args: [leadId] })).rows.map((r) => String(r.id))

const tagIds: Record<string, string> = {}
for (const name of ['Generic', 'Focus', 'Tag 1', 'Tag 2']) {
  const id = randomUUID(); tagIds[name] = id
  await client.execute({ sql: 'INSERT INTO tags (id, name, created_at) VALUES (?,?,?)', args: [id, name, local(2026, 7, 1)] })
}

// Existing tasks get a creator and an updated stamp (no other change).
await client.execute({ sql: "UPDATE lead_tasks SET creator_id = COALESCE(creator_id, 'dane'), updated_at = COALESCE(updated_at, created_at), seen_at = COALESCE(seen_at, created_at)", args: [] })

const task = async (t: { title: string; done: boolean; due: number | null; created: number; creator: string; seen: boolean; assignees: string[]; tags: string[]; description?: string; kind?: string }) => {
  const id = randomUUID()
  await client.execute({ sql: 'INSERT INTO lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    args: [id, leadId, t.title, t.kind ?? 'General', t.due, t.done ? 1 : 0, t.created, t.creator, t.description ?? null, t.seen ? t.created : null, t.created] })
  for (const m of t.assignees) await client.execute({ sql: 'INSERT INTO task_assignees (task_id, member_id) VALUES (?,?)', args: [id, m] })
  for (const g of t.tags) await client.execute({ sql: 'INSERT INTO task_tags (task_id, tag_id) VALUES (?,?)', args: [id, tagIds[g]!] })
  return id
}
const allTags = ['Generic', 'Focus', 'Tag 1', 'Tag 2']
const desc = 'This is a length of a task title entered by the owner/admin/designer'
// 1 — new, nobody has opened it yet (primary band)
await task({ title: 'Confirm site access for the measurement visit', done: false, due: null, created: daysAgo(0, 9), creator: 'dane', seen: false, assignees: [], tags: [] })
// 2 — open, overdue, with a comment thread and an attachment
const t2 = await task({ title: 'Send the revised material board to the client', done: false, due: local(2026, 7, 17), created: daysAgo(3, 11), creator: 'dane', seen: true, assignees: ['james'], tags: allTags, description: desc })
// 3 · 4 — completed, created by James (frame 190)
const t3 = await task({ title: 'Share portfolio deck and studio introduction', done: true, due: local(2026, 7, 17), created: local(2026, 7, 17, 9), creator: 'james', seen: true, assignees: ['dane', 'james'], tags: allTags, description: desc })
const t4 = await task({ title: 'Book the showroom visit slot', done: true, due: local(2026, 7, 17), created: local(2026, 7, 17, 9, 30), creator: 'james', seen: true, assignees: ['dane'], tags: allTags, description: desc })

const comment = async (taskId: string, author: string, body: string, at: number) =>
  client.execute({ sql: 'INSERT INTO task_comments (id, task_id, author_id, body, created_at, updated_at) VALUES (?,?,?,?,?,?)', args: [randomUUID(), taskId, author, body, at, at] })
await comment(t2, 'james', 'Client asked for the walnut laminate finish, please change the material.', daysAgo(2, 14))
await comment(t2, 'dane', 'Got it, thanks! 👍', daysAgo(2, 15))

const attach = async (taskId: string, fileId: string | undefined, at: number) => { if (fileId) await client.execute({ sql: 'INSERT INTO task_attachments (task_id, file_id, created_at) VALUES (?,?,?)', args: [taskId, fileId, at] }) }
await attach(t2, files[0], daysAgo(2, 12)); await attach(t3, files[1], local(2026, 7, 17, 10)); await attach(t4, files[2], local(2026, 7, 17, 10))

const template = async (name: string, tasks: string[], keepMembers = true, keepDescription = true) => {
  const id = randomUUID()
  await client.execute({ sql: 'INSERT INTO task_templates (id, name, keep_members, keep_description, created_at) VALUES (?,?,?,?,?)', args: [id, name, keepMembers ? 1 : 0, keepDescription ? 1 : 0, local(2026, 7, 10)] })
  for (const [i, title] of tasks.entries()) await client.execute({ sql: 'INSERT INTO template_tasks (id, template_id, title, description, kind, sort_order) VALUES (?,?,?,?,?,?)', args: [randomUUID(), id, title, null, 'General', i] })
}
await template('Template 1', ['Schedule a meeting with the client'])
await template('Leads Template', ['Call or WhatsApp the lead within 24h', 'Schedule a meeting with the client', 'Send the quote for approval'])
console.log('seed-tasks: done')
client.close()
