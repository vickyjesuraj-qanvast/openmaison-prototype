import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { client } from '@/lib/db'

/**
 * Prototype base state (user 2026-08-29): a snapshot of every table, taken with `pnpm db:baseline`
 * into fixtures/baseline.json. `restoreBaseline()` puts the database back to it — the demo's
 * "reset to original" behind the Maison AI FAB. Order matters for foreign keys: parents first.
 *
 * Due dates ride the calendar (REG-341): the snapshot also records `demoDay`, the calendar day the base
 * state was curated on, and a restore moves every OPEN task's due_at by the whole days elapsed since —
 * so "Due today", "Upcoming" and the deliberately overdue examples keep their meaning however long after
 * the snapshot the reset runs. Done tasks and every other stamp stay absolute.
 */
/* Parents before children — the restore inserts in this order and deletes in reverse. `lead_tasks` sits after quotes, files and
   tags, right before its own link tables: a task can point at the quote whose due date raised it (REG-470). */
export const BASELINE_TABLES = ['users', 'organizations', 'memberships', 'members', 'leads', 'lead_assignees', 'homeowner_profiles', 'homeowner_lead_links', 'studio_scope_questions', 'lead_custom_fields', 'lead_custom_field_values', 'lead_events', 'stage_logs', 'imports', 'import_rows', 'settings', 'library_folders', 'quotes', 'quote_templates', 'quote_template_versions', 'quote_comparisons', 'quote_text_templates', 'payment_templates', 'price_book_items', 'price_book_changes', 'price_book_sections', 'quote_items', 'quote_item_comments', 'quote_payments', 'quote_versions', 'contract_templates', 'contracts', 'contract_bundles', 'notifications', 'lead_files', 'quote_files', 'lead_questionnaires', 'lead_returns', 'tags', 'lead_tasks', 'task_tags', 'task_assignees', 'task_comments', 'task_attachments', 'task_templates', 'template_tasks', 'file_comments', 'lead_notes', 'note_attachments', 'questions', 'return_attachments'] as const
export const BASELINE_FILE = path.join(process.cwd(), 'fixtures', 'baseline.json')

/** The fixture: one row list per table, with `takenAt` (an ISO instant) and `demoDay` (YYYY-MM-DD) beside them. */
export type Baseline = { takenAt?: string; demoDay?: string } & Partial<Record<(typeof BASELINE_TABLES)[number], Record<string, unknown>[]>>

const DAY_MS = 86_400_000

/** `d`'s calendar day on the process clock as YYYY-MM-DD — the day `startOfDay` (lib/format) groups tasks by. */
export function localIsoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local midnight of a YYYY-MM-DD day, or null for anything that is not one (a rolled-over 2026-02-30 included). */
function localMidnight(day: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return null
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return localIsoDay(t) === day ? t.getTime() : null
}

/**
 * Whole calendar days from `demoDay` to `now`'s day on the process clock — the shift a restore applies to open
 * tasks' due dates. 0 for a fixture without a (valid) demoDay, so an older snapshot restores exactly as taken.
 */
export function dueShiftDays(demoDay: string | undefined, now: Date = new Date()): number {
  const from = demoDay === undefined ? null : localMidnight(demoDay)
  if (from === null) return 0
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((to - from) / DAY_MS)  // round, not floor: a DST edge is ±1h, never a day
}

export async function restoreBaseline(opts: { file?: string; now?: Date } = {}): Promise<{ tables: number; rows: number; demoDay: string | null; shiftedDays: number }> {
  const base = JSON.parse(await readFile(opts.file ?? BASELINE_FILE, 'utf8')) as Baseline
  const stmts: { sql: string; args: (string | number | null)[] }[] = []
  for (const t of [...BASELINE_TABLES].reverse()) stmts.push({ sql: `DELETE FROM ${t}`, args: [] })
  let rows = 0
  for (const t of BASELINE_TABLES) {
    for (const row of base[t] ?? []) {
      const cols = Object.keys(row)
      stmts.push({ sql: `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args: cols.map((c) => row[c] as string | number | null) })
      rows++
    }
  }
  // (REG-341) Open tasks' due dates follow the calendar. The seconds column moves by whole days, so the hour a real
  // pick wrote (10:00 by default) reads the same; done tasks keep the day they were actually due.
  const demoDay = typeof base.demoDay === 'string' ? base.demoDay : null
  const shiftedDays = dueShiftDays(demoDay ?? undefined, opts.now)
  if (shiftedDays !== 0) stmts.push({ sql: 'UPDATE lead_tasks SET due_at = due_at + ? WHERE done = 0 AND due_at IS NOT NULL', args: [shiftedDays * 86_400] })
  await client.batch(stmts, 'write')   // one transaction: all or nothing
  return { tables: BASELINE_TABLES.length, rows, demoDay, shiftedDays }
}
