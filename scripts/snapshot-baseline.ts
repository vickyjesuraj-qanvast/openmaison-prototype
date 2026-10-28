import { createClient } from '@libsql/client'
import { writeFile } from 'node:fs/promises'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import { BUSY_WAIT_MS } from '../lib/db/local-file'

/** Snapshot every table into fixtures/baseline.json — the state "Reset prototype" returns to. Run after curating demo data. */
// Keep in sync with BASELINE_TABLES in lib/db/baseline.ts (restore order = this order).
const TABLES = ['users', 'organizations', 'memberships', 'members', 'studio_invitations', 'studio_sessions', 'leads', 'lead_assignees', 'homeowner_profiles', 'homeowner_lead_links', 'portal_addresses', 'portal_sessions', 'studio_scope_questions', 'lead_custom_fields', 'lead_custom_field_values', 'lead_events', 'lead_tasks', 'stage_logs', 'imports', 'import_rows', 'settings', 'library_folders', 'quotes', 'quote_templates', 'quote_template_versions', 'quote_comparisons', 'quote_text_templates', 'payment_templates', 'price_book_items', 'price_book_changes', 'price_book_sections', 'quote_items', 'quote_item_comments', 'quote_payments', 'quote_versions', 'contract_templates', 'contract_template_files', 'contracts', 'contract_bundles', 'projects', 'notifications', 'lead_files', 'quote_files', 'lead_questionnaires', 'lead_returns', 'tags', 'task_tags', 'task_assignees', 'task_comments', 'task_attachments', 'task_templates', 'template_tasks', 'file_comments', 'lead_notes', 'note_attachments', 'questions', 'return_attachments', 'studio_materials', 'lead_file_images', 'lead_file_renders', 'visualizer_designs', 'project_rooms', 'render_jobs', 'render_images', 'render_annotations', 'render_share_links', 'render_consultation_requests', 'plans', 'subscriptions', 'studio_credit_balances', 'credit_ledger', 'studio_member_credit_caps', 'billing_checkout_sessions', 'invoices', 'credit_requests', 'nudge_state', 'project_updates', 'project_update_files', 'project_milestones', 'project_schedule_shares', 'schedule_templates', 'schedule_template_items', 'project_selections', 'project_selection_options', 'project_invoices', 'homeowner_household_links', 'portal_bell_reads', 'project_payments', 'portal_previews', 'project_milestone_links', 'project_milestone_extensions', 'project_share_requests', 'lead_file_thumbs', 'notification_outbox', 'question_answer_history', 'vendors', 'purchase_orders', 'purchase_order_lines', 'supplier_bills', 'expenses', 'payments_out', 'cost_documents', 'project_floor_plans', 'floor_plan_pictures', 'floor_plan_marks', 'floor_plan_comments', 'floor_plan_confirmations', 'floor_plan_seen', 'commission_rules', 'commission_shares', 'commission_requests', 'commission_payouts', 'credit_notes', 'xero_links', 'xero_sync_log', 'project_tickets', 'ticket_replies', 'project_messages', 'chat_reads', 'studio_pictures', 'project_compliance', 'space_layouts', 'space_layout_shares', 'space_layout_versions', 'floor_plan_photos', 'lead_messages', 'conversation_prefs', 'maison_questions', 'studio_fonts', 'meetings', 'copilot_objection_log', 'studio_objection_responses', 'studio_competitor_list', 'studio_checklist_items', 'marketplace_categories', 'marketplace_brands', 'marketplace_deals', 'marketplace_products', 'marketplace_banners', 'marketplace_deal_asks', 'market_insights', 'conversations', 'conversation_participants', 'conversation_messages', 'conversation_files', 'hangout_events', 'hangout_shifts', 'hangout_participations', 'hangout_designers', 'hangout_registrations', 'hangout_meetings', 'member_portfolio_projects', 'member_portfolio_pictures', 'beta_signups', 'contact_messages', 'newsletter_subscribers', 'inbound_messages', 'studio_verifications', 'studio_verification_files', 'kept_line_costs', 'project_contractors', 'dashboard_snoozes']   // (parity map 2026-10-10) migration 0085's tables · (pending modules S34) inbound_messages
/* (REG-341) `demoDay` = the calendar day the base state was curated on, in the demo's time zone (the owner's machine
   runs IST, and the data repair rebases its due dates to that day's midnight). restoreBaseline() shifts open tasks'
   due dates by the whole days elapsed since it, so the fixture has to say which day "today" was. */
const DEMO_TZ = 'Asia/Kolkata'
const demoDay = new Intl.DateTimeFormat('en-CA', { timeZone: DEMO_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())  // en-CA prints YYYY-MM-DD
if (!/^\d{4}-\d{2}-\d{2}$/.test(demoDay)) throw new Error(`demoDay formatted as "${demoDay}", expected YYYY-MM-DD`)
const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN, timeout: BUSY_WAIT_MS })   // (pending modules S08b) wait for a running server's lock instead of failing
const out: Record<string, unknown[]> = {}
let total = 0
for (const t of TABLES) {
  const res = await client.execute(`SELECT * FROM ${t}`)
  out[t] = res.rows.map((r) => Object.fromEntries(res.columns.map((c, i) => [c, r[i] === undefined ? null : r[i]])))
  total += res.rows.length
}
/* (REG-667) The base state is always signed in as Dane — a snapshot taken while Demo Studio › View as shows another member must not
   make that member everyone's "you" after a reset. */
out.members = (out.members as Record<string, unknown>[]).map((m) => ({ ...m, is_you: m.id === 'dane' ? 1 : 0 }))
await writeFile('fixtures/baseline.json', JSON.stringify({ takenAt: new Date().toISOString(), demoDay, ...out }, null, 0))
console.log(`baseline snapshot: ${TABLES.length} tables, ${total} rows, demoDay ${demoDay} (${DEMO_TZ}) → fixtures/baseline.json`)
client.close()
