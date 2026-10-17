/**
 * (pending modules S39 — card studio:studio-health, 1.0's Accounts › Studio Health; her "build all of them" 2026-10-11, in its right form: the
 * studio's own records only, no page-view tracking and no nightly rollup — her Q-16 "No" declined the platform's telemetry, not the studio's
 * own story) What counts as a member having USED OpenMaison: every record that names a member as the one who did something, and when.
 * 1.0 counted its `usage_events` (fire-and-forget events written beside each action) and `auth_sessions`; 2.0 already keeps the doer on the
 * record itself — the stage log's mover, the note's author, the task's creator, the quote's maker, the file's uploader, the message's writer,
 * the AI run's member, the sign-in — so the same question is answered from what was done, never from a second log.
 *
 * One list, read by two places: Company › Reports › Studio health (lib/studio-health/queries.ts) and the demo's repair, which gives the demo's
 * history the sign-ins those acts imply (scripts/repair-demo-data.ts R123). Pure and client-safe: names of tables and columns only.
 * A time column may be seconds or milliseconds (Drizzle's `timestamp` · `timestamp_ms`); the query reads both as milliseconds.
 */

export type ActSource = {
  table: string
  /** the column naming the member (members.id) */
  member: string
  /** the column holding when */
  at: string
  /** what else the row must say (SQL over the table's own columns) */
  where?: string
}

/** Every record that names the member who did it. A few moments are told twice (a published update is also its event line) — that is fine:
    the list answers WHO was active and on WHICH days, never how many things they did. */
export const ACT_SOURCES: readonly ActSource[] = [
  { table: 'stage_logs', member: 'moved_by', at: 'created_at' },                  // moved a lead to a stage (REG-1381)
  { table: 'lead_assignees', member: 'assigned_by', at: 'assigned_at' },          // put a member on a lead
  { table: 'lead_tasks', member: 'creator_id', at: 'created_at' },                // added a task
  { table: 'lead_events', member: 'actor_id', at: 'at' },                         // the event log: a task ticked, a field edited, a project's every step
  { table: 'lead_notes', member: 'author_id', at: 'created_at' },                 // wrote a note or a contact log
  { table: 'task_comments', member: 'author_id', at: 'created_at' },              // commented on a task
  { table: 'quotes', member: 'created_by', at: 'created_at' },                    // made a quote (the Quotes tables' Creator, REG-471)
  { table: 'quotes', member: 'submitted_by', at: 'submitted_at' },                // sent one for approval
  { table: 'quotes', member: 'approved_by', at: 'approved_at' },                  // approved one
  { table: 'quotes', member: 'reviewed_by', at: 'reviewed_at' },                  // answered an approval
  { table: 'quote_versions', member: 'created_by', at: 'created_at' },            // revised one
  { table: 'lead_files', member: 'owner_id', at: 'created_at' },                  // uploaded a file or made a folder
  { table: 'project_updates', member: 'author_id', at: 'created_at' },            // wrote a site update
  { table: 'project_updates', member: 'published_by', at: 'published_at' },       // published one
  { table: 'project_updates', member: 'reviewed_by', at: 'reviewed_at' },         // reviewed one
  { table: 'project_messages', member: 'author_id', at: 'created_at', where: `author_kind = 'studio'` },   // wrote to a client or the team
  { table: 'lead_messages', member: 'author_id', at: 'created_at', where: `author_kind = 'studio'` },      // wrote to a lead
  { table: 'conversation_messages', member: 'author_id', at: 'created_at' },      // wrote in a team conversation
  { table: 'meetings', member: 'created_by', at: 'created_at' },                  // planned or wrote up a meeting
  { table: 'meetings', member: 'started_by', at: 'started_at' },                  // held one with the co-pilot
  { table: 'credit_ledger', member: 'member_id', at: 'created_at', where: `reason = 'spend'` },   // ran an AI tool (Plan › Usage's "Times used")
  { table: 'studio_sessions', member: 'member_id', at: 'started_at' },            // signed in (S30)
  { table: 'studio_sessions', member: 'member_id', at: 'last_seen_at' },          // …and was last seen on that sign-in
  { table: 'contracts', member: 'created_by', at: 'created_at' },                 // made a contract
  { table: 'contracts', member: 'sent_by', at: 'sent_at' },                       // sent one
  { table: 'contracts', member: 'marked_by', at: 'signed_at' },                   // marked one signed
  { table: 'quote_comparisons', member: 'created_by', at: 'created_at' },         // ran Quote X-Ray
  { table: 'project_tickets', member: 'resolved_by', at: 'resolved_at' },         // resolved a ticket
  { table: 'project_tickets', member: 'escalated_by', at: 'escalated_at' },       // escalated one
  { table: 'project_tickets', member: 'closed_by', at: 'closed_at' },             // closed one
  { table: 'project_invoices', member: 'created_by', at: 'created_at' },          // made an invoice
  { table: 'project_invoices', member: 'sent_by', at: 'sent_at' },                // sent one
  { table: 'project_payments', member: 'recorded_by', at: 'created_at' },         // recorded a payment
  { table: 'hangout_meetings', member: 'ended_by', at: 'ended_at' },              // ended a Hangout chat
  { table: 'hangout_meetings', member: 'started_by', at: 'started_at' },          // started one
  { table: 'hangout_participations', member: 'applied_by', at: 'applied_at' },    // applied for a Hangout
  { table: 'hangout_participations', member: 'plan_sent_by', at: 'plan_sent_at' },   // sent its plan
  { table: 'render_jobs', member: 'created_by', at: 'created_at' },               // rendered in the AI Visualizer
  { table: 'visualizer_designs', member: 'created_by', at: 'created_at' },        // started a design
  { table: 'space_layouts', member: 'created_by', at: 'created_at' },             // started a 3D layout
]

/** What a client did on their portal, by the client (homeowner_profiles.id) — the demo's repair reads it to give the portal's history the
    sign-ins it implies (R123); the report counts Qanvast Ops › Studios' own four figures (lib/studio-health/queries.ts `clientPortalActs`). */
export const CLIENT_SOURCES: readonly ActSource[] = [
  { table: 'homeowner_lead_links', member: 'homeowner_id', at: 'opened_at' },     // first opened their portal
  { table: 'homeowner_lead_links', member: 'homeowner_id', at: 'last_opened_at' },   // …and last
  { table: 'project_messages', member: 'author_id', at: 'created_at', where: `author_kind = 'client'` },
  { table: 'lead_messages', member: 'author_id', at: 'created_at', where: `author_kind = 'client'` },
  { table: 'project_tickets', member: 'raised_by_id', at: 'created_at', where: `raised_kind = 'client'` },
  { table: 'project_selections', member: 'chosen_homeowner_id', at: 'chosen_at', where: `chosen_by = 'client'` },
  { table: 'project_selections', member: 'client_answer_by', at: 'client_answer_at' },
  { table: 'project_payments', member: 'submitted_by', at: 'created_at' },        // said they paid
  { table: 'project_updates', member: 'client_opened_by', at: 'client_opened_at' },
]

/** A moment as milliseconds whether the column holds seconds or milliseconds (a second count is under 10^11 for the next thousand years). */
const ms = (col: string) => `(CASE WHEN ${col} < 100000000000 THEN ${col} * 1000 ELSE ${col} END)`

/** One SELECT over every source: rows of `{ m, at }` (the doer's id, the moment in ms), never a row without either. */
export function stampsSql(sources: readonly ActSource[]): string {
  return sources.map((s) => `SELECT ${s.member} AS m, ${ms(s.at)} AS at FROM ${s.table} WHERE ${s.member} IS NOT NULL AND ${s.at} IS NOT NULL${s.where ? ` AND ${s.where}` : ''}`).join('\nUNION ALL\n')
}
