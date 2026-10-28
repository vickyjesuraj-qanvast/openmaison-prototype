import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { client } from '@/lib/db'
import { clampCreditBookkeeping, creditOwnership, reanchorDays, shiftCreditSnapshot, snapshotMonth, type SnapshotRows } from '@/lib/credits/demo-month'
import { shiftDemoRows } from '@/lib/db/demo-day'
import { timeColumns } from '@/lib/db/time-columns'

/**
 * Prototype base state (user 2026-08-29): a snapshot of every table, taken with `pnpm db:baseline`
 * into fixtures/baseline.json. `restoreBaseline()` puts the database back to it — the demo's
 * "reset to original" behind the Maison AI FAB. Order matters for foreign keys: parents first.
 *
 * Due dates ride the calendar (REG-341): the snapshot also records `demoDay`, the calendar day the base
 * state was curated on, and a restore moves every OPEN task's due_at by the whole days elapsed since —
 * so "Due today", "Upcoming" and the deliberately overdue examples keep their meaning however long after
 * the snapshot the reset runs. (S42 audit A-03) Since 2026-10-14 every moment of the demo rides the same whole days, not only open tasks —
 * lib/db/demo-day.ts says why and what — and the AI credits story keeps its own move (pending modules S08b), so its month holds today
 * (`creditShiftDays`, lib/credits/demo-month.ts).
 */
/* Parents before children — the restore inserts in this order and deletes in reverse. `lead_tasks` sits after quotes, files and
   tags, right before its own link tables: a task can point at the quote whose due date raised it (REG-470). */
export const BASELINE_TABLES = ['users', 'organizations', 'memberships', 'members', 'studio_invitations', 'studio_sessions', 'leads', 'lead_assignees', 'homeowner_profiles', 'homeowner_lead_links', 'portal_addresses', 'portal_sessions', 'studio_scope_questions', 'lead_custom_fields', 'lead_custom_field_values', 'lead_events', 'stage_logs', 'imports', 'import_rows', 'settings', 'library_folders', 'quotes', 'quote_templates', 'quote_template_versions', 'quote_comparisons', 'quote_text_templates', 'payment_templates', 'price_book_items', 'price_book_changes', 'price_book_sections', 'quote_items', 'quote_item_comments', 'quote_payments', 'quote_versions', 'contract_templates', 'contract_template_files', 'contracts', 'contract_bundles', 'projects', 'notifications', 'lead_files', 'quote_files', 'lead_questionnaires', 'lead_returns', 'tags', 'lead_tasks', 'task_tags', 'task_assignees', 'task_comments', 'task_attachments', 'task_templates', 'template_tasks', 'file_comments', 'lead_notes', 'note_attachments', 'questions', 'return_attachments', 'studio_materials', 'lead_file_images', 'lead_file_renders', 'visualizer_designs', 'project_rooms', 'render_jobs', 'render_images', 'render_annotations', 'render_share_links', 'render_consultation_requests', 'plans', 'subscriptions', 'studio_credit_balances', 'credit_ledger', 'studio_member_credit_caps', 'billing_checkout_sessions', 'invoices', 'credit_requests', 'nudge_state', 'project_updates', 'project_update_files', 'project_milestones', 'project_schedule_shares', 'schedule_templates', 'schedule_template_items', 'project_selections', 'project_selection_options', 'project_invoices', 'homeowner_household_links', 'portal_bell_reads', 'project_payments', 'portal_previews', 'project_milestone_links', 'project_milestone_extensions', 'project_share_requests', 'lead_file_thumbs', 'notification_outbox', 'question_answer_history', 'vendors', 'purchase_orders', 'purchase_order_lines', 'supplier_bills', 'expenses', 'payments_out', 'cost_documents', 'project_floor_plans', 'floor_plan_pictures', 'floor_plan_marks', 'floor_plan_comments', 'floor_plan_confirmations', 'floor_plan_seen', 'commission_rules', 'commission_shares', 'commission_requests', 'commission_payouts', 'credit_notes', 'xero_links', 'xero_sync_log', 'project_tickets', 'ticket_replies', 'project_messages', 'chat_reads', 'studio_pictures', 'project_compliance', 'space_layouts', 'space_layout_shares', 'space_layout_versions', 'floor_plan_photos', 'lead_messages', 'conversation_prefs', 'maison_questions', 'studio_fonts', 'meetings', 'copilot_objection_log', 'studio_objection_responses', 'studio_competitor_list', 'studio_checklist_items', 'marketplace_categories', 'marketplace_brands', 'marketplace_deals', 'marketplace_products', 'marketplace_banners', 'marketplace_deal_asks', 'market_insights', 'conversations', 'conversation_participants', 'conversation_messages', 'conversation_files', 'hangout_events', 'hangout_shifts', 'hangout_participations', 'hangout_designers', 'hangout_registrations', 'hangout_meetings', 'member_portfolio_projects', 'member_portfolio_pictures', 'beta_signups', 'contact_messages', 'newsletter_subscribers', 'inbound_messages', 'studio_verifications', 'studio_verification_files', 'kept_line_costs', 'project_contractors', 'dashboard_snoozes'] as const   // (parity map 2026-10-10) migration 0085's tables · (pending modules S34) inbound_messages · (S41b-4) nudge_state
export const BASELINE_FILE = path.join(process.cwd(), 'fixtures', 'baseline.json')

/** The fixture: one row list per table, with `takenAt` (an ISO instant) and `demoDay` (YYYY-MM-DD) beside them. */
export type Baseline = { takenAt?: string; demoDay?: string } & Partial<Record<(typeof BASELINE_TABLES)[number], Record<string, unknown>[]>>

const DAY_MS = 86_400_000
const DAY_S = 86_400

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

/**
 * (pending modules S08b) The whole days the snapshot's AI credits story moves on restore: the open tasks' shift, and — when the snapshot's
 * own month had already ended by its demo day, so the shifted month still doesn't hold today — on to where R63 made it (lib/credits/
 * demo-month.ts). 0 when the fixture has no credits month.
 */
export function creditShiftDays(base: SnapshotRows, taskShift: number, now: Date = new Date()): number {
  const m = snapshotMonth(base)
  if (!m) return 0
  const t = Math.floor(now.getTime() / 1000)
  const holds = (s: number) => m.periodStart + s * DAY_S <= t && m.periodEnd + s * DAY_S > t && m.latest + s * DAY_S <= t
  if (holds(taskShift)) return taskShift
  const cap = Math.floor((t - m.latest) / DAY_S)   // a snapshot taken late in its day, restored early in a later one: a day less, nothing ahead of now
  if (cap < taskShift && holds(cap)) return cap
  return reanchorDays({ ...m, now: t }) ?? taskShift
}

export async function restoreBaseline(opts: { file?: string; now?: Date } = {}): Promise<{ tables: number; rows: number; demoDay: string | null; shiftedDays: number; creditDays: number }> {
  const base = JSON.parse(await readFile(opts.file ?? BASELINE_FILE, 'utf8')) as Baseline
  // (REG-341 → S42 audit A-03) The demo follows the calendar. Every stamp moves by whole days, so the hour a real pick wrote (10:00 by
  // default) reads the same, and every gap between two records is kept.
  const demoDay = typeof base.demoDay === 'string' ? base.demoDay : null
  const shiftedDays = dueShiftDays(demoDay ?? undefined, opts.now)
  /* (pending modules S08b) the AI credits month rides the demo day too: the story moves as a whole, so the base always reads "this month"
     and "last month" as curated, wherever the clock is — and no first page rolls a month that ended (lib/credits/demo-month.ts) */
  const creditDays = creditShiftDays(base as SnapshotRows, shiftedDays, opts.now)
  /* (S42 audit A-03) every other moment of the demo rides the demo day as one — the credits story's rows by its own days, left to it */
  const own = creditOwnership(base as SnapshotRows)
  const takenAt = typeof base.takenAt === 'string' ? Date.parse(base.takenAt) : NaN   // what happened never lands after now (lib/db/demo-day.ts)
  const world = shiftDemoRows(base as SnapshotRows, shiftedDays, timeColumns(), { skip: own.owns, daysFor: (t, r) => (own.isStoryRow(t, r) ? creditDays : shiftedDays), clock: { takenAt, now: (opts.now ?? new Date()).getTime() } })
  const tables = clampCreditBookkeeping(shiftCreditSnapshot(world, creditDays), Math.floor((opts.now ?? new Date()).getTime() / 1000))   // (S43B · F1-10) the balance's own stamp never ahead of now
  const stmts: { sql: string; args: (string | number | null)[] }[] = []
  for (const t of [...BASELINE_TABLES].reverse()) stmts.push({ sql: `DELETE FROM ${t}`, args: [] })
  let rows = 0
  for (const t of BASELINE_TABLES) {
    for (const row of tables[t] ?? []) {
      const cols = Object.keys(row)
      stmts.push({ sql: `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, args: cols.map((c) => row[c] as string | number | null) })
      rows++
    }
  }
  /* (S42 audit A-03) open tasks (REG-341), planned meetings (S23), the Marketplace (S24), Market Insights (S25), Hangouts (S27) and live share
     links (fix-G) each had their own move here; they ride with everything else now (lib/db/demo-day.ts), by the same days */
  await client.batch(stmts, 'write')   // one transaction: all or nothing
  return { tables: BASELINE_TABLES.length, rows, demoDay, shiftedDays, creditDays }
}
