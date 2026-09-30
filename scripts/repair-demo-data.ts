process.env.TZ = process.env.TZ ?? 'Asia/Kolkata'   // before any Date: every `when` string and every due hour is local (the demo machine runs IST)

import { randomUUID } from 'node:crypto'
import { createClient, type InStatement } from '@libsql/client'
import { compareQuotes, ENGINE, refAsYours, type YourLine } from '@/lib/xray/compare'
import { yourLinesFrom } from '@/lib/xray/lines'
import { AGREEMENT_TITLE, VARIATION_SIGN_OFF, VARIATION_TITLE, agreementHtml, variationHtml } from '@/lib/contracts/agreement'
import { readOtherQuote } from '@/lib/xray/reference'
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
import { DEFAULT_BRAND_SETTING, parseBrandSetting } from '../lib/templates/brand'
import { documentHashOf, snapshotColumns, type ContractLead, type ContractQuote } from '../lib/contracts/snapshot'
import type { Contract } from '../lib/db/schema'
import { DEMO_BADGES } from '../lib/templates/assets'
import { sampleByKey } from '../lib/visualizer/samples'
import { changeLines, descriptor, NO_FINISHES, ORIGINAL, readPending, sampleDetection, versionKey, type Applied, type Finishes, type Variant } from '../lib/visualizer/model'
import { catalogueItem } from '../lib/visualizer/catalogue'
import { fromCatalogue } from '../lib/visualizer/materials'
import { composeCustomizeDesc } from '../lib/visualizer/furniture'
import { presetById } from '../lib/visualizer/lighting'
import { titleCaseLabel } from '../lib/visualizer/surfaces'
import { DEMO_EDIT } from '../lib/visualizer/demo'
import { dataUrlBytes, isDataImage, liftPictures, parseAssets, renderAddress } from '../lib/visualizer/picture-store'
import { statSync } from 'node:fs'
import path from 'node:path'

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
        [sid(l.id, 'contract'), l.id, AGREEMENT_TITLE, tQ + 1 * D, tQ + 2 * D, tW - 2 * H, `${AGREEMENT_TITLE}.pdf`, tW - 2 * H])   // (UX audit C10) the paper's own title
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

  /* ── R33 · two Quote X-Ray comparisons (REG-529; engine 2, REG-638) ────────────────────────────
     Recent comparisons and the leads' Activity need real readings: two studio quotes compared with two of the reference
     quotes through the same engine the page runs — nothing typed in "as the mock shows". Since REG-638 the lines are read
     the way the page reads them (lib/xray/lines.ts — the quote's own count, in its order) and the reading keeps both sides'
     lines and its engine. */
  console.log('\nR33 quote comparisons')
  const studioName = async () => {
    const row = (await client.execute(`SELECT value FROM settings WHERE key = 'brand'`)).rows[0]
    try { return (row ? (JSON.parse(String(row.value)) as { details?: { name?: string } }).details?.name : null) || DEFAULT_BRAND_SETTING.details.name } catch { return DEFAULT_BRAND_SETTING.details.name }
  }
  const quoteLines = async (quoteId: string): Promise<YourLine[]> => {
    const rows = (await client.execute({ sql: `SELECT id, parent_id, kind, status, position, optional, print_as, print_as_text, name, description, category, room, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct FROM quote_items WHERE quote_id = ?`, args: [quoteId] })).rows
    return yourLinesFrom(rows.map((r) => ({ id: String(r.id), parentId: (r.parent_id as string | null) ?? null, kind: String(r.kind), status: String(r.status), position: Number(r.position), optional: Number(r.optional) === 1,
      printAs: (r.print_as as string | null) ?? null, printAsText: (r.print_as_text as string | null) ?? null, name: String(r.name ?? ''), description: (r.description as string | null) ?? null,
      category: (r.category as string | null) ?? null, room: (r.room as string | null) ?? null, qty: Number(r.qty), unit: (r.unit as string | null) ?? null,
      costMinor: Number(r.cost_minor), markupMinor: Number(r.markup_minor), discountPct: Number(r.discount_pct), gstPct: Number(r.gst_pct) })) as never)
  }
  {
    const picks: [string, string, string, number][] = [['OM-10008', 'Flo Design Sample Quotation.pdf', 'xray-1', 2], ['OM-10001', 'Cove Interior Quotation.pdf', 'xray-2', 5]]
    const studio = await studioName()
    for (const [number, file, seed, daysAgo] of picks) {
      const q = (await client.execute({ sql: `SELECT id, lead_id, title, amount_minor FROM quotes WHERE number = ? AND deleted_at IS NULL`, args: [number] })).rows[0]
      if (!q) { note(`${number} not found — no comparison seeded`); continue }
      const other = readOtherQuote(file)!
      const yours = await quoteLines(String(q.id))
      const lead = (await client.execute({ sql: `SELECT name FROM leads WHERE id = ?`, args: [String(q.lead_id)] })).rows[0]
      const result = compareQuotes(yours, other, { yourLabel: `${number} · ${String(q.title)}`, yourStudio: studio, clientName: lead ? String(lead.name) : null, quoteTotalMinor: Number(q.amount_minor) })
      await client.execute({ sql: `INSERT OR IGNORE INTO quote_comparisons (id, lead_id, quote_id, your_label, other_studio, other_file, result_json, created_by, created_at, inputs_json, engine) VALUES (?, ?, ?, ?, ?, ?, ?, 'dane', ?, ?, ?)`,
        args: [sid(seed, 'quote_comparison'), String(q.lead_id), String(q.id), `${number} · ${String(q.title)}`, other.studio, file, JSON.stringify(result), NOW - daysAgo * 86400, JSON.stringify({ yours, theirs: other.lines }), ENGINE] })
      note(`${number} compared with ${other.studio} (${result.compared} items)`)
    }
  }

  /* ── R36 · round 1 of the testers' asks (REG-555…567) ────────────────────────────────────────────
     Every member has a work email on the studio's domain (`{prepared_by_email}`, REG-560); the brand record carries the
     studio as its first issuing entity with a tagline and social line left EMPTY (nothing invented — Company › Profile is
     where the studio fills them, REG-562); the showcase quote OM-10008 prints its zero-cost permit line as FOC through
     Print as (REG-555) — the same word the templates already gave a S$0 line, now a record on the line — and its lines'
     descriptions stay plain. A brand record from before REG-562 gains the entities list in place. */
  console.log('\nR36 member emails, issuing entities, a Print as line')
  {
    const domain = (DEFAULT_BRAND_SETTING.details.email.split('@')[1] ?? 'demostudio.sg').toLowerCase()
    const team = rows<{ id: string; name: string; email: string | null }>(await client.execute(`SELECT id, name, email FROM members`))
    let mailed = 0
    for (const m of team) if (!m.email) { await client.execute({ sql: `UPDATE members SET email = ? WHERE id = ?`, args: [`${m.name.split(/\s+/)[0]!.toLowerCase()}@${domain}`, m.id] }); mailed++ }
    const [brandRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'brand'`))
    let entitiesAdded = 0
    if (brandRow) {
      const b = JSON.parse(brandRow.value) as { kit: unknown; details: Record<string, unknown> }
      const d = b.details ?? {}
      if (!Array.isArray(d.entities) || !d.entities.length) {
        d.entities = [{ name: String(d.name ?? DEFAULT_BRAND_SETTING.details.name), bankName: '', accountName: '', accountNo: '', payNow: '', payNowQr: null }]
        if (typeof d.tagline !== 'string') d.tagline = ''
        if (typeof d.social !== 'string') d.social = ''
        await client.execute({ sql: `UPDATE settings SET value = ? WHERE key = 'brand'`, args: [JSON.stringify({ ...b, details: d })] })
        entitiesAdded = 1
      }
    }
    const foc = await client.execute(`UPDATE quote_items SET print_as = 'foc' WHERE print_as IS NULL AND kind = 'item' AND cost_minor = 0 AND markup_minor = 0 AND status <> 'Declined' AND optional = 0 AND quote_id = (SELECT id FROM quotes WHERE number = 'OM-10008')`)
    note(`${mailed} member email(s) set on @${domain}; ${entitiesAdded ? 'the studio added as its first issuing entity' : 'issuing entities present'}; ${foc.rowsAffected} zero-cost line(s) on OM-10008 marked FOC`)
  }

  /* ── R37 · the Letter design's footer (REG-569) ────────────────────────────────────────────────────
     The house style put the studio's address at 16 mm under a signature block that is ~20 mm tall, so the two printed over each
     other on every quote through Default Quote PDF. The preset moved the address to 22 mm in a 36 mm footer; every stored copy of
     that design — the template, its draft, its versions — is moved the same way, and only where it still sits at 16. */
  console.log('\nR37 Letter footer geometry')
  {
    type Design = { blocks?: { kind?: string; height?: number; elements?: { kind?: string; y?: number; text?: string }[] }[] }
    const fix = (json: string | null): string | null => {
      if (!json) return null
      let d: Design
      try { d = JSON.parse(json) as Design } catch { return null }
      const footer = d.blocks?.find((b) => b.kind === 'footer')
      if (!footer || !Array.isArray(footer.elements)) return null
      const sig = footer.elements.find((e) => e.kind === 'signature')
      const addr = footer.elements.find((e) => e.kind === 'text' && e.y === 16 && typeof e.text === 'string' && e.text.startsWith('{studio_name}'))
      if (!sig || !addr) return null
      addr.y = 22
      if ((footer.height ?? 0) < 36) footer.height = 36
      return JSON.stringify(d)
    }
    let moved = 0
    for (const r of rows<{ id: string; design_json: string | null; draft_json: string | null }>(await client.execute(`SELECT id, design_json, draft_json FROM quote_templates`))) {
      const design = fix(r.design_json)
      let draft: string | null = null
      if (r.draft_json) { try { const j = JSON.parse(r.draft_json) as { design?: unknown }; const fixed = fix(JSON.stringify(j.design ?? null)); if (fixed) draft = JSON.stringify({ ...j, design: JSON.parse(fixed) }) } catch { draft = null } }
      if (design || draft) { await client.execute({ sql: `UPDATE quote_templates SET design_json = COALESCE(?, design_json), draft_json = COALESCE(?, draft_json) WHERE id = ?`, args: [design, draft, r.id] }); moved++ }
    }
    for (const v of rows<{ id: string; design_json: string | null }>(await client.execute(`SELECT id, design_json FROM quote_template_versions`))) {
      const design = fix(v.design_json)
      if (design) { await client.execute({ sql: `UPDATE quote_template_versions SET design_json = ? WHERE id = ?`, args: [design, v.id] }); moved++ }
    }
    note(`${moved} stored Letter design(s) moved the address under the signature`)
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
    /* (REG-554) The brand record's company details and the studio record name the same studio: the studio record (REG-415) wins,
       so a Brand kit save never "changes" the phone it merely re-reads. */
    const c = await client.execute(`UPDATE settings SET value = json_set(value, '$.details.name', (SELECT json_extract(s.value, '$.name') FROM settings s WHERE s.key = 'studio'), '$.details.phone', (SELECT json_extract(s.value, '$.phone') FROM settings s WHERE s.key = 'studio'))
      WHERE key = 'brand' AND EXISTS (SELECT 1 FROM settings s WHERE s.key = 'studio') AND (json_extract(value, '$.details.name') IS NOT (SELECT json_extract(s.value, '$.name') FROM settings s WHERE s.key = 'studio') OR json_extract(value, '$.details.phone') IS NOT (SELECT json_extract(s.value, '$.phone') FROM settings s WHERE s.key = 'studio'))`)
    if (c.rowsAffected) console.log(`  brand kit details aligned with the studio record`)
    console.log(`  ${PRESET_SPLITS.length} payment presets present · ${a.rowsAffected} text templates named their author · ${b.rowsAffected} task templates stamped`)
  }

  /* ── R38 · the Price book's demo entries (REG-594) ─────────────────────────────────────────────────
     Vendors on the items the studio buys in (the same tile from two suppliers is two entries — Urban Home's ask), and one
     saved section built from a real quote's lines so My Sections has something to show. Idempotent by id. */
  console.log('\nR38 price book vendors + a saved section')
  {
    const nowS = Math.floor(Date.now() / 1000)
    const v = await client.execute(`UPDATE price_book_items SET vendor = 'Floor Xpert' WHERE name = 'Vinyl flooring, supply and install' AND vendor IS NULL`)
    const tiles: [string, string, number, number][] = [['pb-tiles-hafary', 'Hafary', 850, 250], ['pb-tiles-sbh', 'Soon Bee Huat', 820, 280]]   // (REG-651) per sqft, like the book's other floors — R56 corrects rows written with the old × 100 figures
    let added = 0
    for (const [id, vendor, cost, markup] of tiles) {
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO price_book_items (id, name, description, kind, unit, cost_minor, markup_minor, category, thumb, vendor, created_at, updated_at) VALUES (?, 'Homogeneous tiles 600×600, supply and lay', 'Matt finish, rectified edges, laid on screed', 'purchase', 'sqft', ?, ?, 'Tiling', NULL, ?, ?, ?)`, args: [id, cost, markup, vendor, nowS - 40 * 86400, nowS - 40 * 86400] })
      added += r.rowsAffected
    }
    const src = await client.execute(`SELECT g.id, g.name, g.description FROM quote_items g JOIN quotes q ON q.id = g.quote_id WHERE q.number = 'OM-10008' AND g.kind = 'group' AND g.parent_id IS NULL AND g.name = 'Bathrooms' LIMIT 1`)
    const g = src.rows[0]
    let section = 0
    if (g) {
      const lines = await client.execute({ sql: `SELECT name, description, description_html, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, room, category, section, print_as, print_as_text, highlight, icon FROM quote_items WHERE parent_id = ? AND kind = 'item' ORDER BY position`, args: [String(g.id)] })
      const body = { name: 'Bathrooms — full works', description: String(g.description ?? '') || null, descriptionHtml: null, subs: [], lines: lines.rows.map((l) => ({ name: String(l.name), description: l.description == null ? null : String(l.description), descriptionHtml: l.description_html == null ? null : String(l.description_html), qty: Number(l.qty), unit: l.unit == null ? null : String(l.unit), costMinor: Number(l.cost_minor), markupMinor: Number(l.markup_minor), discountPct: Number(l.discount_pct), gstPct: Number(l.gst_pct), room: l.room == null ? null : String(l.room), category: l.category == null ? null : String(l.category), section: l.section == null ? null : String(l.section), printAs: l.print_as == null ? null : String(l.print_as), printAsText: l.print_as_text == null ? null : String(l.print_as_text), highlight: l.highlight == null ? null : String(l.highlight), icon: l.icon == null ? null : String(l.icon) })) }
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO price_book_sections (id, name, description, lines_json, created_at, updated_at, last_used_at) VALUES ('pbs-bathrooms-full-works', ?, ?, ?, ?, ?, NULL)`, args: [body.name, body.description, JSON.stringify(body), nowS - 21 * 86400, nowS - 21 * 86400] })
      section = r.rowsAffected
    }
    console.log(`  ${v.rowsAffected} vendor named · ${added} tile entries added · ${section} saved section added`)
  }

  /* ── R39 · the demo's manager and their team (REG-601) ──────────────────────────────────────────────
     James is the Manager; Sarah and Michelle report to him — the hierarchy Dyel asked for, so Company › Members and the
     assignment rules have something to show. Idempotent. */
  console.log('\nR39 members: the manager and their team')
  {
    const a = await client.execute(`UPDATE members SET role = 'Manager' WHERE id = 'james' AND role = 'Designer'`)
    const b = await client.execute(`UPDATE members SET manager_id = 'james' WHERE id IN ('sarah', 'michelle') AND role = 'Designer' AND manager_id IS NULL`)
    console.log(`  ${a.rowsAffected} manager named · ${b.rowsAffected} designers placed in his team`)
  }

  /* ── R40 · the bell's demo rows (REG-604) ──────────────────────────────────────────────────────────
     Three stored notifications for the signed-in owner, on real records: the two newest leads arriving, and a quote a
     client confirmed if one exists. Idempotent by id; the follow-ups due are derived at read time and need no rows. */
  console.log('\nR40 notifications')
  {
    const me = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE is_you = 1 LIMIT 1`))[0]?.id ?? 'dane'
    const newest = rows<{ id: string; name: string; source: string; created_at: number }>(await client.execute(`SELECT id, name, source, created_at FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 2`))
    let added = 0
    for (const [i, l] of newest.entries()) {
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'new_lead', ?, ?, ?, ?, NULL, 'in_app,email,whatsapp', NULL, ?, ?)`, args: [`n-new-${l.id}`, me, `New lead: ${l.name}`, l.source, `/leads/${l.id}`, l.id, Number(l.created_at) + 60, i === 0 ? null : Number(l.created_at) + 3600] })
      added += r.rowsAffected
    }
    const confirmed = rows<{ id: string; number: string; lead_id: string; confirmed_by: string | null; confirmed_at: number }>(await client.execute(`SELECT id, number, lead_id, confirmed_by, confirmed_at FROM quotes WHERE confirmed_at IS NOT NULL AND deleted_at IS NULL ORDER BY confirmed_at DESC LIMIT 1`))[0]
    if (confirmed) { const r = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'quote_confirmed', ?, 'Next: add the T&Cs and send for signature', ?, ?, ?, 'in_app,email,whatsapp', NULL, ?, NULL)`, args: [`n-conf-${confirmed.id}`, me, `${confirmed.confirmed_by ?? 'The client'} confirmed quote ${confirmed.number}`, `/quotes/${confirmed.id}`, confirmed.lead_id, confirmed.id, Number(confirmed.confirmed_at)] }); added += r.rowsAffected }
    console.log(`  ${added} notification rows added`)
  }

  /* ── R41 · the parity round's vocabulary on the demo data (REG-607) ─────────────────────────────────
     Key collection takes 1.0's five values ("Not yet collected" → "Later"); the On Hold reason list is the union of both products'
     ("Budget on hold" → "Budget review"). The leads keep every other value. Idempotent. */
  console.log('\nR41 parity vocabulary')
  {
    const a = await client.execute(`UPDATE leads SET key_collection = CASE
      WHEN key_collection = 'Not yet collected' THEN 'Later'
      WHEN key_collection LIKE 'Within the next 3 months%' THEN 'in 3 months'
      WHEN key_collection LIKE 'Within the next 6 months%' THEN 'in 6 months'
      WHEN key_collection LIKE 'Within the next 9 months%' THEN 'in 9 months'
      ELSE key_collection END WHERE key_collection IS NOT NULL AND key_collection NOT IN ('Collected', 'in 3 months', 'in 6 months', 'in 9 months', 'Later')`)
    const b = await client.execute(`UPDATE stage_logs SET payload = json_set(payload, '$.reason', 'Budget review') WHERE to_stage = 'On Hold' AND json_extract(payload, '$.reason') = 'Budget on hold'`)
    console.log(`  ${a.rowsAffected} key collection values renamed · ${b.rowsAffected} hold reasons renamed`)
  }

  /* ── R42 · follow-ups are tasks of their own kind (REG-608) ──────────────────────────────────────────
     The reminders the Contacted log and a quote's due date raise read "Follow-up" now; the seeded ones catch up. Idempotent. */
  console.log('\nR42 follow-up task kind')
  {
    const a = await client.execute(`UPDATE lead_tasks SET kind = 'Follow-up' WHERE kind IN ('General', 'Call') AND (quote_id IS NOT NULL OR title LIKE 'Follow up %' OR title LIKE 'Meet the client on %')`)
    console.log(`  ${a.rowsAffected} tasks re-kinded as Follow-up`)
    /* A follow-up belongs to the lead's members (the reminder, the quote's task and Set a follow-up all assign them) — a seeded one with nobody on it takes them. */
    const b = await client.execute(`INSERT INTO task_assignees (task_id, member_id) SELECT t.id, x.member_id FROM lead_tasks t JOIN lead_assignees x ON x.lead_id = t.lead_id WHERE t.kind = 'Follow-up' AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id)`)
    console.log(`  ${b.rowsAffected} follow-up assignments added`)
  }

  /* ── R43 · the portal's records and Qanvast's ids (REG-609) ──────────────────────────────────────────
     A client-answered questionnaire means the client was asked: the homeowner profile and the lead's portal link exist, with
     last_asked_at a day before the earliest client answer (a seeded "asked" state with its record, REG-343). Qanvast-sourced
     leads carry Qanvast's own reference. Idempotent. */
  console.log('\nR43 portal records + Qanvast ids')
  {
    const asked = await client.execute(`SELECT l.id, l.name, l.phone, l.email, MIN(q.answered_at) AS first FROM leads l JOIN questions q ON q.lead_id = l.id AND q.answered_by = 'client' AND q.answered_at IS NOT NULL WHERE l.deleted_at IS NULL GROUP BY l.id`)
    let links = 0
    for (const r of asked.rows) {
      const leadId = String(r.id), phone = String(r.phone)
      const askedAt = Number(r.first) - 86_400
      await client.execute({ sql: `INSERT INTO homeowner_profiles (id, phone, name, email, created_at, updated_at) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM homeowner_profiles WHERE phone = ?)`, args: [`hp-${leadId.slice(0, 8)}`, phone, String(r.name), r.email == null ? null : String(r.email), askedAt, askedAt, phone] })
      const res = await client.execute({ sql: `INSERT INTO homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, last_asked_at, created_at) SELECT ?, (SELECT id FROM homeowner_profiles WHERE phone = ?), ?, ?, 1, NULL, ?, ? WHERE NOT EXISTS (SELECT 1 FROM homeowner_lead_links WHERE lead_id = ?)`, args: [`hl-${leadId.slice(0, 8)}`, phone, leadId, `tok-${leadId.slice(0, 8)}`, askedAt, askedAt, leadId] })
      links += res.rowsAffected
      await client.execute({ sql: `UPDATE homeowner_lead_links SET last_asked_at = ? WHERE lead_id = ? AND last_asked_at IS NULL`, args: [askedAt, leadId] })
    }
    console.log(`  ${links} portal links written for ${asked.rows.length} asked leads`)
    const q = await client.execute(`UPDATE leads SET qanvast_lead_id = printf('%06d', 100000 + (abs(random()) % 900000)) WHERE source = 'Qanvast' AND qanvast_lead_id IS NULL`)
    console.log(`  ${q.rowsAffected} Qanvast ids assigned`)
  }

  /* ── R44 · the question bank, the designers' preferences (REG-612) ───────────────────────────────────
     Company › Questionnaire starts from the questions the demo's leads already ask (Olivia's eleven), each with 1.0's type; the
     demo designers carry a specialty and preferences so the Assign popover's suggestion has something to say. Idempotent. */
  console.log('\nR44 question bank + preferences')
  {
    const bankRows = await client.execute(`SELECT count(*) AS n FROM studio_scope_questions`)
    if (Number(bankRows.rows[0]?.n ?? 0) === 0) {
      const qs = await client.execute(`SELECT text, type, options, MIN(sort_order) AS o FROM questions GROUP BY text ORDER BY o`)
      let i = 0
      for (const q of qs.rows) {
        const type = String(q.type), opts = (() => { try { const v = JSON.parse(String(q.options ?? '[]')); return Array.isArray(v) ? v.map(String) : [] } catch { return [] } })()
        const bankType = type === 'single' ? (opts.length === 2 && opts[0] === 'Yes' && opts[1] === 'No' ? 'yes_no' : 'single_select') : type === 'multi' ? 'multi_select' : type
        await client.execute({ sql: `INSERT INTO studio_scope_questions (id, question, question_type, options, is_required, is_enabled, sort_order, created_at) VALUES (?, ?, ?, ?, 0, 1, ?, ?)`, args: [`ssq-${String(i).padStart(2, '0')}`, String(q.text), bankType, bankType === 'yes_no' ? null : opts.length ? JSON.stringify(opts) : null, i, Math.floor(Date.now() / 1000)] })
        i++
      }
      console.log(`  ${i} bank questions seeded from the leads' questionnaires`)
    } else console.log('  bank already seeded')
    const prefs: Record<string, { specialty: string; prefs: unknown }> = {
      sarah: { specialty: 'HDB & BTO homes, compact layouts', prefs: { propertyType: { values: ['HDB 3-Room', 'HDB 4-Room', 'HDB 5-Room', 'BTO 4-Room', 'BTO 5-Room'], priority: 'must' }, area: { values: ['East', 'North East'], priority: 'nice' } } },
      michelle: { specialty: 'Condo & executive condo, mid-range residential', prefs: { propertyType: { values: ['Condo 2-bedder', 'Condo 3-bedder', 'Executive Condo'], priority: 'must' }, style: { values: ['Scandinavian', 'Japandi', 'Minimalist'], priority: 'nice' } } },
      germaine: { specialty: 'Landed & penthouse, luxury finishes', prefs: { propertyType: { values: ['Landed — Terrace', 'Landed — Semi-D', 'Landed — Bungalow', 'Penthouse'], priority: 'must' }, budget: { values: ['150+'], priority: 'nice' } } },
      alex: { specialty: 'Commercial fit-outs and retail spaces', prefs: {} },   // no home keywords: the suggestion's specialty leg stays with the home designers
    }
    let n = 0
    for (const [id, p] of Object.entries(prefs)) {
      const r = await client.execute({ sql: `UPDATE members SET specialty = COALESCE(specialty, ?), lead_preferences = COALESCE(lead_preferences, ?) WHERE id = ? AND (specialty IS NULL OR lead_preferences IS NULL)`, args: [p.specialty, Object.keys(p.prefs as object).length ? JSON.stringify(p.prefs) : null, id] })
      n += r.rowsAffected
    }
    await client.execute(`UPDATE members SET specialty = 'Commercial fit-outs and retail spaces' WHERE id = 'alex' AND specialty = 'Residential interiors'`)   // the first seeding's wording, corrected
    console.log(`  ${n} members given a specialty / preferences`)
  }

  /* ── R45 · the event log's backfill and the demo states 1.0 shows (REG-613, Q-20 · Q-45) ─────────────────
     Every invite / ask stamp gets its event row (the Activity feed reads events, not stamps, since REG-613). The curated set gains
     the states 1.0's demo studio shows and 2.0 lacked: a Hangout lead, a Lost lead per reason beyond the returns (Budget mismatch ·
     Project postponed, with their contact trail), and a webhook arrival waiting in Review with its endpoint. Idempotent. */
  console.log('\nR45 event backfill + demo states')
  {
    const links = await client.execute(`SELECT id, lead_id, invited_at, last_asked_at FROM homeowner_lead_links`)
    let ev = 0
    for (const l of links.rows) {
      for (const [col, kind] of [['invited_at', 'invite_sent'], ['last_asked_at', 'questionnaire_asked']] as const) {
        const at = l[col]; if (at == null) continue
        const r = await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, kind, actor_id, at, detail) SELECT ?, ?, ?, 'dane', ?, '{}' WHERE NOT EXISTS (SELECT 1 FROM lead_events WHERE lead_id = ? AND kind = ? AND at = ?)`, args: [`ev-${kind}-${String(l.id).slice(0, 8)}`, String(l.lead_id), kind, Number(at), String(l.lead_id), kind, Number(at)] })
        ev += r.rowsAffected
      }
    }
    console.log(`  ${ev} event rows backfilled from the portal stamps`)
    const now = Math.floor(Date.now() / 1000), DAY = 86_400
    const when = (sec: number) => { const d = new Date(sec * 1000); const h = d.getHours() % 12 || 12; return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}` }
    const leadRow = async (r: { id: string; name: string; phone: string; email: string | null; source: string; propertyType: string; address: string; budgetMinor: number; stage: string; createdAt: number; seenAt: number | null; area: string | null; style: string | null; condition: string | null; member: string; assignedAt: number }) => {
      const exists = await client.execute({ sql: `SELECT 1 FROM leads WHERE id = ?`, args: [r.id] })
      if (exists.rows.length) return false
      await client.execute({ sql: `INSERT INTO leads (id, name, phone, email, source, property_type, property_address, budget_minor, stage, key_collection, condition, style, area, created_at, updated_at, seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Collected', ?, ?, ?, ?, ?, ?)`, args: [r.id, r.name, r.phone, r.email, r.source, r.propertyType, r.address, r.budgetMinor, r.stage, r.condition, r.style, r.area, r.createdAt, r.createdAt, r.seenAt] })
      await client.execute({ sql: `INSERT INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?, ?, ?, ?)`, args: [`${r.id}-a`, r.id, r.member, r.assignedAt] })
      return true
    }
    const contactedPayload = (member: string, at: number, channel: string, outcome: string) => JSON.stringify({ assignees: [member], logs: [{ channel, when: when(at), outcome, nextStepWhen: '', nextStepMode: '', files: ['Q-101'], notes: '' }], meetings: [{ where: '', when: '', files: [], notes: '' }] })
    let made = 0
    /* A Hangout lead, unseen in New — 1.0's source the demo lacked. */
    if (await leadRow({ id: 'plead-hangout', name: 'Nur Aisyah', phone: '91238801', email: 'nur.aisyah@example.com', source: 'Hangout', propertyType: 'HDB 5-Room', address: 'Blk 220 Tampines St 24', budgetMinor: 5_800_000, stage: 'New', createdAt: now - 3 * DAY, seenAt: null, area: 'East', style: 'Modern', condition: 'Resale', member: 'dane', assignedAt: now - 3 * DAY + 1800 })) made++
    /* Lost for a budget mismatch, after one contact. */
    const k0 = now - 40 * DAY
    if (await leadRow({ id: 'plead-lost-budget', name: 'Kenji Sato', phone: '91238803', email: null, source: 'Instagram', propertyType: 'Condo 2-bedder', address: 'Sims Urban Oasis, Aljunied', budgetMinor: 4_200_000, stage: 'Lost', createdAt: k0, seenAt: k0 + 3600, area: 'Central', style: 'Minimalist', condition: 'New', member: 'sarah', assignedAt: k0 + 7200 })) {
      await client.execute({ sql: `INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?, ?, 'New', 'Contacted', ?, ?)`, args: ['plead-lost-budget-l1', 'plead-lost-budget', contactedPayload('sarah', k0 + DAY, 'Call', 'Connected'), k0 + DAY] })
      await client.execute({ sql: `INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?, ?, 'Contacted', 'Lost', ?, ?)`, args: ['plead-lost-budget-l2', 'plead-lost-budget', JSON.stringify({ reason: 'Budget mismatch' }), k0 + 12 * DAY] })
      made++
    }
    /* Lost because the project is postponed — met, then parked with the restart the dialog records (REG-607). */
    const r0 = now - 55 * DAY
    if (await leadRow({ id: 'plead-lost-postponed', name: 'Rachel Lim', phone: '91238804', email: 'rachel.lim@example.com', source: 'Referral', propertyType: 'Landed — Terrace', address: 'Jalan Kembangan', budgetMinor: 18_500_000, stage: 'Lost', createdAt: r0, seenAt: r0 + 1800, area: 'East', style: 'Contemporary', condition: 'Resale', member: 'michelle', assignedAt: r0 + 3600 })) {
      await client.execute({ sql: `INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?, ?, 'New', 'Contacted', ?, ?)`, args: ['plead-lost-postponed-l1', 'plead-lost-postponed', contactedPayload('michelle', r0 + DAY, 'WhatsApp', 'Meeting scheduled'), r0 + DAY] })
      await client.execute({ sql: `INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?, ?, 'Contacted', 'Met', ?, ?)`, args: ['plead-lost-postponed-l2', 'plead-lost-postponed', JSON.stringify({ assignees: ['michelle'], logs: [{ channel: 'WhatsApp', when: when(r0 + DAY), outcome: 'Meeting scheduled', nextStepWhen: '', nextStepMode: '', files: ['Q-101'], notes: '' }], meetings: [{ where: 'In person', when: when(r0 + 6 * DAY), files: [], notes: '' }] }), r0 + 6 * DAY] })
      await client.execute({ sql: `INSERT INTO stage_logs (id, lead_id, from_stage, to_stage, payload, created_at) VALUES (?, ?, 'Met', 'Lost', ?, ?)`, args: ['plead-lost-postponed-l3', 'plead-lost-postponed', JSON.stringify({ reason: 'Project postponed', restartAt: new Date((now + 240 * DAY) * 1000).toISOString() }), r0 + 20 * DAY] })
      made++
    }
    console.log(`  ${made} demo leads added`)
    /* A webhook endpoint with one arrival waiting in Review — the Integrations card and the review queue agree. */
    const cap = await client.execute(`SELECT value FROM settings WHERE key = 'lead_capture'`)
    let capture: Record<string, unknown> = {}
    try { capture = cap.rows[0]?.value ? JSON.parse(String(cap.rows[0].value)) : {} } catch { capture = {} }
    if (!Array.isArray(capture.webhooks) || (capture.webhooks as unknown[]).length === 0) {
      const at = (now - 2 * DAY) * 1000
      capture.webhooks = [{ id: 'wh-google-ads', platform: 'google_ads', label: 'Google Ads', notes: 'Lead form on the Search campaign', token: 'c4f1b2e9a7d3c8f0e2b6a9d1c5f7e3a8b0d2c4e6f8a1b3c5d7e9f0a2b4c6d8e0', key: null, received: 1, created: 1, duplicates: 0, lastAt: at, active: true, createdAt: (now - 20 * DAY) * 1000 }]
      capture.webhookLog = [{ at, webhookId: 'wh-google-ads', outcome: 'created', name: 'Hafiz Rahman' }]
      await client.execute({ sql: `INSERT INTO settings (key, value, updated_at) VALUES ('lead_capture', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [JSON.stringify(capture), now] })
      console.log('  webhook endpoint seeded')
    }
    const imp = await client.execute(`SELECT 1 FROM imports WHERE id = 'imp-webhook-1'`)
    if (!imp.rows.length) {
      await client.execute({ sql: `INSERT INTO imports (id, file_name, total_rows, imported_rows, skipped_rows, created_at) VALUES ('imp-webhook-1', 'Webhook · Google Ads', 1, 1, 0, ?)`, args: [now - 2 * DAY] })
      await client.execute({ sql: `INSERT INTO import_rows (id, import_id, data, status) VALUES ('improw-webhook-1', 'imp-webhook-1', ?, 'pending')`, args: [JSON.stringify({ 'Lead Name': 'Hafiz Rahman', 'Lead Phone Number': '91238802', 'Lead Email': 'hafiz.r@example.com', 'Lead Source': 'Google Ads', 'Property Type': 'BTO 4-Room', 'Property Address': 'Tengah Garden Vines', 'Estimated Budget (S$)': '52,000', 'Remarks': 'From the Google lead form — wants a quote before the keys.' })] })
      console.log('  webhook arrival waiting in Review seeded')
    }
  }

  /* ── R46 · a line picked from My Items knows its vendor (REG-623, quote editor parity Q-08) ─────────────────────────────
     The editor copies the item's vendor onto a line picked from My Items since REG-623; the demo lines picked before it carry
     the item's vendor too, so the Vendor/Sub column reads the same whichever came first. Only an empty vendor is filled. */
  console.log('\nR46 line vendors from My Items')
  {
    const r = await client.execute(`UPDATE quote_items SET vendor = (SELECT p.vendor FROM price_book_items p WHERE p.id = quote_items.price_book_item_id)
      WHERE vendor IS NULL AND kind = 'item' AND price_book_item_id IS NOT NULL AND EXISTS (SELECT 1 FROM price_book_items p WHERE p.id = quote_items.price_book_item_id AND p.vendor IS NOT NULL)`)
    console.log(`  ${r.rowsAffected} lines given their item's vendor`)
  }

  /* ── R47 · the approval on the record (REG-624, quote editor parity Q-22) ─────────────────────────────────────────────
     A demo quote that went through approval shows who sent it and who approved it; one the client has shows when it went to them.
     Sent for approval by its creator on its Sent stamp, approved by the studio's Owner on its Approved stamp, sent to the client two
     hours after the approval. Only empty stamps are filled. */
  console.log('\nR47 quote approval records')
  {
    const a = await client.execute(`UPDATE quotes SET submitted_at = sent_at, submitted_by = coalesce(created_by, prepared_by)
      WHERE submitted_at IS NULL AND sent_at IS NOT NULL AND ((approved_at IS NOT NULL AND approved_at >= sent_at) OR status = 'Sent for Approval')`)
    const b = await client.execute(`UPDATE quotes SET approved_by = (SELECT id FROM members WHERE role = 'Owner' ORDER BY is_you DESC LIMIT 1) WHERE approved_at IS NOT NULL AND approved_by IS NULL`)
    const c = await client.execute(`UPDATE quotes SET client_sent_at = CASE WHEN approved_at IS NOT NULL THEN approved_at + 7200 ELSE sent_at END
      WHERE client_sent_at IS NULL AND status IN ('Sent to Client', 'Confirmed', 'Signed') AND coalesce(approved_at, sent_at) IS NOT NULL`)
    console.log(`  ${a.rowsAffected} sent for approval · ${b.rowsAffected} approvers named · ${c.rowsAffected} sent to the client`)
  }

  /* ── R48 · a quote the client has reads Shared (REG-625, quote editor parity §8.2 · E-124) ─────────────────────────────
     Every quote printed "Private" — nothing ever set Shared. Since REG-625 a send to the client sets it and Revise puts it back; the
     demo's quotes the client has follow. */
  console.log('\nR48 shared quotes')
  {
    const r = await client.execute(`UPDATE quotes SET visibility = 'Shared' WHERE visibility <> 'Shared' AND status IN ('Sent to Client', 'Confirmed', 'Signed')`)
    console.log(`  ${r.rowsAffected} quotes the client has now read Shared`)
  }

  /* ── R49 · a signed quote was signed through its contract (REG-626, quote editor parity Q-31) ─────────────────────────────
     Since REG-626 a contract raised from a quote signs the quote with it. The demo's Won leads each hold one signed quote and one signed
     contract that never named each other: the contract now names its quote, and the quote carries the contract's signing date. */
  console.log('\nR49 signed quotes ↔ their contracts')
  {
    const a = await client.execute(`UPDATE contracts SET from_quote_id = (SELECT q.id FROM quotes q WHERE q.lead_id = contracts.lead_id AND q.status = 'Signed' AND q.deleted_at IS NULL)
      WHERE from_quote_id IS NULL AND status = 'Signed' AND deleted_at IS NULL
        AND (SELECT count(*) FROM quotes q WHERE q.lead_id = contracts.lead_id AND q.status = 'Signed' AND q.deleted_at IS NULL) = 1
        AND (SELECT count(*) FROM contracts c2 WHERE c2.lead_id = contracts.lead_id AND c2.status = 'Signed' AND c2.deleted_at IS NULL) = 1`)
    const b = await client.execute(`UPDATE quotes SET signed_at = coalesce((SELECT c.signed_at FROM contracts c WHERE c.from_quote_id = quotes.id AND c.status = 'Signed' AND c.deleted_at IS NULL), updated_at)
      WHERE status = 'Signed' AND signed_at IS NULL`)
    console.log(`  ${a.rowsAffected} contracts name their quote · ${b.rowsAffected} quotes dated`)
  }

  /* ── R50 · a signed contract keeps the copy it was signed as (REG-631, contracts parity Q-04 · Q-05 · D-49) ─────────────────
     Since REG-631 every path that signs a contract keeps its text with each chip's value in place, the letterhead, the studio signature
     it printed and a fingerprint; a contract that is not Signed holds no signing stamp. The demo's signed contracts were signed before
     that: each keeps its records as they read on its signing day. A phone cut to its first eight digits (+65 9123 4567 → 65912345)
     is put back from its lead. */
  console.log('\nR50 signed contracts keep their copy')
  {
    const cleared = await client.execute(`UPDATE contracts SET signed_at = NULL, signed_by = NULL, signed_nric = NULL, signed_copy = NULL, signed_body = NULL, signed_letterhead = NULL, signed_studio_signature = NULL, document_hash = NULL
      WHERE status <> 'Signed' AND (signed_at IS NOT NULL OR signed_by IS NOT NULL OR signed_nric IS NOT NULL OR document_hash IS NOT NULL OR (source = 'composed' AND signed_copy IS NOT NULL))`)
    const phones = await client.execute(`UPDATE contracts SET recipient_phone = (SELECT l.phone FROM leads l WHERE l.id = contracts.lead_id)
      WHERE recipient_phone = '65' || substr((SELECT l.phone FROM leads l WHERE l.id = contracts.lead_id), 1, 6)`)
    const bundlePhones = await client.execute(`UPDATE contract_bundles SET recipient_phone = (SELECT l.phone FROM leads l WHERE l.id = contract_bundles.lead_id)
      WHERE recipient_phone = '65' || substr((SELECT l.phone FROM leads l WHERE l.id = contract_bundles.lead_id), 1, 6)`)
    type Row = Record<string, string | number | null>
    const pending = rows<Row>(await client.execute(`SELECT * FROM contracts WHERE status = 'Signed' AND document_hash IS NULL`))
    let kept = 0
    if (pending.length) {
      const [brandRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'brand'`))
      const studio = brandRow ? parseBrandSetting(JSON.parse(brandRow.value)).details : DEFAULT_BRAND_SETTING.details
      const team = rows<{ id: string; name: string; signatureKind: string | null; signatureName: string | null; signatureData: string | null }>(await client.execute(`SELECT id, name, signature_kind AS signatureKind, signature_name AS signatureName, signature_data AS signatureData FROM members`))
      const at = (v: string | number | null | undefined) => (v === null || v === undefined ? null : new Date(Number(v) * 1000))
      for (const r of pending) {
        const c = { id: r.id, leadId: r.lead_id, title: r.title, status: r.status, createdAt: at(r.created_at)!, body: r.body, recipientName: r.recipient_name, recipientPhone: r.recipient_phone, contractDate: at(r.contract_date), templateId: r.template_id, fromQuoteId: r.from_quote_id, source: r.source, fileName: r.file_name, issuingEntity: r.issuing_entity, createdBy: r.created_by } as unknown as Contract
        const [lead] = rows<ContractLead>(await client.execute({ sql: `SELECT id, name, phone, email, property_type AS propertyType, property_address AS propertyAddress, lead_address AS leadAddress FROM leads WHERE id = ?`, args: [String(r.lead_id)] }))
        const qs = rows<{ id: string; number: string; title: string; amountMinor: number; validUntil: number | null; projectRef: string | null; status: string }>(await client.execute({ sql: `SELECT id, number, title, amount_minor AS amountMinor, valid_until AS validUntil, project_ref AS projectRef, status FROM quotes WHERE lead_id = ? AND archived_at IS NULL AND deleted_at IS NULL ORDER BY created_at`, args: [String(r.lead_id)] }))
          .map((q): ContractQuote => ({ ...q, validUntil: q.validUntil === null ? null : new Date(q.validUntil * 1000) }))
        const snap = snapshotColumns(c, { lead: lead ?? null, studio, quotes: qs, team, sessionId: 'dane', at: at(r.signed_at) ?? at(r.updated_at) ?? new Date() })
        await client.execute({ sql: `UPDATE contracts SET signed_body = ?, signed_letterhead = ?, signed_studio_signature = ?, document_hash = ? WHERE id = ?`, args: [snap.signedBody, snap.signedLetterhead, snap.signedStudioSignature, snap.documentHash, String(r.id)] })
        kept++
      }
    }
    console.log(`  ${kept} signed contracts keep their copy · ${cleared.rowsAffected} unsigned contracts cleared of signing stamps · ${phones.rowsAffected + bundlePhones.rowsAffected} phones put back`)
  }

  /* ── R51 · a contract names its quote and its issuer; the Won log names the signed contract (REG-632, contracts parity Q-08 · Q-10 · Q-14) ─
     Since REG-632 a contract names the quote it reads from the start — the lead's Signed quote, else its latest — and is issued by that
     quote's entity; nothing reads another quote in its place. A contract made before names none: it takes the one it was reading. The
     demo's Won logs name the placeholder file the Won step offers while their lead's signed contract has its own signed copy — the log now
     names that copy, the way the Won step lists it (REG-343). */
  console.log('\nR51 contracts ↔ their quotes · Won logs ↔ their contracts')
  {
    const pick = `(SELECT q.id FROM quotes q WHERE q.lead_id = contracts.lead_id AND q.deleted_at IS NULL AND q.archived_at IS NULL ORDER BY (q.status = 'Signed') DESC, (CASE WHEN q.status = 'Signed' THEN q.created_at ELSE -q.created_at END) ASC LIMIT 1)`
    const a = await client.execute(`UPDATE contracts SET from_quote_id = ${pick} WHERE from_quote_id IS NULL AND status <> 'Signed' AND deleted_at IS NULL AND ${pick} IS NOT NULL`)
    const b = await client.execute(`UPDATE contracts SET issuing_entity = (SELECT q.issuing_entity FROM quotes q WHERE q.id = contracts.from_quote_id)
      WHERE issuing_entity IS NULL AND status <> 'Signed' AND (SELECT q.issuing_entity FROM quotes q WHERE q.id = contracts.from_quote_id) IS NOT NULL`)
    const c = await client.execute(`UPDATE stage_logs SET payload = json_set(payload, '$.wonContract', (SELECT coalesce(c.signed_copy, c.title || '.pdf') FROM contracts c WHERE c.lead_id = stage_logs.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL AND c.archived_at IS NULL ORDER BY c.signed_at DESC LIMIT 1))
      WHERE to_stage = 'Won' AND json_extract(payload, '$.wonContractTab') = 'system'
        AND EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = stage_logs.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL AND c.archived_at IS NULL)
        AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = stage_logs.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL AND coalesce(c.signed_copy, c.title || '.pdf') = json_extract(stage_logs.payload, '$.wonContract'))`)
    console.log(`  ${a.rowsAffected} contracts name their quote · ${b.rowsAffected} take its issuer · ${c.rowsAffected} Won logs name their signed contract`)
  }

  /* ── R52 · an online signature carries its record (REG-633, contracts parity Q-18 · Q-19) ────────────────────────────────
     Since REG-633 a signature made online keeps how it was made and how the phone was confirmed. One made before keeps what is known:
     a typed name, confirmed by the one-time code. (The demo's signed contracts were marked signed by the studio; none changes.) */
  console.log('\nR52 online signatures carry their record')
  {
    const a = await client.execute(`UPDATE contracts SET signature_kind = coalesce(signature_kind, 'type'), verification_method = coalesce(verification_method, 'phone_code')
      WHERE status = 'Signed' AND signed_by IS NOT NULL AND (signature_kind IS NULL OR verification_method IS NULL)`)
    const b = await client.execute(`UPDATE contracts SET bundle_position = (SELECT count(*) FROM contracts c2 WHERE c2.bundle_id = contracts.bundle_id AND (c2.created_at < contracts.created_at OR (c2.created_at = contracts.created_at AND c2.id < contracts.id)))
      WHERE bundle_id IS NOT NULL AND bundle_position IS NULL`)
    console.log(`  ${a.rowsAffected} online signatures given their record's basics · ${b.rowsAffected} bundled documents placed in their bundle's order`)
  }

  /* ── R53 · a contract names who acted on it; a template who saved it last (REG-634, contracts parity E-128 · E-126) ─────────────
     Since REG-634 a send, a studio-marked signature and a delete each keep who did it, and Activity names them. The demo's contracts were
     made, sent and marked by the member who made them; a contract only marked signed (its sent date is its signing date, nobody signed
     online) was never sent, so it names no sender. A template made before names its maker as its last editor. */
  console.log('\nR53 who acted on each contract')
  {
    const a = await client.execute(`UPDATE contracts SET marked_by = created_by WHERE status = 'Signed' AND signed_by IS NULL AND marked_by IS NULL AND created_by IS NOT NULL`)
    const b = await client.execute(`UPDATE contracts SET sent_by = created_by WHERE sent_at IS NOT NULL AND sent_by IS NULL AND created_by IS NOT NULL
      AND NOT (signed_at IS NOT NULL AND signed_by IS NULL AND sent_at = signed_at)`)
    const c = await client.execute(`UPDATE contracts SET deleted_by = created_by WHERE deleted_at IS NOT NULL AND deleted_by IS NULL AND created_by IS NOT NULL`)
    const d = await client.execute(`UPDATE contract_templates SET updated_by = created_by WHERE updated_by IS NULL AND created_by IS NOT NULL`)
    console.log(`  ${a.rowsAffected} marked · ${b.rowsAffected} sent · ${c.rowsAffected} deleted · ${d.rowsAffected} templates name their last editor`)
  }

  /* ── R54 · every reading by the engine of today (REG-638, X-Ray parity round 1) ──────────────────────────────────────
     Engine 2 reads your side as the quote counts it, matches plurals, trade words and one line against several, and never
     tells the client that work is missing when the other quote lists it (E-98). A reading from engine 1 is read again —
     the same two quotes (the studio quote's lines, the other file's reference), the same date and maker — so no demo record
     keeps a claim the engine no longer makes. A file compared with itself is a test, not a reading (E-112): removed. */
  console.log('\nR54 quote comparisons read by engine 2')
  {
    const studio = await studioName()
    const old = (await client.execute(`SELECT c.id, c.lead_id, c.quote_id, c.your_label, c.other_file, q.amount_minor, q.deleted_at AS q_deleted, l.name AS lead_name FROM quote_comparisons c
      LEFT JOIN quotes q ON q.id = c.quote_id LEFT JOIN leads l ON l.id = c.lead_id WHERE c.engine IS NULL OR c.engine < ${ENGINE}`)).rows
    let reread = 0, removed = 0, kept = 0
    for (const c of old) {
      const other = readOtherQuote(String(c.other_file))
      if (!other) { kept += 1; continue }
      let yours: YourLine[] | null = null
      if (c.quote_id && c.amount_minor !== null) yours = await quoteLines(String(c.quote_id))
      else if (!c.quote_id) {
        const mine = readOtherQuote(String(c.your_label))
        if (mine && mine.key === other.key) { await client.execute({ sql: `DELETE FROM quote_comparisons WHERE id = ?`, args: [String(c.id)] }); removed += 1; continue }
        if (mine) yours = refAsYours(mine)
      }
      if (!yours) { kept += 1; continue }
      const result = compareQuotes(yours, other, { yourLabel: String(c.your_label), yourStudio: studio, clientName: c.lead_name ? String(c.lead_name) : null, quoteTotalMinor: c.quote_id && c.amount_minor !== null ? Number(c.amount_minor) : null })
      await client.execute({ sql: `UPDATE quote_comparisons SET result_json = ?, inputs_json = ?, engine = ? WHERE id = ?`, args: [JSON.stringify(result), JSON.stringify({ yours, theirs: other.lines }), ENGINE, String(c.id)] })
      reread += 1
    }
    console.log(`  ${reread} read again · ${removed} self-comparisons removed · ${kept} left as they were`)
  }

  /* ── R55 · the studio's records hold (REG-647, Accounts Setup parity round 3) ─────────────────────────────────────────────
     The issuing entities carry their own ids (a rename is carried to what names them); the website's intake address keeps its slug
     once given; a lead's questions copied from a Required bank question are marked required; the base state's "Test" quote template —
     from a test run, used by no quote, in every picker (E-109) — waits in Deleted Templates, restorable. */
  console.log('\nR55 entities by id · the intake slug · required questions · the test template')
  {
    const brand = (await client.execute(`SELECT value FROM settings WHERE key = 'brand'`)).rows[0]
    let ids = 0
    if (brand) {
      const v = JSON.parse(String(brand.value)) as { details?: { entities?: { id?: string; name?: string }[] } }
      const ents = v.details?.entities ?? []
      ents.forEach((e, i) => { if (!e.id) { e.id = i === 0 ? 'studio' : `entity-${randomUUID()}`; ids += 1 } })
      if (ids) await client.execute({ sql: `UPDATE settings SET value = ? WHERE key = 'brand'`, args: [JSON.stringify(v)] })
    }
    const cap = (await client.execute(`SELECT value FROM settings WHERE key = 'lead_capture'`)).rows[0]
    let slug = ''
    if (cap) {
      const v = JSON.parse(String(cap.value)) as { emailSlug?: string }
      if (!v.emailSlug) {
        v.emailSlug = (await studioName()).toLowerCase().replace(/pte\.? ltd\.?/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
        slug = v.emailSlug
        await client.execute({ sql: `UPDATE settings SET value = ? WHERE key = 'lead_capture'`, args: [JSON.stringify(v)] })
      }
    }
    const req = await client.execute(`UPDATE questions SET required = 1 WHERE required = 0 AND text IN (SELECT question FROM studio_scope_questions WHERE is_required = 1)`)
    const test = await client.execute({ sql: `UPDATE quote_templates SET deleted_at = ?, deleted_by = 'dane' WHERE name = 'Test' AND deleted_at IS NULL AND is_default = 0
      AND id NOT IN (SELECT template_id FROM quotes WHERE template_id IS NOT NULL AND deleted_at IS NULL)`, args: [NOW] })
    console.log(`  ${ids} entity ids · ${slug ? `slug ${slug}` : 'slug kept'} · ${req.rowsAffected} questions marked required · ${test.rowsAffected} test template to Deleted Templates`)
  }

  /* ── R56 · the demo's book tells the truth (REG-651, price book parity Q-17 · E-63…E-65) ─────────────────────────────────
     The two tile items were written at S$1,100 a square foot (× 100, R38's slip); a pick on 2026-09-23 stamped Cement screeding
     "edited"; and a test run left OM-10001 two blank lines, a Cement screeding pick at 1 Lot and three empty sections. */
  console.log('\nR56 the demo book: tiles per sqft · a pick is not an edit · OM-10001 without a test run\'s lines')
  {
    const t1 = await client.execute(`UPDATE price_book_items SET cost_minor = 850, markup_minor = 250 WHERE id = 'pb-tiles-hafary' AND cost_minor = 85000`)
    const t2 = await client.execute(`UPDATE price_book_items SET cost_minor = 820, markup_minor = 280 WHERE id = 'pb-tiles-sbh' AND cost_minor = 82000`)
    const stamp = await client.execute(`UPDATE price_book_items SET updated_at = (SELECT updated_at FROM price_book_items WHERE id = 'd962133c-b692-415d-ad0a-ee93b40e2127')
      WHERE id = '10994815-affe-49f1-a363-984f8de7a5f3' AND updated_at = 1790160282`)
    const leftovers = ['10fe8faf-9fac-45f7-9b80-d20c55c001ae', '381555d0-6a9a-43e4-933e-2e7d891ba955', 'd1ed6477-5fe7-4621-bf52-f6a20125ef0e', '083ca74f-b6ed-41c4-bdd1-3c06ce1a3e13',
      '88d56186-8ef5-4972-93c8-c4ae53c226df', 'cfb62bac-a598-4259-a443-73f22c867c0a', 'f7d7f24d-0268-4db9-a212-a30a5b652deb', '11efa0aa-fcbd-42a6-ab71-d8b154e1ca19']
    const om1 = rows<{ id: string; additional_discount_mode: string; additional_discount_value: number; gst_enabled: number }>(await client.execute(`SELECT id, additional_discount_mode, additional_discount_value, gst_enabled FROM quotes WHERE number = 'OM-10001'`))[0]
    let gone = 0
    if (om1) {
      const del = await client.execute({ sql: `DELETE FROM quote_items WHERE quote_id = ? AND created_at BETWEEN 1790150000 AND 1790190000 AND id IN (${leftovers.map(() => '?').join(',')})`, args: [om1.id, ...leftovers] })
      gone = del.rowsAffected
      if (gone) {
        const items = rows<{ id: string; parent_id: string | null; kind: string; status: string; qty: number; cost_minor: number; markup_minor: number; discount_pct: number; gst_pct: number }>(await client.execute({ sql: 'SELECT id, parent_id, kind, status, qty, cost_minor, markup_minor, discount_pct, gst_pct FROM quote_items WHERE quote_id = ?', args: [om1.id] }))
        const t = quoteTotals(items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: i.status, qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: i.discount_pct, gstPct: i.gst_pct })),
          { additionalDiscountMode: om1.additional_discount_mode, additionalDiscountValue: om1.additional_discount_value, gstEnabled: om1.gst_enabled === 1 })
        await client.execute({ sql: 'UPDATE quotes SET amount_minor = ? WHERE id = ?', args: [t.totalMinor, om1.id] })
      }
    }
    console.log(`  ${t1.rowsAffected + t2.rowsAffected} tile items re-priced · ${stamp.rowsAffected} pick stamp undone · ${gone} test lines off OM-10001`)
  }

  /* ── R57 · who made each item, and its history from the start (REG-652, price book parity Q-03…Q-05) ─────────────────────
     Every item and section written before the gate names the Owner who kept the book; every item's History starts with its
     creation. One of Sarah's proposals waits for approval, with the bell's notice to the Owners and Admins — the queue the
     demo shows. Idempotent. */
  console.log('\nR57 the book\'s record: made by · a History for every item · one proposal waiting')
  {
    const owner = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role = 'Owner' AND is_active = 1 ORDER BY is_you DESC, id LIMIT 1`))[0]?.id ?? 'dane'
    const a = await client.execute({ sql: `UPDATE price_book_items SET created_by = ? WHERE created_by IS NULL`, args: [owner] })
    await client.execute(`UPDATE price_book_items SET updated_by = created_by WHERE updated_by IS NULL`)
    const b = await client.execute({ sql: `UPDATE price_book_sections SET created_by = ? WHERE created_by IS NULL`, args: [owner] })
    await client.execute(`UPDATE price_book_sections SET updated_by = created_by WHERE updated_by IS NULL`)
    const nowS = Math.floor(Date.now() / 1000), at = nowS - 26 * 3600
    const p = await client.execute({ sql: `INSERT OR IGNORE INTO price_book_items (id, name, description, kind, unit, cost_minor, markup_minor, category, thumb, vendor, created_at, updated_at, status, created_by, updated_by)
      VALUES ('pb-proposal-skirting', 'Skirting, PVC 80 mm', 'White, clipped to the wall', 'purchase', 'ft run', 320, 130, 'Flooring', NULL, NULL, ?, ?, 'proposed', 'sarah', 'sarah')`, args: [at, at] })
    if (p.rowsAffected) {
      const runners = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner', 'Admin') AND is_active = 1`))
      for (const r of runners) await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'price_book_proposed', 'Sarah proposed “Skirting, PVC 80 mm” for My Items', 'Approve it, or send it back with a note', '/company/price-book?open=pb-proposal-skirting', NULL, NULL, 'in_app,email', 'sarah', ?, NULL)`, args: [`n-pb-proposal-skirting-${r.id}`, r.id, at] })
    }
    /* (UX audit V11) the bell's notice opens the proposed item itself (REG-709's ?open=), not the grid — the rows already written too */
    await client.execute(`UPDATE notifications SET href = '/company/price-book?open=pb-proposal-skirting' WHERE id LIKE 'n-pb-proposal-skirting-%' AND href = '/company/price-book'`)
    const h = await client.execute(`INSERT INTO price_book_changes (id, item_id, kind, changes, note, by, at)
      SELECT 'pbc-created-' || i.id, i.id, 'created', NULL, NULL, i.created_by, i.created_at FROM price_book_items i WHERE NOT EXISTS (SELECT 1 FROM price_book_changes c WHERE c.item_id = i.id)`)
    console.log(`  ${a.rowsAffected} items and ${b.rowsAffected} sections named to ${owner} · ${h.rowsAffected} histories started · ${p.rowsAffected} proposal added`)
  }

  /* ── R58 · the comparisons' words as the engine writes them (sweep S3) ───────────────────────────────────────────────
     The engine's sentences took curly apostrophes ("doesn’t", "it’s", "I’ve"); a reading already made keeps its figures and gets
     the same words. What went to a client (`sent_text`) is a record of what was sent and is never rewritten. Idempotent. */
  console.log('\nR58 quote comparisons in the house apostrophe')
  {
    const studios = rows<{ other_studio: string }>(await client.execute(`SELECT DISTINCT other_studio FROM quote_comparisons`)).map((x) => x.other_studio)
    let r = await client.execute(`UPDATE quote_comparisons SET result_json = replace(replace(replace(replace(result_json, 'doesn''t', 'doesn’t'), 'it''s', 'it’s'), 'can''t', 'can’t'), 'I''ve', 'I’ve')
      WHERE result_json LIKE '%doesn''t%' OR result_json LIKE '%it''s%' OR result_json LIKE '%can''t%' OR result_json LIKE '%I''ve%'`)
    let n = r.rowsAffected
    for (const st of studios) { r = await client.execute({ sql: `UPDATE quote_comparisons SET result_json = replace(result_json, ? || '''s', ? || '’s') WHERE instr(result_json, ? || '''s') > 0`, args: [st, st, st] }); n += r.rowsAffected }   // "Flo Design’s quote"
    r = { rowsAffected: n } as typeof r
    console.log(`  ${r.rowsAffected} readings reworded`)
  }

  /* ── R59 · demo folders in every library (REG-664, owner 2026-09-25: "create folders of its types and add at least one file under it
     across templates") ──────────────────────────────────────────────────────────────────────────────────────────────────────────
     Each library gets folders named by the kinds it holds — quotes by property type, contracts by document, the task checklists by
     stage, the texts by the jobs they cover, the splits by job size, the book by trade and room — and each holds at least one entry.
     A folder is written once (a fixed id); its entries are filed only in the run that writes it, and only while they still sit at
     the top — a studio's own filing is never undone. The studio default quote template and payment split stay at the top. Idempotent. */
  console.log('\nR59 demo folders in every library')
  {
    const owner = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role = 'Owner' AND is_active = 1 ORDER BY is_you DESC, id LIMIT 1`))[0]?.id ?? 'dane'
    const at = Math.floor(Date.now() / 1000) - 2 * 86400
    const plan: [id: string, library: string, name: string, table: string, column: string, entries: string[]][] = [
      ['lf-quotes-hdb', 'quotes', 'HDB', 'quote_templates', 'name', ['4-Room BTO', '5-Room BTO']],
      ['lf-quotes-showflats', 'quotes', 'Show flats', 'quote_templates', 'name', ['Showflat Presentation']],
      ['lf-contracts-agreements', 'contracts', 'Agreements', 'contract_templates', 'title', ['Interior Design Service Agreement']],
      ['lf-contracts-variations', 'contracts', 'Variations', 'contract_templates', 'title', ['Variation Order']],
      ['lf-tasks-followup', 'tasks', 'Lead follow-up', 'task_templates', 'name', ['Leads Template']],
      ['lf-tasks-meetings', 'tasks', 'Meetings', 'task_templates', 'name', ['Template 1']],
      ['lf-texts-hdb', 'texts', 'HDB', 'quote_text_templates', 'title', ['Terms and Conditions for HDB Works', 'Terms and Conditions for BTO Works']],
      ['lf-texts-site', 'texts', 'Site rules', 'quote_text_templates', 'title', ['Working Hours and Site Access', 'Material Lead Times']],
      ['lf-payments-full', 'payments', 'Full renovation', 'payment_templates', 'name', ['20/40/40']],
      ['lf-payments-small', 'payments', 'Small jobs', 'payment_templates', 'name', ['30/70', '50/50']],
      ['lf-items-wet', 'book-items', 'Wet works', 'price_book_items', 'name', ['Hacking of existing floor and wall tiles', 'Cement screeding and waterproofing', 'Homogeneous tiles 600×600, supply and lay']],
      ['lf-items-kitchen', 'book-items', 'Kitchen', 'price_book_items', 'name', ['Kitchen carpentry, top and bottom cabinets', 'Plumbing works, kitchen and bathrooms']],
      ['lf-sections-bathrooms', 'book-sections', 'Bathrooms', 'price_book_sections', 'name', ['Bathrooms — full works']],
    ]
    let made = 0, filed = 0
    for (const [id, library, name, table, column, entries] of plan) {
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO library_folders (id, library, name, parent_id, created_by, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?)`, args: [id, library, name, owner, at, at] })
      if (!r.rowsAffected) continue
      made++
      for (const e of entries) filed += (await client.execute({ sql: `UPDATE ${table} SET folder_id = ? WHERE ${column} = ? AND folder_id IS NULL AND deleted_at IS NULL`, args: [id, e] })).rowsAffected
    }
    console.log(`  ${made} folders made · ${filed} entries filed`)
  }

  /* ── R60 · an Admin on the team (REG-668, user-directed 2026-09-25 for the UAT) ─────────────────────────────────────────
     The demo had every role but Admin, so Demo Studio › View as (REG-667) could not show what an Admin may do. Hui Min runs the
     studio's office: an Admin with a work email on the studio's domain, reporting to nobody, not open to new leads (so the Assign
     popover's suggestion — REG-612 — reads as before). Written once by its fixed id; a studio's own edits to her stand. */
  console.log('\nR60 an Admin member')
  {
    const domain = (DEFAULT_BRAND_SETTING.details.email.split('@')[1] ?? 'demostudio.sg').toLowerCase()
    const r = await client.execute({ sql: `INSERT OR IGNORE INTO members (id, name, role, color, is_you, manager_id, email, accepting_leads, is_active) VALUES ('huimin', 'Hui Min', 'Admin', '#8E5BD7', 0, NULL, ?, 0, 1)`, args: [`huimin@${domain}`] })
    console.log(r.rowsAffected ? '  Hui Min added as Admin' : '  already there')
  }

  /* ── R61 · the AI Visualizer's demo (REG-673…677, owner 2026-09-25: build 1.0's AI Visualizer in 2.0) ──────────────────────────────
     Kevin Ng (Met, a landed semi-D) gets the studio's design: his three site photos filed in Files › Site photos become its rooms; the
     living room carries a Japandi restyle, the edit the demo's pictures were painted from (DEMO_EDIT: sage walls, walnut floor, the sofa in
     emerald velvet) and its golden-hour relight; the bedroom a golden-hour relight, the kitchen a Scandinavian restyle — each version with
     what it applied and what the room now shows, by the members on the lead. A studio pin on the edit. Two days before the run the edit,
     its relight and the bedroom went to Kevin on WhatsApp — the link open for seven days, filed in his Files › Renders as sharing does;
     a day later he opened it three times, picked the edit as his favourite, left a note and pinned a question the studio answered, and
     the lead's members were notified. A personal "Showroom — kitchen concept" (the kitchen sketch rendered Japandi) sits in the AI
     Visualizer's "Showroom ideas" folder; four studio materials (two with swatch photos, two quoted from the Price book) in Company ›
     Materials, one filed in "Floors". Written once, by fixed ids; a studio's own later work on them stands. */
  console.log('\nR61 the AI Visualizer demo')
  {
    const kevin = byName.get('Kevin Ng')
    const met = kevin ? rows<{ created_at: number }>(await client.execute({ sql: `SELECT created_at FROM stage_logs WHERE lead_id = ? AND to_stage = 'Met' ORDER BY created_at DESC LIMIT 1`, args: [kevin.id] }))[0]?.created_at : undefined
    const leadMembers = kevin ? rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ?`, args: [kevin.id] })).map((r) => r.member_id) : []
    if (!kevin || kevin.deleted_at !== null || met === undefined) console.log('  Kevin Ng or his Met log missing — skipped')
    else {
      const leadId = kevin.id, M = Number(met)
      const designId = sid(leadId, 'viz-design')
      const t0 = M + 26 * H   // the day after the meeting
      const made = await client.execute({ sql: `INSERT OR IGNORE INTO visualizer_designs (id, kind, lead_id, name, folder_id, custom_json, created_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?, 'lead', ?, ?, NULL, NULL, 'dane', ?, ?, NULL, NULL)`, args: [designId, leadId, kevin.name, t0, t0 + 70 * 60] })
      if (!made.rowsAffected) console.log('  Kevin Ng’s design already there')
      else {
        /* his site photos, filed where a studio keeps them */
        const photosFolder = sid(leadId, 'files-site-photos')
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?, ?, 'folder', 'Site photos', NULL, ?, NULL, 'dane', NULL, NULL, ?)`, args: [photosFolder, leadId, M + 20 * H, M + 20 * H] })
        const plan = [
          { key: 'living-room', name: 'Living room', by: 'dane' },
          { key: 'bedroom', name: 'Master bedroom', by: 'michelle' },
          { key: 'kitchen', name: 'Kitchen', by: 'michelle' },
        ]
        const roomId: Record<string, string> = {}
        for (const [i, r] of plan.entries()) {
          const sample = sampleByKey(r.key)!
          const fileId = sid(leadId, `files-site-${r.key}`)
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?, ?, 'image', ?, ?, ?, ?, 'dane', ?, 'image/jpeg', ?)`, args: [fileId, leadId, `${r.name}.jpg`, sample.original, M + 20 * H + (i + 1) * 60, photosFolder, 180_000 + i * 12_000, M + 20 * H + (i + 1) * 60] })
          roomId[r.key] = sid(leadId, `viz-room-${r.key}`)
          await client.execute({ sql: `INSERT OR IGNORE INTO project_rooms (id, design_id, lead_id, project_id, name, original_image_url, sample_key, source_file_id, detection_json, state_json, position, created_by, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
            args: [roomId[r.key]!, designId, leadId, r.name, sample.original, sample.key, fileId, JSON.stringify(sampleDetection(sample)), i, r.by, t0 + i * 120, t0 + i * 120] })
        }
        /* the versions: each what it applied, what the room shows after it, and where it came from */
        const blank = (kind: Applied['kind']): Applied => ({ kind, surfaces: [], furniture: [], style: null, lighting: null, note: null, palette: null, scope: null })
        const restyled = (style: string): Finishes => ({ ...NO_FINISHES, surfaces: {}, removed: [], customized: {}, reshaped: true, style })
        const lr = sampleByKey('living-room')!
        const sIdx = (label: string) => `living-room-s${lr.surfaces.findIndex((x) => x.label === label)}`
        const fIdx = (label: string) => `living-room-f${lr.furniture.findIndex((x) => x.label === label)}`
        const edit: Applied = { ...blank('edit'), surfaces: DEMO_EDIT.surfaces.map((x) => { const c = catalogueItem(x.material)!; return { id: sIdx(x.label), label: x.label, materialId: c.id, name: c.name } }), furniture: DEMO_EDIT.furniture.map((x) => ({ id: fIdx(x.label), label: x.label, action: 'customize' as const, desc: composeCustomizeDesc(x.pick) || 'Customized' })) }
        const editFin: Finishes = { ...NO_FINISHES, surfaces: Object.fromEntries(DEMO_EDIT.surfaces.map((x) => { const m = fromCatalogue(catalogueItem(x.material)!); return [sIdx(x.label), { materialId: m.id, name: m.name, hex: m.hex, finish: m.finish }] })), removed: [], customized: Object.fromEntries(edit.furniture.map((f) => [f.id, f.desc])) }
        const golden = presetById(DEMO_EDIT.relit.preset)!.label
        type Job = { id: string; room: string; kind: Applied['kind']; by: string; at: number; image: string; parent: string; applied: Applied; finishes: Finishes; n: number }
        const J = (room: string, tag: string) => sid(leadId, `viz-job-${room}-${tag}`)
        const jobs: Job[] = [
          { id: J('living-room', 'japandi'), room: 'living-room', kind: 'restyle', by: 'dane', at: t0 + 10 * 60, image: lr.looks.Japandi!, parent: ORIGINAL, applied: { ...blank('restyle'), style: 'Japandi' }, finishes: restyled('Japandi'), n: 1 },
          { id: J('living-room', 'edit'), room: 'living-room', kind: 'edit', by: 'dane', at: t0 + 25 * 60, image: DEMO_EDIT.image, parent: ORIGINAL, applied: edit, finishes: editFin, n: 2 },
          { id: J('living-room', 'golden'), room: 'living-room', kind: 'relight', by: 'dane', at: t0 + 40 * 60, image: DEMO_EDIT.relit.image, parent: versionKey(J('living-room', 'edit'), 1), applied: { ...blank('relight'), lighting: golden }, finishes: { ...editFin, lighting: golden }, n: 3 },
          { id: J('bedroom', 'golden'), room: 'bedroom', kind: 'relight', by: 'michelle', at: t0 + 55 * 60, image: sampleByKey('bedroom')!.relit!['golden-hour']!, parent: ORIGINAL, applied: { ...blank('relight'), lighting: golden }, finishes: { ...NO_FINISHES, lighting: golden }, n: 1 },
          { id: J('kitchen', 'scandinavian'), room: 'kitchen', kind: 'restyle', by: 'michelle', at: t0 + 70 * 60, image: sampleByKey('kitchen')!.looks.Scandinavian!, parent: ORIGINAL, applied: { ...blank('restyle'), style: 'Scandinavian' }, finishes: restyled('Scandinavian'), n: 1 },
        ]
        for (const j of jobs) {
          const v: Variant = { id: 1, n: j.n, imageUrl: j.image, materials: j.applied.surfaces.map((x) => ({ label: titleCaseLabel(x.label), material: x.name })), parentKey: j.parent, applied: j.applied, finishes: j.finishes, deletedAt: null }
          await client.execute({ sql: `INSERT OR IGNORE INTO render_jobs (id, room_id, lead_id, project_id, model, status, kind, style, variants_json, created_by, created_at, completed_at) VALUES (?, ?, ?, NULL, 'fast', 'completed', ?, ?, ?, ?, ?, ?)`, args: [j.id, roomId[j.room]!, leadId, j.kind, descriptor(j.applied), JSON.stringify([v]), j.by, j.at, j.at] })
        }
        const byKey = new Map(jobs.map((j) => [versionKey(j.id, 1), j]))
        const lrEdit = versionKey(J('living-room', 'edit'), 1), lrGold = versionKey(J('living-room', 'golden'), 1), brGold = versionKey(J('bedroom', 'golden'), 1)
        /* a note the studio pinned on the edit */
        await client.execute({ sql: `INSERT OR IGNORE INTO render_annotations (id, job_id, variant_id, x, y, body, status, author_role, author_member_id, author_name, comments_json, created_at, updated_at) VALUES (?, ?, 1, 0.8, 0.9, ?, 'open', 'studio', 'dane', 'Dane', '[]', ?, ?)`,
          args: [sid(leadId, 'viz-pin-studio'), J('living-room', 'edit'), 'Walnut sample is at the showroom — I’ll bring it to our next meeting.', t0 + 45 * 60, t0 + 45 * 60] })
        /* the link sent to Kevin, frozen as the versions were; each one filed in his Files › Renders */
        const sent = NOW - 2 * D, shareId = sid(leadId, 'viz-share'), token = sid(leadId, 'viz-share-token').replace(/-/g, '').slice(0, 14)
        const roomName = (k: string) => plan.find((r) => r.key === k)!.name
        const snapshot = { versions: [lrEdit, lrGold, brGold].map((key) => {
          const j = byKey.get(key)!, parent = j.parent === ORIGINAL ? null : byKey.get(j.parent)
          return { key, roomId: roomId[j.room]!, roomName: roomName(j.room), label: `V${j.n} · ${descriptor(j.applied)}`, imageUrl: j.image, beforeUrl: parent?.image ?? sampleByKey(j.room)!.original, materials: changeLines(j.applied).map((c) => ({ label: c.what, material: c.to })) }
        }) }
        await client.execute({ sql: `INSERT OR IGNORE INTO render_share_links (id, token, design_id, lead_id, snapshot, message, expires_at, view_count, last_viewed_at, sent_via, created_by, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, 3, ?, 'whatsapp', 'dane', ?, NULL)`,
          args: [shareId, token, designId, leadId, JSON.stringify(snapshot), 'Hi Kevin, three ideas from our meeting — the walnut floor is my favourite. Tap the one you like best, or pin a note on anything you’d change.', sent + 7 * D, NOW - D + 2 * H, sent] })
        const renders = sid(leadId, 'files-renders')
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?, ?, 'folder', 'Renders', NULL, ?, NULL, 'dane', NULL, NULL, ?)`, args: [renders, leadId, sent, sent] })
        for (const [i, key] of [lrEdit, lrGold, brGold].entries()) {
          const j = byKey.get(key)!
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?, ?, 'image', ?, ?, ?, ?, 'dane', 140000, 'image/jpeg', ?)`, args: [sid(leadId, `files-render-${key}`), leadId, `Render - ${roomName(j.room)} - V${j.n}.jpg`, j.image, sent + i, renders, sent + i] })
        }
        /* what Kevin said, and who heard it */
        const said = NOW - D
        const edLabel = `${roomName('living-room')} · V2 · ${descriptor(edit)}`
        await client.execute({ sql: `INSERT OR IGNORE INTO render_consultation_requests (id, share_link_id, kind, version_key, client_name, client_phone, message, task_id, created_at) VALUES (?, ?, 'favourite', ?, ?, NULL, NULL, NULL, ?)`, args: [sid(leadId, 'viz-fav'), shareId, lrEdit, kevin.name, said] })
        const noteText = 'Love the walnut floor — could the walls be a touch warmer?'
        await client.execute({ sql: `INSERT OR IGNORE INTO render_consultation_requests (id, share_link_id, kind, version_key, client_name, client_phone, message, task_id, created_at) VALUES (?, ?, 'note', ?, ?, NULL, ?, NULL, ?)`, args: [sid(leadId, 'viz-note'), shareId, lrEdit, kevin.name, noteText, said + 5 * 60] })
        const pinText = 'Is the velvet easy to keep clean? We have a dog.'
        const reply = [{ id: sid(leadId, 'viz-pin-reply'), authorRole: 'studio', authorName: 'Dane', authorMemberId: 'dane', body: 'Yes — we’d use a performance velvet that wipes clean. I’ll bring two swatches.', createdAt: (said + 3 * H) * 1000 }]
        await client.execute({ sql: `INSERT OR IGNORE INTO render_annotations (id, job_id, variant_id, x, y, body, status, author_role, author_member_id, author_name, comments_json, created_at, updated_at) VALUES (?, ?, 1, 0.34, 0.8, ?, 'open', 'client', NULL, ?, ?, ?, ?)`,
          args: [sid(leadId, 'viz-pin-client'), J('living-room', 'edit'), pinText, kevin.name, JSON.stringify(reply), said + 8 * 60, said + 3 * H] })
        const href = `/visualizer/${designId}?from=${encodeURIComponent(`/leads/${leadId}`)}`
        const tells: [tag: string, title: string, body: string, at: number][] = [
          ['fav', `${kevin.name} picked a favourite`, edLabel, said],
          ['note', `${kevin.name} left a note on the renders`, `${edLabel}: “${noteText}”`, said + 5 * 60],
          ['pin', `${kevin.name} pinned a note on a render`, `${edLabel}: “${pinText}”`, said + 8 * 60],
        ]
        for (const m of leadMembers) for (const [tag, title, body, at] of tells) {
          await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'render_feedback', ?, ?, ?, ?, NULL, 'in_app,whatsapp', NULL, ?, ?)`,
            args: [`n-viz-${tag}-${m}`, m, title, body, href, leadId, at, m === 'dane' && tag === 'fav' ? at + H : null] })
        }
        await client.execute({ sql: `UPDATE visualizer_designs SET updated_at = ? WHERE id = ?`, args: [Math.max(...jobs.map((j) => j.at)), designId] })
        console.log(`  Kevin Ng’s design: ${plan.length} rooms · ${jobs.length} versions · 1 link with a favourite, a note and a pin · ${leadMembers.length * tells.length} notifications`)
      }
    }
    /* a personal design in a folder of the AI Visualizer */
    const folderAt = NOW - 12 * D
    await client.execute({ sql: `INSERT OR IGNORE INTO library_folders (id, library, name, parent_id, created_by, created_at, updated_at) VALUES ('lf-visualizer-showroom', 'visualizer', 'Showroom ideas', NULL, 'dane', ?, ?)`, args: [folderAt, folderAt] })
    const showroom = sid('showroom-kitchen', 'viz-design')
    const p = await client.execute({ sql: `INSERT OR IGNORE INTO visualizer_designs (id, kind, lead_id, name, folder_id, custom_json, created_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?, 'personal', NULL, 'Showroom — kitchen concept', 'lf-visualizer-showroom', NULL, 'dane', ?, ?, NULL, NULL)`, args: [showroom, folderAt + 10 * 60, folderAt + 30 * 60] })
    if (p.rowsAffected) {
      const kitchen = sampleByKey('kitchen')!
      const room = sid('showroom-kitchen', 'viz-room')
      await client.execute({ sql: `INSERT OR IGNORE INTO project_rooms (id, design_id, lead_id, project_id, name, original_image_url, sample_key, source_file_id, detection_json, state_json, position, created_by, created_at, updated_at) VALUES (?, ?, NULL, NULL, 'Kitchen sketch', ?, 'kitchen', NULL, ?, NULL, 0, 'dane', ?, ?)`, args: [room, showroom, kitchen.sketch!, JSON.stringify(sampleDetection(kitchen, true)), folderAt + 12 * 60, folderAt + 12 * 60] })
      const applied: Applied = { kind: 'sketch', surfaces: [], furniture: [], style: 'Japandi', lighting: null, note: null, palette: null, scope: null }
      const v: Variant = { id: 1, n: 1, imageUrl: kitchen.looks.Japandi!, materials: [], parentKey: ORIGINAL, applied, finishes: { ...NO_FINISHES, fromSketch: true, reshaped: true, style: 'Japandi' }, deletedAt: null }
      await client.execute({ sql: `INSERT OR IGNORE INTO render_jobs (id, room_id, lead_id, project_id, model, status, kind, style, variants_json, created_by, created_at, completed_at) VALUES (?, ?, NULL, NULL, 'high', 'completed', 'sketch', ?, ?, 'dane', ?, ?)`, args: [sid('showroom-kitchen', 'viz-job'), room, descriptor(applied), JSON.stringify([v]), folderAt + 30 * 60, folderAt + 30 * 60] })
      console.log('  Showroom — kitchen concept filed in Showroom ideas')
    }
    /* the studio's own materials (Company › Materials) */
    const book = async (name: string) => rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM price_book_items WHERE name = ? AND deleted_at IS NULL AND status = 'live' LIMIT 1`, args: [name] }))[0]?.id ?? null
    const matAt = NOW - 20 * D
    await client.execute({ sql: `INSERT OR IGNORE INTO library_folders (id, library, name, parent_id, created_by, created_at, updated_at) VALUES ('lf-materials-floors', 'materials', 'Floors', NULL, 'dane', ?, ?)`, args: [matAt, matAt] })
    const mats: [id: string, name: string, category: string, hex: string, finish: string, image: string | null, desc: string | null, bookName: string | null, folder: string | null, by: string, at: number][] = [
      ['sm-sage-whisper', 'Sage Whisper paint', 'Paints', '#9DAF94', 'matte', null, 'Two coats on a skim coat', 'Painting, whole unit', null, 'dane', matAt],
      ['sm-walnut-vinyl', 'Walnut vinyl plank', 'Flooring', DEMO_EDIT.swatches.walnut.hex, 'natural', DEMO_EDIT.swatches.walnut.image, 'Wide plank, matte lacquer', 'Vinyl flooring, supply and install', 'lf-materials-floors', 'dane', matAt + H],
      ['sm-oak-veneer', 'Natural oak veneer', 'Laminates', DEMO_EDIT.swatches.oak.hex, 'natural', DEMO_EDIT.swatches.oak.image, 'For wardrobes and feature panels', null, null, 'sarah', matAt + 2 * H],
      ['sm-calacatta', 'Calacatta quartz', 'Countertops', '#E9E5DE', 'gloss', null, '20 mm slab, polished edge', null, null, 'sarah', matAt + 3 * H],
    ]
    let nm = 0
    for (const [id, name, category, hex, finish, image, desc, bookName, folder, by, at] of mats) {
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO studio_materials (id, name, category, image_url, hex, finish, description, folder_id, price_book_item_id, uploaded_by, is_active, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)`,
        args: [id, name, category, image, hex, finish, desc, folder, bookName ? await book(bookName) : null, by, at, at] })
      nm += r.rowsAffected
    }
    console.log(`  ${nm} studio materials added`)
  }

  /* ── R62 · the AI Visualizer after its audit (audit 2026-09-26) ────────────────────────────────────────────────────────────────────
     What the audit's fixes keep, written for the records made before them: (a) a version's picture beside its job, the job keeping its
     address (F213 — migration 0055 moved them; this catches any written since by an older build); (b) each render filed in a lead's Files
     linked to the version it is (F095 · F194), holding its own copy of the picture (F093), at its real size (F113); (c) a room's reference
     and piece photos in the room's own store, the picks keeping addresses (F200); (d) a client's answer in the bell opening the room, the
     version and the pin it is about (F098). Each step touches only what is still in the old shape, so a second run changes nothing. */
  console.log('\nR62 the AI Visualizer, audited')
  {
    /* (a) */
    const inline = rows<{ id: string; variants_json: string }>(await client.execute(`SELECT id, variants_json FROM render_jobs WHERE variants_json LIKE '%"imageUrl":"data:%'`))
    for (const j of inline) {
      let vs: Record<string, unknown>[]
      try { vs = JSON.parse(j.variants_json) as Record<string, unknown>[] } catch { continue }
      if (!Array.isArray(vs)) continue
      for (const v of vs) {
        if (typeof v.id !== 'number' || !isDataImage(v.imageUrl)) continue
        await client.execute({ sql: `INSERT OR IGNORE INTO render_images (job_id, variant_id, data) VALUES (?, ?, ?)`, args: [j.id, v.id, v.imageUrl] })
        v.imageUrl = renderAddress(j.id, v.id)
      }
      await client.execute({ sql: `UPDATE render_jobs SET variants_json = ? WHERE id = ?`, args: [JSON.stringify(vs), j.id] })
    }
    /* (b) every version of a lead's design, and the files that are one */
    type Ver = { key: string; designId: string; roomId: string; room: string; n: number; image: string; leadId: string }
    const vjobs = rows<{ id: string; room_id: string; variants_json: string; design_id: string; room_name: string; lead_id: string }>(await client.execute(
      `SELECT j.id, j.room_id, j.variants_json, r.design_id, r.name AS room_name, d.lead_id FROM render_jobs j JOIN project_rooms r ON r.id = j.room_id JOIN visualizer_designs d ON d.id = r.design_id WHERE d.kind = 'lead' AND d.lead_id IS NOT NULL`))
    const vers: Ver[] = []
    for (const j of vjobs) {
      let vs: { id?: unknown; n?: unknown; imageUrl?: unknown }[] = []
      try { const x = JSON.parse(j.variants_json) as unknown; if (Array.isArray(x)) vs = x } catch { continue }
      for (const v of vs) if (typeof v.id === 'number' && typeof v.n === 'number' && typeof v.imageUrl === 'string') vers.push({ key: `${j.id}:${v.id}`, designId: j.design_id, roomId: j.room_id, room: j.room_name, n: v.n, image: v.imageUrl, leadId: j.lead_id })
    }
    const unlinked = rows<{ id: string; lead_id: string; name: string; thumb: string }>(await client.execute(
      `SELECT f.id, f.lead_id, f.name, f.thumb FROM lead_files f WHERE f.kind = 'image' AND f.thumb IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_file_renders x WHERE x.file_id = f.id) AND (f.thumb LIKE '/visualizer/img/v/%' OR f.name LIKE 'Render - % - V%.jpg')`))
    let linked = 0
    for (const f of unlinked) {
      const byAddress = /^\/visualizer\/img\/v\/([^/?]+)\/(\d+)/.exec(f.thumb)
      const byName = /^Render - (.+) - V(\d+)\.jpg$/.exec(f.name)
      const hits = byAddress ? vers.filter((x) => x.key === `${byAddress[1]}:${byAddress[2]}` && x.leadId === f.lead_id)
        : byName ? vers.filter((x) => x.leadId === f.lead_id && x.room === byName[1] && x.n === Number(byName[2]) && x.image === f.thumb) : []
      const v = hits.length === 1 ? hits[0]! : null
      if (!v) continue
      linked += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_file_renders (file_id, render_key, design_id, room_id, n) VALUES (?, ?, ?, ?, ?)`, args: [f.id, v.key, v.designId, v.roomId, v.n] })).rowsAffected
    }
    /* a filed render keeps its own picture (F093) */
    let owned = 0
    for (const f of rows<{ id: string; thumb: string }>(await client.execute(`SELECT id, thumb FROM lead_files WHERE thumb LIKE '/visualizer/img/v/%'`))) {
      const m = /^\/visualizer\/img\/v\/([^/?]+)\/(\d+)/.exec(f.thumb); if (!m) continue
      const pic = rows<{ data: string }>(await client.execute({ sql: `SELECT data FROM render_images WHERE job_id = ? AND variant_id = ?`, args: [m[1]!, Number(m[2])] }))[0]?.data
      if (!pic || !isDataImage(pic)) continue
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, args: [f.id, pic] })
      await client.execute({ sql: `UPDATE lead_files SET thumb = ?, size_bytes = ?, mime = ? WHERE id = ?`, args: [`/files/img/${f.id}`, dataUrlBytes(pic), pic.slice(5, pic.indexOf(';')), f.id] })
      owned++
    }
    /* its real size — a sample's pre-made render reads its file (F113) */
    let sized = 0
    for (const f of rows<{ id: string; thumb: string; size_bytes: number | null }>(await client.execute(`SELECT f.id, f.thumb, f.size_bytes FROM lead_files f JOIN lead_file_renders x ON x.file_id = f.id WHERE f.thumb LIKE '/visualizer/%'`))) {
      let size: number | null = null
      try { size = statSync(path.join(process.cwd(), 'public', f.thumb)).size } catch { size = null }
      if (size !== f.size_bytes) { await client.execute({ sql: `UPDATE lead_files SET size_bytes = ? WHERE id = ?`, args: [size, f.id] }); sized++ }
    }
    /* (c) a room's picks carry addresses, the pictures sit in the room's store (F200) */
    let lifted = 0
    for (const r of rows<{ id: string; state_json: string; assets_json: string | null }>(await client.execute(`SELECT id, state_json, assets_json FROM project_rooms WHERE state_json LIKE '%data:image%'`))) {
      let raw: unknown = null
      try { raw = JSON.parse(r.state_json) } catch { continue }
      const out = liftPictures(r.id, readPending(raw), parseAssets(r.assets_json))
      await client.execute({ sql: `UPDATE project_rooms SET state_json = ?, assets_json = ?, state_rev = state_rev + 1 WHERE id = ?`, args: [JSON.stringify(out.pending), JSON.stringify(out.assets), r.id] })
      lifted++
    }
    /* (d) the bell's answers open their version, and a pin's its pin (F098) */
    let bells = 0
    for (const b of rows<{ id: string; href: string; body: string | null; title: string }>(await client.execute(`SELECT id, href, body, title FROM notifications WHERE kind = 'render_feedback' AND href LIKE '/visualizer/%' AND href NOT LIKE '%v=%'`))) {
      const hm = /^\/visualizer\/([^?]+)(?:\?(.*))?$/.exec(b.href)
      const bm = /^(.+?) · V(\d+)\b/.exec(b.body ?? '')
      if (!hm || !bm) continue
      const designId = hm[1]!, from = new URLSearchParams(hm[2] ?? '').get('from')
      const v = vers.find((x) => x.designId === designId && x.room === bm[1] && x.n === Number(bm[2]))
      if (!v) continue
      const [jobId, vid] = v.key.split(':')
      const said = /pinned a note/.test(b.title) ? /“(.*)”$/.exec(b.body ?? '')?.[1] ?? null : null
      const pin = said ? rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM render_annotations WHERE job_id = ? AND variant_id = ? AND author_role = 'client' AND body = ? LIMIT 1`, args: [jobId!, Number(vid), said] }))[0]?.id ?? null : null
      const q = [`room=${v.roomId}`, `v=${encodeURIComponent(v.key)}`, pin ? `pin=${pin}` : null, from ? `from=${encodeURIComponent(from)}` : null].filter(Boolean).join('&')
      await client.execute({ sql: `UPDATE notifications SET href = ? WHERE id = ?`, args: [`/visualizer/${designId}?${q}`, b.id] })
      bells++
    }
    console.log(`  ${inline.length} jobs’ pictures moved beside them · ${linked} filed renders linked to their version · ${owned} given their own picture · ${sized} sized · ${lifted} rooms’ picks lifted · ${bells} bell entries pointed at their version`)
  }

  /* ── R63 · AI credits and the plan (REG-700, owner 2026-09-28: "go ahead and build it perfectly") ─────────────────────────────────────
     The studio's credits as records (REG-343), on 1.0's tables and rules: the four plans (1.0's rows); the studio on Free from 1 Aug with
     its 150 welcome credits (with the top-ups — they never expire, integration B-08) and 30 a month; every demo render charged to its maker
     at its time (a Fast version 10, a High one 20, Empty the room 10 — Q-29; X-Ray readings are free, Q-30); Dane's 1,000 top-up on 20 Aug
     with its checkout and tax invoice; the upgrade to Pro — Studio with 7 seats on 10 Sep (its checkout and invoice; Free's unused month
     ends, the 10,500 arrive); Sarah's monthly amount of 600. The balance is the ledger replayed with 1.0's bucket rules, so the two always
     agree. Written once (when the studio has no plan yet); after that the app keeps the ledger. */
  console.log('\nR63 AI credits and the plan')
  {
    const { PLAN_ROWS, allowanceFor, planRow, priceFor } = await import('../lib/credits/plans')
    for (const p of PLAN_ROWS) {
      await client.execute({ sql: `INSERT INTO plans (id, name, monthly_price, yearly_price, max_members, credit_allowance, signup_credit_grant, feature_flags, min_seats, extra_seat_price_cents, is_contact_sales, trial_period_days, is_highlighted, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET name = excluded.name, monthly_price = excluded.monthly_price, yearly_price = excluded.yearly_price, max_members = excluded.max_members,
        credit_allowance = excluded.credit_allowance, signup_credit_grant = excluded.signup_credit_grant, feature_flags = excluded.feature_flags, min_seats = excluded.min_seats, extra_seat_price_cents = excluded.extra_seat_price_cents,
        is_contact_sales = excluded.is_contact_sales, trial_period_days = excluded.trial_period_days, is_highlighted = excluded.is_highlighted`,
        args: [p.id, p.name, p.monthlyPrice, p.yearlyPrice, p.maxMembers, p.creditAllowance, p.signupCreditGrant, JSON.stringify(p.featureFlags), p.minSeats, p.extraSeatPriceCents, p.isContactSales ? 1 : 0, p.trialPeriodDays, p.isHighlighted ? 1 : 0] })
    }
    const had = rows<{ id: string }>(await client.execute(`SELECT id FROM subscriptions LIMIT 1`)).length > 0
    if (had) console.log('  the studio already has its plan — the app keeps the ledger from here')
    else {
      const at = (y: number, m: number, d: number, h: number, mi = 0) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000)
      const addMonth = (t: number) => { const d = new Date(t * 1000), day = d.getDate(); const x = new Date(d.getFullYear(), d.getMonth() + 1, 1, d.getHours(), d.getMinutes()); x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return Math.floor(x.getTime() / 1000) }
      const START = at(2026, 8, 1, 10), TOPUP = at(2026, 8, 20, 11, 30), UPGRADE = at(2026, 9, 10, 15, 20), CAP = at(2026, 9, 12, 9)
      const team = rows<{ id: string; role: string }>(await client.execute(`SELECT id, role FROM members WHERE is_active = 1`))
      const seats = Math.max(3, team.length)
      const pro = planRow('pro_studio')
      type Ev = { at: number; memberId: string | null; action: string; credits: number; reason: string; ref: string | null }
      const ev: Ev[] = [
        { at: START, memberId: null, action: 'welcome', credits: planRow('free').signupCreditGrant, reason: 'grant', ref: 'welcome' },
        { at: START, memberId: null, action: 'plan_change', credits: allowanceFor(planRow('free'), 1), reason: 'refresh', ref: `plan:${sid('credits', 'sub-free')}` },
        { at: TOPUP, memberId: 'dane', action: 'topup', credits: 1000, reason: 'topup', ref: `topup:${sid('credits', 'topup-aug')}` },
        { at: addMonth(START), memberId: null, action: 'plan_allowance', credits: 30, reason: 'refresh', ref: `period:${addMonth(START)}` },
        { at: UPGRADE, memberId: 'dane', action: 'plan_change', credits: allowanceFor(pro, seats), reason: 'refresh', ref: `plan:${sid('credits', 'sub-pro')}` },
      ]
      /* every render the demo holds, charged to its maker at its time (Q-29) */
      for (const j of rows<{ id: string; model: string; kind: string; created_by: string | null; created_at: number; n: number }>(await client.execute(`SELECT id, model, kind, created_by, created_at, json_array_length(variants_json) AS n FROM render_jobs`))) {
        if (j.created_at < START) continue
        const action = j.kind === 'empty' ? 'render_defurnish' : j.model === 'high' ? 'render_pro' : 'render_fast'
        const unit = action === 'render_pro' ? 20 : 10
        ev.push({ at: j.created_at, memberId: j.created_by, action, credits: -unit * Math.max(1, Math.min(3, Number(j.n) || 1)), reason: 'spend', ref: `render:${j.id}` })
      }
      ev.sort((a, b) => a.at - b.at || (a.reason === 'refresh' ? -1 : 1))
      /* replay with 1.0's buckets: welcome, top-ups and refunds are top-up credits; a month's end takes the unused plan credits */
      let plan = 0, topup = 0, n = 0
      const ledger: InStatement[] = []
      const push = (e: Ev, credits: number, action = e.action) => {
        ledger.push({ sql: `INSERT OR IGNORE INTO credit_ledger (id, member_id, action_key, credits, balance_after, reason, ref_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [sid(`credits:${n++}`, `${e.ref}:${action}`), e.memberId, action, credits, plan + topup, e.reason, e.ref, e.at] })
      }
      for (const e of ev) {
        if (e.reason === 'grant' || e.reason === 'topup') { topup += e.credits; push(e, e.credits) }
        else if (e.reason === 'refresh') {
          if (plan > 0) { const gone = plan; plan = 0; push({ ...e, memberId: e.action === 'plan_change' ? e.memberId : null }, -gone, 'plan_expired') }
          plan = e.credits; push(e, e.credits)
        } else if (e.reason === 'spend') { const cost = -e.credits, fromPlan = Math.min(plan, cost); plan -= fromPlan; topup -= cost - fromPlan; push(e, e.credits) }
      }
      const freeId = sid('credits', 'sub-free'), proId = sid('credits', 'sub-pro')
      const periodEnd = addMonth(UPGRADE)
      await client.batch([
        ...ledger,
        { sql: `INSERT OR IGNORE INTO subscriptions (id, plan_id, billing_cycle, status, seats, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, cancelled_at, grace_until, created_by, created_at, updated_at) VALUES (?, 'free', 'monthly', 'cancelled', 1, ?, ?, NULL, 0, ?, NULL, NULL, ?, ?)`, args: [freeId, addMonth(START), addMonth(addMonth(START)), UPGRADE, START, UPGRADE] },
        { sql: `INSERT OR IGNORE INTO subscriptions (id, plan_id, billing_cycle, status, seats, current_period_start, current_period_end, trial_ends_at, cancel_at_period_end, cancelled_at, grace_until, created_by, created_at, updated_at) VALUES (?, 'pro_studio', 'monthly', 'active', ?, ?, ?, NULL, 0, NULL, NULL, 'dane', ?, ?)`, args: [proId, seats, UPGRADE, periodEnd, UPGRADE, UPGRADE] },
        { sql: `INSERT OR IGNORE INTO studio_credit_balances (id, plan_credits, topup_credits, period_start, period_end, enforcement_enabled, enforcement_starts_at, updated_at) VALUES ('studio', ?, ?, ?, ?, 1, NULL, ?)`, args: [plan, topup, UPGRADE, periodEnd, NOW] },
        { sql: `INSERT OR IGNORE INTO billing_checkout_sessions (id, member_id, kind, plan_id, seats, period, status, credits_granted, created_at, completed_at) VALUES (?, 'dane', 'topup', NULL, 1, 'monthly', 'completed', 1000, ?, ?)`, args: [sid('credits', 'checkout-topup'), TOPUP - 90, TOPUP] },
        { sql: `INSERT OR IGNORE INTO billing_checkout_sessions (id, member_id, kind, plan_id, seats, period, status, credits_granted, created_at, completed_at) VALUES (?, 'dane', 'plan', 'pro_studio', ?, 'monthly', 'completed', ?, ?, ?)`, args: [sid('credits', 'checkout-pro'), seats, allowanceFor(pro, seats), UPGRADE - 120, UPGRADE] },
        { sql: `INSERT OR IGNORE INTO invoices (id, subscription_id, invoice_number, plan_name, amount, currency, billing_period_start, billing_period_end, status, issued_at, paid_at) VALUES (?, NULL, 'INV-202608-0001', '1,000 AI credits', 2000, 'SGD', ?, ?, 'paid', ?, ?)`, args: [sid('credits', 'invoice-topup'), TOPUP, TOPUP, TOPUP, TOPUP] },
        { sql: `INSERT OR IGNORE INTO invoices (id, subscription_id, invoice_number, plan_name, amount, currency, billing_period_start, billing_period_end, status, issued_at, paid_at) VALUES (?, ?, 'INV-202609-0002', ?, ?, 'SGD', ?, ?, 'paid', ?, ?)`, args: [sid('credits', 'invoice-pro'), proId, `${pro.name} · ${seats} seats`, priceFor(pro, seats, 'monthly'), UPGRADE, periodEnd, UPGRADE, UPGRADE] },
        { sql: `INSERT OR IGNORE INTO studio_member_credit_caps (member_id, monthly_cap, updated_by, updated_at) VALUES ('sarah', 600, 'dane', ?)`, args: [CAP] },
      ], 'write')
      console.log(`  Free from ${fmt(START)} → Pro — Studio · ${seats} seats on ${fmt(UPGRADE)} · ${ev.filter((e) => e.reason === 'spend').length} renders charged · balance ${plan} this month + ${topup} top-up`)
    }
  }

  /* ── R64 · the keyboard's arrival note (REG-715, Q-10: "a bell note the day it ships … once, for everyone") ──────────────────────────
     One stored note per active member — stored, so each member's read mark holds — of its own kind (not a Settings › Notifications event:
     it is news, not a rule a studio switches). Its link opens the ? panel over the page it is read on (notifications-panel.tsx). */
  console.log('\nR64 the keyboard shortcuts note')
  {
    const at = Math.floor(Date.UTC(2026, 8, 28, 1, 0, 0) / 1000)   // 28 Sep 2026, 09:00 in Singapore
    const r = await client.execute(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, channels, created_at)
      SELECT 'nt-keys-' || m.id, m.id, 'shortcuts_ready', 'Keyboard shortcuts are here', 'Press ? on any page to see them', '#shortcuts', 'in_app', ${at}
      FROM members m WHERE coalesce(m.is_active, 1) = 1`)
    console.log(`  ${r.rowsAffected} note${r.rowsAffected === 1 ? '' : 's'} written`)
  }

  /* ── R65 · the studio's Variation Order can be sent (UX audit 2026-09-30, C4) ───────────────────────────────────────────────────────
     R34 seeded the Variation Order with a Studio initial and a Client initial and nowhere for the client to sign, so Send refused it and Send
     together could never take it. The seeded template — and any Draft contract started from it before — gains the Client signature the
     template now ends with (lib/contracts/agreement.ts); one that has a Client signature already is left alone. */
  console.log('\nR65 the Variation Order has a Client signature')
  {
    const tplId = sid('template', 'contract-variation')
    const signOff = VARIATION_SIGN_OFF()
    const a = await client.execute({ sql: `UPDATE contract_templates SET body = body || ? WHERE id = ? AND body NOT LIKE '%data-sign="client-signature"%' AND body LIKE '%data-sign="client-initial"%'`, args: [signOff, tplId] })
    const b = await client.execute({ sql: `UPDATE contracts SET body = body || ? WHERE template_id = ? AND status = 'Draft' AND source = 'composed' AND body IS NOT NULL AND body NOT LIKE '%data-sign="client-signature"%' AND body LIKE '%data-sign="client-initial"%'`, args: [signOff, tplId] })
    console.log(`  ${a.rowsAffected} template · ${b.rowsAffected} draft contracts given a Client signature`)
  }

  /* ── R66 · a contract's name is its paper's (UX audit 2026-09-30, C10) ──────────────────────────────────────────────────────────────
     R4/R5 and the contracts seed named the demo's contracts "General Contract Agreement" while their paper — the studio agreement — reads
     "Interior Design Service Agreement", so the client's signing page named two documents. Each takes its paper's title (numbered on its
     lead only against the same title, as a new contract is); a signed one keeps its copy as signed, its signed file name and its Won log
     follow the new name, and its fingerprint is taken again over the same kept text under the new title (lib/contracts/snapshot.ts). */
  console.log('\nR66 contracts named as their paper')
  {
    const OLD = 'General Contract Agreement'
    const olds = rows<{ id: string; lead_id: string; status: string; signed_copy: string | null; signed_body: string | null; source: string }>(await client.execute({ sql: `SELECT id, lead_id, status, signed_copy, signed_body, source FROM contracts
      WHERE title = ? AND body LIKE ? ORDER BY created_at, id`, args: [OLD, `<h1>${AGREEMENT_TITLE}</h1>%`] }))
    let renamed = 0, logs = 0
    for (const c of olds) {
      const taken = rows<{ title: string }>(await client.execute({ sql: `SELECT title FROM contracts WHERE lead_id = ? AND deleted_at IS NULL AND id <> ?`, args: [c.lead_id, c.id] })).map((r) => r.title)
      const re = new RegExp(`^${AGREEMENT_TITLE}(?: (\\d+))?$`)
      const top = taken.reduce((m, t) => { const x = re.exec(t); return x ? Math.max(m, x[1] ? Number(x[1]) : 1) : m }, 0)
      const title = top === 0 ? AGREEMENT_TITLE : `${AGREEMENT_TITLE} ${top + 1}`
      const copy = c.signed_copy === `${OLD}.pdf` ? `${title}.pdf` : c.signed_copy
      const hash = c.status === 'Signed' && c.source === 'composed' && c.signed_body ? documentHashOf(title, c.signed_body) : null
      await client.execute({ sql: `UPDATE contracts SET title = ?, signed_copy = ?, document_hash = coalesce(?, document_hash) WHERE id = ?`, args: [title, copy, hash, c.id] })
      if (copy !== c.signed_copy) logs += (await client.execute({ sql: `UPDATE stage_logs SET payload = json_set(payload, '$.wonContract', ?) WHERE lead_id = ? AND to_stage = 'Won' AND json_extract(payload, '$.wonContract') = ?`, args: [copy, c.lead_id, c.signed_copy] })).rowsAffected
      renamed++
    }
    console.log(`  ${renamed} contracts named as their paper · ${logs} Won logs follow`)
  }

  const checks: [string, string][] = [
    /* (UX audit 2026-09-30) */
    ['the seeded Variation Order with nowhere for the client to sign (C4)', `SELECT title FROM contract_templates WHERE id = '${sid('template', 'contract-variation')}' AND deleted_at IS NULL AND body NOT LIKE '%data-sign="client-signature"%'`],
    ['a contract named apart from its paper (C10)', `SELECT title FROM contracts WHERE title = 'General Contract Agreement' AND body LIKE '<h1>${AGREEMENT_TITLE}</h1>%'`],
    ['a member without the keyboard shortcuts note (REG-715)', `SELECT m.id FROM members m WHERE coalesce(m.is_active, 1) = 1 AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.id = 'nt-keys-' || m.id)`],
    /* (audit 2026-09-26) the AI Visualizer's audit fixes */
    /* (REG-700) AI credits: the balance is its ledger, one live plan, a paid plan has its invoice */
    ['AI credits: the four plans (REG-700)', `SELECT 'plans' WHERE (SELECT count(*) FROM plans WHERE id IN ('free','pro_freelance','pro_studio','max')) <> 4`],
    ['AI credits: no plan on record, or more than one live (REG-700)', `SELECT 'subscriptions' WHERE (SELECT count(*) FROM subscriptions WHERE cancelled_at IS NULL) <> 1`],
    ['AI credits: balance disagrees with its ledger (REG-700)', `SELECT 'studio' FROM studio_credit_balances b WHERE b.plan_credits + b.topup_credits <> (SELECT coalesce(sum(credits), 0) FROM credit_ledger WHERE reason <> 'shadow_spend')`],
    ['AI credits: a bucket below zero (REG-700)', `SELECT 'studio' FROM studio_credit_balances WHERE plan_credits < 0 OR topup_credits < 0`],
    ['AI credits: a paid plan with no tax invoice (REG-700)', `SELECT s.plan_id FROM subscriptions s WHERE s.plan_id <> 'free' AND s.status = 'active' AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.subscription_id = s.id)`],
    ['AI credits: a monthly amount for someone not on the team (REG-700)', `SELECT c.member_id FROM studio_member_credit_caps c WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = c.member_id)`],
    ['AI credits: an Owner asking the Owner (REG-703)', `SELECT r.member_id FROM credit_requests r JOIN members m ON m.id = r.member_id WHERE r.status = 'open' AND m.role = 'Owner'`],
    ['render picture still inside its job (F213)', `SELECT id FROM render_jobs WHERE variants_json LIKE '%"imageUrl":"data:%'`],
    ['render picture stored for a version its job does not have (F213)', `SELECT i.job_id FROM render_images i WHERE NOT EXISTS (SELECT 1 FROM render_jobs j, json_each(j.variants_json) v WHERE j.id = i.job_id AND json_extract(v.value, '$.id') = i.variant_id)`],
    ['saved render showing a picture that lives in the design (F093)', `SELECT name FROM lead_files WHERE thumb LIKE '/visualizer/img/%'`],
    /* (round 3) only a live file still in the old shape — its picture borrowed from the design — is a render the repair failed to link; a file
       holding its own picture is a studio's upload that happens to share the name (a render filed today is linked in the same step) */
    ['render in Files with no record of the version it is (F095)', `SELECT f.name FROM lead_files f JOIN lead_files p ON p.id = f.parent_id WHERE p.kind = 'folder' AND p.name = 'Renders' AND f.kind = 'image' AND f.deleted_at IS NULL AND f.name LIKE 'Render - % - V%.jpg' AND (f.thumb IS NULL OR f.thumb <> '/files/img/' || f.id) AND EXISTS (SELECT 1 FROM visualizer_designs d WHERE d.lead_id = f.lead_id AND d.kind = 'lead') AND NOT EXISTS (SELECT 1 FROM lead_file_renders x WHERE x.file_id = f.id)`],
    ['filed-render record on a file that is not an image, or naming another lead\'s design (F095)', `SELECT x.file_id FROM lead_file_renders x JOIN lead_files f ON f.id = x.file_id WHERE f.kind <> 'image' OR EXISTS (SELECT 1 FROM visualizer_designs d WHERE d.id = x.design_id AND d.lead_id IS NOT f.lead_id)`],
    ['filed render with a made-up size (F113)', `SELECT f.name FROM lead_files f JOIN lead_file_renders x ON x.file_id = f.id WHERE f.size_bytes = 140000`],
    ['room picks holding a picture (F200)', `SELECT name FROM project_rooms WHERE state_json LIKE '%data:image%'`],
    ['room picture store that is not JSON (F200)', `SELECT name FROM project_rooms WHERE assets_json IS NOT NULL AND NOT json_valid(assets_json)`],
    ['a second lead design for one lead (F215)', `SELECT lead_id FROM visualizer_designs WHERE kind = 'lead' GROUP BY lead_id HAVING count(*) > 1`],
    ['a lead design naming a source lead (F115)', `SELECT name FROM visualizer_designs WHERE source_lead_id IS NOT NULL AND kind <> 'personal'`],
    ['a client answer in the bell that opens no version (F098)', `SELECT id FROM notifications WHERE kind = 'render_feedback' AND body LIKE '% · V%' AND href NOT LIKE '%v=%'`],
    /* (wave E, files-16) a design the studio moved to the trash is still there (its Restore brings it back); one deleted for good is written
       again by R61's fixed ids — so only "no design at all" is missing */
    ['AI Visualizer demo design missing (REG-673)', `SELECT 'Kevin Ng' WHERE EXISTS (SELECT 1 FROM leads WHERE name = 'Kevin Ng' AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM visualizer_designs d JOIN leads l ON l.id = d.lead_id WHERE l.name = 'Kevin Ng')`],
    ['lead design on a lead that is gone, or a personal design naming a lead (REG-673)', `SELECT name FROM visualizer_designs WHERE (kind = 'lead' AND (lead_id IS NULL OR NOT EXISTS (SELECT 1 FROM leads l WHERE l.id = lead_id))) OR (kind = 'personal' AND lead_id IS NOT NULL)`],
    ['room with no photo, or a room of another lead than its design (REG-673)', `SELECT r.name FROM project_rooms r JOIN visualizer_designs d ON d.id = r.design_id WHERE r.original_image_url IS NULL OR r.original_image_url = '' OR r.lead_id IS NOT d.lead_id`],
    ['render with unreadable versions or no version (REG-673)', `SELECT id FROM render_jobs WHERE NOT json_valid(variants_json) OR json_array_length(variants_json) = 0`],
    ['render on another lead than its room (REG-673)', `SELECT j.id FROM render_jobs j JOIN project_rooms r ON r.id = j.room_id WHERE j.lead_id IS NOT r.lead_id`],
    ['shared link whose snapshot is unreadable or empty (REG-675)', `SELECT token FROM render_share_links WHERE NOT json_valid(snapshot) OR json_array_length(json_extract(snapshot, '$.versions')) = 0`],
    ['client favourite or note naming a version its link does not carry (REG-676)', `SELECT c.id FROM render_consultation_requests c JOIN render_share_links s ON s.id = c.share_link_id WHERE c.version_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM json_each(json_extract(s.snapshot, '$.versions')) v WHERE json_extract(v.value, '$.key') = c.version_key)`],
    ['call back with no follow-up task (REG-676)', `SELECT c.id FROM render_consultation_requests c WHERE c.kind = 'call_back' AND (c.task_id IS NULL OR NOT EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = c.task_id))`],
    ['pin by a member who is not one, or a client pin with a member (REG-675)', `SELECT id FROM render_annotations WHERE (author_role = 'studio' AND NOT EXISTS (SELECT 1 FROM members m WHERE m.id = author_member_id)) OR (author_role = 'client' AND author_member_id IS NOT NULL)`],
    ['studio material without a colour, or linked to a Price book item that is gone (REG-677)', `SELECT name FROM studio_materials m WHERE m.hex NOT GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]' OR (m.price_book_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_book_items p WHERE p.id = m.price_book_item_id))`],
    ['studio material last changed by someone not on the team (wave E, E5)', `SELECT name FROM studio_materials m WHERE m.updated_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM members x WHERE x.id = m.updated_by)`],
    ['design or material filed in a folder of another library (REG-673)', `SELECT name FROM visualizer_designs d WHERE d.folder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM library_folders f WHERE f.id = d.folder_id AND f.library = 'visualizer') UNION ALL SELECT name FROM studio_materials m WHERE m.folder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM library_folders f WHERE f.id = m.folder_id AND f.library = 'materials')`],
    ['no Admin on the demo team (REG-668)', `SELECT 'studio' WHERE NOT EXISTS (SELECT 1 FROM members WHERE role = 'Admin' AND is_active = 1)`],
    ['not exactly one signed-in member (REG-667)', `SELECT 'members' WHERE (SELECT count(*) FROM members WHERE is_you = 1) <> 1`],
    /* (wave E, files-16) an entry the studio moved to the trash still counts as filed — it keeps its folder, and its Restore puts it back
       there; a studio's own deletes never fail the repair */
    ['demo folder with nothing filed in it (REG-664)', `SELECT f.library || ' · ' || f.name FROM library_folders f WHERE f.deleted_at IS NULL AND f.id LIKE 'lf-%' AND NOT EXISTS (SELECT 1 FROM library_folders c WHERE c.parent_id = f.id AND c.deleted_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM quote_templates x WHERE x.folder_id = f.id) AND NOT EXISTS (SELECT 1 FROM contract_templates x WHERE x.folder_id = f.id)
      AND NOT EXISTS (SELECT 1 FROM task_templates x WHERE x.folder_id = f.id) AND NOT EXISTS (SELECT 1 FROM quote_text_templates x WHERE x.folder_id = f.id)
      AND NOT EXISTS (SELECT 1 FROM payment_templates x WHERE x.folder_id = f.id) AND NOT EXISTS (SELECT 1 FROM price_book_items x WHERE x.folder_id = f.id)
      AND NOT EXISTS (SELECT 1 FROM price_book_sections x WHERE x.folder_id = f.id)
      AND NOT EXISTS (SELECT 1 FROM visualizer_designs x WHERE x.folder_id = f.id) AND NOT EXISTS (SELECT 1 FROM studio_materials x WHERE x.folder_id = f.id)`],   /* (REG-673 · 677) the AI Visualizer's and Materials' folders */
    ['entry filed in a folder of another library, or one that is gone (REG-664)', `SELECT 'quotes · ' || name FROM quote_templates t WHERE folder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM library_folders f WHERE f.id = t.folder_id AND f.library = 'quotes' AND f.deleted_at IS NULL)
      UNION ALL SELECT 'book-items · ' || name FROM price_book_items t WHERE folder_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM library_folders f WHERE f.id = t.folder_id AND f.library = 'book-items' AND f.deleted_at IS NULL)`],
    ['quote comparison with a straight apostrophe in its words (sweep S3)', `SELECT your_label FROM quote_comparisons WHERE result_json LIKE '%doesn''t%' OR result_json LIKE '%it''s %' OR result_json LIKE '%I''ve%' OR instr(result_json, other_studio || '''s') > 0`],
    ['price-book item or section naming nobody who made it (REG-652)', `SELECT name FROM price_book_items WHERE created_by IS NULL UNION ALL SELECT name FROM price_book_sections WHERE created_by IS NULL`],
    ['price-book item with no History (REG-652)', `SELECT name FROM price_book_items i WHERE NOT EXISTS (SELECT 1 FROM price_book_changes c WHERE c.item_id = i.id)`],
    ['price-book item in no known state, or a send-back note on an item that is not waiting in the trash (REG-652)', `SELECT name FROM price_book_items WHERE status NOT IN ('live', 'proposed') OR (review_note IS NOT NULL AND (deleted_at IS NULL OR status <> 'proposed'))`],
    ['price-book history for an item that is gone (REG-652)', `SELECT c.id FROM price_book_changes c WHERE NOT EXISTS (SELECT 1 FROM price_book_items i WHERE i.id = c.item_id)`],
    ['a price-book rate over S$500 a square foot (REG-651)', `SELECT name FROM price_book_items WHERE deleted_at IS NULL AND lower(unit) IN ('sqft', 'sqm') AND cost_minor + markup_minor > 50000`],
    ['no active Owner (REG-646)', `SELECT 'studio' WHERE NOT EXISTS (SELECT 1 FROM members WHERE role = 'Owner' AND is_active = 1)`],
    ['backup approver who cannot be one (REG-646)', `SELECT json_extract(value, '$.backupApproverId') FROM settings WHERE key = 'quote_rules' AND json_extract(value, '$.backupApproverId') IS NOT NULL
      AND json_extract(value, '$.backupApproverId') NOT IN (SELECT id FROM members WHERE is_active = 1 AND role NOT IN ('Owner', 'Admin'))`],
    ['issuing entity without an id (REG-647)', `SELECT 'brand' FROM settings, json_each(json_extract(settings.value, '$.details.entities')) e WHERE settings.key = 'brand' AND json_extract(e.value, '$.id') IS NULL`],
    ['lead capture with no kept intake slug (REG-647)', `SELECT 'lead_capture' FROM settings WHERE key = 'lead_capture' AND coalesce(json_extract(value, '$.emailSlug'), '') = ''`],
    ['quote comparison from an older engine (REG-638)', `SELECT your_label FROM quote_comparisons WHERE engine IS NULL OR engine < ${ENGINE}`],
    ['quote comparison sent with no sender or text (REG-640)', `SELECT your_label FROM quote_comparisons WHERE sent_at IS NOT NULL AND (sent_by IS NULL OR sent_text IS NULL OR sent_via NOT IN ('whatsapp', 'copy'))`],
    ['quote comparison corrected with no corrections kept (REG-640)', `SELECT your_label FROM quote_comparisons WHERE (corrected_at IS NULL) <> (overrides_json IS NULL) OR (overrides_json IS NOT NULL AND NOT json_valid(overrides_json))`],
    ['quote comparison without the lines it read (REG-638)', `SELECT your_label FROM quote_comparisons WHERE inputs_json IS NULL OR NOT json_valid(inputs_json)`],
    ['studio-marked signature naming nobody (REG-634)', `SELECT title FROM contracts WHERE status = 'Signed' AND signed_by IS NULL AND marked_by IS NULL`],
    ['deleted contract naming nobody (REG-634)', `SELECT title FROM contracts WHERE deleted_at IS NOT NULL AND deleted_by IS NULL`],
    ['follow-up task on a contract that is gone (REG-634)', `SELECT t.title FROM lead_tasks t WHERE t.contract_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.id = t.contract_id)`],
    ['online signature with no signing record (REG-633)', `SELECT title FROM contracts WHERE status = 'Signed' AND signed_by IS NOT NULL AND (signature_kind IS NULL OR verification_method IS NULL)`],
    ['drawn signature with no drawing (REG-633)', `SELECT title FROM contracts WHERE signature_kind = 'draw' AND (signature_data IS NULL OR signature_data = '')`],
    ['bundled document with no place in its bundle (REG-633)', `SELECT title FROM contracts WHERE bundle_id IS NOT NULL AND bundle_position IS NULL`],
    ['contract naming a quote of another lead (REG-632)', `SELECT c.title FROM contracts c JOIN quotes q ON q.id = c.from_quote_id WHERE q.lead_id <> c.lead_id`],
    ['Won log naming a signed contract the lead does not have (REG-632)', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.to_stage = 'Won' AND json_extract(s.payload, '$.wonContractTab') = 'system' AND EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = s.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = s.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL AND coalesce(c.signed_copy, c.title || '.pdf') = json_extract(s.payload, '$.wonContract'))`],
    ['Won upload with no contract behind it (REG-632)', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.to_stage = 'Won' AND json_extract(s.payload, '$.wonContractTab') = 'upload' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = s.lead_id AND c.source = 'uploaded' AND c.file_name = json_extract(s.payload, '$.wonContractUploaded') AND c.deleted_at IS NULL)`],
    ['signed contract without the copy kept at signing (REG-631)', `SELECT title FROM contracts WHERE status = 'Signed' AND document_hash IS NULL`],
    ['contract that is not signed holding a signing stamp (REG-631)', `SELECT title FROM contracts WHERE status <> 'Signed' AND (signed_at IS NOT NULL OR signed_by IS NOT NULL OR signed_nric IS NOT NULL OR document_hash IS NOT NULL)`],
    ['contract NRIC kept whole (REG-631, REG-563)', `SELECT title FROM contracts WHERE signed_nric IS NOT NULL AND signed_nric NOT LIKE '•••••%'`],
    ['line comment on a quote that is gone (REG-627)', `SELECT c.id FROM quote_item_comments c WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = c.quote_id)`],
    ['line comment by someone who is not a member (REG-627)', `SELECT c.id FROM quote_item_comments c WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.id = c.author_id)`],
    ['signed quote with no signing date (REG-626)', `SELECT number FROM quotes WHERE status = 'Signed' AND signed_at IS NULL`],
    ['signed contract whose quote is not signed (REG-626)', `SELECT c.title FROM contracts c JOIN quotes q ON q.id = c.from_quote_id WHERE c.status = 'Signed' AND c.deleted_at IS NULL AND q.deleted_at IS NULL AND q.status <> 'Signed'`],
    ['client answer on a line that is not optional (REG-626)', `SELECT i.name FROM quote_items i WHERE i.client_choice IS NOT NULL AND (i.optional = 0 OR i.client_choice NOT IN ('want', 'skip'))`],
    ['quote the client has still reading Private (REG-625)', `SELECT number FROM quotes WHERE status IN ('Sent to Client', 'Confirmed', 'Signed') AND visibility <> 'Shared'`],
    ['approved quote with no approver on its record (REG-624)', `SELECT number FROM quotes WHERE approved_at IS NOT NULL AND approved_by IS NULL`],
    ['quote waiting for approval with no sender (REG-624)', `SELECT number FROM quotes WHERE status = 'Sent for Approval' AND submitted_at IS NULL`],
    ['quote the client has, never sent to them (REG-624)', `SELECT number FROM quotes WHERE status IN ('Sent to Client', 'Confirmed', 'Signed') AND client_sent_at IS NULL`],
    ['approval before its send (REG-624)', `SELECT number FROM quotes WHERE submitted_at IS NOT NULL AND approved_at IS NOT NULL AND approved_at < submitted_at`],
    ['line picked from My Items without the item\'s vendor (REG-623)', `SELECT q.number || ' · ' || i.name FROM quote_items i JOIN quotes q ON q.id = i.quote_id JOIN price_book_items p ON p.id = i.price_book_item_id WHERE i.kind = 'item' AND i.vendor IS NULL AND p.vendor IS NOT NULL`],
    ['line link that is not a web address (REG-623)', `SELECT q.number || ' · ' || i.name FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE i.link IS NOT NULL AND i.link NOT LIKE 'http://%' AND i.link NOT LIKE 'https://%'`],
    ['notification pointing at a missing lead (REG-604)', `SELECT n.title FROM notifications n WHERE n.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.id = n.lead_id)`],
    ['designer reporting to someone who is not a Manager (REG-601)', `SELECT d.name FROM members d JOIN members m ON m.id = d.manager_id WHERE m.role <> 'Manager'`],
    ['member with an unknown role (REG-601)', `SELECT name FROM members WHERE role NOT IN ('Owner', 'Admin', 'Manager', 'Designer')`],
    ['price book section unreadable (REG-594)', `SELECT name FROM price_book_sections WHERE NOT json_valid(lines_json) OR json_type(lines_json, '$.lines') IS NOT 'array'`],
    ['price book item with an empty name (REG-594)', `SELECT id FROM price_book_items WHERE trim(name) = ''`],
    ['brand kit details disagree with the studio record (REG-554)', `SELECT 'brand' FROM settings b JOIN settings s ON s.key = 'studio' WHERE b.key = 'brand' AND (json_extract(b.value, '$.details.name') IS NOT json_extract(s.value, '$.name') OR json_extract(b.value, '$.details.phone') IS NOT json_extract(s.value, '$.phone'))`],
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
    /* (REG-641, X-Ray parity Q-21 · D-43) a deleted quote's comparisons stay and say so — only a quote that no longer exists is gone */
    ['quote comparison whose quote is gone', `SELECT c.your_label FROM quote_comparisons c WHERE c.quote_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = c.quote_id)`],
    ['quote comparison on a lead that is gone for good (REG-641)', `SELECT c.your_label FROM quote_comparisons c WHERE c.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.id = c.lead_id)`],
    ['quote comparison whose quote is on another lead (REG-641)', `SELECT c.your_label FROM quote_comparisons c JOIN quotes q ON q.id = c.quote_id WHERE c.lead_id IS NOT NULL AND q.lead_id <> c.lead_id`],
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
    ['member with no work email (REG-560)', `SELECT name FROM members WHERE email IS NULL OR email = ''`],
    ['brand record with no issuing entity (REG-562)', `SELECT 'brand' FROM settings WHERE key = 'brand' AND json_array_length(json_extract(value, '$.details.entities')) IS NOT 1 AND json_array_length(json_extract(value, '$.details.entities')) IS NULL`],
    ['custom Print as with no word (REG-555)', `SELECT q.number || ' · ' || i.name FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE i.print_as = 'custom' AND (i.print_as_text IS NULL OR i.print_as_text = '')`],
    ['section nested deeper than one level (REG-558)', `SELECT q.number || ' · ' || c.name FROM quote_items c JOIN quote_items p ON p.id = c.parent_id JOIN quote_items g ON g.id = p.parent_id JOIN quotes q ON q.id = c.quote_id WHERE c.kind = 'group' OR g.parent_id IS NOT NULL`],
    ['kept version whose quote is at or below it (REG-565)', `SELECT q.number FROM quote_versions v JOIN quotes q ON q.id = v.quote_id WHERE v.version >= q.version`],
    ['Letter footer address still under the signature (REG-569)', `SELECT name FROM quote_templates WHERE design_json LIKE '%"kind":"footer"%' AND design_json LIKE '%"y":16,"w":174,"text":"{studio_name}%'`],
    ['lead with a key collection outside the vocabulary (REG-607)', `SELECT name FROM leads WHERE key_collection IS NOT NULL AND key_collection NOT IN ('Collected', 'in 3 months', 'in 6 months', 'in 9 months', 'Later')`],
    ['parity demo lead missing (REG-613)', `SELECT id FROM (SELECT 'plead-hangout' AS id UNION SELECT 'plead-lost-budget' UNION SELECT 'plead-lost-postponed') WHERE id NOT IN (SELECT id FROM leads)`],
    ['event with an unknown kind (REG-613)', `SELECT id FROM lead_events WHERE kind NOT IN ('member_removed','field_edited','task_deleted','note_deleted','file_trashed','file_deleted','return_undone','invite_sent','questionnaire_asked',
      'contract_unsigned','contract_archived','contract_restored','comparison_deleted',
      'design_deleted','design_restored','design_purged','room_deleted','room_restored','version_deleted','version_restored','share_stopped','share_renewed','share_reopened')`],   /* (REG-634 · 641 · audit 2026-09-26) every kind LeadEventKind names */
    ['bank question with an unknown type (REG-612)', `SELECT question FROM studio_scope_questions WHERE question_type NOT IN ('text','yes_no','number','single_select','multi_select','date')`],
    ['member preferences that are not JSON (REG-612)', `SELECT name FROM members WHERE lead_preferences IS NOT NULL AND json_valid(lead_preferences) = 0`],
    ['custom field value on an inactive or missing field (REG-612)', `SELECT v.id FROM lead_custom_field_values v LEFT JOIN lead_custom_fields f ON f.id = v.field_id WHERE f.id IS NULL`],
    ['client-answered questionnaire on a lead never asked (REG-609)', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND EXISTS (SELECT 1 FROM questions q WHERE q.lead_id = l.id AND q.answered_by = 'client') AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links h WHERE h.lead_id = l.id AND h.last_asked_at IS NOT NULL)`],
    ['Qanvast lead without its Qanvast id (REG-609)', `SELECT name FROM leads WHERE source = 'Qanvast' AND deleted_at IS NULL AND qanvast_lead_id IS NULL`],
    ['task with an unknown kind (REG-608)', `SELECT title FROM lead_tasks WHERE kind NOT IN ('General', 'Call', 'Follow-up')`],
    ['follow-up task on a lead with members but nobody on it (REG-608)', `SELECT t.title FROM lead_tasks t WHERE t.kind = 'Follow-up' AND EXISTS (SELECT 1 FROM lead_assignees x WHERE x.lead_id = t.lead_id) AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id)`],
    ['lead with a district outside the vocabulary (REG-607)', `SELECT name FROM leads WHERE area IS NOT NULL AND area NOT IN ('North', 'North East', 'East', 'West', 'Central')`],
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
