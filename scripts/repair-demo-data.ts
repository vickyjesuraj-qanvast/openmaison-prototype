process.env.TZ = process.env.TZ ?? 'Asia/Kolkata'   // before any Date: every `when` string and every due hour is local (the demo machine runs IST)

import { createClient, type InStatement } from '@libsql/client'
import { compareQuotes, type YourLine } from '@/lib/xray/compare'
import { AGREEMENT_TITLE, VARIATION_TITLE, agreementHtml, variationHtml } from '@/lib/contracts/agreement'
import { readOtherQuote } from '@/lib/xray/reference'
import { lineTotalMinor } from '@/lib/quotes/math'
import { createHash } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import { emptyWizardData, SYSTEM_CONTRACT, SYSTEM_QUOTE, type WizardData } from '../lib/leads/stage-data'
import { displayDate, formatInputDateTime } from '../lib/format'
import { quoteTotals } from '../lib/quotes/math'
import { PRESET_SPLITS, presetRows, scheduleAnchors } from '../lib/quotes/payments'
import { resolveTokens, TEMPLATE_SEED } from '../lib/quotes/text'
import { projectRef, VALIDITY_DAYS } from '../lib/quotes/refs'
import { STAGES } from '../lib/leads/enums'
import { PRESETS } from '../lib/templates/presets'
import { DEFAULT_BRAND_SETTING } from '../lib/templates/brand'
import { DEMO_BADGES } from '../lib/templates/assets'

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
    `SELECT id, title FROM lead_tasks WHERE lower(title) IN ('test','tse6y"','tse6y\\') OR title LIKE 'tse6y%' OR title LIKE 'hgdk%' OR title LIKE 'adfad%' OR title LIKE 'sdajk%'`))
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

  /* ── R21 · the quote editor's General Info reads records (REG-403) ─────────────────────────────
     Prepared by = the lead's first assigned member (the Owner when nobody is assigned); the property type and the site
     address are the lead's own. Quotes created in the app carry these from the start (createQuote). */
  console.log('\nR21 quote editor fields')
  await client.execute(`UPDATE quotes SET prepared_by = COALESCE(prepared_by,
      (SELECT a.member_id FROM lead_assignees a WHERE a.lead_id = quotes.lead_id ORDER BY COALESCE(a.assigned_at, 0), a.member_id LIMIT 1),
      (SELECT m.id FROM members m WHERE m.role = 'Owner' LIMIT 1))`)
  await client.execute(`UPDATE quotes SET property_type = COALESCE(property_type, (SELECT l.property_type FROM leads l WHERE l.id = quotes.lead_id))`)
  await client.execute(`UPDATE quotes SET site_address = COALESCE(site_address, (SELECT l.property_address FROM leads l WHERE l.id = quotes.lead_id))`)
  note('quotes carry prepared_by / property_type / site_address from their lead and members')

  /* ── R22 · the studio's quote design templates (Create Quote modal, REG-412 / REG-414) ───────────
     Three design templates read as the studio's own: the default PDF look and the two BTO layouts the mocks name
     (1209:27023). Ids are deterministic; `last_used_at` is re-stamped RELATIVE to the run ("used 5d ago" reads 5d on
     any day, REG-412) unless the demo used the template since — a newer stamp is kept. */
  console.log('\nR22 quote design templates')
  const templates: [string, number][] = [['Default Quote PDF', 14 * D], ['4-Room BTO', 5 * D], ['5-Room BTO', 21 * D]]
  for (const [name, ago] of templates) {
    const id = sid(name, 'quote_template')
    await client.execute({ sql: `INSERT OR IGNORE INTO quote_templates (id, name, kind, is_default, last_used_at, created_at) VALUES (?, ?, 'design', ?, ?, ?)`,
      args: [id, name, name === 'Default Quote PDF' ? 1 : 0, NOW - ago, NOW - 60 * D] })
    await client.execute({ sql: `UPDATE quote_templates SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at <= ?)`, args: [NOW - ago, id, NOW - ago] })
  }
  await client.execute(`UPDATE quote_templates SET is_default = 1 WHERE id = ? AND NOT EXISTS (SELECT 1 FROM quote_templates WHERE is_default = 1)`.replace('?', `'${sid('Default Quote PDF', 'quote_template')}'`))
  note(`${templates.length} design templates present, one default`)

  /* ── R23 · the studio, its price book and every quote's lines (Items section, REG-415 / REG-403) ─────
     A quote's amount is DERIVED from its lines, so every seeded quote gets the lines a Singapore studio would have
     written for that unit — the studio's eight price-book items plus the ad-hoc lines a whole-home job needs — scaled
     to the size of the property, grouped by room, with the client's answers matching the quote's status. Blank drafts
     the app created stay blank (amount 0 = no lines). Ids are deterministic; a quote that already has lines is left alone. */
  console.log('\nR23 studio, price book, quote lines')
  await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('studio', ?, ?)`, args: [JSON.stringify({ name: 'Demo Studio Pte Ltd', gstRegistered: true }), NOW] })
  type PB = { name: string; description: string; kind: string; unit: string; cost: number; markup: number; category: string }
  const PRICE_BOOK: PB[] = [
    { name: 'Hacking of existing floor and wall tiles', description: 'Removal of existing tiles and screed, debris disposal included', kind: 'labour', unit: 'sqft', cost: 3.2, markup: 0.8, category: 'Hacking' },
    { name: 'Cement screeding and waterproofing', description: 'Levelling screed with waterproofing membrane for wet areas', kind: 'labour', unit: 'sqft', cost: 2.8, markup: 0.7, category: 'Masonry' },
    { name: 'Vinyl flooring, supply and install', description: '5 mm SPC vinyl planks with underlay, laid over screed', kind: 'purchase', unit: 'sqft', cost: 5.5, markup: 1.5, category: 'Flooring' },
    { name: 'Kitchen carpentry, top and bottom cabinets', description: 'Laminated plywood carcass with soft-close hinges and internal drawers, top cabinets taken to the ceiling, per foot run', kind: 'purchase', unit: 'ft run', cost: 190, markup: 60, category: 'Carpentry' },
    { name: 'Electrical point, new', description: 'Concealed wiring for a new lighting, power or data point', kind: 'labour', unit: 'point', cost: 55, markup: 15, category: 'Electrical' },
    { name: 'Plumbing works, kitchen and bathrooms', description: 'Relocation of water points and drainage in the kitchen and both bathrooms, sanitary ware and mixers installed', kind: 'labour', unit: 'Lot', cost: 1400, markup: 400, category: 'Plumbing' },
    { name: 'Painting, whole unit', description: 'Two coats of washable emulsion on every wall and ceiling over sealer, doors and frames finished in enamel', kind: 'labour', unit: 'Lot', cost: 1500, markup: 450, category: 'Painting' },
    { name: 'Design consultation and 3D drawings', description: 'Space planning, material selection and 3D visuals for the whole unit, with two rounds of revisions before the final set', kind: 'design', unit: 'Lot', cost: 1800, markup: 1200, category: 'Design' },
  ]
  const pbId = (name: string) => sid(name, 'price_book_item')
  for (const p of PRICE_BOOK) {
    await client.execute({ sql: `INSERT OR IGNORE INTO price_book_items (id, name, description, kind, unit, cost_minor, markup_minor, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [pbId(p.name), p.name, p.description, p.kind, p.unit, Math.round(p.cost * 100), Math.round(p.markup * 100), p.category, NOW - 90 * D, NOW - 30 * D] })
  }
  note(`${PRICE_BOOK.length} price-book items present`)

  type LineT = { name: string; description: string; kind: string; unit: string; cost: number; markup: number; qty: number; group?: string; room: string; category: string; section: string; pb?: string; scale?: boolean }
  const AREA: Record<string, number> = { 'HDB 3-Room': 700, 'HDB 4-Room': 970, 'HDB 5-Room': 1180, 'BTO 4-Room': 970, 'BTO 5-Room': 1180, 'Executive Condo': 1100, 'Condo 2-bedder': 800, 'Condo 3-bedder': 1100, 'Landed': 2400 }
  /** The lines of a whole-home renovation for `sqft` of floor area (quantities the trade would take off a floor plan). */
  const recipe = (sqft: number): LineT[] => {
    const wet = Math.round(sqft * 0.32)      // kitchen + bathrooms + service yard
    const dry = sqft - wet
    const ft = (n: number) => Math.round(n)
    const pb = (name: string, qty: number, extra: Partial<LineT>): LineT => { const p = PRICE_BOOK.find((x) => x.name === name)!; return { name: p.name, description: p.description, kind: p.kind, unit: p.unit, cost: p.cost, markup: p.markup, qty, category: p.category, room: 'Whole unit', section: 'Wet works', pb: p.name, ...extra } }
    return [
      pb('Hacking of existing floor and wall tiles', wet + Math.round(dry * 0.3), { room: 'Whole unit', section: 'Wet works', scale: true }),
      pb('Cement screeding and waterproofing', wet, { room: 'Whole unit', section: 'Wet works', scale: true }),
      { name: 'Bathroom tiles, supply and install', description: 'Homogeneous 600 × 300 tiles for floor and walls of both bathrooms', kind: 'purchase', unit: 'sqft', cost: 9, markup: 3, qty: Math.round(wet * 0.9), group: 'Bathrooms', room: 'Common Bathroom', category: 'Masonry', section: 'Wet works', scale: true },
      pb('Plumbing works, kitchen and bathrooms', 1, { group: 'Bathrooms', room: 'Common Bathroom', section: 'Wet works' }),
      { name: 'Glass shower screen', description: 'Frameless 10 mm tempered glass panel with towel bar', kind: 'purchase', unit: 'Pieces', cost: 650, markup: 180, qty: 2, group: 'Bathrooms', room: 'Master Bathroom', category: 'Fittings', section: 'Wet works' },
      { name: 'Bathroom vanity with basin', description: 'Wall-hung vanity, solid surface top and undermount basin', kind: 'purchase', unit: 'Pieces', cost: 1100, markup: 350, qty: 2, group: 'Bathrooms', room: 'Master Bathroom', category: 'Carpentry', section: 'Carpentry' },
      pb('Vinyl flooring, supply and install', dry, { room: 'Living Room', section: 'Finishing', category: 'Flooring', scale: true }),
      pb('Kitchen carpentry, top and bottom cabinets', ft(sqft * 0.024), { group: 'Kitchen', room: 'Kitchen', section: 'Carpentry', scale: true }),
      { name: 'Kitchen countertop, quartz', description: '20 mm engineered quartz top with cut-outs for hob and sink', kind: 'purchase', unit: 'ft run', cost: 150, markup: 50, qty: ft(sqft * 0.014), group: 'Kitchen', room: 'Kitchen', category: 'Carpentry', section: 'Carpentry', scale: true },
      { name: 'Kitchen backsplash, glass', description: 'Back-painted tempered glass panel, cut for outlets', kind: 'purchase', unit: 'ft run', cost: 75, markup: 25, qty: ft(sqft * 0.011), group: 'Kitchen', room: 'Kitchen', category: 'Fittings', section: 'Finishing', scale: true },
      { name: 'Wardrobe, master bedroom', description: 'Full-height laminated wardrobe with sliding doors, internal drawers, hanging rails and a mirror panel on one door', kind: 'purchase', unit: 'ft run', cost: 260, markup: 80, qty: ft(sqft * 0.012), group: 'Bedrooms', room: 'Master Bedroom', category: 'Carpentry', section: 'Carpentry', scale: true },
      { name: 'Study desk and shelving', description: 'Built-in desk with overhead open shelving, laminate finish', kind: 'purchase', unit: 'ft run', cost: 210, markup: 70, qty: ft(sqft * 0.006), group: 'Bedrooms', room: 'Bedroom 2', category: 'Carpentry', section: 'Carpentry', scale: true },
      { name: 'Bedroom doors, laminate', description: 'Solid-core laminate door with frame, hinges and lever handle', kind: 'purchase', unit: 'Pieces', cost: 480, markup: 140, qty: sqft > 1000 ? 4 : 3, group: 'Bedrooms', room: 'Bedroom 2', category: 'Fittings', section: 'Finishing' },
      { name: 'TV console and feature wall', description: 'Suspended TV console with fluted feature wall panelling', kind: 'purchase', unit: 'Lot', cost: 2800, markup: 900, qty: 1, room: 'Living Room', category: 'Carpentry', section: 'Carpentry' },
      { name: 'False ceiling with cove lighting', description: 'Plaster board L-box with LED strip, living and dining', kind: 'labour', unit: 'ft run', cost: 22, markup: 8, qty: ft(sqft * 0.06), room: 'Living Room', category: 'Ceiling', section: 'Finishing', scale: true },
      pb('Electrical point, new', Math.round(sqft * 0.035), { room: 'Whole unit', section: 'Finishing', scale: true }),
      pb('Painting, whole unit', 1, { room: 'Whole unit', section: 'Finishing' }),
      { name: 'Haulage and debris disposal', description: 'Lorry haulage of debris and materials, including disposal fees', kind: 'delivery', unit: 'Lot', cost: 600, markup: 150, qty: 1, room: 'Whole unit', category: 'Logistics', section: 'Wet works' },
      pb('Design consultation and 3D drawings', 1, { room: 'Whole unit', section: 'Design', category: 'Design' }),
    ]
  }
  const liveQuotes = rows<{ id: string; lead_id: string; number: string; status: string; amount_minor: number; created_at: number; property_type: string | null; lead_property_type: string; area_sqft: number | null }>(await client.execute(
    `SELECT q.id, q.lead_id, q.number, q.status, q.amount_minor, q.created_at, q.property_type, l.property_type AS lead_property_type, l.area_sqft
     FROM quotes q JOIN leads l ON l.id = q.lead_id WHERE q.deleted_at IS NULL AND q.amount_minor > 0 ORDER BY q.number`))
  let seeded = 0
  for (const q of liveQuotes) {
    const has = rows<{ n: number }>(await client.execute({ sql: 'SELECT count(*) AS n FROM quote_items WHERE quote_id = ?', args: [q.id] }))[0]?.n ?? 0
    if (has > 0) continue
    const sqft = q.area_sqft ?? AREA[q.property_type ?? q.lead_property_type] ?? 970
    const lines = recipe(sqft)
    // scale the take-off quantities so the pre-GST subtotal lands near the amount the quote already carried
    const target = q.amount_minor / 100 / 1.09
    const base = lines.reduce((s, l) => s + l.qty * (l.cost + l.markup), 0)
    const f = target / base
    for (const l of lines) if (l.scale) l.qty = Math.max(1, Math.round(l.qty * f))
    const status = q.status === 'Draft' ? 'Pending' : 'Approved'
    const created = q.created_at + 2 * H
    const groups = ['Kitchen', 'Bathrooms', 'Bedrooms']
    const groupIds: Record<string, string> = {}
    let pos = 0
    const orderTop: string[] = []
    for (const g of groups) {
      const gid = sid(`${q.id}:${g}`, 'quote_group'); groupIds[g] = gid
      await client.execute({ sql: `INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, description, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, room, category, section, visibility, collapsed, created_at, updated_at)
        VALUES (?, ?, NULL, 'group', ?, ?, ?, ?, 1, NULL, 0, 0, 0, 9, ?, NULL, NULL, 'visible', 0, ?, ?)`,
        args: [gid, q.id, pos++, g, g === 'Kitchen' ? 'Kitchen carpentry, worktop and finishes' : g === 'Bathrooms' ? 'Wet works and fittings for both bathrooms' : 'Bedroom carpentry and doors', status, g === 'Kitchen' ? 'Kitchen' : g === 'Bathrooms' ? 'Common Bathroom' : 'Master Bedroom', created, created] })
      orderTop.push(gid)
    }
    const childPos: Record<string, number> = { Kitchen: 0, Bathrooms: 0, Bedrooms: 0 }
    lines.forEach((l, idx) => {
      const id = sid(`${q.id}:${idx}:${l.name}`, 'quote_item')
      const parent = l.group ? groupIds[l.group]! : null
      const position = parent ? (childPos[l.group!] = (childPos[l.group!] ?? 0) + 1) - 1 : pos++
      const declined = q.number === 'OM-10008' && l.name === 'False ceiling with cove lighting'   // the client passed on the cove lighting (one Declined line in the demo; a top-level line — a child carries its group's answer, REG-417)
      push(`INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, description, icon, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, room, category, section, visibility, collapsed, price_book_item_id, created_at, updated_at)
            VALUES (?, ?, ?, 'item', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 9, ?, ?, ?, 'visible', 0, ?, ?, ?)`,
        [id, q.id, parent, position, l.name, l.description, l.kind, declined ? 'Declined' : status, l.qty, l.unit, Math.round(l.cost * 100), Math.round(l.markup * 100), l.room, l.category, l.section, l.pb ? pbId(l.pb) : null, created + idx * 60, created + idx * 60])
    })
    seeded++
  }
  await client.batch(stmts, 'write'); stmts.length = 0
  // (REG-417) The status chip sits on the group row and a child's STATUS cell is empty (spec 03), so a child carries its
  // group's answer — a Declined child under an open group was a state the table could not show. Every child follows its
  // group, and the demo's one Declined line is a top-level item on OM-10008 (the client passed on the cove lighting).
  const followed = await client.execute(`UPDATE quote_items SET status = (SELECT p.status FROM quote_items p WHERE p.id = quote_items.parent_id)
    WHERE parent_id IS NOT NULL AND status <> (SELECT p.status FROM quote_items p WHERE p.id = quote_items.parent_id)`)
  const passed = await client.execute(`UPDATE quote_items SET status = 'Declined' WHERE parent_id IS NULL AND kind = 'item' AND name = 'False ceiling with cove lighting' AND status <> 'Declined'
    AND quote_id = (SELECT id FROM quotes WHERE number = 'OM-10008' AND deleted_at IS NULL)`)
  note(`${followed.rowsAffected} child lines follow their group's answer · ${passed.rowsAffected} line(s) marked Declined on OM-10008`)
  // the amount is what the lines add up to — for every live quote, lines or none
  const allQuotes = rows<{ id: string; additional_discount_mode: string; additional_discount_value: number; gst_enabled: number }>(await client.execute(`SELECT id, additional_discount_mode, additional_discount_value, gst_enabled FROM quotes WHERE deleted_at IS NULL`))
  for (const q of allQuotes) {
    const items = rows<{ id: string; parent_id: string | null; kind: string; status: string; qty: number; cost_minor: number; markup_minor: number; discount_pct: number; gst_pct: number }>(await client.execute({ sql: 'SELECT id, parent_id, kind, status, qty, cost_minor, markup_minor, discount_pct, gst_pct FROM quote_items WHERE quote_id = ?', args: [q.id] }))
    if (items.length === 0) continue
    const t = quoteTotals(items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: i.status, qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: i.discount_pct, gstPct: i.gst_pct })),
      { additionalDiscountMode: q.additional_discount_mode, additionalDiscountValue: q.additional_discount_value, gstEnabled: q.gst_enabled === 1 })
    await client.execute({ sql: 'UPDATE quotes SET amount_minor = ? WHERE id = ? AND amount_minor <> ?', args: [t.totalMinor, q.id, t.totalMinor] })
  }
  note(`${seeded} quotes received their lines; every amount equals its lines`)

  /* ── R24 · every quote's payment schedule (Payment Schedule section, REG-418 / REG-403) ─────────
     A quote carries the studio's default split from the day it is written (createQuote seeds it): the deposit on approval,
     the other milestones estimated from the lead's start date and the property's renovation length. Quotes that predate
     the section get the same rows, dated from their own created_at; a quote that already has rows is left alone. */
  console.log('\nR24 payment schedules')
  const unscheduled = rows<{ id: string; created_at: number; property_type: string | null; lead_property_type: string; estimated_start_date: number | null }>(await client.execute(
    `SELECT q.id, q.created_at, q.property_type, l.property_type AS lead_property_type, l.estimated_start_date
     FROM quotes q JOIN leads l ON l.id = q.lead_id WHERE q.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM quote_payments p WHERE p.quote_id = q.id) ORDER BY q.number`))
  for (const q of unscheduled) {
    const anchors = scheduleAnchors({ estimatedStart: q.estimated_start_date ? new Date(q.estimated_start_date * 1000) : null, quoteCreated: new Date(q.created_at * 1000), propertyType: q.property_type ?? q.lead_property_type })
    const created = q.created_at + 2 * H + 5 * 60   // written right after the lines (R23: created + 2h)
    presetRows('default', anchors).forEach((r, position) => {
      push(`INSERT OR IGNORE INTO quote_payments (id, quote_id, position, name, description, pct, due_kind, due_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [sid(`${q.id}:${position}:${r.name}`, 'quote_payment'), q.id, position, r.name, r.description, r.pct, r.dueKind, r.dueAt ? Math.floor(r.dueAt.getTime() / 1000) : null, created])
    })
  }
  await client.batch(stmts, 'write'); stmts.length = 0
  note(`${unscheduled.length} quotes received the default schedule`)

  /* ── R25 · every priced quote carries the lead's latest file (Files section, REG-419) ────────────
     The Files section shows the lead's files a quote points at (never a copy). A priced quote that carries none gets the
     lead's most recent file — the reference the studio quoted from — linked right after the schedule was set. */
  console.log('\nR25 quote files')
  const unfiled = rows<{ id: string; file_id: string | null; created_at: number }>(await client.execute(
    `SELECT q.id, q.created_at, (SELECT f.id FROM lead_files f WHERE f.lead_id = q.lead_id AND f.deleted_at IS NULL AND f.kind <> 'folder' ORDER BY f.created_at DESC, f.id LIMIT 1) AS file_id
     FROM quotes q WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND NOT EXISTS (SELECT 1 FROM quote_files x WHERE x.quote_id = q.id) ORDER BY q.number`))
  let filed = 0
  for (const q of unfiled) {
    if (!q.file_id) continue
    push(`INSERT OR IGNORE INTO quote_files (quote_id, file_id, created_at) VALUES (?, ?, ?)`, [q.id, q.file_id, q.created_at + 2 * H + 10 * 60])
    filed++
  }
  await client.batch(stmts, 'write'); stmts.length = 0
  note(`${filed} quotes received the lead's latest file`)

  /* ── R26 · the studio's phone, the text template library and every priced quote's terms / notes (REG-420) ──
     The studio record carries the line its "[Studio Phone Number]" token prints; the library holds the seeded templates
     (lib/quotes/text.ts TEMPLATE_SEED — real Singapore renovation terms); a priced quote with no terms gets the general
     terms with its tokens resolved, and a quote with no notes a note derived from its own schedule. */
  console.log('\nR26 studio phone, text templates, quote terms and notes')
  await client.execute(`UPDATE settings SET value = json_set(value, '$.phone', '6222 0188') WHERE key = 'studio' AND json_extract(value, '$.phone') IS NULL`)
  for (const t of TEMPLATE_SEED) {
    push(`INSERT OR IGNORE INTO quote_text_templates (id, kind, title, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL)`, [sid(`${t.kind}:${t.title}`, 'quote_text_template'), t.kind, t.title, t.body, NOW - 60 * D])
  }
  await client.batch(stmts, 'write'); stmts.length = 0
  const studioRow = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))[0]
  const studio = studioRow ? (JSON.parse(studioRow.value) as { name: string; phone?: string }) : { name: 'Demo Studio Pte Ltd', phone: '6222 0188' }
  const untexted = rows<{ id: string; terms_html: string | null; notes_html: string | null; client: string; member: string | null; created_at: number; property_type: string | null; lead_property_type: string; estimated_start_date: number | null }>(await client.execute(
    `SELECT q.id, q.terms_html, q.notes_html, l.name AS client, m.name AS member, q.created_at, q.property_type, l.property_type AS lead_property_type, l.estimated_start_date
     FROM quotes q JOIN leads l ON l.id = q.lead_id LEFT JOIN members m ON m.id = q.prepared_by
     WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND (q.terms_html IS NULL OR q.notes_html IS NULL) ORDER BY q.number`))
  const general = TEMPLATE_SEED.find((t) => t.kind === 'terms')!
  let texted = 0
  for (const q of untexted) {
    const a = scheduleAnchors({ estimatedStart: q.estimated_start_date ? new Date(q.estimated_start_date * 1000) : null, quoteCreated: new Date(q.created_at * 1000), propertyType: q.property_type ?? q.lead_property_type })
    const terms = q.terms_html ?? resolveTokens(general.body, { client: q.client, studio: studio.name, studioPhone: studio.phone ?? '', member: q.member ?? '' })
    const notes = q.notes_html ?? `<p>Prices are inclusive of GST at 9%. Works are scheduled to start on about ${displayDate(a.start)} and run for about ${a.weeks} weeks; the dates move with material lead times and the confirmation of selections.</p>`
    await client.execute({ sql: `UPDATE quotes SET terms_html = ?, notes_html = ? WHERE id = ?`, args: [terms, notes, q.id] })
    texted++
  }
  note(`${TEMPLATE_SEED.length} templates present · ${texted} quotes received their terms and notes`)

  /* ── R27 · the signed-in member's signature (Signature section, REG-421) ────────────────────────
     A signature is saved per member (owner 2026-09-11). The demo's signed-in member has set theirs up as their typed name,
     so every quote they prepare shows a signature; the other members have not — the section offers Draw / Type to them. */
  console.log('\nR27 member signature')
  const signed = await client.execute(`UPDATE members SET signature_kind = 'type', signature_name = name, signature_data = NULL WHERE is_you = 1 AND signature_kind IS NULL`)
  note(`${signed.rowsAffected} member signature(s) set up`)

  /* ── R28 · Project Ref #, Quote Valid Until and the description clamp (General Info 1273:29296, REG-403) ──────
     Every live quote carries the reference and validity its records give it (lib/quotes/refs.ts: the property's family / the
     day it was written / its sequence that day; 30 days) — createQuote writes them from the start — and the Items table's
     two-line default (1260:31372; the column's stored 'single' predates the choice). Values already set are left alone. */
  console.log('\nR28 project refs, validity, density')
  const unref = rows<{ id: string; created_at: number; property_type: string | null; project_ref: string | null; valid_until: number | null }>(await client.execute(
    `SELECT id, created_at, property_type, project_ref, valid_until FROM quotes WHERE deleted_at IS NULL ORDER BY created_at, number`))
  const perDay = new Map<string, number>()
  let refs = 0
  for (const q of unref) {
    const at = new Date(q.created_at * 1000)
    const day = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`
    const seq = (perDay.get(day) ?? 0) + 1; perDay.set(day, seq)
    if (!q.project_ref) { push(`UPDATE quotes SET project_ref = ? WHERE id = ?`, [projectRef(q.property_type, at, seq), q.id]); refs++ }
    if (!q.valid_until) push(`UPDATE quotes SET valid_until = ? WHERE id = ?`, [q.created_at + VALIDITY_DAYS * D, q.id])
  }
  push(`UPDATE quotes SET items_density = 'double' WHERE items_density = 'single'`)
  await client.batch(stmts, 'write'); stmts.length = 0
  note(`${refs} quotes received a project ref; validity filled where empty; density double`)

  /* ── R29 · descriptions long enough for the Items table's Triple density to show three lines (owner 2026-09-15, REG-433) ──
     The seeded scope lines all fit two lines of the 268px description block, so Double and Triple looked the same. Five of
     them read as a trade would write them — the same text R23 seeds now; existing rows are lengthened in place. */
  console.log('\nR29 three-line descriptions')
  const LONGER: [name: string, was: string, now: string][] = [
    ['Kitchen carpentry, top and bottom cabinets', 'Laminated plywood carcass with soft-close hinges, per foot run', 'Laminated plywood carcass with soft-close hinges and internal drawers, top cabinets taken to the ceiling, per foot run'],
    ['Plumbing works, kitchen and bathrooms', 'Relocation of water points and drainage, sanitary ware installation', 'Relocation of water points and drainage in the kitchen and both bathrooms, sanitary ware and mixers installed'],
    ['Painting, whole unit', 'Two coats of emulsion on walls and ceilings, sealer included', 'Two coats of washable emulsion on every wall and ceiling over sealer, doors and frames finished in enamel'],
    ['Design consultation and 3D drawings', 'Space planning, material selection and 3D visuals for the whole unit', 'Space planning, material selection and 3D visuals for the whole unit, with two rounds of revisions before the final set'],
    ['Wardrobe, master bedroom', 'Full-height laminated wardrobe with sliding doors and internal drawers', 'Full-height laminated wardrobe with sliding doors, internal drawers, hanging rails and a mirror panel on one door'],
  ]
  let lengthened = 0
  for (const [name, was, now] of LONGER) {
    for (const table of ['price_book_items', 'quote_items']) {
      const r = await client.execute({ sql: `UPDATE ${table} SET description = ? WHERE name = ? AND description = ?`, args: [now, name, was] })
      lengthened += r.rowsAffected
    }
  }
  console.log(`  ${lengthened} description(s) lengthened`)

  /* ── R30 · every quote names its creator (Creator column, REG-471) ──────────────────────────────
     Quotes made before the column existed take the member who prepared them, else the signed-in member. */
  console.log('\nR30 quote creators')
  const stamped = await client.execute(`UPDATE quotes SET created_by = coalesce(prepared_by, (SELECT id FROM members WHERE is_you = 1 LIMIT 1)) WHERE created_by IS NULL`)
  console.log(`  ${stamped.rowsAffected} quote(s) given a creator`)

  /* ── R31 · the brand kit and the studio's three templates as published designs (REG-485 / REG-487) ──────
     Company › Profile reads one settings row (`brand`): the kit and the company details every template prints — seeded with
     the demo studio's details and the reference quotes' accreditation badges. The three seeded templates (R22) keep their
     mock names but carry real designs: the owner's three reference quotes as house styles — Default Quote PDF = Letter
     (Dyel's Sales Contract), 4-Room BTO = Scope (Flo Design), 5-Room BTO = Form (Cove Interior) — published as v1 with
     their version rows, so a quote created from one pins to v1 and the editor's history has a start. Quotes already on a
     template pin to its version; the showcase quote OM-10008 prints through the Scope template. Existing designs are kept. */
  console.log('\nR31 brand kit and template designs')
  await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('brand', ?, ?)`,
    args: [JSON.stringify({ kit: { ...DEFAULT_BRAND_SETTING.kit, badges: DEMO_BADGES }, details: DEFAULT_BRAND_SETTING.details }), NOW - 30 * D] })
  const houseStyle: Record<string, string> = { 'Default Quote PDF': 'letter', '4-Room BTO': 'scope', '5-Room BTO': 'form' }
  let designed = 0
  for (const [name, key] of Object.entries(houseStyle)) {
    const id = sid(name, 'quote_template')
    const preset = PRESETS.find((p) => p.key === key)!
    const [row] = rows<{ design_json: string | null; created_at: number }>(await client.execute({ sql: `SELECT design_json, created_at FROM quote_templates WHERE id = ?`, args: [id] }))
    if (!row || row.design_json) continue
    const design = JSON.stringify(preset.design()), defaults = JSON.stringify(preset.defaults)
    const publishedAt = row.created_at + H
    await client.execute({ sql: `UPDATE quote_templates SET status = 'published', version = 1, published_at = ?, updated_at = ?, updated_by = 'dane', paper = ?, design_json = ?, defaults_json = ?, note = 'First published' WHERE id = ?`,
      args: [publishedAt, publishedAt, preset.paper, design, defaults, id] })
    await client.execute({ sql: `INSERT OR IGNORE INTO quote_template_versions (id, template_id, version, design_json, defaults_json, note, published_at, published_by) VALUES (?, ?, 1, ?, ?, 'First published', ?, 'dane')`,
      args: [sid(`${name} v1`, 'quote_template_version'), id, design, defaults, publishedAt] })
    designed++
  }
  await client.execute({ sql: `UPDATE quotes SET template_id = ?, template_version = 1 WHERE number = 'OM-10008' AND template_id IS NULL`, args: [sid('4-Room BTO', 'quote_template')] })
  await client.execute(`UPDATE quotes SET template_version = (SELECT t.version FROM quote_templates t WHERE t.id = quotes.template_id) WHERE template_id IS NOT NULL AND template_version IS NULL`)
  note(`brand kit present; ${designed} template(s) received their house-style design; quotes on a template pinned to its version`)

  /* ── R32 · a template awaiting the owner's approval (REG-501) ────────────────────────────────────
     The prototype is always signed in as Dane, the owner, so the designer's side cannot be clicked through; Sarah's
     submission gives the owner's side something real — the gallery's Awaiting approval filter, the rail's Company badge,
     the editor's review bar with Approve and publish · Request changes. A draft from the Presentation house style, never
     published; kept as she left it if she is still waiting. */
  console.log('\nR32 template awaiting approval')
  {
    const id = sid('Showflat Presentation', 'quote_template')
    const preset = PRESETS.find((p) => p.key === 'presentation')!
    await client.execute({ sql: `INSERT OR IGNORE INTO quote_templates (id, name, kind, is_default, created_at, status, version, paper, draft_json, draft_updated_at, updated_at, updated_by, submitted_by, submitted_at, submit_note)
      VALUES (?, 'Showflat Presentation', 'design', 0, ?, 'draft', 0, ?, ?, ?, ?, 'sarah', 'sarah', ?, ?)`,
      args: [id, NOW - 3 * H, preset.paper, JSON.stringify({ design: preset.design(), defaults: preset.defaults }), NOW - 2 * H, NOW - 2 * H, NOW - 2 * H, 'For the showflat launch — the cover in our colour, a page per room with photos, the investment summary.'] })
    note('Showflat Presentation awaits approval, submitted by Sarah 2h ago')
  }

  /* ── R33 · two Quote X-Ray comparisons (REG-529) ─────────────────────────────────────────────────
     Recent comparisons and the leads' Activity need real readings: two studio quotes compared with two of the reference
     quotes through the same engine the page runs — nothing typed in "as the mock shows". */
  console.log('\nR33 quote comparisons')
  {
    const picks: [string, string, string, number][] = [['OM-10008', 'Flo Design Sample Quotation.pdf', 'xray-1', 2], ['OM-10001', 'Cove Interior Quotation.pdf', 'xray-2', 5]]
    for (const [number, file, seed, daysAgo] of picks) {
      const q = (await client.execute({ sql: `SELECT id, lead_id, title FROM quotes WHERE number = ? AND deleted_at IS NULL`, args: [number] })).rows[0]
      if (!q) { note(`${number} not found — no comparison seeded`); continue }
      const other = readOtherQuote(file)!
      const items = (await client.execute({ sql: `SELECT i.id, i.name, i.description, i.qty, i.unit, i.cost_minor, i.markup_minor, i.discount_pct, i.optional, i.category, i.room, g.category AS g_category, g.room AS g_room, g.name AS g_name FROM quote_items i LEFT JOIN quote_items g ON g.id = i.parent_id WHERE i.quote_id = ? AND i.kind = 'item' AND i.status <> 'Declined'`, args: [String(q.id)] })).rows
      const yours: YourLine[] = items.map((i) => ({ id: String(i.id), name: String(i.name), description: (i.description as string | null) ?? null, trade: ((i.category ?? i.g_category ?? i.g_name) as string | null) ?? null, room: ((i.room ?? i.g_room) as string | null) ?? null, qty: Number(i.qty), unit: (i.unit as string | null) ?? null, amountMinor: lineTotalMinor({ qty: Number(i.qty), costMinor: Number(i.cost_minor), markupMinor: Number(i.markup_minor), discountPct: Number(i.discount_pct) }), optional: Number(i.optional) === 1 }))
      const lead = (await client.execute({ sql: `SELECT name FROM leads WHERE id = ?`, args: [String(q.lead_id)] })).rows[0]
      const result = compareQuotes(yours, other, { yourLabel: `${number} · ${String(q.title)}`, yourStudio: DEFAULT_BRAND_SETTING.details.name, clientName: lead ? String(lead.name) : null })
      await client.execute({ sql: `INSERT OR IGNORE INTO quote_comparisons (id, lead_id, quote_id, your_label, other_studio, other_file, result_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'dane', ?)`,
        args: [sid(seed, 'quote_comparison'), String(q.lead_id), String(q.id), `${number} · ${String(q.title)}`, other.studio, file, JSON.stringify(result), NOW - daysAgo * 86400] })
      note(`${number} compared with ${other.studio} (${result.compared} items)`)
    }
  }

  /* ── R20 · prove it ───────────────────────────────────────────────────────────────────────────── */
  console.log('\nR20 verification')
  /* ── R34 · contract documents and the two contract templates (REG-534) ─────────────────────────────
     Every composed contract carries the starter agreement as its document, the lead's client as recipient, its creation
     day as the contract date; the library holds "Interior Design Service Agreement" and "Variation Order". */
  console.log('\nR34 contract documents + templates')
  {
    const nowS = Math.floor(Date.now() / 1000)
    const tpl = [
      { id: sid('template', 'contract-agreement'), title: AGREEMENT_TITLE, body: agreementHtml(), days: 40 },
      { id: sid('template', 'contract-variation'), title: VARIATION_TITLE, body: variationHtml(), days: 26 },
    ]
    for (const t of tpl) {
      await client.execute({ sql: `INSERT INTO contract_templates (id, title, body, created_by, created_at, updated_at) VALUES (?, ?, ?, 'dane', ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title, body = CASE WHEN contract_templates.body = '' THEN excluded.body ELSE contract_templates.body END`, args: [t.id, t.title, t.body, nowS - t.days * 86400, nowS - t.days * 86400] })
    }
    const bare = rows<{ id: string; lead_id: string; created_at: number; name: string; phone: string }>(await client.execute(
      `SELECT c.id, c.lead_id, c.created_at, l.name, l.phone FROM contracts c JOIN leads l ON l.id = c.lead_id WHERE c.source = 'composed' AND c.body IS NULL`))
    for (const c of bare) {
      await client.execute({ sql: `UPDATE contracts SET body = ?, recipient_name = COALESCE(recipient_name, ?), recipient_phone = COALESCE(recipient_phone, ?), contract_date = COALESCE(contract_date, created_at),
        template_id = COALESCE(template_id, ?), created_by = COALESCE(created_by, 'dane') WHERE id = ?`, args: [agreementHtml(), c.name, c.phone.replace(/\D/g, '').slice(-8), tpl[0]!.id, c.id] })
    }
    await client.execute(`UPDATE contract_templates SET last_used_at = (SELECT max(created_at) FROM contracts c WHERE c.template_id = contract_templates.id) WHERE last_used_at IS NULL`)
    console.log(`  ${bare.length} contract documents written · ${tpl.length} templates`)
  }

  /* ── R35 · the template libraries behind Company › Templates (REG-538) ─────────────────────────────
     The four payment presets are rows of `payment_templates` under their old keys (so every stored `paymentPreset`
     still resolves); every text and task template names its author and carries an update stamp, the way the galleries
     print them. */
  console.log('\nR35 template libraries')
  {
    const nowS = Math.floor(Date.now() / 1000)
    for (const [i, p] of PRESET_SPLITS.entries()) {
      await client.execute({ sql: `INSERT OR IGNORE INTO payment_templates (id, name, rows_json, is_preset, created_by, created_at, updated_at) VALUES (?, ?, ?, 1, NULL, ?, ?)`, args: [p.id, p.name, JSON.stringify(p.rows), nowS - (120 - i) * 86400, nowS - (120 - i) * 86400] })
    }
    const a = await client.execute(`UPDATE quote_text_templates SET created_by = 'dane' WHERE created_by IS NULL`)
    const b = await client.execute(`UPDATE task_templates SET created_by = COALESCE(created_by, 'dane'), updated_at = COALESCE(updated_at, created_at) WHERE created_by IS NULL OR updated_at IS NULL`)
    await client.execute(`UPDATE payment_templates SET last_used_at = (SELECT max(q.created_at) FROM quotes q WHERE q.deleted_at IS NULL) WHERE id = 'default' AND last_used_at IS NULL`)
    console.log(`  ${PRESET_SPLITS.length} payment presets present · ${a.rowsAffected} text templates named their author · ${b.rowsAffected} task templates stamped`)
  }

  const checks: [string, string][] = [
    ['payment preset missing from the library (REG-538)', `SELECT 'payment_templates' WHERE (SELECT count(*) FROM payment_templates WHERE is_preset = 1 AND deleted_at IS NULL) < 4`],
    ['text template with no author (REG-538)', `SELECT title FROM quote_text_templates WHERE created_by IS NULL`],
    ['task template with no author or stamp (REG-538)', `SELECT name FROM task_templates WHERE created_by IS NULL OR updated_at IS NULL`],
    ['quote template default pointing at a missing text template (REG-538)', `SELECT name FROM quote_templates t WHERE t.deleted_at IS NULL AND ((json_extract(t.defaults_json, '$.termsTemplateId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quote_text_templates x WHERE x.id = json_extract(t.defaults_json, '$.termsTemplateId') AND x.deleted_at IS NULL)) OR (json_extract(t.defaults_json, '$.notesTemplateId') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quote_text_templates x WHERE x.id = json_extract(t.defaults_json, '$.notesTemplateId') AND x.deleted_at IS NULL)))`],
    ['composed contract with no document (REG-534)', `SELECT title FROM contracts WHERE source = 'composed' AND body IS NULL`],
    ['contract with no recipient (REG-534)', `SELECT title FROM contracts WHERE recipient_name IS NULL OR recipient_phone IS NULL`],
    ['quote with no creator', `SELECT number FROM quotes WHERE created_by IS NULL`],
    ['quote follow-up task out of step with its due date', `SELECT q.number FROM lead_tasks t JOIN quotes q ON q.id = t.quote_id WHERE t.done = 0 AND (q.due_at IS NULL OR q.due_at <> t.due_at)`],
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
    ['quote with no prepared-by member or property type (editor General Info)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND (q.prepared_by IS NULL OR q.property_type IS NULL)`],
    ['no default quote design template', `SELECT 'quote_templates' WHERE NOT EXISTS (SELECT 1 FROM quote_templates WHERE is_default = 1)`],
    ['quote comparison whose quote is gone', `SELECT c.your_label FROM quote_comparisons c WHERE c.quote_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = c.quote_id AND q.deleted_at IS NULL)`],
    ['quote with no project ref or validity (editor General Info)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND (q.project_ref IS NULL OR q.valid_until IS NULL)`],
    ['priced quote with no lines (Items section)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND NOT EXISTS (SELECT 1 FROM quote_items i WHERE i.quote_id = q.id)`],
    ['no studio record', `SELECT 'studio' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'studio')`],
    ['line whose answer differs from its group (no chip to show it)', `SELECT q.number || ' · ' || c.name FROM quote_items c JOIN quote_items p ON p.id = c.parent_id JOIN quotes q ON q.id = c.quote_id WHERE c.status <> p.status`],
    ['live quote with no payment schedule (Payment Schedule section)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM quote_payments p WHERE p.quote_id = q.id)`],
    ['payment row with a date on an approval milestone, or none on a dated one', `SELECT q.number || ' · ' || p.name FROM quote_payments p JOIN quotes q ON q.id = p.quote_id WHERE (p.due_kind = 'approval' AND p.due_at IS NOT NULL) OR (p.due_kind <> 'approval' AND p.due_at IS NULL)`],
    ['quote file that is a folder or trashed', `SELECT q.number || ' · ' || f.name FROM quote_files x JOIN lead_files f ON f.id = x.file_id JOIN quotes q ON q.id = x.quote_id WHERE f.kind = 'folder' OR f.deleted_at IS NOT NULL OR f.lead_id <> q.lead_id`],
    ['priced quote with no terms or notes (Terms / Notes sections)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND (q.terms_html IS NULL OR q.notes_html IS NULL)`],
    ['text template library missing a kind', `SELECT k FROM (SELECT 'terms' AS k UNION SELECT 'notes') WHERE NOT EXISTS (SELECT 1 FROM quote_text_templates t WHERE t.kind = k)`],
    ['signed-in member with no signature (Signature section)', `SELECT name FROM members WHERE is_you = 1 AND signature_kind IS NULL`],
    ['demo quote with no Declined line to show the status', `SELECT 'OM-10008' WHERE NOT EXISTS (SELECT 1 FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE q.number = 'OM-10008' AND i.status = 'Declined' AND i.parent_id IS NULL)`],
    ['published template with no design (Company › Templates)', `SELECT name FROM quote_templates WHERE status = 'published' AND design_json IS NULL`],
    ['published template with no version row', `SELECT name FROM quote_templates t WHERE t.status = 'published' AND NOT EXISTS (SELECT 1 FROM quote_template_versions v WHERE v.template_id = t.id AND v.version = t.version)`],
    ['quote on a template with no pinned version', `SELECT number FROM quotes WHERE template_id IS NOT NULL AND template_version IS NULL`],
    ['no brand kit record (Company › Profile)', `SELECT 'brand' WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key = 'brand')`],
    ['template awaiting approval with no submitter or note', `SELECT name FROM quote_templates WHERE submitted_at IS NOT NULL AND (submitted_by IS NULL OR submit_note IS NULL)`],
    ['default template deleted (Company › Templates)', `SELECT name FROM quote_templates WHERE is_default = 1 AND deleted_at IS NOT NULL`],
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
