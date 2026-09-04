process.env.TZ = process.env.TZ ?? 'Asia/Kolkata'   // before any Date: every `when` string and every due hour is local (the demo machine runs IST)

import { createClient, type InStatement } from '@libsql/client'
import { createHash } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import { emptyWizardData, SYSTEM_CONTRACT, SYSTEM_QUOTE, type WizardData } from '../lib/leads/stage-data'
import { formatInputDateTime } from '../lib/format'
import { STAGES } from '../lib/leads/enums'

/**
 * Makes the demo data say what the UI shows (REG-343). Idempotent: every inserted row carries a deterministic id
 * (`sid`), every rewrite is by row id, and a second run changes nothing.
 *
 * The prototype derives everything — the Lead stages card, the Activity feed, the Notes tab's contact logs, the
 * Overview cards — from the lead's own records. The seeds wrote leads straight into a stage, so a lead could sit in
 * Contacted with no move behind it: the card showed no durations and Activity showed nothing (user 2026-09-04:
 * "I checked a lead named Farah Ahmad — the stage is Contacted, two members are assigned, but in the activity there
 * is nothing"). This script writes the records a real user action would have left, with timestamps in order.
 *
 * Run it after any seeding, then snapshot:  pnpm db:repair && pnpm db:baseline
 */

const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN })
const H = 3600
const D = 86_400
const NOW = Math.floor(Date.now() / 1000)
/** Local midnight of the run day — the only run-time input, and only open due dates hang off it. */
const D0 = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime() / 1000)

/** A deterministic uuid-shaped id, so re-running upserts the same rows instead of duplicating them. */
function sid(seed: string, kind: string): string {
  const h = createHash('sha256').update(`${seed}:${kind}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
const fmt = (sec: number): string => formatInputDateTime(new Date(sec * 1000))
/** 18:00 local on `sec`'s calendar day — the due date returnLead writes (new Date(y, m, d, 18, 0)). */
function sixPm(sec: number): number {
  const d = new Date(sec * 1000)
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 0, 0).getTime() / 1000)
}
/** How a studio first reaches a lead, by where the lead came from. */
function channelFor(source: string): string {
  if (source === 'Email') return 'Email'
  if (source === 'Walk-in' || source === 'Referral') return 'Call'
  return 'WhatsApp'
}

const stmts: InStatement[] = []
const push = (sql: string, args: unknown[] = []) => { stmts.push({ sql, args: args as never }) }
const notes: string[] = []
const note = (s: string) => { notes.push(s); console.log('  ' + s) }

type LeadRow = {
  id: string; name: string; stage: string; source: string; created_at: number; updated_at: number
  budget_minor: number; deleted_at: number | null
}

const rows = <T>(r: { rows: unknown[] }): T[] => r.rows as T[]

/* ────────────────────────────────────────────────────────────────────────────────────────────────
   The trail a lead's journey leaves. `hopTimes` spaces the moves like a studio working a lead —
   a day to first contact, a few days to the meeting, a week to the quote — and compresses evenly
   when the lead reached its stage sooner (Aisha Rahman won in four days).
   ──────────────────────────────────────────────────────────────────────────────────────────────── */
const STD = [1 * D + 3 * H, 4 * D + 3 * H, 8 * D + 3 * H, 13 * D + 3 * H]

function hopTimes(created: number, count: number, deadline: number): number[] {
  const std = STD.slice(0, count).map((o) => created + o)
  if (count === 0 || std[std.length - 1]! <= deadline) return std
  const start = created + 6 * H
  const step = (deadline - 6 * H - start) / count
  return Array.from({ length: count }, (_, i) => Math.round(start + step * (i + 1)))
}

/** The full WizardData each hop stores — cumulative, as moveStage writes the whole object every time. */
function trailPayloads(lead: LeadRow, assignees: string[], times: number[], quoteTitle: string): WizardData[] {
  const count = times.length
  const base = emptyWizardData(assignees)
  const log = {
    channel: channelFor(lead.source),
    when: fmt(times[0]! - 15 * 60),
    outcome: count > 1 ? 'Meeting scheduled' : 'Callback requested',
    nextStepWhen: '', nextStepMode: '', files: ['Q-101'], notes: '',
  }
  const meeting = count > 1 ? { where: 'In person', when: fmt(times[1]! - 2 * H), files: [], notes: '' } : base.meetings[0]!
  return times.map((_, i) => ({
    ...base,
    assignees,
    logs: [log],
    meetings: [meeting],
    quoteTab: 'system' as const,
    quoteSelected: i >= 2 ? quoteTitle : base.quoteSelected,
    quoteAmount: '',
    wonQuoteTab: 'system' as const,
    wonQuote: i >= 3 ? quoteTitle : base.wonQuote,
    wonContractTab: 'system' as const,
    wonContract: i >= 3 ? SYSTEM_CONTRACT : base.wonContract,
  }))
}

async function main() {
  const leads = rows<LeadRow>(await client.execute('SELECT * FROM leads'))
  const byName = new Map(leads.map((l) => [l.name, l]))
  const live = leads.filter((l) => l.deleted_at === null)

  /* ── R1 · purge the keyboard-mash test rows the seeds and demos left behind ───────────────────── */
  console.log('\nR1 purge test junk')
  const junkLeads = rows<{ id: string; name: string }>(await client.execute(
    `SELECT id, name FROM leads WHERE deleted_at IS NOT NULL AND lower(name) = 'test'`))
  for (const j of junkLeads) {
    for (const t of ['lead_assignees', 'lead_tasks', 'stage_logs', 'lead_notes', 'lead_files', 'quotes', 'contracts', 'lead_returns', 'import_rows']) {
      push(`DELETE FROM ${t} WHERE ${t === 'import_rows' ? 'duplicate_of_lead_id' : 'lead_id'} = ?`, [j.id])
    }
    push('DELETE FROM leads WHERE id = ?', [j.id])
  }
  note(`${junkLeads.length} junk trashed leads removed`)

  const mash = rows<{ id: string; title: string }>(await client.execute(
    `SELECT id, title FROM lead_tasks WHERE lower(title) IN ('test','tse6y"') OR title LIKE 'hgdk%' OR title LIKE 'adfad%' OR title LIKE 'sdajk%'`))
  for (const t of mash) {
    for (const tbl of ['task_tags', 'task_assignees', 'task_comments', 'task_attachments']) push(`DELETE FROM ${tbl} WHERE task_id = ?`, [t.id])
    push('DELETE FROM lead_tasks WHERE id = ?', [t.id])
  }
  note(`${mash.length} junk tasks removed`)

  push(`DELETE FROM quotes WHERE amount_minor = 0 AND title IN (SELECT name FROM leads)`)
  const junkQuotes = rows<{ n: number }>(await client.execute(
    `SELECT count(*) AS n FROM quotes WHERE amount_minor = 0 AND title IN (SELECT name FROM leads)`))
  note(`${junkQuotes[0]?.n ?? 0} empty draft quotes removed`)

  /* ── R2 · field values inside the app's own vocabulary ────────────────────────────────────────── */
  console.log('\nR2 field vocabulary')
  push(`UPDATE leads SET key_collection = 'Collected' WHERE key_collection = 'Keys Collected'`)
  note(`key_collection 'Keys Collected' → 'Collected'`)
  // The five Qanvast Ops leads were seeded from one template and share a phone with Olivia — a duplicate check
  // would match the wrong lead, and the listing reads as copy-paste. Give each its own identity.
  const qanvast: [string, string, number, string][] = [
    ['David Koh', '91234568', 6_200_000, 'HDB 3-Room'],
    ['Farah Isa', '91234569', 5_850_000, 'BTO 4-Room'],
    ['Emily Han', '91234570', 7_100_000, 'HDB 4-Room'],
    ['Jasmine Lee', '91234571', 6_650_000, 'HDB 5-Room'],
    ['Gavin See', '91234572', 8_400_000, 'Condo 3-bedder'],
  ]
  for (const [name, phone, budget, type] of qanvast) {
    const l = byName.get(name)
    if (l) push('UPDATE leads SET phone = ?, budget_minor = ?, property_type = ? WHERE id = ?', [phone, budget, type, l.id])
  }
  note(`${qanvast.length} Qanvast leads given distinct phone / budget / property type`)

  /* ── R3 · when each member was put on the lead ────────────────────────────────────────────────── */
  console.log('\nR3 assigned_at')
  const assignees = rows<{ id: string; lead_id: string; member_id: string; assigned_at: number | null }>(
    await client.execute('SELECT id, lead_id, member_id, assigned_at FROM lead_assignees ORDER BY rowid'))
  const perLead = new Map<string, string[]>()
  for (const a of assignees) {
    const list = perLead.get(a.lead_id) ?? []
    list.push(a.member_id)
    perLead.set(a.lead_id, list)
    const lead = leads.find((x) => x.id === a.lead_id)
    if (!lead) continue
    const first = lead.source === 'Qanvast' ? 2 * H : 30 * 60   // a Qanvast lead is triaged before anyone takes it
    const at = lead.created_at + first + 2 * H * (list.length - 1)
    push('UPDATE lead_assignees SET assigned_at = ? WHERE id = ?', [at, a.id])
  }
  note(`${assignees.length} assignment rows stamped`)

  // A lead past New must have an owner (REG-130). Chloe Yap was seeded Lost with nobody on her.
  // Same stamp the rule above writes, so a second run finds nothing to change.
  const orphan = live.filter((l) => l.stage !== 'New' && !perLead.has(l.id))
  for (const l of orphan) {
    const at = l.created_at + (l.source === 'Qanvast' ? 2 * H : 30 * 60)
    push(`INSERT INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET assigned_at = excluded.assigned_at`, [sid(l.id, 'assignee'), l.id, 'sarah', at])
    perLead.set(l.id, ['sarah'])
  }
  if (orphan.length) note(`${orphan.length} lead(s) past New given an owner: ${orphan.map((l) => l.name).join(', ')}`)

  /* ── R4/R5 · the quote a Quote Sent lead sent, and the contract a Won lead signed ─────────────── */
  console.log('\nR4/R5 quotes and contracts')
  const existingQuotes = rows<{ lead_id: string; number: string }>(await client.execute(
    'SELECT lead_id, number FROM quotes WHERE deleted_at IS NULL'))
  const haveQuote = new Set(existingQuotes.map((q) => q.lead_id))
  const haveContract = new Set(rows<{ lead_id: string }>(await client.execute(
    'SELECT lead_id FROM contracts WHERE deleted_at IS NULL')).map((c) => c.lead_id))
  const needQuote = live.filter((l) => (l.stage === 'Quote Sent' || l.stage === 'Won') && !haveQuote.has(l.id))
    .sort((a, b) => a.created_at - b.created_at)
  let seq = 10_001 + existingQuotes.length
  const quoteTitleFor = new Map<string, string>()
  for (const l of needQuote) {
    const idx = STAGES.indexOf(l.stage as (typeof STAGES)[number])
    const times = hopTimes(l.created_at, idx, NOW - 2 * D)
    const tQ = times[2]!
    const number = `OM-${seq++}`
    quoteTitleFor.set(l.id, SYSTEM_QUOTE)
    const won = l.stage === 'Won'
    const created = tQ - 3 * D, sent = tQ - 2 * D, approved = tQ - 1 * D
    push(`INSERT INTO quotes (id, lead_id, number, title, amount_minor, visibility, status, created_at, due_at, sent_at, updated_at, approved_at, archived_at, deleted_at)
          VALUES (?,?,?,?,?,'Private',?,?,NULL,?,?,?,NULL,NULL)
          ON CONFLICT(id) DO UPDATE SET number=excluded.number, title=excluded.title, amount_minor=excluded.amount_minor,
            status=excluded.status, created_at=excluded.created_at, sent_at=excluded.sent_at, approved_at=excluded.approved_at, updated_at=excluded.updated_at`,
      [sid(l.id, 'quote'), l.id, number, SYSTEM_QUOTE, l.budget_minor, won ? 'Signed' : 'Approved', created, sent, won ? times[3]! - 3 * H : approved, approved])
    if (won && !haveContract.has(l.id)) {
      const tW = times[3]!
      push(`INSERT INTO contracts (id, lead_id, title, status, created_at, sent_at, signed_at, signed_copy, updated_at, archived_at, deleted_at)
            VALUES (?,?,?, 'Signed', ?,?,?,?,?, NULL, NULL)
            ON CONFLICT(id) DO UPDATE SET status=excluded.status, created_at=excluded.created_at, sent_at=excluded.sent_at,
              signed_at=excluded.signed_at, signed_copy=excluded.signed_copy, updated_at=excluded.updated_at`,
        [sid(l.id, 'contract'), l.id, 'General Contract Agreement', tQ + 1 * D, tQ + 2 * D, tW - 2 * H, 'General Contract Agreement.pdf', tW - 2 * H])
    }
  }
  note(`${needQuote.length} quotes + ${needQuote.filter((l) => l.stage === 'Won').length} contracts created`)

  /* ── R6/R7 · the stage trail every lead past New should already have ──────────────────────────── */
  console.log('\nR6/R7 stage trails')
  const logs = rows<{ id: string; lead_id: string; from_stage: string; to_stage: string; created_at: number; payload: string }>(
    await client.execute('SELECT id, lead_id, from_stage, to_stage, created_at, payload FROM stage_logs ORDER BY created_at'))
  const logsByLead = new Map<string, typeof logs>()
  for (const g of logs) { const l = logsByLead.get(g.lead_id) ?? []; l.push(g); logsByLead.set(g.lead_id, l) }

  let trailed = 0
  for (const l of leads) {
    const own = logsByLead.get(l.id) ?? []
    // The stage the lead's journey reached: its own if active, otherwise the stage it was parked from.
    const active = STAGES.indexOf(l.stage as (typeof STAGES)[number])
    const parkedFrom = own.find((g) => g.to_stage === 'On Hold' || g.to_stage === 'Lost')?.from_stage
    const journey = active >= 0 ? active : Math.max(0, STAGES.indexOf((parkedFrom ?? 'New') as (typeof STAGES)[number]))
    if (journey === 0) continue
    const have = new Set(own.filter((g) => STAGES.includes(g.to_stage as (typeof STAGES)[number])).map((g) => g.to_stage))
    const missing = STAGES.slice(1, journey + 1).filter((s) => !have.has(s))
    if (!missing.length) continue
    // Everything must land before the lead's first recorded event (a parking log, a return, the Won save).
    const firstOwn = own.length ? Math.min(...own.map((g) => g.created_at)) : NOW - 2 * D
    const deadline = Math.min(firstOwn, NOW - 2 * D)
    const times = hopTimes(l.created_at, journey, deadline)
    const members = perLead.get(l.id) ?? ['dane']
    const payloads = trailPayloads(l, members, times, quoteTitleFor.get(l.id) ?? SYSTEM_QUOTE)
    STAGES.slice(1, journey + 1).forEach((stage, i) => {
      if (have.has(stage)) return
      push(`INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET from_stage=excluded.from_stage, to_stage=excluded.to_stage, payload=excluded.payload, created_at=excluded.created_at`,
        [sid(l.id, `log:${stage}`), l.id, STAGES[i]!, stage, JSON.stringify(payloads[i]), times[i]!])
    })
    trailed++
  }
  note(`${trailed} leads given the moves behind their stage`)

  /* ── R8 · a quick move recorded nothing; give the completed stage the log it must carry ───────── */
  console.log('\nR8 quick-move payloads')
  let rewritten = 0
  for (const g of logs) {
    if (g.to_stage !== 'Contacted' || g.payload !== '{"quick":true}') continue
    const l = leads.find((x) => x.id === g.lead_id)
    if (!l) continue
    const members = perLead.get(l.id) ?? ['dane']
    const data: WizardData = {
      ...emptyWizardData(members),
      assignees: members,
      logs: [{ channel: channelFor(l.source), when: fmt(g.created_at - 15 * 60), outcome: 'No response', nextStepWhen: '', nextStepMode: '', files: [], notes: '' }],
    }
    push('UPDATE stage_logs SET payload = ? WHERE id = ?', [JSON.stringify(data), g.id])
    rewritten++
  }
  note(`${rewritten} quick Contacted moves given their contact log`)

  /* ── R12 · picker defaults left dates before the lead existed ─────────────────────────────────── */
  console.log('\nR12 payload dates')
  let redated = 0
  for (const g of logs) {
    if (!g.payload.startsWith('{"assignees"')) continue
    const l = leads.find((x) => x.id === g.lead_id)
    if (!l) continue
    let data: WizardData
    try { data = JSON.parse(g.payload) as WizardData } catch { continue }
    if (!Array.isArray(data.logs) || !data.logs.length) continue
    let touched = false
    for (const entry of data.logs) {
      const parsed = Date.parse(entry.when.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$2-$1'))
      if (entry.when && (!Number.isNaN(parsed) ? parsed / 1000 < l.created_at : true)) {
        entry.when = fmt(g.created_at - 15 * 60)
        if (entry.nextStepWhen) entry.nextStepWhen = fmt(g.created_at + 2 * D + 4 * H)
        touched = true
      }
    }
    if (touched) { push('UPDATE stage_logs SET payload = ? WHERE id = ?', [JSON.stringify(data), g.id]); redated++ }
  }
  note(`${redated} contact logs re-dated into their lead's life`)

  /* Everything above writes the trail; everything below reads it. Settle the first half so a return's Lost move
     hangs off the Contacted move this run just created, and a second run sees the same data as the first. */
  await client.batch(stmts, 'write')
  stmts.length = 0
  const settled = rows<{ id: string; lead_id: string; from_stage: string; to_stage: string; created_at: number; payload: string }>(
    await client.execute('SELECT id, lead_id, from_stage, to_stage, created_at, payload FROM stage_logs ORDER BY created_at'))
  logsByLead.clear()
  for (const g of settled) { const l = logsByLead.get(g.lead_id) ?? []; l.push(g); logsByLead.set(g.lead_id, l) }

  /* ── R9/R10/R13 · a returned lead leaves Qanvast a trail, a Lost move and a task ──────────────── */
  console.log('\nR9/R10/R13 returns')
  const returns = rows<{ id: string; lead_id: string; status: string; returned_at: number; stage_before: string; replied_at: number | null; credit_amount_minor: number | null; first_outreach_at: number | null }>(
    await client.execute('SELECT id, lead_id, status, returned_at, stage_before, replied_at, credit_amount_minor, first_outreach_at FROM lead_returns'))
  const returnTaskIds = new Set<string>()
  for (const r of returns) {
    const l = leads.find((x) => x.id === r.lead_id)
    if (!l) continue
    const own = logsByLead.get(l.id) ?? []
    // Returning a lead marks it Lost — the only state returnLead produces (app/leads/return-actions.ts).
    const alreadyLost = own.some((g) => g.to_stage === 'Lost')
    const logId = sid(l.id, 'log:return-lost')
    const from = r.stage_before && r.stage_before !== 'Lost' ? r.stage_before : 'Contacted'
    if (!alreadyLost) {
      push(`INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET from_stage=excluded.from_stage, created_at=excluded.created_at`,
        [logId, l.id, from, 'Lost', JSON.stringify({ reason: 'Lead returned to Qanvast' }), r.returned_at])
    }
    push('UPDATE lead_returns SET stage_log_id = COALESCE(stage_log_id, ?) WHERE id = ?', [alreadyLost ? null : logId, r.id])
    // Qanvast rejected the return: the lead is the studio's again, so it goes back where it was parked. The lead
    // keeps that stage; the two logs are the round trip. Processing and approved returns stay Lost.
    if (r.status === 'rejected' && r.replied_at) {
      push(`INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET to_stage=excluded.to_stage, created_at=excluded.created_at`,
        [sid(l.id, 'log:return-back'), l.id, 'Lost', from, JSON.stringify({ quick: true }), r.replied_at])
      push('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?', [from, r.replied_at, l.id])
    } else if (!alreadyLost) {
      push('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?', ['Lost', r.returned_at, l.id])
    }
    // The task the studio owes Qanvast a reply on.
    const taskId = sid(l.id, 'task:return')
    returnTaskIds.add(taskId)
    const done = r.status !== 'processing'
    push(`INSERT INTO lead_tasks (id, lead_id, title, kind, description, due_at, done, created_at, updated_at, seen_at, creator_id)
          VALUES (?,?,?,'General',NULL,?,?,?,?,?,'dane')
          ON CONFLICT(id) DO UPDATE SET due_at=excluded.due_at, done=excluded.done, created_at=excluded.created_at, updated_at=excluded.updated_at`,
      [taskId, l.id, 'Respond to Qanvast team', sixPm(r.returned_at), done ? 1 : 0, r.returned_at, done ? (r.replied_at ?? r.returned_at) : r.returned_at, r.returned_at])
    push('UPDATE lead_returns SET task_id = ? WHERE id = ?', [taskId, r.id])
    // First outreach is what the Contacted move recorded, not a separate guess.
    const contacted = own.find((g) => g.to_stage === 'Contacted')
    if (contacted) push('UPDATE lead_returns SET first_outreach_at = ? WHERE id = ?', [contacted.created_at, r.id])
    if (r.status === 'approved' && r.credit_amount_minor === null) {
      push('UPDATE lead_returns SET credit_amount_minor = ? WHERE id = ?', [20_000, r.id])
    }
  }
  note(`${returns.length} returns given their Lost move, task and outreach date`)

  /* ── R11 · a lead marked Lost straight out of New ─────────────────────────────────────────────── */
  const chloe = live.find((l) => l.stage === 'Lost' && !(logsByLead.get(l.id) ?? []).length && !returns.some((r) => r.lead_id === l.id))
  if (chloe) {
    push(`INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?,?,?,?,?,?)
          ON CONFLICT(id) DO NOTHING`,
      [sid(chloe.id, 'log:Lost'), chloe.id, 'New', 'Lost', JSON.stringify({ reason: 'Property too far' }), chloe.updated_at])
    note(`${chloe.name}: New → Lost recorded`)
  }

  /* ── R16 · records that predate the lead they belong to ───────────────────────────────────────── */
  console.log('\nR16 records before their lead')
  for (const table of ['quotes', 'contracts', 'lead_files', 'lead_notes'] as const) {
    const early = rows<{ id: string; lead_id: string; created_at: number; lc: number }>(await client.execute(
      `SELECT t.id, t.lead_id, t.created_at, l.created_at AS lc FROM ${table} t JOIN leads l ON l.id = t.lead_id WHERE t.created_at < l.created_at`))
    for (const e of early) {
      const shift = e.lc - e.created_at + 30 * 60   // keep their order, land them after the lead
      push(`UPDATE ${table} SET created_at = created_at + ?, updated_at = CASE WHEN updated_at IS NULL THEN NULL ELSE updated_at + ? END WHERE id = ?`, [shift, shift, e.id])
    }
    if (early.length) note(`${table}: ${early.length} row(s) moved after their lead`)
  }
  const earlyTasks = rows<{ id: string; created_at: number; due_at: number | null; lc: number; done: number }>(await client.execute(
    `SELECT t.id, t.created_at, t.due_at, t.done, l.created_at AS lc FROM lead_tasks t JOIN leads l ON l.id = t.lead_id WHERE t.created_at < l.created_at`))
  for (const t of earlyTasks) {
    const shift = t.lc - t.created_at + 27 * H   // the next working morning
    push(`UPDATE lead_tasks SET created_at = created_at + ?, updated_at = updated_at + ?, seen_at = CASE WHEN seen_at IS NULL THEN NULL ELSE seen_at + ? END,
            due_at = CASE WHEN due_at IS NULL THEN NULL ELSE due_at + ? END WHERE id = ?`, [shift, shift, shift, shift, t.id])
  }
  if (earlyTasks.length) note(`lead_tasks: ${earlyTasks.length} row(s) moved after their lead`)

  /* ── R17 · a screenshot attached to a return was taken before it was sent ─────────────────────── */
  const lateAttach = rows<{ fid: string; ra: number; ord: number }>(await client.execute(
    `SELECT f.id AS fid, r.returned_at AS ra, row_number() OVER (PARTITION BY r.id ORDER BY f.created_at) AS ord
       FROM return_attachments a JOIN lead_returns r ON r.id = a.return_id JOIN lead_files f ON f.id = a.file_id
      WHERE f.created_at > r.returned_at`))
  for (const a of lateAttach) push('UPDATE lead_files SET created_at = ?, updated_at = ? WHERE id = ?', [a.ra - 300 + 60 * (a.ord - 1), a.ra - 300 + 60 * (a.ord - 1), a.fid])
  push('UPDATE return_attachments SET created_at = (SELECT returned_at FROM lead_returns WHERE id = return_id)')
  if (lateAttach.length) note(`${lateAttach.length} return screenshots dated before their return`)

  /* ── R14 · a task raised by a stage move cannot predate the move ──────────────────────────────── */
  console.log('\nR14/R15 task timing')
  const early2 = rows<{ id: string; lead_id: string; created_at: number; first: number }>(await client.execute(
    `SELECT t.id, t.lead_id, t.created_at, (SELECT min(s.created_at) FROM stage_logs s WHERE s.lead_id = t.lead_id AND s.to_stage <> 'New') AS first
       FROM lead_tasks t WHERE first IS NOT NULL AND t.created_at <= first AND t.created_at <= (SELECT created_at + 60 FROM leads WHERE id = t.lead_id)`))
  for (const t of early2) {
    push(`UPDATE lead_tasks SET created_at = ?, updated_at = max(updated_at, ?), seen_at = CASE WHEN seen_at IS NULL THEN NULL ELSE ? END WHERE id = ?`,
      [t.first + 5 * 60, t.first + 5 * 60, t.first + 5 * 60, t.id])
  }
  note(`${early2.length} tasks moved to just after the move that raised them`)

  // A completed task with no completion stamp shows only its creation in Activity.
  push(`UPDATE lead_tasks SET updated_at = min(created_at + 26 * 3600, ?) WHERE done = 1 AND updated_at - created_at < 60`, [NOW])
  const doneNoStamp = rows<{ n: number }>(await client.execute('SELECT count(*) AS n FROM lead_tasks WHERE done = 1 AND updated_at - created_at < 60'))
  note(`${doneNoStamp[0]?.n ?? 0} completed tasks given a completion stamp`)

  /* ── R15 · open due dates ride the calendar so the demo always shows overdue / today / upcoming ─ */
  // Ordered by the task's own creation, never by the column being rewritten, so every run lands on the same day.
  const open = rows<{ id: string; due_at: number; created_at: number }>(await client.execute(
    'SELECT id, due_at, created_at FROM lead_tasks WHERE done = 0 AND due_at IS NOT NULL ORDER BY created_at, id'))
  const OFFSETS = [-2, -1, 0, 0, 1, 1, 2, 3, 4, 5, 6, 7]
  // A return's task is due 18:00 on the day it was returned — that date belongs to the return, not to the calendar.
  open.filter((t) => !returnTaskIds.has(t.id)).forEach((t, i) => {
    const at = D0 + OFFSETS[Math.min(i, OFFSETS.length - 1)]! * D + 10 * H
    push('UPDATE lead_tasks SET due_at = ? WHERE id = ?', [Math.max(at, t.created_at + H), t.id])
  })
  note(`${open.length} open due dates rebased around today`)

  /* ── R18 · an import that reports skipped rows must have them to download ─────────────────────── */
  console.log('\nR18 import rows')
  const thin = rows<{ id: string; skipped_rows: number; n: number }>(await client.execute(
    `SELECT i.id, i.skipped_rows, (SELECT count(*) FROM import_rows r WHERE r.import_id = i.id) AS n FROM imports i WHERE i.skipped_rows > 0`))
  for (const im of thin) {
    if (im.n > 0) continue
    for (let k = 0; k < im.skipped_rows; k++) {
      const data = {
        'Lead Name': '', 'Lead Phone Number': `9000001${k}`, 'Lead Source': ['Website', 'Facebook', 'Instagram', 'Others'][k % 4],
        'Property Type': '', 'Property Address': '', 'Estimated Budget (S$)': '', 'Lead Stage': 'New', 'Notes': '', __reason: 'Missing Lead Name',
      }
      push(`INSERT INTO import_rows (id, import_id, status, data, duplicate_of_lead_id, matched_on) VALUES (?,?, 'skipped', ?, NULL, NULL)
            ON CONFLICT(id) DO NOTHING`, [sid(im.id, `skipped:${k}`), im.id, JSON.stringify(data)])
    }
    note(`import ${im.id.slice(0, 8)}: ${im.skipped_rows} skipped rows written`)
  }

  /* ── R19 · seen_at: the listing's "nobody has looked at this yet" band needs an example ───────── */
  console.log('\nR19 seen / updated stamps')
  const newest = live.filter((l) => l.stage === 'New').sort((a, b) => b.created_at - a.created_at)
  const unseen = new Set(newest.slice(0, 2).map((l) => l.id))
  live.forEach((l, i) => {
    if (unseen.has(l.id)) push('UPDATE leads SET seen_at = NULL WHERE id = ?', [l.id])
    else push('UPDATE leads SET seen_at = ? WHERE id = ? AND (seen_at IS NULL OR seen_at <= created_at)', [l.created_at + 30 * 60 + i * 420, l.id])
  })
  note(`${unseen.size} leads left unseen (the listing's band), the rest opened after creation`)

  await client.batch(stmts, 'write')

  // leads.updated_at follows the last thing that happened to the lead — moveStage stamps both together.
  await client.execute(`UPDATE leads SET updated_at = max(updated_at, (SELECT max(created_at) FROM stage_logs s WHERE s.lead_id = leads.id))
                        WHERE EXISTS (SELECT 1 FROM stage_logs s WHERE s.lead_id = leads.id)`)

  /* ── R20 · prove it ───────────────────────────────────────────────────────────────────────────── */
  console.log('\nR20 verification')
  const checks: [string, string][] = [
    ['live lead past New with no stage trail', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage <> 'New' AND NOT EXISTS (SELECT 1 FROM stage_logs s WHERE s.lead_id = l.id)`],
    ['lead whose last move does not match its stage', `SELECT l.name FROM leads l JOIN stage_logs s ON s.lead_id = l.id WHERE l.deleted_at IS NULL AND s.created_at = (SELECT max(created_at) FROM stage_logs x WHERE x.lead_id = l.id) AND s.to_stage <> l.stage`],
    ['stage log before its lead existed', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.created_at <= l.created_at`],
    ['stage log in the future', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.created_at > ${NOW}`],
    ['completed Contacted stage with no contact log', `SELECT l.name FROM leads l JOIN stage_logs s ON s.lead_id = l.id AND s.to_stage = 'Contacted' WHERE l.deleted_at IS NULL AND json_type(s.payload, '$.logs') IS NOT 'array'`],
    ['lead past New with no member', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage <> 'New' AND NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = l.id)`],
    ['assignment with no date', `SELECT l.name FROM lead_assignees a JOIN leads l ON l.id = a.lead_id WHERE a.assigned_at IS NULL`],
    ['Quote Sent / Won lead with no quote', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage IN ('Quote Sent','Won') AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.lead_id = l.id AND q.deleted_at IS NULL)`],
    ['Won lead with no signed contract', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage = 'Won' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = l.id AND c.status = 'Signed' AND c.deleted_at IS NULL)`],
    ['record before its lead', `SELECT l.name FROM leads l WHERE EXISTS (SELECT 1 FROM lead_tasks t WHERE t.lead_id = l.id AND t.created_at < l.created_at)
        OR EXISTS (SELECT 1 FROM quotes q WHERE q.lead_id = l.id AND q.created_at < l.created_at)
        OR EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = l.id AND c.created_at < l.created_at)
        OR EXISTS (SELECT 1 FROM lead_files f WHERE f.lead_id = l.id AND f.created_at < l.created_at)
        OR EXISTS (SELECT 1 FROM lead_notes n WHERE n.lead_id = l.id AND n.created_at < l.created_at)`],
    ['completed task with no completion stamp', `SELECT l.name FROM lead_tasks t JOIN leads l ON l.id = t.lead_id WHERE t.done = 1 AND t.updated_at - t.created_at < 60`],
    ['return with no Lost move or no task', `SELECT l.name FROM lead_returns r JOIN leads l ON l.id = r.lead_id WHERE r.task_id IS NULL OR NOT EXISTS (SELECT 1 FROM stage_logs s WHERE s.lead_id = r.lead_id AND s.to_stage = 'Lost')`],
    ['import reporting skipped rows it does not have', `SELECT i.file_name FROM imports i WHERE i.skipped_rows > 0 AND (SELECT count(*) FROM import_rows r WHERE r.import_id = i.id) = 0`],
    ['keyboard-mash task left behind', `SELECT title FROM lead_tasks WHERE lower(title) IN ('test','tse6y"') OR title LIKE 'hgdk%' OR title LIKE 'adfad%' OR title LIKE 'sdajk%'`],
  ]
  let failed = 0
  for (const [label, sql] of checks) {
    const r = await client.execute(sql)
    if (r.rows.length) { failed++; console.log(`  FAIL ${label}: ${r.rows.map((x) => String(x[0])).join(', ')}`) }
    else console.log(`  ok   ${label}`)
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks pass')
  await client.close()
  if (failed) process.exit(1)
}

await main()
