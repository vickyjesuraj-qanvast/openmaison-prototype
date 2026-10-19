process.env.TZ = process.env.TZ ?? 'Asia/Kolkata'   // before any Date: every `when` string and every due hour is local (the demo machine runs IST)

import { randomUUID } from 'node:crypto'
import { createClient, type InStatement } from '@libsql/client'
import { compareQuotes, ENGINE, refAsYours, type YourLine } from '@/lib/xray/compare'
import { yourLinesFrom } from '@/lib/xray/lines'
import { AGREEMENT_TITLE, APPOINTMENT_TITLE, COMPLETION_TITLE, VARIATION_SIGN_OFF, VARIATION_TITLE, agreementHtml, appointmentHtml, completionHtml, variationHtml } from '@/lib/contracts/agreement'
import { readOtherQuote } from '@/lib/xray/reference'
import { createHash } from 'node:crypto'
import { DATABASE_AUTH_TOKEN, DATABASE_URL } from './env'
import { BUSY_WAIT_MS } from '../lib/db/local-file'   // (pending modules S08b)
import { emptyWizardData, SYSTEM_CONTRACT, SYSTEM_QUOTE, type WizardData } from '../lib/leads/stage-data'
import { displayDate, formatInputDateTime } from '../lib/format'
import { parseDiscounts, quoteTotals } from '../lib/quotes/math'
import { PRESET_SPLITS, presetRows, scheduleAnchors } from '../lib/quotes/payments'
import { resolveTokens, TEMPLATE_SEED } from '../lib/quotes/text'
import { projectRef, VALIDITY_DAYS } from '../lib/quotes/refs'
import { STAGES } from '../lib/leads/enums'
import { PRESETS } from '../lib/templates/presets'
import { DEFAULT_BRAND_SETTING, parseBrandSetting } from '../lib/templates/brand'
import { SETUP_KEY, setupRows, type SetupFacts } from '../lib/studio-setup/model'   // (pending modules S08, R110)
import { footLinksShown as portalFootShown, parseFootLinks as parsePortalFootLinks } from '../lib/portal/links'   // (pending modules S13, R115)
import { lookUnder as memberLookUnder } from '../lib/company/member-photo'   // (pending modules S13, R115)
import { EVENTS as NOTICE_EVENTS } from '../lib/notifications/model'   // (pending modules S18, R117)
import { parseMuted as parseNoticeMuted } from '../lib/notifications/personal'
import { parseLeadCapture } from '../lib/settings/types'
import { documentHashOf, snapshotColumns, type ContractLead, type ContractQuote } from '../lib/contracts/snapshot'
import type { Contract } from '../lib/db/schema'
import { DEMO_BADGES } from '../lib/templates/assets'
import { cleanPlan as plannerCleanPlan } from '../lib/planner/model'   // (gaps build J, R88)
import { nameKey } from '../lib/finance/model'   // (one-home N-16, R91)
import { isPieceKey as plannerIsPieceKey } from '../lib/planner/catalogue'
import { furnish as plannerFurnish, planFromTemplate as plannerPlanFromTemplate, templateRoom as plannerTemplateRoom } from '../lib/planner/templates'
import { SAMPLE_ROOMS, sampleByKey } from '../lib/visualizer/samples'
import { changeLines, descriptor, NO_FINISHES, ORIGINAL, readPending, sampleDetection, versionKey, type Applied, type Detection, type Finishes, type Variant } from '../lib/visualizer/model'
import { catalogueItem } from '../lib/visualizer/catalogue'
import { fromCatalogue, restylePicks } from '../lib/visualizer/materials'
import { composeCustomizeDesc } from '../lib/visualizer/furniture'
import { presetById } from '../lib/visualizer/lighting'
import { titleCaseLabel } from '../lib/visualizer/surfaces'
import { DEMO_EDIT } from '../lib/visualizer/demo'
import { SCHEDULE_PRESETS } from '../lib/projects/schedule-presets'   // (gaps build, package C — R80)
import { receiptHashSource } from '../lib/projects/choice-receipt-model'   // (gaps build D — R81)
import { dayLabel, dayOf } from '../lib/projects/schedule-model'
import { dataUrlBytes, isDataImage, liftPictures, parseAssets, renderAddress } from '../lib/visualizer/picture-store'
import { statSync } from 'node:fs'
import { missingStarters } from '../lib/leads/file-model'   // (gaps build E, R82)
import { livePrepared, withClient } from '../lib/quotes/prepared'   // (pending modules S04, R106)
import { DEFAULT_TEMPLATES, eventDef, parseTemplates, templateFor } from '../lib/notifications/model'
import { compose, waNumber } from '../lib/notifications/outbox'
import { shortStudioName } from '../lib/settings/types'
import { siteConfig } from '../lib/config'
import { titleCaseName } from '../lib/format'
import { readMeeting } from '../lib/meetings/engine'   // (pending modules S23, R140)
import { demoFeed as marketplaceDemoFeed } from '../lib/marketplace/demo'   // (pending modules S24, R141)
import { feedStatements as marketplaceStatements, rowsFromFeed as marketplaceRows } from '../lib/marketplace/feed'
import { demoFeed as insightsDemoFeed, demoPictures as insightsDemoPictures } from '../lib/market-insights/demo'   // (pending modules S25, R142)
import { feedStatements as insightsStatements, rowsFromFeed as insightsRows } from '../lib/market-insights/feed'
import { blocksOf as insightsBlocks } from '../lib/market-insights/markdown'
import { briefOf as meetingBriefOf } from '../lib/meetings/brief'
import { answersFrom as meetingAnswersFrom } from '../lib/meetings/objections'
import { parseWords as meetingParseWords } from '../lib/meetings/checklists'
import { aimLabel as meetingAimLabel, firstOf as meetingFirstOf, parseCopilotSettings, parseState as parseMeetingState } from '../lib/meetings/model'
import { parseInputDateTime } from '../lib/format'
import { DEMO_EVENTS as HANGOUT_DEMO, demoFeed as hangoutDemoFeed } from '../lib/hangouts/demo'   // (pending modules S27, R144)
import { ACT_SOURCES as HEALTH_ACTS, CLIENT_SOURCES as HEALTH_CLIENT_ACTS, stampsSql as healthStampsSql } from '../lib/studio-health/sources'   // (pending modules S39, R123)
import { SESSION_DAYS as PORTAL_SESSION_DAYS } from '../lib/portal/model'   // (pending modules S39, R123)
import { feedStatements as hangoutStatements, rowsFromFeed as hangoutRows } from '../lib/hangouts/feed'
import { computeMatchScore as hangoutMatchScore, followUpFor as hangoutFollowUp, parseStudioPrefs as hangoutStudioPrefs, type HomeownerPrefs as HangoutHomeownerPrefs } from '../lib/hangouts/model'
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

const client = createClient({ url: DATABASE_URL, authToken: DATABASE_AUTH_TOKEN, timeout: BUSY_WAIT_MS })   // (pending modules S08b) wait for a running server's lock instead of failing
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

/* (R82 · 8, kept as a function by pending modules S19) The outbox: the newest twelve bell rows that went out by email or WhatsApp — the studio's
   words, each member's address, at the moment each was raised. R82 writes them; R111 asks again after it moves bell rows with the AI work they
   belong to (a moved bell can become one of the newest twelve — one run of the repair then leaves what a second would). Idempotent: fixed ids,
   INSERT OR IGNORE. */
async function outboxNewest(): Promise<number> {
  let made = 0
  const [studioRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))
  let studio = 'Demo Studio'
  try { studio = shortStudioName(String((JSON.parse(studioRow?.value ?? '{}') as { name?: string }).name ?? 'Demo Studio')) } catch { /* the default */ }
  const [tplRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'message_templates'`))
  let templates = DEFAULT_TEMPLATES
  try { if (tplRow) templates = parseTemplates(JSON.parse(tplRow.value)) } catch { templates = DEFAULT_TEMPLATES }
  type N = { id: string; kind: string; member: string; title: string; body: string | null; href: string | null; lead: string | null; quote: string | null; actor: string | null; channels: string; at: number }
  const raised = rows<N>(await client.execute(`SELECT id, kind, member_id AS member, title, body, href, lead_id AS lead, quote_id AS quote, actor_id AS actor, channels, created_at AS at FROM notifications WHERE channels LIKE '%email%' OR channels LIKE '%whatsapp%' ORDER BY created_at DESC, id LIMIT 12`))
  const team = new Map(rows<{ id: string; name: string; email: string | null; phone: string | null; active: number }>(await client.execute(`SELECT id, name, email, phone, is_active AS active FROM members`)).map((m) => [m.id, m]))
  for (const n of raised) {
    const def = eventDef(n.kind)
    const to = team.get(n.member)
    if (!def || !to || !Number(to.active)) continue
    const [lead] = n.lead ? rows<{ name: string; source: string | null; stage: string | null }>(await client.execute({ sql: `SELECT name, source, stage FROM leads WHERE id = ?`, args: [n.lead] })) : []
    const [quote] = n.quote ? rows<{ number: string }>(await client.execute({ sql: `SELECT number FROM quotes WHERE id = ?`, args: [n.quote] })) : []
    const actor = n.actor ? team.get(n.actor) : undefined
    const fields: Record<string, string> = { '{studio}': studio, '{link}': `${siteConfig.url.replace(/\/$/, '')}${n.href ?? ''}` }
    if (lead) { fields['{lead_name}'] = titleCaseName(lead.name); if (lead.source) fields['{source}'] = lead.source; if (lead.stage) fields['{stage}'] = lead.stage }
    if (quote) fields['{quote_number}'] = quote.number
    if (actor) fields['{actor}'] = actor.name
    for (const channel of ['email', 'whatsapp'] as const) {
      if (!n.channels.split(',').includes(channel)) continue
      const words = templateFor(templates, def.key, channel)
      const msg = compose(channel, words, fields, { title: n.title, body: n.body, href: n.href }, to.name)
      const address = channel === 'email' ? to.email?.trim() || null : waNumber(to.phone)
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO notification_outbox (id, key, notification_id, event, channel, member_id, to_name, to_address, subject, body, href, lead_id, status, error, provider, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,'outbox',?)`,
        args: [sid(n.id, `outbox:${channel}`), `n:${n.id}:${channel}`, n.id, def.key, channel, to.id, to.name, address, msg.subject, msg.body, n.href, n.lead, address ? 'sent' : 'no_address', n.at] })).rowsAffected
    }
  }
  return made
}

/* ── (pending modules S19) The AI work the demo's credits paid for (lib/credits/demo-month.ts `PAID_WORK_TIMES` · `paidWorkIds`) — read
   and moved by R111 (with its month) and R118 (lined up once). `design` narrows it to one design. ─────────────────────────────────── */
async function paidWorkRows(design: string | null): Promise<Partial<Record<string, Record<string, unknown>[]>>> {
  const q = async (sql: string) => rows<Record<string, unknown>>(await client.execute(sql))
  const [ledger, jobs, rooms, annotations, links, consults, fileRenders, bell] = await Promise.all([
    q(`SELECT id, reason, ref_id, created_at FROM credit_ledger WHERE reason = 'spend' AND ref_id LIKE 'render:%'`),
    q(`SELECT id, room_id, created_at FROM render_jobs`), q(`SELECT id, design_id FROM project_rooms`),
    q(`SELECT id, job_id FROM render_annotations`), q(`SELECT id, design_id FROM render_share_links`),
    q(`SELECT id, share_link_id FROM render_consultation_requests`), q(`SELECT file_id, design_id FROM lead_file_renders`),
    q(`SELECT id, kind, href FROM notifications WHERE kind = 'render_feedback'`),
  ])
  let charged = ledger
  if (design) {
    const own = new Set(rooms.filter((r) => r.design_id === design).map((r) => String(r.id)))
    const jobIds = new Set(jobs.filter((j) => own.has(String(j.room_id))).map((j) => String(j.id)))
    charged = ledger.filter((l) => jobIds.has(String(l.ref_id).slice(7)))
  }
  return { credit_ledger: charged, render_jobs: jobs, project_rooms: rooms, render_annotations: annotations, render_share_links: links, render_consultation_requests: consults, lead_file_renders: fileRenders, notifications: bell }
}
async function paidWorkMoves(days: number, design: string | null): Promise<InStatement[]> {
  if (!days) return []
  const { PAID_WORK_TIMES, paidWorkIds, shiftMsList } = await import('../lib/credits/demo-month')
  const ids = paidWorkIds(await paidWorkRows(design))
  const out: InStatement[] = []
  for (const t of PAID_WORK_TIMES) {
    const list = [...(ids[t.table] ?? [])]
    if (!list.length) continue
    const inList = list.map(() => '?').join(', ')
    out.push({ sql: `UPDATE ${t.table} SET ${t.times.map((c) => `${c} = ${c} + ?`).join(', ')} WHERE ${t.key} IN (${inList})`, args: [...t.times.map(() => days * D), ...list] })   // a NULL stamp stays NULL
    if (t.ms) {
      for (const r of rows<{ id: string; v: string | null }>(await client.execute({ sql: `SELECT ${t.key} AS id, ${t.ms} AS v FROM ${t.table} WHERE ${t.key} IN (${inList})`, args: list }))) {
        const next = shiftMsList(r.v, days)
        if (next !== r.v) out.push({ sql: `UPDATE ${t.table} SET ${t.ms} = ? WHERE ${t.key} = ?`, args: [next as string, r.id] })
      }
    }
  }
  return out
}
/** The paid work's newest stamp (a client link's expiry aside) — R111 never moves the work past now, as restore never does (`snapshotMonth`). */
async function paidWorkLatest(): Promise<number> {
  const { PAID_WORK_TIMES, paidWorkIds } = await import('../lib/credits/demo-month')
  const ids = paidWorkIds(await paidWorkRows(null))
  let latest = 0
  for (const t of PAID_WORK_TIMES) {
    const list = [...(ids[t.table] ?? [])]
    const cols = t.times.filter((c) => c !== 'expires_at').map((c) => `coalesce(${c}, 0)`)
    if (!list.length || !cols.length) continue
    const expr = cols.length === 1 ? `max(${cols[0]})` : `max(max(${cols.join(', ')}))`
    const [r] = rows<{ at: number | null }>(await client.execute({ sql: `SELECT ${expr} AS at FROM ${t.table} WHERE ${t.key} IN (${list.map(() => '?').join(', ')})`, args: list }))
    latest = Math.max(latest, Number(r?.at ?? 0))
  }
  return latest
}

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

/* (pending modules S43C, R61 · R162) What the demo's AI Visualizer versions applied, worked out from the sample rooms as they are now — the
   pictures (public/visualizer/samples/*, public/visualizer/demo/*) are made by the engine from the same picks (scripts/viz/sample-looks.mts ·
   demo-renders.mts), so each version lists what its picture shows (REG-343). A whole-room look is the style's picks on every surface (the
   engine's restyle); the edit is DEMO_EDIT. */
type VizBlank = (kind: Applied['kind']) => Applied
const vizBlank: VizBlank = (kind) => ({ kind, surfaces: [], furniture: [], style: null, lighting: null, note: null, palette: null, scope: null })
const vizFinished = (m: ReturnType<typeof fromCatalogue>, label: string) => ({ materialId: m.id, name: m.name, hex: m.hex, finish: m.finish, pattern: m.pattern ?? null, label })
function demoLook(sampleKey: string, style: string, kind: 'restyle' | 'sketch'): { applied: Applied; finishes: Finishes } {
  const reading = sampleDetection(sampleByKey(sampleKey)!)
  const picks = restylePicks(reading.surfaces, style)
  const applied: Applied = { ...vizBlank(kind), style, surfaces: picks.map(({ def, m }) => ({ id: def.id, label: def.label, materialId: m.id, name: m.name })) }
  const finishes: Finishes = { ...NO_FINISHES, surfaces: Object.fromEntries(picks.map(({ def, m }) => [def.id, vizFinished(m, def.label)])), removed: [], customized: {}, style, ...(kind === 'sketch' ? { fromSketch: true } : {}) }
  return { applied, finishes }
}
function demoEdit(): { applied: Applied; finishes: Finishes } {
  const lr = sampleDetection(sampleByKey(DEMO_EDIT.sample)!)
  const sOf = (label: string) => lr.surfaces.find((x) => x.label === label)!, fOf = (label: string) => lr.furniture.find((x) => x.label === label)!
  const surfaces = DEMO_EDIT.surfaces.map((x) => { const c = fromCatalogue(catalogueItem(x.material)!); return { def: sOf(x.label), m: c } })
  const furniture = DEMO_EDIT.furniture.map((x) => ({ id: fOf(x.label).id, label: x.label, action: 'customize' as const, desc: composeCustomizeDesc(x.pick) || 'Customized' }))
  const applied: Applied = { ...vizBlank('edit'), surfaces: surfaces.map(({ def, m }) => ({ id: def.id, label: def.label, materialId: m.id, name: m.name })), furniture }
  const finishes: Finishes = { ...NO_FINISHES, surfaces: Object.fromEntries(surfaces.map(({ def, m }) => [def.id, vizFinished(m, def.label)])), removed: [], customized: Object.fromEntries(furniture.map((f) => [f.id, f.desc])) }
  return { applied, finishes }
}
/** Where the demo's two pins sit on the edit: the studio's on the walnut floor, Kevin's on the emerald sofa (the owner's living room). */
const VIZ_PINS = { studio: { x: 0.93, y: 0.9 }, client: { x: 0.4, y: 0.62 } }
const vizMaterials = (a: Applied) => a.surfaces.map((x) => ({ label: titleCaseLabel(x.label), material: x.name }))

async function main() {
  /* (REG-911, R68) A direct project's client (`leads.direct`) is no lead in the pipeline: the lead rules below never give it a trail, a quote or a
     contract — its project is its record. */
  const leads = rows<LeadRow>(await client.execute('SELECT * FROM leads WHERE coalesce(direct, 0) = 0'))
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
    /* (R68) a project's tasks keep the dates their rule gave them — their order must not move every other task's day */
    /* (pending modules S23, R140) a meeting's reminder is due on the meeting's own hour — that date belongs to the meeting, not to the calendar */
    'SELECT id, due_at, created_at FROM lead_tasks WHERE done = 0 AND due_at IS NOT NULL AND meeting_id IS NULL AND (lead_id IS NULL OR lead_id NOT IN (SELECT lead_id FROM projects)) ORDER BY created_at, id'))
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

  /* ── R163 · A quote that went to its client keeps the GST it went out with (S44O — call C3 · UAT rows 282 · 283, as recommended, her UAT ask
     2026-10-15) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     GST is now rounded once per rate (lib/quotes/math.ts `gstOfLines`, 'rate'); every quote already with its client (sent, confirmed or signed)
     was worked out per line. Each one without a stamp gets the rule its stored amount was worked out by — per line, unless its amount is the
     new rule's figure and not the old one's (an order this repair seeded since) — so no figure a client has read ever moves. Runs BEFORE R23,
     which re-adds every quote's lines under its stamp. A quote not yet with its client keeps none: it follows today's rule. Idempotent. */
  console.log('\nR163 a sent quote keeps the GST it went out with')
  /* the stamp, by the stored amount — run here, before R23 re-adds the lines, and once more before the checks for a quote this run seeded since */
  const stampSentGst = async (): Promise<{ line: number; rate: number }> => {
    const sent = rows<{ id: string; additional_discount_mode: string; additional_discount_value: number; gst_enabled: number; discounts_json: string | null; amount_minor: number }>(await client.execute(
      `SELECT id, additional_discount_mode, additional_discount_value, gst_enabled, discounts_json, amount_minor FROM quotes WHERE gst_rule IS NULL AND (client_sent_at IS NOT NULL OR status IN ('Confirmed', 'Signed'))`))
    let line = 0, rate = 0
    for (const q of sent) {
      const items = rows<{ id: string; parent_id: string | null; kind: string; status: string; qty: number; cost_minor: number; markup_minor: number; discount_pct: number; gst_pct: number; optional: number; print_as: string | null; priced_after: number | null }>(await client.execute({ sql: 'SELECT id, parent_id, kind, status, qty, cost_minor, markup_minor, discount_pct, gst_pct, optional, print_as, priced_after FROM quote_items WHERE quote_id = ?', args: [q.id] }))
      const lines = items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: i.status, qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: i.discount_pct, gstPct: i.gst_pct, optional: Number(i.optional) === 1, printAs: i.print_as, pricedAfter: Number(i.priced_after) === 1 }))
      const pricing = { additionalDiscountMode: q.additional_discount_mode, additionalDiscountValue: q.additional_discount_value, gstEnabled: q.gst_enabled === 1, discounts: parseDiscounts(q.discounts_json) }
      const byLine = quoteTotals(lines, { ...pricing, gstRule: 'line' }).totalMinor, byRate = quoteTotals(lines, { ...pricing, gstRule: 'rate' }).totalMinor
      const rule = items.length && q.amount_minor === byRate && q.amount_minor !== byLine ? 'rate' : 'line'
      await client.execute({ sql: `UPDATE quotes SET gst_rule = ? WHERE id = ? AND gst_rule IS NULL`, args: [rule, q.id] })
      if (rule === 'line') line++; else rate++
    }
    return { line, rate }
  }
  {
    const { line, rate } = await stampSentGst()
    note(`${line} sent quote(s) keep GST rounded per line, ${rate} once per rate — every other quote follows today's rule`)
  }

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
  /* (pending modules S04 — a line's status dropped, R106) the client passing on the cove lighting is what 2.0 records for it: an optional work the
     client said no to — out of every total, as Declined was, and saying why in its row */
  const passed = await client.execute(`UPDATE quote_items SET optional = 1, client_choice = 'skip' WHERE parent_id IS NULL AND kind = 'item' AND name = 'False ceiling with cove lighting' AND (optional = 0 OR coalesce(client_choice, '') <> 'skip')
    AND quote_id = (SELECT id FROM quotes WHERE number = 'OM-10008' AND deleted_at IS NULL)`)
  note(`${followed.rowsAffected} child lines follow their group's answer · ${passed.rowsAffected} line(s) the client passed on, on OM-10008`)
  // the amount is what the lines add up to — for every live quote, lines or none
  /* (pending modules S04) as the app adds them up (lib/quotes/math.ts `quoteTotals`): an optional line and a line printing a word stay out, the named
     discounts come off — the sum read only the status before, which counted the line the client passed on once it became an optional work */
  /* (S44O — call C3, R163) under each quote's own GST rounding; (S44O) and a section priced after the contract stays out (S44T's rule, which this
     sum had not learnt) */
  const allQuotes = rows<{ id: string; additional_discount_mode: string; additional_discount_value: number; gst_enabled: number; discounts_json: string | null; gst_rule: string | null }>(await client.execute(`SELECT id, additional_discount_mode, additional_discount_value, gst_enabled, discounts_json, gst_rule FROM quotes WHERE deleted_at IS NULL`))
  for (const q of allQuotes) {
    const items = rows<{ id: string; parent_id: string | null; kind: string; status: string; qty: number; cost_minor: number; markup_minor: number; discount_pct: number; gst_pct: number; optional: number; print_as: string | null; priced_after: number | null }>(await client.execute({ sql: 'SELECT id, parent_id, kind, status, qty, cost_minor, markup_minor, discount_pct, gst_pct, optional, print_as, priced_after FROM quote_items WHERE quote_id = ?', args: [q.id] }))
    if (items.length === 0) continue
    const t = quoteTotals(items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: i.status, qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: i.discount_pct, gstPct: i.gst_pct, optional: Number(i.optional) === 1, printAs: i.print_as, pricedAfter: Number(i.priced_after) === 1 })),
      { additionalDiscountMode: q.additional_discount_mode, additionalDiscountValue: q.additional_discount_value, gstEnabled: q.gst_enabled === 1, discounts: parseDiscounts(q.discounts_json), gstRule: q.gst_rule })
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
     FROM quotes q JOIN leads l ON l.id = q.lead_id WHERE q.deleted_at IS NULL AND q.kind <> 'variation' AND NOT EXISTS (SELECT 1 FROM quote_payments p WHERE p.quote_id = q.id) ORDER BY q.number`))   /* (Projects round 5) a variation order has none */
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
     FROM quotes q WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND q.kind <> 'variation' AND NOT EXISTS (SELECT 1 FROM quote_files x WHERE x.quote_id = q.id) ORDER BY q.number`))   /* (Projects round 5) not a variation order */
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
     that design — the template, its draft, its versions — is moved the same way, and only where it still sits at 16.
     (S44T — UAT rows 312 · 351, M11, her UAT ask 2026-10-15) …and only on the three templates R31 seeded: no repair writes a studio's own
     template — "template adjustments are lost after bug fixes and releases" must never be true. */
  console.log('\nR37 Letter footer geometry')
  {
    const seeded = ['Default Quote PDF', '4-Room BTO', '5-Room BTO'].map((n) => sid(n, 'quote_template'))
    const inSeeded = `(${seeded.map(() => '?').join(', ')})`
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
    for (const r of rows<{ id: string; design_json: string | null; draft_json: string | null }>(await client.execute({ sql: `SELECT id, design_json, draft_json FROM quote_templates WHERE id IN ${inSeeded}`, args: seeded }))) {
      const design = fix(r.design_json)
      let draft: string | null = null
      if (r.draft_json) { try { const j = JSON.parse(r.draft_json) as { design?: unknown }; const fixed = fix(JSON.stringify(j.design ?? null)); if (fixed) draft = JSON.stringify({ ...j, design: JSON.parse(fixed) }) } catch { draft = null } }
      if (design || draft) { await client.execute({ sql: `UPDATE quote_templates SET design_json = COALESCE(?, design_json), draft_json = COALESCE(?, draft_json) WHERE id = ?`, args: [design, draft, r.id] }); moved++ }
    }
    for (const v of rows<{ id: string; design_json: string | null }>(await client.execute({ sql: `SELECT id, design_json FROM quote_template_versions WHERE template_id IN ${inSeeded}`, args: seeded }))) {
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
    const newest = rows<{ id: string; name: string; source: string; created_at: number }>(await client.execute(`SELECT id, name, source, created_at FROM leads WHERE deleted_at IS NULL AND coalesce(direct, 0) = 0 ORDER BY created_at DESC LIMIT 2`))
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
        /* the versions: each what it applied, what the room shows after it, and where it came from (pending modules S43C: a look is the
           engine's restyle of the photo, its picks listed — demoLook; the edit is demoEdit) */
        const { applied: edit, finishes: editFin } = demoEdit()
        const golden = presetById(DEMO_EDIT.relit.preset)!.label
        const lrJapandi = demoLook('living-room', 'Japandi', 'restyle'), kScandi = demoLook('kitchen', 'Scandinavian', 'restyle')
        const lr = sampleByKey('living-room')!
        type Job = { id: string; room: string; kind: Applied['kind']; by: string; at: number; image: string; parent: string; applied: Applied; finishes: Finishes; n: number }
        const J = (room: string, tag: string) => sid(leadId, `viz-job-${room}-${tag}`)
        const jobs: Job[] = [
          { id: J('living-room', 'japandi'), room: 'living-room', kind: 'restyle', by: 'dane', at: t0 + 10 * 60, image: lr.looks.Japandi!, parent: ORIGINAL, applied: lrJapandi.applied, finishes: lrJapandi.finishes, n: 1 },
          { id: J('living-room', 'edit'), room: 'living-room', kind: 'edit', by: 'dane', at: t0 + 25 * 60, image: DEMO_EDIT.image, parent: ORIGINAL, applied: edit, finishes: editFin, n: 2 },
          { id: J('living-room', 'golden'), room: 'living-room', kind: 'relight', by: 'dane', at: t0 + 40 * 60, image: DEMO_EDIT.relit.image, parent: versionKey(J('living-room', 'edit'), 1), applied: { ...vizBlank('relight'), lighting: golden }, finishes: { ...editFin, lighting: golden }, n: 3 },
          { id: J('bedroom', 'golden'), room: 'bedroom', kind: 'relight', by: 'michelle', at: t0 + 55 * 60, image: sampleByKey('bedroom')!.relit!['golden-hour']!, parent: ORIGINAL, applied: { ...vizBlank('relight'), lighting: golden }, finishes: { ...NO_FINISHES, lighting: golden }, n: 1 },
          { id: J('kitchen', 'scandinavian'), room: 'kitchen', kind: 'restyle', by: 'michelle', at: t0 + 70 * 60, image: sampleByKey('kitchen')!.looks.Scandinavian!, parent: ORIGINAL, applied: kScandi.applied, finishes: kScandi.finishes, n: 1 },
        ]
        for (const j of jobs) {
          const v: Variant = { id: 1, n: j.n, imageUrl: j.image, materials: vizMaterials(j.applied), parentKey: j.parent, applied: j.applied, finishes: j.finishes, deletedAt: null }
          await client.execute({ sql: `INSERT OR IGNORE INTO render_jobs (id, room_id, lead_id, project_id, model, status, kind, style, variants_json, created_by, created_at, completed_at) VALUES (?, ?, ?, NULL, 'fast', 'completed', ?, ?, ?, ?, ?, ?)`, args: [j.id, roomId[j.room]!, leadId, j.kind, descriptor(j.applied), JSON.stringify([v]), j.by, j.at, j.at] })
        }
        const byKey = new Map(jobs.map((j) => [versionKey(j.id, 1), j]))
        const lrEdit = versionKey(J('living-room', 'edit'), 1), lrGold = versionKey(J('living-room', 'golden'), 1), brGold = versionKey(J('bedroom', 'golden'), 1)
        /* a note the studio pinned on the edit */
        await client.execute({ sql: `INSERT OR IGNORE INTO render_annotations (id, job_id, variant_id, x, y, body, status, author_role, author_member_id, author_name, comments_json, created_at, updated_at) VALUES (?, ?, 1, ${VIZ_PINS.studio.x}, ${VIZ_PINS.studio.y}, ?, 'open', 'studio', 'dane', 'Dane', '[]', ?, ?)`,
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
        await client.execute({ sql: `INSERT OR IGNORE INTO render_annotations (id, job_id, variant_id, x, y, body, status, author_role, author_member_id, author_name, comments_json, created_at, updated_at) VALUES (?, ?, 1, ${VIZ_PINS.client.x}, ${VIZ_PINS.client.y}, ?, 'open', 'client', NULL, ?, ?, ?, ?)`,
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
      const { applied, finishes } = demoLook('kitchen', 'Japandi', 'sketch')   // (pending modules S43C) the sketch rendered Japandi = the photo in Japandi's picks
      const v: Variant = { id: 1, n: 1, imageUrl: kitchen.looks.Japandi!, materials: vizMaterials(applied), parentKey: ORIGINAL, applied, finishes, deletedAt: null }
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

  /* ── R67 · Default Quote PDF's new quotes open with the Category column (Dane UAT 2026-10-01, Figma 1549:34 pt 3) ───────────────────
     Category is the column a line moves by under a template that prints by trade, and a View by › Category bucket is its value — so the
     studio default's New quotes › "Items table opens with" includes it. The defaults live with the template (REG-538 · REG-578: what a new
     quote takes once published), so the change lands on the published defaults AND on the current version's row that a quote pins to — and
     on an unpublished draft's defaults, so its next Publish keeps it. A template that already opens with Category is left alone; quotes
     already made keep their own columns. */
  console.log('\nR67 Default Quote PDF opens with Category')
  {
    const { DEFAULT_COLUMNS } = await import('../lib/quotes/items-model')
    const id = sid('Default Quote PDF', 'quote_template')
    const withCategory = (json: string | null): string | null => {
      if (!json) return null
      let d: { columns?: string[] | null } & Record<string, unknown>
      try { d = JSON.parse(json) as typeof d } catch { return null }
      const cols = Array.isArray(d.columns) ? d.columns : DEFAULT_COLUMNS.columns.filter((c) => c.on).map((c) => c.key)
      if (cols.includes('category')) return null
      return JSON.stringify({ ...d, columns: [...cols, 'category'] })
    }
    const [t] = rows<{ version: number; defaults_json: string | null; draft_json: string | null }>(await client.execute({ sql: `SELECT version, defaults_json, draft_json FROM quote_templates WHERE id = ? AND deleted_at IS NULL`, args: [id] }))
    let done = 0
    if (t) {
      const pub = withCategory(t.defaults_json)
      if (pub) { await client.execute({ sql: `UPDATE quote_templates SET defaults_json = ? WHERE id = ?`, args: [pub, id] }); done++ }
      const [v] = rows<{ id: string; defaults_json: string | null }>(await client.execute({ sql: `SELECT id, defaults_json FROM quote_template_versions WHERE template_id = ? AND version = ?`, args: [id, t.version] }))
      const ver = v ? withCategory(v.defaults_json) : null
      if (v && ver) { await client.execute({ sql: `UPDATE quote_template_versions SET defaults_json = ? WHERE id = ?`, args: [ver, v.id] }); done++ }
      if (t.draft_json) {
        try {
          const dr = JSON.parse(t.draft_json) as { defaults?: unknown }
          const next = dr.defaults ? withCategory(JSON.stringify(dr.defaults)) : null
          if (next) { await client.execute({ sql: `UPDATE quote_templates SET draft_json = ? WHERE id = ?`, args: [JSON.stringify({ ...dr, defaults: JSON.parse(next) }), id] }); done++ }
        } catch { /* a draft that does not parse is the editor's to mend */ }
      }
    }
    note(t ? `${done} of Default Quote PDF's defaults given the Category column (published · v${t.version} · draft)` : 'Default Quote PDF not found — nothing to change')
  }

  /* ── R68 · Projects round 1 — the Won leads' projects and one direct project (REG-911…932, owner 2026-10-05: "build all of it with your
     recommendations") ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
     Won creates the project in the same press (Q-02), so every Won lead carries one, made at its Won move's time by whoever was on it,
     numbered in the order they were won (Settings › Projects' default, P-{YYYY}-{seq}), naming the signed quote and contract, with its
     `project_created` event. Its dates come from the signed quote's Payment Schedule estimates (Commencement → the start, the last row →
     the target end): a project whose works have begun is In progress, started on that date, with the event; one whose start has not come
     is still Setting up. Aisha Rahman's Won move was logged five days before her signature (L-274) — it is moved to two hours after it, from
     Quote Sent, as Benjamin's and Ryan's were. One direct project (Q-04) for a client who came straight to the studio, with its lead row
     marked `direct`, its member, its event and a first task. A task on each running project makes its Tasks tab and the attention tile real. */
  console.log('\nR68 projects')
  {
    const { formatProjectNumber, DEFAULT_PROJECT_NUMBERING, nextProjectSeq, defaultProjectName } = await import('../lib/projects/model')
    const { withEstimates } = await import('../lib/quotes/payments')
    const dayStart = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
    let fixed = 0, made = 0, started = 0, tasks = 0
    /* Aisha's (and any) Won log that precedes the signature it needed */
    const early = rows<{ id: string; lead_id: string; created_at: number; signed: number }>(await client.execute(`SELECT s.id, s.lead_id, s.created_at, (SELECT max(c.signed_at) FROM contracts c WHERE c.lead_id = s.lead_id AND c.status = 'Signed' AND c.deleted_at IS NULL) AS signed FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.to_stage = 'Won' AND l.stage = 'Won' AND coalesce(l.direct, 0) = 0 AND l.deleted_at IS NULL`))
    for (const g of early) {
      if (!g.signed || g.created_at >= g.signed) continue
      const [prev] = rows<{ to_stage: string }>(await client.execute({ sql: `SELECT to_stage FROM stage_logs WHERE lead_id = ? AND id <> ? AND to_stage IN ('New','Contacted','Met','Quote Sent') ORDER BY created_at DESC LIMIT 1`, args: [g.lead_id, g.id] }))
      await client.execute({ sql: `UPDATE stage_logs SET created_at = ?, from_stage = ? WHERE id = ?`, args: [g.signed + 2 * H, prev?.to_stage ?? 'Quote Sent', g.id] })
      fixed++
    }
    const have = new Set(rows<{ lead_id: string }>(await client.execute(`SELECT lead_id FROM projects`)).map((p) => p.lead_id))
    const numbers = rows<{ number: string }>(await client.execute(`SELECT number FROM projects`)).map((p) => p.number)
    type Won = { id: string; name: string; property_type: string; estimated_start_date: number | null; won_at: number; payload: string | null }
    const won = rows<Won>(await client.execute(`SELECT l.id, l.name, l.property_type, l.estimated_start_date, s.created_at AS won_at, s.payload FROM leads l JOIN stage_logs s ON s.lead_id = l.id AND s.to_stage = 'Won' AND s.created_at = (SELECT max(x.created_at) FROM stage_logs x WHERE x.lead_id = l.id AND x.to_stage = 'Won') WHERE l.stage = 'Won' AND l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 ORDER BY s.created_at`))
    /* the direct project's client — a Singapore homeowner with no lead history (invented, REG-932) */
    const directLead = sid('direct:marcus-teo', 'lead')
    const directAt = D0 - 3 * D + 10 * H + 20 * 60
    const queue: { leadId: string; at: number }[] = [...won.filter((w) => !have.has(w.id)).map((w) => ({ leadId: w.id, at: w.won_at })), ...(have.has(directLead) ? [] : [{ leadId: directLead, at: directAt }])].sort((a, b) => a.at - b.at)
    const numberOf = new Map<string, string>()
    for (const q of queue) { const n = formatProjectNumber(DEFAULT_PROJECT_NUMBERING, nextProjectSeq(numbers, DEFAULT_PROJECT_NUMBERING), new Date(q.at * 1000)); numbers.push(n); numberOf.set(q.leadId, n) }
    /* each running project's first task, in the order they were won: the handover being booked, a cabinet order now overdue (the reason it
       needs attention), the carpentry date to confirm */
    const FIRST_TASKS: [string, number][] = [['Book the handover inspection', 10], ['Order the kitchen cabinets', -2], ['Confirm the carpentry install date', 3]]
    let runningIdx = 0
    for (const w of won) {
      if (have.has(w.id)) continue
      const members = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [w.id] })).map((m) => m.member_id)
      const actor = members[0] ?? 'dane'
      let payload: Partial<WizardData> = {}
      try { payload = w.payload ? (JSON.parse(w.payload) as Partial<WizardData>) : {} } catch { /* a payload that does not read keeps the defaults */ }
      const [q] = rows<{ id: string; created_at: number }>(await client.execute({ sql: `SELECT id, created_at FROM quotes WHERE lead_id = ? AND status = 'Signed' AND deleted_at IS NULL ORDER BY signed_at DESC LIMIT 1`, args: [w.id] }))
      const [c] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM contracts WHERE lead_id = ? AND status = 'Signed' AND deleted_at IS NULL ORDER BY signed_at DESC LIMIT 1`, args: [w.id] }))
      /* the schedule's estimates: the first estimated stage is the start of works, the last the handover */
      let start: number | null = null, end: number | null = null
      if (q) {
        const pays = rows<{ name: string; pct: number; due_kind: string; due_at: number | null }>(await client.execute({ sql: `SELECT name, pct, due_kind, due_at FROM quote_payments WHERE quote_id = ? ORDER BY position`, args: [q.id] }))
        const anchors = scheduleAnchors({ estimatedStart: w.estimated_start_date ? new Date(w.estimated_start_date * 1000) : null, quoteCreated: new Date(q.created_at * 1000), propertyType: w.property_type })
        const est = withEstimates(pays.map((r) => ({ dueKind: (r.due_kind === 'approval' || r.due_kind === 'fixed' ? r.due_kind : 'estimate') as 'approval' | 'estimate' | 'fixed', dueAt: r.due_at ? new Date(r.due_at * 1000) : null })), anchors).filter((r) => r.dueKind !== 'approval' && r.dueAt)
        if (est.length) { start = dayStart(Math.floor(est[0]!.dueAt!.getTime() / 1000)); end = dayStart(Math.floor(est[est.length - 1]!.dueAt!.getTime() / 1000)) }
      }
      const id = sid(w.id, 'project')
      const name = defaultProjectName(w.property_type, w.name)
      const number = numberOf.get(w.id)!
      const begun = start !== null && start + 9 * H <= NOW
      const startedAt = begun ? start! + 9 * H : null
      const updated = Math.max(w.won_at, startedAt ?? 0, start !== null ? w.won_at + D : 0)
      await client.execute({ sql: `INSERT OR IGNORE INTO projects (id, lead_id, number, name, stage, project_type, quote_id, contract_id, agreed_value_minor, payment_template, start_date, target_end_date, started_at, completed_at, created_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?,?,?,NULL,?,?,?,NULL,NULL)`,
        args: [id, w.id, number, name, begun ? 'in_progress' : 'setting_up', payload.projectType ?? 'Whole-home renovation', q?.id ?? null, c?.id ?? null, begun ? start : null, begun ? end : null, startedAt, actor, w.won_at, updated] })
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, 'ev:created'), w.id, 'project_created', actor, w.won_at, JSON.stringify({ name, number, direct: false }), id] })
      made++
      if (begun) {
        const fields = [{ key: 'startDate', label: 'Start date', from: '—', to: displayDate(new Date(start! * 1000)) }, { key: 'targetEndDate', label: 'Target end date', from: '—', to: displayDate(new Date(end! * 1000)) }]
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, 'ev:dates'), w.id, 'project_edited', actor, w.won_at + D, JSON.stringify({ name, number, fields }), id] })
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, 'ev:started'), w.id, 'project_started', actor, startedAt, JSON.stringify({ name, number, when: new Date(start! * 1000).toISOString() }), id] })
        started++
        /* a running project's first task — its Tasks tab, and (overdue) the reason it needs attention */
        const t = sid(id, 'task:first')
        const [title, offset] = FIRST_TASKS[runningIdx++ % FIRST_TASKS.length]!
        const due = D0 + offset * D + 10 * H
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO lead_tasks (id, lead_id, quote_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at, template_id, contract_id) VALUES (?,?,NULL,?,'General',?,0,?,?,NULL,?,?,NULL,NULL)`, args: [t, w.id, title, due, startedAt! + 2 * H, actor, startedAt! + 2 * H, startedAt! + 2 * H] })
        if (r.rowsAffected) { for (const m of members) await client.execute({ sql: `INSERT OR IGNORE INTO task_assignees (task_id, member_id) VALUES (?,?)`, args: [t, m] }); tasks++ }
      }
    }
    /* the direct project — Q-04: the client's details in a lead row marked direct; its project Setting up with the start date set */
    if (!have.has(directLead)) {
      const id = sid(directLead, 'project')
      const name = defaultProjectName('Condo 3-bedder', 'Marcus Teo')
      const number = numberOf.get(directLead)!
      const split = { template: 'default', rows: [{ name: 'Deposit', pct: 10 }, { name: 'Commencement', pct: 30 }, { name: 'Mid-Project', pct: 30 }, { name: 'Completion', pct: 30 }] }
      const startOn = D0 + 18 * D
      await client.batch([
        { sql: `INSERT OR IGNORE INTO leads (id, name, phone, email, source, property_type, property_address, lead_address, budget_minor, stage, style, key_collection, condition, area_sqft, estimated_start_date, notes, area, ic_number, customer_id, qanvast_lead_id, deleted_at, seen_at, delete_reason, stage_before_delete, created_at, updated_at, direct) VALUES (?,?,?,?,?,?,?,NULL,?,'Won',NULL,NULL,NULL,NULL,NULL,NULL,'Central',NULL,NULL,NULL,NULL,?,NULL,NULL,?,?,1)`,
          args: [directLead, 'Marcus Teo', '96513842', 'marcus.teo@gmail.com', 'Others', 'Condo 3-bedder', 'The Tre Ver, 2 Potong Pasir Avenue 1, #11-04', 4_860_000, directAt, directAt, directAt] },
        { sql: `INSERT OR IGNORE INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?,?,?,?)`, args: [sid(directLead, 'assignee'), directLead, 'germaine', directAt] },
        { sql: `INSERT OR IGNORE INTO projects (id, lead_id, number, name, stage, project_type, quote_id, contract_id, agreed_value_minor, payment_template, start_date, target_end_date, started_at, completed_at, created_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?,?,?,?,'setting_up','Partial renovation',NULL,NULL,?,?,?,NULL,NULL,NULL,'dane',?,?,NULL,NULL)`,
          args: [id, directLead, number, name, 4_860_000, JSON.stringify(split), startOn, directAt, directAt + D] },
        { sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, 'ev:created'), directLead, 'project_created', 'dane', directAt, JSON.stringify({ name, number, direct: true }), id] },
        { sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, 'ev:dates'), directLead, 'project_edited', 'germaine', directAt + D, JSON.stringify({ name, number, fields: [{ key: 'startDate', label: 'Start date', from: '—', to: displayDate(new Date(startOn * 1000)) }] }), id] },
        { sql: `INSERT OR IGNORE INTO lead_tasks (id, lead_id, quote_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at, template_id, contract_id) VALUES (?,?,NULL,?,'General',?,0,?,?,NULL,?,?,NULL,NULL)`,
          args: [sid(id, 'task:first'), directLead, 'Confirm the site measurements with Marcus', D0 + 4 * D + 11 * H, directAt + D + H, 'germaine', directAt + D + H, directAt + D + H] },
        { sql: `INSERT OR IGNORE INTO task_assignees (task_id, member_id) VALUES (?,?)`, args: [sid(id, 'task:first'), 'germaine'] },
      ], 'write')
      made++; tasks++
    }
    note(`${fixed} Won log(s) moved after their signature · ${made} project(s) made (${started} in progress) · ${tasks} first task(s)`)
  }

  /* ── R69 · Projects round 2 — the Schedule (owner 2026-10-05: "build all of it with your recommendations"; the Project Schedule Proposal)
     Every running project gets the schedule Create schedule › The signed quote would have made on the day it started (one milestone per stage
     of work its lines call for, laid from its start date — lib/projects/schedule-phases.ts — the handover stretched to the target end the
     project already carries), with its `project_schedule_created` line; payments tied as Create schedule ties them. What has happened since
     is written with its trail (REG-343): a milestone whose last day has passed is done (a `project_milestone_status` line), the one running
     today is in progress. Benjamin Han's is the canvas's: 21 Aug – 13 Nov as shared with him on 2 Oct (the snapshot, the plan dates), he
     confirmed Electrical & plumbing the next day, Painting waits on him for paint colours, then carpentry ran a week late (the move's line,
     the target end following it) — four changes he has not been shown; 6 of 14 carpentry tasks done, three painting tasks. Ryan D'Souza's
     plumbing is late and waiting on the plumber, shared and up to date; his carpentry ends in three days (the bell's two reminders for
     Michelle). Aisha Rahman's has never been shared. Marcus Teo's (setting up, no quote) has none — the Start card; two schedule templates
     sit in Company › Templates › Schedules. */
  console.log('\nR69 project schedules')
  {
    const { dayOf, dateOfDay, snapshotOf, clientRows, scheduleChanges, rangeLabel } = await import('../lib/projects/schedule-model')
    const { draftsFromPhases, phasesFor } = await import('../lib/projects/schedule-phases')
    type Ms = Parameters<typeof snapshotOf>[0][number]
    const sec = (day: number, hour = 0) => Math.floor(dateOfDay(day).getTime() / 1000) + hour * H
    const today = dayOf(new Date(D0 * 1000))
    let made = 0, tasksMade = 0, shares = 0, templates = 0
    const ev = (id: string, leadId: string, projectId: string, kind: string, actor: string, at: number, detail: object) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, leadId, kind, actor, at, JSON.stringify(detail), projectId] })
    /* two templates for the library and the Start card's second way in */
    const TPLS: { key: string; name: string; at: number; items: [string, number, number, boolean][] }[] = [
      { key: 'renovation', name: 'Whole-home renovation (HDB)', at: D0 - 40 * D + 10 * H, items: [['Hacking & demolition', 8, 0, false], ['Masonry & tiling', 19, 3, false], ['Electrical & plumbing', 19, -4, false], ['Carpentry fabrication', 26, -4, false], ['Painting', 10, 3, false], ['Cleaning & touch-up', 5, 1, false], ['Handover & defect check', 4, 1, true]] },
      { key: 'refresh', name: 'Kitchen and bathroom refresh', at: D0 - 21 * D + 15 * H, items: [['Hacking', 4, 0, false], ['Plumbing & tiling', 10, 1, false], ['Carpentry install', 12, 1, false], ['Cleaning', 2, 1, false], ['Handover', 2, 1, true]] },
    ]
    for (const t of TPLS) {
      const id = sid(`schedule-template:${t.key}`, 'schedule_template')
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO schedule_templates (id, name, created_by, updated_by, created_at, updated_at, deleted_at, folder_id) VALUES (?,?,'dane','dane',?,?,NULL,NULL)`, args: [id, t.name, t.at, t.at] })
      if (r.rowsAffected) {
        templates++
        for (const [i, [title, days, gap, ask]] of t.items.entries()) await client.execute({ sql: `INSERT OR IGNORE INTO schedule_template_items (id, template_id, position, title, days, gap_days, ask_confirm) VALUES (?,?,?,?,?,?,?)`, args: [sid(`${id}:${i}`, 'schedule_item'), id, i, title, days, gap, ask ? 1 : 0] })
      }
    }
    type P = { id: string; lead_id: string; name: string; number: string; quote_id: string | null; start_date: number; target_end_date: number | null; lead: string }
    const running = rows<P>(await client.execute(`SELECT p.id, p.lead_id, p.name, p.number, p.quote_id, p.start_date, p.target_end_date, l.name AS lead FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NULL AND p.stage = 'in_progress' AND p.start_date IS NOT NULL AND p.quote_id IS NOT NULL ORDER BY p.created_at`))
    for (const p of running) {
      const have = rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM project_milestones WHERE project_id = ?`, args: [p.id] }))[0]?.n ?? 0
      if (have) continue
      const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [p.lead_id] })).map((m) => m.member_id)
      const designer = team.find((m) => m !== 'dane') ?? team[0] ?? 'dane'
      const benjamin = /^Benjamin Han/.test(p.lead), ryan = /^Ryan/.test(p.lead)
      const trades = rows<{ category: string | null }>(await client.execute({ sql: `SELECT category FROM quote_items WHERE quote_id = ? AND kind <> 'group' ORDER BY position`, args: [p.quote_id] })).map((r) => r.category)
      const start = dayOf(new Date(p.start_date * 1000))
      const drafts = draftsFromPhases(phasesFor(trades), start)
      /* Ryan's carpentry a day shorter, so it ends three days from today (the bell's "Ends in 3 days"); what follows keeps its gaps */
      if (ryan) { const c = drafts.findIndex((d) => d.title.startsWith('Carpentry')); if (c >= 0) { const delta = -1; for (let i = c; i < drafts.length; i++) { if (i === c) drafts[i]!.end += delta; else { const len = drafts[i]!.end - drafts[i]!.start; const prev = drafts[i - 1]!; const s = prev.end + drafts[i]!.gap; drafts[i]!.start = s; drafts[i]!.end = s + len } } } }
      const last = drafts[drafts.length - 1]
      if (last && p.target_end_date) { const t = dayOf(new Date(p.target_end_date * 1000)); if (t >= last.start) last.end = t }
      const ids = drafts.map((_, i) => sid(`${p.id}:${i}`, 'milestone'))
      /* payments as Create schedule ties them: the first estimated stage at works start, the last at the handover, the others on the milestone
         that ends nearest their estimate */
      const pays = rows<{ id: string; due_kind: string; due_at: number | null }>(await client.execute({ sql: `SELECT id, due_kind, due_at FROM quote_payments WHERE quote_id = ? AND due_kind <> 'approval' ORDER BY position`, args: [p.quote_id] }))
      const ties = new Map<number, { ref: string; due: 'start' | 'end' }>()
      pays.forEach((r, k) => {
        const li = drafts.length - 1
        if (k === 0) ties.set(0, { ref: r.id, due: 'start' })
        else if (k === pays.length - 1) ties.set(li, { ref: r.id, due: 'end' })
        else { const want = r.due_at ? dayOf(new Date(r.due_at * 1000)) : null; const at = want === null ? Math.round((k * li) / (pays.length - 1)) : drafts.reduce((b, d, i) => (Math.abs(d.end - want) < Math.abs(drafts[b]!.end - want) ? i : b), 0); if (!ties.has(at)) ties.set(at, { ref: r.id, due: 'end' }) }
      })
      const madeAt = p.start_date + 9 * H + 30 * 60   // set up the morning works began, after the project was started
      const statusOf = (i: number): string => { const d = drafts[i]!; return d.end < today ? 'done' : d.start <= today ? 'in_progress' : 'not_started' }
      for (const [i, d] of drafts.entries()) {
        let status = statusOf(i)
        if (ryan && d.title.startsWith('Electrical')) status = 'blocked'   // the pressure test never signed off: late, and waiting on the plumber
        const done = status === 'done'
        await client.execute({ sql: `INSERT OR IGNORE INTO project_milestones (id, project_id, title, position, start_date, end_date, status, follows_id, gap_days, payment_ref, payment_due, client_visible, confirm_asked_at, confirm_answer, confirm_note, confirm_answered_at, waiting_on, waiting_member_id, waiting_name, waiting_note, waiting_since, waiting_until, plan_start_date, plan_end_date, done_at, created_by, updated_by, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,?,?,?,?,?,NULL)`,
          args: [ids[i]!, p.id, d.title, i, sec(d.start), sec(d.end), status, d.follows !== null ? ids[d.follows]! : null, d.gap, ties.get(i)?.ref ?? null, ties.get(i)?.due ?? 'end', d.askConfirm ? madeAt : null, done ? sec(d.end, 17) : null, designer, designer, madeAt, done ? sec(d.end, 17) : madeAt] })
        if (status === 'done') await ev(sid(ids[i]!, 'ev:done'), p.lead_id, p.id, 'project_milestone_status', designer, sec(d.end, 17), { name: p.name, number: p.number, id: ids[i], title: d.title, from: 'In progress', to: 'Done' })
        if (status !== 'not_started') await ev(sid(ids[i]!, 'ev:running'), p.lead_id, p.id, 'project_milestone_status', designer, sec(d.start, 9), { name: p.name, number: p.number, id: ids[i], title: d.title, from: 'Not started', to: 'In progress' })
        if (ryan && status === 'blocked') await ev(sid(ids[i]!, 'ev:blocked'), p.lead_id, p.id, 'project_milestone_status', designer, sec(d.end - 3, 16), { name: p.name, number: p.number, id: ids[i], title: d.title, from: 'In progress', to: 'Blocked' })
      }
      await ev(sid(p.id, 'ev:schedule'), p.lead_id, p.id, 'project_schedule_created', designer, madeAt, { name: p.name, number: p.number, n: drafts.length, source: 'from the signed quote' })
      made++
      const at = (title: string) => ids[drafts.findIndex((d) => d.title.startsWith(title))]!
      /* Ryan: the plumber's pressure test, waited on since three days before plumbing was due to end; shared after, so his client is up to date */
      if (ryan) {
        const el = at('Electrical'), elD = drafts.find((d) => d.title.startsWith('Electrical'))!
        await client.execute({ sql: `UPDATE project_milestones SET waiting_on = 'supplier', waiting_name = 'the plumber', waiting_note = 'The pressure test sign-off', waiting_since = ?, updated_at = ? WHERE id = ? AND waiting_on IS NULL`, args: [sec(elD.end - 3, 16), sec(elD.end - 3, 16), el] })
        await ev(sid(el, 'ev:waiting'), p.lead_id, p.id, 'project_milestone_edited', designer, sec(elD.end - 3, 16) + 60, { name: p.name, number: p.number, id: el, title: elD.title, fields: [{ key: 'waiting', label: 'Waiting on', from: 'nobody', to: 'supplier' }] })
      }
      /* the first task on each project goes inside the milestone it belongs to */
      const firstTask = sid(p.id, 'task:first')
      const firstTitle = rows<{ title: string }>(await client.execute({ sql: `SELECT title FROM lead_tasks WHERE id = ?`, args: [firstTask] }))[0]?.title ?? ''
      const home = /handover/i.test(firstTitle) ? at('Handover') : /carpentry|cabinet/i.test(firstTitle) ? at('Carpentry') : null
      if (home) await client.execute({ sql: `UPDATE lead_tasks SET milestone_id = ? WHERE id = ? AND milestone_id IS NULL`, args: [home, firstTask] })

      if (benjamin) {
        const el = at('Electrical'), ca = at('Carpentry'), pa = at('Painting')
        const shareAt = D0 - 3 * D + 18 * H   // Fri 2 Oct, the evening electrical finished
        /* the copy he was shown: the schedule as it stood that afternoon */
        const list = rows<{ id: string; title: string; position: number; start_date: number; end_date: number; status: string; client_visible: number; confirm_asked_at: number | null }>(await client.execute({ sql: `SELECT id, title, position, start_date, end_date, status, client_visible, confirm_asked_at FROM project_milestones WHERE project_id = ? ORDER BY position`, args: [p.id] }))
        const asMs = (r: (typeof list)[number]): Ms => ({ id: r.id, title: r.title, position: r.position, start: dayOf(new Date(r.start_date * 1000)), end: dayOf(new Date(r.end_date * 1000)), status: (r.status as Ms['status']), followsId: null, gap: 0, paymentRef: null, paymentDue: 'end', clientVisible: !!r.client_visible, confirm: { askedAt: r.confirm_asked_at ? 1 : null, answer: null, note: null, answeredAt: null }, waiting: null, plan: null, doneAt: null, tasks: { total: 0, done: 0 } })
        const shown = list.map(asMs).map((m) => (m.id === el ? { ...m, confirm: { ...m.confirm, askedAt: 1 } } : m))
        const snap = snapshotOf(shown)
        const shareId = sid(p.id, 'schedule-share:1')
        const sr = await client.execute({ sql: `INSERT OR IGNORE INTO project_schedule_shares (id, project_id, snapshot, changes, note, shared_by, shared_at) VALUES (?,?,?,?,?,?,?)`, args: [shareId, p.id, JSON.stringify(snap), JSON.stringify(scheduleChanges(clientRows(shown), null)), 'Here is the plan from start to handover. Electrical and plumbing finished today.', designer, shareAt] })
        if (sr.rowsAffected) {
          shares++
          await client.execute({ sql: `UPDATE project_milestones SET plan_start_date = start_date, plan_end_date = end_date WHERE project_id = ? AND plan_start_date IS NULL`, args: [p.id] })
          await ev(sid(shareId, 'ev'), p.lead_id, p.id, 'project_schedule_shared', designer, shareAt, { name: p.name, number: p.number, n: 0, note: 'Here is the plan from start to handover. Electrical and plumbing finished today.' })
        }
        /* he was asked to confirm electrical & plumbing with that share, and did the next morning */
        await client.execute({ sql: `UPDATE project_milestones SET confirm_asked_at = ?, confirm_answer = 'confirmed', confirm_answered_at = ? WHERE id = ? AND confirm_answer IS NULL`, args: [shareAt - 60, D0 - 2 * D + 10 * H, el] })
        await ev(sid(el, 'ev:ask'), p.lead_id, p.id, 'project_milestone_edited', designer, shareAt - 60, { name: p.name, number: p.number, id: el, title: 'Electrical & plumbing', fields: [{ key: 'confirm', label: 'Client confirms', from: 'no', to: 'asked' }] })
        /* painting waits on him for the paint colours since that share */
        await client.execute({ sql: `UPDATE project_milestones SET waiting_on = 'client', waiting_note = 'Paint colours', waiting_since = ?, updated_at = ? WHERE id = ? AND waiting_on IS NULL`, args: [shareAt + 30 * 60, shareAt + 30 * 60, pa] })
        await ev(sid(pa, 'ev:waiting'), p.lead_id, p.id, 'project_milestone_edited', designer, shareAt + 30 * 60, { name: p.name, number: p.number, id: pa, title: 'Painting', fields: [{ key: 'waiting', label: 'Waiting on', from: 'nobody', to: 'client' }] })
        /* yesterday afternoon: the wardrobe laminate runs a week late — carpentry ends a week later, and painting, cleaning and handover move with it */
        const moveAt = D0 - D + 15 * H
        const car = list.find((r) => r.id === ca)!
        const carEnd = dayOf(new Date(car.end_date * 1000)), carStart = dayOf(new Date(car.start_date * 1000))
        {   // once: the whole block runs only when the schedule is first set up
          const after = list.filter((r) => r.position > car.position)
          await client.execute({ sql: `UPDATE project_milestones SET end_date = ?, updated_at = ?, updated_by = ? WHERE id = ?`, args: [sec(carEnd + 7), moveAt, designer, ca] })
          for (const r of after) await client.execute({ sql: `UPDATE project_milestones SET start_date = start_date + ?, end_date = end_date + ?, updated_at = ?, updated_by = ? WHERE id = ?`, args: [7 * D, 7 * D, moveAt, designer, r.id] })
          const h = rows<{ e: number }>(await client.execute({ sql: `SELECT max(end_date) AS e FROM project_milestones WHERE project_id = ? AND deleted_at IS NULL`, args: [p.id] }))[0]!.e
          await client.execute({ sql: `UPDATE projects SET target_end_date = ?, updated_at = max(updated_at, ?) WHERE id = ?`, args: [h, moveAt, p.id] })
          await ev(sid(ca, 'ev:moved'), p.lead_id, p.id, 'project_milestone_moved', designer, moveAt, { name: p.name, number: p.number, id: ca, title: 'Carpentry fabrication', from: rangeLabel(carStart, carEnd), to: rangeLabel(carStart, carEnd + 7), n: after.length })
        }
        /* the work inside carpentry (6 of 14 done, the kitchen cabinets' order among the open ones) and painting's three */
        const CARP: [string, boolean, number][] = [['Measure the kitchen on site', true, -35], ['Confirm the laminate finishes with Benjamin', true, -30], ['Shop drawings approved', true, -26], ['Kitchen carcasses fabricated', true, -14], ['Master wardrobe carcasses fabricated', true, -9], ['Study desk carcass fabricated', true, -6],
          ['Wardrobe laminate delivered', false, 4], ['Install the kitchen cabinets', false, 8], ['Install the quartz countertop', false, 11], ['Install the master wardrobe', false, 15], ['Install the study desk and shelving', false, 17], ['TV console and feature wall', false, 20], ['Hang the bedroom doors', false, 24]]
        const PAINT: [string, boolean, number][] = [['Confirm paint colours with Benjamin', false, 21], ['Protect carpentry and flooring', false, 28], ['Two coats, then the touch-up check', false, 36]]
        for (const [list2, mid] of [[CARP, ca], [PAINT, pa]] as const) {
          for (const [k, [title, done, off]] of list2.entries()) {
            const tid = sid(`${mid}:task:${k}`, 'milestone-task')
            /* carpentry's list was made with the schedule; painting's when he was asked for the colours */
            const created = (mid === ca ? madeAt : shareAt) + (k + 1) * 10 * 60
            const due = D0 + off * D + 17 * H
            const doneAt = done ? due - 2 * H : created
            const r = await client.execute({ sql: `INSERT OR IGNORE INTO lead_tasks (id, lead_id, quote_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at, template_id, contract_id, milestone_id) VALUES (?,?,NULL,?,'General',?,?,?,?,NULL,?,?,NULL,NULL,?)`,
              args: [tid, p.lead_id, title, due, done ? 1 : 0, created, designer, created, doneAt, mid] })
            if (r.rowsAffected) {
              tasksMade++
              for (const m of team) await client.execute({ sql: `INSERT OR IGNORE INTO task_assignees (task_id, member_id) VALUES (?,?)`, args: [tid, m] })
              if (done) await ev(sid(tid, 'ev:done'), p.lead_id, p.id, 'task_completed', designer, doneAt, { id: tid, title })
            }
          }
        }
      }
      /* Ryan's client saw the schedule as it stands — shared on Wednesday; nothing new since */
      if (ryan) {
        const shareAt = D0 - 5 * D + 11 * H
        const list = rows<{ id: string; title: string; position: number; start_date: number; end_date: number; status: string; client_visible: number; confirm_asked_at: number | null }>(await client.execute({ sql: `SELECT id, title, position, start_date, end_date, status, client_visible, confirm_asked_at FROM project_milestones WHERE project_id = ? ORDER BY position`, args: [p.id] }))
        const shown: Ms[] = list.map((r) => ({ id: r.id, title: r.title, position: r.position, start: dayOf(new Date(r.start_date * 1000)), end: dayOf(new Date(r.end_date * 1000)), status: r.status as Ms['status'], followsId: null, gap: 0, paymentRef: null, paymentDue: 'end', clientVisible: !!r.client_visible, confirm: { askedAt: r.confirm_asked_at, answer: null, note: null, answeredAt: null }, waiting: null, plan: null, doneAt: null, tasks: { total: 0, done: 0 } }))
        const shareId = sid(p.id, 'schedule-share:1')
        const sr = await client.execute({ sql: `INSERT OR IGNORE INTO project_schedule_shares (id, project_id, snapshot, changes, note, shared_by, shared_at) VALUES (?,?,?,?,?,?,?)`, args: [shareId, p.id, JSON.stringify(snapshotOf(shown)), JSON.stringify(scheduleChanges(clientRows(shown), null)), null, designer, shareAt] })
        if (sr.rowsAffected) {
          shares++
          await client.execute({ sql: `UPDATE project_milestones SET plan_start_date = start_date, plan_end_date = end_date WHERE project_id = ? AND plan_start_date IS NULL`, args: [p.id] })
          await ev(sid(shareId, 'ev'), p.lead_id, p.id, 'project_schedule_shared', designer, shareAt, { name: p.name, number: p.number, n: 0, note: null })
        }
      }
    }
    note(`${templates} schedule template(s) · ${made} schedule(s) set up · ${shares} share(s) · ${tasksMade} milestone task(s)`)
  }

  /* ── R70 · Projects round 3 — updates to the client (REG-948…, owner 2026-10-05: "build all of it with your recommendations") ────────
     Benjamin Han's project tells him what happened since work began: the hacking (Dane's post — an Owner's publishes at once), the
     living-room floor (Germaine's, approved by Dane), the kitchen cabinets (Dane's) — each with its photos filed in his Files › Site updates;
     the master-bedroom wardrobe Germaine sent, which Dane sent back with his reason; and the feature-wall panels, In review since yesterday.
     Ryan D'Souza's project has one: the tiling, Michelle's, approved by Hui Min — over two weeks ago, so it reads "No update for n days".
     Every state carries its trail (submitted · reviewed · published by + at), its `project_update_*` events and the bell rows it raised. The
     pictures are the repo's own (public/visualizer, public/uat-files) as their files' thumbs; nothing new is uploaded. (invented copy) */
  console.log('\nR70 project updates')
  {
    let made = 0, files = 0, events = 0, bells = 0
    const pid = async (pattern: string) => rows<{ id: string; lead_id: string; name: string; number: string }>(await client.execute({ sql: `SELECT p.id, p.lead_id, p.name, p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name LIKE ? AND p.deleted_at IS NULL LIMIT 1`, args: [pattern] }))[0]
    const sizeOf = (pub: string) => { try { return statSync(path.join(process.cwd(), 'public', pub)).size } catch { return 0 } }
    type Seed = {
      key: string; title: string; body: string; status: 'published' | 'in_review' | 'sent_back'; author: string
      created: number; submitted?: number; reviewer?: string; reviewed?: number; note?: string; photos: string[]
    }
    const html = (t: string) => t.split('\n\n').map((x) => `<p>${x}</p>`).join('')
    const PLAN: { pattern: string; seeds: Seed[] }[] = [
      { pattern: 'Benjamin Han', seeds: [
        { key: 'hacking', title: 'Hacking is done', status: 'published', author: 'dane', created: D0 - 33 * D + 17 * H + 40 * 60, photos: [],
          body: 'All the old floor tiles and the kitchen counter are out, and the debris was cleared on Saturday.\n\nThe plumber marks the new water points on Tuesday — nothing needed from you this week.' },
        { key: 'flooring', title: 'Flooring is laid in the living room', status: 'published', author: 'germaine', created: D0 - 17 * D + 15 * H + 50 * 60, submitted: D0 - 17 * D + 16 * H + 10 * 60, reviewer: 'dane', reviewed: D0 - 17 * D + 17 * H + 5 * 60, photos: ['visualizer/samples/living-room/defurnished.jpg'],
          body: 'The oak vinyl is down in the living room and the skirting goes on tomorrow. The corridor follows on Friday.\n\nPlease keep off the floor for the next two days while the edges settle.' },
        { key: 'kitchen', title: 'Kitchen cabinets are in', status: 'published', author: 'dane', created: D0 - 5 * D + 18 * H + 15 * 60, photos: ['visualizer/samples/kitchen/original.jpg', 'uat-files/kitchen-moodboard.jpg'],
          body: 'The base and wall cabinets are fixed and the quartz top is templated — it arrives in about ten days.\n\nThe handles are the matte black ones you picked; the second photo is the moodboard we worked from.' },
        { key: 'wardrobe', title: 'Wardrobe carcass is up in the master bedroom', status: 'sent_back', author: 'germaine', created: D0 - 3 * D + 15 * H + 5 * 60, submitted: D0 - 3 * D + 15 * H + 30 * 60, reviewer: 'dane', reviewed: D0 - 3 * D + 18 * H + 10 * 60,
          note: 'Add a close-up of the laminate — Benjamin asked about the finish.', photos: ['visualizer/samples/bedroom/original.jpg'],
          body: 'The wardrobe carcass is up along the window wall. Doors and the laminate go on next week.' },
        { key: 'panels', title: 'Feature wall panels have arrived', status: 'in_review', author: 'germaine', created: D0 - 1 * D + 11 * H, submitted: D0 - 1 * D + 11 * H + 20 * 60, photos: ['uat-files/fluted-panel.jpg', 'visualizer/demo/swatch-oak.jpg'],
          body: 'The fluted panels for the TV wall were delivered this morning, in the oak finish you chose.\n\nThey rest on site for two days before we fix them, so they settle to the room.' },
      ] },
      { pattern: 'Ryan D%Souza', seeds: [
        { key: 'tiling', title: 'Tiling is finished', status: 'published', author: 'michelle', created: D0 - 18 * D + 16 * H, submitted: D0 - 18 * D + 16 * H + 15 * 60, reviewer: 'huimin', reviewed: D0 - 18 * D + 18 * H + 40 * 60, photos: [],
          body: 'Floors and both bathrooms are tiled and grouted. The water test on both bathrooms passed this morning.' },
      ] },
    ]
    const nameOf = async (id: string) => rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM members WHERE id = ?`, args: [id] }))[0]?.name ?? 'Someone'
    for (const plan of PLAN) {
      const p = await pid(plan.pattern)
      if (!p) { note(`no project for ${plan.pattern} — skipped`); continue }
      /* the lead's Files › Site updates, made with its first photo */
      const folder = sid(p.id, 'files:site-updates')
      const firstAt = Math.min(...plan.seeds.filter((x) => x.photos.length).map((x) => x.created - 180), NOW)
      for (const seed of plan.seeds) {
        const id = sid(p.id, `update:${seed.key}`)
        const published = seed.status === 'published'
        const publishedAt = published ? seed.reviewed ?? seed.created : null
        const publishedBy = published ? seed.reviewer ?? seed.author : null
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO project_updates (id, project_id, title, body, milestone_id, status, author_id, created_at, updated_at, edited_at, edited_by, submitted_by, submitted_at, reviewed_by, reviewed_at, review_note, published_by, published_at, withdrawn_by, withdrawn_at, client_opened_at, deleted_at, deleted_by) VALUES (?,?,?,?,NULL,?,?,?,?,NULL,NULL,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,NULL)`,
          args: [id, p.id, seed.title, html(seed.body), seed.status, seed.author, seed.created, seed.reviewed ?? seed.submitted ?? seed.created,
            seed.submitted ? seed.author : null, seed.submitted ?? null, seed.reviewer ?? null, seed.reviewed ?? null, seed.note ?? null, publishedBy, publishedAt] })
        if (!r.rowsAffected) continue
        made++
        if (seed.photos.length) {
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'folder','Site updates',NULL,?,NULL,?,NULL,NULL,?,NULL)`, args: [folder, p.lead_id, firstAt, seed.author, firstAt] })
          let pos = 0
          for (const pub of seed.photos) {
            const fid = sid(id, `file:${pub}`)
            await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'image',?,?,?,?,?,?,'image/jpeg',?,NULL)`, args: [fid, p.lead_id, path.basename(pub), `/${pub}`, seed.created - 120, folder, seed.author, sizeOf(pub), seed.created - 120] })
            await client.execute({ sql: `INSERT OR IGNORE INTO project_update_files (update_id, file_id, position, created_at) VALUES (?,?,?,?)`, args: [id, fid, pos++, seed.created] })
            files++
          }
        }
        /* the trail: who did what, when */
        const ev = async (kind: string, actor: string, at: number, extra: Record<string, unknown> = {}) => {
          const x = await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, `ev:${kind}`), p.lead_id, kind, actor, at, JSON.stringify({ id, title: seed.title, name: p.name, number: p.number, ...extra }), p.id] })
          events += x.rowsAffected
        }
        if (!seed.submitted) await ev('project_update_posted', seed.author, seed.created)
        else {
          await ev('project_update_submitted', seed.author, seed.submitted)
          if (seed.status === 'published') await ev('project_update_approved', seed.reviewer!, seed.reviewed!)
          if (seed.status === 'sent_back') await ev('project_update_sent_back', seed.reviewer!, seed.reviewed!, { note: seed.note })
        }
        /* the bell rows each step raised (lib/notifications/model.ts update_*) — the answered ones read, the open ones not */
        const href = `/projects/${p.id}/updates?open=${encodeURIComponent(id)}`
        const bell = async (key: string, kind: string, to: string, actor: string, at: number, title: string, body: string, read: boolean, channels: string) => {
          const x = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?)`, args: [sid(id, `bell:${key}:${to}`), to, kind, title, body, href, p.lead_id, channels, actor, at, read ? at + H : null] })
          bells += x.rowsAffected
        }
        if (seed.submitted) {
          const approvers = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner','Admin') AND coalesce(is_active, 1) = 1`)).map((m) => m.id).filter((m) => m !== seed.author)
          for (const a of approvers) await bell('review', 'update_review', a, seed.author, seed.submitted, `${await nameOf(seed.author)} sent an update for your review`, `“${seed.title}” — ${p.name}`, seed.status !== 'in_review', 'in_app,email')
          if (seed.status === 'published') await bell('approved', 'update_approved', seed.author, seed.reviewer!, seed.reviewed!, `${await nameOf(seed.reviewer!)} approved your update “${seed.title}”`, `${p.name} — the client can see it now`, true, 'in_app')
          if (seed.status === 'sent_back') await bell('sent-back', 'update_sent_back', seed.author, seed.reviewer!, seed.reviewed!, `${await nameOf(seed.reviewer!)} sent your update “${seed.title}” back`, seed.note!, false, 'in_app,email')
        }
      }
    }
    note(`${made} update(s) · ${files} photo(s) filed in Site updates · ${events} event(s) · ${bells} bell row(s)`)
  }

  /* ── R71 · The client portal, part one (Projects round 4a — Q-37…Q-50, the Client Portal Proposal, board 9) ─────────────────────────────
     The studio's address made from its name (`demo-studio`), Live, not yet tried as a test client. Board 9's three clients exactly: Benjamin
     Han invited the day he won, opened that evening and last two hours ago (his first sign-in's event and the bell row his team read); Ryan
     D'Souza invited the day after he won, not opened; Aisha Rahman not invited. Benjamin's file trail: a floor plan shown to him an hour ago
     (new in What needs you) and the site measurements kept to the team. How clients pay: the studio entity's bank and PayNow, filled only where
     the record is empty (board 9 draws the step done; round 6 reads the same record). Every stamp with its event (REG-343). Idempotent. */
  console.log('\nR71 client portal')
  {
    let made = 0
    const [first] = rows<{ at: number }>(await client.execute(`SELECT min(created_at) AS at FROM leads`))
    const [cur] = rows<{ slug: string }>(await client.execute(`SELECT slug FROM portal_addresses WHERE retired_at IS NULL LIMIT 1`))
    if (!cur) { await client.execute({ sql: `INSERT OR IGNORE INTO portal_addresses (slug, created_at, created_by, retired_at) VALUES ('demo-studio', ?, NULL, NULL)`, args: [first?.at ?? NOW - 90 * D] }); made++ }
    const s = await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('portal', ?, ?)`, args: [JSON.stringify({ paused: false, pausedAt: null, pausedBy: null, testedAt: null }), NOW] })
    made += s.rowsAffected
    /* how clients pay — the studio entity's bank and PayNow, only where empty */
    const [brand] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'brand'`))
    if (brand) {
      const b = JSON.parse(brand.value) as { details?: { uen?: string; entities?: Record<string, unknown>[] } }
      const e0 = b.details?.entities?.[0]
      if (e0 && !e0.bankName && !e0.accountNo && !e0.payNow) {
        Object.assign(e0, { bankName: 'DBS Bank', accountName: String(e0.name ?? 'Demo Studio Pte Ltd'), accountNo: '072-904418-3', payNow: b.details?.uen || '201234567M', swift: 'DBSSSGSG' })
        await client.execute({ sql: `UPDATE settings SET value = ?, updated_at = ? WHERE key = 'brand'`, args: [JSON.stringify(b), NOW] })
        made++
      }
    }
    /* the three clients of board 9 */
    type Client = { id: string; name: string; phone: string; email: string | null; project: string | null; won: number | null }
    const clientOf = async (name: string): Promise<Client | null> => rows<Client>(await client.execute({ sql: `SELECT l.id, l.name, l.phone, l.email, p.id AS project, (SELECT max(s.created_at) FROM stage_logs s WHERE s.lead_id = l.id AND s.to_stage = 'Won') AS won FROM leads l LEFT JOIN projects p ON p.lead_id = l.id WHERE l.name = ? AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
    const membersOf = async (leadId: string) => rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [leadId] })).map((m) => m.member_id)
    const invite = async (c: Client, o: { at: number; by: string; opened: number | null; last: number | null }) => {
      await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_profiles (id, phone, name, email, created_at, updated_at) VALUES (?,?,?,?,?,?)`, args: [sid(c.id, 'homeowner'), c.phone, c.name, c.email, o.at, o.at] })
      const [h] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM homeowner_profiles WHERE phone = ?`, args: [c.phone] }))
      const linkId = sid(c.id, 'portal-link')
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, last_asked_at, created_at, invited_by, opened_at, last_opened_at, withdrawn_at, withdrawn_by) VALUES (?,?,?,?,1,?,NULL,?,?,?,?,NULL,NULL)`,
        args: [linkId, h!.id, c.id, sid(c.id, 'portal-token'), o.at, o.at, o.by, o.opened, o.last] })
      if (!r.rowsAffected) return null
      made++
      const [link] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM homeowner_lead_links WHERE lead_id = ?`, args: [c.id] }))
      /* the invite's line — R45's id and its (lead, kind, at), so its backfill finds it */
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,?,?,?,'{}')`, args: [`ev-invite_sent-${link!.id.slice(0, 8)}`, c.id, 'invite_sent', o.by, o.at] })
      if (o.opened) {
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,?,NULL,?,?)`, args: [sid(c.id, 'ev:portal-opened'), c.id, 'portal_opened', o.opened, JSON.stringify({ name: c.name })] })
        for (const m of await membersOf(c.id)) {
          await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'portal_opened',?,?,?,?,NULL,'in_app',NULL,?,?)`,
            args: [sid(`${c.id}:${m}`, 'notif:portal-opened'), m, `${c.name} opened their portal for the first time`, 'They can see what needs them, their files and the steps ahead.', c.project ? `/projects/${c.project}` : `/leads/${c.id}`, c.id, o.opened, o.opened + 2 * H] })
        }
      }
      return link!.id
    }
    const ben = await clientOf('Benjamin Han')
    if (ben?.won) {
      const team = await membersOf(ben.id)
      const by = team.includes('germaine') ? 'germaine' : team[0] ?? 'dane'
      const at = ben.won + 2 * H
      await invite(ben, { at, by, opened: at + 3 * H, last: NOW - 2 * H })
      /* his files: the floor plan shown to him an hour ago, the measurements kept to the team */
      const plan = sid(ben.id, 'file:floor-plan'), measures = sid(ben.id, 'file:measurements')
      const f = await client.batch([
        { sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at, shown_to_client_at) VALUES (?,?,'pdf',?,NULL,?,NULL,?,?,'application/pdf',?,NULL,NULL)`, args: [measures, ben.id, 'Site measurements.pdf', ben.won + 3 * D, by, 312_000, ben.won + 3 * D] },
        { sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at, shown_to_client_at) VALUES (?,?,'pdf',?,NULL,?,NULL,?,?,'application/pdf',?,NULL,?)`, args: [plan, ben.id, 'Floor plan — SkyOasis @ Dawson.pdf', ben.won + 5 * D, by, 486_400, ben.won + 5 * D, NOW - H] },
        { sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,'file_shown',?,?,?)`, args: [sid(plan, 'ev:shown'), ben.id, by, NOW - H, JSON.stringify({ name: 'Floor plan — SkyOasis @ Dawson.pdf', id: plan })] },
      ], 'write')
      made += f.reduce((n, x) => n + x.rowsAffected, 0)
    }
    const ryan = await clientOf('Ryan D’Souza')
    if (ryan?.won) {
      const team = await membersOf(ryan.id)
      await invite(ryan, { at: ryan.won + D + 2 * H, by: team[0] ?? 'dane', opened: null, last: null })
    }
    note(`${made} portal record(s) written — the address, the set-up, how clients pay, Benjamin (opened) and Ryan (invited), Benjamin's two files`)
  }

  /* ── R73 · The client portal's project tabs (Projects round 4b — Q-15 · Q-16 · Q-41; the Client Portal Proposal, boards 1 · 2 · 3) ─────────
     Benjamin Han's portal as board 1 draws it: Masonry & tiling asked with the schedule shared on 2 Oct and confirmed by him the next morning
     on his Schedule (R69 had put that answer on Electrical & plumbing with no answerer — it moves here once, with its trail: the ask's line,
     his answer's line, the bell row his team read, the shared copy saying it was asked); Electrical & plumbing, finished 2 Oct and asked with
     that share, waits for his confirmation (What needs you's "Confirm that electrical and plumbing is done"). His published updates belong to
     their stages, and he opened them — all but the newest, Kitchen cabinets, still "New" on his page and the only one the studio may still
     withdraw. His last look at the Schedule tab is the morning he confirmed, so a share after it is marked as changed. Idempotent: every write
     is keyed to the seeded state it changes. */
  console.log('\nR73 client portal — the project tabs')
  {
    let made = 0
    const [ben] = rows<{ pid: string; lead: string; name: string; number: string }>(await client.execute(`SELECT p.id AS pid, l.id AS lead, p.name, p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = 'Benjamin Han' AND p.deleted_at IS NULL LIMIT 1`))
    const [link] = ben ? rows<{ id: string; homeowner: string; opened: number | null; last: number | null }>(await client.execute({ sql: `SELECT id, homeowner_id AS homeowner, opened_at AS opened, last_opened_at AS last FROM homeowner_lead_links WHERE lead_id = ?`, args: [ben.lead] })) : []
    const [share] = ben ? rows<{ id: string; at: number; snapshot: string }>(await client.execute({ sql: `SELECT id, shared_at AS at, snapshot FROM project_schedule_shares WHERE project_id = ? ORDER BY shared_at LIMIT 1`, args: [ben.pid] })) : []
    const ms = ben ? rows<{ id: string; title: string; status: string; asked: number | null; answer: string | null; by: string | null; updated_by: string | null }>(await client.execute({ sql: `SELECT id, title, status, confirm_asked_at AS asked, confirm_answer AS answer, confirm_answered_by AS by, updated_by FROM project_milestones WHERE project_id = ? AND deleted_at IS NULL ORDER BY position`, args: [ben.pid] })) : []
    const masonry = ms.find((m) => m.title.startsWith('Masonry')), electrical = ms.find((m) => m.title.startsWith('Electrical'))
    if (!ben || !link?.opened || !share || !masonry || !electrical) note('Benjamin Han’s project, portal link, share or stages missing — skipped')
    else {
      const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [ben.lead] })).map((m) => m.member_id)
      const designer = team.find((m) => m !== 'dane') ?? team[0] ?? 'dane'
      const askedAt = share.at - 60, answeredAt = share.at + 16 * H   // asked with the share (Fri 2 Oct, 6pm) · answered Sat 3 Oct, 10am
      const ev = async (id: string, kind: string, actor: string | null, at: number, detail: object) => {
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, ben.lead, kind, actor, at, JSON.stringify(detail), ben.pid] })
        made += r.rowsAffected
      }
      /* R69's seeded answer on Electrical & plumbing (no answerer) is taken off — the stage waits for him */
      const off = await client.execute({ sql: `UPDATE project_milestones SET confirm_answer = NULL, confirm_note = NULL, confirm_answered_at = NULL WHERE id = ? AND confirm_answer = 'confirmed' AND confirm_answered_by IS NULL AND confirm_asked_at IS NOT NULL`, args: [electrical.id] })
      made += off.rowsAffected
      /* Masonry & tiling: asked with the share, confirmed by him the next morning */
      if (masonry.status === 'done' && masonry.asked === null) {
        await client.execute({ sql: `UPDATE project_milestones SET confirm_asked_at = ?, confirm_answer = 'confirmed', confirm_note = NULL, confirm_answered_at = ?, confirm_answered_by = ? WHERE id = ? AND confirm_asked_at IS NULL`, args: [askedAt, answeredAt, link.homeowner, masonry.id] })
        made++
        await ev(sid(masonry.id, 'ev:ask'), 'project_milestone_edited', designer, askedAt, { name: ben.name, number: ben.number, id: masonry.id, title: masonry.title, fields: [{ key: 'confirm', label: 'Client confirms', from: 'no', to: 'asked' }] })
        await ev(sid(masonry.id, 'ev:client-confirmed'), 'project_stage_confirmed', null, answeredAt, { id: masonry.id, title: masonry.title, name: 'Benjamin Han', note: null })
        for (const m of team) {
          const r = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'stage_confirmed',?,?,?,?,NULL,'in_app',NULL,?,?)`,
            args: [sid(`${masonry.id}:${m}`, 'notif:stage-confirmed'), m, `Benjamin Han confirmed ${masonry.title}`, `On their portal · ${ben.name}`, `/projects/${ben.pid}/schedule?open=${encodeURIComponent(masonry.id)}`, ben.lead, answeredAt, answeredAt + 2 * H] })
          made += r.rowsAffected
        }
        /* the copy he was shown says it was asked */
        const snap = JSON.parse(share.snapshot) as { rows?: { id: string; confirm?: string | null }[] }
        const row = snap.rows?.find((r) => r.id === masonry.id)
        if (row && !row.confirm) { row.confirm = 'asked'; await client.execute({ sql: `UPDATE project_schedule_shares SET snapshot = ? WHERE id = ?`, args: [JSON.stringify(snap), share.id] }) }
      }
      /* he looked at his Schedule the morning he confirmed — what the studio shares after it is "what changed since you last looked" */
      made += (await client.execute({ sql: `UPDATE homeowner_lead_links SET schedule_seen_at = ? WHERE id = ? AND schedule_seen_at IS NULL`, args: [answeredAt, link.id] })).rowsAffected
      /* his published updates belong to their stages; he opened all but the newest */
      const STAGE: Record<string, string> = { hacking: 'Hacking', flooring: 'Masonry', kitchen: 'Carpentry' }
      for (const [key, prefix] of Object.entries(STAGE)) {
        const m = ms.find((x) => x.title.startsWith(prefix))
        if (m) made += (await client.execute({ sql: `UPDATE project_updates SET milestone_id = ? WHERE id = ? AND milestone_id IS NULL`, args: [m.id, sid(ben.pid, `update:${key}`)] })).rowsAffected
      }
      const pubs = rows<{ id: string; published: number }>(await client.execute({ sql: `SELECT id, published_at AS published FROM project_updates WHERE project_id = ? AND status = 'published' AND deleted_at IS NULL AND published_at IS NOT NULL ORDER BY published_at DESC`, args: [ben.pid] }))
      for (const [k, u] of pubs.slice(1).entries()) {
        const at = Math.min(Math.max(u.published + (3 + k) * H, link.opened + 60), link.last ?? NOW)
        made += (await client.execute({ sql: `UPDATE project_updates SET client_opened_at = ? WHERE id = ? AND client_opened_at IS NULL`, args: [at, u.id] })).rowsAffected
      }
    }
    note(`${made} record(s) — Masonry & tiling confirmed by Benjamin, Electrical & plumbing waiting for him, his updates on their stages and opened but the newest`)
  }

  /* ── R74 · Projects round 8 — Choices (the client's selections; owner 2026-10-05: "build all of it with your recommendations") ─────────
     Benjamin Han's project puts two choices to him. "Paint colours" for the living and bedrooms — three options (Sage Whisper from Company ›
     Materials, a colour with no photo and +S$240 for the premium range; Warm White and Soft Greige, photos Germaine uploaded, included in
     the quote) — shared two days ago, needed by Mon 19 Oct 2026 (the portal canvas's own row), unanswered. "Kitchen countertop" — Calacatta
     quartz (Materials, +S$1,200), a solid surface (included) and an oak laminate (−S$600) — shared two weeks before carpentry began and chosen
     by Benjamin on his portal four days before it, with his note; Carpentry fabrication is under way, so the pick stays. Aisha Rahman's
     project has one Draft: "Feature wall finish" (oak veneer from Materials · a fluted walnut panel, uploaded, +S$850). Every picture is a file
     in the lead's Files › Choices (its thumb the repo's own picture, as R70's site photos are); every step its `project_choice_*` event; the
     client's pick its bell row for the team (read). Idempotent. (invented copy) */
  console.log('\nR74 project choices')
  {
    let made = 0, files = 0, events = 0, bells = 0, mended = 0
    /* (REG-1068) a pick's change to the contract is said with the GST its variation order adds — the studio's rate when the project's quote
       charges it (lib/projects/choices.ts `pickGstPct`), so the bell rows and the Activity lines carry `gst` and the words the card reads */
    const { contractLine } = await import('../lib/projects/choices-model')
    const { parseStudio } = await import('../lib/settings/types')
    const stValue = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))[0]?.value
    const studioGst = parseStudio((() => { try { return stValue ? JSON.parse(stValue) : null } catch { return null } })())
    const pickGst = async (projectId: string) => {
      const [q] = rows<{ gst: number | null }>(await client.execute({ sql: `SELECT q.gst_enabled AS gst FROM projects p LEFT JOIN quotes q ON q.id = p.quote_id WHERE p.id = ?`, args: [projectId] }))
      return (q?.gst == null ? studioGst.gstRegistered : !!q.gst) ? studioGst.gstPct : 0
    }
    const sizeOf = (pub: string) => { try { return statSync(path.join(process.cwd(), 'public', pub)).size } catch { return 0 } }
    const pid = async (name: string) => rows<{ id: string; lead_id: string; name: string; number: string }>(await client.execute({ sql: `SELECT p.id, p.lead_id, p.name, p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL LIMIT 1`, args: [name] }))[0]
    const milestone = async (projectId: string, title: string) => rows<{ id: string; start_date: number }>(await client.execute({ sql: `SELECT id, start_date FROM project_milestones WHERE project_id = ? AND title = ? AND deleted_at IS NULL LIMIT 1`, args: [projectId, title] }))[0] ?? null
    const material = async (id: string) => rows<{ id: string; name: string; hex: string; image_url: string | null }>(await client.execute({ sql: `SELECT id, name, hex, image_url FROM studio_materials WHERE id = ? AND deleted_at IS NULL`, args: [id] }))[0] ?? null
    type Opt = { key: string; name: string; desc: string; price: number | null } & ({ material: string } | { photo: string })
    type Seed = { key: string; title: string; room: string; milestone: string; note: string | null; by: string; created: number; shared: number | null; needed: (start: number | null) => number | null
      pick?: { option: string; note: string }; options: Opt[] }
    const atStart = (start: number | null, days: number, h = 0) => (start ?? D0) - days * D + h
    const PLAN: { client: string; seeds: Seed[] }[] = [
      { client: 'Benjamin Han', seeds: [
        { key: 'paint', title: 'Paint colours', room: 'Living and bedrooms', milestone: 'Painting', by: 'germaine', created: D0 - 3 * D + 11 * H, shared: D0 - 2 * D + 15 * H + 20 * 60,
          needed: () => Math.floor(new Date(2026, 9, 19).getTime() / 1000),
          note: 'The living room and the three bedrooms take one colour; the ceilings stay white.',
          options: [
            { key: 'sage', name: 'Sage Whisper', desc: 'Matte · the green from your mood board', price: 24_000, material: 'sm-sage-whisper' },
            { key: 'white', name: 'Warm White', desc: 'Matte · brightens the north-facing bedrooms', price: null, photo: 'visualizer/samples/living-room/scandinavian.jpg' },
            { key: 'greige', name: 'Soft Greige', desc: 'Eggshell · hides marks along the corridor', price: null, photo: 'visualizer/samples/living-room/japandi.jpg' },
          ] },
        { key: 'countertop', title: 'Kitchen countertop', room: 'Kitchen', milestone: 'Carpentry fabrication', by: 'germaine', created: 0, shared: 0,
          needed: (start) => atStart(start, 2), note: 'The top goes on the base cabinets and the island; we template it once they are in.',
          pick: { option: 'quartz', note: 'The Calacatta, please — with the waterfall edge we talked about.' },
          options: [
            { key: 'quartz', name: 'Calacatta quartz', desc: 'Gloss · waterfall edge on the island', price: 120_000, material: 'sm-calacatta' },
            { key: 'solid', name: 'Solid surface, Arctic White', desc: 'Seamless joins', price: null, photo: 'visualizer/samples/kitchen/scandinavian.jpg' },
            { key: 'laminate', name: 'Oak laminate top', desc: 'Warm and easy to keep', price: -60_000, material: 'sm-oak-veneer' },
          ] },
      ] },
      { client: 'Aisha Rahman', seeds: [
        { key: 'feature-wall', title: 'Feature wall finish', room: 'Living room', milestone: 'Carpentry fabrication', by: 'michelle', created: D0 - 1 * D + 10 * H, shared: null,
          needed: (start) => atStart(start, 10), note: null,
          options: [
            { key: 'oak', name: 'Natural oak veneer', desc: 'Natural finish · matches the TV console', price: null, material: 'sm-oak-veneer' },
            { key: 'fluted', name: 'Fluted panel, walnut', desc: 'Vertical flutes, 25 mm', price: 85_000, photo: 'uat-files/fluted-panel.jpg' },
          ] },
      ] },
    ]
    for (const plan of PLAN) {
      const p = await pid(plan.client)
      if (!p) { note(`no project for ${plan.client} — skipped`); continue }
      const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [p.lead_id] })).map((m) => m.member_id)
      const folder = sid(p.id, 'files:choices')
      for (const seed of plan.seeds) {
        const id = sid(p.id, `choice:${seed.key}`)
        const m = await milestone(p.id, seed.milestone)
        const start = m ? Number(m.start_date) : null
        /* the countertop's dates follow its milestone: shared 13 days before carpentry began, chosen four days before it, needed two days before */
        const created = seed.created || atStart(start, 14, 10 * H)
        const shared = seed.shared === 0 ? atStart(start, 13, 16 * H) : seed.shared
        const pickAt = seed.pick ? atStart(start, 4, 20 * H + 40 * 60) : null
        const needed = seed.needed(start)
        const status = seed.pick ? 'chosen' : shared ? 'shared' : 'draft'
        const chosenId = seed.pick ? sid(id, `option:${seed.pick.option}`) : null
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO project_selections (id, project_id, title, room, milestone_id, needed_by, note, status, chosen_option_id, chosen_by, chosen_member_id, chosen_at, chosen_note, created_by, created_at, updated_at, shared_by, shared_at, deleted_at, deleted_by) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,NULL,NULL)`,
          args: [id, p.id, seed.title, seed.room, m?.id ?? null, needed, seed.note, status, chosenId, seed.pick ? 'client' : null, pickAt, seed.pick?.note ?? null, seed.by, created, pickAt ?? shared ?? created, shared ? seed.by : null, shared] })
        if (!r.rowsAffected) continue
        made++
        let pos = 0
        for (const o of seed.options) {
          const oid = sid(id, `option:${o.key}`)
          let fileId: string | null = null, hex: string | null = null, ref: string | null = null
          let pic: string | null = null
          if ('material' in o) { const mat = await material(o.material); ref = mat?.id ?? null; if (mat?.image_url && mat.image_url.startsWith('/')) pic = mat.image_url.replace(/^\//, ''); else hex = mat?.hex ?? null }
          else pic = o.photo
          if (pic) {
            await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'folder','Choices',NULL,?,NULL,?,NULL,NULL,?,NULL)`, args: [folder, p.lead_id, created - 60, seed.by, created - 60] })
            fileId = sid(oid, 'file')
            const x = await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'image',?,?,?,?,?,?,'image/jpeg',?,NULL)`, args: [fileId, p.lead_id, `${o.name}.jpg`, `/${pic}`, created + pos * 60, folder, seed.by, sizeOf(pic), created + pos * 60] })
            files += x.rowsAffected
          }
          await client.execute({ sql: `INSERT OR IGNORE INTO project_selection_options (id, selection_id, name, description, file_id, hex, price_minor, source, source_ref, position, created_by, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
            args: [oid, id, o.name, o.desc, fileId, hex, o.price, 'material' in o ? 'material' : 'upload', ref, pos, seed.by, created + pos * 60, created + pos * 60] })
          pos++
        }
        /* the trail: who did what, when */
        const ev = async (kind: string, actor: string | null, at: number, extra: Record<string, unknown> = {}) => {
          const x = await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(id, `ev:${kind}`), p.lead_id, kind, actor, at, JSON.stringify({ id, title: seed.title, name: p.name, number: p.number, ...extra }), p.id] })
          events += x.rowsAffected
        }
        await ev('project_choice_added', seed.by, created)
        if (shared) await ev('project_choice_shared', seed.by, shared)
        if (seed.pick && pickAt) {
          const o = seed.options.find((x) => x.key === seed.pick!.option)!
          const oRow = rows<{ hex: string | null; thumb: string | null }>(await client.execute({ sql: `SELECT o.hex, f.thumb FROM project_selection_options o LEFT JOIN lead_files f ON f.id = o.file_id WHERE o.id = ?`, args: [chosenId] }))[0]
          const gst = await pickGst(p.id)
          await ev('project_choice_chosen', null, pickAt, { option: o.name, by: 'client', price: o.price, gst, thumb: oRow?.thumb ?? null, hex: oRow?.hex ?? null, note: seed.pick.note })
          const [ln] = rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM leads WHERE id = ?`, args: [p.lead_id] }))
          const price = contractLine(o.price, gst)
          for (const to of team) {
            const x = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'choice_made',?,?,?,?,NULL,'in_app,email',NULL,?,?)`,
              args: [sid(`${id}:${to}`, 'bell:choice-made'), to, `${ln?.name ?? 'The client'} chose ${o.name} for ${seed.title}`, [price, `“${seed.pick.note}”`].filter(Boolean).join(' · '), `/projects/${p.id}/choices?open=${encodeURIComponent(id)}`, p.lead_id, pickAt, pickAt + 2 * H] })
            bells += x.rowsAffected
          }
        }
      }
    }
    /* (REG-1068) rows an earlier run wrote before the GST was said: each pick's line takes its `gst`, each seeded bell row the card's words */
    for (const plan of PLAN) {
      const p = await pid(plan.client)
      if (!p) continue
      const gst = await pickGst(p.id)
      for (const seed of plan.seeds) {
        if (!seed.pick) continue
        const id = sid(p.id, `choice:${seed.key}`)
        const o = seed.options.find((x) => x.key === seed.pick!.option)!
        const x = await client.execute({ sql: `UPDATE lead_events SET detail = json_set(detail, '$.gst', ?) WHERE project_id = ? AND kind IN ('project_choice_chosen', 'project_choice_changed') AND json_extract(detail, '$.id') = ? AND json_extract(detail, '$.gst') IS NULL`, args: [gst, p.id, id] })
        const body = [contractLine(o.price, gst), `“${seed.pick.note}”`].filter(Boolean).join(' · ')
        const y = await client.execute({ sql: `UPDATE notifications SET body = ? WHERE kind = 'choice_made' AND href = ? AND body <> ? AND body LIKE '%“' || ? || '”%'`, args: [body, `/projects/${p.id}/choices?open=${encodeURIComponent(id)}`, body, seed.pick.note] })
        mended += x.rowsAffected + y.rowsAffected
      }
    }
    note(`${made} choice(s) · ${files} picture(s) filed in Choices · ${events} event(s) · ${bells} bell row(s)${mended ? ` · ${mended} pick line(s) given their GST` : ''}`)
  }

  /* ── R72 · Projects round 5 — money in, part one (F-02 · F-04 · F-05 · F-06 · F-07 · F-08 · F-13 · F-14; owner 2026-10-05: "build all of
     it with your recommendations") ─────────────────────────────────────────────────────────────────────────────────────────────────────
     Every project's invoices, one per payment stage, made as Drafts the day the project was made (each its share of the contract value, GST
     split out of the slice). What has gone to the client since, with its trail (REG-343), numbered INV-2026-001… in the order they went:
     - Ryan D'Souza: the Deposit (signing day) and Commencement (the day Hacking & demolition began) — Michelle's, so each was submitted
       and then approved and sent by Dane (Invoices need approval is on by default). His variation order VO-1 (a feature wall and two more
       power points, a ceiling fan point omitted) went to him on 8 Sep and he approved it on its link the next evening: the contract moved
       from S$77,900.12 and his two unsent invoices were re-sized (the rebalance's line, his team's bell row).
     - Benjamin Han (the portal canvas's figures, his contract unchanged at S$69,283.13): the Deposit the day he signed, Commencement the
       day works began (21 Aug), Mid-project a week before Electrical & plumbing's last day so it falls due on that day — 2 Oct; Handover a
       Draft. Round 6 records his payments.
     - Aisha Rahman: the Deposit (Michelle's, approved and sent by Dane); Commencement Ready to send (Hacking & demolition is done); her
       variation order VO-1 (an omission larger than what it adds — the study's built-in wardrobe out, a shoe cabinet and shelving in)
       approved inside the studio and sent to her on 3 Oct for her approval — waiting on the client.
     - Marcus Teo (direct, setting up): four Drafts on the agreed S$48,600; the Deposit is Ready to send.
     Idempotent: a project that already has invoices keeps them; a variation order is written once. */
  console.log('\nR72 project money')
  {
    const { allocate, gstOf } = await import('../lib/projects/money')
    let made = 0, sent = 0, vos = 0
    const [st] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))
    const studioRec = st ? (JSON.parse(st.value) as { gstRegistered?: boolean; gstPct?: number }) : {}
    const gstPct = typeof studioRec.gstPct === 'number' ? studioRec.gstPct : 9
    const registered = studioRec.gstRegistered !== false
    const at = (sec: number, h: number, m = 0) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime() / 1000) }
    const dueOf = (sentSec: number) => { const d = new Date(sentSec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime() / 1000) }
    type P = { id: string; lead_id: string; name: string; number: string; quote_id: string | null; agreed_value_minor: number | null; payment_template: string | null; created_at: number; created_by: string | null; client: string }
    const projs = rows<P>(await client.execute(`SELECT p.id, p.lead_id, p.name, p.number, p.quote_id, p.agreed_value_minor, p.payment_template, p.created_at, p.created_by, l.name AS client FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NULL ORDER BY p.created_at`))
    const teamOf = async (leadId: string) => rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [leadId] })).map((m) => m.member_id)
    const milestone = async (projectId: string, title: string) => rows<{ start_date: number; end_date: number; done_at: number | null; status: string }>(await client.execute({ sql: `SELECT start_date, end_date, done_at, status FROM project_milestones WHERE project_id = ? AND title = ? AND deleted_at IS NULL LIMIT 1`, args: [projectId, title] }))[0] ?? null
    const ev = (id: string, leadId: string, projectId: string, kind: string, actor: string | null, atSec: number, detail: Record<string, unknown>) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, leadId, kind, actor, atSec, JSON.stringify(detail), projectId] })
    const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
    const fmtDay = (sec: number) => displayDate(new Date(sec * 1000))

    /* the variation orders first: the contract a Draft is sized to includes the approved one */
    type Line = { group: string; name: string; qty: number; unit: string; cost: number; markup: number; category: string; room: string }
    const writeVo = async (p: P, o: { title: string; lines: Line[]; createdAt: number; by: string; submittedAt: number; approvedAt: number; clientSentAt: number; confirmedAt: number | null }) => {
      const id = sid(p.id, 'vo:1')
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM quotes WHERE id = ?`, args: [id] }))
      if (have) return rows<{ amount_minor: number; status: string; confirmed_at: number | null }>(await client.execute({ sql: `SELECT amount_minor, status, confirmed_at FROM quotes WHERE id = ?`, args: [id] }))[0]!
      const [base] = p.quote_id ? rows<{ property_type: string | null; site_address: string | null; nric: string | null; customer_id: string | null; template_id: string | null; template_version: number | null; issuing_entity: string | null; gst_enabled: number; project_ref: string | null }>(await client.execute({ sql: `SELECT property_type, site_address, nric, customer_id, template_id, template_version, issuing_entity, gst_enabled, project_ref FROM quotes WHERE id = ?`, args: [p.quote_id] })) : []
      const groups = [...new Set(o.lines.map((l) => l.group))]
      const items: { id: string; parent_id: string | null; kind: string; status: string; qty: number; cost_minor: number; markup_minor: number; discount_pct: number; gst_pct: number; position: number; name: string; unit: string | null; category: string | null; room: string | null }[] = []
      groups.forEach((g, gi) => {
        const gid = sid(`${id}:${g}`, 'quote_group')
        items.push({ id: gid, parent_id: null, kind: 'group', status: 'Pending', qty: 1, cost_minor: 0, markup_minor: 0, discount_pct: 0, gst_pct: gstPct, position: gi, name: g, unit: null, category: o.lines.find((l) => l.group === g)!.category, room: null })
        o.lines.filter((l) => l.group === g).forEach((l, li) => items.push({ id: sid(`${id}:${g}:${l.name}`, 'quote_item'), parent_id: gid, kind: 'item', status: 'Pending', qty: l.qty, cost_minor: Math.round(l.cost * 100), markup_minor: Math.round(l.markup * 100), discount_pct: 0, gst_pct: gstPct, position: li, name: l.name, unit: l.unit, category: l.category, room: l.room }))
      })
      const gstOn = base ? base.gst_enabled === 1 : registered
      const t = quoteTotals(items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: i.status, qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: i.discount_pct, gstPct: i.gst_pct })), { additionalDiscountMode: 'pct', additionalDiscountValue: 0, gstEnabled: gstOn })
      const status = o.confirmedAt ? 'Confirmed' : 'Sent to Client'
      const number = 'VO-1'
      await client.execute({ sql: `INSERT OR IGNORE INTO quotes (id, lead_id, number, created_by, title, amount_minor, visibility, status, created_at, due_at, sent_at, updated_at, approved_at, prepared_by, valid_until, project_ref, nric, customer_id, property_type, site_address, version, template_id, template_version, gst_enabled, issuing_entity, items_density, terms_html, notes_html, client_signature_required, submitted_by, submitted_at, approved_by, client_sent_at, confirmed_at, confirmed_by, kind, project_id, confirmed_via)
        VALUES (?,?,?,?,?,?,'Shared',?,?,NULL,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,'double','',?,0,?,?,'dane',?,?,?,'variation',?,?)`,
        args: [id, p.lead_id, number, o.by, o.title, t.totalMinor, status, o.createdAt, o.clientSentAt, o.confirmedAt ?? o.clientSentAt, o.approvedAt, o.by, o.createdAt + 30 * D, base?.project_ref ?? null, base?.nric ?? null, base?.customer_id ?? null, base?.property_type ?? null, base?.site_address ?? null,
          base?.template_id ?? null, base?.template_version ?? null, gstOn ? 1 : 0, base?.issuing_entity ?? null, `<p>Changes to the signed contract. Omitted works show a minus quantity and are credited at the contract’s rates.</p>`,
          o.by, o.submittedAt, o.clientSentAt, o.confirmedAt, o.confirmedAt ? p.client : null, p.id, o.confirmedAt ? 'link' : null] })
      for (const i of items) {
        await client.execute({ sql: `INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, description, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, room, category, section, visibility, collapsed, created_at, updated_at) VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,0,?,?,?,NULL,'visible',0,?,?)`,
          args: [i.id, id, i.parent_id, i.kind, i.position, i.name, i.status, i.qty, i.unit, i.cost_minor, i.markup_minor, i.gst_pct, i.room, i.category, o.createdAt + 20 * 60, o.createdAt + 20 * 60] })
      }
      await ev(sid(id, 'ev:vo-created'), p.lead_id, p.id, 'project_vo_created', o.by, o.createdAt, { id, number, title: o.title, name: p.name })
      vos++
      return { amount_minor: t.totalMinor, status, confirmed_at: o.confirmedAt }
    }

    for (const p of projs) {
      const [haveInv] = rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM project_invoices WHERE project_id = ?`, args: [p.id] }))
      if (Number(haveInv?.n ?? 0) > 0) continue
      const team = await teamOf(p.lead_id)
      /* the stages: the signed quote's Payment Schedule, else the split agreed outside one */
      const [q] = p.quote_id ? rows<{ amount_minor: number; gst_enabled: number; issuing_entity: string | null; signed_at: number | null }>(await client.execute({ sql: `SELECT amount_minor, gst_enabled, issuing_entity, signed_at FROM quotes WHERE id = ?`, args: [p.quote_id] })) : []
      const pays = q ? rows<{ id: string; name: string; pct: number; position: number; due_kind: string }>(await client.execute({ sql: `SELECT id, name, pct, position, due_kind FROM quote_payments WHERE quote_id = ? ORDER BY position`, args: [p.quote_id] })) : []
      let split: { name: string; pct: number }[] = []
      try { split = p.payment_template ? ((JSON.parse(p.payment_template) as { rows?: { name: string; pct: number }[] }).rows ?? []) : [] } catch { split = [] }
      const stages = pays.length ? pays.map((r, i) => ({ ref: r.id, name: r.name, pct: r.pct, position: i })) : split.map((r, i) => ({ ref: `split:${i}`, name: r.name, pct: r.pct, position: i }))
      if (!stages.length) continue
      const base = q ? q.amount_minor : p.agreed_value_minor ?? 0
      const rate = (q ? q.gst_enabled === 1 : registered) ? gstPct : 0
      const original = allocate(base, stages.map((s) => ({ id: s.ref, pct: s.pct, amountMinor: 0, locked: false })))

      /* what went to the client, by stage name: [sent at, by, submitted by (Michelle's, approved by Dane) ] */
      const plan = new Map<string, { at: number; by: string; submittedBy: string | null }>()
      const by = 'dane'   // the Owner sends; a Designer's invoice is submitted first (below)
      const designer = team.find((m) => m !== 'dane') ?? null
      const viaApproval = !team.includes('dane') && designer ? designer : null   // a Designer's invoice waits for an Owner or an Admin
      let vo: { amount_minor: number; status: string; confirmed_at: number | null } | null = null
      const signedAt = q?.signed_at ?? p.created_at
      if (p.client === 'Benjamin Han') {
        const hack = await milestone(p.id, 'Hacking & demolition'), elec = await milestone(p.id, 'Electrical & plumbing')
        plan.set('Deposit', { at: at(signedAt, 13), by, submittedBy: null })
        if (hack) plan.set('Commencement', { at: at(hack.start_date, 10), by, submittedBy: null })
        if (elec) plan.set('Mid-Project', { at: at(elec.end_date - 7 * D, 10), by, submittedBy: null })
      } else if (p.client === 'Ryan D’Souza') {
        const hack = await milestone(p.id, 'Hacking & demolition'), mason = await milestone(p.id, 'Masonry & tiling')
        plan.set('Deposit', { at: at(signedAt, 13), by, submittedBy: viaApproval })
        if (hack) plan.set('Commencement', { at: at(hack.start_date, 10), by, submittedBy: viaApproval })
        const from = mason ? at(mason.end_date, 0) + 3 * D : p.created_at + 40 * D
        vo = await writeVo(p, {
          title: 'Feature wall and power points', by: designer ?? 'dane', createdAt: from + 10 * H, submittedAt: from + 16 * H, approvedAt: from + 18 * H, clientSentAt: from + D + 11 * H, confirmedAt: from + 2 * D + 21 * H + 14 * 60,
          lines: [
            { group: 'Carpentry', name: 'Living room feature wall — fluted panel with LED strip', qty: 1, unit: 'Lot', cost: 2200, markup: 600, category: 'Carpentry', room: 'Living Room' },
            { group: 'Electrical', name: 'Additional 13A power point', qty: 4, unit: 'pcs', cost: 90, markup: 40, category: 'Electrical', room: 'Living Room' },
            { group: 'Electrical', name: 'Ceiling fan point, Bedroom 3 — omitted', qty: -1, unit: 'pcs', cost: 110, markup: 40, category: 'Electrical', room: 'Bedroom 3' },
          ],
        })
      } else if (p.client === 'Aisha Rahman') {
        plan.set('Deposit', { at: at(signedAt, 14), by, submittedBy: viaApproval })
        const today = D0
        vo = await writeVo(p, {
          title: 'Study and entrance changes', by: designer ?? 'dane', createdAt: today - 4 * D + 11 * H, submittedAt: today - 4 * D + 16 * H, approvedAt: today - 3 * D + 10 * H, clientSentAt: today - 2 * D + 15 * H, confirmedAt: null,
          lines: [
            { group: 'Carpentry', name: 'Study built-in wardrobe, 2.4 m — omitted', qty: -1, unit: 'Lot', cost: 1800, markup: 600, category: 'Carpentry', room: 'Study' },
            { group: 'Carpentry', name: 'Shoe cabinet with bench, 1.2 m', qty: 1, unit: 'Lot', cost: 950, markup: 400, category: 'Carpentry', room: 'Entrance' },
            { group: 'Carpentry', name: 'Floating shelves above the study desk', qty: 1, unit: 'Lot', cost: 380, markup: 170, category: 'Carpentry', room: 'Study' },
          ],
        })
      }
      /* nothing goes before the project (and its Drafts) exists — a send planned earlier waits an hour after it */
      for (const [k, v] of plan) plan.set(k, { ...v, at: Math.max(v.at, p.created_at + H) })
      /* the invoices: sent ones at their share then; Drafts at their share of what the contract leaves now (after an approved order) */
      const approvedVo = vo && (vo.status === 'Confirmed') ? vo.amount_minor : 0
      const contract = Math.max(0, base + approvedVo)
      const sentStages = stages.filter((s) => plan.has(s.name))
      const drafts = allocate(contract, stages.map((s) => ({ id: s.ref, pct: s.pct, amountMinor: sentStages.includes(s) ? original[s.ref] ?? 0 : 0, locked: sentStages.includes(s) })))
      const createdBy = p.created_by ?? team[0] ?? 'dane'
      for (const s of stages) {
        const id = sid(`${p.id}:${s.ref}`, 'invoice')
        const go = plan.get(s.name)
        const amount = go ? original[s.ref] ?? 0 : drafts[s.ref] ?? 0
        await client.execute({ sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, issuing_entity, created_by, created_at, updated_at, submitted_by, submitted_at, reviewed_by, reviewed_at, sent_by, sent_at, due_at) VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [id, p.id, s.ref, s.name, s.pct, s.position, go ? 'sent' : 'draft', amount, gstOf(amount, rate), q?.issuing_entity ?? null, createdBy, p.created_at, go ? go.at : p.created_at,
            go?.submittedBy ?? null, go?.submittedBy ? go.at - 60 * 60 : null, go?.submittedBy ? go.by : null, go?.submittedBy ? go.at : null, go ? go.by : null, go ? go.at : null, go ? dueOf(go.at) : null] })
        made++
      }
      /* the approval and its rebalance (Ryan) — the client's line, the re-size, his team's bell row */
      if (vo && vo.status === 'Confirmed' && vo.confirmed_at) {
        const voId = sid(p.id, 'vo:1')
        const changed = stages.filter((s) => !plan.has(s.name) && (drafts[s.ref] ?? 0) !== (original[s.ref] ?? 0)).map((s) => s.name)
        await ev(sid(voId, 'ev:vo-approved'), p.lead_id, p.id, 'project_vo_approved', null, vo.confirmed_at, { id: voId, number: 'VO-1', title: 'Feature wall and power points', name: p.client, via: 'link', from: money(base), to: money(contract), n: changed.length })
        if (changed.length) await ev(sid(voId, 'ev:rebalanced'), p.lead_id, p.id, 'project_money_rebalanced', null, vo.confirmed_at + 1, { number: 'VO-1', n: changed.length, names: changed, to: money(contract), name: p.name })
        for (const m of team) {
          await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'variation_approved',?,?,?,?,?,'in_app,email',NULL,?,?)`,
            args: [sid(`${voId}:${m}`, 'notif:vo-approved'), m, `${p.client} approved variation order VO-1`, `${p.name} · the contract is now ${money(contract)} — ${changed.length} unsent invoices re-sized`, `/projects/${p.id}/money`, p.lead_id, voId, vo.confirmed_at, vo.confirmed_at + 9 * H] })
        }
      }
    }
    /* the numbers, in the order the invoices went: INV-{YYYY}-001… (Settings › Projects' default pattern) */
    const unnumbered = rows<{ id: string; project_id: string; lead_id: string; stage_name: string; amount_minor: number; sent_at: number; due_at: number; sent_by: string; submitted_by: string | null; submitted_at: number | null; name: string; number: string }>(await client.execute(
      `SELECT i.id, i.project_id, p.lead_id, i.stage_name, i.amount_minor, i.sent_at, i.due_at, i.sent_by, i.submitted_by, i.submitted_at, p.name, p.number FROM project_invoices i JOIN projects p ON p.id = i.project_id WHERE i.status = 'sent' AND i.kind <> 'external' AND i.number IS NULL ORDER BY i.sent_at`))
    const given = rows<{ number: string }>(await client.execute(`SELECT number FROM project_invoices WHERE number IS NOT NULL`)).map((r) => r.number)
    for (const i of unnumbered) {
      const year = new Date(i.sent_at * 1000).getFullYear()
      const prefix = `INV-${year}-`
      const n = given.filter((x) => x.startsWith(prefix)).reduce((m, x) => Math.max(m, Number(x.slice(prefix.length)) || 0), 0) + 1
      const number = `${prefix}${String(n).padStart(3, '0')}`
      given.push(number)
      await client.execute({ sql: `UPDATE project_invoices SET number = ? WHERE id = ? AND number IS NULL`, args: [number, i.id] })
      if (i.submitted_by && i.submitted_at) await ev(sid(i.id, 'ev:submitted'), i.lead_id, i.project_id, 'project_invoice_submitted', i.submitted_by, i.submitted_at, { id: i.id, stage: i.stage_name, to: money(i.amount_minor), name: i.name, number: i.number })
      await ev(sid(i.id, 'ev:sent'), i.lead_id, i.project_id, 'project_invoice_sent', i.sent_by, i.sent_at, { id: i.id, stage: i.stage_name, title: number, to: money(i.amount_minor), due: fmtDay(i.due_at), name: i.name, number: i.number, ...(i.submitted_by ? { memberId: i.submitted_by } : {}) })
      sent++
    }
    note(`${made} invoice(s) made · ${sent} numbered and sent with their trail · ${vos} variation order(s)`)
  }

  /* ── R76 · Projects round 7 — ending and rules (Q-24 · Q-26; owner 2026-10-05: "build all of it with your recommendations") ─────────
     A fifth project, COMPLETED last month: Shalini Menon's BTO 4-room, a direct project (she came straight to the studio, invented — REG-343's
     trail in full). She signed in December 2025 (the 30/70 split: the deposit invoiced then, P-2025-001 · INV-2025-001), collected her keys
     in August and the works ran on a five-milestone schedule shared with her on her portal; every milestone done, the handover stage
     confirmed by her when Sarah asked; the completion invoice sent after the handover (numbered after the studio's last one, so the numbers
     keep their order); Sarah completed the handover. Her two payments are round 6's: R75 writes them, with every other demo payment, and
     runs after this block so their receipts take their place in the order the payments were confirmed. And one Deleted project for the Deleted projects sheet: Tan Wei Ling's, added by hand the day she called and deleted by Dane
     two days ago when she went with another studio — its client record went with it (nothing was invoiced). Idempotent: every id from `sid`, every insert OR IGNORE. */
  console.log('\nR76 project endings')
  {
    const { allocate, gstOf } = await import('../lib/projects/money')
    const { dayOf, isoOfDay } = await import('../lib/projects/schedule-model')
    let made = 0
    const ev = (id: string, leadId: string, projectId: string | null, kind: string, actor: string | null, at: number, detail: Record<string, unknown>) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, leadId, kind, actor, at, JSON.stringify(detail), projectId] })
    const money = (minor: number) => `S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)}`
    const dayStart = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
    const dayNo = (sec: number) => dayOf(new Date(sec * 1000))
    const [st] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))
    const studioRec = st ? (JSON.parse(st.value) as { gstRegistered?: boolean; gstPct?: number }) : {}
    const rate = studioRec.gstRegistered === false ? 0 : typeof studioRec.gstPct === 'number' ? studioRec.gstPct : 9

    /* ── Shalini Menon — completed last month ── */
    const lead = sid('direct:shalini-menon', 'lead')
    const pid = sid(lead, 'project')
    const [had] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM projects WHERE id = ?`, args: [pid] }))
    if (!had) {
      const name = 'BTO 4-Room — Shalini Menon'
      const number = 'P-2025-001'
      const createdAt = D0 - 300 * D + 15 * H   // December 2025: the contract signed before her keys came
      const handoverEnd = dayStart(D0 - 9 * D)   // the handover stage's last day — late last month
      const S = handoverEnd - 48 * D            // works began seven weeks before it
      const plan: [string, number][] = [['Hacking & demolition', 5], ['Electrical & plumbing', 10], ['Carpentry', 20], ['Painting & cleaning', 6], ['Handover & defect check', 4]]
      const ms: { id: string; title: string; start: number; end: number; done: number }[] = []
      let cur = S
      for (const [i, [title, days]] of plan.entries()) {
        const start = i === 0 ? S : cur + 2 * D
        const end = start + (days - 1) * D
        ms.push({ id: sid(`${pid}:${i}`, 'milestone'), title, start, end, done: end + 17 * H })
        cur = end
      }
      const h = ms[ms.length - 1]!
      h.done = h.end + 12 * H
      const split = { template: '30-70', rows: [{ name: 'Deposit', pct: 30 }, { name: 'Completion', pct: 70 }] }
      const value = 4_120_000
      const homeowner = sid(lead, 'homeowner')
      const askedAt = h.done + 5 * 60
      const answeredAt = h.done + 8 * H
      const share1 = S - 2 * D + 15 * H, share2 = askedAt + 5 * 60
      const maxSent = Number(rows<{ at: number | null }>(await client.execute(`SELECT max(sent_at) AS at FROM project_invoices WHERE number IS NOT NULL`))[0]?.at ?? 0)
      const completionSent = Math.max(h.done + H, maxSent + 2 * H)
      /* (REG-1073) Sarah, a Designer, completes it only with every checklist item met (REG-1020): after Shalini confirmed the handover stage
         AND after the completion payment is in — R75 records it two days and four hours after the invoice went (`shaliniPay`) — so nothing is
         outstanding when she presses Complete handover. The step after the R75 block mends a run written before this rule. */
      const paidIn = completionSent + 2 * D + 4 * H
      const completedAt = Math.min(NOW - 2 * H, Math.max(answeredAt + 2 * D + 2 * H, paidIn + 2 * H))
      const rowsOf = (state: string, confirm: string | null) => ms.map((m, i) => ({ id: m.id, title: m.title, start: isoOfDay(dayNo(m.start)), end: isoOfDay(dayNo(m.end)), state, confirm: i === ms.length - 1 ? confirm : null }))
      const snap = (state: string, confirm: string | null) => JSON.stringify({ v: 1, rows: rowsOf(state, confirm), handover: isoOfDay(dayNo(h.end)) })
      const was = rowsOf('coming_up', null), now = rowsOf('done', 'asked')
      await client.batch([
        { sql: `INSERT OR IGNORE INTO leads (id, name, phone, email, source, property_type, property_address, lead_address, budget_minor, stage, style, key_collection, condition, area_sqft, estimated_start_date, notes, area, ic_number, customer_id, qanvast_lead_id, deleted_at, seen_at, delete_reason, stage_before_delete, created_at, updated_at, direct) VALUES (?,?,?,?,?,?,?,NULL,?,'Won',NULL,NULL,NULL,NULL,NULL,NULL,'West',NULL,NULL,NULL,NULL,?,NULL,NULL,?,?,1)`,
          args: [lead, 'Shalini Menon', '96284417', 'shalini.menon@gmail.com', 'Others', 'BTO 4-Room', 'Blk 132A Tengah Garden Walk, #08-214', value, createdAt, createdAt, completedAt] },
        { sql: `INSERT OR IGNORE INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?,?,?,?)`, args: [sid(lead, 'assignee'), lead, 'sarah', createdAt] },
        { sql: `INSERT OR IGNORE INTO projects (id, lead_id, number, name, stage, project_type, quote_id, contract_id, agreed_value_minor, payment_template, start_date, target_end_date, started_at, completed_at, created_by, created_at, updated_at, deleted_at, deleted_by, completed_by, complete_note, complete_reason) VALUES (?,?,?,?,'completed','Whole-home renovation',NULL,NULL,?,?,?,?,?,?,'dane',?,?,NULL,NULL,'sarah',?,NULL)`,
          args: [pid, lead, number, name, value, JSON.stringify(split), S, h.end, S + 9 * H, completedAt, createdAt, completedAt, 'Keys handed back; Shalini signed off the defect list on site.'] },
      ], 'write')
      await ev(sid(pid, 'ev:created'), lead, pid, 'project_created', 'dane', createdAt, { name, number, direct: true })
      await ev(sid(pid, 'ev:dates'), lead, pid, 'project_edited', 'sarah', S - 20 * D + 11 * H, { name, number, fields: [{ key: 'startDate', label: 'Start date', from: '—', to: displayDate(new Date(S * 1000)) }] })
      /* her portal: invited before works began, opened that evening */
      await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_profiles (id, phone, name, email, created_at, updated_at) VALUES (?,?,?,?,?,?)`, args: [homeowner, '96284417', 'Shalini Menon', 'shalini.menon@gmail.com', S - 3 * D + 10 * H, S - 3 * D + 10 * H] })
      const link = sid(lead, 'portal-link')
      await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, last_asked_at, created_at, invited_by, opened_at, last_opened_at, withdrawn_at, withdrawn_by) VALUES (?,?,?,?,1,?,NULL,?,'sarah',?,?,NULL,NULL)`,
        args: [link, homeowner, lead, sid(lead, 'portal-token'), S - 3 * D + 10 * H, S - 3 * D + 10 * H, S - 3 * D + 20 * H, answeredAt] })
      await ev(`ev-invite_sent-${link.slice(0, 8)}`, lead, null, 'invite_sent', 'sarah', S - 3 * D + 10 * H, {})
      await ev(sid(lead, 'ev:portal-opened'), lead, null, 'portal_opened', null, S - 3 * D + 20 * H, { name: 'Shalini Menon' })
      /* the schedule: five milestones in a chain, each done; the handover stage asked, then confirmed by Shalini */
      for (const [i, m] of ms.entries()) {
        const last = i === ms.length - 1
        await client.execute({ sql: `INSERT OR IGNORE INTO project_milestones (id, project_id, title, position, start_date, end_date, status, follows_id, gap_days, payment_ref, payment_due, client_visible, confirm_asked_at, confirm_answer, confirm_note, confirm_answered_at, confirm_answered_by, waiting_on, waiting_member_id, waiting_name, waiting_note, waiting_since, waiting_until, plan_start_date, plan_end_date, done_at, created_by, updated_by, created_at, updated_at, deleted_at) VALUES (?,?,?,?,?,?,'done',?,?,?,?,1,?,?,NULL,?,?,NULL,NULL,NULL,NULL,NULL,NULL,?,?,?,'sarah','sarah',?,?,NULL)`,
          args: [m.id, pid, m.title, i, m.start, m.end, i ? ms[i - 1]!.id : null, i ? 2 : 1, last ? 'split:1' : null, 'end', last ? askedAt : null, last ? 'confirmed' : null, last ? answeredAt : null, last ? homeowner : null, m.start, m.end, m.done, share1 - H, last ? answeredAt : m.done] })
        await ev(sid(m.id, 'ev:running'), lead, pid, 'project_milestone_status', 'sarah', m.start + 9 * H, { name, number, id: m.id, title: m.title, from: 'Not started', to: 'In progress' })
        await ev(sid(m.id, 'ev:done'), lead, pid, 'project_milestone_status', 'sarah', m.done, { name, number, id: m.id, title: m.title, from: 'In progress', to: 'Done' })
      }
      /* (REG-1071) started from Company › Templates › Schedules' "Whole-home renovation (HDB)" (R69), by id — its "Used by" counts it */
      const tpl = sid('schedule-template:renovation', 'schedule_template')
      const [tplRow] = rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM schedule_templates WHERE id = ?`, args: [tpl] }))
      await ev(sid(pid, 'ev:schedule'), lead, pid, 'project_schedule_created', 'sarah', share1 - H, { name, number, n: ms.length, ...(tplRow ? { source: `from the template “${tplRow.name}”`, templateId: tpl } : { source: '' }) })
      await client.execute({ sql: `INSERT OR IGNORE INTO project_schedule_shares (id, project_id, snapshot, changes, note, shared_by, shared_at) VALUES (?,?,?,?,?,'sarah',?)`, args: [sid(pid, 'share:1'), pid, snap('coming_up', null), '[]', 'Here is the plan for your renovation — the dates move with the work.', share1] })
      await ev(sid(pid, 'ev:share:1'), lead, pid, 'project_schedule_shared', 'sarah', share1, { name, number, n: 0, note: 'Here is the plan for your renovation — the dates move with the work.' })
      await client.execute({ sql: `INSERT OR IGNORE INTO project_schedule_shares (id, project_id, snapshot, changes, note, shared_by, shared_at) VALUES (?,?,?,?,?,'sarah',?)`, args: [sid(pid, 'share:2'), pid, snap('done', 'asked'), JSON.stringify(now.map((r, i) => ({ id: r.id, title: r.title, was: was[i], now: r }))), 'All done — could you confirm the handover on your portal?', share2] })
      await ev(sid(pid, 'ev:share:2'), lead, pid, 'project_schedule_shared', 'sarah', share2, { name, number, n: ms.length, note: 'All done — could you confirm the handover on your portal?' })
      await ev(sid(h.id, 'ev:confirmed'), lead, pid, 'project_stage_confirmed', null, answeredAt, { name: 'Shalini Menon', number, id: h.id, title: h.title })
      /* the update she read before the handover: Sarah's, reviewed by Dane (Settings › Projects › Updates need review is on) */
      const paint = ms[3]!, upd = sid(pid, 'update:ready')
      const wrote = paint.done + H, approved = paint.done + 3 * H, opened = paint.done + 6 * H
      const u = await client.execute({ sql: `INSERT OR IGNORE INTO project_updates (id, project_id, title, body, milestone_id, status, author_id, created_at, updated_at, submitted_by, submitted_at, reviewed_by, reviewed_at, published_by, published_at, client_opened_at) VALUES (?,?,?,?,?,'published','sarah',?,?,'sarah',?,'dane',?,'dane',?,?)`,
        args: [upd, pid, 'Painting done — your home is nearly ready', '<p>The walls and ceilings are painted and the whole flat has had its first clean. We start the handover check on the next working day — please keep an hour free to walk through it with Sarah.</p>', paint.id, wrote, approved, wrote, approved, approved, opened] })
      if (u.rowsAffected) {
        await ev(sid(upd, 'ev:project_update_submitted'), lead, pid, 'project_update_submitted', 'sarah', wrote, { id: upd, title: 'Painting done — your home is nearly ready', name, number })
        await ev(sid(upd, 'ev:project_update_approved'), lead, pid, 'project_update_approved', 'dane', approved, { id: upd, title: 'Painting done — your home is nearly ready', name, number })
      }
      await client.execute({ sql: `UPDATE homeowner_lead_links SET schedule_seen_at = ? WHERE id = ? AND schedule_seen_at IS NULL`, args: [answeredAt - 10 * 60, link] })
      /* the invoices: the deposit when she signed (2025's first), the completion after the handover (after the studio's last number) */
      const original = allocate(value, split.rows.map((r, i) => ({ id: `split:${i}`, pct: r.pct, amountMinor: 0, locked: false })))
      const given = rows<{ number: string }>(await client.execute(`SELECT number FROM project_invoices WHERE number IS NOT NULL`)).map((r) => r.number)
      const nextNo = (sec: number) => { const y = new Date(sec * 1000).getFullYear(); const pre = `INV-${y}-`; const n = given.filter((x) => x.startsWith(pre)).reduce((m, x) => Math.max(m, Number(x.slice(pre.length)) || 0), 0) + 1; const no = `${pre}${String(n).padStart(3, '0')}`; given.push(no); return no }
      const sends = [{ i: 0, at: createdAt + 2 * H }, { i: 1, at: completionSent }]
      for (const s of sends) {
        const r = split.rows[s.i]!
        const id = sid(`${pid}:split:${s.i}`, 'invoice')
        const amount = original[`split:${s.i}`] ?? 0
        const no = nextNo(s.at)
        const due = dayStart(s.at + 7 * D)
        await client.execute({ sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, issuing_entity, created_by, created_at, updated_at, sent_by, sent_at, due_at) VALUES (?,?,?,?,?,?,?,'sent',?,?,NULL,'dane',?,?,'dane',?,?)`,
          args: [id, pid, `split:${s.i}`, r.name, r.pct, s.i, no, amount, gstOf(amount, rate), createdAt, s.at, s.at, due] })
        await ev(sid(id, 'ev:sent'), lead, pid, 'project_invoice_sent', 'dane', s.at, { id, stage: r.name, title: no, to: money(amount), due: displayDate(new Date(due * 1000)), name, number })
      }
      await ev(sid(pid, 'ev:completed'), lead, pid, 'project_completed', 'sarah', completedAt, { name, number, note: 'Keys handed back; Shalini signed off the defect list on site.' })
      made++
    }
    /* her payments are round 6's records: R75, right after this block, writes them with their receipts, files and lines */

    /* ── Tan Wei Ling — one Deleted project for the Deleted projects sheet ── */
    const tLead = sid('direct:tan-wei-ling', 'lead')
    const tPid = sid(tLead, 'project')
    const [tHad] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM projects WHERE id = ?`, args: [tPid] }))
    if (!tHad) {
      const { formatProjectNumber, DEFAULT_PROJECT_NUMBERING, nextProjectSeq } = await import('../lib/projects/model')
      const numbers = rows<{ number: string }>(await client.execute(`SELECT number FROM projects`)).map((r) => r.number)
      const madeAt = D0 - 3 * D + 16 * H
      const number = formatProjectNumber(DEFAULT_PROJECT_NUMBERING, nextProjectSeq(numbers, DEFAULT_PROJECT_NUMBERING), new Date(madeAt * 1000))
      const name = 'HDB 3-Room — Tan Wei Ling'
      const gone = D0 - 2 * D + 10 * H
      await client.batch([
        { sql: `INSERT OR IGNORE INTO leads (id, name, phone, email, source, property_type, property_address, lead_address, budget_minor, stage, style, key_collection, condition, area_sqft, estimated_start_date, notes, area, ic_number, customer_id, qanvast_lead_id, deleted_at, seen_at, delete_reason, stage_before_delete, created_at, updated_at, direct) VALUES (?,?,?,?,?,?,?,NULL,?,'Won',NULL,NULL,NULL,NULL,NULL,NULL,'East',NULL,NULL,NULL,?,?,'Its project was deleted','Won',?,?,1)`,
          args: [tLead, 'Tan Wei Ling', '82916473', null, 'Others', 'HDB 3-Room', 'Blk 418 Bedok North Avenue 2, #05-31', 1_850_000, gone, madeAt, madeAt, gone] },
        { sql: `INSERT OR IGNORE INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?,?,?,?)`, args: [sid(tLead, 'assignee'), tLead, 'michelle', madeAt] },
        { sql: `INSERT OR IGNORE INTO projects (id, lead_id, number, name, stage, project_type, quote_id, contract_id, agreed_value_minor, payment_template, start_date, target_end_date, started_at, completed_at, created_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?,?,?,?,'setting_up','Partial renovation',NULL,NULL,?,NULL,NULL,NULL,NULL,NULL,'michelle',?,?,?,'dane')`,
          args: [tPid, tLead, number, name, 1_850_000, madeAt, gone, gone] },
      ], 'write')
      await ev(sid(tPid, 'ev:created'), tLead, tPid, 'project_created', 'michelle', madeAt, { name, number, direct: true })
      await ev(sid(tPid, 'ev:deleted'), tLead, tPid, 'project_deleted', 'dane', gone, { name, number, direct: true })
      made++
    }
    note(`${made} project ending(s) written — Shalini Menon's completed project and Tan Wei Ling's deleted one`)
  }

  /* ── R75 · Projects round 6 — money in, part two (F-10 · F-11 · F-12 · F-13 · F-14 · F-18 · Q-48; owner 2026-10-05: "build all of it with
     your recommendations") ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
     The payments the demo's invoices have had, each with its trail (REG-343): its row, its receipt (RCT-{YYYY}-{seq} in the order they were
     confirmed, filed in Files › Payments), its Activity line and the bell rows it raised.
     - Benjamin Han (board 4's figures): the Deposit paid on 8 Aug (Dane recorded the bank transfer) and Commencement on 21 Aug (Germaine
       recorded the PayNow) — S$27,713.25 of S$69,283.13; Mid-project S$20,784.94 was due on 2 Oct and is overdue (no payment).
     - Ryan D'Souza (Michelle's): the Deposit paid on 28 Jul; Commencement part paid — a S$10,000 cheque on 14 Aug — and the rest
       (S$13,370.04) sent by Ryan from his portal on 3 Oct with his bank's confirmation, waiting for Michelle (the assigned designer confirms,
       Settings › Projects' default). He opened his portal for the first time the evening before (its first-open line and his team's bell row).
     - Aisha Rahman: her Deposit paid by cheque on 8 Sep (Michelle recorded it), the cheque returned unpaid — Dane reversed it on 11 Sep, its
       receipt reads Reversed — and paid again by bank transfer on 12 Sep.
     - Shalini Menon (R76's completed project, written just above — which is why this block runs after it): her Deposit by bank transfer
       two days after it was invoiced in December 2025 (the studio's first receipt, RCT-2025-001) and her Completion by PayNow two days after
       that invoice — Sarah recorded both.
     Idempotent: a payment is written once by its fixed id; a row an earlier run left without its trail (R76's, before round 6's table was
     merged in) is completed in place under the same id. */
  console.log('\nR75 project payments')
  {
    const { readFileSync } = await import('node:fs')
    type Inv = { id: string; project_id: string; lead_id: string; stage_name: string; number: string | null; amount_minor: number; sent_at: number | null; status: string; pname: string; pnumber: string; client: string }
    const invs = rows<Inv>(await client.execute(`SELECT i.id, i.project_id, p.lead_id, i.stage_name, i.number, i.amount_minor, i.sent_at, i.status, p.name AS pname, p.number AS pnumber, l.name AS client FROM project_invoices i JOIN projects p ON p.id = i.project_id JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NULL`))
    const inv = (client_: string, stage: string) => invs.find((i) => i.client === client_ && i.stage_name === stage && i.status === 'sent') ?? null
    const at = (y: number, m: number, d: number, h = 0, mi = 0) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000)
    const day = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
    const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
    const ev = (id: string, i: Inv, kind: string, actor: string | null, atSec: number, detail: Record<string, unknown>) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, i.lead_id, kind, actor, atSec, JSON.stringify({ name: i.pname, number: i.pnumber, ...detail }), i.project_id] })
    const bell = (id: string, member: string, kind: string, title: string, body: string, href: string, leadId: string, actor: string | null, atSec: number, readAt: number | null) =>
      client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?)`, args: [id, member, kind, title, body, href, leadId, 'in_app', actor, atSec, readAt] })
    const folderOf = async (leadId: string, owner: string | null, atSec: number) => {
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Payments' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [leadId] }))
      if (have) return have.id
      const id = sid(leadId, 'files:payments')
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder','Payments',NULL,?,NULL,?,NULL,NULL,?)`, args: [id, leadId, atSec, owner, atSec] })
      return id
    }
    const given = rows<{ n: string }>(await client.execute(`SELECT receipt_number AS n FROM project_payments WHERE receipt_number IS NOT NULL`)).map((r) => r.n)
    const nextReceipt = (atSec: number) => {
      const prefix = `RCT-${new Date(atSec * 1000).getFullYear()}-`
      const n = given.filter((x) => x.startsWith(prefix)).reduce((m, x) => Math.max(m, Number(x.slice(prefix.length)) || 0), 0) + 1
      const number = `${prefix}${String(n).padStart(3, '0')}`
      given.push(number)
      return number
    }
    let made = 0
    type Pay = { key: string; id?: string; i: Inv | null; amount: number; paidOn: number; method: string; reference: string | null; by: string; recordedAt: number; reversed?: { by: string; at: number; reason: string } }
    /* the studio's own, in the order they were confirmed (their receipts number in that order) */
    const ben = { dep: inv('Benjamin Han', 'Deposit'), com: inv('Benjamin Han', 'Commencement') }
    const ryan = { dep: inv('Ryan D’Souza', 'Deposit'), com: inv('Ryan D’Souza', 'Commencement') }
    const aisha = { dep: inv('Aisha Rahman', 'Deposit') }
    const shalini = { dep: inv('Shalini Menon', 'Deposit'), com: inv('Shalini Menon', 'Completion') }
    /* hers ride on R76's invoices: paid two days and three hours after each was sent, recorded an hour later (ids as R76 first gave them) */
    const shaliniPay = (key: string, i: Inv | null, method: string, reference: string): Pay => {
      const paidOn = (i?.sent_at ?? 0) + 2 * D + 3 * H
      return { key, id: i ? sid(i.id, 'payment') : undefined, i, amount: i?.amount_minor ?? 0, paidOn, method, reference, by: 'sarah', recordedAt: paidOn + H }
    }
    const studioPays: Pay[] = [
      shaliniPay('shalini:deposit', shalini.dep, 'bank_transfer', 'FAST 4471 2093'),
      shaliniPay('shalini:completion', shalini.com, 'paynow', 'PayNow 88 3105'),
      { key: 'ryan:deposit', i: ryan.dep, amount: ryan.dep?.amount_minor ?? 0, paidOn: at(2026, 7, 28), method: 'bank_transfer', reference: 'IBG 280726-5512', by: 'michelle', recordedAt: at(2026, 7, 28, 11, 5) },
      { key: 'ben:deposit', i: ben.dep, amount: ben.dep?.amount_minor ?? 0, paidOn: at(2026, 8, 8), method: 'bank_transfer', reference: 'FAST 080826-0193', by: 'dane', recordedAt: at(2026, 8, 8, 17, 30) },
      { key: 'ryan:commencement:cheque', i: ryan.com, amount: 1_000_000, paidOn: at(2026, 8, 14), method: 'cheque', reference: 'OCBC cheque 004417', by: 'michelle', recordedAt: at(2026, 8, 14, 15, 0) },
      { key: 'ben:commencement', i: ben.com, amount: ben.com?.amount_minor ?? 0, paidOn: at(2026, 8, 21), method: 'paynow', reference: 'TXN 210826-7740', by: 'germaine', recordedAt: at(2026, 8, 21, 16, 40) },
      { key: 'aisha:deposit:cheque', i: aisha.dep, amount: aisha.dep?.amount_minor ?? 0, paidOn: at(2026, 9, 8), method: 'cheque', reference: 'UOB cheque 118230', by: 'michelle', recordedAt: at(2026, 9, 8, 10, 30), reversed: { by: 'dane', at: at(2026, 9, 11, 9, 40), reason: 'The cheque was returned unpaid by the bank' } },
      { key: 'aisha:deposit:transfer', i: aisha.dep, amount: aisha.dep?.amount_minor ?? 0, paidOn: at(2026, 9, 12), method: 'bank_transfer', reference: 'FAST 120926-3308', by: 'michelle', recordedAt: at(2026, 9, 12, 14, 0) },
    ]
    studioPays.sort((a, b) => a.recordedAt - b.recordedAt)
    for (const p of studioPays) {
      if (!p.i || !p.amount) continue
      const id = p.id ?? sid(`${p.i.id}:${p.key}`, 'payment')
      const [have] = rows<{ id: string; receipt: string | null }>(await client.execute({ sql: `SELECT id, receipt_number AS receipt FROM project_payments WHERE id = ?`, args: [id] }))
      if (have?.receipt) continue   // written with its trail; a row without its receipt is completed below, in place
      const folder = await folderOf(p.i.lead_id, p.by, p.recordedAt)
      const number = nextReceipt(p.recordedAt)
      const fileId = sid(id, 'file:receipt')
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`,
        args: [fileId, p.i.lead_id, `${number} · ${p.i.stage_name}${p.reversed ? ' (reversed)' : ''}.pdf`, p.recordedAt, folder, p.by, p.reversed?.at ?? p.recordedAt] })
      await client.execute({ sql: `INSERT INTO project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, note, proof_file_id, source, status, trusted, recorded_by, submitted_by, confirmed_by, confirmed_at, receipt_number, receipt_file_id, reversed_by, reversed_at, reverse_reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,NULL,NULL,'studio',?,0,?,NULL,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(id) DO UPDATE SET project_id = excluded.project_id, invoice_id = excluded.invoice_id, amount_minor = excluded.amount_minor, paid_on = excluded.paid_on, method = excluded.method, reference = excluded.reference, note = excluded.note, proof_file_id = excluded.proof_file_id, source = excluded.source, status = excluded.status, trusted = excluded.trusted, recorded_by = excluded.recorded_by, submitted_by = excluded.submitted_by, confirmed_by = excluded.confirmed_by, confirmed_at = excluded.confirmed_at, receipt_number = excluded.receipt_number, receipt_file_id = excluded.receipt_file_id, reversed_by = excluded.reversed_by, reversed_at = excluded.reversed_at, reverse_reason = excluded.reverse_reason, created_at = excluded.created_at, updated_at = excluded.updated_at
          WHERE project_payments.receipt_number IS NULL`,
        args: [id, p.i.project_id, p.i.id, p.amount, day(p.paidOn), p.method, p.reference, p.reversed ? 'reversed' : 'confirmed', p.by, p.by, p.recordedAt, number, fileId, p.reversed?.by ?? null, p.reversed?.at ?? null, p.reversed?.reason ?? null, p.recordedAt, p.reversed?.at ?? p.recordedAt] })
      await ev(sid(id, 'ev:recorded'), p.i, 'project_payment_recorded', p.by, p.recordedAt, { id, invoice: p.i.id, stage: p.i.stage_name, title: p.i.number ?? '', to: money(p.amount), method: p.method, receipt: number })
      if (p.reversed) {
        await ev(sid(id, 'ev:reversed'), p.i, 'project_payment_reversed', p.reversed.by, p.reversed.at, { id, invoice: p.i.id, stage: p.i.stage_name, title: p.i.number ?? '', receipt: number, to: money(p.amount), reason: p.reversed.reason })
        const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ?`, args: [p.i.lead_id] })).map((m) => m.member_id).filter((m) => m !== p.reversed!.by)
        for (const m of team) await bell(sid(`${id}:${m}`, 'notif:reversed'), m, 'payment_reversed', `A payment of ${money(p.amount)} from ${p.i.client} was reversed`, `${p.i.stage_name} · ${number} — “${p.reversed.reason}”`, `/projects/${p.i.project_id}/money?open=${id}`, p.i.lead_id, p.reversed.by, p.reversed.at, p.reversed.at + 2 * H)
      }
      made++
    }
    /* Ryan's own, from his portal: he opened it the evening before (its first-open trail), then sent the rest of the Commencement */
    if (ryan.com) {
      const i = ryan.com
      const id = sid(`${i.id}:ryan:commencement:portal`, 'payment')
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_payments WHERE id = ?`, args: [id] }))
      const [link] = rows<{ id: string; homeowner_id: string; opened_at: number | null }>(await client.execute({ sql: `SELECT id, homeowner_id, opened_at FROM homeowner_lead_links WHERE lead_id = ? AND withdrawn_at IS NULL AND invited_at IS NOT NULL LIMIT 1`, args: [i.lead_id] }))
      if (!have && link) {
        const opened = at(2026, 10, 2, 21, 5), sentAt = at(2026, 10, 3, 20, 15)
        const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [i.lead_id] })).map((m) => m.member_id)
        if (!link.opened_at) {
          await client.execute({ sql: `UPDATE homeowner_lead_links SET opened_at = ?, last_opened_at = ? WHERE id = ? AND opened_at IS NULL`, args: [opened, sentAt + 5 * 60, link.id] })
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,'portal_opened',NULL,?,?,NULL)`, args: [sid(i.lead_id, 'ev:portal-opened'), i.lead_id, opened, JSON.stringify({ name: i.client })] })
          for (const m of team) await bell(sid(`${i.lead_id}:${m}`, 'notif:portal-opened'), m, 'portal_opened', `${i.client} opened their portal for the first time`, 'They can see what needs them, their files and the steps ahead.', `/projects/${i.project_id}`, i.lead_id, null, opened, opened + 12 * H)
        }
        const folder = await folderOf(i.lead_id, null, sentAt)
        const fileId = sid(id, 'file:proof')
        const png = readFileSync(new URL('../public/projects/payments/ryan-bank-transfer.png', import.meta.url))
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'image','Transfer to Demo Studio, 3 Oct.png',?,?,?,NULL,?,'image/png',?)`,
          args: [fileId, i.lead_id, `/files/img/${fileId}`, sentAt, folder, png.length, sentAt] })
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?,?)`, args: [fileId, `data:image/png;base64,${png.toString('base64')}`] })
        const amount = i.amount_minor - 1_000_000
        await client.execute({ sql: `INSERT OR IGNORE INTO project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, note, proof_file_id, source, status, trusted, recorded_by, submitted_by, created_at, updated_at) VALUES (?,?,?,?,?,'bank_transfer','INV-2026-002',?,?,'client','to_confirm',0,NULL,?,?,?)`,
          args: [id, i.project_id, i.id, amount, day(sentAt), 'The rest of the commencement payment — sorry it took a while.', fileId, link.homeowner_id, sentAt, sentAt] })
        await ev(sid(id, 'ev:submitted'), i, 'project_payment_submitted', null, sentAt, { id, invoice: i.id, stage: i.stage_name, title: i.number ?? '', to: money(amount), method: 'bank_transfer', trusted: false })
        const confirmer = team.find((m) => m !== 'dane') ?? 'dane'   // the assigned designer (Michelle) — Settings › Projects' default
        await bell(sid(`${id}:${confirmer}`, 'notif:to-confirm'), confirmer, 'payment_to_confirm', `${i.client} says they paid ${money(amount)}`, `${i.stage_name} · ${i.number ?? ''} — check it arrived and confirm`, `/projects/${i.project_id}/money?open=${id}`, i.lead_id, null, sentAt, null)
        made++
      }
    }
    note(`${made} payment(s) written with their receipts, files, lines and bell rows`)
  }

  /* ── R76 (continued) · Shalini Menon's trail, made lawful (REG-1071 · REG-1073) ─────────────────────────────────────────────────────
     It needs R75's records, so it runs here. A Designer completes a handover only with every checklist item met (REG-1020): her completion
     comes after the last thing the checklist reads — the completion payment confirmed, the completion invoice sent, her "it's done" on the
     handover stage — or it moves to two hours after it (with the project's and the lead's updated stamps and its Activity line). Her
     schedule's first line names the template it started from by id (Company › Templates › Schedules counts it). Idempotent. */
  console.log('\nR76 project endings — the trail mended')
  {
    let mended = 0
    const lead = sid('direct:shalini-menon', 'lead')
    const pid = sid(lead, 'project')
    const [p] = rows<{ stage: string; completed_at: number | null; complete_reason: string | null; updated_at: number }>(await client.execute({ sql: `SELECT stage, completed_at, complete_reason, updated_at FROM projects WHERE id = ? AND deleted_at IS NULL`, args: [pid] }))
    if (p && p.stage === 'completed' && p.completed_at && !p.complete_reason) {
      const one = async (q: string) => Number(rows<{ at: number | null }>(await client.execute({ sql: q, args: [pid] }))[0]?.at ?? 0)
      const floor = Math.max(
        await one(`SELECT max(coalesce(confirmed_at, created_at)) AS at FROM project_payments WHERE project_id = ? AND status = 'confirmed'`),
        await one(`SELECT max(sent_at) AS at FROM project_invoices WHERE project_id = ? AND status = 'sent'`),
        await one(`SELECT max(coalesce(confirm_answered_at, done_at)) AS at FROM project_milestones WHERE project_id = ? AND deleted_at IS NULL`),
      )
      if (floor && Number(p.completed_at) <= floor) {
        const was = Number(p.completed_at)
        const at = Math.max(floor + 60, Math.min(NOW - 60, floor + 2 * H))
        await client.batch([
          { sql: `UPDATE projects SET completed_at = ?, updated_at = CASE WHEN updated_at <= ? THEN ? ELSE updated_at END WHERE id = ?`, args: [at, at, at, pid] },
          { sql: `UPDATE leads SET updated_at = ? WHERE id = ? AND updated_at = ?`, args: [at, lead, was] },
          { sql: `UPDATE lead_events SET at = ? WHERE id = ?`, args: [at, sid(pid, 'ev:completed')] },
        ], 'write')
        mended++
      }
    }
    const tpl = sid('schedule-template:renovation', 'schedule_template')
    const [t] = rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM schedule_templates WHERE id = ?`, args: [tpl] }))
    if (t) {
      const x = await client.execute({ sql: `UPDATE lead_events SET detail = json_set(json_set(detail, '$.source', ?), '$.templateId', ?) WHERE id = ? AND json_extract(detail, '$.templateId') IS NULL`, args: [`from the template “${t.name}”`, tpl, sid(pid, 'ev:schedule')] })
      mended += x.rowsAffected
    }
    /* any other schedule line written before the id was recorded names its template in its words — it takes that template's id */
    const y = await client.execute(`UPDATE lead_events SET detail = json_set(detail, '$.templateId', (SELECT t.id FROM schedule_templates t WHERE json_extract(lead_events.detail, '$.source') = 'from the template “' || t.name || '”' ORDER BY t.deleted_at IS NOT NULL, t.created_at LIMIT 1))
      WHERE kind = 'project_schedule_created' AND json_extract(detail, '$.templateId') IS NULL AND EXISTS (SELECT 1 FROM schedule_templates t WHERE json_extract(lead_events.detail, '$.source') = 'from the template “' || t.name || '”')`)
    mended += y.rowsAffected
    note(mended ? `${mended} part(s) of Shalini Menon’s trail mended` : 'Shalini Menon’s trail holds')
  }

  /* ── R77 · The client portal, part two (Projects round 9 — Q-41 · Q-42 · Q-44 · Q-45; the Client Portal Proposal, boards 8 · 9) ───────────
     Board 9's set-up: all six sections on (`portal_sections`), the studio's welcome line set (`portal_welcome`). Board 8's "someone else from the
     household": Benjamin Han's wife, Mei Ling Han — her own number, added and sent the link by his designer five weeks after him, opened once
     that evening (her own Activity lines and the bell row his team read). Benjamin's bell: every row his records raise (lib/portal/
     notifications-model.ts — keys built here the same way) read as of his last look, but the newest update's — Kitchen cabinets, which R73 left
     unopened on his page — so one is unread. Round 6's payment rows are read too when its `project_payments` exists. Idempotent. */
  console.log('\nR77 client portal — part two')
  {
    let made = 0
    made += (await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('portal_sections', ?, ?)`, args: [JSON.stringify({ schedule: true, updates: true, money: true, files: true, designs: true, choices: true }), NOW] })).rowsAffected
    made += (await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('portal_welcome', ?, ?)`, args: [JSON.stringify({ line: 'Welcome to your renovation' }), NOW] })).rowsAffected
    const [ben] = rows<{ lead: string; pid: string | null; phone: string }>(await client.execute(`SELECT l.id AS lead, p.id AS pid, l.phone FROM leads l LEFT JOIN projects p ON p.lead_id = l.id AND p.deleted_at IS NULL WHERE l.name = 'Benjamin Han' AND l.deleted_at IS NULL LIMIT 1`))
    const [link] = ben ? rows<{ id: string; homeowner: string; invited: number | null; last: number | null }>(await client.execute({ sql: `SELECT id, homeowner_id AS homeowner, invited_at AS invited, last_opened_at AS last FROM homeowner_lead_links WHERE lead_id = ?`, args: [ben.lead] })) : []
    if (!ben || !link?.invited) note('Benjamin Han or his portal link missing — skipped')
    else {
      const team = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [ben.lead] })).map((m) => m.member_id)
      const by = team.includes('germaine') ? 'germaine' : team[0] ?? 'dane'
      /* his wife: added and sent the link five weeks after him, opened that evening — once */
      const PHONE = '91827364', NAME = 'Mei Ling Han'
      const added = link.invited + 35 * D, opened = added + 9 * H
      const profile = sid(ben.lead, 'homeowner:household')
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_profiles (id, phone, name, email, created_at, updated_at) VALUES (?,?,?,NULL,?,?)`, args: [profile, PHONE, NAME, added, added] })).rowsAffected
      const [h] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM homeowner_profiles WHERE phone = ?`, args: [PHONE] }))
      const hid = sid(ben.lead, 'household:wife')
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO homeowner_household_links (id, lead_id, homeowner_id, relationship, added_by, created_at, invited_at, invited_by, opened_at, last_opened_at, withdrawn_at, withdrawn_by, schedule_seen_at, removed_at, removed_by) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,NULL,NULL,NULL,NULL)`,
        args: [hid, ben.lead, h!.id, 'Wife', by, added, added, by, opened, opened] })
      made += r.rowsAffected
      const ev = async (id: string, kind: string, actor: string | null, at: number, detail: object) => {
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,?,?,?,?)`, args: [id, ben.lead, kind, actor, at, JSON.stringify(detail)] })).rowsAffected
      }
      await ev(sid(hid, 'ev:added'), 'household_added', by, added, { id: hid, name: NAME, title: 'Benjamin Han', reason: 'Wife', kind: 'invited' })
      await ev(sid(hid, 'ev:opened'), 'household_opened', null, opened, { id: hid, name: NAME, title: 'Benjamin Han' })
      for (const m of team) {
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'portal_opened',?,?,?,?,NULL,'in_app',NULL,?,?)`,
          args: [sid(`${hid}:${m}`, 'notif:household-opened'), m, `${NAME} opened Benjamin Han’s portal for the first time`, 'From Benjamin Han’s household — they see what Benjamin sees.', ben.pid ? `/projects/${ben.pid}` : `/leads/${ben.lead}`, ben.lead, opened, opened + 12 * H] })).rowsAffected
      }
      /* his bell — the rows his records raise, keyed as the portal keys them; read as of his last look, but the newest update */
      if (ben.pid && link.last) {
        type Row = { key: string; at: number }
        const pid = ben.pid
        const keys: Row[] = []
        for (const x of rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, shared_at AS at FROM project_schedule_shares WHERE project_id = ?`, args: [pid] }))) keys.push({ key: `share:${x.id}`, at: x.at })
        const ups = rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, coalesce(published_at, created_at) AS at FROM project_updates WHERE project_id = ? AND status = 'published' AND deleted_at IS NULL ORDER BY at DESC`, args: [pid] }))
        const newest = ups[0]?.id ?? null
        for (const x of ups) if (x.id !== newest) keys.push({ key: `update:${x.id}:${x.at * 1000}`, at: x.at })
        for (const x of rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, confirm_asked_at AS at FROM project_milestones WHERE project_id = ? AND deleted_at IS NULL AND confirm_asked_at IS NOT NULL AND confirm_answer IS NULL AND status = 'done'`, args: [pid] }))) keys.push({ key: `stage:${x.id}:${x.at * 1000}`, at: x.at })
        for (const x of rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, shared_at AS at FROM project_selections WHERE project_id = ? AND status = 'shared' AND deleted_at IS NULL AND shared_at IS NOT NULL`, args: [pid] }))) keys.push({ key: `choice:${x.id}:${x.at * 1000}`, at: x.at })
        for (const x of rows<{ id: string; sent: number; due: number | null }>(await client.execute({ sql: `SELECT id, sent_at AS sent, due_at AS due FROM project_invoices WHERE project_id = ? AND status = 'sent' AND sent_at IS NOT NULL`, args: [pid] }))) {
          keys.push({ key: `invoice:${x.id}:sent`, at: x.sent })
          if (x.due) { keys.push({ key: `invoice:${x.id}:due`, at: Math.max(x.sent, x.due - 3 * D) }); keys.push({ key: `invoice:${x.id}:late`, at: x.due + D }) }
        }
        /* (round 6) its confirmed payments' rows, when its table is there */
        const pay = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'project_payments'`))[0]?.n
        if (pay) {
          const got = await client.execute({ sql: `SELECT y.id, lower(y.status) AS status, coalesce(y.confirmed_at, y.created_at) AS at FROM project_payments y JOIN project_invoices i ON i.id = y.invoice_id WHERE i.project_id = ?`, args: [pid] }).catch(() => ({ rows: [] as unknown[] }))
          for (const x of rows<{ id: string; status: string; at: number }>(got)) if (x.status === 'confirmed') keys.push({ key: `payment:${x.id}:confirmed`, at: x.at })
        }
        for (const k of keys.filter((x) => x.at <= link.last!)) {
          made += (await client.execute({ sql: `INSERT OR IGNORE INTO portal_bell_reads (homeowner_id, row_key, read_at) VALUES (?,?,?)`, args: [link.homeowner, k.key, link.last] })).rowsAffected
        }
      }
    }
    note(`${made} record(s) — six sections on, the welcome line, Mei Ling Han on Benjamin Han’s household (opened once), his bell read but the newest update`)
  }

  /* ── R70b · (fix-C, C-27) Benjamin Han's update photos carry names a studio would give them — R70 filed them under the sample pictures'
     own names (original.jpg twice, defurnished.jpg), which is what Files, the viewer, Activity and the client read. Renamed by id, only while
     they still carry the sample's name (a studio's own rename stays). */
  console.log('\nR70b update photos named')
  {
    let renamed = 0
    const [p] = rows<{ id: string }>(await client.execute({ sql: `SELECT p.id FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name LIKE ? AND p.deleted_at IS NULL LIMIT 1`, args: ['Benjamin Han'] }))
    if (p) {
      const NAMES: [string, string, string, string][] = [
        ['flooring', 'visualizer/samples/living-room/defurnished.jpg', 'defurnished.jpg', 'living-room-flooring.jpg'],
        ['kitchen', 'visualizer/samples/kitchen/original.jpg', 'original.jpg', 'kitchen-cabinets-fixed.jpg'],
        ['wardrobe', 'visualizer/samples/bedroom/original.jpg', 'original.jpg', 'wardrobe-carcass.jpg'],
      ]
      for (const [key, pub, from, to] of NAMES) {
        const fid = sid(sid(p.id, `update:${key}`), `file:${pub}`)
        renamed += (await client.execute({ sql: `UPDATE lead_files SET name = ? WHERE id = ? AND name = ?`, args: [to, fid, from] })).rowsAffected
      }
    }
    note(`${renamed} photo(s) renamed`)
  }

  /* ── R74b · (fix-C, C-04) A chosen choice ends the milestone's wait for it — the rule `endWaitForPick` (lib/projects/choices.ts) keeps from
     now on, applied to what was picked before it: a milestone that waits on the client for a choice already chosen (the wait's note names the
     choice, or names nothing), with no other choice on it still waiting on them, stops waiting. The demo's records then tell one story. */
  console.log('\nR74b waits ended by their picks')
  {
    let ended = 0
    const waits = rows<{ id: string; title: string; note: string | null }>(await client.execute(`SELECT id, title, waiting_note AS note FROM project_milestones WHERE waiting_on = 'client' AND status <> 'done' AND deleted_at IS NULL`))
    const norm = (t: string | null) => (t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    for (const m of waits) {
      const sels = rows<{ title: string; status: string }>(await client.execute({ sql: `SELECT title, status FROM project_selections WHERE milestone_id = ? AND deleted_at IS NULL`, args: [m.id] }))
      if (sels.some((x) => x.status === 'shared')) continue
      const n = norm(m.note)
      const hit = sels.find((x) => x.status === 'chosen' && (!n || n.includes(norm(x.title)) || norm(x.title).includes(n)))
      if (!hit) continue
      ended += (await client.execute({ sql: `UPDATE project_milestones SET waiting_on = NULL, waiting_member_id = NULL, waiting_name = NULL, waiting_note = NULL, waiting_since = NULL, waiting_until = NULL WHERE id = ? AND waiting_on = 'client'`, args: [m.id] })).rowsAffected
    }
    note(`${ended} wait(s) ended by a pick already made`)
  }

  /* ── R76b · fix-E — the ending's records made true (Projects bug audit 2026-10-06, area E) ───────────────────────────────────────────────
     (E-04) A handover's review row stays in an approver's bell only while its request waits — rows left by an approval, a send-back, a
     completion over the request or a reopening go. (E-03) A completion or a request named its open items by the met state's words ("Every
     milestone is done") — they are rewritten as they stood open (lib/projects/handover-model.ts `openPhrase`). (A-01) A lead whose project
     is live stays Won: one parked before the rule (Lost, On Hold) has the parking undone — its moves out of Won since the project go, as
     the Undo would have taken them. Idempotent. */
  console.log('\nR76b project endings — fix-E')
  {
    let made = 0
    made += (await client.execute(`DELETE FROM notifications WHERE kind = 'handover_review' AND NOT EXISTS (SELECT 1 FROM projects p WHERE notifications.href = '/projects/' || p.id AND p.handover_requested_at IS NOT NULL AND p.stage = 'in_progress' AND p.deleted_at IS NULL)`)).rowsAffected
    const phrase = (x: string) => x === 'Every milestone is done' ? 'Milestones not done' : x === 'Nothing is outstanding on money' ? 'Money still outstanding' : x === 'No update waits for review' ? 'An update in review'
      : ((m) => (m ? `${m[1]} hasn’t confirmed ${m[2]}` : x))(/^(.+) has confirmed (“.+”)$/.exec(x))
    for (const e of rows<{ id: string; detail: string }>(await client.execute(`SELECT id, detail FROM lead_events WHERE kind IN ('project_completed','project_handover_requested') AND json_valid(detail) AND json_type(detail, '$.open') = 'array'`))) {
      const d = JSON.parse(e.detail) as { open: string[] }
      const open = d.open.map((x) => phrase(String(x)))
      if (open.join('|') !== d.open.join('|')) made += (await client.execute({ sql: `UPDATE lead_events SET detail = ? WHERE id = ?`, args: [JSON.stringify({ ...d, open }), e.id] })).rowsAffected
    }
    /* the parking is undone, as its Undo would have: the moves out of Won made after the project, and the stage back at Won */
    for (const l of rows<{ id: string; stage: string; made: number }>(await client.execute(`SELECT l.id, l.stage, p.created_at AS made FROM leads l JOIN projects p ON p.lead_id = l.id WHERE p.deleted_at IS NULL AND l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 AND l.stage <> 'Won'`))) {
      made += (await client.execute({ sql: `DELETE FROM stage_logs WHERE lead_id = ? AND to_stage <> 'Won' AND created_at >= ? AND created_at >= (SELECT max(created_at) FROM stage_logs WHERE lead_id = ? AND to_stage = 'Won')`, args: [l.id, l.made, l.id] })).rowsAffected
      made += (await client.execute({ sql: `UPDATE leads SET stage = 'Won', updated_at = ? WHERE id = ?`, args: [NOW, l.id] })).rowsAffected
    }
    note(`${made} record(s) — stale handover review rows, open items as they stood open, Won held while a project is live`)
  }

  /* ── R75b · fix-D (D-02 · F-08) — a sent invoice keeps the contract it was raised on ─────────────────────────────────────────────────
     Sending now stamps the contract value on the invoice (the signed quote or agreed value + the variation orders approved by then), so its
     paper never re-describes itself when a later order moves the contract. The invoices sent before the stamp get theirs from the record:
     the base as it is, and the orders approved on or before the day the invoice went. Idempotent (only an unstamped invoice is written). */
  console.log('\nR75b sent invoices — the contract they were raised on')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM pragma_table_info('project_invoices') WHERE name = 'contract_minor'`))[0]?.n
    if (has) {
      const got = rows<{ id: string; sent: number; pid: string; qid: string | null; agreed: number | null }>(await client.execute(
        `SELECT i.id, i.sent_at AS sent, p.id AS pid, p.quote_id AS qid, p.agreed_value_minor AS agreed FROM project_invoices i JOIN projects p ON p.id = i.project_id WHERE i.status <> 'draft' AND (i.contract_minor IS NULL OR i.base_minor IS NULL OR i.variations_minor IS NULL)`))
      let made = 0
      for (const x of got) {
        const base = x.qid ? Number(rows<{ a: number }>(await client.execute({ sql: `SELECT amount_minor AS a FROM quotes WHERE id = ? AND deleted_at IS NULL`, args: [x.qid] }))[0]?.a ?? x.agreed ?? 0) : Number(x.agreed ?? 0)
        const vos = Number(rows<{ s: number }>(await client.execute({ sql: `SELECT coalesce(sum(amount_minor), 0) AS s FROM quotes WHERE project_id = ? AND kind = 'variation' AND deleted_at IS NULL AND status IN ('Confirmed','Signed') AND confirmed_at IS NOT NULL AND confirmed_at <= ?`, args: [x.pid, x.sent ?? 0] }))[0]?.s ?? 0)
        await client.execute({ sql: `UPDATE project_invoices SET contract_minor = ?, base_minor = ?, variations_minor = ? WHERE id = ?`, args: [Math.max(0, base + vos), base, vos, x.id] })
        made++
      }
      note(`${made} sent invoice(s) stamped with the contract they were raised on`)
    }
  }

  /* ── R77b · The client portal as the client lives in it (fix-F, the Projects bug audit 2026-10-06, F-38 · F-13 · F-06) ───────────────────
     What the boards draw and the demo could not show, each with its trail (REG-343): the designers' mobiles, so "Message Germaine on WhatsApp"
     reaches a phone (an office landline takes no WhatsApp); Benjamin Han's shown floor plan with real pages (it opened a bare icon); board 3's
     "Confirm this stage" — Germaine's update on Electrical & plumbing, the stage waiting for his confirmation, with the water test's report
     (an update's document), approved by Dane, opened by Benjamin (it is not the newest — R73's and R77's rule), its events and bell rows;
     Designs — Kevin Ng invited, his shared designs open again; board 6 — Serena Koh before work starts: her quote sent for her confirmation,
     invited, three of the studio's questions asked and waiting. The PDFs are drawn here (plain pages, no fonts beyond Helvetica). Idempotent.
     (invented copy) */
  console.log('\nR77b client portal — what the boards draw')
  {
    let made = 0
    const run = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
    /* a one-page PDF: a title, lines of text, and what is drawn under them (PDF path operators) */
    const pdf = (title: string, lines: string[], draw = ''): string => {
      const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`)
      let content = `BT /F1 18 Tf 56 780 Td (${esc(title)}) Tj ET\n`
      lines.forEach((l, i) => { content += `BT /F1 11 Tf 56 ${748 - i * 16} Td (${esc(l)}) Tj ET\n` })
      content += draw
      const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`]
      let out = '%PDF-1.4\n'
      const offs: number[] = []
      objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
      const xref = Buffer.byteLength(out, 'latin1')
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
      return `data:application/pdf;base64,${Buffer.from(out, 'latin1').toString('base64')}`
    }
    const bytesOf = (dataUrl: string) => Math.round(((dataUrl.length - dataUrl.indexOf(',') - 1) * 3) / 4)

    /* the designers' mobiles (F-13) — only where a member has none */
    for (const [id, phone] of [['germaine', '96614208'], ['michelle', '97726315'], ['sarah', '98837542']] as const) {
      await run(`UPDATE members SET phone = ? WHERE id = ? AND (phone IS NULL OR trim(phone) = '')`, [phone, id])
    }

    const [ben] = rows<{ lead: string; pid: string; name: string; number: string }>(await client.execute(`SELECT l.id AS lead, p.id AS pid, p.name, p.number FROM leads l JOIN projects p ON p.lead_id = l.id AND p.deleted_at IS NULL WHERE l.name = 'Benjamin Han' AND l.deleted_at IS NULL LIMIT 1`))
    const [benLink] = ben ? rows<{ homeowner: string; opened: number | null; last: number | null }>(await client.execute({ sql: `SELECT homeowner_id AS homeowner, opened_at AS opened, last_opened_at AS last FROM homeowner_lead_links WHERE lead_id = ?`, args: [ben.lead] })) : []
    if (ben) {
      /* his floor plan, shown to him (R71) — its pages (F-06) */
      const plan = sid(ben.lead, 'file:floor-plan')
      const rooms = [[56, 360, 260, 220, 'Living and dining'], [316, 470, 222, 110, 'Kitchen'], [316, 360, 110, 110, 'Yard'], [56, 180, 180, 180, 'Master bedroom'], [236, 250, 150, 110, 'Bedroom 2'], [386, 250, 152, 110, 'Bedroom 3'], [236, 180, 120, 70, 'Bath 1'], [356, 180, 90, 70, 'Bath 2']] as const
      const drawing = `0.2 w\n${rooms.map(([x, y, w, h]) => `${x} ${y} ${w} ${h} re S`).join('\n')}\n${rooms.map(([x, y, , h, n]) => `BT /F1 9 Tf ${x + 8} ${y + h - 16} Td (${n}) Tj ET`).join('\n')}\n`
      const [hasPlan] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE id = ? AND deleted_at IS NULL`, args: [plan] }))
      if (hasPlan) await run(`INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, [plan, pdf('Floor plan - SkyOasis @ Dawson', ['HDB 5-Room, as measured on site. Not to scale.', 'Prepared for Benjamin Han.'], drawing)])
      /* board 3: Germaine's update on Electrical & plumbing — the stage waiting for his confirmation (R73) — with the water test's report */
      const [el] = rows<{ id: string; done: number | null }>(await client.execute({ sql: `SELECT id, done_at AS done FROM project_milestones WHERE project_id = ? AND title LIKE 'Electrical%' AND deleted_at IS NULL`, args: [ben.pid] }))
      const [kitchen] = rows<{ at: number }>(await client.execute({ sql: `SELECT published_at AS at FROM project_updates WHERE id = ?`, args: [sid(ben.pid, 'update:kitchen')] }))
      if (el && kitchen?.at && benLink?.opened) {
        const id = sid(ben.pid, 'update:water-test')
        const created = kitchen.at - 26 * H, submitted = created + 10 * 60, published = submitted + 50 * 60   // the evening before the cabinets'
        const opened = Math.min(Math.max(published + 3 * H, benLink.opened + 60), benLink.last ?? NOW)
        const title = 'The water test passed in both bathrooms'
        const body = '<p>All the points are in and tested. The water test on both bathrooms passed this afternoon — the report is attached.</p><p>Germaine marks the stage done once the last two kitchen points are covered.</p>'
        const u = await client.execute({ sql: `INSERT OR IGNORE INTO project_updates (id, project_id, title, body, milestone_id, status, author_id, created_at, updated_at, submitted_by, submitted_at, reviewed_by, reviewed_at, published_by, published_at, client_opened_at, client_opened_by) VALUES (?,?,?,?,?,'published','germaine',?,?,'germaine',?,'dane',?,'dane',?,?,?)`,
          args: [id, ben.pid, title, body, el.id, created, published, submitted, published, published, opened, benLink.homeowner] })
        made += u.rowsAffected
        /* (integration) the photo carries a studio's name, as R70b names the others — mends a copy written under the sample's name */
        await run(`UPDATE lead_files SET name = 'bathroom-water-test.jpg' WHERE id = ? AND name = 'original.jpg'`, [sid(id, 'file:photo')])
        if (u.rowsAffected) {
          const folder = sid(ben.pid, 'files:site-updates'), report = sid(id, 'file:report'), photo = sid(id, 'file:photo')
          const doc = pdf('Water test report', ['SkyOasis @ Dawson - HDB 5-Room', 'Bathroom 1: 30 minutes at 6 bar, no drop. Passed.', 'Bathroom 2: 30 minutes at 6 bar, no drop. Passed.', 'Kitchen: two points to cover after the cabinets.', 'Tested by the plumbing contractor for Demo Studio.'])
          await run(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'folder','Site updates',NULL,?,NULL,'germaine',NULL,NULL,?,NULL)`, [folder, ben.lead, created - 300, created - 300])
          await run(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'image',?,?,?,?,'germaine',?,'image/jpeg',?,NULL)`, [photo, ben.lead, 'bathroom-water-test.jpg', '/visualizer/samples/kitchen/original.jpg', created - 120, folder, statSync(path.join(process.cwd(), 'public', 'visualizer/samples/kitchen/original.jpg')).size, created - 120])
          await run(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at, deleted_at) VALUES (?,?,'pdf','Water test report.pdf',NULL,?,?,'germaine',?,'application/pdf',?,NULL)`, [report, ben.lead, created - 60, folder, bytesOf(doc), created - 60])
          await run(`INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, [report, doc])
          await run(`INSERT OR IGNORE INTO project_update_files (update_id, file_id, position, created_at) VALUES (?,?,0,?)`, [id, photo, created])
          await run(`INSERT OR IGNORE INTO project_update_files (update_id, file_id, position, created_at) VALUES (?,?,1,?)`, [id, report, created])
          const detail = JSON.stringify({ id, title, name: ben.name, number: ben.number })
          await run(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,'project_update_submitted','germaine',?,?,?)`, [sid(id, 'ev:project_update_submitted'), ben.lead, submitted, detail, ben.pid])
          await run(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,'project_update_approved','dane',?,?,?)`, [sid(id, 'ev:project_update_approved'), ben.lead, published, detail, ben.pid])
          const href = `/projects/${ben.pid}/updates?open=${encodeURIComponent(id)}`
          for (const a of rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner','Admin') AND coalesce(is_active, 1) = 1 AND id <> 'germaine'`)).map((m) => m.id)) {
            await run(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,'update_review','Germaine sent an update for your review',?,?,?,NULL,'in_app,email','germaine',?,?)`, [sid(id, `bell:review:${a}`), a, `“${title}” — ${ben.name}`, href, ben.lead, submitted, submitted + H])
          }
          await run(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,'germaine','update_approved',?,?,?,?,NULL,'in_app','dane',?,?)`, [sid(id, 'bell:approved:germaine'), `Dane approved your update “${title}”`, `${ben.name} — the client can see it now`, href, ben.lead, published, published + H])
          /* his bell: read, as R77 reads every row but the newest update's */
          await run(`INSERT OR IGNORE INTO portal_bell_reads (homeowner_id, row_key, read_at) VALUES (?,?,?)`, [benLink.homeowner, `update:${id}:${published * 1000}`, benLink.last ?? opened])
        }
      }
    }

    /* invited to the portal (R71's way): the profile, the link, the invite's line */
    const invite = async (leadId: string, name: string, phone: string, email: string | null, at: number, by: string, asked: number | null) => {
      await run(`INSERT OR IGNORE INTO homeowner_profiles (id, phone, name, email, created_at, updated_at) VALUES (?,?,?,?,?,?)`, [sid(leadId, 'homeowner'), phone, name, email, at, at])
      const [h] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM homeowner_profiles WHERE phone = ?`, args: [phone] }))
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM homeowner_lead_links WHERE lead_id = ?`, args: [leadId] }))
      if (have || !h) return
      const linkId = sid(leadId, 'portal-link')
      await run(`INSERT OR IGNORE INTO homeowner_lead_links (id, homeowner_id, lead_id, portal_token, chat_history_visible, invited_at, last_asked_at, created_at, invited_by, opened_at, last_opened_at, withdrawn_at, withdrawn_by) VALUES (?,?,?,?,1,?,?,?,?,NULL,NULL,NULL,NULL)`, [linkId, h.id, leadId, sid(leadId, 'portal-token'), at, asked, at, by])
      await run(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,'invite_sent',?,?,'{}')`, [`ev-invite_sent-${linkId.slice(0, 8)}`, leadId, by, at])
    }
    const teamOf = async (leadId: string) => rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [leadId] })).map((m) => m.member_id)

    /* Designs: Kevin Ng (Met) — his designs shared from the Visualizer (R61) open again, and he is invited */
    const [kevin] = rows<{ id: string; phone: string; email: string | null }>(await client.execute(`SELECT id, phone, email FROM leads WHERE name = 'Kevin Ng' AND deleted_at IS NULL LIMIT 1`))
    const [kShare] = kevin ? rows<{ id: string; created: number }>(await client.execute({ sql: `SELECT id, created_at AS created FROM render_share_links WHERE lead_id = ? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`, args: [kevin.id] })) : []
    if (kevin && kShare) {
      await run(`UPDATE render_share_links SET expires_at = ? WHERE id = ? AND expires_at < ?`, [NOW + 21 * D, kShare.id, NOW + 7 * D])
      const team = await teamOf(kevin.id)
      await invite(kevin.id, 'Kevin Ng', kevin.phone, kevin.email, Math.max(kShare.created + H, NOW - 2 * D), team[0] ?? 'dane', null)
    }

    /* board 6: Serena Koh (Quote Sent) — her approved quote sent for her confirmation, invited, three of the studio's questions asked */
    const [serena] = rows<{ id: string; phone: string; email: string | null }>(await client.execute(`SELECT id, phone, email FROM leads WHERE name = 'Serena Koh' AND deleted_at IS NULL AND stage = 'Quote Sent' LIMIT 1`))
    const [sq] = serena ? rows<{ id: string; approved: number | null; sent: number | null }>(await client.execute({ sql: `SELECT id, approved_at AS approved, sent_at AS sent FROM quotes WHERE lead_id = ? AND deleted_at IS NULL AND coalesce(kind, 'quote') = 'quote' AND status IN ('Approved', 'Sent to Client') ORDER BY created_at DESC LIMIT 1`, args: [serena.id] })) : []
    if (serena && sq) {
      const sentAt = Math.max(sq.approved ?? 0, sq.sent ?? 0) + 2 * H
      await run(`UPDATE quotes SET status = 'Sent to Client', client_sent_at = ?, sent_at = coalesce(sent_at, ?), visibility = 'Shared' WHERE id = ? AND status = 'Approved'`, [sentAt, sentAt, sq.id])
      const team = await teamOf(serena.id)
      const by = team.find((m) => m !== 'dane') ?? team[0] ?? 'dane'
      const invitedAt = sentAt + 10 * 60, askedAt = invitedAt + 5 * 60
      const QS: [string, string, string, string | null][] = [['pets', 'Do you have pets?', 'text', null], ['move-in', 'What is your move-in date?', 'date', null], ['keys', 'Are the keys collected?', 'single', JSON.stringify(['Yes', 'No'])]]
      const ids = QS.map(([k]) => sid(serena.id, `question:${k}`))
      for (const [n, [k, text, type, options]] of QS.entries()) {
        await run(`INSERT OR IGNORE INTO questions (id, lead_id, text, type, options, answer, answered_by, answered_at, sort_order, created_at, required) VALUES (?,?,?,?,?,NULL,NULL,NULL,?,?,0)`, [sid(serena.id, `question:${k}`), serena.id, text, type, options, 100 + n, askedAt - 60])
      }
      await invite(serena.id, 'Serena Koh', serena.phone, serena.email, invitedAt, by, askedAt)
      await run(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail) VALUES (?,?,'questionnaire_asked',?,?,?)`, [sid(serena.id, 'ev:questions-asked'), serena.id, by, askedAt, JSON.stringify({ ids })])
    }
    note(`${made} record(s) — designers' mobiles, Benjamin's floor plan pages and the water test update, Kevin Ng invited with his designs open, Serena Koh before work starts`)
  }

  /* ── R68b · (fix-A, A-06) A project number is given once: the highest running number given under each prefix is kept in settings
     (`project_numbers_given`, `{ "P": 8 }`) so a project deleted forever never frees its number. Raised from today's projects, never lowered.
     (fix-A, A-15) A Won lead whose signed quote was uploaded keeps it: a PDF in its Files under "Signed quote — <name>.pdf" (`fileWonQuote`),
     which the project's Key documents names. Idempotent. */
  console.log('\nR68b project numbers given once · uploaded signed quotes filed')
  {
    const [given] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'project_numbers_given'`))
    let mark: Record<string, number> = {}
    try { const v = given ? JSON.parse(given.value) as unknown : {}; if (v && typeof v === 'object' && !Array.isArray(v)) mark = Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number')) } catch { mark = {} }
    let raised = 0
    for (const p of rows<{ number: string }>(await client.execute(`SELECT number FROM projects`))) {
      const m = /^([A-Za-z0-9]+)-(?:.*-)?(\d+)$/.exec(p.number)
      if (!m) continue
      const seq = Number(m[2])
      if ((mark[m[1]!] ?? 0) < seq) { mark[m[1]!] = seq; raised++ }
    }
    if (raised) await client.execute({ sql: `INSERT INTO settings (key, value, updated_at) VALUES ('project_numbers_given', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [JSON.stringify(mark), Math.floor(Date.now() / 1000)] })
    note(`numbers given: ${JSON.stringify(mark)}${raised ? ` (${raised} raised)` : ''}`)
    let filed = 0
    const uploads = rows<{ leadId: string; at: number; payload: string | null }>(await client.execute(`SELECT p.lead_id AS leadId, p.created_at AS at, (SELECT s.payload FROM stage_logs s WHERE s.lead_id = p.lead_id AND s.to_stage = 'Won' ORDER BY s.created_at DESC LIMIT 1) AS payload FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.quote_id IS NULL AND l.direct = 0 AND p.deleted_at IS NULL`))
    for (const u of uploads) {
      let w: { wonQuoteTab?: string; wonQuoteUploaded?: string | null } = {}
      try { w = u.payload ? JSON.parse(u.payload) as typeof w : {} } catch { w = {} }
      if (w.wonQuoteTab !== 'upload' || !w.wonQuoteUploaded) continue
      const name = `Signed quote — ${w.wonQuoteUploaded.replace(/\.pdf$/i, '').trim().slice(0, 120)}.pdf`
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND name = ? AND deleted_at IS NULL`, args: [u.leadId, name] }))
      if (have) continue
      const owner = rows<{ memberId: string }>(await client.execute({ sql: `SELECT member_id AS memberId FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at LIMIT 1`, args: [u.leadId] }))[0]?.memberId ?? null
      filed += (await client.execute({ sql: `INSERT INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [sid(u.leadId, 'file:won-quote'), u.leadId, 'pdf', name, null, u.at, null, owner, 728064, 'application/pdf', u.at] })).rowsAffected
    }
    note(`${filed} uploaded signed quote(s) filed`)
  }

  /* ── R78 · The project record, its gaps closed (gaps build, package A — the owner's "build everything", 2026-10-07; M-01 · M-02) ─────────────
     One project on hold with its reason and resume day (Aisha Rahman's: she is away, the works pause — put on hold by her designer five days
     before the demo day, resuming mid-November) and its Activity line; the direct project's client record keeps a floor area and a style and two
     notes (a site visit and a WhatsApp log — Marcus Teo's, the project carries his Notes & Logs); the scope's rooms on two projects (Ryan D'Souza's
     whole home, Marcus Teo's kitchen and baths). A completed project's closing summary reads from records already true (Shalini Menon's: every
     milestone done on its day, everything collected) — nothing is written for it. Idempotent: fixed ids, and only where the field is empty. */
  console.log('\nR78 the project record — on hold, notes, scope')
  {
    let made = 0
    const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string; stage: string; created: number; hold: number | null }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname, p.stage, p.created_at AS created, p.on_hold_at AS hold FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
    const firstOf = async (lead: string) => rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at LIMIT 1`, args: [lead] }))[0]?.member_id ?? 'dane'
    /* Aisha Rahman's project on hold — reason, resume day (local midnight, ms), who, since (ms) — and its line (lead_events.at in seconds) */
    const aisha = await projectOf('Aisha Rahman')
    if (!aisha) note('Aisha Rahman’s project missing — skipped the hold')
    else if (aisha.stage === 'completed') note('Aisha Rahman’s project is completed — no hold')
    else {
      const ev = sid(aisha.pid, 'event:hold')
      const [had] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_events WHERE id = ?`, args: [ev] }))
      if (!aisha.hold && !had) {
        const by = await firstOf(aisha.lead)
        const since = new Date(2026, 9, 2, 10, 15).getTime()
        const until = new Date(2026, 10, 16).getTime()
        const reason = 'Aisha is away until mid-November — the works pause'
        made += (await client.execute({ sql: `UPDATE projects SET on_hold_at = ?, on_hold_reason = ?, on_hold_until = ?, on_hold_by = ? WHERE id = ? AND on_hold_at IS NULL`, args: [since, reason, until, by, aisha.pid] })).rowsAffected
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`,
          args: [ev, aisha.lead, 'project_put_on_hold', by, Math.floor(since / 1000), JSON.stringify({ name: aisha.pname, number: aisha.number, reason, when: new Date(until).toISOString() }), aisha.pid] })).rowsAffected
      }
    }
    /* the scope's rooms (only where none is kept) */
    const ryan = await projectOf('Ryan D’Souza'), marcus = await projectOf('Marcus Teo')
    if (ryan) made += (await client.execute({ sql: `UPDATE projects SET scope = ? WHERE id = ? AND scope IS NULL`, args: [JSON.stringify(['Living Room', 'Kitchen', 'Master Bedroom', 'Bedroom 2', 'Bathroom 1', 'Bathroom 2', 'Dining']), ryan.pid] })).rowsAffected
    if (marcus) {
      made += (await client.execute({ sql: `UPDATE projects SET scope = ? WHERE id = ? AND scope IS NULL`, args: [JSON.stringify(['Kitchen', 'Bathroom 1', 'Bathroom 2']), marcus.pid] })).rowsAffected
      /* the direct client's record: floor area and style (New project asks for them now) */
      made += (await client.execute({ sql: `UPDATE leads SET area_sqft = 1050 WHERE id = ? AND area_sqft IS NULL`, args: [marcus.lead] })).rowsAffected
      made += (await client.execute({ sql: `UPDATE leads SET style = 'Scandinavian' WHERE id = ? AND style IS NULL`, args: [marcus.lead] })).rowsAffected
      /* two notes on the direct project — a site visit after it was made, a WhatsApp log two days on (its project's Notes & Logs) */
      const by = await firstOf(marcus.lead)
      const visit = marcus.created + 1 * D + 5 * H, chat = marcus.created + 3 * D + 2 * H
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_notes (id, lead_id, kind, title, body, channel, contacted_at, outcome, next_step_at, next_step_mode, author_id, created_at, updated_at) VALUES (?,?,?,?,?,NULL,NULL,NULL,NULL,NULL,?,?,?)`,
        args: [sid(marcus.lead, 'note:site-visit'), marcus.lead, 'note', 'Site visit', 'Measured the kitchen and both baths. Marcus keeps the existing floor tiles in the living room; the kitchen wall comes down to the window line.', by, visit, visit] })).rowsAffected
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_notes (id, lead_id, kind, title, body, channel, contacted_at, outcome, next_step_at, next_step_mode, author_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NULL,NULL,?,?,?)`,
        args: [sid(marcus.lead, 'note:whatsapp'), marcus.lead, 'contact', '', 'Sent the kitchen layout; Marcus wants a taller pantry and asks about quartz tops.', 'WhatsApp', chat - 20 * 60, 'Connected', by, chat, chat] })).rowsAffected
    }
    note(`${made} change(s)`)
  }

  /* ── R79 · gaps build B — money in, complete (the owner's "build everything", 2026-10-07; the report's 4-finance rows, M-04) ─────────────
     What the new money records need to be true (REG-343), and one of each on the demo, each with its trail:
     - every invoice the client may hold has its no-login link (a token, given with the Draft) and every receipt its own (given with its number);
       every sent invoice is filed in its project's Files › Payments as "{number} · {stage}.pdf" (the receipts' way, `fileMoneyDoc`);
     - Shalini Menon's VO-1 — a built-in shoe cabinet, approved in person on 26 Sep after her Completion invoice had gone, so no unsent stage was
       left to carry it — billed on its own (INV-2026-008: Sarah submitted, Dane approved and sent) and paid with her completion payment, before
       Sarah completed the handover (R76's order holds);
     - Aisha Rahman's one-off: the HDB permit and lift padding the studio paid on her behalf — a reimbursement, two lines, no GST — sent by Dane
       on Michelle's submission (INV-2026-009) and paid by PayNow on 30 Sep, with its receipt (on Aisha, so Benjamin Han's board-4 figures hold);
     - Ryan D'Souza's invoice XR-1042 made in the studio's accounting system (site protection and debris removal), recorded by Michelle on 5 Oct
       outside the payment schedule, due 19 Oct — with its PDF;
     - Benjamin Han's Mid-Project invoice (overdue since 2 Oct) reminded twice on WhatsApp by Germaine — 3 Oct and 6 Oct.
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE, a token or a file written only where none is. */
  console.log('\nR79 money in, complete — links, filed invoices, a VO billed on its own, a one-off, a recorded invoice, reminders')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM pragma_table_info('project_invoices') WHERE name = 'share_token'`))[0]?.n
    if (has) {
      const at = (y: number, m: number, d: number, h = 0, mi = 0) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000)
      const day = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
      const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
      const shortDay = (sec: number) => { const d = new Date(sec * 1000); return `${d.getDate()} ${d.toLocaleString('en-SG', { month: 'short' })} ’${String(d.getFullYear()).slice(2)}` }
      const gstOf = (total: number, rate: number) => (rate ? Math.round((total * rate) / (100 + rate)) : 0)
      const token = (seed: string) => createHash('sha256').update(`r79-token:${seed}`).digest('base64url').slice(0, 22)
      type P = { id: string; lead_id: string; name: string; number: string; quote_id: string | null; agreed: number | null; completed_at: number | null }
      const proj = async (n: string) => rows<P>(await client.execute({ sql: `SELECT id, lead_id, name, number, quote_id, agreed_value_minor AS agreed, completed_at FROM projects WHERE number = ? AND deleted_at IS NULL`, args: [n] }))[0] ?? null
      const ev = (id: string, p: P, kind: string, actor: string | null, atSec: number, detail: Record<string, unknown>) =>
        client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, p.lead_id, kind, actor, atSec, JSON.stringify({ name: p.name, number: p.number, ...detail }), p.id] })
      const folderOf = async (leadId: string, owner: string | null, atSec: number) => {
        const [hit] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Payments' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [leadId] }))
        if (hit) return hit.id
        const id = sid(leadId, 'files:payments')
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder','Payments',NULL,?,NULL,?,NULL,NULL,?)`, args: [id, leadId, atSec, owner, atSec] })
        return id
      }
      const nextNumber = async (prefix: string) => {
        const given = rows<{ n: string }>(await client.execute({ sql: `SELECT number AS n FROM project_invoices WHERE number LIKE ? UNION SELECT receipt_number AS n FROM project_payments WHERE receipt_number LIKE ?`, args: [`${prefix}%`, `${prefix}%`] })).map((r) => r.n)
        return `${prefix}${String(given.reduce((m, x) => Math.max(m, Number(x.slice(prefix.length)) || 0), 0) + 1).padStart(3, '0')}`
      }
      const gstPct = (() => { return 9 })()
      let made = 0

      /* — Shalini Menon: VO-1 billed on its own — */
      const sha = await proj('P-2025-001')
      if (sha) {
        const voId = sid(sha.id, 'r79:vo-1')
        const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM quotes WHERE id = ?`, args: [voId] }))
        if (!have) {
          const [lead] = rows<{ name: string; property_type: string | null; property_address: string | null }>(await client.execute({ sql: `SELECT name, property_type, property_address FROM leads WHERE id = ?`, args: [sha.lead_id] }))
          const created = at(2026, 9, 25, 15, 0), approved = at(2026, 9, 26, 10, 0)
          const cost = 170_000, total = cost + Math.round((cost * gstPct) / 100)
          const base = sha.agreed ?? 0
          await client.execute({ sql: `INSERT OR IGNORE INTO quotes (id, lead_id, number, title, amount_minor, visibility, status, created_at, updated_at, prepared_by, created_by, property_type, site_address, valid_until, project_ref, gst_enabled, client_signature_required, terms_html, notes_html, kind, project_id, sent_at, client_sent_at, confirmed_at, confirmed_by, confirmed_via, confirmed_marked_by, change_reason)
              VALUES (?,?,?,?,?,'Shared','Confirmed',?,?,'sarah','sarah',?,?,?,?,1,0,'','','variation',?,?,?,?,?,'in_person','dane',?)`,   /* project_ref as createVariationOrder gives one */
            args: [voId, sha.lead_id, 'VO-1', 'Built-in shoe cabinet at the entrance', total, created, approved, lead?.property_type ?? null, lead?.property_address ?? null, created + 30 * D, 'HDB/20260925/001', sha.id, created + 2 * H, created + 2 * H, approved, lead?.name ?? 'Shalini Menon', 'Asked for at the carpentry check on 24 Sep — the entrance wall was left open in the signed works'] })
          const gid = sid(voId, 'item:group'), iid = sid(voId, 'item:1')
          await client.execute({ sql: `INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, status, qty, cost_minor, markup_minor, discount_pct, gst_pct, created_at, updated_at) VALUES (?,?,NULL,'group',0,'Carpentry','Pending',1,0,0,0,?,?,?)`, args: [gid, voId, gstPct, created, created] })
          await client.execute({ sql: `INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, description, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, category, created_at, updated_at) VALUES (?,?,?,'item',0,?,?,'Pending',1,'Lot',?,0,0,?,'Carpentry',?,?)`,
            args: [iid, voId, gid, 'Built-in shoe cabinet, 1.2 m, laminate to match the living room', 'Full height, two adjustable shelves, soft-close doors', cost, gstPct, created, created] })
          await ev(sid(voId, 'ev:created'), sha, 'project_vo_created', 'sarah', created, { id: voId, number: 'VO-1', title: 'Built-in shoe cabinet at the entrance' })
          await ev(sid(voId, 'ev:approved'), sha, 'project_vo_approved', 'dane', approved, { id: voId, number: 'VO-1', title: 'Built-in shoe cabinet at the entrance', name: lead?.name ?? 'Shalini Menon', via: 'in_person', from: money(base), to: money(base + total), n: 0 })
          /* billed on its own: no unsent stage was left to carry it */
          const invId = sid(voId, 'invoice'), billed = at(2026, 9, 26, 14, 0), submitted = billed + 5 * 60, sent = at(2026, 9, 27, 9, 0)
          const number = await nextNumber('INV-2026-')
          const due = day(sent) + 7 * D
          const folder = await folderOf(sha.lead_id, 'sarah', sent)
          const fileId = sid(invId, 'file:invoice')
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'dane',NULL,'application/pdf',?)`, args: [fileId, sha.lead_id, `${number} · VO-1.pdf`, sent, folder, sent] })
          await client.execute({ sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, issuing_entity, submitted_by, submitted_at, reviewed_by, reviewed_at, sent_by, sent_at, due_at, created_by, created_at, updated_at, contract_minor, base_minor, variations_minor, kind, variation_id, description, share_token, file_id)
              VALUES (?,?,?,'VO-1',0,1000,?,'sent',?,?,NULL,'sarah',?,'dane',?,'dane',?,?,'sarah',?,?,?,?,?,'variation',?,?,?,?)`,
            args: [invId, sha.id, `vo:${voId}`, number, total, gstOf(total, gstPct), submitted, sent, sent, due, billed, sent, base + total, base, total, voId, 'Built-in shoe cabinet at the entrance', token(invId), fileId] })
          await ev(sid(invId, 'ev:created'), sha, 'project_invoice_created', 'sarah', billed, { id: invId, kind: 'variation', stage: 'VO-1', vo: 'VO-1', title: 'Built-in shoe cabinet at the entrance', to: money(total) })
          await ev(sid(invId, 'ev:submitted'), sha, 'project_invoice_submitted', 'sarah', submitted, { id: invId, stage: 'VO-1', to: money(total) })
          await ev(sid(invId, 'ev:sent'), sha, 'project_invoice_sent', 'dane', sent, { id: invId, stage: 'VO-1', title: number, to: money(total), due: shortDay(due), memberId: 'sarah' })
          /* paid with her completion payment, recorded by Sarah before she completed the handover */
          const payId = sid(invId, 'payment'), recorded = at(2026, 9, 28, 18, 0)
          const receipt = await nextNumber('RCT-2026-')
          const rFile = sid(payId, 'file:receipt')
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'sarah',NULL,'application/pdf',?)`, args: [rFile, sha.lead_id, `${receipt} · VO-1.pdf`, recorded, folder, recorded] })
          await client.execute({ sql: `INSERT OR IGNORE INTO project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, source, status, trusted, recorded_by, confirmed_by, confirmed_at, receipt_number, receipt_file_id, created_at, updated_at, share_token) VALUES (?,?,?,?,?,'bank_transfer','FAST 280926-6602','studio','confirmed',0,'sarah','sarah',?,?,?,?,?,?)`,
            args: [payId, sha.id, invId, total, day(recorded), recorded, receipt, rFile, recorded, recorded, token(payId)] })
          await ev(sid(payId, 'ev:recorded'), sha, 'project_payment_recorded', 'sarah', recorded, { id: payId, invoice: invId, stage: 'VO-1', title: number, to: money(total), method: 'bank_transfer', receipt })
          made++
        }
      }

      /* — Aisha Rahman: a one-off reimbursement, paid (board 4's figures stay Benjamin Han's own) — */
      const ais = await proj('P-2026-003')
      if (ais) {
        const invId = sid(ais.id, 'r79:one-off')
        const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_invoices WHERE id = ?`, args: [invId] }))
        if (!have) {
          const lines = [{ id: 'l1', description: 'HDB renovation permit fee', qty: 1, unitMinor: 12_000 }, { id: 'l2', description: 'Lift protection padding — 2 days', qty: 2, unitMinor: 8_500 }]
          const total = lines.reduce((s, l) => s + Math.round(l.qty * l.unitMinor), 0)
          const created = at(2026, 9, 27, 11, 0), submitted = created + 5 * 60, sent = at(2026, 9, 28, 10, 0)
          const number = await nextNumber('INV-2026-')
          const due = day(sent) + 7 * D
          const folder = await folderOf(ais.lead_id, 'michelle', sent)
          const fileId = sid(invId, 'file:invoice')
          const title = 'Permit and lift padding fees'
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'dane',NULL,'application/pdf',?)`, args: [fileId, ais.lead_id, `${number} · ${title}.pdf`, sent, folder, sent] })
          const base = ais.quote_id ? Number(rows<{ a: number }>(await client.execute({ sql: `SELECT amount_minor AS a FROM quotes WHERE id = ?`, args: [ais.quote_id] }))[0]?.a ?? 0) : ais.agreed ?? 0
          const vos = Number(rows<{ s: number }>(await client.execute({ sql: `SELECT coalesce(sum(amount_minor), 0) AS s FROM quotes WHERE project_id = ? AND kind = 'variation' AND deleted_at IS NULL AND status IN ('Confirmed','Signed')`, args: [ais.id] }))[0]?.s ?? 0)
          await client.execute({ sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, submitted_by, submitted_at, reviewed_by, reviewed_at, sent_by, sent_at, due_at, created_by, created_at, updated_at, contract_minor, base_minor, variations_minor, kind, reason, description, client_note, lines_json, charge_gst, share_token, file_id)
              VALUES (?,?,?,?,0,1000,?,'sent',?,0,'michelle',?,'dane',?,'dane',?,?,'michelle',?,?,?,?,?,'one_off','reimbursement',NULL,?,?,0,?,?)`,
            args: [invId, ais.id, `extra:${invId}`, title, number, total, submitted, sent, sent, due, created, sent, Math.max(0, base + vos), base, vos, 'Paid to the town council and the building’s management on your behalf — their receipts are in your Files.', JSON.stringify(lines), token(invId), fileId] })
          await ev(sid(invId, 'ev:created'), ais, 'project_invoice_created', 'michelle', created, { id: invId, kind: 'one_off', stage: title, reason: 'Reimbursement', to: money(total) })
          await ev(sid(invId, 'ev:submitted'), ais, 'project_invoice_submitted', 'michelle', submitted, { id: invId, stage: title, to: money(total) })
          await ev(sid(invId, 'ev:sent'), ais, 'project_invoice_sent', 'dane', sent, { id: invId, stage: title, title: number, to: money(total), due: shortDay(due), memberId: 'michelle' })
          const payId = sid(invId, 'payment'), recorded = at(2026, 9, 30, 15, 0)
          const receipt = await nextNumber('RCT-2026-')
          const rFile = sid(payId, 'file:receipt')
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'michelle',NULL,'application/pdf',?)`, args: [rFile, ais.lead_id, `${receipt} · ${title}.pdf`, recorded, folder, recorded] })
          await client.execute({ sql: `INSERT OR IGNORE INTO project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, source, status, trusted, recorded_by, confirmed_by, confirmed_at, receipt_number, receipt_file_id, created_at, updated_at, share_token) VALUES (?,?,?,?,?,'paynow','TXN 300926-1184','studio','confirmed',0,'michelle','michelle',?,?,?,?,?,?)`,
            args: [payId, ais.id, invId, total, day(recorded), recorded, receipt, rFile, recorded, recorded, token(payId)] })
          await ev(sid(payId, 'ev:recorded'), ais, 'project_payment_recorded', 'michelle', recorded, { id: payId, invoice: invId, stage: title, title: number, to: money(total), method: 'paynow', receipt })
          made++
        }
      }
      const ben = await proj('P-2026-002')
      if (ben) {
        /* — his Mid-Project invoice, overdue since 2 Oct, reminded twice — */
        const [mid] = rows<{ id: string; number: string; amount_minor: number; due_at: number; sent_at: number }>(await client.execute({ sql: `SELECT id, number, amount_minor, due_at, sent_at FROM project_invoices WHERE project_id = ? AND stage_name = 'Mid-Project' AND status = 'sent' LIMIT 1`, args: [ben.id] }))
        if (mid) {
          for (const [k, when] of [['r79:remind-1', at(2026, 10, 3, 10, 0)], ['r79:remind-2', at(2026, 10, 6, 9, 30)]] as const) {
            if (when <= mid.sent_at) continue
            made += (await ev(sid(mid.id, k), ben, 'project_invoice_reminded', 'germaine', when, { id: mid.id, stage: 'Mid-Project', title: mid.number, to: money(mid.amount_minor), due: shortDay(mid.due_at) })).rowsAffected
          }
        }
      }

      /* — Ryan D'Souza: an invoice made in the studio's accounting system, recorded — */
      const ryan = await proj('P-2026-001')
      if (ryan) {
        const invId = sid(ryan.id, 'r79:external')
        const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_invoices WHERE id = ?`, args: [invId] }))
        if (!have) {
          const issued = day(at(2026, 10, 5)), due = day(at(2026, 10, 19)), recorded = at(2026, 10, 5, 16, 0)
          const total = 64_800
          const folder = await folderOf(ryan.lead_id, 'michelle', recorded)
          const fileId = sid(invId, 'file:external')
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf','XR-1042 Site protection.pdf',NULL,?,?,'michelle',182400,'application/pdf',?)`, args: [fileId, ryan.lead_id, recorded, folder, recorded] })
          const base = ryan.quote_id ? Number(rows<{ a: number }>(await client.execute({ sql: `SELECT amount_minor AS a FROM quotes WHERE id = ?`, args: [ryan.quote_id] }))[0]?.a ?? 0) : ryan.agreed ?? 0
          const vos = Number(rows<{ s: number }>(await client.execute({ sql: `SELECT coalesce(sum(amount_minor), 0) AS s FROM quotes WHERE project_id = ? AND kind = 'variation' AND deleted_at IS NULL AND status IN ('Confirmed','Signed')`, args: [ryan.id] }))[0]?.s ?? 0)
          await client.execute({ sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, sent_by, sent_at, due_at, created_by, created_at, updated_at, contract_minor, base_minor, variations_minor, kind, description, external_ref, external_file_id)
              VALUES (?,?,?,?,0,1001,NULL,'sent',?,?,'michelle',?,?,'michelle',?,?,?,?,?,'external',?,'XR-1042',?)`,
            args: [invId, ryan.id, `extra:${invId}`, 'Site protection and debris removal', total, gstOf(total, gstPct), issued, due, recorded, recorded, Math.max(0, base + vos), base, vos, 'Site protection and debris removal', fileId] })
          await ev(sid(invId, 'ev:recorded'), ryan, 'project_invoice_recorded', 'michelle', recorded, { id: invId, ref: 'XR-1042', to: money(total), due: shortDay(due) })
          made++
        }
      }

      /* — every invoice the client may hold has its link; every receipt its own; every sent invoice is filed — */
      const noToken = rows<{ id: string }>(await client.execute(`SELECT id FROM project_invoices WHERE share_token IS NULL AND kind <> 'external'`))
      for (const r of noToken) made += (await client.execute({ sql: `UPDATE project_invoices SET share_token = ? WHERE id = ? AND share_token IS NULL`, args: [token(r.id), r.id] })).rowsAffected
      const noReceiptToken = rows<{ id: string }>(await client.execute(`SELECT id FROM project_payments WHERE receipt_number IS NOT NULL AND share_token IS NULL`))
      for (const r of noReceiptToken) made += (await client.execute({ sql: `UPDATE project_payments SET share_token = ? WHERE id = ? AND share_token IS NULL`, args: [token(r.id), r.id] })).rowsAffected
      const unfiled = rows<{ id: string; lead_id: string; number: string; stage_name: string; sent_at: number; sent_by: string | null }>(await client.execute(
        `SELECT i.id, p.lead_id, i.number, i.stage_name, i.sent_at, i.sent_by FROM project_invoices i JOIN projects p ON p.id = i.project_id WHERE i.status IN ('sent','void') AND i.kind <> 'external' AND i.number IS NOT NULL AND (i.file_id IS NULL OR NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = i.file_id))`))
      for (const r of unfiled) {
        const folder = await folderOf(r.lead_id, r.sent_by, r.sent_at)
        const fileId = sid(r.id, 'file:invoice')
        await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`,
          args: [fileId, r.lead_id, `${r.number} · ${r.stage_name}.pdf`.replace(/[\\/:*?"<>|]+/g, ' '), r.sent_at, folder, r.sent_by, r.sent_at] })
        made += (await client.execute({ sql: `UPDATE project_invoices SET file_id = ? WHERE id = ?`, args: [fileId, r.id] })).rowsAffected
      }
      note(`${made} record(s) — links, filed invoices, Shalini Menon's VO-1 billed on its own, Aisha Rahman's one-off, Benjamin Han's reminders, Ryan D’Souza's recorded XR-1042`)
    }
  }

  /* ── R80 · The schedule and tasks, their gaps closed (gaps build, package C — the owner's "build everything", 2026-10-07; M-03 and the report's
     §3) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     The five ready-made schedules in the library (fixed ids, the ones a fresh studio gets — lib/projects/schedule.ts `ensureReadyMadeSchedules`)
     and the flag that says they were given; someone outside the studio on two of Benjamin Han's tasks (the wardrobe laminate's supplier, and
     the stone crew who fit the quartz top — sent the task on WhatsApp by Germaine); Michelle's ask for more time on Ryan D'Souza's carpentry
     (waiting for an Owner or an Admin — the bell rows for Dane and Hui Min); Ryan's painting waiting on two milestones (the carpentry it moves
     with, and the electrical & plumbing); Benjamin's "something is not right" on Electrical & plumbing, answered — resolved with a note to him and
     asked again; the day each running or finished milestone started (the plan's day — the demo's schedules were laid that way). Each with its
     Activity line. Idempotent: fixed ids, and only where the field is empty. */
  console.log('\nR80 the schedule and tasks — outside people, asks, links, ready-made schedules')
  {
    let made = 0
    const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
    const sec = (t: number) => Math.floor(t / 1000)
    const day = (y: number, m: number, d: number) => sec(ms(y, m, d))
    /* the ready-made schedules (lib/projects/schedule-presets.ts) — fixed ids `schedule-preset-<key>`; the flag keeps a deleted one deleted */
    const [flag] = rows<{ key: string }>(await client.execute(`SELECT key FROM settings WHERE key = 'schedule_presets_seeded'`))
    if (!flag) {
      const t0 = day(2026, 7, 1)
      for (const [i, p] of SCHEDULE_PRESETS.entries()) {
        const id = `schedule-preset-${p.key}`
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO schedule_templates (id, name, created_by, updated_by, created_at, updated_at, deleted_at, folder_id, preset_key) VALUES (?, ?, NULL, NULL, ?, ?, NULL, NULL, ?)`, args: [id, p.name, t0 + i, t0 + i, p.key] })
        made += r.rowsAffected
        if (r.rowsAffected) for (const [k, it] of p.items.entries()) made += (await client.execute({ sql: `INSERT OR IGNORE INTO schedule_template_items (id, template_id, position, title, days, gap_days, ask_confirm) VALUES (?,?,?,?,?,?,?)`, args: [`${id}-${k}`, id, k, it.title, it.days, it.gap, it.askConfirm ? 1 : 0] })).rowsAffected
      }
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('schedule_presets_seeded', ?, ?)`, args: [JSON.stringify({ at: ms(2026, 7, 1) }), day(2026, 7, 1)] })).rowsAffected
    }
    const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string; stage: string }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname, p.stage FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
    const msOf = async (pid: string, title: string) => rows<{ id: string; start_date: number; end_date: number; status: string; follows_id: string | null; confirm_asked_at: number | null; confirm_answer: string | null; resolved_at: number | null; done_at: number | null }>(await client.execute({ sql: `SELECT id, start_date, end_date, status, follows_id, confirm_asked_at, confirm_answer, resolved_at, done_at FROM project_milestones WHERE project_id = ? AND title = ? AND deleted_at IS NULL LIMIT 1`, args: [pid, title] }))[0] ?? null
    const ev = (id: string, lead: string, pid: string, kind: string, actor: string | null, at: number, detail: Record<string, unknown>) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, lead, kind, actor, at, JSON.stringify(detail), pid] })
    const ben = await projectOf('Benjamin Han'), ryan = await projectOf('Ryan D’Souza')
    /* someone outside the studio on two of Benjamin's tasks — the laminate's supplier, and the stone crew (sent on WhatsApp) */
    if (ben) {
      const task = async (title: string) => rows<{ id: string; external_name: string | null }>(await client.execute({ sql: `SELECT id, external_name FROM lead_tasks WHERE lead_id = ? AND title = ? LIMIT 1`, args: [ben.lead, title] }))[0] ?? null
      const laminate = await task('Wardrobe laminate delivered'), quartz = await task('Install the quartz countertop')
      const put = async (t: { id: string; external_name: string | null } | null, who: { name: string; phone: string; kind: string }, at: number, sent: number | null) => {
        if (!t || t.external_name) return
        made += (await client.execute({ sql: `UPDATE lead_tasks SET external_name = ?, external_phone = ?, external_kind = ?, external_sent_at = ? WHERE id = ? AND external_name IS NULL`, args: [who.name, who.phone, who.kind, sent, t.id] })).rowsAffected
        made += (await ev(sid(t.id, 'event:outside'), ben.lead, ben.pid, 'task_outside', 'germaine', sec(at), { id: t.id, title: (await client.execute({ sql: `SELECT title FROM lead_tasks WHERE id = ?`, args: [t.id] })).rows[0]?.[0] ?? '', name: who.name, kind: who.kind })).rowsAffected
        if (sent) made += (await ev(sid(t.id, 'event:outside-sent'), ben.lead, ben.pid, 'task_sent_outside', 'germaine', sec(sent), { id: t.id, title: (await client.execute({ sql: `SELECT title FROM lead_tasks WHERE id = ?`, args: [t.id] })).rows[0]?.[0] ?? '', name: who.name, kind: who.kind })).rowsAffected
      }
      await put(laminate, { name: 'Jason Lim (Lamitak)', phone: '91827340', kind: 'supplier' }, ms(2026, 9, 2, 11, 5), null)
      await put(quartz, { name: 'Ah Seng Stone Works', phone: '81234570', kind: 'subcontractor' }, ms(2026, 9, 3, 15, 20), ms(2026, 9, 5, 9, 40))
      /* Benjamin's "something is not right" on Electrical & plumbing (4 Oct), resolved with a note and asked again (5 Oct) */
      const el = await msOf(ben.pid, 'Electrical & plumbing')
      const [link] = rows<{ homeowner_id: string }>(await client.execute({ sql: `SELECT homeowner_id FROM homeowner_lead_links WHERE lead_id = ? AND opened_at IS NOT NULL LIMIT 1`, args: [ben.lead] }))
      if (el && el.status === 'done' && el.confirm_asked_at && !el.resolved_at && link) {
        const said = ms(2026, 9, 4, 20, 15), fixed = ms(2026, 9, 5, 11, 30)
        const noteC = 'The two kitchen sockets are lower than we agreed', noteS = 'Moved both kitchen sockets up to 1,100 mm, as on the drawing — the photos are in Updates.'
        made += (await client.execute({ sql: `UPDATE project_milestones SET resolved_note = ?, resolved_at = ?, resolved_by = 'germaine', confirm_asked_at = ?, confirm_answer = NULL, confirm_note = NULL, confirm_answered_at = NULL, confirm_answered_by = NULL WHERE id = ? AND resolved_at IS NULL`, args: [noteS, fixed, sec(fixed), el.id] })).rowsAffected
        made += (await ev(sid(el.id, 'event:not-right'), ben.lead, ben.pid, 'project_stage_changes', null, sec(said), { id: el.id, title: 'Electrical & plumbing', name: 'Benjamin Han', note: noteC, number: ben.number })).rowsAffected
        made += (await ev(sid(el.id, 'event:resolved'), ben.lead, ben.pid, 'project_stage_resolved', 'germaine', sec(fixed), { id: el.id, title: 'Electrical & plumbing', note: noteS, askedAgain: true, name: 'Benjamin Han', number: ben.number })).rowsAffected
      }
      /* the new ask reached his bell before his last look (5 Oct, evening) — read as of then, R77's rule, so his bell keeps its one unread */
      const again = await msOf(ben.pid, 'Electrical & plumbing')
      const [look] = rows<{ homeowner: string; last: number | null }>(await client.execute({ sql: `SELECT homeowner_id AS homeowner, last_opened_at AS last FROM homeowner_lead_links WHERE lead_id = ? AND last_opened_at IS NOT NULL LIMIT 1`, args: [ben.lead] }))
      if (again?.resolved_at && again.confirm_asked_at && again.confirm_answer === null && look?.last && look.last >= again.confirm_asked_at) {
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO portal_bell_reads (homeowner_id, row_key, read_at) VALUES (?,?,?)`, args: [look.homeowner, `stage:${again.id}:${again.confirm_asked_at * 1000}`, look.last] })).rowsAffected
      }
    }
    if (ryan) {
      /* Ryan's painting waits on two: the carpentry it moves with, and the electrical & plumbing — its gap read from the dates, so nothing moves */
      const paint = await msOf(ryan.pid, 'Painting'), elec = await msOf(ryan.pid, 'Electrical & plumbing'), carp = await msOf(ryan.pid, 'Carpentry fabrication')
      if (paint && elec && paint.follows_id !== elec.id) {
        const gap = Math.round((paint.start_date - elec.end_date) / D)
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO project_milestone_links (id, project_id, milestone_id, after_id, gap_days, created_at) VALUES (?,?,?,?,?,?)`, args: [sid(paint.id, 'link:electrical'), ryan.pid, paint.id, elec.id, gap, day(2026, 8, 20)] })).rowsAffected
      }
      /* Michelle asks for a week more on the carpentry (6 Oct) — waiting for an Owner or an Admin; their bell rows */
      if (carp && carp.status !== 'done') {
        const id = sid(carp.id, 'extension:wardrobe')
        const [had] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_milestone_extensions WHERE id = ?`, args: [id] }))
        if (!had) {
          const at = ms(2026, 9, 6, 17, 10), to = carp.end_date + 7 * D
          const reason = 'The kitchen carcasses came back with the wrong hinge drilling — the factory is redoing them'
          made += (await client.execute({ sql: `INSERT OR IGNORE INTO project_milestone_extensions (id, project_id, milestone_id, from_end, to_end, reason, status, requested_by, requested_at) VALUES (?,?,?,?,?,?,'pending','michelle',?)`, args: [id, ryan.pid, carp.id, carp.end_date, to, reason, at] })).rowsAffected
          const words = (s: number) => dayLabel(dayOf(new Date(s * 1000)))
          made += (await ev(sid(id, 'event'), ryan.lead, ryan.pid, 'project_milestone_more_asked', 'michelle', sec(at), { id: carp.id, title: 'Carpentry fabrication', from: words(carp.end_date), to: words(to), reason, name: ryan.pname, number: ryan.number })).rowsAffected
          for (const m of ['dane', 'huimin']) made += (await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'schedule_ask', ?, ?, ?, ?, NULL, 'in_app,email', 'michelle', ?, NULL)`,
            args: [`n-${id}-${m}`, m, 'Michelle asks for 1 week more on Carpentry fabrication', `To ${words(to)} — “${reason}”`, `/projects/${ryan.pid}/schedule?open=${carp.id}`, ryan.lead, sec(at)] })).rowsAffected
        }
      }
    }
    /* the day each running or finished milestone started: the plan's day (the demo's schedules were laid that way) */
    made += (await client.execute(`UPDATE project_milestones SET started_at = start_date * 1000 WHERE started_at IS NULL AND status IN ('in_progress','blocked','done') AND deleted_at IS NULL`)).rowsAffected
    note(`${made} change(s)`)
  }

  /* ── R81 · Updates, choices and the portal, their gaps closed (gaps build D — the owner's "build everything", 2026-10-07; M-06 · M-07 and
     the report's §6) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
     The client says no: Ryan D'Souza declined VO-2 (cove lighting in the study) on its confirmation link with his reason, and asked for other
     options on "Bathroom tiles" on his portal (his team told, each with its Activity line); Benjamin Han's chosen countertop has its selection
     receipt in Files › Choices (and so does any chosen choice without one) with its fingerprint; Olivia Martinez's budget answer was changed
     once — 60,000 then 70,500 — and keeps both; Kevin Ng's first looks, shared on 21 Sep, whose no-login link ran out on 28 Sep, stay on his
     portal (M-06). The new bell rows of what reached a client before their last look read as read (R77's rule), so a bell keeps its count.
     Idempotent: fixed ids, and only where the record is missing. */
  console.log('\nR81 updates, choices and the portal — a declined VO, a no on a choice, receipts, an answer history, a design kept')
  {
    let made = 0
    const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
    const sec = (t: number) => Math.floor(t / 1000)
    const H = 3600
    const ev = (id: string, lead: string, pid: string, kind: string, actor: string | null, at: number, detail: Record<string, unknown>) =>
      client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, lead, kind, actor, at, JSON.stringify(detail), pid] })
    const bell = (id: string, member: string, kind: string, title: string, body: string, href: string, lead: string, quote: string | null, at: number) =>
      client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,?,'in_app,email',NULL,?,?)`, args: [id, member, kind, title, body, href, lead, quote, at, at + 2 * H] })
    const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string; quote_id: string | null }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname, p.quote_id FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
    const ryan = await projectOf('Ryan D’Souza')
    const [studioRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))
    let studioGst = 9, studioRegistered = true
    try { const st = JSON.parse(studioRow?.value ?? '{}') as { gstPct?: number; gstRegistered?: boolean }; studioGst = typeof st.gstPct === 'number' ? st.gstPct : 9; studioRegistered = st.gstRegistered !== false } catch { /* the defaults */ }
    const runners = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner','Admin') AND coalesce(is_active, 1) = 1`)).map((r) => r.id)

    if (ryan) {
      const [link] = rows<{ homeowner_id: string }>(await client.execute({ sql: `SELECT homeowner_id FROM homeowner_lead_links WHERE lead_id = ? AND invited_at IS NOT NULL LIMIT 1`, args: [ryan.lead] }))
      const team = rows<{ id: string }>(await client.execute({ sql: `SELECT member_id AS id FROM lead_assignees WHERE lead_id = ?`, args: [ryan.lead] })).map((r) => r.id)
      const designer = team.find((m) => m !== 'dane') ?? 'dane'
      /* VO-2, declined on its link (sent Sat 3 Oct, declined Mon 5 Oct) — its lines, its line in Activity, the team told */
      const voId = sid(ryan.pid, 'vo:2')
      const [haveVo] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM quotes WHERE id = ?`, args: [voId] }))
      if (!haveVo) {
        const [base] = ryan.quote_id ? rows<{ property_type: string | null; site_address: string | null; nric: string | null; customer_id: string | null; template_id: string | null; template_version: number | null; issuing_entity: string | null; gst_enabled: number; project_ref: string | null }>(await client.execute({ sql: `SELECT property_type, site_address, nric, customer_id, template_id, template_version, issuing_entity, gst_enabled, project_ref FROM quotes WHERE id = ?`, args: [ryan.quote_id] })) : []
        const gstOn = base ? base.gst_enabled === 1 : studioRegistered
        const lines = [
          { name: 'Cove lighting in the study, warm white LED strip', qty: 1, unit: 'Lot', cost: 680, markup: 240 },
          { name: 'Dimmer switch for the study lights', qty: 1, unit: 'pcs', cost: 85, markup: 35 },
        ]
        const gid = sid(`${voId}:Electrical`, 'quote_group')
        const items = [{ id: gid, parent_id: null as string | null, kind: 'group', qty: 1, cost_minor: 0, markup_minor: 0, position: 0, name: 'Electrical', unit: null as string | null },
          ...lines.map((l, i) => ({ id: sid(`${voId}:Electrical:${l.name}`, 'quote_item'), parent_id: gid as string | null, kind: 'item', qty: l.qty, cost_minor: l.cost * 100, markup_minor: l.markup * 100, position: i, name: l.name, unit: l.unit as string | null }))]
        const t = quoteTotals(items.map((i) => ({ id: i.id, parentId: i.parent_id, kind: i.kind, status: 'Pending', qty: i.qty, costMinor: i.cost_minor, markupMinor: i.markup_minor, discountPct: 0, gstPct: studioGst })), { additionalDiscountMode: 'pct', additionalDiscountValue: 0, gstEnabled: gstOn })
        const createdAt = sec(ms(2026, 9, 2, 11, 0)), submittedAt = sec(ms(2026, 9, 2, 15, 0)), approvedAt = sec(ms(2026, 9, 2, 17, 30)), sentAt = sec(ms(2026, 9, 3, 10, 15)), declinedAt = sec(ms(2026, 9, 5, 21, 5))
        const note = 'We’d rather keep the study lights we have for now — it’s more than we planned to spend. Maybe after we move in.'
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO quotes (id, lead_id, number, created_by, title, amount_minor, visibility, status, created_at, due_at, sent_at, updated_at, approved_at, prepared_by, valid_until, project_ref, nric, customer_id, property_type, site_address, version, template_id, template_version, gst_enabled, issuing_entity, items_density, terms_html, notes_html, client_signature_required, submitted_by, submitted_at, approved_by, client_sent_at, confirmed_at, confirmed_by, kind, project_id, confirmed_via, declined_at, declined_note, declined_by)
          VALUES (?,?,?,?,?,?,'Shared','Sent to Client',?,NULL,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,'double','',?,0,?,?,'dane',?,NULL,NULL,'variation',?,NULL,?,?,?)`,
          args: [voId, ryan.lead, 'VO-2', designer, 'Study lighting', t.totalMinor, createdAt, sentAt, declinedAt, approvedAt, designer, createdAt + 30 * 86400, base?.project_ref ?? null, base?.nric ?? null, base?.customer_id ?? null, base?.property_type ?? null, base?.site_address ?? null,
            base?.template_id ?? null, base?.template_version ?? null, gstOn ? 1 : 0, base?.issuing_entity ?? null, `<p>Changes to the signed contract. Omitted works show a minus quantity and are credited at the contract’s rates.</p>`,
            designer, submittedAt, sentAt, ryan.pid, declinedAt, note, 'Ryan D’Souza'] })).rowsAffected
        for (const i of items) {
          made += (await client.execute({ sql: `INSERT OR IGNORE INTO quote_items (id, quote_id, parent_id, kind, position, name, description, status, qty, unit, cost_minor, markup_minor, discount_pct, gst_pct, room, category, section, visibility, collapsed, created_at, updated_at) VALUES (?,?,?,?,?,?,NULL,'Pending',?,?,?,?,0,?,?,'Electrical',NULL,'visible',0,?,?)`,
            args: [i.id, voId, i.parent_id, i.kind, i.position, i.name, i.qty, i.unit, i.cost_minor, i.markup_minor, studioGst, i.kind === 'item' ? 'Study' : null, createdAt + 1200, createdAt + 1200] })).rowsAffected
        }
        made += (await ev(sid(voId, 'ev:vo-created'), ryan.lead, ryan.pid, 'project_vo_created', designer, createdAt, { id: voId, number: 'VO-2', title: 'Study lighting', name: ryan.pname })).rowsAffected
        made += (await ev(sid(voId, 'ev:vo-declined'), ryan.lead, ryan.pid, 'project_vo_declined', null, declinedAt, { id: voId, number: 'VO-2', title: 'Study lighting', name: ryan.pname, note, by: 'client', person: 'Ryan D’Souza' })).rowsAffected
        for (const m of [...new Set([...team, ...runners, designer])]) made += (await bell(`n-vo-declined-${voId}-${m}`, m, 'variation_declined', 'Ryan D’Souza declined variation order VO-2', `“${note}” — revise it and send it again, or delete it`, `/projects/${ryan.pid}/money`, ryan.lead, voId, declinedAt)).rowsAffected
      }
      /* "Bathroom tiles" — shared Tue 29 Sep, Ryan asked for other options on his portal (Sat 3 Oct, before his evening look) */
      const chId = sid(ryan.pid, 'choice:bathroom-tiles')
      const [haveCh] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_selections WHERE id = ?`, args: [chId] }))
      if (!haveCh && link) {
        const added = sec(ms(2026, 8, 28, 16, 0)), shared = sec(ms(2026, 8, 29, 10, 20)), said = ms(2026, 9, 3, 19, 40)
        const note = 'Both feel too dark for a small bathroom — could we see something lighter, maybe a warm white or a pale terrazzo?'
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO project_selections (id, project_id, title, room, milestone_id, needed_by, note, status, created_by, created_at, updated_at, shared_by, shared_at, client_answer, client_answer_note, client_answer_at, client_answer_by) VALUES (?,?,?,?,NULL,?,?,'declined',?,?,?,?,?,'other_options',?,?,?)`,
          args: [chId, ryan.pid, 'Bathroom tiles', 'Common bathroom', sec(ms(2026, 9, 16)), 'The wall and floor tiles for the common bathroom — the samples are at the studio if you want to see them.', designer, added, sec(said), designer, shared, note, said, link.homeowner_id] })).rowsAffected
        const opts = [{ name: 'Charcoal matte, 300 × 600', hex: '#4A4A48', price: null as number | null, vendor: 'Hafary' }, { name: 'Slate grey terrazzo, 600 × 600', hex: '#7A7C7E', price: 42000, vendor: 'Hafary' }]
        for (const [i, o] of opts.entries()) {
          const oid = sid(`${chId}:${o.name}`, 'choice_option')
          made += (await client.execute({ sql: `INSERT OR IGNORE INTO project_selection_options (id, selection_id, name, description, file_id, hex, price_minor, source, source_ref, position, created_by, created_at, updated_at, vendor) VALUES (?,?,?,NULL,NULL,?,?,'material',NULL,?,?,?,?,?)`, args: [oid, chId, o.name, o.hex, o.price, i, designer, added + 60 * (i + 1), added + 60 * (i + 1), o.vendor] })).rowsAffected
          made += (await ev(sid(oid, 'ev:option-added'), ryan.lead, ryan.pid, 'project_choice_option_added', designer, added + 60 * (i + 1), { id: chId, title: 'Bathroom tiles', name: ryan.pname, number: ryan.number, option: o.name })).rowsAffected
        }
        made += (await ev(sid(chId, 'ev:added'), ryan.lead, ryan.pid, 'project_choice_added', designer, added, { id: chId, title: 'Bathroom tiles', name: ryan.pname, number: ryan.number })).rowsAffected
        made += (await ev(sid(chId, 'ev:shared'), ryan.lead, ryan.pid, 'project_choice_shared', designer, shared, { id: chId, title: 'Bathroom tiles', name: ryan.pname, number: ryan.number })).rowsAffected
        made += (await ev(sid(chId, 'ev:declined'), ryan.lead, ryan.pid, 'project_choice_declined', null, sec(said), { id: chId, title: 'Bathroom tiles', name: ryan.pname, number: ryan.number, kind: 'other_options', note, by: 'client', person: 'Ryan D’Souza' })).rowsAffected
        for (const m of team) made += (await bell(`n-choice-declined-${chId}-${m}`, m, 'choice_declined', 'Ryan D’Souza asked for other options for Bathroom tiles', `“${note}” — add other options and share it again`, `/projects/${ryan.pid}/choices?open=${chId}`, ryan.lead, null, sec(said))).rowsAffected
      }
    }

    /* every chosen choice has its selection receipt: one entry in the lead's Files › Choices, the fingerprint the app prints (`receiptHashSource`) */
    const chosen = rows<{ id: string; project_id: string; lead_id: string; title: string; room: string | null; chosen_option_id: string; chosen_by: string | null; chosen_at: number; chosen_note: string | null; created_by: string | null }>(await client.execute(
      `SELECT s.id, s.project_id, p.lead_id, s.title, s.room, s.chosen_option_id, s.chosen_by, s.chosen_at, s.chosen_note, s.created_by FROM project_selections s JOIN projects p ON p.id = s.project_id WHERE s.status = 'chosen' AND s.deleted_at IS NULL AND s.chosen_option_id IS NOT NULL AND s.chosen_at IS NOT NULL AND (s.receipt_file_id IS NULL OR s.receipt_hash IS NULL)`))
    for (const s of chosen) {
      const opts = rows<{ id: string; name: string; vendor: string | null; price_minor: number | null }>(await client.execute({ sql: `SELECT id, name, vendor, price_minor FROM project_selection_options WHERE selection_id = ? AND deleted_at IS NULL ORDER BY position, created_at`, args: [s.id] }))
      const by = s.chosen_by === 'studio' ? 'studio' : 'client'
      const hash = createHash('sha256').update(receiptHashSource({ id: s.id, title: s.title, room: s.room }, opts.map((o) => ({ id: o.id, name: o.name, vendor: o.vendor, priceMinor: o.price_minor && Math.round(o.price_minor) !== 0 ? Math.round(o.price_minor) : null })), { optionId: s.chosen_option_id, by, at: Number(s.chosen_at) * 1000, note: by === 'studio' ? null : s.chosen_note })).digest('hex')
      let [folder] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Choices' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [s.lead_id] }))
      if (!folder) { const fid = sid(s.lead_id, 'folder:choices'); made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, updated_at) VALUES (?,?, 'folder', 'Choices', NULL, ?, NULL, ?, ?)`, args: [fid, s.lead_id, s.chosen_at, s.created_by, s.chosen_at] })).rowsAffected; folder = { id: fid } }
      const fileId = sid(s.id, 'file:selection-receipt')
      const name = `Selection receipt · ${s.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.pdf`
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`, args: [fileId, s.lead_id, name, s.chosen_at, folder.id, s.created_by, s.chosen_at] })).rowsAffected
      made += (await client.execute({ sql: `UPDATE project_selections SET receipt_file_id = ?, receipt_hash = ? WHERE id = ?`, args: [fileId, hash, s.id] })).rowsAffected
    }

    /* (parity map, TD-044 — P-H) the client's no has its selection receipt too — Ryan D’Souza's "Bathroom tiles" (other options asked): one entry
       in the lead's Files › Choices and the fingerprint the app prints (`receiptHashSource` with the answer; client_answer_at is in ms) */
    const nos = rows<{ id: string; lead_id: string; title: string; room: string | null; client_answer: string; client_answer_at: number; client_answer_note: string | null; created_by: string | null }>(await client.execute(
      `SELECT s.id, p.lead_id, s.title, s.room, s.client_answer, s.client_answer_at, s.client_answer_note, s.created_by FROM project_selections s JOIN projects p ON p.id = s.project_id WHERE s.status = 'declined' AND s.deleted_at IS NULL AND s.client_answer IN ('reject','other_options') AND s.client_answer_at IS NOT NULL AND (s.receipt_file_id IS NULL OR s.receipt_hash IS NULL)`))
    for (const s of nos) {
      const opts = rows<{ id: string; name: string; vendor: string | null; price_minor: number | null }>(await client.execute({ sql: `SELECT id, name, vendor, price_minor FROM project_selection_options WHERE selection_id = ? AND deleted_at IS NULL ORDER BY position, created_at`, args: [s.id] }))
      const at = Number(s.client_answer_at)
      const hash = createHash('sha256').update(receiptHashSource({ id: s.id, title: s.title, room: s.room }, opts.map((o) => ({ id: o.id, name: o.name, vendor: o.vendor, priceMinor: o.price_minor && Math.round(o.price_minor) !== 0 ? Math.round(o.price_minor) : null })), { optionId: '', by: 'client', at, note: s.client_answer_note }, s.client_answer as 'reject' | 'other_options')).digest('hex')
      const sec = Math.floor(at / 1000)
      let [folder] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Choices' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [s.lead_id] }))
      if (!folder) { const fid = sid(s.lead_id, 'folder:choices'); made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, updated_at) VALUES (?,?, 'folder', 'Choices', NULL, ?, NULL, ?, ?)`, args: [fid, s.lead_id, sec, s.created_by, sec] })).rowsAffected; folder = { id: fid } }
      const fileId = sid(s.id, 'file:selection-receipt')
      const name = `Selection receipt · ${s.title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)}.pdf`
      made += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`, args: [fileId, s.lead_id, name, sec, folder.id, s.created_by, sec] })).rowsAffected
      made += (await client.execute({ sql: `UPDATE project_selections SET receipt_file_id = ?, receipt_hash = ? WHERE id = ?`, args: [fileId, hash, s.id] })).rowsAffected
    }

    /* Olivia Martinez's budget, answered for her at 60,000 and changed to 70,500 two days later — both kept */
    const [budget] = rows<{ id: string; lead_id: string; answer: string | null; answered_at: number | null }>(await client.execute(`SELECT q.id, q.lead_id, q.answer, q.answered_at FROM questions q JOIN leads l ON l.id = q.lead_id WHERE l.name = 'Olivia Martinez' AND q.text = 'Total renovation budget (S$)' LIMIT 1`))
    if (budget?.answered_at && budget.answer === '70500') {
      const [had] = rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM question_answer_history WHERE question_id = ?`, args: [budget.id] }))
      if (!Number(had?.n ?? 0)) {
        const last = Number(budget.answered_at) * 1000, first = last - 2 * 86_400_000 - 3 * 3_600_000
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO question_answer_history (id, lead_id, question_id, before, after, by_kind, by_member_id, by_homeowner_id, by_name, at) VALUES (?,?,?,NULL,'60000','studio','dane',NULL,'Dane',?)`, args: [sid(budget.id, 'answer:1'), budget.lead_id, budget.id, first] })).rowsAffected
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO question_answer_history (id, lead_id, question_id, before, after, by_kind, by_member_id, by_homeowner_id, by_name, at) VALUES (?,?,?,'60000','70500','studio','dane',NULL,'Dane',?)`, args: [sid(budget.id, 'answer:2'), budget.lead_id, budget.id, last] })).rowsAffected
      }
    }

    /* Kevin Ng's first looks — shared Mon 21 Sep, its no-login link closed Mon 28 Sep; the portal keeps them (M-06) */
    const [kev] = rows<{ design: string; lead: string }>(await client.execute(`SELECT d.id AS design, l.id AS lead FROM visualizer_designs d JOIN leads l ON l.id = d.lead_id WHERE d.kind = 'lead' AND l.name = 'Kevin Ng' AND d.deleted_at IS NULL LIMIT 1`))
    if (kev) {
      const linkId = sid(kev.design, 'share:first-looks')
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM render_share_links WHERE id = ?`, args: [linkId] }))
      const jobs = rows<{ job: string; room: string; room_name: string; before: string | null; variants: string }>(await client.execute({ sql: `SELECT j.id AS job, r.id AS room, r.name AS room_name, r.original_image_url AS before, j.variants_json AS variants FROM render_jobs j JOIN project_rooms r ON r.id = j.room_id WHERE r.design_id = ? AND r.deleted_at IS NULL AND j.kind = 'restyle' ORDER BY r.position, j.created_at`, args: [kev.design] }))
      if (!have && jobs.length) {
        const versions = jobs.flatMap((j) => {
          let v: { id: number; n: number; imageUrl: string; applied?: { style?: string | null }; deletedAt?: unknown }[] = []
          try { v = JSON.parse(j.variants) } catch { v = [] }
          const first = v.find((x) => !x.deletedAt)
          return first ? [{ key: `${j.job}:${first.id}`, roomId: j.room, roomName: j.room_name, label: `V${first.n} · ${first.applied?.style ?? 'Restyled'}`, imageUrl: first.imageUrl, beforeUrl: j.before, materials: [] as { label: string; material: string }[] }] : []
        })
        const created = sec(ms(2026, 8, 21, 15, 30))   // before R61's link, so R77b's newest-link rule keeps reopening that one
        const token = createHash('sha256').update(`${linkId}:token`).digest('hex').slice(0, 32)
        made += (await client.execute({ sql: `INSERT OR IGNORE INTO render_share_links (id, token, design_id, lead_id, snapshot, message, expires_at, view_count, last_viewed_at, sent_via, created_by, created_at, revoked_at) VALUES (?,?,?,?,?,?,?,1,?, 'whatsapp', 'michelle', ?, NULL)`,
          args: [linkId, token, kev.design, kev.lead, JSON.stringify({ versions }), 'Two first looks before we meet — a Scandinavian kitchen and a Japandi living room. Tell me which way you lean.', created + 7 * 86400, created + 18 * H, created] })).rowsAffected
      }
    }

    /* the bell's new rows (a document sent, a file shown, designs shared — REG-D.3) that reached a client before their last look read as read
       then, so each bell keeps the count it had (R77's rule) */
    const looks = [
      ...rows<{ homeowner: string; lead: string; last: number }>(await client.execute(`SELECT homeowner_id AS homeowner, lead_id AS lead, last_opened_at AS last FROM homeowner_lead_links WHERE last_opened_at IS NOT NULL AND withdrawn_at IS NULL`)),
      ...rows<{ homeowner: string; lead: string; last: number }>(await client.execute(`SELECT homeowner_id AS homeowner, lead_id AS lead, last_opened_at AS last FROM homeowner_household_links WHERE last_opened_at IS NOT NULL AND withdrawn_at IS NULL AND removed_at IS NULL`)),
    ]
    for (const l of looks) {
      const keys: string[] = []
      for (const q of rows<{ id: string; kind: string; at: number }>(await client.execute({ sql: `SELECT id, kind, coalesce(client_sent_at, sent_at) AS at FROM quotes WHERE lead_id = ? AND deleted_at IS NULL AND archived_at IS NULL AND status IN ('Sent to Client','Confirmed','Signed') AND coalesce(client_sent_at, sent_at) IS NOT NULL AND coalesce(client_sent_at, sent_at) <= ?`, args: [l.lead, l.last] }))) keys.push(`doc:${q.kind === 'variation' ? 'variation' : 'quote'}:${q.id}:${Number(q.at) * 1000}`)
      for (const c of rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, sent_at AS at FROM contracts WHERE lead_id = ? AND deleted_at IS NULL AND archived_at IS NULL AND status IN ('Sent to Client','Signed') AND sent_at IS NOT NULL AND sent_at <= ?`, args: [l.lead, l.last] }))) keys.push(`doc:agreement:${c.id}:${Number(c.at) * 1000}`)
      for (const f of rows<{ id: string; at: number }>(await client.execute({ sql: `SELECT id, shown_to_client_at AS at FROM lead_files WHERE lead_id = ? AND deleted_at IS NULL AND shown_to_client_at IS NOT NULL AND shown_to_client_at <= ?`, args: [l.lead, l.last] }))) keys.push(`shown:${f.id}:${Number(f.at) * 1000}`)
      for (const d of rows<{ token: string }>(await client.execute({ sql: `SELECT token FROM render_share_links WHERE lead_id = ? AND revoked_at IS NULL AND created_at <= ?`, args: [l.lead, l.last] }))) keys.push(`design:${d.token}`)
      for (const k of keys) made += (await client.execute({ sql: `INSERT OR IGNORE INTO portal_bell_reads (homeowner_id, row_key, read_at) VALUES (?,?,?)`, args: [l.homeowner, k, l.last] })).rowsAffected
    }
    console.log(`  ${made} record${made === 1 ? '' : 's'} written`)
  }

  /* ── R82 · gaps build E — files and delivery (the owner's "build everything", 2026-10-07; the report's 5-files rows) ──────────────────────
     What every file record needs to be true now that Files keeps every file (REG-343), and the outbox the delivery layer writes:
     - the demo's PDFs that held no bytes get their pages: Benjamin Han's site measurements (his rooms as measured, the floor plan's outline)
       and Ryan D’Souza's XR-1042 (the invoice his studio's accounting system made — its figures read from its own record); any other PDF with
       no bytes (a stand-in a test left) gets a page that names it. An invoice's or a receipt's entry stays a pointer to its page (gaps build B);
     - the size each kept file says is its bytes' own (the floor plan said 486 KB of a 2 KB drawing);
     - every live project's Files opens with the starter folders — never a second of one it has (lib/leads/file-model.ts `missingStarters`),
       stamped with the project's own moment and its maker, as New project makes them;
     - two spreadsheets a studio files: Benjamin Han's BOQ in Quotes & BOQ (Germaine, after the site visit) and Ryan D’Souza's supplier price list
       (Michelle) — the UAT's sample files, real bytes;
     - every PDF with bytes and no picture gets its first page (pdf.js + @napi-rs/canvas, the optional canvas pdfjs-dist installs; skipped where
       it is missing — Files then draws the page in the browser the first time it lists the file);
     - the outbox: the newest twelve bell rows that went out by email or WhatsApp, as delivery.ts sends them (the studio's words, the member's
       address — a member with no mobile number reads "No mobile number"), at the moment each was raised.
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE, bytes and pictures written only where none is. (invented copy) */
  console.log('\nR82 files and delivery — real bytes, sizes, starter folders, spreadsheets, first pages, the outbox')
  {
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('lead_file_thumbs', 'notification_outbox')`))[0]?.n ?? 0)
    if (have === 2) {
      let made = 0
      const run = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const fs = await import('node:fs')
      /* a one-page PDF: a title, lines of text, and what is drawn under them (PDF path operators) — R77b's writer */
      const pdf = (title: string, lines: string[], draw = ''): string => {
        const esc = (t: string) => t.replace(/[\\()]/g, (c) => `\\${c}`).replace(/[^\x20-\x7e]/g, (c) => (c === '’' ? "'" : c === '—' || c === '–' ? '-' : c === '·' ? '-' : c === '×' ? 'x' : ' '))
        let content = `BT /F1 18 Tf 56 780 Td (${esc(title)}) Tj ET\n`
        lines.forEach((l, i) => { content += `BT /F1 11 Tf 56 ${748 - i * 16} Td (${esc(l)}) Tj ET\n` })
        content += draw
        const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
          '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
          '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}endstream`]
        let out = '%PDF-1.4\n'
        const offs: number[] = []
        objs.forEach((o, i) => { offs.push(Buffer.byteLength(out, 'latin1')); out += `${i + 1} 0 obj\n${o}\nendobj\n` })
        const xref = Buffer.byteLength(out, 'latin1')
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
        return `data:application/pdf;base64,${Buffer.from(out, 'latin1').toString('base64')}`
      }
      const bytesOf = (dataUrl: string) => Buffer.byteLength(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')   // exactly, as uploadFile counts
      const sample = (name: string, mime: string) => `data:${mime};base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'uat-files', name)).toString('base64')}`
      const money = (minor: number) => `S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)}`
      const longDay = (sec: number) => new Date(sec * 1000).toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' })
      const keep = async (fileId: string, data: string) => {
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, args: [fileId, data] })
        made += r.rowsAffected
      }
      const [studioRow] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'studio'`))
      let studio = 'Demo Studio'
      try { studio = shortStudioName(String((JSON.parse(studioRow?.value ?? '{}') as { name?: string }).name ?? 'Demo Studio')) } catch { /* the default */ }

      /* 1 · Benjamin Han's site measurements — his rooms as Germaine measured them, on the floor plan's outline (R77b) */
      const [ben] = rows<{ lead: string; pid: string; address: string | null }>(await client.execute(`SELECT l.id AS lead, p.id AS pid, l.property_address AS address FROM leads l JOIN projects p ON p.lead_id = l.id AND p.deleted_at IS NULL WHERE l.name = 'Benjamin Han' AND l.deleted_at IS NULL LIMIT 1`))
      if (ben) {
        const [m] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND name = 'Site measurements.pdf' AND kind = 'pdf'`, args: [ben.lead] }))
        if (m) {
          const rooms = [[56, 330, 260, 220, 'Living and dining  6.2 x 5.1 m'], [316, 440, 222, 110, 'Kitchen  3.4 x 2.6 m'], [316, 330, 110, 110, 'Yard  1.8 x 1.6 m'], [56, 150, 180, 180, 'Master bedroom  4.0 x 3.6 m'], [236, 220, 150, 110, 'Bedroom 2  3.2 x 2.9 m'], [386, 220, 152, 110, 'Bedroom 3  3.0 x 2.9 m'], [236, 150, 120, 70, 'Bath 1  2.2 x 1.6 m'], [356, 150, 90, 70, 'Bath 2  1.9 x 1.5 m']] as const
          const drawing = `0.2 w\n${rooms.map(([x, y, w, h]) => `${x} ${y} ${w} ${h} re S`).join('\n')}\n${rooms.map(([x, y, , h, n]) => `BT /F1 8 Tf ${x + 6} ${y + h - 14} Td (${n}) Tj ET`).join('\n')}\n`
          await keep(m.id, pdf('Site measurements - SkyOasis @ Dawson', [`HDB 5-Room${ben.address ? `, ${ben.address}` : ''}. Measured on site by Germaine, ${studio}.`, 'Ceiling height 2.6 m throughout; the kitchen and yard walls are 150 mm block.', 'Room sizes are internal, wall to wall. Not to scale.'], drawing))
        }
      }

      /* 2 · an invoice recorded from outside OpenMaison (gaps build B, item 9): the paper the studio's accounting system made, from its record */
      for (const x of rows<{ file: string; ref: string; desc: string | null; amount: number; gst: number; sent: number | null; due: number | null; lead: string; address: string | null; ptype: string | null }>(await client.execute(`SELECT i.external_file_id AS file, i.external_ref AS ref, i.description AS desc, i.amount_minor AS amount, i.gst_minor AS gst, i.sent_at AS sent, i.due_at AS due, l.name AS lead, l.property_address AS address, l.property_type AS ptype
          FROM project_invoices i JOIN projects p ON p.id = i.project_id JOIN leads l ON l.id = p.lead_id WHERE i.kind = 'external' AND i.external_file_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_file_images f WHERE f.file_id = i.external_file_id)`))) {
        const lines = [`Bill to: ${x.lead}${x.address ? `, ${x.address}` : ''}${x.ptype ? ` (${x.ptype})` : ''}`, x.sent ? `Issued ${longDay(x.sent)}${x.due ? ` - due ${longDay(x.due)}` : ''}` : '', '',
          `${x.desc ?? 'Works'}`, `Amount before GST  ${money(x.amount - x.gst)}`, `GST  ${money(x.gst)}`, `Total due  ${money(x.amount)}`, '', `${studio} - made in the studio's accounting system.`].filter((l, i, a) => l || a[i - 1])
        await keep(x.file, pdf(`Invoice ${x.ref}`, lines, `0.4 w\n56 ${748 - 3 * 16 + 12} m 539 ${748 - 3 * 16 + 12} l S\n`))
      }

      /* 3 · any other PDF that holds no bytes and is not a money paper's entry (an invoice's, a receipt's, a selection receipt's — (pending modules
         S07, R109) a credit note's too: its page is its PDF): a page that names it */
      for (const f of rows<{ id: string; name: string; lead: string }>(await client.execute(`SELECT f.id, f.name, l.name AS lead FROM lead_files f JOIN leads l ON l.id = f.lead_id WHERE f.kind = 'pdf'
          AND NOT EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_invoices v WHERE v.file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_selections sr WHERE sr.receipt_file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_payments p WHERE p.receipt_file_id = f.id)
          AND NOT EXISTS (SELECT 1 FROM credit_notes cn WHERE cn.file_id = f.id)`))) {
        await keep(f.id, pdf(f.name.replace(/\.pdf$/i, ''), [`${f.lead} - kept in ${studio}'s Files.`]))
      }

      /* 4 · every kept file's size is its bytes' own */
      for (const f of rows<{ id: string; size: number | null; data: string }>(await client.execute(`SELECT f.id, f.size_bytes AS size, i.data FROM lead_files f JOIN lead_file_images i ON i.file_id = f.id`))) {
        const real = bytesOf(f.data)
        if (f.size === null || Number(f.size) !== real) await run(`UPDATE lead_files SET size_bytes = ? WHERE id = ?`, [real, f.id])
      }

      /* 5 · the starter folders on every live project — its maker's, at its own moment; never a second */
      for (const p of rows<{ lead: string; at: number; by: string | null }>(await client.execute(`SELECT lead_id AS lead, created_at AS at, created_by AS by FROM projects WHERE deleted_at IS NULL`))) {
        const roots = rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND parent_id IS NULL AND deleted_at IS NULL`, args: [p.lead] }))
        for (const name of missingStarters(roots)) await run(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder',?,NULL,?,NULL,?,NULL,NULL,?)`, [sid(p.lead, `starter:${name}`), p.lead, name, p.at, p.by ?? 'dane', p.at])
      }

      /* 6 · two spreadsheets a studio files — the UAT's samples, filed where a studio keeps them */
      const folderNamed = async (lead: string, name: string) => rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = ? AND parent_id IS NULL AND deleted_at IS NULL ORDER BY created_at LIMIT 1`, args: [lead, name] }))[0]?.id ?? null
      const sheets: { client: string; file: string; name: string; mime: string; by: string; after: number }[] = [
        { client: 'Benjamin Han', file: 'sophia-items-to-paste.xlsx', name: 'BOQ — kitchen and bathrooms.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', by: 'germaine', after: 6 * D },
        { client: 'Ryan D’Souza', file: 'supplier-price-list.csv', name: 'Supplier price list.csv', mime: 'text/csv', by: 'michelle', after: 9 * D },
      ]
      for (const s of sheets) {
        const [p] = rows<{ lead: string; at: number }>(await client.execute({ sql: `SELECT l.id AS lead, p.created_at AS at FROM leads l JOIN projects p ON p.lead_id = l.id AND p.deleted_at IS NULL WHERE l.name = ? AND l.deleted_at IS NULL LIMIT 1`, args: [s.client] }))
        const folder = p ? await folderNamed(p.lead, 'Quotes & BOQ') : null
        if (!p || !folder || !fs.existsSync(path.join(process.cwd(), 'public', 'uat-files', s.file))) continue
        const id = sid(p.lead, `sheet:${s.file}`), data = sample(s.file, s.mime), at = Math.min(p.at + s.after, NOW - 2 * H)
        await run(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'doc',?,NULL,?,?,?,?,?,?)`, [id, p.lead, s.name, at, folder, s.by, bytesOf(data), s.mime, at])
        await keep(id, data)
      }

      /* 7 · the first page of every PDF with bytes and no picture — drawn here when the canvas is installed */
      const bare = rows<{ id: string; data: string }>(await client.execute(`SELECT f.id, i.data FROM lead_files f JOIN lead_file_images i ON i.file_id = f.id WHERE f.kind = 'pdf' AND f.thumb IS NULL AND NOT EXISTS (SELECT 1 FROM lead_file_thumbs t WHERE t.file_id = f.id)`))
      if (bare.length) {
        try {
          const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
          const { createCanvas } = await import('@napi-rs/canvas')
          const fonts = `${path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts')}/`
          for (const f of bare) {
            const task = pdfjs.getDocument({ data: new Uint8Array(Buffer.from(f.data.slice(f.data.indexOf(',') + 1), 'base64')), standardFontDataUrl: fonts, verbosity: 0 })
            try {
              const doc = await task.promise
              const page = await doc.getPage(1)
              const base = page.getViewport({ scale: 1 })
              const viewport = page.getViewport({ scale: 480 / Math.max(1, base.width) })
              const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)))
              const ctx = canvas.getContext('2d')
              ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
              await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise
              const jpeg = `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 82).toString('base64')}`
              await run(`INSERT OR IGNORE INTO lead_file_thumbs (file_id, data) VALUES (?, ?)`, [f.id, jpeg])
              await run(`UPDATE lead_files SET thumb = ? WHERE id = ? AND thumb IS NULL`, [`/files/thumb/${f.id}`, f.id])
            } catch (e) { note(`first page not drawn for ${f.id}: ${e instanceof Error ? e.message : String(e)}`) } finally { await task.destroy() }
          }
        } catch { note('pdf.js or its canvas is not installed here — Files draws these first pages in the browser') }
      }

      /* 8 · the outbox: the newest twelve bell rows that went out by email or WhatsApp (`outboxNewest`) */
      made += await outboxNewest()
      note(`${made} record(s) — real pages for the demo's PDFs, true sizes, the starter folders, two spreadsheets, first pages, the outbox`)
    }
  }

  /* ── R83 · gaps build F1 — money out: the costs (the owner's "build everything", 2026-10-07 — M-08; calls F1-Q1…Q16) ─────────────────────
     The studio's money out, told across the demo projects, each record with its trail (REG-343): every PO with its lines (from the signed quote
     where it had one), its Activity lines, its approvals, its vendor's answer and its payments; bills with their files; expenses and claims with
     their answers; the bell rows that wait.
     - Vendors: eight sub-contractors and suppliers (bank and PayNow on the ones the studio has paid), the studio's office landlord, and a
       duplicate Michelle added on site — "Wood Craft Carpentry" — to merge.
     - Shalini Menon (completed): ColourPro's painting PO-2026-001 and Woodcraft's carpentry PO-2026-002 (Sarah's, Dane approved it), both
       accepted on their links, billed and paid in full before the handover — closed; the post-renovation cleaning, an expense the studio paid.
     - Ryan D'Souza (in progress): Woodcraft's PO-2026-003 (over the limit with a 30% advance — Michelle submitted, Dane approved and sent it; the
       vendor accepted on the link; the advance paid 14 Aug; WC-2391, their progress bill read from its PDF, due 9 Oct); Floor Xpert's PO-2026-004
       (Hui Min approved it, the vendor said yes on the phone, its bill paid by PayNow — closed); Bright Spark's PO-2026-007 (under the limit,
       Michelle sent it; the vendor asked for changes on the link: 67 points, not 61); Michelle's floor protection boards (a claim, approved, not
       yet paid back) and the touch-up materials bought from the duplicate vendor.
     - Benjamin Han (in progress): AquaFlow's PO-2026-005 (accepted; AF-7781 read from its PDF, overdue since 30 Sep); Stone & Tile's PO-2026-008
       (Germaine's, over the limit — waiting for Dane or Hui Min); Germaine's Grab rides to site, a claim waiting for approval.
     - Aisha Rahman (on hold since 2 Oct): ClearView's PO-2026-006, sent 22 Sep, cancelled when the works paused.
     - Marcus Teo (setting up): Lim Brothers' debris disposal, PO-2026-009, a Draft.
     - The studio's overhead: October's rent bill from Kallang Co-Work (due 15 Oct); the design software (Dane, approved at once); Sarah's sample
       courier, a claim paid back by PayNow on 30 Sep.
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE; a bill's file is read from public/uat-files once. */
  console.log('\nR83 money out — vendors, purchase orders, supplier bills, expenses, payments out')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'purchase_orders'`))[0]?.n
    if (has) {
      const fs = await import('node:fs')
      const at = (y: number, m: number, d: number, h = 0, mi = 0) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000)
      const dayOf = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
      const plusDays = (sec: number, n: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime() / 1000) }
      const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
      const token = (seed: string) => createHash('sha256').update(`r83-token:${seed}`).digest('base64url').slice(0, 22)
      const NAMES: Record<string, string> = Object.fromEntries(rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM members`)).map((m) => [m.id, m.name]))
      type P = { id: string; lead_id: string; name: string; quote_id: string | null; address: string | null; created: number }
      const proj = async (n: string) => rows<P>(await client.execute({ sql: `SELECT p.id, p.lead_id, p.name, p.quote_id, l.property_address AS address, p.created_at AS created FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.number = ? AND p.deleted_at IS NULL`, args: [n] }))[0] ?? null
      const ev = (seed: string, p: P, kind: string, actor: string | null, atSec: number, detail: Record<string, unknown>) =>
        client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(seed, `r83:ev:${kind}`), p.lead_id, kind, actor, atSec, JSON.stringify({ name: p.name, ...detail }), p.id] })
      const bell = (seed: string, member: string, kind: string, title: string, body: string | null, href: string, leadId: string | null, actor: string | null, atSec: number, read: boolean) =>
        client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,'in_app',?,?,?)`,
          args: [sid(seed, `r83:bell:${kind}:${member}`), member, kind, title, body, href, leadId, actor, atSec, read ? atSec + 2 * H : null] })
      let made = 0
      const count = (r: { rowsAffected: number }) => { made += r.rowsAffected }

      /* — vendors — */
      type V = { key: string; name: string; trade: string; contact: string; phone: string; email: string | null; uen: string | null; gst: boolean; bank: [string, string, string] | null; payNow: string | null; by: string; at: number; notes?: string }
      const VENDORS: V[] = [
        { key: 'woodcraft', name: 'Woodcraft Carpentry Pte Ltd', trade: 'Carpentry', contact: 'Ah Seng Lim', phone: '91234401', email: 'ahseng@woodcraft.example.sg', uen: '201534567K', gst: true, bank: ['OCBC', 'Woodcraft Carpentry Pte Ltd', '601-234567-001'], payNow: '201534567K', by: 'dane', at: at(2026, 7, 28, 10), notes: 'Factory in Kaki Bukit — call Ah Seng a day before site measurements.' },
        { key: 'floorxpert', name: 'Floor Xpert Pte Ltd', trade: 'Flooring', contact: 'Melvin Goh', phone: '98765432', email: 'sales@floorxpert.example.sg', uen: '201622334M', gst: true, bank: ['DBS', 'Floor Xpert Pte Ltd', '072-345678-9'], payNow: '201622334M', by: 'dane', at: at(2026, 7, 28, 10, 5) },
        { key: 'brightspark', name: 'Bright Spark Electrical', trade: 'Electrical', contact: 'Kumar Rajan', phone: '91872210', email: null, uen: null, gst: false, bank: ['UOB', 'Kumar Rajan', '451-302-118-0'], payNow: '91872210', by: 'michelle', at: at(2026, 8, 7, 15) },
        { key: 'aquaflow', name: 'AquaFlow Plumbing Works', trade: 'Plumbing', contact: 'Tan Boon Huat', phone: '82345567', email: null, uen: '53412788B', gst: false, bank: ['POSB', 'AquaFlow Plumbing Works', '123-45678-9'], payNow: '53412788B', by: 'germaine', at: at(2026, 8, 20, 11) },
        { key: 'stonetile', name: 'Stone & Tile Masonry Pte Ltd', trade: 'Masonry', contact: 'Raju Pillai', phone: '93457788', email: 'raju@stonetile.example.sg', uen: '201745671H', gst: true, bank: null, payNow: null, by: 'germaine', at: at(2026, 8, 20, 11, 10) },
        { key: 'clearview', name: 'ClearView Glass & Aluminium', trade: 'Fittings', contact: 'Jason Ong', phone: '96128844', email: null, uen: '201902233C', gst: true, bank: null, payNow: null, by: 'michelle', at: at(2026, 9, 18, 9) },
        { key: 'colourpro', name: 'ColourPro Painting Services', trade: 'Painting', contact: 'Ahmad Rizal', phone: '90213344', email: null, uen: '201812345D', gst: true, bank: ['Maybank', 'ColourPro Painting Services', '04-123456-7'], payNow: '201812345D', by: 'sarah', at: at(2026, 8, 8, 16) },
        { key: 'limbros', name: 'Lim Brothers Haulage', trade: 'Logistics', contact: 'Lim Kok Wah', phone: '88812345', email: null, uen: null, gst: false, bank: null, payNow: null, by: 'germaine', at: at(2026, 10, 6, 10) },
        { key: 'kallang', name: 'Kallang Co-Work Pte Ltd', trade: 'Office', contact: 'Front desk', phone: '62220199', email: 'billing@kallangcowork.example.sg', uen: '201511122N', gst: true, bank: ['DBS', 'Kallang Co-Work Pte Ltd', '003-998877-1'], payNow: '201511122N', by: 'huimin', at: at(2026, 7, 1, 9) },
        /* the duplicate Michelle added on site — its own row, no bank: Finance › Vendors merges it into Woodcraft */
        { key: 'woodcraft-dup', name: 'Wood Craft Carpentry', trade: 'Carpentry', contact: 'Ah Seng', phone: '91234401', email: null, uen: null, gst: false, bank: null, payNow: null, by: 'michelle', at: at(2026, 9, 29, 17) },
      ]
      const vid = (key: string) => sid('r83', `vendor:${key}`)
      for (const v of VENDORS) {
        count(await client.execute({ sql: `INSERT OR IGNORE INTO vendors (id, name, trade, contact_name, phone, email, uen, charges_gst, bank_name, account_name, account_no, pay_now, notes, is_active, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?)`,
          args: [vid(v.key), v.name, v.trade, v.contact, v.phone, v.email, v.uen, v.gst ? 1 : 0, v.bank?.[0] ?? null, v.bank?.[1] ?? null, v.bank?.[2] ?? null, v.payNow, v.notes ?? null, v.by, v.at, v.by, v.at] }))
      }
      const vname = (key: string) => VENDORS.find((v) => v.key === key)!.name

      /* — purchase orders — */
      type Line = { from?: string; description?: string; category?: string; qty?: number; unit?: string; unitMinor?: number }
      type Pay = { key: string; by: string; at: number; amount: number; method: string; ref: string; advance?: boolean; bill?: string }
      type PO = {
        key: string; project: string; vendor: string; number: string; title: string; lines: Line[]; gst: boolean; advancePct?: number; terms: 'cod' | 'net15' | 'net30' | 'net60'
        created: { by: string; at: number }; submitted?: { by: string; at: number }; sent?: { by: string; at: number }; viewed?: number
        answer?: { answer: 'accepted' | 'changes' | 'declined'; via: string; at: number; note?: string; by?: string }
        cancelled?: { by: string; at: number; reason: string }; pays?: Pay[]; expected?: number; note?: string
      }
      const TERMS_DAYS: Record<string, number> = { cod: 0, net15: 15, net30: 30, net60: 60 }
      const POS: PO[] = [
        { key: 'sha-paint', project: 'P-2025-001', vendor: 'colourpro', number: 'PO-2026-001', title: 'Painting, whole unit', terms: 'net30', gst: true,
          lines: [{ description: 'Painting, whole unit — two coats', category: 'Painting', qty: 1, unit: 'Lot', unitMinor: 150000 }],
          created: { by: 'sarah', at: at(2026, 8, 9, 10) }, sent: { by: 'sarah', at: at(2026, 8, 9, 10, 20) }, viewed: at(2026, 8, 9, 13), answer: { answer: 'accepted', via: 'link', at: at(2026, 8, 10, 9, 15) },
          pays: [{ key: 'sha-paint-1', by: 'dane', at: at(2026, 9, 22, 11), amount: 163500, method: 'bank_transfer', ref: 'DBS 77120', bill: 'sha-paint-bill' }] },
        { key: 'sha-wood', project: 'P-2025-001', vendor: 'woodcraft', number: 'PO-2026-002', title: 'Built-in carpentry', terms: 'net30', gst: true,
          lines: [{ description: 'Kitchen carpentry, top and bottom cabinets', category: 'Carpentry', qty: 18, unit: 'ft run', unitMinor: 19000 }, { description: 'Wardrobe, master bedroom', category: 'Carpentry', qty: 12, unit: 'ft run', unitMinor: 26000 }],
          created: { by: 'sarah', at: at(2026, 8, 9, 15) }, submitted: { by: 'sarah', at: at(2026, 8, 9, 15, 10) }, sent: { by: 'dane', at: at(2026, 8, 10, 9) }, viewed: at(2026, 8, 10, 10), answer: { answer: 'accepted', via: 'link', at: at(2026, 8, 10, 11) },
          pays: [{ key: 'sha-wood-1', by: 'dane', at: at(2026, 8, 25, 10), amount: 350000, method: 'bank_transfer', ref: 'OCBC 55102' }, { key: 'sha-wood-2', by: 'dane', at: at(2026, 9, 20, 10), amount: 362860, method: 'bank_transfer', ref: 'OCBC 58833' }] },
        { key: 'ryan-wood', project: 'P-2026-001', vendor: 'woodcraft', number: 'PO-2026-003', title: 'Kitchen, wardrobe and vanity carpentry', terms: 'net30', gst: true, advancePct: 30, expected: at(2026, 9, 20),
          note: 'Deliver to Bishan Loft — call Michelle an hour before. Lift padding is up from 9am.',
          lines: [{ from: 'Kitchen carpentry, top and bottom cabinets' }, { from: 'Wardrobe, master bedroom' }, { from: 'Kitchen countertop, quartz' }, { from: 'Bathroom vanity with basin' }],
          created: { by: 'michelle', at: at(2026, 8, 10, 10) }, submitted: { by: 'michelle', at: at(2026, 8, 10, 10, 5) }, sent: { by: 'dane', at: at(2026, 8, 11, 9, 30) }, viewed: at(2026, 8, 11, 10, 12), answer: { answer: 'accepted', via: 'link', at: at(2026, 8, 11, 11, 40) },
          pays: [{ key: 'ryan-wood-adv', by: 'dane', at: at(2026, 8, 14, 10), amount: 0, method: 'bank_transfer', ref: 'OCBC 88213', advance: true }] },
        { key: 'ryan-floor', project: 'P-2026-001', vendor: 'floorxpert', number: 'PO-2026-004', title: 'Vinyl flooring, supply and install', terms: 'net30', gst: true,
          lines: [{ from: 'Vinyl flooring, supply and install' }],
          created: { by: 'michelle', at: at(2026, 8, 18, 14) }, submitted: { by: 'michelle', at: at(2026, 8, 18, 14, 5) }, sent: { by: 'huimin', at: at(2026, 8, 19, 9) }, answer: { answer: 'accepted', via: 'phone', at: at(2026, 8, 19, 11), by: 'michelle' },
          pays: [{ key: 'ryan-floor-1', by: 'huimin', at: at(2026, 9, 15, 15), amount: 0, method: 'paynow', ref: 'PayNow 201622334M', bill: 'ryan-floor-bill' }] },
        { key: 'ben-plumb', project: 'P-2026-002', vendor: 'aquaflow', number: 'PO-2026-005', title: 'Plumbing works', terms: 'net15', gst: false,
          lines: [{ from: 'Plumbing works, kitchen and bathrooms' }],
          created: { by: 'germaine', at: at(2026, 9, 1, 10) }, sent: { by: 'germaine', at: at(2026, 9, 1, 10, 15) }, viewed: at(2026, 9, 1, 18), answer: { answer: 'accepted', via: 'link', at: at(2026, 9, 2, 8, 30) } },
        { key: 'aisha-glass', project: 'P-2026-003', vendor: 'clearview', number: 'PO-2026-006', title: 'Glass shower screens', terms: 'net30', gst: true,
          lines: [{ from: 'Glass shower screen' }],
          created: { by: 'michelle', at: at(2026, 9, 22, 10) }, sent: { by: 'michelle', at: at(2026, 9, 22, 10, 30) }, viewed: at(2026, 9, 22, 12),
          cancelled: { by: 'michelle', at: at(2026, 10, 2, 13), reason: 'Aisha is away until mid-November and the works pause — ClearView released the slot; raise it again when they resume' } },
        { key: 'ryan-elec', project: 'P-2026-001', vendor: 'brightspark', number: 'PO-2026-007', title: 'Electrical points', terms: 'net30', gst: false,
          lines: [{ from: 'Electrical point, new' }],
          created: { by: 'michelle', at: at(2026, 10, 1, 9) }, sent: { by: 'michelle', at: at(2026, 10, 1, 9, 20) }, viewed: at(2026, 10, 2, 8, 45),
          answer: { answer: 'changes', via: 'link', at: at(2026, 10, 3, 14, 10), note: 'The drawing shows 67 points, not 61 — please add the 6 for the study before we start' } },
        { key: 'ben-tile', project: 'P-2026-002', vendor: 'stonetile', number: 'PO-2026-008', title: 'Tiling, screeding and waterproofing', terms: 'net30', gst: true,
          lines: [{ from: 'Bathroom tiles, supply and install' }, { from: 'Cement screeding and waterproofing' }],
          created: { by: 'germaine', at: at(2026, 10, 5, 16) }, submitted: { by: 'germaine', at: at(2026, 10, 5, 16, 20) } },
        { key: 'marcus-haul', project: 'P-2026-004', vendor: 'limbros', number: 'PO-2026-009', title: 'Debris disposal after hacking', terms: 'cod', gst: false,
          lines: [{ description: 'Haulage and debris disposal — 2 trips', category: 'Logistics', qty: 2, unit: 'trip', unitMinor: 30000 }],
          created: { by: 'germaine', at: at(2026, 10, 6, 10, 30) } },
      ]
      const poId = (key: string) => sid('r83', `po:${key}`)
      const billId = (key: string) => sid('r83', `bill:${key}`)
      const payId = (key: string) => sid('r83', `payout:${key}`)
      const poTotals = new Map<string, number>()
      for (const o of POS) {
        const p = await proj(o.project)
        if (!p) { note(`R83: ${o.project} not found — ${o.number} skipped`); continue }
        /* the lines: a quote line's own words, trade, quantity and cost */
        const lines: { description: string; category: string | null; qty: number; unit: string | null; unitMinor: number; quoteItemId: string | null }[] = []
        for (const l of o.lines) {
          if (l.from) {
            const [q] = p.quote_id ? rows<{ id: string; name: string; category: string | null; qty: number; unit: string | null; cost: number }>(await client.execute({ sql: `SELECT id, name, category, qty, unit, cost_minor AS cost FROM quote_items WHERE quote_id = ? AND name = ? LIMIT 1`, args: [p.quote_id, l.from] })) : []
            if (!q) { note(`R83: quote line “${l.from}” not on ${o.project}`); continue }
            lines.push({ description: q.name, category: q.category, qty: q.qty, unit: q.unit, unitMinor: q.cost, quoteItemId: q.id })
          } else lines.push({ description: l.description!, category: l.category ?? null, qty: l.qty ?? 1, unit: l.unit ?? null, unitMinor: l.unitMinor ?? 0, quoteItemId: null })
        }
        if (!lines.length) continue
        const sub = lines.reduce((s, l) => s + Math.round(l.qty * l.unitMinor), 0)
        const gst = o.gst ? Math.round((sub * 9) / 100) : 0
        const total = sub + gst
        poTotals.set(o.key, total)
        const advance = o.advancePct ? Math.round((total * o.advancePct) / 100) : 0
        const id = poId(o.key)
        const due = o.sent ? plusDays(o.sent.at, TERMS_DAYS[o.terms] ?? 30) : null
        const status = o.cancelled ? 'cancelled' : !o.sent ? 'draft' : 'sent'   // a PO paid in full is closed below, by its payments
        const approvedBy = o.submitted && o.sent ? o.sent.by : null
        count(await client.execute({
          sql: `INSERT OR IGNORE INTO purchase_orders (id, project_id, vendor_id, number, status, title, subtotal_minor, gst_minor, total_minor, charges_gst, gst_rate, advance_kind, advance_value, advance_minor, terms, terms_text,
                expected_on, delivery_address, vendor_note, issuing_entity, created_by, created_at, updated_by, updated_at, submitted_by, submitted_at, approved_by, approved_at, sent_by, sent_at, due_on, vendor_token,
                vendor_viewed_at, vendor_answer, vendor_answer_note, vendor_answered_at, answer_via, answer_marked_by, cancelled_by, cancelled_at, cancel_reason)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,(SELECT issuing_entity FROM quotes WHERE id = ?),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [id, p.id, vid(o.vendor), o.number, status, o.title, sub, gst, total, o.gst ? 1 : 0, o.gst ? 9 : 0, o.advancePct ? 'pct' : 'none', o.advancePct ?? 0, advance, o.terms,
            o.expected ?? null, p.address, o.note ?? null, p.quote_id, o.created.by, o.created.at, o.created.by, o.created.at,
            o.submitted && !o.sent ? o.submitted.by : null, o.submitted && !o.sent ? o.submitted.at : null, approvedBy, approvedBy ? o.sent!.at : null, o.sent?.by ?? null, o.sent?.at ?? null, due, token(o.key),
            o.viewed ?? (o.answer?.via === 'link' ? o.answer.at : null), o.answer?.answer ?? null, o.answer?.note ?? null, o.answer?.at ?? null, o.answer?.via ?? null, o.answer?.by ?? null,
            o.cancelled?.by ?? null, o.cancelled?.at ?? null, o.cancelled?.reason ?? null],
        }))
        for (const [k, l] of lines.entries()) {
          await client.execute({ sql: `INSERT OR IGNORE INTO purchase_order_lines (id, po_id, position, description, category, qty, unit, unit_minor, amount_minor, quote_item_id, milestone_id) VALUES (?,?,?,?,?,?,?,?,?,?,NULL)`,
            args: [sid(id, `line:${k}`), id, k, l.description, l.category, l.qty, l.unit, l.unitMinor, Math.round(l.qty * l.unitMinor), l.quoteItemId] })
        }
        /* its trail */
        const vendor = vname(o.vendor)
        await ev(id, p, 'project_po_created', o.created.by, o.created.at, { id, title: o.number, vendor, to: money(total) })
        if (o.submitted) await ev(id, p, 'project_po_submitted', o.submitted.by, o.submitted.at, { id, title: o.number, vendor, to: money(total) })
        if (o.sent) await ev(id, p, 'project_po_sent', o.sent.by, o.sent.at, { id, title: o.number, vendor, to: money(total), due: due ? displayDate(new Date(due * 1000)) : undefined, ...(o.submitted ? { requester: NAMES[o.submitted.by] ?? 'Someone' } : {}) })
        if (o.answer) await ev(id, p, 'project_po_answered', o.answer.via === 'link' ? null : o.answer.by ?? null, o.answer.at, { id, title: o.number, vendor, answer: o.answer.answer, via: o.answer.via, note: o.answer.note ?? null })
        if (o.cancelled) await ev(id, p, 'project_po_cancelled', o.cancelled.by, o.cancelled.at, { id, title: o.number, vendor, reason: o.cancelled.reason })
        /* the bell: an approval answered for whoever submitted it; a vendor's changes for whoever made it; one waiting for the approvers */
        if (o.submitted && o.sent && o.submitted.by !== o.sent.by) await bell(id, o.submitted.by, 'po_approved', `Purchase order ${o.number} was approved and sent`, `${vendor} · ${money(total)}`, `/projects/${p.id}/money?open=${id}`, p.lead_id, o.sent.by, o.sent.at, true)
        if (o.answer && o.answer.via === 'link' && o.answer.answer !== 'accepted') await bell(id, o.created.by, 'po_answered', `${vendor} asked for changes to ${o.number}`, o.answer.note ?? null, `/projects/${p.id}/money?open=${id}`, p.lead_id, null, o.answer.at, false)
        if (o.submitted && !o.sent) for (const m of ['dane', 'huimin']) await bell(id, m, 'po_review', `Purchase order ${o.number} needs your approval`, `${vendor} · ${money(total)} · ${p.name}`, `/projects/${p.id}/money?open=${id}`, p.lead_id, o.submitted.by, o.submitted.at, false)
      }

      /* — supplier bills (two with their PDF, read when they were recorded) — */
      type B = { key: string; project: string | null; vendor: string; po?: string; ref: string; issued: number; due: number; lines: { d: string; q: number; u: number }[]; gst: boolean; by: string; at: number; file?: string; total?: number }
      const BILLS: B[] = [
        { key: 'sha-paint-bill', project: 'P-2025-001', vendor: 'colourpro', po: 'sha-paint', ref: 'CP-0388', issued: at(2026, 9, 15), due: at(2026, 9, 29), lines: [{ d: 'Painting, whole unit — two coats', q: 1, u: 150000 }], gst: true, by: 'sarah', at: at(2026, 9, 16, 10) },
        { key: 'ryan-floor-bill', project: 'P-2026-001', vendor: 'floorxpert', po: 'ryan-floor', ref: 'FX-5521', issued: at(2026, 9, 10), due: at(2026, 9, 24), lines: [], gst: true, by: 'michelle', at: at(2026, 9, 11, 9), total: 0 },
        { key: 'ryan-wood-bill', project: 'P-2026-001', vendor: 'woodcraft', po: 'ryan-wood', ref: 'WC-2391', issued: at(2026, 9, 25), due: at(2026, 10, 9), lines: [{ d: 'Kitchen carpentry, top and bottom cabinets — installed', q: 1, u: 420000 }, { d: 'Wardrobe, master bedroom — installed', q: 1, u: 280000 }], gst: true, by: 'michelle', at: at(2026, 9, 26, 9, 30), file: 'woodcraft-bill-WC-2391.pdf' },
        { key: 'ben-plumb-bill', project: 'P-2026-002', vendor: 'aquaflow', po: 'ben-plumb', ref: 'AF-7781', issued: at(2026, 9, 16), due: at(2026, 9, 30), lines: [{ d: 'Plumbing works, kitchen and bathrooms', q: 1, u: 140000 }], gst: false, by: 'germaine', at: at(2026, 9, 17, 11), file: 'aquaflow-bill-AF-7781.pdf' },
        { key: 'rent-oct', project: null, vendor: 'kallang', ref: 'KC-1009', issued: at(2026, 10, 1), due: at(2026, 10, 15), lines: [{ d: 'Studio space, October', q: 1, u: 200000 }], gst: true, by: 'huimin', at: at(2026, 10, 1, 9, 30) },
      ]
      for (const b of BILLS) {
        const p = b.project ? await proj(b.project) : null
        if (b.project && !p) continue
        /* Floor Xpert's bill is the whole PO; the others are their lines */
        const lineSum = b.lines.reduce((s, l) => s + Math.round(l.q * l.u), 0)
        const total = b.total === 0 && b.po ? poTotals.get(b.po) ?? 0 : lineSum + (b.gst ? Math.round((lineSum * 9) / 100) : 0)
        const gst = b.total === 0 && b.po ? Math.round((total * 9) / 109) : b.gst ? Math.round((lineSum * 9) / 100) : 0
        const sub = total - gst
        const id = billId(b.key)
        const read = b.file ? JSON.stringify(['reference', 'dueOn', 'issuedOn', 'subtotal', 'gst', 'total', 'lines', 'supplier']) : null
        count(await client.execute({ sql: `INSERT OR IGNORE INTO supplier_bills (id, project_id, vendor_id, po_id, reference, issued_on, due_on, subtotal_minor, gst_minor, total_minor, lines_json, note, read_from, read_fields, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?)`,
          args: [id, p?.id ?? null, vid(b.vendor), b.po ? poId(b.po) : null, b.ref, b.issued, b.due, sub, gst, total, b.lines.length ? JSON.stringify(b.lines.map((l, k) => ({ id: `r${k + 1}`, description: l.d, qty: l.q, unitMinor: l.u }))) : null, b.file ?? null, read, b.by, b.at, b.by, b.at] }))
        if (b.file) {
          const docId = sid(id, 'doc')
          const [haveDoc] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM cost_documents WHERE id = ?`, args: [docId] }))
          const file = path.join(process.cwd(), 'public', 'uat-files', b.file)
          if (!haveDoc && fs.existsSync(file)) {
            const bytes = fs.readFileSync(file)
            const data = `data:application/pdf;base64,${bytes.toString('base64')}`
            let thumb: string | null = null
            try {
              const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
              const { createCanvas } = await import('@napi-rs/canvas')
              const task = pdfjs.getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: `${path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'standard_fonts')}/`, verbosity: 0 })
              try {
                const doc = await task.promise
                const page = await doc.getPage(1)
                const base = page.getViewport({ scale: 1 })
                const viewport = page.getViewport({ scale: 480 / Math.max(1, base.width) })
                const canvas = createCanvas(Math.max(1, Math.round(viewport.width)), Math.max(1, Math.round(viewport.height)))
                const ctx = canvas.getContext('2d')
                ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
                await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise
                thumb = `data:image/jpeg;base64,${canvas.toBuffer('image/jpeg', 82).toString('base64')}`
              } finally { await task.destroy() }
            } catch { note(`R83: ${b.file}'s first page not drawn here — the bill shows its file without a picture`) }
            count(await client.execute({ sql: `INSERT OR IGNORE INTO cost_documents (id, record_kind, record_id, name, mime, size_bytes, data, thumb, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
              args: [docId, 'bill', id, b.file, 'application/pdf', bytes.length, data, thumb, b.by, b.at] }))
          }
        }
        if (p) await ev(id, p, 'project_bill_recorded', b.by, b.at, { id, title: b.ref, vendor: vname(b.vendor), to: money(total), po: b.po ? POS.find((x) => x.key === b.po)?.number ?? null : null, due: displayDate(new Date(b.due * 1000)) })
      }

      /* — payments out on POs and bills; a PO paid in full closes itself — */
      for (const o of POS) {
        const p = await proj(o.project)
        if (!p || !o.pays?.length) continue
        const total = poTotals.get(o.key) ?? 0
        let paid = 0
        for (const pay of o.pays) {
          const amount = pay.amount || (pay.advance ? Math.round((total * (o.advancePct ?? 0)) / 100) : total - paid)
          paid += amount
          const id = payId(pay.key)
          const closes = paid >= total
          count(await client.execute({ sql: `INSERT OR IGNORE INTO payments_out (id, kind, project_id, vendor_id, member_id, po_id, bill_id, expense_id, amount_minor, advance, paid_on, method, reference, note, created_by, created_at) VALUES (?,?,?,?,NULL,?,?,NULL,?,?,?,?,?,NULL,?,?)`,
            args: [id, pay.bill ? 'bill' : 'po', p.id, vid(o.vendor), poId(o.key), pay.bill ? billId(pay.bill) : null, amount, pay.advance ? 1 : 0, dayOf(pay.at), pay.method, pay.ref, pay.by, pay.at] }))
          const label = pay.bill ? `bill ${BILLS.find((b) => b.key === pay.bill)?.ref ?? ''}` : o.number
          await ev(id, p, 'project_payout_recorded', pay.by, pay.at, { id, title: label, vendor: vname(o.vendor), to: money(amount), method: pay.method === 'paynow' ? 'PayNow' : 'Bank transfer', po: closes ? o.number : null, kind: pay.bill ? 'bill' : 'po' })
          if (closes) await client.execute({ sql: `UPDATE purchase_orders SET status = 'closed', closed_at = ?, closed_by = ? WHERE id = ? AND status = 'sent'`, args: [pay.at, pay.by, poId(o.key)] })
        }
      }

      /* — expenses and claims — */
      type E = { key: string; project: string | null; by: string; at: number; spent: number; category: string; what: string; amount: number; gst: boolean; claim: string | null; status: 'pending' | 'approved'; reviewed?: { by: string; at: number }; vendor?: string; paidBack?: { by: string; at: number; method: string; ref: string } }
      const EXPENSES: E[] = [
        { key: 'sha-clean', project: 'P-2025-001', by: 'sarah', at: at(2026, 9, 24, 17), spent: at(2026, 9, 24), category: 'Labour', what: 'Post-renovation cleaning', amount: 28000, gst: true, claim: null, status: 'approved', reviewed: { by: 'dane', at: at(2026, 9, 24, 18) } },
        { key: 'ryan-boards', project: 'P-2026-001', by: 'michelle', at: at(2026, 8, 21, 18), spent: at(2026, 8, 21), category: 'Site supplies', what: 'Floor protection boards for the hacking', amount: 8640, gst: true, claim: 'michelle', status: 'approved', reviewed: { by: 'dane', at: at(2026, 8, 22, 9) } },
        { key: 'ryan-touchup', project: 'P-2026-001', by: 'michelle', at: at(2026, 9, 29, 17, 30), spent: at(2026, 9, 29), category: 'Materials', what: 'Carpentry touch-up materials', amount: 4580, gst: false, claim: null, status: 'approved', reviewed: { by: 'dane', at: at(2026, 9, 30, 9) }, vendor: 'woodcraft-dup' },
        { key: 'ben-grab', project: 'P-2026-002', by: 'germaine', at: at(2026, 10, 4, 19), spent: at(2026, 10, 4), category: 'Transport', what: 'Grab to site — tile selection with Benjamin', amount: 3850, gst: true, claim: 'germaine', status: 'pending' },
        { key: 'studio-software', project: null, by: 'dane', at: at(2026, 9, 5, 9), spent: at(2026, 9, 5), category: 'Software', what: 'Design software subscription — September', amount: 10900, gst: true, claim: null, status: 'approved', reviewed: { by: 'dane', at: at(2026, 9, 5, 9) } },
        { key: 'studio-courier', project: null, by: 'sarah', at: at(2026, 9, 17, 16), spent: at(2026, 9, 17), category: 'Transport', what: 'Courier for sample tiles to the studio', amount: 2400, gst: false, claim: 'sarah', status: 'approved', reviewed: { by: 'dane', at: at(2026, 9, 18, 10) }, paidBack: { by: 'huimin', at: at(2026, 9, 30, 11), method: 'paynow', ref: 'PayNow to Sarah' } },
      ]
      for (const x of EXPENSES) {
        const p = x.project ? await proj(x.project) : null
        if (x.project && !p) continue
        const id = sid('r83', `expense:${x.key}`)
        count(await client.execute({ sql: `INSERT OR IGNORE INTO expenses (id, project_id, vendor_id, category, description, amount_minor, gst_minor, spent_on, paid_by, claimant_id, status, review_note, reviewed_by, reviewed_at, note, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,NULL,?,?,?,?)`,
          args: [id, p?.id ?? null, x.vendor ? vid(x.vendor) : null, x.category, x.what, x.amount, x.gst ? Math.round((x.amount * 9) / 109) : 0, x.spent, x.claim ? 'member' : 'studio', x.claim, x.status, x.reviewed?.by ?? null, x.reviewed?.at ?? null, x.by, x.at, x.by, x.at] }))
        if (p) {
          await ev(id, p, 'project_expense_logged', x.by, x.at, { id, title: x.what, to: money(x.amount), category: x.category, claim: x.claim ? NAMES[x.claim] ?? null : null })
          if (x.status === 'approved' && x.reviewed && x.reviewed.by !== x.by) await ev(id, p, 'project_expense_approved', x.reviewed.by, x.reviewed.at, { id, title: x.what, to: money(x.amount) })
        }
        const href = p ? `/projects/${p.id}/money?open=${id}` : `/company/finance/expenses?open=${id}`
        if (x.status === 'pending') for (const m of ['dane', 'huimin']) await bell(id, m, 'expense_review', `${NAMES[x.by] ?? 'Someone'} logged an expense of ${money(x.amount)}`, `${x.what}${p ? ` · ${p.name}` : ' · Studio overhead'}`, href, p?.lead_id ?? null, x.by, x.at, false)
        if (x.status === 'approved' && x.reviewed && x.reviewed.by !== x.by) await bell(id, x.by, 'expense_answered', `Your expense “${x.what}” is approved`, money(x.amount), href, p?.lead_id ?? null, x.reviewed.by, x.reviewed.at, true)
        if (x.paidBack && x.claim) {
          const pid = payId(`claim:${x.key}`)
          count(await client.execute({ sql: `INSERT OR IGNORE INTO payments_out (id, kind, project_id, vendor_id, member_id, po_id, bill_id, expense_id, amount_minor, advance, paid_on, method, reference, note, created_by, created_at) VALUES (?,'claim',?,NULL,?,NULL,NULL,?,?,0,?,?,?,NULL,?,?)`,
            args: [pid, p?.id ?? null, x.claim, id, x.amount, dayOf(x.paidBack.at), x.paidBack.method, x.paidBack.ref, x.paidBack.by, x.paidBack.at] }))
          await bell(pid, x.claim, 'claim_paid', `${money(x.amount)} for “${x.what}” is paid back`, x.paidBack.method === 'paynow' ? 'PayNow' : 'Bank transfer', href, p?.lead_id ?? null, x.paidBack.by, x.paidBack.at, true)
          if (p) await ev(pid, p, 'project_payout_recorded', x.paidBack.by, x.paidBack.at, { id: pid, title: `“${x.what}”`, claim: NAMES[x.claim] ?? null, to: money(x.amount), method: x.paidBack.method === 'paynow' ? 'PayNow' : 'Bank transfer', kind: 'claim' })
        }
      }
      /* the rules a studio starts with (Settings › Finance › Costs) — written once, so the numbers carry on from PO-2026-009 */
      count(await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('cost_rules', ?, ?)`, args: [JSON.stringify({ poApproval: true, poLimitMinor: 500000, expenseApproval: true, terms: 'net30', numbering: { prefix: 'PO', year: true, next: 0, digits: 3 } }), at(2026, 7, 28, 9)] }))
      note(`${made} record(s) — vendors, purchase orders with their lines and trails, supplier bills, expenses and claims, payments out, the bell`)
    }
  }

  /* ── R84 · gaps build F2 — money out: the books (the owner's "build everything", 2026-10-07 — M-08; calls F2-Q1…Q16) ─────────────────────
     Commission and credit notes, told across the demo projects with their trail (REG-343). Profit, margin, the insights and every report are
     worked out from the records R68…R83 already hold — nothing of theirs is stored.
     - The studio's commission rule: 3% of what the client pays (before GST), from 1 Jan 2025 (Dane).
     - Benjamin Han: Germaine asked for 4% on 12 Aug ("I brought Benjamin in and run the site on my own"); Dane approved it on 14 Aug — a rule for
       her on that project from that day (the 7 Aug deposit keeps its 3%); Hui Min set the shares Germaine 70% · Dane 30%. Hui Min issued
       CN-2026-002 (S$1,090.00, GST S$90.00) against INV-2026-004 on 3 Oct: the feature wall paint left to the owners — Benjamin had paid that
       invoice in full, so S$1,090.00 waits to be refunded (the Money tab's "to refund" band; the refund is the demo's to record).
     - Ryan D'Souza: Michelle was paid S$300.00 of her commission on 31 Aug (PayNow); on 5 Oct she asked for 5% ("two variation orders and extra
       site visits") — open, on Dane's and Hui Min's bell.
     - Shalini Menon (completed): Sarah paid all her commission on 30 Sep; Dane issued CN-2026-001 (S$545.00, GST S$45.00) against INV-2026-007
       on 2 Oct — goodwill for the cabinet touch-up's two extra weeks — and, Shalini having paid in full, refunded it by PayNow on 3 Oct.
     Xero stays unconnected (the Accounting page's Connect is the demo). Idempotent: fixed ids (`sid`), INSERT OR IGNORE. */
  console.log('\nR84 the books — commission rules, an ask and its answer, shares, payouts, credit notes')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'credit_notes'`))[0]?.n
    if (has) {
      const at = (y: number, m: number, d: number, h = 0, mi = 0) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000)
      const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
      type P = { id: string; lead_id: string; name: string; number: string }
      const proj = async (n: string) => rows<P>(await client.execute({ sql: `SELECT id, lead_id, name, number FROM projects WHERE number = ? AND deleted_at IS NULL`, args: [n] }))[0] ?? null
      const ev = (seed: string, p: P, kind: string, actor: string | null, atSec: number, detail: Record<string, unknown>) =>
        client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [sid(seed, `r84:ev:${kind}`), p.lead_id, kind, actor, atSec, JSON.stringify({ name: p.name, ...detail }), p.id] })
      const bell = (seed: string, member: string, kind: string, title: string, body: string | null, href: string, leadId: string | null, actor: string | null, atSec: number, read: boolean) =>
        client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,'in_app',?,?,?)`,
          args: [sid(seed, `r84:bell:${kind}:${member}`), member, kind, title, body, href, leadId, actor, atSec, read ? atSec + 2 * H : null] })
      const NAMES: Record<string, string> = Object.fromEntries(rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM members`)).map((m) => [m.id, m.name]))
      let made = 0
      const count = (r: { rowsAffected: number }) => { made += r.rowsAffected }
      const ben = await proj('P-2026-002'), ryan = await proj('P-2026-001'), shalini = await proj('P-2025-001')

      /* — the studio's rule — */
      count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_rules (id, member_id, project_id, basis, rate_bp, fixed_minor, from_day, ended_at, ended_by, request_id, created_by, created_at) VALUES (?,NULL,NULL,'payments',300,0,?,NULL,NULL,NULL,'dane',?)`,
        args: [sid('r84', 'rule:studio'), at(2025, 1, 1), at(2025, 1, 1, 9)] }))

      /* — what a sole member earned at 3% on a project's counted contract payments (commissionsOf's sum, for the payouts below) — */
      const earned3 = async (p: P) => rows<{ amount: number }>(await client.execute({ sql: `SELECT y.amount_minor AS amount FROM project_payments y JOIN project_invoices i ON i.id = y.invoice_id WHERE y.project_id = ? AND y.status = 'confirmed' AND i.status = 'sent' AND i.stage_ref NOT LIKE 'extra:%'`, args: [p.id] }))
        .reduce((s, r) => s + Math.round(Math.round((r.amount * 100) / 109) * 0.03), 0)
      const payout = async (seed: string, p: P, member: string, amount: number, paidOn: number, method: string, ref: string, by: string, read: boolean) => {
        const id = sid('r84', `payout:${seed}`)
        count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_payouts (id, member_id, project_id, amount_minor, paid_on, method, reference, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,NULL,?,?)`,
          args: [id, member, p.id, amount, paidOn, method, ref, by, paidOn + 10 * H] }))
        const who = NAMES[member] ?? 'A member'
        await ev(`r84:${seed}`, p, 'project_commission_paid', by, paidOn + 10 * H, { id, memberId: member, title: who, to: money(amount), method: method === 'paynow' ? 'PayNow' : 'Bank transfer' })
        await bell(`r84:${seed}`, member, 'commission_paid', `${money(amount)} commission paid to you`, `For ${p.name}`, '/company/finance/commissions', p.lead_id, by, paidOn + 10 * H, read)
      }

      /* — Benjamin Han: Germaine's ask, Dane's yes, the shares — */
      if (ben) {
        const ask = sid('r84', 'ask:germaine-ben')
        count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_requests (id, project_id, member_id, basis, rate_bp, fixed_minor, reason, status, answered_by, answered_at, answer_note, approved_rate_bp, approved_fixed_minor, created_at) VALUES (?,?,'germaine','payments',400,0,?,'approved','dane',?,?,NULL,NULL,?)`,
          args: [ask, ben.id, 'I brought Benjamin in and run the site on my own', at(2026, 8, 14, 10), 'Agreed — from today, on this one', at(2026, 8, 12, 15)] }))
        count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_rules (id, member_id, project_id, basis, rate_bp, fixed_minor, from_day, ended_at, ended_by, request_id, created_by, created_at) VALUES (?,'germaine',?,'payments',400,0,?,NULL,NULL,?,'dane',?)`,
          args: [sid('r84', 'rule:germaine-ben'), ben.id, at(2026, 8, 14), ask, at(2026, 8, 14, 10)] }))
        for (const [m, bp] of [['germaine', 7000], ['dane', 3000]] as const) {
          count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_shares (id, project_id, member_id, share_bp, updated_by, updated_at) VALUES (?,?,?,?,'huimin',?)`, args: [sid('r84', `share:ben:${m}`), ben.id, m, bp, at(2026, 8, 14, 10, 30)] }))
        }
        await bell('r84:ask:germaine-ben', 'dane', 'commission_asked', 'Germaine asks for 4% of what the client pays', `On ${ben.name}: I brought Benjamin in and run the site on my own`, `/company/finance/commissions?open=${ask}`, ben.lead_id, 'germaine', at(2026, 8, 12, 15), true)
        await bell('r84:ask:germaine-ben', 'germaine', 'commission_answered', `Approved: 4% of what the client pays on ${ben.name}`, 'Agreed — from today, on this one', `/company/finance/commissions?open=${ask}`, ben.lead_id, 'dane', at(2026, 8, 14, 10), true)
      } else note('R84: P-2026-002 not found — Benjamin Han’s commission skipped')

      /* — Ryan D'Souza: part of Michelle's paid; her open ask — */
      if (ryan) {
        await payout('michelle-ryan', ryan, 'michelle', Math.min(30000, await earned3(ryan)), at(2026, 8, 31), 'paynow', 'PN-0831-MICHELLE', 'huimin', true)
        const ask = sid('r84', 'ask:michelle-ryan')
        count(await client.execute({ sql: `INSERT OR IGNORE INTO commission_requests (id, project_id, member_id, basis, rate_bp, fixed_minor, reason, status, created_at) VALUES (?,?,'michelle','payments',500,0,?,'open',?)`,
          args: [ask, ryan.id, 'Two variation orders and extra site visits on this one', at(2026, 10, 5, 11)] }))
        for (const m of ['dane', 'huimin']) await bell('r84:ask:michelle-ryan', m, 'commission_asked', 'Michelle asks for 5% of what the client pays', `On ${ryan.name}: Two variation orders and extra site visits on this one`, `/company/finance/commissions?open=${ask}`, ryan.lead_id, 'michelle', at(2026, 10, 5, 11), false)
      } else note('R84: P-2026-001 not found — Ryan D’Souza’s commission skipped')

      /* — Shalini Menon: Sarah paid in full — */
      if (shalini) await payout('sarah-shalini', shalini, 'sarah', await earned3(shalini), at(2026, 9, 30), 'bank_transfer', 'COMM-0930-SARAH', 'dane', true)

      /* — credit notes: each against its sent invoice, its GST at the invoice's rate, filed in Files › Payments, its line, its bell rows — */
      type CN = { seed: string; p: P | null; invoice: string; number: string; amount: number; reason: string; by: string; atSec: number; team: string[]; refund: { on: number; method: string; ref: string } | null }
      const CNS: CN[] = [
        { seed: 'cn:shalini', p: shalini, invoice: 'INV-2026-007', number: 'CN-2026-001', amount: 54500, reason: 'Goodwill — the cabinet touch-up took two extra weeks', by: 'dane', atSec: at(2026, 10, 2, 10), team: ['sarah'],
          refund: { on: at(2026, 10, 3), method: 'paynow', ref: 'PN-1003-SHALINI' } },
        { seed: 'cn:ben', p: ben, invoice: 'INV-2026-004', number: 'CN-2026-002', amount: 109000, reason: 'Work left out — the feature wall paint, left to the owners', by: 'huimin', atSec: at(2026, 10, 3, 15), team: ['dane', 'germaine'], refund: null },
      ]
      for (const c of CNS) {
        if (!c.p) { note(`R84: ${c.number}'s project not found — skipped`); continue }
        const [inv] = rows<{ id: string; amount: number; gst: number; status: string }>(await client.execute({ sql: `SELECT id, amount_minor AS amount, gst_minor AS gst, status FROM project_invoices WHERE project_id = ? AND number = ?`, args: [c.p.id, c.invoice] }))
        if (!inv || inv.status !== 'sent') { note(`R84: ${c.invoice} is not a sent invoice on ${c.p.name} — ${c.number} skipped`); continue }
        const id = sid('r84', c.seed)
        const gst = inv.amount > 0 && inv.gst > 0 ? Math.round((c.amount * inv.gst) / inv.amount) : 0
        /* its entry in Files › Payments (the receipts' way — the entry opens the paper) */
        const [folder] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Payments' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [c.p.lead_id] }))
        const folderId = folder?.id ?? sid('r84', `${c.seed}:folder`)
        if (!folder) count(await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, updated_at) VALUES (?,?,'folder','Payments',NULL,?,NULL,?,?)`, args: [folderId, c.p.lead_id, c.atSec, c.by, c.atSec] }))
        const fileId = sid('r84', `${c.seed}:file`)
        count(await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,?,NULL,'application/pdf',?)`,
          args: [fileId, c.p.lead_id, `${c.number} · Credit note · ${c.invoice}.pdf`, c.atSec, folderId, c.by, c.atSec] }))
        count(await client.execute({ sql: `INSERT OR IGNORE INTO credit_notes (id, project_id, invoice_id, number, reason, amount_minor, gst_minor, status, issued_by, issued_at, refund_minor, refunded_on, refund_method, refund_reference, refunded_by, file_id, created_at) VALUES (?,?,?,?,?,?,?,'issued',?,?,?,?,?,?,?,?,?)`,
          args: [id, c.p.id, inv.id, c.number, c.reason, c.amount, gst, c.by, c.atSec, c.refund ? c.amount : null, c.refund?.on ?? null, c.refund?.method ?? null, c.refund?.ref ?? null, c.refund ? c.by : null, fileId, c.atSec] }))
        await ev(`r84:${c.seed}`, c.p, 'project_credit_issued', c.by, c.atSec, { id, number: c.number, title: c.invoice, to: money(c.amount), reason: c.reason })
        if (c.refund) await ev(`r84:${c.seed}:refund`, c.p, 'project_credit_refunded', c.by, c.refund.on + 11 * H, { id, number: c.number, title: c.invoice, to: money(c.amount), method: c.refund.method === 'paynow' ? 'PayNow' : 'Bank transfer' })
        for (const m of c.team) if (m !== c.by) await bell(`r84:${c.seed}`, m, 'credit_issued', `Credit note ${c.number} — ${money(c.amount)}`, `On ${c.invoice} for ${c.p.name.split(' — ')[1] ?? c.p.name}: ${c.reason}`, `/projects/${c.p.id}/money?open=${id}`, c.p.lead_id, c.by, c.atSec, false)
      }
      console.log(`  ${made} books row(s) written`)
    } else note('R84: credit_notes not in this database — run the migrations first')
  }

  /* ── R85 · gaps build G — floor-plan mark-up with the client (the owner's "build everything", 2026-10-07; Q-19's "later"; g-read.md G-Q1…G-Q18) ──
     The floor plan on the two running projects whose clients use the portal, every state with its trail (REG-343):
     - Benjamin Han (P-2026-002, Germaine): the existing layout (14 Aug) and the proposed one (22 Aug, the main plan), each a picture in Files ›
       Floor plans with its bytes (public/projects/demo/, drawn by scripts/demo-floor-plans.mjs); the proposal's scale taught from its printed
       11,950 mm; the proposal marked up — the kitchen wall to hack (a cross-hatch and a callout), the floor to lay (a diagonal zone on Tiling and
       flooring), the master's wardrobe (a box on Carpentry), the points (eleven stamps), the living room measured, a site photo of the kitchen as it
       was (21 Aug), a note on Studio only that became Germaine's task; Benjamin's two pins — the TV wall (answered and resolved) and one more socket
       by the bed (4 Oct, still waiting for an answer); his confirmation of the proposed layout (27 Aug, in the portal); the bell rows and the lines
       each step writes;
     - Ryan D’Souza (P-2026-001, Michelle): his unit's layout (10 Aug), the study's built-in desk, its lights and the TV point; Ryan's pin about a
       sliding study door, with Michelle's answer — no confirmation yet;
     - each client's floor plan read up to their last look at the portal (their bell's floor-plan rows read).
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE. (invented copy: every mark's and comment's words) */
  console.log('\nR85 floor plan — plans, marks, conversations, a confirmation')
  {
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('project_floor_plans', 'floor_plan_marks', 'floor_plan_comments', 'floor_plan_confirmations', 'floor_plan_pictures', 'floor_plan_seen')`))[0]?.n ?? 0)
    if (have === 6) {
      let made = 0
      const fs = await import('node:fs')
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
      const sec = (t: number) => Math.floor(t / 1000)
      const pub = (rel: string, mime: string) => `data:${mime};base64,${fs.readFileSync(path.join(process.cwd(), 'public', rel)).toString('base64')}`
      const bytesOf = (dataUrl: string) => Buffer.byteLength(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
      const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
      const folderOf = async (lead: string) => rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND parent_id IS NULL AND deleted_at IS NULL AND lower(name) IN ('floor plans','floor plan','floorplans') LIMIT 1`, args: [lead] }))[0]?.id ?? null
      const linkOf = async (lead: string) => rows<{ id: string; ho: string; last: number | null }>(await client.execute({ sql: `SELECT id, homeowner_id AS ho, last_opened_at AS last FROM homeowner_lead_links WHERE lead_id = ? AND invited_at IS NOT NULL AND withdrawn_at IS NULL LIMIT 1`, args: [lead] }))[0] ?? null
      const ev = (id: string, lead: string, pid: string, kind: string, actor: string | null, atMs: number, detail: Record<string, unknown>) =>
        exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, [id, lead, kind, actor, sec(atMs), JSON.stringify(detail), pid])
      const bell = (id: string, member: string, kind: string, title: string, body: string, href: string, lead: string, atMs: number, read: boolean) =>
        exec(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,'in_app',NULL,?,?)`, [id, member, kind, title, body, href, lead, sec(atMs), read ? sec(atMs) + 2 * 3600 : null])
      /** a picture filed in Files › Floor plans with its bytes, as an upload keeps it */
      const fileOf = async (id: string, lead: string, folder: string, name: string, data: string, mime: string, owner: string | null, atMs: number) => {
        await exec(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'image',?,?,?,?,?,?,?,?)`,
          [id, lead, name, `/files/img/${id}`, sec(atMs), folder, owner, bytesOf(data), mime, sec(atMs)])
        await exec(`INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, [id, data])
      }
      type Shape = { points: { x: number; y: number }[]; text?: string; symbol?: string; pattern?: string; photos?: string[]; takenOn?: string; color?: string; weight?: number }
      const W = 1600, Hh = 1150
      const at = (x: number, y: number) => ({ x: Math.round((x / W) * 10000) / 10000, y: Math.round((y / Hh) * 10000) / 10000 })
      const mark = (id: string, plan: string, pid: string, tool: string, shape: Shape, layer: string, kind: 'studio' | 'client', author: string | null, name: string, atMs: number, extra: { status?: string; resolvedAt?: number; resolvedBy?: string; taskId?: string } = {}) =>
        exec(`INSERT OR IGNORE INTO floor_plan_marks (id, plan_id, project_id, tool, shape, layer, author_kind, author_id, author_name, status, resolved_at, resolved_by, task_id, variation_id, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?)`,
          [id, plan, pid, tool, JSON.stringify(shape), layer, kind, author, name, extra.status ?? 'open', extra.resolvedAt ?? null, extra.resolvedBy ?? null, extra.taskId ?? null, atMs, extra.resolvedAt ?? atMs])
      const comment = (id: string, markId: string, body: string, kind: 'studio' | 'client', author: string | null, name: string, atMs: number) =>
        exec(`INSERT OR IGNORE INTO floor_plan_comments (id, mark_id, body, photos, author_kind, author_id, author_name, created_at) VALUES (?,?,?,NULL,?,?,?,?)`, [id, markId, body, kind, author, name, atMs])
      const planRow = (id: string, pid: string, lead: string, name: string, fileId: string, main: boolean, by: string, byName: string, atMs: number, scale: number | null, scaleAt: number | null) =>
        exec(`INSERT OR IGNORE INTO project_floor_plans (id, project_id, lead_id, name, file_id, width, height, is_main, scale_mm_per_px, scale_set_by, scale_set_at, added_by_kind, added_by, added_by_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'studio',?,?,?,?)`,
          [id, pid, lead, name, fileId, W, Hh, main ? 1 : 0, scale, scale ? by : null, scaleAt, by, byName, atMs, scaleAt ?? atMs])
      const picture = (planId: string, data: string) => exec(`INSERT OR IGNORE INTO floor_plan_pictures (plan_id, data) VALUES (?, ?)`, [planId, data])
      const seen = (linkId: string, atMs: number) => exec(`INSERT OR IGNORE INTO floor_plan_seen (link_id, seen_at) VALUES (?, ?)`, [linkId, atMs])

      /* 1 · Benjamin Han — the existing layout and the proposed one, marked up with him; he confirmed the proposal */
      const ben = await projectOf('Benjamin Han')
      const benFolder = ben ? await folderOf(ben.lead) : null
      const benLink = ben ? await linkOf(ben.lead) : null
      if (ben && benFolder) {
        const g = 'germaine', gName = 'Germaine', client = 'Benjamin Han'
        const existingFile = sid(ben.pid, 'fp:file:existing'), proposedFile = sid(ben.pid, 'fp:file:proposed')
        const existing = sid(ben.pid, 'fp:plan:existing'), proposed = sid(ben.pid, 'fp:plan:proposed')
        const tExisting = ms(2026, 7, 14, 10, 0), tProposed = ms(2026, 7, 22, 11, 0), tScale = ms(2026, 7, 22, 11, 10)
        const pngExisting = pub('projects/demo/floor-plan-existing.png', 'image/png'), pngProposed = pub('projects/demo/floor-plan-proposed.png', 'image/png')
        await fileOf(existingFile, ben.lead, benFolder, 'Existing layout — SkyOasis @ Dawson.png', pngExisting, 'image/png', g, tExisting)
        await fileOf(proposedFile, ben.lead, benFolder, 'Proposed layout — SkyOasis @ Dawson.png', pngProposed, 'image/png', g, tProposed)
        /* the scale taught from the printed 11,950 along the top: 1,330 px of picture */
        const scale = 11950 / 1330
        await planRow(existing, ben.pid, ben.lead, 'Existing layout', existingFile, false, g, gName, tExisting, null, null)
        await planRow(proposed, ben.pid, ben.lead, 'Proposed layout', proposedFile, true, g, gName, tProposed, scale, tScale)
        await picture(existing, pngExisting); await picture(proposed, pngProposed)
        await ev(sid(existing, 'ev:added'), ben.lead, ben.pid, 'project_floor_plan_added', g, tExisting, { name: ben.pname, number: ben.number, id: existing, title: 'Existing layout', by: 'studio' })
        await ev(sid(proposed, 'ev:added'), ben.lead, ben.pid, 'project_floor_plan_added', g, tProposed, { name: ben.pname, number: ben.number, id: proposed, title: 'Proposed layout', by: 'studio', again: true })
        await ev(sid(proposed, 'ev:scale'), ben.lead, ben.pid, 'project_floor_plan_scale', g, tScale, { name: ben.pname, number: ben.number, id: proposed, title: 'Proposed layout', scale: '11.95 m' })
        /* Germaine's marks on the proposal, the afternoon it went up */
        const m = (k: string) => sid(proposed, `fp:mark:${k}`)
        const t0 = ms(2026, 7, 22, 14, 0), min = 60_000
        await mark(m('hack'), proposed, ben.pid, 'hatch', { points: [at(1062, 478), at(1098, 1022)], pattern: 'cross' }, 'general', 'studio', g, gName, t0)
        await mark(m('hack-callout'), proposed, ben.pid, 'callout', { points: [at(1080, 760), at(960, 900)], text: 'Hack the kitchen wall — the kitchen opens to the living room' }, 'general', 'studio', g, gName, t0 + min)
        await mark(m('floor'), proposed, ben.pid, 'hatch', { points: [at(152, 482), at(968, 1018)], pattern: 'diagonal' }, 'tiling', 'studio', g, gName, t0 + 2 * min)
        await mark(m('floor-text'), proposed, ben.pid, 'text', { points: [at(200, 990)], text: 'SPC vinyl, oak, throughout' }, 'tiling', 'studio', g, gName, t0 + 3 * min)
        await mark(m('wardrobe'), proposed, ben.pid, 'rect', { points: [at(608, 104), at(672, 458)] }, 'carpentry', 'studio', g, gName, t0 + 4 * min)
        await mark(m('wardrobe-text'), proposed, ben.pid, 'text', { points: [at(690, 200)], text: 'Wardrobe, full height' }, 'carpentry', 'studio', g, gName, t0 + 5 * min)
        const stamps: [string, string, number, number][] = [
          ['tv-socket', 'socket_13a_double', 172, 690], ['tv-data', 'data_tv', 172, 760], ['live-down-1', 'downlight', 420, 640], ['live-down-2', 'downlight', 700, 640],
          ['live-cove', 'cove_light', 560, 520], ['door-switch', 'switch', 820, 990], ['master-ac', 'aircon_point', 800, 112], ['master-socket', 'socket_13a', 930, 400],
          ['island-water', 'water_point', 1240, 830], ['kitchen-trap', 'floor_trap', 1420, 980], ['study-socket', 'socket_13a_double', 160, 420],
        ]
        for (const [i, [k, sym, x, y]] of stamps.entries()) {
          await mark(m(k), proposed, ben.pid, 'symbol', { points: [at(x, y)], symbol: sym }, sym === 'water_point' || sym === 'floor_trap' ? 'plumbing' : sym === 'downlight' || sym === 'cove_light' ? 'lighting' : 'electrical', 'studio', g, gName, t0 + (10 + i) * min)
        }
        await mark(m('measure'), proposed, ben.pid, 'dimension', { points: [at(152, 600), at(968, 600)] }, 'general', 'studio', g, gName, t0 + 25 * min)
        /* a note the client never sees — it became Germaine's task */
        const beamTask = sid(proposed, 'fp:task:beam'), beamTitle = 'Check the beam depth before the false ceiling'
        await mark(m('beam'), proposed, ben.pid, 'pin', { points: [at(560, 560)], text: 'Check the beam depth before the false ceiling — the cove light runs under it' }, 'studio_only', 'studio', g, gName, t0 + 26 * min, { taskId: beamTask })
        await exec(`INSERT OR IGNORE INTO lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at) VALUES (?,?,?,'General',NULL,0,?,?,?,?,?)`,
          [beamTask, ben.lead, beamTitle, sec(t0 + 27 * min), g, 'From the floor plan “Proposed layout” — Pin S1.', sec(t0 + 28 * min), sec(t0 + 27 * min)])
        await exec(`INSERT INTO task_assignees (task_id, member_id) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND member_id = ?)`, [beamTask, g, beamTask, g])
        await ev(sid(proposed, 'ev:task:beam'), ben.lead, ben.pid, 'project_floor_plan_task', g, t0 + 27 * min, { name: ben.pname, number: ben.number, id: proposed, title: 'Proposed layout', mark: 'Pin S1', task: beamTitle })
        /* the kitchen as it was, the day work began */
        const photo = sid(proposed, 'fp:photo:kitchen')
        const kitchen = pub('visualizer/samples/kitchen/original.jpg', 'image/jpeg')
        await fileOf(photo, ben.lead, benFolder, 'Kitchen before the wall comes down.jpg', kitchen, 'image/jpeg', g, ms(2026, 7, 21, 15, 0))
        await mark(m('kitchen-photo'), proposed, ben.pid, 'photo', { points: [at(1260, 700)], text: 'The kitchen before the wall comes down', photos: [photo], takenOn: '2026-08-21' }, 'general', 'studio', g, gName, ms(2026, 7, 22, 15, 0))
        /* Benjamin's first pin — answered, resolved */
        const tv = m('client-tv'), tTv = ms(2026, 7, 25, 21, 15)
        await mark(tv, proposed, ben.pid, 'pin', { points: [at(220, 725)], text: 'Can the TV wall take a 75-inch TV?' }, 'client', 'client', benLink?.ho ?? null, client, tTv, { status: 'resolved', resolvedAt: ms(2026, 7, 26, 9, 41), resolvedBy: gName })
        await comment(sid(tv, 'c1'), tv, 'Yes — we’ll put plywood backing behind the feature wall, and the TV point is marked beside it.', 'studio', g, gName, ms(2026, 7, 26, 9, 40))
        await ev(sid(tv, 'ev:resolved'), ben.lead, ben.pid, 'project_floor_plan_resolved', g, ms(2026, 7, 26, 9, 41), { name: ben.pname, number: ben.number, id: proposed, title: 'Proposed layout', mark: 'Pin 2' })
        for (const member of ['dane', g]) await bell(sid(tv, `bell:${member}`), member, 'floor_plan_client', `${client} dropped a pin on the floor plan`, `Proposed layout · ${ben.pname}`, `/projects/${ben.pid}/floor-plan?plan=${proposed}&mark=${tv}`, ben.lead, tTv, true)
        /* his confirmation, in the portal */
        const confirmAt = ms(2026, 7, 27, 20, 5)
        await exec(`INSERT OR IGNORE INTO floor_plan_confirmations (id, plan_id, project_id, homeowner_id, name, phone, note, method, marks_at, created_at) VALUES (?,?,?,?,?,(SELECT phone FROM homeowner_profiles WHERE id = ?),?,'portal',?,?)`,
          [sid(proposed, 'fp:confirm:1'), proposed, ben.pid, benLink?.ho ?? null, client, benLink?.ho ?? '', 'Happy with this — go ahead.', t0 + 25 * min, confirmAt])
        await ev(sid(proposed, 'ev:confirm:1'), ben.lead, ben.pid, 'project_floor_plan_confirmed', null, confirmAt, { name: ben.pname, number: ben.number, id: proposed, title: 'Proposed layout', note: 'Happy with this — go ahead.', by: 'client', person: client })
        for (const member of ['dane', g, 'huimin']) await bell(sid(proposed, `bell:confirm:${member}`), member, 'floor_plan_confirmed', `${client} confirmed the layout`, 'Proposed layout · “Happy with this — go ahead.”', `/projects/${ben.pid}/floor-plan?plan=${proposed}`, ben.lead, confirmAt, true)
        /* his second pin — still waiting for an answer */
        const socket = m('client-socket'), tSocket = ms(2026, 9, 4, 20, 30)
        await mark(socket, proposed, ben.pid, 'pin', { points: [at(720, 330)], text: 'Could we have one more socket on this side of the bed?' }, 'client', 'client', benLink?.ho ?? null, client, tSocket)
        for (const member of ['dane', g]) await bell(sid(socket, `bell:${member}`), member, 'floor_plan_client', `${client} dropped a pin on the floor plan`, `Proposed layout · ${ben.pname}`, `/projects/${ben.pid}/floor-plan?plan=${proposed}&mark=${socket}`, ben.lead, tSocket, member === 'dane')
        if (benLink?.last) await seen(benLink.id, benLink.last * 1000)
      }

      /* 2 · Ryan D’Souza — his unit's layout, one question answered, nothing confirmed yet */
      const ryan = await projectOf('Ryan D’Souza')
      const ryanFolder = ryan ? await folderOf(ryan.lead) : null
      const ryanLink = ryan ? await linkOf(ryan.lead) : null
      if (ryan && ryanFolder) {
        const mi = 'michelle', miName = 'Michelle', client = 'Ryan D’Souza'
        const file = sid(ryan.pid, 'fp:file:unit'), plan = sid(ryan.pid, 'fp:plan:unit'), tPlan = ms(2026, 7, 10, 11, 0)
        const png = pub('projects/demo/floor-plan-ec.png', 'image/png')
        await fileOf(file, ryan.lead, ryanFolder, 'Unit layout — executive condo.png', png, 'image/png', mi, tPlan)
        await planRow(plan, ryan.pid, ryan.lead, 'Unit layout', file, true, mi, miName, tPlan, null, null)
        await picture(plan, png)
        await ev(sid(plan, 'ev:added'), ryan.lead, ryan.pid, 'project_floor_plan_added', mi, tPlan, { name: ryan.pname, number: ryan.number, id: plan, title: 'Unit layout', by: 'studio' })
        const m = (k: string) => sid(plan, `fp:mark:${k}`), t0 = ms(2026, 7, 10, 11, 30), min = 60_000
        await mark(m('desk'), plan, ryan.pid, 'rect', { points: [at(180, 130), at(300, 500)] }, 'carpentry', 'studio', mi, miName, t0)
        await mark(m('desk-text'), plan, ryan.pid, 'text', { points: [at(320, 470)], text: 'Built-in desk and shelves' }, 'carpentry', 'studio', mi, miName, t0 + min)
        await mark(m('study-down-1'), plan, ryan.pid, 'symbol', { points: [at(400, 260)], symbol: 'downlight' }, 'lighting', 'studio', mi, miName, t0 + 2 * min)
        await mark(m('study-down-2'), plan, ryan.pid, 'symbol', { points: [at(560, 260)], symbol: 'downlight' }, 'lighting', 'studio', mi, miName, t0 + 3 * min)
        await mark(m('tv'), plan, ryan.pid, 'symbol', { points: [at(180, 780)], symbol: 'data_tv' }, 'electrical', 'studio', mi, miName, t0 + 4 * min)
        const door = m('client-door'), tDoor = ms(2026, 7, 12, 19, 40)
        await mark(door, plan, ryan.pid, 'pin', { points: [at(645, 545)], text: 'Can the study door slide instead of swinging?' }, 'client', 'client', ryanLink?.ho ?? null, client, tDoor)
        await comment(sid(door, 'c1'), door, 'Yes — a pocket sliding door fits in that wall. We’ll show it on the next drawing.', 'studio', mi, miName, ms(2026, 7, 13, 10, 5))
        await bell(sid(door, 'bell:michelle'), mi, 'floor_plan_client', `${client} dropped a pin on the floor plan`, `Unit layout · ${ryan.pname}`, `/projects/${ryan.pid}/floor-plan?plan=${plan}&mark=${door}`, ryan.lead, tDoor, true)
        if (ryanLink?.last) await seen(ryanLink.id, ryanLink.last * 1000)
      }
      note(`${made} record(s) — two clients’ floor plans, their marks and conversations, a confirmation`)
    }
  }

  /* ── R86 · gaps build H — tickets, Messages, the messages clients get, the About page (the owner's "build everything", 2026-10-07; Q-41 · Q-43 ·
     Q-47's "later"; h-read.md H-Q1…H-Q27) ─────────────────────────────────────────────────────────────────────────────────────────────────────
     Every state with its trail (REG-343):
     - Benjamin Han (P-2026-002; Germaine and Dane): T-2026-001 "Kitchen drawer doesn’t close fully" — reported on his portal 28 Sep with a photo,
       Germaine's answer 29 Sep, resolved 2 Oct with her closing line, closed by Benjamin 3 Oct; T-2026-004 "Water stain under the kitchen sink" —
       reported by Mei Ling 5 Oct with a photo, given to Germaine, her internal note, her answer 6 Oct, Benjamin's 7 Oct and Germaine's last word —
       in progress, the client's turn; their conversation in Messages (30 Sep → 7 Oct), the last a question from Benjamin the team hasn't read;
       the messages they got by themselves (the outbox: the answers on their issues, the resolve);
     - Ryan D’Souza (P-2026-001; Michelle): T-2026-002 "Study door scrapes the floor" — 1 Oct, Michelle's answer 2 Oct, read on his portal; a short
       conversation, all read;
     - Shalini Menon (P-2025-001, completed; Sarah): T-2026-003 "Grout in the shower is cracking" — after handover, 2 Oct, Sarah's answer 3 Oct —
       new on her portal (she last looked 26 Sep);
     - the About page: the year, the story, two awards, three photos; Dane, Germaine, Michelle and Sarah on Our team with a title and two lines;
     - the ticket categories as Settings starts them; an email on the client profiles that had none (Benjamin, Ryan, Mei Ling) — the messages
       clients get go to it.
     No ticket waits on the studio and none is escalated, so no project is raised in Needs attention by the demo (the probe raises and answers
     its own). The team's bell rows are read; Benjamin's newest message is the one unread conversation (the rail's Chat count).
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE; the settings rows written once. (invented copy: every ticket's, message's and the story's words) */
  console.log('\nR86 tickets, Messages, client messages, the About page')
  {
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('project_tickets', 'ticket_replies', 'project_messages', 'chat_reads', 'studio_pictures')`))[0]?.n ?? 0)
    if (have === 5) {
      let made = 0
      const fs = await import('node:fs')
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
      const sec = (t: number) => Math.floor(t / 1000)
      const pub = (rel: string) => `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), 'public', rel)).toString('base64')}`
      const bytesOf = (dataUrl: string) => Buffer.byteLength(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
      const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname FROM projects p JOIN leads l ON l.id = p.lead_id WHERE (l.name = ? OR l.name LIKE ?) AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name, `${name.split(' ')[0]}%`] }))[0] ?? null
      const homeOf = async (lead: string) => rows<{ ho: string; name: string; email: string | null }>(await client.execute({ sql: `SELECT k.homeowner_id AS ho, h.name, h.email FROM homeowner_lead_links k JOIN homeowner_profiles h ON h.id = k.homeowner_id WHERE k.lead_id = ? AND k.invited_at IS NOT NULL AND k.withdrawn_at IS NULL LIMIT 1`, args: [lead] }))[0] ?? null
      const houseOf = async (lead: string) => rows<{ ho: string; name: string; email: string | null }>(await client.execute({ sql: `SELECT x.homeowner_id AS ho, h.name, h.email FROM homeowner_household_links x JOIN homeowner_profiles h ON h.id = x.homeowner_id WHERE x.lead_id = ? AND x.invited_at IS NOT NULL AND x.withdrawn_at IS NULL AND x.removed_at IS NULL`, args: [lead] }))
      const folder = async (lead: string, name: 'Tickets' | 'Messages', atMs: number) => {
        const [had] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND parent_id IS NULL AND deleted_at IS NULL AND name = ? LIMIT 1`, args: [lead, name] }))
        if (had) return had.id
        const id = sid(lead, `h:folder:${name}`)
        await exec(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder',?,NULL,?,NULL,NULL,NULL,NULL,?)`, [id, lead, name, sec(atMs), sec(atMs)])
        return id
      }
      const photo = async (id: string, lead: string, parent: string, name: string, rel: string, atMs: number) => {
        const data = pub(rel)
        await exec(`INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'image',?,?,?,?,NULL,?,'image/jpeg',?)`,
          [id, lead, name, `/files/img/${id}`, sec(atMs), parent, bytesOf(data), sec(atMs)])
        await exec(`INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, [id, data])
        return id
      }
      type T = { id: string; pid: string; lead: string; number: string; category: string; subject: string; body: string; photos: string[]; status: string; assignee: string | null
        raisedKind: 'client' | 'studio'; raisedBy: string | null; raisedName: string; at: number; resolvedAt?: number; resolvedBy?: string; closedAt?: number; closedBy?: string; lastClient: number | null; lastStudio: number | null; updated: number }
      const ticket = (t: T) => exec(`INSERT OR IGNORE INTO project_tickets (id, project_id, lead_id, number, category, subject, body, photos, status, priority, assignee_id, raised_kind, raised_by_id, raised_by_name, escalated_at, escalated_by, escalate_note, resolved_at, resolved_by, closed_at, closed_by, last_client_at, last_studio_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,'normal',?,?,?,?,NULL,NULL,NULL,?,?,?,?,?,?,?,?)`,
        [t.id, t.pid, t.lead, t.number, t.category, t.subject, t.body, t.photos.length ? JSON.stringify(t.photos) : null, t.status, t.assignee, t.raisedKind, t.raisedBy, t.raisedName, t.resolvedAt ?? null, t.resolvedBy ?? null, t.closedAt ?? null, t.closedBy ?? null, t.lastClient, t.lastStudio, t.at, t.updated])
      const reply = (id: string, ticketId: string, kind: 'client' | 'studio', author: string | null, name: string, body: string, atMs: number, o: { internal?: boolean; event?: string; photos?: string[] } = {}) =>
        exec(`INSERT OR IGNORE INTO ticket_replies (id, ticket_id, author_kind, author_id, author_name, body, photos, internal, event, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [id, ticketId, kind, author, name, body, o.photos?.length ? JSON.stringify(o.photos) : null, o.internal ? 1 : 0, o.event ?? null, atMs])
      const ev = (id: string, lead: string, pid: string, kind: string, actor: string | null, atMs: number, detail: Record<string, unknown>) =>
        exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, [id, lead, kind, actor, sec(atMs), JSON.stringify(detail), pid])
      const bell = (id: string, member: string, kind: string, title: string, body: string, href: string, lead: string, atMs: number) =>
        exec(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,'in_app',NULL,?,?)`, [id, member, kind, title, body, href, lead, sec(atMs), sec(atMs) + 1800])
      const msg = (id: string, pid: string, lead: string, kind: 'client' | 'studio', author: string | null, name: string, body: string, atMs: number) =>
        exec(`INSERT OR IGNORE INTO project_messages (id, project_id, lead_id, author_kind, author_id, author_name, body, photos, created_at, deleted_at) VALUES (?,?,?,?,?,?,?,NULL,?,NULL)`, [id, pid, lead, kind, author, name, body, atMs])
      const readTo = (kind: 'member' | 'client', reader: string, pid: string, atMs: number) => exec(`INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) VALUES (?,?,?,?)`, [kind, reader, pid, atMs])
      const bellRead = (ho: string, key: string, atMs: number) => exec(`INSERT OR IGNORE INTO portal_bell_reads (homeowner_id, row_key, read_at) VALUES (?,?,?)`, [ho, key, sec(atMs)])
      const out = (key: string, event: string, channel: string, toName: string, toAddress: string | null, subject: string | null, body: string, href: string, lead: string, atMs: number) =>
        exec(`INSERT OR IGNORE INTO notification_outbox (id, key, notification_id, event, channel, member_id, to_name, to_address, subject, body, href, lead_id, status, error, provider, created_at) VALUES (?,?,NULL,?,?,NULL,?,?,?,?,?,?,?,NULL,'outbox',?)`,
          [sid(key, 'h:out'), key, event, channel, toName, toAddress, subject, body, href, lead, toAddress ? 'sent' : 'no_address', sec(atMs)])
      const site = 'https://app.openmaison.sg/my/demo-studio'
      /* the clients' emails — the messages they get go to them */
      await exec(`UPDATE homeowner_profiles SET email = 'benjamin.han@gmail.com' WHERE email IS NULL AND name = 'Benjamin Han'`, [])
      await exec(`UPDATE homeowner_profiles SET email = 'ryan.dsouza@outlook.com' WHERE email IS NULL AND name LIKE 'Ryan D%'`, [])
      await exec(`UPDATE homeowner_profiles SET email = 'meiling.han@gmail.com' WHERE email IS NULL AND name = 'Mei Ling Han'`, [])

      /* 1 · Benjamin Han — two issues and the conversation */
      const ben = await projectOf('Benjamin Han')
      const benHome = ben ? await homeOf(ben.lead) : null
      const meiLing = ben ? (await houseOf(ben.lead))[0] ?? null : null
      if (ben && benHome) {
        const g = 'germaine', gName = 'Germaine', client = 'Benjamin Han', mei = meiLing?.name ?? 'Mei Ling Han'
        const tFolder = await folder(ben.lead, 'Tickets', ms(2026, 8, 28, 20, 10))
        /* T-2026-001 — the drawer: reported, answered, resolved, closed */
        const t1 = sid(ben.pid, 'h:ticket:drawer'), t1at = ms(2026, 8, 28, 20, 14)
        const p1 = await photo(sid(t1, 'photo'), ben.lead, tFolder, 'Photo from Benjamin Han 2026-09-28.jpg', 'visualizer/samples/kitchen/original.jpg', t1at)
        await ticket({ id: t1, pid: ben.pid, lead: ben.lead, number: 'T-2026-001', category: 'Quality of work', subject: 'Kitchen drawer doesn’t close fully', body: 'The second drawer under the hob stops about a finger short of closing. It started after the countertop went in.', photos: [p1], status: 'closed', assignee: g,
          raisedKind: 'client', raisedBy: benHome.ho, raisedName: client, at: t1at, resolvedAt: ms(2026, 9, 2, 16, 40), resolvedBy: gName, closedAt: ms(2026, 9, 3, 9, 5), closedBy: client, lastClient: ms(2026, 9, 3, 9, 5), lastStudio: ms(2026, 9, 2, 16, 40), updated: ms(2026, 9, 3, 9, 5) })
        await reply(sid(t1, 'r:assigned'), t1, 'studio', g, gName, gName, ms(2026, 8, 29, 9, 2), { internal: true, event: 'assigned' })
        const r1 = sid(t1, 'r:1'); await reply(r1, t1, 'studio', g, gName, 'Thanks Benjamin — the runner probably caught on the new top. Our carpenter is on site Thursday and will reset it.', ms(2026, 8, 29, 9, 5))
        const r2 = sid(t1, 'r:2'); await reply(r2, t1, 'studio', g, gName, 'The runner is reset and the drawer closes fully now. Tell us here if it slips again.', ms(2026, 9, 2, 16, 39))
        const r3 = sid(t1, 'r:resolved'); await reply(r3, t1, 'studio', g, gName, '', ms(2026, 9, 2, 16, 40), { event: 'resolved' })
        await reply(sid(t1, 'r:closed'), t1, 'client', benHome.ho, client, '', ms(2026, 9, 3, 9, 5), { event: 'closed' })
        const d1 = { name: ben.pname, number: ben.number, id: t1, title: 'Kitchen drawer doesn’t close fully', kind: 'T-2026-001' }
        await ev(sid(t1, 'ev:raised'), ben.lead, ben.pid, 'project_ticket_raised', null, t1at, { ...d1, by: 'client', person: client })
        await ev(sid(t1, 'ev:assigned'), ben.lead, ben.pid, 'project_ticket_assigned', g, ms(2026, 8, 29, 9, 2), { ...d1, to: gName })
        await ev(sid(t1, 'ev:resolved'), ben.lead, ben.pid, 'project_ticket_resolved', g, ms(2026, 9, 2, 16, 40), d1)
        await ev(sid(t1, 'ev:closed'), ben.lead, ben.pid, 'project_ticket_closed', null, ms(2026, 9, 3, 9, 5), { ...d1, by: 'client', person: client })
        for (const m of ['germaine', 'dane']) await bell(sid(t1, `bell:raised:${m}`), m, 'ticket_raised', `${client} reported an issue`, `T-2026-001 · Kitchen drawer doesn’t close fully · ${ben.pname}`, `/projects/${ben.pid}/tickets?open=${t1}`, ben.lead, t1at)
        await bell(sid(t1, 'bell:closed'), g, 'ticket_client', `${client} closed T-2026-001`, `Kitchen drawer doesn’t close fully · ${ben.pname}`, `/projects/${ben.pid}/tickets?open=${t1}`, ben.lead, ms(2026, 9, 3, 9, 5))
        for (const [k, r, at, words] of [['r1', r1, ms(2026, 8, 29, 9, 5), 'the runner probably caught on the new top — our carpenter is on site Thursday and will reset it.'], ['r2', r3, ms(2026, 9, 2, 16, 40), 'the runner is reset and the drawer closes fully now.']] as const) {
          await out(`c:client_issue_answered:${r}:${benHome.ho}:email`, 'client_issue_answered', 'email', client, 'benjamin.han@gmail.com', 'Your issue T-2026-001: Kitchen drawer doesn’t close fully',
            `Hi Benjamin,\n\nGermaine answered your issue T-2026-001 — “Kitchen drawer doesn’t close fully”:\n\n${words.charAt(0).toUpperCase()}${words.slice(1)}\n\nReply or close it on your page:\n${site}/issues?open=${t1}\n\nDemo Studio`, `${site}/issues?open=${t1}`, ben.lead, at)
          void k
        }
        /* T-2026-004 — the water stain: Mei Ling's report, Germaine's note and answer, Benjamin's word, Germaine's last word */
        const t4 = sid(ben.pid, 'h:ticket:sink'), t4at = ms(2026, 9, 5, 21, 30)
        const p4 = await photo(sid(t4, 'photo'), ben.lead, tFolder, `Photo from ${mei} 2026-10-05.jpg`, 'visualizer/samples/kitchen/original.jpg', t4at)
        await ticket({ id: t4, pid: ben.pid, lead: ben.lead, number: 'T-2026-004', category: 'Damage or breakage', subject: 'Water stain under the kitchen sink', body: 'There is a damp patch on the cabinet floor under the sink, and the board is swelling a little at the front edge.', photos: [p4], status: 'in_progress', assignee: g,
          raisedKind: 'client', raisedBy: meiLing?.ho ?? benHome.ho, raisedName: mei, at: t4at, lastClient: ms(2026, 9, 7, 8, 15), lastStudio: ms(2026, 9, 7, 10, 20), updated: ms(2026, 9, 7, 10, 20) })
        await reply(sid(t4, 'r:assigned'), t4, 'studio', g, gName, gName, ms(2026, 9, 6, 8, 40), { internal: true, event: 'assigned' })
        await reply(sid(t4, 'r:note'), t4, 'studio', g, gName, 'Asked Ah Seng (plumbing) to check the trap and the tap connector first — likely the connector we fitted.', ms(2026, 9, 6, 8, 45), { internal: true })
        const q1 = sid(t4, 'r:1'); await reply(q1, t4, 'studio', g, gName, 'Thanks for the photo, Mei Ling. Please keep the cabinet open to dry — our plumber can come on Thursday morning. Does 9am suit you?', ms(2026, 9, 6, 9, 0))
        await reply(sid(t4, 'r:2'), t4, 'client', benHome.ho, client, 'Thursday 9am works. The side gate code is 4821.', ms(2026, 9, 7, 8, 15))
        const q2 = sid(t4, 'r:3'); await reply(q2, t4, 'studio', g, gName, 'Booked — Ah Seng is coming at 9am on Thursday. We’ll replace the cabinet board if it doesn’t dry flat.', ms(2026, 9, 7, 10, 20))
        const d4 = { name: ben.pname, number: ben.number, id: t4, title: 'Water stain under the kitchen sink', kind: 'T-2026-004' }
        await ev(sid(t4, 'ev:raised'), ben.lead, ben.pid, 'project_ticket_raised', null, t4at, { ...d4, by: 'client', person: mei })
        await ev(sid(t4, 'ev:assigned'), ben.lead, ben.pid, 'project_ticket_assigned', g, ms(2026, 9, 6, 8, 40), { ...d4, to: gName })
        /* the household read Germaine's answers on their portal (their bell's issue rows read) */
        for (const who of [benHome.ho, ...(meiLing ? [meiLing.ho] : [])]) { await bellRead(who, `issue:${q1}`, ms(2026, 9, 6, 20, 0)); await bellRead(who, `issue:${q2}`, ms(2026, 9, 7, 20, 0)) }
        for (const m of ['germaine', 'dane']) await bell(sid(t4, `bell:raised:${m}`), m, 'ticket_raised', `${mei} reported an issue`, `T-2026-004 · Water stain under the kitchen sink · ${ben.pname}`, `/projects/${ben.pid}/tickets?open=${t4}`, ben.lead, t4at)
        await bell(sid(t4, 'bell:reply'), g, 'ticket_client', `${client} replied on T-2026-004`, `Water stain under the kitchen sink · ${ben.pname}`, `/projects/${ben.pid}/tickets?open=${t4}`, ben.lead, ms(2026, 9, 7, 8, 15))
        for (const [r, at, words] of [[q1, ms(2026, 9, 6, 9, 0), 'Thanks for the photo, Mei Ling. Please keep the cabinet open to dry — our plumber can come on Thursday morning. Does 9am suit you?'], [q2, ms(2026, 9, 7, 10, 20), 'Booked — Ah Seng is coming at 9am on Thursday. We’ll replace the cabinet board if it doesn’t dry flat.']] as const) {
          for (const who of [{ ho: benHome.ho, name: client, first: 'Benjamin', email: 'benjamin.han@gmail.com' }, ...(meiLing ? [{ ho: meiLing.ho, name: mei, first: 'Mei Ling', email: 'meiling.han@gmail.com' }] : [])]) {
            await out(`c:client_issue_answered:${r}:${who.ho}:email`, 'client_issue_answered', 'email', who.name, who.email, 'Your issue T-2026-004: Water stain under the kitchen sink',
              `Hi ${who.first},\n\nGermaine answered your issue T-2026-004 — “Water stain under the kitchen sink”:\n\n${words}\n\nReply or close it on your page:\n${site}/issues?open=${t4}\n\nDemo Studio`, `${site}/issues?open=${t4}`, ben.lead, at)
          }
        }
        /* the conversation — the last a question from Benjamin the team hasn't read */
        const chat: [string, 'client' | 'studio', string | null, string, string, number][] = [
          ['c1', 'studio', g, gName, 'Hi Benjamin and Mei Ling — the countertop goes in on Thursday. It will be noisy from 9 to 12.', ms(2026, 8, 30, 18, 2)],
          ['c2', 'client', benHome.ho, client, 'Thanks Germaine. Can the installer use the service lift? The main lift is being serviced that week.', ms(2026, 8, 30, 19, 40)],
          ['c3', 'studio', g, gName, 'Yes — I’ve booked the service lift from 9 to 11 with the management office.', ms(2026, 9, 1, 9, 10)],
          ['c4', 'client', meiLing?.ho ?? benHome.ho, mei, 'The countertop looks lovely. Will the sealant around the sink be white or clear?', ms(2026, 9, 3, 20, 5)],
          ['c5', 'studio', 'dane', 'Dane', 'Clear, so it stays invisible against the quartz. Germaine will check it at Thursday’s visit.', ms(2026, 9, 4, 10, 30)],
          ['c6', 'client', benHome.ho, client, 'One more thing — can we add a socket inside the tall cabinet for the coffee machine?', ms(2026, 9, 7, 21, 15)],
        ]
        for (const [k, kind, author, name, body, at] of chat) await msg(sid(ben.pid, `h:msg:${k}`), ben.pid, ben.lead, kind, author, name, body, at)
        await readTo('member', g, ben.pid, ms(2026, 9, 4, 11, 0)); await readTo('member', 'dane', ben.pid, ms(2026, 9, 4, 10, 31))
        await readTo('client', benHome.ho, ben.pid, ms(2026, 9, 7, 21, 15)); if (meiLing) await readTo('client', meiLing.ho, ben.pid, ms(2026, 9, 4, 12, 0))
        await bell(sid(ben.pid, 'h:bell:chat'), g, 'chat_message', `${client} sent a message`, `Can the installer use the service lift? … · ${ben.pname}`, `/projects/${ben.pid}/messages`, ben.lead, ms(2026, 8, 30, 19, 40))
      }

      /* 2 · Ryan D’Souza — the study door, answered; a short conversation, all read */
      const ryan = await projectOf('Ryan D’Souza')
      const ryanHome = ryan ? await homeOf(ryan.lead) : null
      if (ryan && ryanHome) {
        const mi = 'michelle', miName = 'Michelle', client = 'Ryan D’Souza'
        const tFolder = await folder(ryan.lead, 'Tickets', ms(2026, 9, 1, 19, 0))
        const t2 = sid(ryan.pid, 'h:ticket:door'), t2at = ms(2026, 9, 1, 19, 5)
        const p2 = await photo(sid(t2, 'photo'), ryan.lead, tFolder, 'Photo from Ryan D’Souza 2026-10-01.jpg', 'visualizer/samples/bedroom/original.jpg', t2at)
        await ticket({ id: t2, pid: ryan.pid, lead: ryan.lead, number: 'T-2026-002', category: 'Quality of work', subject: 'Study door scrapes the floor', body: 'The new study door drags on the floor for the last bit before it closes and leaves a mark on the vinyl.', photos: [p2], status: 'in_progress', assignee: mi,
          raisedKind: 'client', raisedBy: ryanHome.ho, raisedName: client, at: t2at, lastClient: t2at, lastStudio: ms(2026, 9, 2, 11, 30), updated: ms(2026, 9, 2, 11, 30) })
        const r = sid(t2, 'r:1'); await reply(r, t2, 'studio', mi, miName, 'Sorry about that, Ryan — the floor rose a little after the vinyl went down. We’ll plane the door at Monday’s visit; it takes about twenty minutes.', ms(2026, 9, 2, 11, 30))
        const d2 = { name: ryan.pname, number: ryan.number, id: t2, title: 'Study door scrapes the floor', kind: 'T-2026-002' }
        await ev(sid(t2, 'ev:raised'), ryan.lead, ryan.pid, 'project_ticket_raised', null, t2at, { ...d2, by: 'client', person: client })
        await bell(sid(t2, 'bell:raised'), mi, 'ticket_raised', `${client} reported an issue`, `T-2026-002 · Study door scrapes the floor · ${ryan.pname}`, `/projects/${ryan.pid}/tickets?open=${t2}`, ryan.lead, t2at)
        await bellRead(ryanHome.ho, `issue:${r}`, ms(2026, 9, 3, 9, 30))   // he read it on his portal on 3 Oct
        await out(`c:client_issue_answered:${r}:${ryanHome.ho}:email`, 'client_issue_answered', 'email', client, 'ryan.dsouza@outlook.com', 'Your issue T-2026-002: Study door scrapes the floor',
          `Hi Ryan,\n\nMichelle answered your issue T-2026-002 — “Study door scrapes the floor”:\n\nSorry about that, Ryan — the floor rose a little after the vinyl went down. We’ll plane the door at Monday’s visit; it takes about twenty minutes.\n\nReply or close it on your page:\n${site}/issues?open=${t2}\n\nDemo Studio`, `${site}/issues?open=${t2}`, ryan.lead, ms(2026, 9, 2, 11, 30))
        const chat: [string, 'client' | 'studio', string | null, string, string, number][] = [
          ['c1', 'client', ryanHome.ho, client, 'Hi Michelle, is it okay if we start moving books into the study this weekend?', ms(2026, 9, 2, 20, 10)],
          ['c2', 'studio', mi, miName, 'Yes, the shelves are fully cured. Keep the heaviest boxes on the lower shelves for the first week.', ms(2026, 9, 3, 9, 15)],
          ['c3', 'client', ryanHome.ho, client, 'Great, thank you!', ms(2026, 9, 3, 9, 40)],
        ]
        for (const [k, kind, author, name, body, at] of chat) await msg(sid(ryan.pid, `h:msg:${k}`), ryan.pid, ryan.lead, kind, author, name, body, at)
        await readTo('member', mi, ryan.pid, ms(2026, 9, 3, 10, 0)); await readTo('member', 'dane', ryan.pid, ms(2026, 9, 3, 10, 0))
        await readTo('client', ryanHome.ho, ryan.pid, ms(2026, 9, 3, 9, 40))
      }

      /* 3 · Shalini Menon — after handover: the shower grout, answered under the warranty */
      const sha = await projectOf('Shalini Menon')
      const shaHome = sha ? await homeOf(sha.lead) : null
      if (sha && shaHome) {
        const s = 'sarah', sName = 'Sarah', client = 'Shalini Menon'
        const t3 = sid(sha.pid, 'h:ticket:grout'), t3at = ms(2026, 9, 2, 14, 20)
        await ticket({ id: t3, pid: sha.pid, lead: sha.lead, number: 'T-2026-003', category: 'Quality of work', subject: 'Grout in the shower is cracking', body: 'Two lines of grout in the master shower have cracked near the drain. The tiles themselves look fine.', photos: [], status: 'in_progress', assignee: s,
          raisedKind: 'client', raisedBy: shaHome.ho, raisedName: client, at: t3at, lastClient: t3at, lastStudio: ms(2026, 9, 3, 10, 5), updated: ms(2026, 9, 3, 10, 5) })
        const r = sid(t3, 'r:1'); await reply(r, t3, 'studio', s, sName, 'Thanks Shalini — that’s covered by our 12-month workmanship warranty. I’ll come by on Saturday morning to regrout it. Is 10am okay?', ms(2026, 9, 3, 10, 5))
        const d3 = { name: sha.pname, number: sha.number, id: t3, title: 'Grout in the shower is cracking', kind: 'T-2026-003' }
        await ev(sid(t3, 'ev:raised'), sha.lead, sha.pid, 'project_ticket_raised', null, t3at, { ...d3, by: 'client', person: client })
        await bell(sid(t3, 'bell:raised'), s, 'ticket_raised', `${client} reported an issue`, `T-2026-003 · Grout in the shower is cracking · ${sha.pname}`, `/projects/${sha.pid}/tickets?open=${t3}`, sha.lead, t3at)
        await out(`c:client_issue_answered:${r}:${shaHome.ho}:email`, 'client_issue_answered', 'email', client, shaHome.email ?? 'shalini.menon@gmail.com', 'Your issue T-2026-003: Grout in the shower is cracking',
          `Hi Shalini,\n\nSarah answered your issue T-2026-003 — “Grout in the shower is cracking”:\n\nThanks Shalini — that’s covered by our 12-month workmanship warranty. I’ll come by on Saturday morning to regrout it. Is 10am okay?\n\nReply or close it on your page:\n${site}/issues?open=${t3}\n\nDemo Studio`, `${site}/issues?open=${t3}`, sha.lead, ms(2026, 9, 3, 10, 5))
      }

      /* 4 · the About page — the story, the year, the awards, three photos; four members on Our team */
      await exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('studio_about', ?, ?)`, [JSON.stringify({
        year: 2014,
        story: '<p>Demo Studio began in 2014 with one HDB kitchen in Tampines and a promise to the family who lived there: no surprises on the bill, and a home that still works ten years on.</p><p>We are a small team of designers who see every project through from the first measurement to the handover — and after it. You will always know who is looking after your home, what happens next and what it costs.</p><ul><li>One designer from start to finish</li><li>Every change agreed in writing before it is built</li><li>A 12-month workmanship warranty on every project</li></ul>',
        awards: [{ id: 'aw-qanvast-2025', name: 'Qanvast Top Studio', year: 2025 }, { id: 'aw-casetrust', name: 'CaseTrust accredited renovation business', year: 2019 }],
      }), sec(ms(2026, 8, 20, 10, 0))])
      const aboutPhotos: [string, string, string][] = [['living', 'visualizer/samples/living-room/japandi.jpg', 'A Japandi living room in Bishan'], ['kitchen', 'visualizer/samples/kitchen/scandinavian.jpg', 'A Scandinavian kitchen in Punggol'], ['bedroom', 'visualizer/samples/bedroom/japandi.jpg', 'A calm master bedroom in Clementi']]
      for (const [i, [k, rel, caption]] of aboutPhotos.entries()) {
        if (!fs.existsSync(path.join(process.cwd(), 'public', rel))) continue
        await exec(`INSERT OR IGNORE INTO studio_pictures (id, kind, member_id, data, caption, position, created_at, deleted_at) VALUES (?,'about',NULL,?,?,?,?,NULL)`, [sid('about', `h:photo:${k}`), pub(rel), caption, i, ms(2026, 8, 20, 10, i)])
      }
      const team: [string, string, string][] = [
        ['dane', 'Founder and principal designer', 'Started the studio in 2014. Still measures every new home himself.'],
        ['germaine', 'Senior designer', 'Kitchens and storage that make small flats feel bigger. Ten years with the studio.'],
        ['michelle', 'Designer', 'Calm, warm rooms in natural materials — and a schedule that holds.'],
        ['sarah', 'Designer', 'Looks after our handovers and the warranty visits that come after.'],
      ]
      for (const [id, title, bio] of team) await exec(`UPDATE members SET portal_shown = 1, portal_title = ?, portal_bio = ? WHERE id = ? AND portal_title IS NULL`, [title, bio, id])
      /* the ticket categories as Settings starts them */
      await exec(`INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('ticket_categories', ?, ?)`, [JSON.stringify(['Quality of work', 'Timeline', 'Communication', 'Safety', 'Damage or breakage', 'Site cleanliness', 'Vendor or supplier', 'Other'].map((name) => ({ name }))), sec(ms(2026, 7, 1, 9, 0))])
      note(`${made} record(s) — four tickets with their threads and photos, two conversations, the messages clients got, the About page`)
    }
  }

  /* ── R87 · gaps build I — workload, compliance and AI on projects (the owner's "build everything", 2026-10-07; i-read.md I-Q1…I-Q18) ──
     Every state the new screens show, with its trail (REG-343):
     - Capacity (I-Q3): Michelle carries two running projects and is set to two (Full); Germaine is set to three (Room for 1 more); everyone
       else runs to the studio's default (4, no record).
     - Compliance (I-Q10): each running project's checklist answered as its works went — Ryan's condo (Michelle, its design phase in late July,
       its execution items as the works ran), Benjamin's HDB flat (Germaine and Dane, in August and September), Aisha's HDB flat (Michelle, in
       September — the aircon installer, HDB's electrical permit and the insurer's renewal still to do), Shalini's completed BTO flat (Sarah, every item answered by her
       handover); each answer its `project_compliance_*` line, by who and when.
     - Starter tasks (I-Q11): Marcus's condo (P-2026-004, made 2 Oct) started with its ten tasks for Germaine; the MCST approval and the
       contractor check are done (6 Oct) — each task done with its item, and both lines.
     Idempotent: fixed ids (`sid`), INSERT OR IGNORE; capacities set only while unset. (invented copy: none — the items' words are 1.0's list) */
  console.log('\nR87 workload, compliance — capacities, checklists answered, a project’s starter tasks')
  {
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'project_compliance'`))[0]?.n ?? 0)
    const cols = rows<{ name: string }>(await client.execute(`PRAGMA table_info(members)`)).map((c) => c.name)
    if (have === 1 && cols.includes('project_capacity')) {
      let made = 0
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 10, min = 0) => new Date(y, m, d, h, min).getTime()
      const { SG_COMPLIANCE } = await import('@/lib/compliance/sg-checklist')
      const { complianceKindOf, starterItems } = await import('@/lib/compliance/model')
      /* capacities: only while unset, so a studio's own numbers stay */
      await exec(`UPDATE members SET project_capacity = 2 WHERE id = 'michelle' AND project_capacity IS NULL`, [])
      await exec(`UPDATE members SET project_capacity = 3 WHERE id = 'germaine' AND project_capacity IS NULL`, [])
      type P = { pid: string; lead: string; number: string; pname: string; ptype: string }
      const proj = async (number: string): Promise<P | null> => rows<P>(await client.execute({ sql: `SELECT p.id AS pid, p.lead_id AS lead, p.number, p.name AS pname, l.property_type AS ptype FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.number = ? AND p.deleted_at IS NULL`, args: [number] }))[0] ?? null
      const item = (id: string) => SG_COMPLIANCE.find((i) => i.id === id)!
      /** One answer and its line, by `by` at `at` (ms). */
      const answer = async (p: P, id: string, state: 'done' | 'not_needed', by: string, at: number) => {
        const it = item(id)
        await exec(`INSERT OR IGNORE INTO project_compliance (id, project_id, item_id, state, by, at) VALUES (?, ?, ?, ?, ?, ?)`, [sid(p.pid, `pc:${id}`), p.pid, id, state, by, at])
        await exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [sid(p.pid, `pc:${id}:ev`), p.lead, p.pid, state === 'done' ? 'project_compliance_done' : 'project_compliance_not_needed', by, Math.floor(at / 1000), JSON.stringify({ item: id, title: it.title, name: p.pname, number: p.number })])
      }
      /** A phase answered in a run of days: the listed ones not needed, the rest done, one every few hours from `from`. */
      const run = async (p: P, ids: string[], notNeeded: string[], by: string | ((id: string) => string), from: number, stepH = 5) => {
        for (const [i, id] of ids.entries()) await answer(p, id, notNeeded.includes(id) ? 'not_needed' : 'done', typeof by === 'string' ? by : by(id), from + i * stepH * 3_600_000)
      }
      const of = (kind: 'hdb' | 'condo', phase: 'design' | 'execution' | 'handover') => SG_COMPLIANCE.filter((i) => i.kinds.includes(kind) && i.phase === phase).map((i) => i.id)

      const ryan = await proj('P-2026-001')
      if (ryan) {
        await run(ryan, of('condo', 'design'), ['ENGAGE_PE_CONDO_STRUCTURAL', 'ENGAGE_LGSW', 'CASETRUST_ACCREDITATION'], 'michelle', ms(2026, 6, 28, 10))
        await run(ryan, ['CONDO_RENO_HOURS', 'CONDO_COMMON_AREA', 'LEW_ALL_ELECTRICAL_WORKS', 'PUB_PLUMBER_ALL_WORKS', 'WASTE_NEA_LICENSED_COLLECTOR', 'GAS_SUPPLY_TERMINATION'], ['GAS_SUPPLY_TERMINATION'], 'michelle', ms(2026, 7, 10, 9), 30)
      }
      const ben = await proj('P-2026-002')
      if (ben) {
        await run(ben, of('hdb', 'design'), ['ENGAGE_LGSW', 'HDB_BTO_WET_AREA_RESTRICTION', 'HDB_WINDOW_AWC'], (id) => (id === 'CASETRUST_ACCREDITATION' || id === 'BIZSAFE_CERTIFICATION' ? 'dane' : 'germaine'), ms(2026, 7, 10, 10))
        await run(ben, ['HDB_RENO_HOURS', 'HDB_COMMON_AREA', 'WASTE_NEA_LICENSED_COLLECTOR', 'GAS_SUPPLY_TERMINATION', 'LEW_ALL_ELECTRICAL_WORKS', 'HDB_WATERPROOFING'], ['GAS_SUPPLY_TERMINATION'], 'germaine', ms(2026, 7, 21, 9), 60)
      }
      const aisha = await proj('P-2026-003')
      if (aisha) {
        const open = ['ENGAGE_BCA_AIRCON_INSTALLER', 'HDB_ELECTRICAL_PERMIT', 'PUBLIC_LIABILITY_INSURANCE']   // still to do — the aircon goes in later; the insurer's renewal is awaited
        await run(aisha, of('hdb', 'design').filter((x) => !open.includes(x)), ['ENGAGE_LGSW', 'HDB_BTO_WET_AREA_RESTRICTION', 'HDB_WINDOW_AWC', 'CASETRUST_ACCREDITATION'], 'michelle', ms(2026, 8, 7, 10))
        await run(aisha, ['HDB_RENO_HOURS', 'HDB_COMMON_AREA'], [], 'michelle', ms(2026, 8, 18, 9), 24)
      }
      const shalini = await proj('P-2025-001')
      if (shalini) {
        await run(shalini, of('hdb', 'design'), ['ENGAGE_QP_WALL_DEMOLITION', 'HDB_WALL_HACKING_APPROVAL', 'ENGAGE_LGSW', 'HDB_WINDOW_AWC'], 'sarah', ms(2026, 6, 6, 10))
        await run(shalini, of('hdb', 'execution'), ['GAS_SUPPLY_TERMINATION', 'HDB_FALSE_CEILING'], 'sarah', ms(2026, 7, 10, 9), 40)
        await run(shalini, of('hdb', 'handover'), [], 'sarah', ms(2026, 8, 28, 15), 2)
      }
      /* Marcus's condo: its ten starter tasks for Germaine, made with the project (2 Oct), two of them done with their items (6 Oct) */
      const marcus = await proj('P-2026-004')
      if (marcus && complianceKindOf(marcus.ptype) === 'condo') {
        const created = rows<{ at: number }>(await client.execute({ sql: `SELECT created_at AS at FROM projects WHERE id = ?`, args: [marcus.pid] }))[0]?.at ?? Math.floor(ms(2026, 9, 2, 12, 50) / 1000)
        const team = rows<{ id: string }>(await client.execute({ sql: `SELECT member_id AS id FROM lead_assignees WHERE lead_id = ?`, args: [marcus.lead] })).map((r) => r.id)
        const items = starterItems('condo')
        const doneIds = ['MCST_RENO_APPROVAL', 'VERIFY_CONDO_CONTRACTOR']
        for (const [i, it] of items.entries()) {
          const tid = sid(marcus.pid, `pc-task:${it.id}`)
          const at = created + 1 + i   // made just after the project, in the list's order
          const done = doneIds.includes(it.id)
          await exec(`INSERT OR IGNORE INTO lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, description, seen_at, updated_at, compliance_item) VALUES (?, ?, ?, 'General', NULL, ?, ?, 'germaine', ?, ?, ?, ?)`,
            [tid, marcus.lead, it.title, done ? 1 : 0, at, it.about, at, done ? Math.floor(ms(2026, 9, 6, 11, 0) / 1000) + i : at, it.id])
          for (const m of team) await exec(`INSERT INTO task_assignees (task_id, member_id) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND member_id = ?)`, [tid, m, tid, m])
          if (done) {
            const t = ms(2026, 9, 6, 11, 0) + i * 60_000
            await exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, NULL, 'task_completed', 'germaine', ?, ?)`, [sid(tid, 'ev:done'), marcus.lead, Math.floor(t / 1000), JSON.stringify({ id: tid, title: it.title })])
            await answer(marcus, it.id, 'done', 'germaine', t)
          }
        }
        await exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'project_compliance_tasks', NULL, ?, ?)`,
          [sid(marcus.pid, 'pc-tasks:ev'), marcus.lead, marcus.pid, created, JSON.stringify({ n: items.length, name: 'a condo' })])
      }
      note(`${made} record(s) — capacities, four checklists answered, Marcus's starter tasks`)
    }
  }

  /* ── R88 · gaps build J — the 3-D Space Planner (the owner's "build everything", 2026-10-07; Q-19's "later"; j-read.md J-Q1…J-Q20) ─────────
     Every state with its trail (REG-343):
     - Benjamin Han (P-2026-002; Germaine and Dane): "SkyOasis — proposed layout", traced on 2 Oct by Germaine from his main floor plan (the
       Proposed layout, scaled by G's R85) — its five rooms drawn over the plan at its true size, its doors and windows where the plan has
       them, furnished (the full-height wardrobe and the island where the plan draws them), oak and porcelain floors, warm-white walls;
       shared with Benjamin on 4 Oct (WhatsApp, a note), opened by him on 5 Oct and twice since — the team's bell rows read;
     - Ryan D’Souza (P-2026-001; Michelle): "Condo 3-Bedroom — furnished", started 3 Oct from the Condo 3-Bedroom template with its furniture,
       its finishes picked — not shared yet;
     - Dane's own "Showroom — HDB 4-Room": a personal layout from the HDB 4-Room template, furnished, the studio's walnut vinyl on its floors.
     Every layout carries its project AND its lead (1.0's F-265), its Activity lines (started · shared · opened). Idempotent: fixed ids (`sid`),
     INSERT OR IGNORE. (invented copy: the layouts' names and the share's note) */
  console.log('\nR88 3-D Space Planner — three layouts, one shared with the client and opened')
  {
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('space_layouts', 'space_layout_shares')`))[0]?.n ?? 0)
    if (have === 2) {
      let made = 0
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
      const sec = (t: number) => Math.floor(t / 1000)
      const ev = (id: string, lead: string, pid: string, kind: string, actor: string | null, atMs: number, detail: Record<string, unknown>) =>
        exec(`INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, [id, lead, kind, actor, sec(atMs), JSON.stringify(detail), pid])
      const bell = (id: string, member: string, kind: string, title: string, body: string, href: string, lead: string, atMs: number) =>
        exec(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,'in_app',NULL,?,?)`, [id, member, kind, title, body, href, lead, sec(atMs), sec(atMs) + 1800])
      const projectOf = async (name: string) => rows<{ pid: string; lead: string; number: string; pname: string }>(await client.execute({ sql: `SELECT p.id AS pid, l.id AS lead, p.number, p.name AS pname FROM projects p JOIN leads l ON l.id = p.lead_id WHERE l.name = ? AND p.deleted_at IS NULL AND l.deleted_at IS NULL LIMIT 1`, args: [name] }))[0] ?? null
      const clean = (p: unknown) => plannerCleanPlan(p, plannerIsPieceKey)
      const layout = (o: { id: string; name: string; template: string | null; pid: string | null; lead: string | null; plan: unknown; by: string; at: number; editedAt: number; rev: number }) =>
        exec(`INSERT OR IGNORE INTO space_layouts (id, name, template_key, project_id, lead_id, plan, rev, created_by, updated_by, created_at, updated_at, deleted_at, deleted_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,NULL)`,
          [o.id, o.name, o.template, o.pid, o.lead, JSON.stringify(clean(o.plan)), o.rev, o.by, o.by, o.at, o.editedAt])
      const finish = (rooms: { kind: string; floor: string | null; wall: string | null }[], floors: Record<string, string>, wall: string) =>
        rooms.forEach((r) => { r.floor = floors[r.kind] ?? floors['*'] ?? null; r.wall = r.kind === 'bathroom' || r.kind === 'yard' ? null : wall })

      /* 1 · Benjamin — traced from his main floor plan, shared, opened */
      const ben = await projectOf('Benjamin Han')
      const [proposed] = ben ? rows<{ id: string; width: number; height: number; scale: number | null }>(await client.execute({ sql: `SELECT id, width, height, scale_mm_per_px AS scale FROM project_floor_plans WHERE project_id = ? AND name = 'Proposed layout' AND put_away_at IS NULL`, args: [ben.pid] })) : []
      if (ben && proposed?.scale) {
        const id = sid(ben.pid, 'j:layout:traced')
        type Rm = { id: string; name: string; kind: string; x: number; z: number; w: number; d: number; height: number; walls: Record<string, boolean>; openings: Record<string, unknown>[]; floor: string | null; wall: string | null; floorHex: string; wallHex: string }
        const R = (k: string, name: string, kind: string, x: number, z: number, w: number, d: number, open: string[], doors: [string, number, number][], wins: [string, number, number][]): Rm => ({
          id: `${id.slice(0, 8)}-${k}`, name, kind, x, z, w, d, height: 260, walls: { n: !open.includes('n'), e: !open.includes('e'), s: !open.includes('s'), w: !open.includes('w') },
          openings: [...doors.map(([side, at, width], i) => ({ id: `${id.slice(0, 8)}-${k}-d${i}`, kind: 'door', side, at, width, swing: 'left' })), ...wins.map(([side, at, width], i) => ({ id: `${id.slice(0, 8)}-${k}-w${i}`, kind: 'window', side, at, width, sill: 90, height: 120 }))],
          floor: null, wall: null, floorHex: kind === 'kitchen' ? '#D9D1C4' : kind === 'living' ? '#E8DCC8' : '#E2D8CA', wallHex: '#F5F1EB' })
        /* the plan's own rooms, read off its picture at its scale (8.985 mm a pixel): the outer walls from (126, 81) to (1321, 925) cm */
        const rooms = [
          R('study', 'Bedroom 2 · study', 'bedroom', 125, 80, 415, 340, [], [['s', 252, 80]], [['n', 104, 240]]),
          R('master', 'Master bedroom', 'master', 540, 80, 340, 340, [], [['s', 179, 80]], [['n', 84, 190]]),
          R('bed3', 'Bedroom 3', 'bedroom', 880, 80, 440, 340, [], [['s', 153, 80]], [['n', 122, 220]]),
          R('living', 'Living and dining', 'living', 125, 420, 755, 505, ['e'], [['s', 648, 90]], [['w', 115, 205], ['s', 158, 295]]),
          R('kitchen', 'Open kitchen', 'kitchen', 880, 420, 440, 505, ['w'], [], [['e', 115, 190]]),
        ]
        finish(rooms, { living: 'floor-002', kitchen: 'floor-003', '*': 'floor-009' }, 'paint-007')
        const masterId = rooms[1]!.id, kitchenId = rooms[4]!.id
        const pieces = plannerFurnish(clean({ rooms, pieces: [] }).rooms).filter((p) => !p.id.startsWith(kitchenId) && !(p.id.startsWith(masterId) && (p.key.startsWith('wardrobe') || p.id.endsWith('-sidea'))))   // the plan's full-height wardrobe takes the west wall and its bedside
        pieces.push(
          { id: `${masterId}-wardrobe`, key: 'wardrobe-full', x: 575, z: 249, rot: 270, w: 300, d: 60, h: 250, color: null, finish: 'lib:sm-oak-veneer' },
          { id: `${kitchenId}-island`, key: 'island', x: 1114, z: 746, rot: 0, w: 120, d: 110, h: 90, color: null, finish: 'lib:sm-calacatta' },
          { id: `${kitchenId}-counter`, key: 'counter', x: 1141, z: 539, rot: 180, w: 305, d: 70, h: 90, color: null, finish: null },
          { id: `${kitchenId}-fridge`, key: 'fridge', x: 1270, z: 880, rot: 180, w: 70, d: 70, h: 180, color: null, finish: null },
        )
        const plan = { v: 1, rooms, pieces, underlay: { planId: proposed.id, projectId: ben.pid, name: 'Proposed layout', url: `/projects/${ben.pid}/plan-picture/${proposed.id}`, mmPerPx: proposed.scale, pxW: proposed.width, pxH: proposed.height, x: 0, z: 0, opacity: 0.45, visible: true }, camera: null, wallsLow: false }
        const at = ms(2026, 9, 2, 10, 15), edited = ms(2026, 9, 4, 16, 40), sharedAt = ms(2026, 9, 4, 16, 45), opened = ms(2026, 9, 5, 20, 10)
        const name = 'SkyOasis — proposed layout'
        await layout({ id, name, template: null, pid: ben.pid, lead: ben.lead, plan, by: 'germaine', at, editedAt: edited, rev: 7 })
        const share = sid(id, 'j:share')
        const token = createHash('sha256').update(`${id}:j:token`).digest('base64url').slice(0, 22)
        const snap = { ...clean(plan), underlay: null }
        await exec(`INSERT OR IGNORE INTO space_layout_shares (id, layout_id, lead_id, token, snapshot, name, message, shared_rev, shared_by, shared_at, updated_at, sent_via, first_viewed_at, last_viewed_at, view_count, revoked_at, revoked_by) VALUES (?,?,?,?,?,?,?,7,'germaine',?,?,'whatsapp',?,?,3,NULL,NULL)`,
          [share, id, ben.lead, token, JSON.stringify(snap), name, 'Here’s the layout we talked about — have a walk through the kitchen and tell me what you think.', sharedAt, sharedAt, opened, ms(2026, 9, 6, 21, 30)])
        const d = { name: ben.pname, number: ben.number, id, title: name }
        await ev(sid(id, 'j:ev:created'), ben.lead, ben.pid, 'project_layout_created', 'germaine', at, d)
        await ev(sid(id, 'j:ev:shared'), ben.lead, ben.pid, 'project_layout_shared', 'germaine', sharedAt, d)
        await ev(sid(id, 'j:ev:viewed'), ben.lead, ben.pid, 'project_layout_viewed', null, opened, { ...d, by: 'client', person: 'Benjamin Han' })
        for (const m of ['germaine', 'dane']) await bell(sid(id, `j:bell:viewed:${m}`), m, 'layout_viewed', 'Benjamin Han opened the 3D layout', name, `/planner/${id}`, ben.lead, opened)
      }

      /* 2 · Ryan — a condo started from the template, furnished, not shared yet */
      const ryan = await projectOf('Ryan D’Souza')
      if (ryan) {
        const id = sid(ryan.pid, 'j:layout:condo')
        const plan = plannerPlanFromTemplate('condo-3', true)
        finish(plan.rooms, { living: 'floor-006', kitchen: 'floor-007', balcony: 'floor-005', bathroom: 'floor-003', '*': 'floor-009' }, 'paint-014')
        const at = ms(2026, 9, 3, 11, 30)
        await layout({ id, name: 'Condo 3-Bedroom — furnished', template: 'condo-3', pid: ryan.pid, lead: ryan.lead, plan, by: 'michelle', at, editedAt: ms(2026, 9, 3, 12, 5), rev: 4 })
        await ev(sid(id, 'j:ev:created'), ryan.lead, ryan.pid, 'project_layout_created', 'michelle', at, { name: ryan.pname, number: ryan.number, id, title: 'Condo 3-Bedroom — furnished', kind: 'Condo 3-Bedroom' })
      }

      /* 3 · Dane's own showroom layout — personal: no project, no lead */
      {
        const id = sid('dane', 'j:layout:showroom')
        const plan = plannerPlanFromTemplate('hdb-4', true)
        finish(plan.rooms, { living: 'lib:sm-walnut-vinyl', master: 'lib:sm-walnut-vinyl', bedroom: 'lib:sm-walnut-vinyl', kitchen: 'floor-007', bathroom: 'floor-003', '*': 'floor-004' }, 'lib:sm-sage-whisper')
        await layout({ id, name: 'Showroom — HDB 4-Room', template: 'hdb-4', pid: null, lead: null, plan, by: 'dane', at: ms(2026, 8, 28, 15, 0), editedAt: ms(2026, 8, 29, 9, 20), rev: 9 })
      }
      note(`${made} record(s) — three layouts (Benjamin's traced and shared, Ryan's condo, Dane's showroom), the share and its trail`)
    }
  }

  /* ── R89 · Finance in Company (REG-1360, owner 2026-10-08: "both the finance tabs are same and it shouldn't be outside the company tab") ──────
     Finance's pages moved from /finance/<tab> to /company/finance/<tab>. The old addresses redirect, but a bell row keeps the address it was
     written with — so the stored ones are moved to where the page now lives. /finance/doc/<id> (a cost's file) stays where it is. */
  {
    console.log('\nR89 Finance in Company — bell rows point at /company/finance')
    const r = await client.execute(`UPDATE notifications SET href = '/company' || href WHERE (href = '/finance' OR href LIKE '/finance/%' OR href LIKE '/finance?%') AND href NOT LIKE '/finance/doc/%'`)
    note(`${r.rowsAffected} bell row(s) moved to /company/finance`)
  }

  /* ── R90 · one home: the studio's registrations (one-home N-07, owner 2026-10-08) ─────────────────────────────────────────────────────────
     CaseTrust was a Settings › Quotes & pricing switch (settings `casetrust`, `{ on }`) beside the Compliance Navigator's own Done (settings
     `compliance_studio`). It is one record now — `compliance_studio`, recorded on Company › Profile › Registrations & accreditations, read by the
     Navigator and the signing pages. A studio that had the old switch on keeps CaseTrust done there (by its Owner, when the old row was
     written); the old row goes. Idempotent: the record's own CaseTrust entry, when it has one, wins; a second run finds no `casetrust` row. */
  {
    console.log('\nR90 Registrations — CaseTrust into the studio’s one record')
    const old = rows<{ value: string; at: number | null }>(await client.execute(`SELECT value, updated_at AS at FROM settings WHERE key = 'casetrust'`))[0]
    if (old) {
      let on = false
      try { on = (JSON.parse(old.value) as { on?: unknown }).on === true } catch { on = false }
      if (on) {
        const cur = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'compliance_studio'`))[0]
        let record: Record<string, unknown> = {}
        try { const v = cur ? (JSON.parse(cur.value) as unknown) : {}; record = v && typeof v === 'object' ? (v as Record<string, unknown>) : {} } catch { record = {} }
        if (!record.CASETRUST_RENOVATION) {
          const owner = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role = 'Owner' AND is_active = 1 ORDER BY is_you DESC, name LIMIT 1`))[0]?.id ?? null
          const at = typeof old.at === 'number' && old.at > 0 ? (old.at < 1e12 ? old.at * 1000 : old.at) : Date.now()   // settings.updated_at is seconds
          record.CASETRUST_RENOVATION = { done: true, by: owner, at }
          await client.execute({ sql: `INSERT INTO settings (key, value, updated_at) VALUES ('compliance_studio', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [JSON.stringify(record), Math.floor(Date.now() / 1000)] })
        }
      }
      await client.execute(`DELETE FROM settings WHERE key = 'casetrust'`)
      note(on ? 'CaseTrust moved into the studio’s registrations; the old switch’s row removed' : 'the old CaseTrust switch’s row removed (it was off)')
    } else note('no old CaseTrust switch to move')
  }

  /* ── R91 · one vendor list (one-home N-16) ─────────────────────────────────────────────────────────────────────────────────────────────
     The Price book's Vendor and the quote lines' Vendor/Sub pick from Company › Finance › Vendors. The price book's two tile suppliers (R38)
     join the directory by name and trade, as its type-ahead would have added them; then every vendor name on an item or a line that is a
     directory vendor's (the same words — case, spaces and "Pte Ltd" aside, F1's nameKey) takes the directory's spelling, so renaming or
     merging that vendor follows onto it. A name nobody added stays as typed. Idempotent (fixed ids; a spelt name matches exactly). */
  console.log('\nR91 one vendor list — the price book and the quote lines spell the directory’s vendors')
  {
    const has = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'vendors'`))[0]?.n
    if (has) {
      const live = async () => rows<{ name: string }>(await client.execute(`SELECT name FROM vendors WHERE is_active = 1 AND merged_into IS NULL`))
      let added = 0
      for (const [key, name, trade, itemId] of [['hafary', 'Hafary', 'Tiling', 'pb-tiles-hafary'], ['sbh', 'Soon Bee Huat', 'Tiling', 'pb-tiles-sbh']] as const) {
        const item = rows<{ created_at: number; created_by: string | null }>(await client.execute({ sql: `SELECT created_at, created_by FROM price_book_items WHERE id = ?`, args: [itemId] }))[0]
        if (!item || (await live()).some((v) => nameKey(v.name) === nameKey(name))) continue
        const by = item.created_by ?? 'dane'
        added += (await client.execute({ sql: `INSERT OR IGNORE INTO vendors (id, name, trade, charges_gst, is_active, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,0,1,?,?,?,?)`,
          args: [sid('one-home-n16', `vendor:${key}`), name, trade, by, item.created_at, by, item.created_at] })).rowsAffected
      }
      const dir = await live()
      let spelt = 0
      for (const table of ['price_book_items', 'quote_items'] as const) {
        for (const { vendor } of rows<{ vendor: string }>(await client.execute(`SELECT DISTINCT vendor FROM ${table} WHERE vendor IS NOT NULL`))) {
          const hit = dir.find((v) => nameKey(v.name) === nameKey(vendor))
          if (hit && hit.name !== vendor) spelt += (await client.execute({ sql: `UPDATE ${table} SET vendor = ? WHERE vendor = ?`, args: [hit.name, vendor] })).rowsAffected
        }
      }
      console.log(`  ${added} price book supplier(s) joined the directory · ${spelt} item / line vendor name(s) spelt as the directory spells them`)
    }
  }

  /* ── R92 · who moved a stage and who added a member (parity P-13, the owner's pick 2026-10-08) ─────────────────────────────────────────
     `stage_logs.moved_by` and `lead_assignees.assigned_by` arrived empty. Filled only where the records already say who: a Won move from its
     project's `project_created` event at the same moment (not a remade or direct project's); any move from the bell's `stage_changed` row at the
     same moment with the same "from → to" (its actor); a member from the bell's `assigned` row to them at the same moment; a direct project's
     first members from whoever created the project. The rest stay unnamed — Activity reads "The lead moved from …" / "{name} was added to the
     lead". Idempotent: only NULLs are filled. (No ORDER BY on the outer row — SQLite refuses an outer column there; the two-second window holds one match.) */
  {
    console.log('\nR92 Activity names who moved a stage and who added a member')
    const won = await client.execute(`UPDATE stage_logs SET moved_by = (
        SELECT e.actor_id FROM lead_events e
        WHERE e.lead_id = stage_logs.lead_id AND e.kind = 'project_created' AND e.actor_id IS NOT NULL AND abs(e.at - stage_logs.created_at) <= 2
          AND coalesce(json_extract(e.detail, '$.direct'), 0) = 0 AND coalesce(json_extract(e.detail, '$.remade'), 0) = 0
        LIMIT 1)
      WHERE moved_by IS NULL AND to_stage = 'Won' AND from_stage <> 'Won'`)
    const rung = await client.execute(`UPDATE stage_logs SET moved_by = (
        SELECT n.actor_id FROM notifications n
        WHERE n.lead_id = stage_logs.lead_id AND n.kind = 'stage_changed' AND n.actor_id IS NOT NULL AND abs(n.created_at - stage_logs.created_at) <= 2
          AND n.title LIKE '%: ' || stage_logs.from_stage || ' → ' || stage_logs.to_stage
        LIMIT 1)
      WHERE moved_by IS NULL AND from_stage <> to_stage`)
    const told = await client.execute(`UPDATE lead_assignees SET assigned_by = (
        SELECT n.actor_id FROM notifications n
        WHERE n.lead_id = lead_assignees.lead_id AND n.member_id = lead_assignees.member_id AND n.kind = 'assigned' AND n.actor_id IS NOT NULL
          AND abs(n.created_at - lead_assignees.assigned_at) <= 2
        LIMIT 1)
      WHERE assigned_by IS NULL AND assigned_at IS NOT NULL`)
    const direct = await client.execute(`UPDATE lead_assignees SET assigned_by = (
        SELECT e.actor_id FROM lead_events e JOIN leads l ON l.id = e.lead_id
        WHERE e.lead_id = lead_assignees.lead_id AND l.direct = 1 AND e.kind = 'project_created' AND e.actor_id IS NOT NULL
          AND abs(e.at - coalesce(lead_assignees.assigned_at, l.created_at)) <= 2
        LIMIT 1)
      WHERE assigned_by IS NULL`)
    note(`moved_by: ${won.rowsAffected} Won move(s) from their project's line, ${rung.rowsAffected} move(s) checked against the bell — assigned_by: ${told.rowsAffected} member(s) checked against the bell, ${direct.rowsAffected} checked against a direct project's creation (rows still unnamed stay so)`)
  }

  /* ── R93 · the signed quotes' lines name who does them (simplify Q-10, her "build everything" 2026-10-09) ────────────────────────────────
     New ▾ › Order from the quote groups a signed quote's lines by vendor and makes one Draft PO per ticked vendor. The demo's signed quotes named
     a vendor on one line only, so the dialog had one group. A line with no vendor takes the directory's vendor for its trade (the one the studio
     orders from most — the most POs, then the name) where the directory has one; lines of a trade nobody in the directory does stay unnamed.
     Idempotent: only empty vendors are filled. */
  {
    console.log('\nR93 Order from the quote — the signed quotes’ lines name their trade’s vendor')
    const r = await client.execute(`UPDATE quote_items SET vendor = (
        SELECT v.name FROM vendors v WHERE v.trade = quote_items.category AND v.merged_into IS NULL AND v.is_active = 1
        ORDER BY (SELECT count(*) FROM purchase_orders po WHERE po.vendor_id = v.id) DESC, v.name LIMIT 1)
      WHERE kind = 'item' AND (vendor IS NULL OR vendor = '')
        AND quote_id IN (SELECT quote_id FROM projects WHERE quote_id IS NOT NULL AND deleted_at IS NULL)
        AND EXISTS (SELECT 1 FROM vendors v WHERE v.trade = quote_items.category AND v.merged_into IS NULL AND v.is_active = 1)`)
    note(`${r.rowsAffected} signed quote line(s) now name their trade's vendor`)
  }

  /* ── R94 · Finance › To do (simplify S-10, her "build everything" 2026-10-09) ────────────────────────────────────────────────────────────
     An approver's bell row for a PO or an expense waiting opens the To do row they act on now. A stored row keeps the address it was written
     with (the project's Money, or Finance › Expenses), so it moves. Idempotent: a row already on To do is left. */
  {
    console.log('\nR94 Finance › To do — the approvers’ bell rows open To do')
    const r = await client.execute(`UPDATE notifications SET href = '/company/finance/todo?open=' || substr(href, instr(href, 'open=') + 5) WHERE kind IN ('po_review', 'expense_review') AND instr(href, 'open=') > 0 AND href NOT LIKE '/company/finance/todo%'`)
    note(`${r.rowsAffected} bell row(s) moved to To do`)
  }

  /* ── R95 · the client asks keep their task and order on their own rows (simplify round 2, S-22 — her "fix all the pending things" 2026-10-09) ──
     Round 1 kept "this message / ticket made task T and VO V" only as `lead_events` lines (`project_ask_task` · `project_ask_vo`, detail.source ·
     ref · id) — no column existed. Migration 0084 gave `project_messages` and `project_tickets` their `task_id` · `variation_id`, which the ask menu
     now reads. The lines stay (who did it and when; Activity's sentence). Filled from the newest line per ask whose task / order is still there,
     only where the column is empty. Idempotent. */
  {
    console.log('\nR95 The client asks — each message’s and ticket’s task and order on its own row')
    let n = 0
    const LIVE = {
      project_ask_task: `EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = json_extract(e.detail, '$.id'))`,
      project_ask_vo: `EXISTS (SELECT 1 FROM quotes q WHERE q.id = json_extract(e.detail, '$.id') AND q.kind = 'variation' AND q.deleted_at IS NULL)`,
    } as const
    for (const [table, source] of [['project_messages', 'message'], ['project_tickets', 'ticket']] as const) {
      for (const [col, kind] of [['task_id', 'project_ask_task'], ['variation_id', 'project_ask_vo']] as const) {
        const match = `e.project_id = ${table}.project_id AND e.kind = '${kind}' AND json_extract(e.detail, '$.source') = '${source}' AND json_extract(e.detail, '$.ref') = ${table}.id AND ${LIVE[kind]}`
        const r = await client.execute(`UPDATE ${table} SET ${col} = (SELECT json_extract(e.detail, '$.id') FROM lead_events e WHERE ${match} ORDER BY e.at DESC LIMIT 1)
          WHERE ${col} IS NULL AND EXISTS (SELECT 1 FROM lead_events e WHERE ${match})`)
        n += r.rowsAffected
      }
    }
    note(`${n} ask link(s) moved onto their message or ticket`)
  }

  /* ── R96 · a member's PayNow (simplify round 2 — F1 §6.9.3, her "fix all the pending things" 2026-10-09) ────────────────────────────
     Germaine and Michelle are the demo's members who are paid back for claims and paid commission: their PayNow is their mobile, as a
     Singapore designer's usually is. Kept bare (eight digits), as Company › Members saves it. Only where none is set. */
  {
    console.log('\nR96 a member’s PayNow — Germaine and Michelle')
    const r = await client.execute(`UPDATE members SET paynow = phone WHERE id IN ('germaine', 'michelle') AND (paynow IS NULL OR paynow = '') AND phone IS NOT NULL AND phone <> ''`)
    note(`${r.rowsAffected} member PayNow(s) set`)
  }


  /* ── R97 · the 3-D Space Planner's parity round (parity map P-J, 2026-10-10 — her "build everything that's in 1.0") ───────────────────
     What the round's new pieces need to show on the demo, each backed by its records: (TD-087) SkyOasis keeps two versions — its share's
     (the snapshot as shared on 4 Oct, "Shared with the client") and Germaine's own the day before, the kitchen island not placed yet
     ("Before the kitchen island"); (TD-076) the studio's own template — Dane's "Studio standard — HDB 5-Room", furnished, the studio's walnut
     vinyl and sage walls — under New layout › My templates and the gallery's Templates; (TD-075) Dane's personal "Landed terrace — two storeys":
     the landed flat furnished on its Ground floor, and an Upper floor of its own (a family area, the master bedroom, two bedrooms and a
     bathroom off a landing), furnished by the same rule. Idempotent: fixed ids (`sid`), INSERT OR IGNORE. (invented copy: the layouts' and
     the levels' names, the hand-kept version's note) */
  console.log('\nR97 3-D Space Planner parity — a share’s version, a template, a two-storey layout')
  {
    const cols = rows<{ name: string }>(await client.execute(`PRAGMA table_info(space_layouts)`)).map((c) => c.name)
    const have = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'space_layout_versions'`))[0]?.n ?? 0)
    if (have === 1 && cols.includes('is_template')) {
      let made = 0
      const exec = async (sql: string, args: (string | number | null)[]) => { made += (await client.execute({ sql, args })).rowsAffected }
      const ms = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime()
      const clean = (p: unknown) => JSON.stringify(plannerCleanPlan(p, plannerIsPieceKey))
      const version = (id: string, layoutId: string, rev: number, name: string, plan: string, note: string | null, by: string, at: number) =>
        exec(`INSERT OR IGNORE INTO space_layout_versions (id, layout_id, rev, name, plan, note, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)`, [id, layoutId, rev, name, plan, note, by, at])
      const layout = (o: { id: string; name: string; template: string; plan: unknown; at: number; editedAt: number; rev: number; isTemplate: boolean }) =>
        exec(`INSERT OR IGNORE INTO space_layouts (id, name, template_key, project_id, lead_id, plan, rev, created_by, updated_by, created_at, updated_at, deleted_at, deleted_by, is_template) VALUES (?,?,?,NULL,NULL,?,?,'dane','dane',?,?,NULL,NULL,?)`,
          [o.id, o.name, o.template, clean(o.plan), o.rev, o.at, o.editedAt, o.isTemplate ? 1 : 0])
      const finish = (rooms: { kind: string; floor: string | null; wall: string | null }[], floors: Record<string, string>, wall: string) =>
        rooms.forEach((r) => { if (r.kind === 'balcony' || r.kind === 'outdoor') return; r.floor = floors[r.kind] ?? floors['*'] ?? null; r.wall = r.kind === 'bathroom' || r.kind === 'yard' ? null : wall })
      const STUDIO = { living: 'lib:sm-walnut-vinyl', dining: 'lib:sm-walnut-vinyl', master: 'lib:sm-walnut-vinyl', bedroom: 'lib:sm-walnut-vinyl', study: 'lib:sm-walnut-vinyl', kitchen: 'floor-007', bathroom: 'floor-003', yard: 'floor-003', '*': 'floor-004' }

      /* 1 · SkyOasis — the share's version (its snapshot as shared) and Germaine's own the day before, the kitchen island not placed yet */
      const [sky] = rows<{ id: string; name: string; plan: string; shared_at: number; snapshot: string }>(await client.execute(`SELECT l.id, l.name, l.plan, s.shared_at, s.snapshot FROM space_layouts l JOIN space_layout_shares s ON s.layout_id = l.id AND s.revoked_at IS NULL WHERE l.name = 'SkyOasis — proposed layout' AND l.deleted_at IS NULL LIMIT 1`))
      if (sky) {
        await version(sid(sky.id, 'pj:version:shared'), sky.id, 7, sky.name, clean(JSON.parse(sky.snapshot)), '@shared', 'germaine', Number(sky.shared_at))
        const before = JSON.parse(sky.plan) as { pieces: { key: string }[] }
        before.pieces = before.pieces.filter((p) => p.key !== 'island')
        await version(sid(sky.id, 'pj:version:hand'), sky.id, 5, sky.name, clean(before), 'Before the kitchen island', 'germaine', ms(2026, 9, 3, 17, 20))
      }

      /* 2 · the studio's own template — never a project's, every member starts from it */
      {
        const plan = plannerPlanFromTemplate('hdb-5', true)
        finish(plan.rooms, STUDIO, 'lib:sm-sage-whisper')
        await layout({ id: sid('dane', 'pj:layout:template'), name: 'Studio standard — HDB 5-Room', template: 'hdb-5', plan, at: ms(2026, 8, 30, 10, 0), editedAt: ms(2026, 8, 30, 10, 40), rev: 3, isTemplate: true })
      }

      /* 3 · a two-storey landed house — the ground floor from the template, an upper floor of its own over the house's footprint */
      {
        const id = sid('dane', 'pj:layout:two-storey')
        const T = plannerTemplateRoom
        const ground = plannerPlanFromTemplate('landed', true)
        const up = [
          T('lu', 'family', 'Family area', 'living', 0, 450, 700, 500, { windows: [['n', 150, 240], ['w', 150, 200]], open: ['s'] }),
          T('lu', 'master', 'Master bedroom', 'master', 700, 450, 600, 500, { doors: [['s', 60, 90]], windows: [['n', 200, 200], ['e', 150, 150]] }),
          T('lu', 'landing', 'Landing', 'corridor', 0, 950, 1300, 120, { open: ['n'] }),
          T('lu', 'bed4', 'Bedroom 4', 'bedroom', 0, 1070, 450, 380, { doors: [['n', 330, 90]], windows: [['w', 110, 160], ['s', 150, 150]] }),
          T('lu', 'bed5', 'Bedroom 5', 'bedroom', 450, 1070, 450, 380, { doors: [['n', 330, 90]], windows: [['s', 150, 150]] }),
          T('lu', 'bath', 'Bathroom', 'bathroom', 900, 1070, 400, 380, { doors: [['n', 60, 70]], windows: [['s', 170, 60]] }),
        ]
        finish(ground.rooms, STUDIO, 'paint-001'); finish(up, STUDIO, 'paint-001')
        const plan = { ...ground, levelName: 'Ground floor', levels: [{ id: `lv-${id.slice(0, 8)}`, name: 'Upper floor', rooms: up, pieces: plannerFurnish(up), underlay: null }] }
        await layout({ id, name: 'Landed terrace — two storeys', template: 'landed', plan, at: ms(2026, 9, 1, 14, 0), editedAt: ms(2026, 9, 1, 15, 25), rev: 6, isTemplate: false })
      }
      note(`${made} record(s) — SkyOasis’s two versions, the studio’s template, a two-storey layout`)
    }
  }

  /* ── R98 · a paused stage says when it picks up (parity map, CP-064 · P-F — her "build everything that's in 1.0" 2026-10-10) ──────────────
     Ryan's Blocked "Electrical & plumbing" (waiting on the supplier's pressure-test sign-off) gets an expected restart four days after the repair
     first runs, local midnight — the client reads "Paused · Resuming around …". No client note is invented. Only where none is set. */
  {
    console.log('\nR98 Ryan’s paused stage — when it should pick up')
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + 4)
    const r = await client.execute({ sql: `UPDATE project_milestones SET resume_on = ? WHERE status = 'blocked' AND resume_on IS NULL AND deleted_at IS NULL AND title = 'Electrical & plumbing' AND project_id = (SELECT id FROM projects WHERE number = 'P-2026-001')`, args: [Math.floor(day.getTime() / 1000)] })
    note(`${r.rowsAffected} paused stage(s) given a restart day`)
  }

  /* ── R99 · commission on the project's Activity (parity map, FB-057 — her "build everything that's in 1.0" 2026-10-10) ──────────────────
     The demo's asks for another rate (Germaine's approved on Benjamin Han, Michelle's open on Ryan D'Souza) were made before their lines
     existed: each ask gets its `parity_c_commission_asked` line at its own time, an answered one its `parity_c_commission_answered` line at the
     answer's, and a project's own rate (one not made by an ask) its `parity_c_commission_rule` line. detail.ask / detail.rule name the record. */
  {
    console.log('\nR99 Commission — the asks and the project rates on the project’s Activity')
    const { ruleWords, isBasis } = await import('../lib/finance/commission')
    const words = (basis: unknown, rateBp: unknown, fixedMinor: unknown) => ruleWords({ basis: isBasis(basis) ? basis : 'payments', rateBp: Number(rateBp) || 0, fixedMinor: Number(fixedMinor) || 0 })
    const has = async (kind: string, key: 'ask' | 'rule', id: string) => (await client.execute({ sql: `SELECT 1 FROM lead_events WHERE kind = ? AND json_extract(detail, '$.${key}') = ? LIMIT 1`, args: [kind, id] })).rows.length > 0
    let n = 0
    const asks = (await client.execute(`SELECT r.*, p.lead_id AS lead, p.name AS pname, m.name AS mname FROM commission_requests r JOIN projects p ON p.id = r.project_id LEFT JOIN members m ON m.id = r.member_id`)).rows
    for (const a of asks) {
      const id = String(a.id), base = { name: String(a.pname), memberId: String(a.member_id), title: a.mname ? String(a.mname) : null, ask: id }
      if (!(await has('parity_c_commission_asked', 'ask', id))) {
        await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_asked', ?, ?, ?)`,
          args: [randomUUID(), String(a.lead), String(a.project_id), String(a.member_id), Number(a.created_at), JSON.stringify({ ...base, to: words(a.basis, a.rate_bp, a.fixed_minor), reason: a.reason ?? null })] }); n++
      }
      if ((a.status === 'approved' || a.status === 'declined') && a.answered_at && !(await has('parity_c_commission_answered', 'ask', id))) {
        await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_answered', ?, ?, ?)`,
          args: [randomUUID(), String(a.lead), String(a.project_id), a.answered_by ? String(a.answered_by) : null, Number(a.answered_at),
            JSON.stringify({ ...base, to: words(a.basis, a.approved_rate_bp ?? a.rate_bp, a.approved_fixed_minor ?? a.fixed_minor), answer: a.status, note: a.answer_note ?? null })] }); n++
      }
    }
    const rules = (await client.execute(`SELECT r.*, p.lead_id AS lead, p.name AS pname, m.name AS mname FROM commission_rules r JOIN projects p ON p.id = r.project_id LEFT JOIN members m ON m.id = r.member_id WHERE r.request_id IS NULL`)).rows
    for (const r of rules) {
      const id = String(r.id)
      if (await has('parity_c_commission_rule', 'rule', id)) continue
      await client.execute({ sql: `INSERT INTO lead_events (id, lead_id, project_id, kind, actor_id, at, detail) VALUES (?, ?, ?, 'parity_c_commission_rule', ?, ?, ?)`,
        args: [randomUUID(), String(r.lead), String(r.project_id), r.created_by ? String(r.created_by) : null, Number(r.created_at),
          JSON.stringify({ name: String(r.pname), memberId: r.member_id ? String(r.member_id) : null, title: r.mname ? String(r.mname) : null, from: null, to: words(r.basis, r.rate_bp, r.fixed_minor), rule: id })] }); n++
    }
    note(`${n} commission line(s) on the projects’ Activity`)
  }

  /* ── R100 · conversations (parity map 2026-10-10, P-G — UC-064) ──────────────────────────────────────────────────────────────────────
     Benjamin's project has a team conversation (Germaine and Dane on the chipped cabinet carcass — the client never sees it); Serena Koh
     (Quote Sent, invited to the portal, no project) asked on her page before Won and Germaine answered — the Lead row /chat lists. Every
     member has read both (the rail's count stays as it was) and Serena has read the answer. Fixed ids; idempotent. */
  {
    console.log('\nR100 Conversations — a team chat on Benjamin’s project, Serena Koh’s conversation before Won')
    let n = 0
    const ben = (await client.execute(`SELECT id, lead_id FROM projects WHERE number = 'P-2026-002' AND deleted_at IS NULL`)).rows[0]
    const team0 = Date.parse('2026-10-08T01:20:00Z')
    if (ben) {
      for (const [id, who, name, body, at] of [
        ['pg-team-1', 'germaine', 'Germaine', 'Heads up — the tall cabinet carcass came back from the factory with a chipped edge. The replacement is promised for Thursday.', team0],
        ['pg-team-2', 'dane', 'Dane', 'Thanks. Let’s not give Benjamin a new date until the replacement is confirmed — I’ll tell him myself on Friday.', team0 + 40 * 60_000],
      ] as const) {
        n += (await client.execute({ sql: `INSERT OR IGNORE INTO project_messages (id, project_id, lead_id, author_kind, author_id, author_name, body, photos, created_at, deleted_at, task_id, variation_id, channel, attachments, meta)
          VALUES (?, ?, ?, 'studio', ?, ?, ?, NULL, ?, NULL, NULL, NULL, 'team', NULL, NULL)`, args: [id, String(ben.id), String(ben.lead_id), who, name, body, at] })).rowsAffected
      }
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) SELECT 'member', id, ?, ? FROM members`, args: [`team:${String(ben.id)}`, team0 + 41 * 60_000] })
    }
    const serena = (await client.execute(`SELECT l.id, h.homeowner_id FROM leads l JOIN homeowner_lead_links h ON h.lead_id = l.id WHERE l.name = 'Serena Koh' AND l.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id AND p.deleted_at IS NULL) LIMIT 1`)).rows[0]
    const lead0 = Date.parse('2026-10-06T06:15:00Z')
    if (serena) {
      for (const [id, kind, by, name, body, at] of [
        ['pg-lead-1', 'client', String(serena.homeowner_id), 'Serena Koh', 'Hi Germaine — does the carpentry in the quotation include the shoe cabinet at the entrance?', lead0],
        ['pg-lead-2', 'studio', 'germaine', 'Germaine', 'It does — line B4, the full-height shoe cabinet with the bench. I’ll mark it on the drawing for you.', lead0 + 55 * 60_000],
      ] as const) {
        n += (await client.execute({ sql: `INSERT OR IGNORE INTO lead_messages (id, lead_id, author_kind, author_id, author_name, body, attachments, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)`,
          args: [id, String(serena.id), kind, by, name, body, at] })).rowsAffected
      }
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) SELECT 'member', id, ?, ? FROM members`, args: [`lead:${String(serena.id)}`, lead0 + 56 * 60_000] })
      await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) VALUES ('client', ?, ?, ?)`, args: [String(serena.homeowner_id), `lead:${String(serena.id)}`, lead0 + 3 * 3_600_000] })
    }
    note(`${n} message(s) written`)
  }

  /* ── R101 · a variation order's days on the schedule (parity map, SC-094 · P-E) ──────────────────────────────────────────────────────
     Ryan's approved VO-1 adds 3 days — the Schedule's "+3 days from changes" and its Needs you row "VO-1 adds 3 days — move what follows?";
     Shalini's (completed) VO-1 prints "Adds 2 days to the schedule" on its paper. Only an order with no days yet. */
  {
    console.log('\nR101 Variation orders’ days — Ryan’s VO-1, Shalini’s VO-1')
    let n = 0
    for (const [project, number, days] of [['P-2026-001', 'VO-1', 3], ['P-2025-001', 'VO-1', 2]] as const) {
      n += (await client.execute({ sql: `UPDATE quotes SET timeline_days = ? WHERE kind = 'variation' AND number = ? AND deleted_at IS NULL AND timeline_days IS NULL AND project_id = (SELECT id FROM projects WHERE number = ?)`, args: [days, number, project] })).rowsAffected
    }
    note(`${n} variation order(s) given their days`)
  }


  /* ── R102 · a bookkeeper on the team (parity map P-I — PR-022 · MI-007 · MO-098 · FB-114 · FR-040, her "build everything that's in 1.0"
     2026-10-10) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     1.0 had an Accounting role; 2.0 has it now, and Demo Studio › View as needs someone to be one. Priya Tan keeps the studio's books: in
     Accounting, active, on no lead and no project (so not open to new leads), reporting to nobody, a work address that is the studio's
     accounts mailbox (never firstname@ — probes add a "Priya" with that one), a phone, a tint no one else wears. Written once by its fixed id;
     a studio's own edits to her stand. */
  console.log('\nR102 an Accounting member')
  {
    const domain = (DEFAULT_BRAND_SETTING.details.email.split('@')[1] ?? 'demostudio.sg').toLowerCase()
    const r = await client.execute({ sql: `INSERT OR IGNORE INTO members (id, name, role, color, is_you, manager_id, email, phone, accepting_leads, is_active) VALUES ('priya', 'Priya Tan', 'Accounting', '#2B8A8A', 0, NULL, ?, '96417305', 0, 1)`, args: [`accounts@${domain}`] })
    console.log(r.rowsAffected ? '  Priya Tan added in Accounting' : '  already there')
    /* R64's note for every member — she joined after it ran: the same row, for her */
    const at = Math.floor(Date.UTC(2026, 8, 28, 1, 0, 0) / 1000)
    await client.execute(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, channels, created_at)
      SELECT 'nt-keys-' || m.id, m.id, 'shortcuts_ready', 'Keyboard shortcuts are here', 'Press ? on any page to see them', '#shortcuts', 'in_app', ${at}
      FROM members m WHERE m.id = 'priya' AND coalesce(m.is_active, 1) = 1`)
  }

  /* ── R164 · the studio's lead desk (S44O — call C6 · UAT row 313, IDL's "a marketing person sees only lead things"; as recommended, her UAT
     ask 2026-10-15) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     2.0 has a sixth role, Marketing (lib/settings/roles.ts), and Demo Studio › View as needs someone to be one. Nurul Huda looks after the
     studio's leads: in Marketing, active, on no lead and no project (so not open to new leads — she hands them out), reporting to nobody, her
     own work address and a mobile (her only other way to sign in), a tint no one else wears. Written once by its fixed id; a studio's own edits
     to her stand. R110 (below) gives her the first visit every demo member carries. */
  console.log('\nR164 a Marketing member')
  {
    const domain = (DEFAULT_BRAND_SETTING.details.email.split('@')[1] ?? 'demostudio.sg').toLowerCase()
    const r = await client.execute({ sql: `INSERT OR IGNORE INTO members (id, name, role, color, is_you, manager_id, email, phone, accepting_leads, is_active) VALUES ('nurul', 'Nurul Huda', 'Marketing', '#C2549A', 0, NULL, ?, '93418826', 0, 1)`, args: [`nurul@${domain}`] })
    console.log(r.rowsAffected ? '  Nurul Huda added in Marketing' : '  already there')
    /* R64's note for every member — she joined after it ran: the same row, for her (R102's way) */
    const at = Math.floor(Date.UTC(2026, 8, 28, 1, 0, 0) / 1000)
    await client.execute(`INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, channels, created_at)
      SELECT 'nt-keys-' || m.id, m.id, 'shortcuts_ready', 'Keyboard shortcuts are here', 'Press ? on any page to see them', '#shortcuts', 'in_app', ${at}
      FROM members m WHERE m.id = 'nurul' AND coalesce(m.is_active, 1) = 1`)
  }

  /* ── R103 · a member's one photo (pending modules S01 — Your own profile, her "build all of them" 2026-10-11) ───────────────────────────────
     A member's photo is their avatar everywhere and their portrait on the About page — one picture (lib/company/member-photo.ts). A portrait
     set on the About page before S01 (gaps build H kept it in `portal_photo_id` alone) becomes the avatar's look too; a look that carries a
     photo puts its picture on the About page's column. Idempotent: a look that already carries the portrait is left as it is. */
  console.log('\nR103 a member’s one photo — the avatar and the About portrait')
  {
    const a = await client.execute(`UPDATE members SET color = 'photo:' || portal_photo_id || '|' || CASE WHEN color LIKE 'photo:%|%' THEN substr(color, instr(color, '|') + 1) ELSE color END
      WHERE portal_photo_id IS NOT NULL AND color NOT LIKE 'photo:' || portal_photo_id || '|%'
        AND EXISTS (SELECT 1 FROM studio_pictures p WHERE p.id = members.portal_photo_id AND p.deleted_at IS NULL)`)
    const b = await client.execute(`UPDATE members SET portal_photo_id = substr(color, 7, instr(color, '|') - 7)
      WHERE color LIKE 'photo:%|%' AND coalesce(portal_photo_id, '') <> substr(color, 7, instr(color, '|') - 7)`)
    console.log(a.rowsAffected || b.rowsAffected ? `  ${a.rowsAffected} About portrait(s) made the avatar · ${b.rowsAffected} photo(s) put on the About page` : '  every photo already one')
  }

  /* ── R104 · client links (pending modules S02 — her "build all of them" 2026-10-11) ───────────────────────────────────────────────────────────
     A quote's view-only link (`quotes.view_token`) belongs to a quote, never a variation order (approved on its confirmation link), and keeps
     when and by whom it was made. A render shown to the client from Files reaches their Designs through a link of its own
     (`render_share_links.file_id`): that link is live only while the file is shown, and only on the file's own lead. Nothing in the demo
     carries either yet — the block keeps a ported or tester-made copy honest. Idempotent. */
  console.log('\nR104 client links — the view-only quote link and Files’ renders on Designs')
  {
    const a = await client.execute(`UPDATE quotes SET view_token = NULL, view_token_at = NULL, view_token_by = NULL WHERE view_token IS NOT NULL AND (kind = 'variation' OR view_token_at IS NULL)`)
    const b = await client.execute(`UPDATE render_share_links SET revoked_at = ${Math.floor(Date.now() / 1000)} WHERE file_id IS NOT NULL AND revoked_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = render_share_links.file_id AND f.lead_id = render_share_links.lead_id AND f.shown_to_client_at IS NOT NULL AND f.deleted_at IS NULL)`)
    console.log(a.rowsAffected || b.rowsAffected ? `  ${a.rowsAffected} view-only link(s) cleared · ${b.rowsAffected} Files link(s) stopped` : '  every client link already in step')
  }

  /* ── R105 · contracts leftovers (pending modules S03 — her "build all of them" 2026-10-11) ────────────────────────────────────────────────
     The signing link's key and window, consent before a member's signature is stamped, the contract value frozen at signing. Every contract
     has a token — one made before this step keeps its id, so the links already in clients' chats keep opening (1.0's tokens arrive the same
     way on a port). A contract out for signature gets its window: the studio's Signing links days from the later of when it was sent and
     today — a link that opened yesterday still opens for a week, never dead on arrival of the rule; a set sent together the same. A member
     whose signature is saved said yes by saving it (the documents printed it until now); a signed quote's total is what it was signed at.
     Idempotent: only empty columns are filled. */
  console.log('\nR105 contracts leftovers — signing links, consent, the signed total')
  {
    const nowS = Math.floor(Date.now() / 1000)
    const rulesRow = (await client.execute(`SELECT value FROM settings WHERE key = 'contract_rules'`)).rows[0]
    const days = (() => { try { const d = Number(JSON.parse(String(rulesRow?.value ?? '{}')).linkDays); return [7, 14, 30].includes(d) ? d : 7 } catch { return 7 } })()
    const t = await client.execute(`UPDATE contracts SET sign_token = id WHERE sign_token IS NULL`)
    const w = await client.execute(`UPDATE contracts SET sign_expires_at = max(coalesce(sent_at, ${nowS}), ${nowS}) + ${days * 86400} WHERE status = 'Sent to Client' AND sign_expires_at IS NULL`)
    const b = await client.execute(`UPDATE contract_bundles SET sign_expires_at = max(coalesce(sent_at, ${nowS}), ${nowS}) + ${days * 86400} WHERE signed_at IS NULL AND cancelled_at IS NULL AND sign_expires_at IS NULL
      AND EXISTS (SELECT 1 FROM contracts c WHERE c.bundle_id = contract_bundles.id AND c.status = 'Sent to Client' AND c.deleted_at IS NULL)`)
    const d = await client.execute(`UPDATE contracts SET sign_expires_at = NULL WHERE status = 'Draft' AND sign_expires_at IS NOT NULL`)
    const c = await client.execute(`UPDATE members SET signature_consent = 'yes', signature_consent_at = ${nowS} WHERE signature_kind IS NOT NULL AND signature_consent IS NULL`)
    const q = await client.execute(`UPDATE quotes SET signed_amount_minor = amount_minor WHERE status = 'Signed' AND signed_amount_minor IS NULL`)
    const n = t.rowsAffected + w.rowsAffected + b.rowsAffected + d.rowsAffected + c.rowsAffected + q.rowsAffected
    console.log(n ? `  ${t.rowsAffected} link key(s) · ${w.rowsAffected + b.rowsAffected} window(s) (${days} days) · ${d.rowsAffected} Draft window(s) cleared · ${c.rowsAffected} signature consent(s) · ${q.rowsAffected} signed total(s)` : '  every contract link, consent and signed total already in step')
  }

  /* ── R106 · quotes leftovers (pending modules S04 — her "build all of them" 2026-10-11) ────────────────────────────────────────────────────
     The confirmation link's key, a line's status dropped, the preparer kept at send. Every quote has a confirmation token — one made before
     this step keeps its id, so the links already in clients' chats keep opening (1.0's quote-link tokens arrive the same way on a port). A
     line has no status of its own any more: one the client passed on becomes an optional work they said no to (out of every total, as before),
     and every line reads Pending — nothing on any screen gave an answer per line since REG-435. A quote already with its client keeps what its
     paper printed of its preparer, as the records stand today (consent applied); one not with its client keeps none. Idempotent: only what is
     out of step is written. */
  console.log('\nR106 quotes leftovers — the confirmation link’s key, a line’s status, the preparer kept at send')
  {
    const t = await client.execute(`UPDATE quotes SET confirm_token = id WHERE confirm_token IS NULL OR confirm_token = ''`)
    const passedGroups = await client.execute(`UPDATE quote_items SET optional = 1, client_choice = 'skip' WHERE kind = 'item' AND (status = 'Declined' OR parent_id IN (SELECT id FROM quote_items WHERE kind = 'group' AND status = 'Declined'))`)
    const st = await client.execute(`UPDATE quote_items SET status = 'Pending' WHERE status <> 'Pending'`)
    const team = rows<Record<string, unknown>>(await client.execute(`SELECT id, name, email, role, is_you, signature_kind, signature_name, signature_data, signature_consent FROM members`))
      .map((m) => ({ id: String(m.id), name: String(m.name ?? ''), email: (m.email as string | null) ?? null, role: String(m.role ?? ''), isYou: Number(m.is_you) === 1,
        signatureKind: (m.signature_kind as string | null) ?? null, signatureName: (m.signature_name as string | null) ?? null, signatureData: (m.signature_data as string | null) ?? null, signatureConsent: (m.signature_consent as string | null) ?? null }))
    const qs = rows<{ id: string; lead_id: string; status: string; client_sent_at: number | null; prepared_by: string | null; prepared_json: string | null }>(await client.execute(`SELECT id, lead_id, status, client_sent_at, prepared_by, prepared_json FROM quotes`))
    let kept = 0, cleared = 0
    for (const q of qs) {
      const out = withClient({ status: q.status, clientSentAt: q.client_sent_at })
      if (!out && q.prepared_json) { await client.execute({ sql: 'UPDATE quotes SET prepared_json = NULL WHERE id = ?', args: [q.id] }); cleared++; continue }
      if (!out || q.prepared_json) continue
      const teamIds = rows<{ member_id: string }>(await client.execute({ sql: 'SELECT member_id FROM lead_assignees WHERE lead_id = ?', args: [q.lead_id] })).map((a) => a.member_id)
      const snap = { ...livePrepared({ preparedBy: q.prepared_by, members: team as unknown as Parameters<typeof livePrepared>[0]['members'], teamIds }), at: Date.now() }
      await client.execute({ sql: 'UPDATE quotes SET prepared_json = ? WHERE id = ? AND prepared_json IS NULL', args: [JSON.stringify(snap), q.id] }); kept++
    }
    const n = t.rowsAffected + passedGroups.rowsAffected + st.rowsAffected + kept + cleared
    console.log(n ? `  ${t.rowsAffected} confirmation key(s) · ${passedGroups.rowsAffected} passed-on line(s) made optional · ${st.rowsAffected} line status(es) back to Pending · ${kept} preparer(s) kept · ${cleared} cleared` : '  every quote’s link key, line and preparer already in step')
  }

  /* ── R107 · leads leftovers (pending modules S05 — her "build all of them" 2026-10-11) ─────────────────────────────────────────────────────
     A second client on the lead (testers' L-4): Benjamin Han's wife, Mei Ling Han, is on his household already (round 9's demo) — the lead
     names her as its second client, so Client access reads her as the household she is and new quotes start with her. Idempotent: only a lead
     with no second client is written. Nothing else to seed: the rejected return (Arjun Mehta) demos the appeal, the stage rules read their
     defaults, and a commercial lead's company is typed by the studio. */
  console.log('\nR107 leads leftovers — the second client on a lead')
  {
    const ben = rows<{ lead_id: string; name: string; phone: string }>(await client.execute(`SELECT h.lead_id, p.name, p.phone FROM homeowner_household_links h JOIN homeowner_profiles p ON p.id = h.homeowner_id JOIN leads l ON l.id = h.lead_id
      WHERE l.name = 'Benjamin Han' AND p.name = 'Mei Ling Han' AND h.removed_at IS NULL LIMIT 1`))[0]
    const u = ben ? await client.execute({ sql: `UPDATE leads SET client2_name = ?, client2_phone = ? WHERE id = ? AND client2_name IS NULL`, args: [ben.name, String(ben.phone).replace(/\D/g, '').slice(-8), ben.lead_id] }) : null
    console.log(u?.rowsAffected ? `  ${u.rowsAffected} second client named (Benjamin Han · Mei Ling Han)` : '  every second client already in step')
  }

  /* ── R108 · finance leftovers (pending modules S06 — her "build all of them" 2026-10-11) ───────────────────────────────────────────────────
     A repeating expense (1.0's "Recurring expense", made to work): the studio's design software is paid every month — Dane's September
     expense (R83) is the series' first one; it repeats every month, so October's was logged on 5 Oct by the rule, as the app logs it (the
     same amount, category and GST; no receipt; Dane's — an Owner's counts at once), and the next one is due on 5 Nov. The first one's words lose
     "— September" (a repeat copies them every month). Every day up to the run day is written the way the app's lazy raise would
     (lib/finance/repeats-server.ts); a later day is the app's own to log. Idempotent: a series already set is left as it is; a day already there
     is never written twice (the unique (repeat_of, spent_on)). Expense categories need no seed — the studio starts on the eleven. */
  console.log('\nR108 finance leftovers — a repeating expense')
  {
    const rootId = sid('r83', 'expense:studio-software')
    const root = rows<{ id: string; spent_on: number; repeat_every: string | null; description: string; amount_minor: number; gst_minor: number; category: string; created_by: string; issuing_entity: string | null }>(
      await client.execute({ sql: `SELECT id, spent_on, repeat_every, description, amount_minor, gst_minor, category, created_by, issuing_entity FROM expenses WHERE id = ? AND deleted_at IS NULL`, args: [rootId] }))[0]
    if (!root) console.log('  no design software expense to repeat — left as it is')
    else if (root.repeat_every) console.log('  the design software repeat already in step')
    else {
      const monthAfter = (sec: number, k: number) => { const d = new Date(sec * 1000); const t = new Date(d.getFullYear(), d.getMonth() + k, 1); return Math.floor(new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())).getTime() / 1000) }
      const what = String(root.description).replace(/\s+—\s+September$/, '')
      await client.execute({ sql: `UPDATE expenses SET description = ? WHERE id = ?`, args: [what, rootId] })
      let k = 1, made = 0
      for (; k <= 24 && monthAfter(root.spent_on, k) <= D0; k++) {
        const day = monthAfter(root.spent_on, k)
        const loggedAt = day + 9 * 3600   // that morning, as a read that day would have logged it
        const r = await client.execute({ sql: `INSERT OR IGNORE INTO expenses (id, project_id, vendor_id, category, description, amount_minor, gst_minor, spent_on, paid_by, claimant_id, status, review_note, reviewed_by, reviewed_at, note, created_by, created_at, issuing_entity, repeat_of) VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, 'studio', NULL, 'approved', NULL, ?, ?, NULL, ?, ?, ?, ?)`,
          args: [sid('r108', `expense:studio-software:${day}`), root.category, what, root.amount_minor, root.gst_minor, day, root.created_by, loggedAt, root.created_by, loggedAt, root.issuing_entity, rootId] })   // Dane's own — counted at once, as his own are
        made += r.rowsAffected
      }
      await client.execute({ sql: `UPDATE expenses SET repeat_every = 'month', repeat_next = ? WHERE id = ? AND repeat_every IS NULL`, args: [monthAfter(root.spent_on, k), rootId] })
      console.log(`  “${what}” repeats every month — ${made} logged by its repeat, the next on ${new Date(monthAfter(root.spent_on, k) * 1000).toDateString()}`)
    }
  }

  /* ── R109 · projects leftovers (pending modules S07 — her "build all of them" 2026-10-11) ─────────────────────────────────────────────────
     Two records put in step with the app's rules. (1) A credit note's entry in Files › Payments IS its paper — its page, printed, is its PDF (the
     invoices' and receipts' rule; Files' Download opens it printing): R82's third step had given the credit notes' entries a stand-in page that
     only named them (R84 makes the notes after R82 has looked, so the second run caught them), so those bytes, their picture and their size go.
     (2) A lead's 3-D layout that a lead with a live project still holds becomes the project's, as Won now carries it (lib/projects/create.ts
     `carryLeadLayouts`), with its Activity line. Nothing seeded: an overpayment is the studio's to record (the app makes its credit note), and a
     lead's layout is started from the lead page. Idempotent. */
  console.log('\nR109 projects leftovers — money papers in Files, a lead’s layouts')
  {
    const hasCn = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'credit_notes'`))[0]?.n ?? 0)
    let papers = 0
    if (hasCn) {
      const stand = rows<{ id: string }>(await client.execute(`SELECT f.id FROM lead_files f JOIN credit_notes c ON c.file_id = f.id WHERE EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id)`))
      for (const f of stand) {
        await client.execute({ sql: `DELETE FROM lead_file_images WHERE file_id = ?`, args: [f.id] })
        await client.execute({ sql: `DELETE FROM lead_file_thumbs WHERE file_id = ?`, args: [f.id] })
        await client.execute({ sql: `UPDATE lead_files SET size_bytes = NULL, thumb = CASE WHEN thumb = '/files/thumb/' || id THEN NULL ELSE thumb END WHERE id = ?`, args: [f.id] })
        papers++
      }
    }
    let carried = 0
    for (const l of rows<{ id: string; name: string; lead: string; pid: string; pname: string; pnumber: string; at: number }>(await client.execute(`SELECT l.id, l.name, l.lead_id AS lead, p.id AS pid, p.name AS pname, p.number AS pnumber, p.created_at AS at
        FROM space_layouts l JOIN projects p ON p.lead_id = l.lead_id AND p.deleted_at IS NULL WHERE l.project_id IS NULL AND l.lead_id IS NOT NULL AND coalesce(l.is_template, 0) = 0`))) {
      const u = await client.execute({ sql: `UPDATE space_layouts SET project_id = ? WHERE id = ? AND project_id IS NULL`, args: [l.pid, l.id] })
      if (!u.rowsAffected) continue
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?, ?, 'project_layout_linked', NULL, ?, ?, ?)`,
        args: [sid('r109', `carried:${l.id}`), l.lead, l.at, JSON.stringify({ name: l.pname, number: l.pnumber, id: l.id, title: l.name, carried: true }), l.pid] })
      carried++
    }
    console.log(papers || carried ? `  ${papers} credit note entr${papers === 1 ? 'y' : 'ies'} back to ${papers === 1 ? 'its' : 'their'} paper · ${carried} lead layout(s) carried to their project` : '  every money paper’s entry and every lead’s layout already in step')
  }

  /* ── R110 · setting up a new studio (pending modules S08 — her "build all of them" 2026-10-11) ─────────────────────────────────────────────
     (1) The first-visit welcome is owed to a member from the moment they are added (Company › Members › Add member) until their first visit.
     Every demo member has long been in the app — they joined before the welcome existed — so none is owed it, and each carries that first
     visit: their earliest trace in the studio (a lead put on them, something they did, a bell row of theirs), else the run day. A member added
     in the app (owed theirs) is left as it is. (2) Set up your studio: the demo studio is set up — every step is done by its own record (the
     brand kit's logo, the studio's details and bank on Company › Profile, its members, published quote templates, the Price book, the Google
     Ads webhook) — so its list is finished (`studio_setup.doneAt`, the day its last record was saved) and never shows by itself; written only
     when every step reads done and the studio has no record yet. Idempotent. */
  console.log('\nR110 setting up a new studio — first visits, the set-up list')
  {
    const u = await client.execute({ sql: `UPDATE members SET welcomed_at = coalesce(
        (SELECT min(t) FROM (SELECT min(assigned_at) AS t FROM lead_assignees WHERE member_id = members.id
                              UNION ALL SELECT min(at) FROM lead_events WHERE actor_id = members.id
                              UNION ALL SELECT min(created_at) FROM notifications WHERE member_id = members.id)), ?)
      WHERE welcome_due = 0 AND welcomed_at IS NULL`, args: [D0] })
    const has = rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM settings WHERE key = ?`, args: [SETUP_KEY] }))[0]?.n ?? 0
    let note = 'the set-up record already there'
    if (!Number(has)) {
      const val = async (key: string) => { const r = rows<{ value: string; updated_at: number }>(await client.execute({ sql: `SELECT value, updated_at FROM settings WHERE key = ?`, args: [key] }))[0]; return r ? { json: JSON.parse(String(r.value)) as unknown, at: Number(r.updated_at) } : null }
      const [brandRow, studioRow, captureRow] = [await val('brand'), await val('studio'), await val('lead_capture')]
      const brand = brandRow ? parseBrandSetting(brandRow.json) : DEFAULT_BRAND_SETTING
      const capture = parseLeadCapture(captureRow?.json ?? null)
      const own = brand.details.entities[0]
      const one = async (q: string) => Number(rows<{ n: number }>(await client.execute(q))[0]?.n ?? 0)
      const tpl = rows<{ name: string; is_default: number }>(await client.execute(`SELECT name, is_default FROM quote_templates WHERE deleted_at IS NULL AND status = 'published'`))
      const facts: SetupFacts = {
        details: { address: brand.details.address, uen: brand.details.uen, phone: String((studioRow?.json as { phone?: unknown } | undefined)?.phone ?? '') || brand.details.phone, email: brand.details.email },
        logo: !!brand.kit.logo,
        bank: { bankName: own?.bankName ?? '', accountNo: own?.accountNo ?? '', payNow: own?.payNow ?? '' },
        members: await one(`SELECT count(*) AS n FROM members WHERE is_active = 1`),
        templates: { published: tpl.length, defaultName: tpl.find((t) => Number(t.is_default) === 1)?.name ?? null },
        book: await one(`SELECT count(*) AS n FROM price_book_items WHERE deleted_at IS NULL AND status = 'live'`),
        capture: { gmail: capture.email.connected, meta: capture.meta.connected, webhooks: capture.webhooks.filter((w) => w.active).length },
      }
      const open = setupRows(facts).filter((r) => !r.done)
      if (open.length) note = `the set-up list left open — ${open.map((r) => r.label).join(', ')} still to do`
      else {
        const last = Math.max(brandRow?.at ?? 0, captureRow?.at ?? 0) || D0
        await client.execute({ sql: `INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`, args: [SETUP_KEY, JSON.stringify({ seenOpenAt: null, doneAt: last * 1000, hidden: {} }), last] })
        note = 'the demo studio’s set-up list finished — every step done by its record'
      }
    }
    console.log(`  ${u.rowsAffected ? `${u.rowsAffected} member(s) given their first visit` : 'every member’s first visit already in step'} · ${note}`)
  }

  /* ── R111 · the demo's AI credits month holds today (pending modules S08b — S19's "the demo credits month riding the demo day", moved
     forward) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     R63 wrote the demo's credits story once, on 28 Sep — the month 10 Sep → 10 Oct, 18 days in. Once that month ends, the first page the app
     serves rolls it (a new empty month, a "credits are in" bell row): the demo reads "nothing used this month", last month loses Kevin Ng's
     renders, and every probe's first page writes. So when the DEMO's month has ended, the whole story moves by whole days to sit as R63 made
     it — today 18 days into the month, last month's history behind it, nothing after today (lib/credits/demo-month.ts `reanchorDays`): the
     plan's months, every ledger row (and its period refs), the invoices (numbered by their new month), the checkouts, the asks, the monthly
     amounts, the alerts' month and the credits bell rows. Guarded to R63's own shape, so a studio's real history never moves: the current
     plan is the one R63 wrote (its id), the balance's month is that plan's, and the month has ended without the app rolling it (any read
     would have). Since S19 the AI work those charges paid for rides with them (R118). Idempotent: once the month holds today, nothing moves. */
  console.log('\nR111 the demo’s AI credits month holds today')
  {
    const { CREDIT_BOOKKEEPING, DEMO_CREDIT_TIMES, invoiceNumberAt, reanchorDays, shiftAlertsValue } = await import('../lib/credits/demo-month')
    const [bal] = rows<{ period_start: number; period_end: number }>(await client.execute(`SELECT period_start, period_end FROM studio_credit_balances WHERE id = 'studio'`))
    const live = rows<{ id: string; current_period_end: number }>(await client.execute(`SELECT id, current_period_end FROM subscriptions WHERE cancelled_at IS NULL`))
    const latest = Number(rows<{ at: number | null }>(await client.execute(`SELECT max(created_at) AS at FROM credit_ledger`))[0]?.at ?? 0)
    const demo = live.length === 1 && live[0]!.id === sid('credits', 'sub-pro')
    let note: string
    if (!bal) note = 'no credits yet'
    else if (Number(bal.period_end) > NOW) note = `the month holds today (${fmt(Number(bal.period_start))} → ${fmt(Number(bal.period_end))}) — nothing to move`
    else if (!demo || Number(live[0]!.current_period_end) !== Number(bal.period_end)) note = 'the month ended on a plan that is not the demo’s — the app rolls it on its next read'
    else {
      /* (pending modules S19) the work the charges paid for rides with them — so its newest stamp caps the move too, as restore's does */
      const days = reanchorDays({ periodStart: Number(bal.period_start), periodEnd: Number(bal.period_end), latest: Math.max(latest, await paidWorkLatest(), Number(bal.period_start)), now: NOW })
      if (days == null || days <= 0) note = 'the story is newer than its month — left for the app to roll'
      else {
        const shift = days * D
        const batch: InStatement[] = []
        for (const t of DEMO_CREDIT_TIMES) {
          const where = t.only ? ` WHERE ${t.only.column} IN (${t.only.values.map(() => '?').join(', ')})` : ''
          batch.push({ sql: `UPDATE ${t.table} SET ${t.times.map((c) => `${c} = ${c} + ?`).join(', ')}${where}`, args: [...t.times.map(() => shift), ...(t.only?.values ?? [])] })   // a NULL stamp stays NULL
        }
        batch.push({ sql: `UPDATE credit_ledger SET ref_id = 'period:' || (CAST(substr(ref_id, 8) AS INTEGER) + CAST(? AS INTEGER)) WHERE ref_id GLOB 'period:[0-9]*'`, args: [shift] })   // a bound number arrives as a REAL — the text would read "….0" 
        /* each invoice keeps its running number under its new month — through a placeholder, so two numbers never meet half-way */
        const inv = rows<{ id: string; invoice_number: string; issued_at: number }>(await client.execute(`SELECT id, invoice_number, issued_at FROM invoices`))
        const renamed = inv.map((r) => ({ id: r.id, from: r.invoice_number, to: invoiceNumberAt(r.invoice_number, Number(r.issued_at) + shift) }))
        const moving = new Set(renamed.map((r) => r.to)).size === renamed.length ? renamed.filter((r) => r.to !== r.from) : []
        for (const r of moving) batch.push({ sql: `UPDATE invoices SET invoice_number = ? WHERE id = ?`, args: [`~${r.id}`, r.id] })
        for (const r of moving) batch.push({ sql: `UPDATE invoices SET invoice_number = ? WHERE id = ?`, args: [r.to, r.id] })
        const [alerts] = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'credit_alerts'`))
        if (alerts) batch.push({ sql: `UPDATE settings SET value = ? WHERE key = 'credit_alerts'`, args: [shiftAlertsValue(String(alerts.value), days)] })
        /* (pending modules S19) the AI work those charges paid for rides with them (lib/credits/demo-month.ts `PAID_WORK_TIMES`) */
        batch.push(...(await paidWorkMoves(days, null)))
        await client.batch(batch, 'write')
        /* a bell row that moved with its work can be one of the newest twelve that went out (R82 · 8) — written now, so a second run finds
           nothing to do */
        const sent = await outboxNewest()
        note = `moved ${days} days: the month is now ${fmt(Number(bal.period_start) + shift)} → ${fmt(Number(bal.period_end) + shift)}${moving.length ? ` · ${moving.map((r) => `${r.from} → ${r.to}`).join(' · ')}` : ''}${sent ? ` · ${sent} outbox message(s) for bells that moved` : ''}`
      }
    }
    /* (S43B · F1-10) the balance's, the plan's and the caps' own "last written" stamps are held at now — the move above is capped by what the
       story tells, not by them (lib/credits/demo-month.ts `CREDIT_BOOKKEEPING`, the restore's `clampCreditBookkeeping`) */
    let held = 0
    for (const { table, column } of CREDIT_BOOKKEEPING) held += (await client.execute({ sql: `UPDATE ${table} SET ${column} = ? WHERE ${column} > ?`, args: [NOW, NOW] })).rowsAffected
    console.log(`  ${note}${held ? ` · ${held} bookkeeping stamp(s) held at now` : ''}`)
  }

  /* ── R112 · inviting your team (pending modules S09 — her "build all of them" 2026-10-11) ───────────────────────────────────────────────
     Company › Members › Add member now sends an invitation (`studio_invitations`, 1.0's table; its messages in the outbox). The demo seeds
     none: every demo member came in long ago (R110), so there is nobody to invite — the Invited state appears when a studio adds someone,
     backed by its own invitation and outbox rows. A member added in the app before this step (owed a welcome, never in) gets no invitation
     written after the fact — that would claim a message that never went; their row offers Send invitation instead. The one thing kept in
     step: a deactivated member's invitation can't still be waiting (deactivating cancels it in the app; a copy made otherwise is closed here,
     as the app would have). Idempotent. */
  console.log('\nR112 inviting your team')
  {
    const closed = await client.execute({ sql: `UPDATE studio_invitations SET status = 'cancelled', cancelled_at = coalesce(cancelled_at, ?) WHERE status = 'pending' AND member_id IN (SELECT id FROM members WHERE is_active = 0)`, args: [NOW * 1000] })
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM studio_invitations`))[0]?.n ?? 0)
    console.log(`  ${n ? `${n} invitation(s) on record` : 'no invitations yet — the demo’s members all came in before them'}${closed.rowsAffected ? ` · ${closed.rowsAffected} left waiting on a deactivated member, cancelled` : ''}`)
  }

  /* ── R113 · Maison AI's Recent (pending modules S10 — her "build all of them" 2026-10-11) ────────────────────────────────────────────────
     The Ask box keeps what a member asked (`maison_questions`) so the sheet's Recent is there tomorrow. The demo seeds none: a question is the
     member's own words, and a Recent made up for them would claim questions nobody asked — it fills as the studio asks. Kept in step: a question
     whose member is gone goes, and a member keeps their newest 20 (the app's own rule). Idempotent. */
  console.log('\nR113 Maison AI’s Recent')
  {
    const gone = await client.execute(`DELETE FROM maison_questions WHERE member_id NOT IN (SELECT id FROM members)`)
    const over = await client.execute(`DELETE FROM maison_questions WHERE id IN (SELECT id FROM (SELECT id, row_number() OVER (PARTITION BY member_id ORDER BY asked_at DESC) AS n FROM maison_questions) WHERE n > 20)`)
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM maison_questions WHERE cleared_at IS NULL`))[0]?.n ?? 0)
    console.log(`  ${n ? `${n} question(s) in members’ Recent` : 'no questions yet — Recent fills as the studio asks'}${gone.rowsAffected ? ` · ${gone.rowsAffected} of a member no longer there, removed` : ''}${over.rowsAffected ? ` · ${over.rowsAffected} past a member’s 20, removed` : ''}`)
  }

  /* ── R114 · The Price book's waste (pending modules S12 — her "build all of them" 2026-10-11) ───────────────────────────────────────────────
     1.0 kept a waste factor on an item (price-book-item-editor.tsx, 0–50 %): what an order adds for cuts and breakage. 2.0 keeps it on My Items
     (`price_book_items.waste_pct`) and applies it when a purchase order is made from the signed quote. The demo's two floor finishes carry the
     shares a Singapore studio orders on top: the 600×600 homogeneous tiles 10 % (both vendors), the vinyl 5 % — so Order from the quote on
     Ryan's, Benjamin's and Aisha's projects orders their vinyl with its waste, and says so. Set only while nobody has changed an item's waste
     by hand (its History has no Waste change). Idempotent. */
  console.log('\nR114 the Price book’s waste')
  {
    const untouched = (alias: string) => `NOT EXISTS (SELECT 1 FROM price_book_changes c WHERE c.item_id = ${alias}.id AND c.changes LIKE '%"wastePct"%')`
    const tiles = await client.execute(`UPDATE price_book_items SET waste_pct = 10 WHERE id IN ('pb-tiles-hafary', 'pb-tiles-sbh') AND waste_pct = 0 AND ${untouched('price_book_items')}`)
    const vinyl = await client.execute(`UPDATE price_book_items SET waste_pct = 5 WHERE name = 'Vinyl flooring, supply and install' AND kind = 'purchase' AND waste_pct = 0 AND ${untouched('price_book_items')}`)
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM price_book_items WHERE waste_pct > 0 AND deleted_at IS NULL`))[0]?.n ?? 0)
    console.log(`  ${n} item(s) in My Items with a waste share${tiles.rowsAffected + vinyl.rowsAffected ? ` · ${tiles.rowsAffected + vinyl.rowsAffected} given theirs` : ''}`)
  }

  /* ── R115 · The client portal's foot and faces (pending modules S13 — her "build all of them" 2026-10-11) ────────────────────────────────
     1.0 linked a studio's Privacy · Terms · Contact pages at the foot of every branded portal page (its Studio Profile's Footer Links); 2.0
     keeps them under `settings.portal_links` (Company › Client portal › Privacy and terms). The demo sets none: a privacy notice is the studio's
     own page on its own website, and a made-up address would open nothing — so Getting it live shows the privacy notice as the step still to
     do. Kept honest for a port or a tester's copy: a link that is not a web address is dropped (the app's own `parseFootLinks`). And the
     portal's face form (`face:<address>/<picture>|<tint>`, made for a client's page) is never a member's stored look. Idempotent. */
  console.log('\nR115 the client portal’s foot and faces')
  {
    const row = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'portal_links'`))[0]
    let cleaned = 0, shown = 0
    if (row) {
      let v: unknown = null
      try { v = JSON.parse(row.value) } catch { v = null }
      const keep = parsePortalFootLinks(v)
      shown = portalFootShown(keep).length
      const text = JSON.stringify(keep)
      if (text !== row.value) { await client.execute({ sql: `UPDATE settings SET value = ? WHERE key = 'portal_links'`, args: [text] }); cleaned = 1 }
    }
    const faces = rows<{ id: string; color: string }>(await client.execute(`SELECT id, color FROM members WHERE color LIKE 'face:%'`))
    for (const m of faces) await client.execute({ sql: `UPDATE members SET color = ? WHERE id = ?`, args: [memberLookUnder(m.color) || '#5B7FD7', m.id] })
    console.log(`  ${shown ? `${shown} link(s) at the foot of the portal` : 'no links at the foot of the portal yet — Getting it live asks for the privacy notice'}${cleaned ? ' · a link that was not a web address, dropped' : ''}${faces.length ? ` · ${faces.length} member look(s) in the portal’s face form, put back` : ''}`)
  }

  /* ── R116 · The studio's registrations, as its brand says (pending modules S14 — her "build all of them" 2026-10-11) ─────────────────────
     Card held:settings-company: "Demo shows a CaseTrust badge and award while the record says not done — package flagged · her data call",
     taken as recommended (one-home K2b had left it for her). The demo studio wears the CaseTrust "Accredited" badge in its brand kit (it prints
     on its quotes) and its About page names the award "CaseTrust accredited renovation business · 2019"; its HDB badge and Company › Profile
     carry its HDB licence (HB-09-1234A). Its one record of registrations (settings `compliance_studio`, Company › Profile › Registrations &
     accreditations) had neither. Honest data (REG-343): the record follows what the studio shows — CaseTrust and the HDB Directory of
     Renovation Contractors marked done by its Owner (bizSAFE "Level 3" is not the Enterprise certification the record asks about, and the BCA
     and ACRA rows are steps, not badges: left as they are). Recorded after the studio's last signature, so every contract already signed was
     signed before the studio put CaseTrust on record — no consent is made up — and every signing page from now on carries the disclosure
     and its tick, as an accredited studio's must. Written only for a row the record doesn't hold yet, and only while the brand kit or the
     About page still claims it: a studio that changes its record keeps it. Idempotent. */
  console.log('\nR116 the studio’s registrations, as its brand shows them')
  {
    const val = async (key: string) => { const r = rows<{ value: string }>(await client.execute({ sql: `SELECT value FROM settings WHERE key = ?`, args: [key] }))[0]; if (!r) return null; try { return JSON.parse(String(r.value)) as unknown } catch { return null } }
    const [brandJson, aboutJson, record] = [await val('brand'), await val('studio_about'), ((await val('compliance_studio')) ?? {}) as Record<string, unknown>]
    const brand = brandJson ? parseBrandSetting(brandJson) : null
    const badges = (brand?.kit.badges ?? []).map((b) => { try { return decodeURIComponent(b) } catch { return b } }).join(' ')
    const awards = (Array.isArray((aboutJson as { awards?: unknown } | null)?.awards) ? ((aboutJson as { awards: { name?: unknown }[] }).awards) : []).map((a) => String(a?.name ?? '')).join(' ')
    const claims: Record<string, boolean> = {
      CASETRUST_RENOVATION: /CaseTrust/i.test(badges) || /CaseTrust/i.test(awards),
      HDB_DRC: /HDB/.test(badges) && /Licen[cs]ed/i.test(badges) && !!brand?.details.licence.trim(),
    }
    const owner = rows<{ id: string; welcomed: number | null }>(await client.execute(`SELECT id, welcomed_at AS welcomed FROM members WHERE role = 'Owner' AND is_active = 1 ORDER BY is_you DESC, id LIMIT 1`))[0]
    const lastSign = Number(rows<{ t: number | null }>(await client.execute(`SELECT max(t) AS t FROM (SELECT max(signed_at) AS t FROM contracts UNION ALL SELECT max(signed_at) FROM contract_bundles)`))[0]?.t ?? 0)
    const atSec = Math.min(D0, Math.max(Number(owner?.welcomed ?? 0), lastSign ? lastSign + 3600 : 0) || D0)
    const add = Object.entries(claims).filter(([id, claimed]) => claimed && !(id in record)).map(([id]) => id)
    if (add.length && owner) {
      const next = { ...record, ...Object.fromEntries(add.map((id) => [id, { done: true, by: owner.id, at: atSec * 1000 }])) }
      await client.execute({ sql: `INSERT INTO settings (key, value, updated_at) VALUES ('compliance_studio', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, args: [JSON.stringify(next), atSec] })
    }
    const done = Object.entries({ ...record, ...Object.fromEntries(add.map((id) => [id, { done: true }])) }).filter(([, v]) => (v as { done?: unknown })?.done === true).map(([k]) => k)
    console.log(`  ${done.length ? `${done.length} registration(s) on record: ${done.join(' · ')}` : 'no registration on record'}${add.length ? ` · ${add.length} recorded as the brand shows them` : ' · already in step'}`)
  }

  /* ── R117 · Each member's own notifications (pending modules S18 — her "build all of them" 2026-10-11; Leads Q-42 · Q-43 opened) ──────────
     Your profile › Your notifications keeps, on the member, how their emails come (`notice_email` 'daily' = one summary at 8 AM, null = as they
     happen; `notice_email_at` = when they chose it) and what they muted for themselves (`notice_muted`, a JSON list of event keys). The demo's
     members never chose either — every one hears exactly what the studio's rules send, as before — so nothing is written for them. Kept tidy:
     a choice the app doesn't know goes back to As they happen, a time with no summary chosen goes, and a mute keeps only the notices the studio
     sends (once each, a list, or nothing). A summary is always an email to a member (lib/notifications/summary-server.ts). Idempotent. */
  console.log('\nR117 each member’s own notifications')
  {
    const known = NOTICE_EVENTS.map((e) => e.key)
    const odd = await client.execute(`UPDATE members SET notice_email = NULL, notice_email_at = NULL WHERE notice_email IS NOT NULL AND notice_email != 'daily'`)
    const stray = await client.execute(`UPDATE members SET notice_email_at = NULL WHERE notice_email IS NULL AND notice_email_at IS NOT NULL`)
    let tidied = 0
    for (const m of rows<{ id: string; muted: string }>(await client.execute(`SELECT id, notice_muted AS muted FROM members WHERE notice_muted IS NOT NULL`))) {
      const list = parseNoticeMuted(m.muted, known)
      const next = list.length ? JSON.stringify(known.filter((k) => list.includes(k))) : null
      if (next !== m.muted) { await client.execute({ sql: `UPDATE members SET notice_muted = ? WHERE id = ?`, args: [next, m.id] }); tidied++ }
    }
    const daily = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM members WHERE notice_email = 'daily'`))[0]?.n ?? 0)
    const muting = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM members WHERE notice_muted IS NOT NULL`))[0]?.n ?? 0)
    console.log(`  ${daily ? `${daily} member(s) take a daily summary` : 'no member takes a daily summary'} · ${muting ? `${muting} member(s) muted a notice` : 'nothing muted'}${odd.rowsAffected + stray.rowsAffected + tidied ? ` · ${odd.rowsAffected + stray.rowsAffected + tidied} choice(s) tidied` : ''}`)
  }

  /* ── R140 · Meetings and the Meeting Co-Pilot (pending modules S23 — her "build all of them" 2026-10-11) ────────────────────────────────
     A meeting lives on its lead: a planned one carries its reminder task (`lead_tasks.meeting_id`), a held one IS the Met step's log (its
     entry carries `meetingId`), never a second record. The demo shows both moments, each backed by what the app itself would have written:
       · Kevin Ng (Met) — the first consultation the Met log records (13 Aug, in person) was written up from the studio's notes: the log entry
         holds the meeting, the brief is made by the same rule the app runs (lib/meetings/engine.ts `readMeeting` → brief.ts `briefOf`, the
         studio's own answers and checklist read in), 1.0's objection log rows from it, and the brief NOT saved to the lead yet — the Meetings
         tab shows "Save to the lead" waiting. Written up after the meeting, so nothing was metered (write-ups are never charged) — no ledger row.
       · Jonathan Teo (Contacted, Alex) — Alex planned a first consultation two days ahead at 3 PM at One Pearl Bank, with its reminder task
         for Alex on the meeting's own hour (`Meet Jonathan — first consultation`), as planMeeting writes. Not yet sent to the client.
     Kept in step: a Met log that points at a meeting deleted for good lets go of it (the app's deleteMeetingsForever does the same now); a
     planned meeting's open reminder is due on the meeting's hour. Each is written only while the lead is where the story has it and the
     studio hasn't made its own meeting there. Idempotent (fixed ids from `sid`). */
  console.log('\nR140 meetings')
  {
    const KEVIN = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', JONATHAN = '7633b5fe-6d14-4d03-811b-83825ef185c6'
    const say: string[] = []
    type LeadRow = { id: string; name: string; stage: string; property_type: string; property_address: string | null; deleted_at: number | null }
    const leadOf = async (id: string) => rows<LeadRow>(await client.execute({ sql: `SELECT id, name, stage, property_type, property_address, deleted_at FROM leads WHERE id = ?`, args: [id] }))[0]
    const team = rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM members WHERE is_active = 1`))
    const activeIds = new Set(team.map((t) => t.id))

    /* the studio's playbook, read as fetchPlaybook reads it */
    type AnswerSql = { id: string; default_key: string | null; objection_type: string; objection_title: string; objection_description: string | null; recommended_response: string; is_active: number; sort_order: number; deleted_at: number | null }
    const answers = meetingAnswersFrom(rows<AnswerSql>(await client.execute(`SELECT * FROM studio_objection_responses`)).map((r) => ({ id: r.id, defaultKey: r.default_key, objectionType: r.objection_type, objectionTitle: r.objection_title, objectionDescription: r.objection_description, recommendedResponse: r.recommended_response, isActive: !!r.is_active, sortOrder: r.sort_order, deletedAt: r.deleted_at })))
    const rivals = rows<{ name: string }>(await client.execute(`SELECT competitor_name AS name FROM studio_competitor_list WHERE deleted_at IS NULL ORDER BY competitor_name`)).map((r) => r.name)
    const ids = (v: string | null) => { try { const a = JSON.parse(v ?? '[]'); return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
    const own = rows<{ id: string; label: string; category: string; objective_types: string; detection_keywords: string }>(await client.execute(`SELECT id, label, category, objective_types, detection_keywords FROM studio_checklist_items WHERE deleted_at IS NULL ORDER BY sort_order, created_at`))
      .map((i) => ({ id: i.id, label: i.label, category: i.category, aims: ids(i.objective_types), words: ids(i.detection_keywords).length ? ids(i.detection_keywords) : meetingParseWords(i.label) }))
    const copilotRow = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'meeting_copilot'`))[0]
    const copilot = parseCopilotSettings(copilotRow ? (() => { try { return JSON.parse(copilotRow.value) } catch { return null } })() : null)

    /* ── Kevin Ng: the Met log's meeting, written up ── */
    const kevin = await leadOf(KEVIN)
    const kevinMembers = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at`, args: [KEVIN] })).map((r) => r.member_id).filter((id) => activeIds.has(id))
    const metLog = rows<{ id: string; payload: string; created_at: number; moved_by: string | null }>(await client.execute({ sql: `SELECT id, payload, created_at, moved_by FROM stage_logs WHERE lead_id = ? AND to_stage = 'Met' ORDER BY created_at DESC LIMIT 1`, args: [KEVIN] }))[0]
    const kevinMeeting = sid(KEVIN, 'meeting:met-1')
    if (kevin && !kevin.deleted_at && STAGES.indexOf(kevin.stage as (typeof STAGES)[number]) >= STAGES.indexOf('Met') && metLog && kevinMembers.length) {
      const payload = JSON.parse(metLog.payload) as { meetings?: { where?: string; when?: string; notes?: string; meetingId?: string }[] }
      const entry = payload.meetings?.[0]
      const startsAt = entry?.when ? parseInputDateTime(entry.when) : null
      const has = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM meetings WHERE id = ?`, args: [kevinMeeting] }))[0]?.n ?? 0) > 0
      const otherOwn = entry?.meetingId && entry.meetingId !== kevinMeeting
      if (entry && startsAt && !otherOwn) {
        if (!has) {
          const by = kevinMembers.includes('dane') ? 'dane' : kevinMembers[0]!
          const writtenAt = Math.max(metLog.created_at * 1000 + H * 1000, startsAt.getTime() + 3 * H * 1000)
          const notes = [
            'Kevin: We bought the semi-D at Watten House, about 3,000 sq ft over three floors.',
            'Kevin: We want to redo the whole home — the kitchen, the four bathrooms and the wardrobes in every bedroom.',
            'Dane: What budget are you working with?',
            'Kevin: We’re thinking around 260k for everything, maybe a little more for the kitchen.',
            'Kevin: We like contemporary, with warm wood and stone, nothing too cold.',
            'Kevin: We’d like to move in before Chinese New Year.',
            'Kevin: Honestly the price feels a bit high compared with what we expected.',
            'Kevin: We’re also comparing with another studio.',
            'Kevin: My wife and I will decide together after we see the quote.',
            'Dane: We’ll send the quote and a mood board this week.',
          ].join('\n')
          const aim = 'first_consultation', whereKind = entry.where && ['In person', 'Video call', 'Showroom'].includes(entry.where) ? entry.where : 'In person'
          const reading = readMeeting({ notes, aim, client: kevin.name, members: team.map((t) => t.name), own, state: parseMeetingState(null), answers, competitors: rivals, weights: copilot.weights, features: copilot.features })
          const brief = meetingBriefOf({ reading, meeting: { aim, whereKind, startsAt: startsAt.getTime() }, lead: { name: kevin.name, propertyType: kevin.property_type }, features: copilot.features, madeFrom: 'notes', now: writtenAt })
          await client.batch([
            { sql: `INSERT INTO meetings (id, lead_id, project_id, aim, where_kind, place, starts_at, ends_at, status, member_ids, source, notes, file_ids, state_json, brief_json, brief_at, created_by, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'held', ?, 'notes', ?, '[]', '{}', ?, ?, ?, ?, ?)`,
              args: [kevinMeeting, KEVIN, aim, whereKind, kevin.property_address, startsAt.getTime(), startsAt.getTime() + 60 * 60_000, JSON.stringify(kevinMembers), notes, JSON.stringify(brief), writtenAt, by, writtenAt, writtenAt] },
            ...brief.objections.slice(0, 40).map((o, i) => ({ sql: `INSERT OR IGNORE INTO copilot_objection_log (id, meeting_id, lead_id, member_id, objection_type, objection_description, competitor_name, recommended_response, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [sid(kevinMeeting, `objection:${i}`), kevinMeeting, KEVIN, by, o.kind, o.said, o.competitor, o.answer, writtenAt] })),
          ], 'write')
          say.push(`Kevin Ng’s Met log written up as a meeting (${brief.objections.length} objection(s) logged, brief waiting to be saved)`)
        }
        if (entry.meetingId !== kevinMeeting) {
          payload.meetings![0] = { ...entry, meetingId: kevinMeeting }
          await client.execute({ sql: `UPDATE stage_logs SET payload = ? WHERE id = ?`, args: [JSON.stringify(payload), metLog.id] })
          say.push('Kevin Ng’s Met log holds its meeting')
        }
      }
    }

    /* ── Jonathan Teo: a first consultation Alex planned, with its reminder ── */
    const jon = await leadOf(JONATHAN)
    const jonMeeting = sid(JONATHAN, 'meeting:first-consultation')
    const alexOn = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM lead_assignees WHERE lead_id = ? AND member_id = 'alex'`, args: [JONATHAN] }))[0]?.n ?? 0) > 0
    const jonOwn = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM meetings WHERE lead_id = ? AND id != ?`, args: [JONATHAN, jonMeeting] }))[0]?.n ?? 0)
    const jonHas = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM meetings WHERE id = ?`, args: [jonMeeting] }))[0]?.n ?? 0) > 0
    if (jon && !jon.deleted_at && jon.stage === 'Contacted' && alexOn && activeIds.has('alex') && !jonOwn && !jonHas) {
      const startsSec = D0 + 2 * D + 15 * H, plannedSec = D0 - D + 11 * H
      const taskId = sid(jonMeeting, 'task:reminder')
      const title = `Meet ${meetingFirstOf(titleCaseName(jon.name))} — ${meetingAimLabel('first_consultation').toLowerCase()}`
      await client.batch([
        { sql: `INSERT INTO meetings (id, lead_id, project_id, aim, where_kind, place, starts_at, ends_at, status, member_ids, notes, file_ids, state_json, created_by, created_at, updated_at) VALUES (?, ?, NULL, 'first_consultation', 'In person', ?, ?, ?, 'planned', '["alex"]', '', '[]', '{}', 'alex', ?, ?)`,
          args: [jonMeeting, JONATHAN, jon.property_address, startsSec * 1000, (startsSec + H) * 1000, plannedSec * 1000, plannedSec * 1000] },
        { sql: `INSERT OR IGNORE INTO lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, updated_at, meeting_id) VALUES (?, ?, ?, 'Follow-up', ?, 0, ?, 'alex', ?, ?)`, args: [taskId, JONATHAN, title, startsSec, plannedSec, plannedSec, jonMeeting] },
        { sql: `INSERT INTO task_assignees (task_id, member_id) SELECT ?, 'alex' WHERE NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND member_id = 'alex')`, args: [taskId, taskId] },
      ], 'write')
      say.push(`a first consultation with Jonathan Teo planned by Alex for ${fmt(startsSec)}, with its reminder`)
    }

    /* ── kept in step ── */
    const dangling = rows<{ id: string; payload: string }>(await client.execute(`SELECT DISTINCT s.id, s.payload FROM stage_logs s, json_each(s.payload, '$.meetings') j WHERE s.to_stage = 'Met' AND json_valid(s.payload) AND json_extract(j.value, '$.meetingId') IS NOT NULL AND json_extract(j.value, '$.meetingId') NOT IN (SELECT id FROM meetings)`))
    const known = new Set(rows<{ id: string }>(await client.execute(`SELECT id FROM meetings`)).map((r) => r.id))
    for (const d of dangling) {
      const p = JSON.parse(d.payload) as { meetings: { meetingId?: string }[] }
      p.meetings = p.meetings.map((x) => { if (!x?.meetingId || known.has(x.meetingId)) return x; const { meetingId: _gone, ...rest } = x; void _gone; return rest })
      await client.execute({ sql: `UPDATE stage_logs SET payload = ? WHERE id = ?`, args: [JSON.stringify(p), d.id] })
    }
    if (dangling.length) say.push(`${dangling.length} Met log(s) let go of a meeting deleted for good`)
    const moved = await client.execute(`UPDATE lead_tasks SET due_at = (SELECT m.starts_at / 1000 FROM meetings m WHERE m.id = lead_tasks.meeting_id) WHERE done = 0 AND kind = 'Follow-up' AND meeting_id IN (SELECT id FROM meetings WHERE status = 'planned' AND deleted_at IS NULL) AND due_at != (SELECT m.starts_at / 1000 FROM meetings m WHERE m.id = lead_tasks.meeting_id)`)
    if (moved.rowsAffected) say.push(`${moved.rowsAffected} reminder(s) put back on their meeting’s hour`)
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM meetings WHERE deleted_at IS NULL`))[0]?.n ?? 0)
    console.log(`  ${n} meeting(s) on record${say.length ? ` · ${say.join(' · ')}` : ''}`)
  }

  /* ── R118 · A render and its charge are one moment (pending modules S19 — the S08b note) ────────────────────────────────────────────
     A charge is taken when the work starts (Q-31). S08b moved the demo's credits story to hold today's month but left the renders on their
     own day, so Usage › Activity dated a charge two weeks after the version it paid for. Decided (the smallest honest answer): the work the
     credits paid for rides with its charges. Here the base is lined up once — each charged render moves onto its charge's day (a design is
     lined up only when every charged render of it sits the same whole number of days from its charge; a studio's own renders, charged the
     moment they ran, never move), and so does a pin made on a version before the version's new day. Nothing that already followed the
     versions moves (the links sent, the client's answers, the renders filed in Files), so a link that closed stays closed. From then on the
     restore and R111 move the paid work and its charges together, by the same days (lib/credits/demo-month.ts `PAID_WORK_TIMES`).
     Idempotent: lined up, nothing moves. */
  console.log('\nR118 a render and its charge are one moment')
  {
    const { paidWorkOffsets, shiftMsList } = await import('../lib/credits/demo-month')
    const offsets = paidWorkOffsets(await paidWorkRows(null))
    const said: string[] = []
    for (const [design, days] of offsets) {
      const shift = days * D
      const jobs = rows<{ id: string; created_at: number }>(await client.execute({ sql: `SELECT j.id, j.created_at FROM render_jobs j JOIN project_rooms r ON r.id = j.room_id WHERE r.design_id = ? AND EXISTS (SELECT 1 FROM credit_ledger l WHERE l.reason = 'spend' AND l.ref_id = 'render:' || j.id)`, args: [design] }))
      if (!jobs.length) continue
      if (Math.max(...jobs.map((j) => Number(j.created_at))) + shift > NOW) { said.push(`${design.slice(0, 8)}: left — ${days} days would put a version after now`); continue }
      const batch: InStatement[] = []
      let pins = 0
      for (const j of jobs) {
        batch.push({ sql: `UPDATE render_jobs SET created_at = created_at + ?, completed_at = completed_at + ? WHERE id = ?`, args: [shift, shift, j.id] })
        for (const a of rows<{ id: string; created_at: number; comments_json: string | null }>(await client.execute({ sql: `SELECT id, created_at, comments_json FROM render_annotations WHERE job_id = ? AND created_at < ?`, args: [j.id, Number(j.created_at) + shift] }))) {
          batch.push({ sql: `UPDATE render_annotations SET created_at = created_at + ?, updated_at = updated_at + ?, comments_json = ? WHERE id = ?`, args: [shift, shift, (shiftMsList(a.comments_json, days) as string | null) ?? null, a.id] })
          pins++
        }
      }
      await client.batch(batch, 'write')
      said.push(`${design.slice(0, 8)}: ${jobs.length} ${jobs.length === 1 ? 'render' : 'renders'}${pins ? ` and ${pins} pin${pins === 1 ? '' : 's'}` : ''} moved ${days > 0 ? '+' : ''}${days} days onto their charges`)
    }
    console.log(`  ${said.length ? said.join(' · ') : 'every charged render sits on its charge’s day — nothing to move'}`)
  }

  /* ── R119 · A floor-plan photo to make a 3D picture from (pending modules S28 — her "build all of them" 2026-10-11; card
     studio:floorplan-isometric-ai) ───────────────────────────────────────────────────────────────────────────────────────────────────
     Farah Ahmad (Contacted — HDB 4-Room at Waterway Sunrise, Punggol; Dane and Sarah on her) answered the studio's first WhatsApp (her contact
     log, 22 Aug 1:45 PM) with a photo of her printed floor plan, and Sarah kept it in her Files › Floor plans when she logged the call, as an
     upload keeps a picture (its own bytes in lead_file_images, its own address). Her open task "Prepare space planning draft" is what Make a 3D
     picture does with it — so there is no layout and no floor_plan_photos row yet: the photo waits for the studio's press (the picture is drawn
     by scripts/planner/floor-plan-photo.mts from the planner's own HDB 4-Room, turned 7° on a desk; "Approx. floor area 93 sqm" is the flat's).
     Written only while Farah is still a lead before Won and has no file of that name. Kept in step: a lead's floor-plan photo whose lead now
     has a live project becomes the project's floor plan, as the Won writer carries it (lib/projects/create.ts `carryLeadFloorPlans` — same
     id, picture, size, original, its Activity line). Idempotent: fixed ids (`sid`), INSERT OR IGNORE. */
  console.log('\nR119 a floor-plan photo to make a 3D picture from')
  {
    const say: string[] = []
    const fs = await import('node:fs')
    const FARAH = 'c9691890-3132-4902-9c2a-d251f6bfda9a'
    const PHOTO = 'Floor plan — Waterway Sunrise.jpg'
    const farah = rows<{ id: string; deleted_at: number | null; stage: string }>(await client.execute({ sql: `SELECT id, deleted_at, stage FROM leads WHERE id = ?`, args: [FARAH] }))[0]
    const won = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM projects WHERE lead_id = ? AND deleted_at IS NULL`, args: [FARAH] }))[0]?.n ?? 0) > 0
    const logged = rows<{ at: number }>(await client.execute({ sql: `SELECT created_at AS at FROM stage_logs WHERE lead_id = ? AND to_stage = 'Contacted' ORDER BY created_at LIMIT 1`, args: [FARAH] }))[0]?.at ?? null
    const had = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM lead_files WHERE lead_id = ? AND name = ? AND deleted_at IS NULL`, args: [FARAH, PHOTO] }))[0]?.n ?? 0) > 0
    const by = rows<{ id: string }>(await client.execute({ sql: `SELECT m.id FROM members m JOIN lead_assignees a ON a.member_id = m.id AND a.lead_id = ? WHERE m.is_active = 1 ORDER BY m.id = 'sarah' DESC, m.id LIMIT 1`, args: [FARAH] }))[0]?.id ?? null
    const file = path.join(process.cwd(), 'public', 'planner', 'demo', 'floor-plan-photo-waterway-sunrise.jpg')
    if (farah && !farah.deleted_at && !won && farah.stage !== 'Won' && logged && by && !had && fs.existsSync(file)) {
      const at = Number(logged) + 15 * 60
      const folders = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND parent_id IS NULL AND deleted_at IS NULL AND lower(name) IN ('floor plans','floor plan','floorplans') LIMIT 1`, args: [FARAH] }))
      const folder = folders[0]?.id ?? sid(FARAH, 'r119:folder')
      if (!folders[0]) await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder','Floor plans',NULL,?,NULL,?,NULL,NULL,?)`, args: [folder, FARAH, at, by, at] })
      const bytes = fs.readFileSync(file)
      const data = `data:image/jpeg;base64,${bytes.toString('base64')}`
      const id = sid(FARAH, 'r119:photo')
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'image',?,?,?,?,?,?,'image/jpeg',?)`, args: [id, FARAH, PHOTO, `/files/img/${id}`, at + 60, folder, by, bytes.length, at + 60] })
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_file_images (file_id, data) VALUES (?, ?)`, args: [id, data] })
      say.push(`Farah Ahmad’s floor-plan photo in her Files › Floor plans (${Math.round(bytes.length / 1024)} KB, kept by ${by})`)
    } else say.push(farah && !won ? 'Farah Ahmad’s floor-plan photo already on record' : 'Farah Ahmad is won or gone — no photo written')
    /* kept in step: a won lead's photos are its project's floor plans (same id) */
    const strays = rows<{ id: string; lead_id: string; file_id: string | null; name: string; width: number; height: number; scale: number | null; picture: string; created_by: string | null; created_at: number; pid: string; pname: string; pnumber: string }>(await client.execute(
      `SELECT f.id, f.lead_id, f.file_id, f.name, f.width, f.height, f.scale_mm_per_px AS scale, f.picture, f.created_by, f.created_at, p.id AS pid, p.name AS pname, p.number AS pnumber FROM floor_plan_photos f JOIN projects p ON p.lead_id = f.lead_id AND p.deleted_at IS NULL ORDER BY f.created_at`))
    /* one live plan per original (the newest photo of a file), the earlier tries put away — the Won writer's rule */
    const newest = new Map<string, string>()
    for (const f of strays) { const k = `${f.pid}:${f.file_id ?? f.id}`, had = strays.find((x) => x.id === newest.get(k)); if (!had || Number(had.created_at) < Number(f.created_at)) newest.set(k, f.id) }
    for (const f of strays) {
      const live = newest.get(`${f.pid}:${f.file_id ?? f.id}`) === f.id
      const hasMain = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM project_floor_plans WHERE project_id = ? AND is_main = 1 AND put_away_at IS NULL`, args: [f.pid] }))[0]?.n ?? 0) > 0
      const maker = f.created_by ? rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM members WHERE id = ?`, args: [f.created_by] }))[0]?.name ?? null : null
      await client.batch([
        { sql: `INSERT OR IGNORE INTO project_floor_plans (id, project_id, lead_id, name, file_id, width, height, is_main, scale_mm_per_px, scale_set_by, scale_set_at, added_by_kind, added_by, added_by_name, created_at, updated_at, put_away_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'studio',?,?,?,?,?)`,
          args: [f.id, f.pid, f.lead_id, f.name, f.file_id, f.width, f.height, live && !hasMain ? 1 : 0, f.scale, f.scale ? f.created_by : null, f.scale ? f.created_at : null, f.created_by, maker, f.created_at, Date.now(), live ? null : Date.now()] },
        { sql: `INSERT OR IGNORE INTO floor_plan_pictures (plan_id, data) VALUES (?, ?)`, args: [f.id, f.picture] },
        { sql: `DELETE FROM floor_plan_photos WHERE id = ?`, args: [f.id] },
        ...(live ? [{ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,'project_floor_plan_added',NULL,?,?,?)`, args: [sid(f.id, 'r119:carried'), f.lead_id, NOW, JSON.stringify({ name: f.pname, number: f.pnumber, id: f.id, title: f.name, by: 'studio', carried: true }), f.pid] }] : []),
      ], 'write')
      say.push(`${f.name}: now on ${f.pnumber}’s Floor plan${live ? '' : ' (an earlier try, put away)'}`)
    }
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R120 · Signing in (pending modules S30 — her "build all of them" 2026-10-11; card onboarding:studio-sign-in) ──────────────────────
     A member signed in on a browser is a `studio_sessions` row (their code checked, 24 hours or 30 days); the demo seeds none — a browser that
     never signed in or out is the demo's own session (lib/auth/paths.ts DEMO_STANDING_SESSION), so the base state needs no row. Kept in step:
     a deactivated member is signed out everywhere (deactivateMember ends their sessions), and a session whose member has gone ends too.
     Idempotent: only a live row moves. */
  console.log('\nR120 signing in')
  {
    const ended = await client.execute({ sql: `UPDATE studio_sessions SET ended_at = ?, ended_reason = 'deactivated' WHERE ended_at IS NULL AND member_id NOT IN (SELECT id FROM members WHERE is_active = 1)`, args: [NOW * 1000] })
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM studio_sessions WHERE ended_at IS NULL`))[0]?.n ?? 0)
    console.log(`  ${n ? `${n} live session(s)` : 'no live sessions — the demo opens as its own session (Dane)'}${ended.rowsAffected ? ` · ${ended.rowsAffected} session(s) of a deactivated or departed member ended` : ''}`)
  }

  /* ── R121 · A new studio joins (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up) ──────────────
     A studio that signs itself up is made in a database of its own beside the demo's (`<the demo's file>.studios/<key>.db`, lib/studios/*) —
     its Owner, its empty brand kit, Free with 1.0's welcome AI credits, the record of its making (`studio_origin`) — never in the demo's: the
     demo carries no `studio_origin` (it is the demo, so its studio block keeps the mock's words) and none of a new studio's first records.
     Nothing to write; the check below keeps the line. */
  console.log('\nR121 a new studio joins')
  {
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM settings WHERE key = 'studio_origin'`))[0]?.n ?? 0)
    console.log(n ? '  the demo’s database holds a sign-up’s record — see the check below' : '  the demo is the demo — a new studio is made in a database of its own')
  }

  /* ── R122 · OpenMaison's website (pending modules S35 — her "build all of them" 2026-10-11; cards public:marketing-website ·
     onboarding:book-a-demo) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
     The site's three records — a demo request (`beta_signups`), a contact message (`contact_messages`), a newsletter address
     (`newsletter_subscribers`), 1.0's tables — are made only by a visitor on the site (app/site/actions.ts); the demo seeds none, so a studio
     that never sees the site loses nothing and the base state needs no row. Kept in step: the team's email of each demo request and contact
     message is in the outbox under its own key (`site:demo:<id>:email` · `site:contact:<id>:email`), to OpenMaison's team, never a member.
     Nothing to write; the checks below keep the lines. */
  console.log('\nR122 OpenMaison\u2019s website')
  {
    const n = rows<{ d: number; c: number; l: number }>(await client.execute(`SELECT (SELECT count(*) FROM beta_signups) AS d, (SELECT count(*) FROM contact_messages) AS c, (SELECT count(*) FROM newsletter_subscribers) AS l`))[0]
    console.log(n && (n.d || n.c || n.l) ? `  ${n.d} demo request(s) · ${n.c} message(s) · ${n.l} newsletter address(es) — a visitor's, kept as sent` : '  no website records — a visitor makes them on the site')
  }

  /* ── R141 · The Marketplace (pending modules S24 — her "build all of them" 2026-10-11; card studio:marketplace) ──────────────────────────
     1.0's Marketplace read Qanvast's brand API, which the 1.0 repo no longer has. The studio's copy of the feed is written here the way a real
     feed writes it: the demo catalogue (lib/marketplace/demo.ts — fourteen invented brands in 1.0's eight categories, their deals, products and
     three banners, in the feed's own shape) through the feed's one mapper (lib/marketplace/feed.ts `rowsFromFeed` → `feedStatements`), every
     date counted from the demo day so each deal runs on it. The studio's own records, each as the app writes them:
       · Floor Xpert is already one of the studio's vendors (Floor Xpert Pte Ltd, Finance › Vendors) — Add to my vendors links a vendor of
         the same name rather than doubling it, so the vendor carries the brand (`vendors.marketplace_brand_id`);
       · its "Vinyl flooring, supply and install" is already in My Items under that vendor — the item names the product it is
         (`price_book_items.marketplace_product_id`), so the product reads "In My Items";
       · Dane asked Oak & Linen for its sofa deal on WhatsApp five days ago (`marketplace_deal_asks`) — the deal says so.
     Kept in step: an ask, a vendor link or a Price book link to a row the feed's copy no longer has lets go. Idempotent. */
  console.log('\nR141 the Marketplace')
  {
    const say: string[] = []
    const feed = marketplaceRows(marketplaceDemoFeed(new Date(D0 * 1000)))
    await client.batch(marketplaceStatements(feed, D0 * 1000), 'write')
    say.push(`${feed.brands.length} brand(s), ${feed.deals.length} deal(s), ${feed.products.length} product(s), ${feed.banners.length} banner(s) in ${feed.categories.length} categories`)
    /* the pictures the catalogue names are the app's own files */
    const pics = [...feed.brands.flatMap((b) => [b.logo, b.cover, ...(JSON.parse(b.gallery) as string[])]), ...feed.deals.map((d) => d.picture), ...feed.products.map((p) => p.picture), ...feed.banners.map((n) => n.picture)]
      .filter((x): x is string => !!x && x.startsWith('/'))
    const missing = pics.filter((x) => { try { return !statSync(path.join(process.cwd(), 'public', x)).isFile() } catch { return true } })
    if (missing.length) say.push(`MISSING ${missing.length} picture(s): ${missing.slice(0, 3).join(', ')}`)
    /* Floor Xpert, the studio's vendor already */
    const FX = 'mkb-4104', VINYL = 'mkp-4231'
    const fxLinked = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM vendors WHERE marketplace_brand_id = ?`, args: [FX] }))[0]?.n ?? 0)
    if (!fxLinked) {
      const twin = rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM vendors WHERE is_active = 1 AND merged_into IS NULL AND marketplace_brand_id IS NULL`)).find((v) => nameKey(v.name) === nameKey('Floor Xpert'))
      if (twin) { await client.execute({ sql: `UPDATE vendors SET marketplace_brand_id = ? WHERE id = ?`, args: [FX, twin.id] }); say.push(`${twin.name} is Floor Xpert on the Marketplace`) }
    }
    const fxVendor = rows<{ name: string }>(await client.execute({ sql: `SELECT name FROM vendors WHERE marketplace_brand_id = ? AND merged_into IS NULL LIMIT 1`, args: [FX] }))[0]?.name ?? null
    const vinylLinked = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM price_book_items WHERE marketplace_product_id = ? AND deleted_at IS NULL`, args: [VINYL] }))[0]?.n ?? 0)
    if (!vinylLinked && fxVendor) {
      const item = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM price_book_items WHERE deleted_at IS NULL AND marketplace_product_id IS NULL AND vendor = ? AND name = 'Vinyl flooring, supply and install' LIMIT 1`, args: [fxVendor] }))[0]
      if (item) { await client.execute({ sql: `UPDATE price_book_items SET marketplace_product_id = ? WHERE id = ?`, args: [VINYL, item.id] }); say.push('My Items’ vinyl flooring is Floor Xpert’s product') }
    }
    /* Dane's ask for Oak & Linen's sofa deal */
    const SOFA_DEAL = 'mkd-4501', askId = sid(SOFA_DEAL, 'ask:dane')
    const dane = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM members WHERE id = 'dane' AND is_active = 1`))[0]?.n ?? 0) > 0
    const asked = Number(rows<{ n: number }>(await client.execute({ sql: `SELECT count(*) AS n FROM marketplace_deal_asks WHERE deal_id = ?`, args: [SOFA_DEAL] }))[0]?.n ?? 0) > 0
    if (dane && !asked && feed.deals.some((d) => d.id === SOFA_DEAL)) {
      await client.execute({ sql: `INSERT OR IGNORE INTO marketplace_deal_asks (id, deal_id, member_id, how, created_at) VALUES (?, ?, 'dane', 'whatsapp', ?)`, args: [askId, SOFA_DEAL, (D0 - 5 * D + 11 * H) * 1000] })
      say.push('Dane asked Oak & Linen for its sofa deal on WhatsApp')
    }
    /* kept in step */
    const a = await client.execute(`DELETE FROM marketplace_deal_asks WHERE deal_id NOT IN (SELECT id FROM marketplace_deals) OR member_id NOT IN (SELECT id FROM members)`)
    const v = await client.execute(`UPDATE vendors SET marketplace_brand_id = NULL WHERE marketplace_brand_id IS NOT NULL AND marketplace_brand_id NOT IN (SELECT id FROM marketplace_brands)`)
    const i = await client.execute(`UPDATE price_book_items SET marketplace_product_id = NULL WHERE marketplace_product_id IS NOT NULL AND marketplace_product_id NOT IN (SELECT id FROM marketplace_products)`)
    if (a.rowsAffected + v.rowsAffected + i.rowsAffected) say.push(`${a.rowsAffected + v.rowsAffected + i.rowsAffected} link(s) to records no longer there let go`)
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R142 · Market Insights (pending modules S25 — her "build all of them" 2026-10-11; card studio:market-insights) ─────────────────────
     1.0's Market Insights listed the articles OpenMaison's staff publish in Platform admin's CMS (one platform table, `market_insights`). The
     studio's copy of the editors' feed is written here the way a real feed writes it: the demo's sample articles (lib/market-insights/demo.ts
     — six published in 1.0's four categories, one draft that never reaches the studio) through the feed's one mapper
     (lib/market-insights/feed.ts `rowsFromFeed` → `feedStatements`), each dated back from the demo day. Every sample says it is one (`sample`),
     every chart's figures are marked illustrative, every picture is the app's own file, and every chart block reads. Idempotent: the feed's
     sync — an article the feed no longer sends is marked removed, never deleted. */
  console.log('\nR142 Market Insights')
  {
    const say: string[] = []
    const feed = insightsDemoFeed(new Date(D0 * 1000))
    const rows = insightsRows(feed)
    await client.batch(insightsStatements(rows, D0 * 1000), 'write')
    say.push(`${rows.length} article(s) in ${new Set(rows.map((r) => r.category)).size} categories (${feed.length - rows.length} draft(s) left with the editors)`)
    const missing = insightsDemoPictures().filter((x) => { try { return !statSync(path.join(process.cwd(), 'public', x)).isFile() } catch { return true } })
    if (missing.length) say.push(`MISSING ${missing.length} picture(s): ${missing.slice(0, 3).join(', ')}`)
    const broken = rows.flatMap((r) => insightsBlocks(r.content).filter((b) => b.t === 'chart' && !b.spec).map(() => r.id))
    if (broken.length) say.push(`UNREADABLE chart(s) in ${[...new Set(broken)].join(', ')}`)
    const unmarked = rows.filter((r) => r.sample && /```chart/.test(r.content) && !/Illustrative figures for the demo/.test(r.content)).map((r) => r.id)
    if (unmarked.length) say.push(`SAMPLE chart(s) not marked illustrative in ${unmarked.join(', ')}`)
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R143 · Team and group chats (pending modules S26 — her "build all of them" 2026-10-11; cards studio:team-chats ·
     api:messages-free-chats) ─────────────────────────────────────────────────────────────────────────────────────────────────────────
     1.0's Inbox held conversations between the studio's members — one-to-one, named groups, a studio-wide room — beside the clients'. The demo
     shows each, as the app itself writes them (lib/projects/studio-chats.ts · app/chat/actions.ts · sendInConversation):
       · the studio's room (id 'studio', every member who opens Messages) — Dane's site walk, Germaine's answer, Hui Min's timesheet reminder;
       · Germaine ↔ Dane (one pair, `pair_key`) — the carpentry margin on Benjamin's quote, answered;
       · "Site team", Dane's group with Germaine, Alex and Michelle — its first line saying so, then the tiler's start at Bedok;
       · Serena Koh's lead (Quote Sent, Germaine's) has its own Team conversation before Won — laminate for the wardrobes, Dane agrees.
     Every member has read every line (each a read mark a minute after the last), so no count changes on the rail; Accounting is in none
     (Messages are not the books'). Fixed ids, dated back from the demo day at first write; idempotent. */
  console.log('\nR143 team and group chats')
  {
    const say: string[] = []
    const day = (n: number, h: number, min: number) => (D0 - n * 86400) * 1000 + (h * 60 + min) * 60_000
    const ws = rows<{ id: string; name: string; role: string; active: number }>(await client.execute(`SELECT id, name, role, is_active AS active FROM members`)).filter((m) => m.role !== 'Accounting')
    const nameOf = new Map(ws.map((m) => [m.id, m.name]))
    const has = (id: string) => nameOf.has(id)
    let wrote = 0
    const conv = async (id: string, kind: string, o: { name?: string | null; leadId?: string | null; pair?: string | null; by: string; at: number }) =>
      (wrote += (await client.execute({ sql: `INSERT OR IGNORE INTO conversations (id, kind, name, lead_id, pair_key, created_by, created_at, last_message_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, args: [id, kind, o.name ?? null, o.leadId ?? null, o.pair ?? null, o.by, o.at, o.at] })).rowsAffected)
    const part = async (conversation: string, member: string, by: string, at: number) =>
      client.execute({ sql: `INSERT OR IGNORE INTO conversation_participants (conversation_id, member_id, added_by, added_at, removed_at, removed_by) VALUES (?, ?, ?, ?, NULL, NULL)`, args: [conversation, member, by, at] })
    const msg = async (id: string, conversation: string, by: string, body: string, at: number, event: string | null = null, meta: unknown = null, attachments: unknown = null) => {
      wrote += (await client.execute({ sql: `INSERT OR IGNORE INTO conversation_messages (id, conversation_id, author_id, author_name, body, attachments, event, meta, created_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        args: [id, conversation, by, nameOf.get(by) ?? by, body, attachments === null ? null : JSON.stringify(attachments), event, meta === null ? null : JSON.stringify(meta), at] })).rowsAffected
      await client.execute({ sql: `UPDATE conversations SET last_message_at = max(coalesce(last_message_at, 0), ?) WHERE id = ?`, args: [at, conversation] })
    }
    /* each reader's mark a minute after the conversation's newest line — the rail's count stays as it was */
    const readAll = async (readId: string, conversation: string, readers: string[]) => {
      const [top] = rows<{ at: number }>(await client.execute({ sql: `SELECT max(created_at) AS at FROM conversation_messages WHERE conversation_id = ?`, args: [conversation] }))
      if (!top?.at) return
      for (const r of readers) await client.execute({ sql: `INSERT OR IGNORE INTO chat_reads (reader_kind, reader_id, project_id, read_at) VALUES ('member', ?, ?, ?)`, args: [r, readId, Number(top.at) + 60_000] })
    }
    if (has('dane') && has('germaine') && has('huimin')) {
      await conv('studio', 'studio', { by: 'dane', at: day(6, 9, 0) })
      await msg('s26-room-1', 'studio', 'dane', 'Morning everyone — site walk at the Tampines BTO on Thursday, 10 AM. Germaine and Alex, please bring the tile samples. The block’s renovation hours are on HDB’s site: https://www.hdb.gov.sg', day(3, 8, 40))
      await msg('s26-room-2', 'studio', 'germaine', 'Noted — I’ll bring the Niro and the Nippon samples.', day(3, 9, 5))
      await msg('s26-room-3', 'studio', 'huimin', 'Reminder: September timesheets by Friday, please. Thank you!', day(1, 17, 5))
      await readAll('chat:studio', 'studio', ws.map((m) => m.id))
      say.push('the studio’s room')
    }
    if (has('dane') && has('germaine')) {
      const pair = ['dane', 'germaine'].sort().join('|')
      await conv('s26-direct-dg', 'direct', { pair, by: 'germaine', at: day(2, 11, 10) })
      for (const m of ['dane', 'germaine']) await part('s26-direct-dg', m, 'germaine', day(2, 11, 10))
      await msg('s26-direct-1', 's26-direct-dg', 'germaine', 'Dane, can you check the carpentry margin on Benjamin’s quote before I send it? It looks thin.', day(2, 11, 10))
      await msg('s26-direct-2', 's26-direct-dg', 'dane', 'Checked — put the wardrobe line up by 8% and it’s fine. Go ahead.', day(2, 11, 42))
      await readAll('chat:s26-direct-dg', 's26-direct-dg', ['dane', 'germaine'])
      say.push('Germaine and Dane')
    }
    const crew = ['dane', 'germaine', 'alex', 'michelle'].filter(has)
    if (crew.length === 4) {
      const at0 = day(5, 10, 0)
      await conv('s26-group-site', 'group', { name: 'Site team', by: 'dane', at: at0 })
      for (const m of crew) await part('s26-group-site', m, 'dane', at0)
      await msg('s26-group-0', 's26-group-site', 'dane', '', at0, 'created', { by: 'Dane', byId: 'dane', names: ['Germaine', 'Alex', 'Michelle'] })
      await msg('s26-group-1', 's26-group-site', 'alex', 'Tiler starts at the Bedok condo tomorrow, 9 AM — I’ll be there for the first hour.', day(2, 9, 15))
      /* Michelle's line carries a picture — a members' conversation keeps its own file (conversation_files), its bytes on the row */
      const board = path.join(process.cwd(), 'public', 'uat-files', 'kitchen-moodboard.jpg')
      let photo: string | null = null
      try {
        const { readFileSync } = await import('node:fs')
        const data = `data:image/jpeg;base64,${readFileSync(board).toString('base64')}`
        await client.execute({ sql: `INSERT OR IGNORE INTO conversation_files (id, conversation_id, name, mime, size_bytes, created_by, created_at, data) VALUES ('s26-file-board', 's26-group-site', 'Kitchen mood board.jpg', 'image/jpeg', ?, 'michelle', ?, ?)`, args: [statSync(board).size, day(2, 9, 27), data] })
        photo = 's26-file-board'
      } catch { say.push('MISSING the mood board picture') }
      await msg('s26-group-2', 's26-group-site', 'michelle', 'Thanks Alex. Here’s the board the client signed off — the grout is the warm grey we agreed.', day(2, 9, 27), null, null, photo ? [{ fileId: photo, kind: 'photo' }] : null)
      await readAll('chat:s26-group-site', 's26-group-site', crew)
      say.push('“Site team”')
    }
    const serena = rows<{ id: string }>(await client.execute(`SELECT l.id FROM leads l WHERE l.name = 'Serena Koh' AND l.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id AND p.deleted_at IS NULL) LIMIT 1`))[0]
    if (serena && has('germaine') && has('dane')) {
      const [had] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM conversations WHERE kind = 'lead' AND lead_id = ?`, args: [serena.id] }))
      const id = had?.id ?? 's26-lead-serena'
      await conv(id, 'lead', { leadId: serena.id, by: 'germaine', at: day(1, 14, 20) })
      await msg('s26-lead-1', id, 'germaine', 'Serena’s budget is tight — I’ll suggest laminate for the wardrobes instead of the solid veneer. Any objections?', day(1, 14, 20))
      await msg('s26-lead-2', id, 'dane', 'Fine by me. Keep the kitchen as quoted.', day(1, 14, 35))
      /* read by its people — Serena's member and whoever wrote in it (the team chat's count and its Seen are theirs) */
      const team = rows<{ id: string }>(await client.execute({ sql: `SELECT member_id AS id FROM lead_assignees WHERE lead_id = ?`, args: [serena.id] })).map((r) => r.id)
      await readAll(`lead-team:${serena.id}`, id, [...new Set([...team, 'germaine', 'dane'])])
      say.push('Serena Koh’s team chat')
    }
    console.log(`  ${wrote} row(s) written · ${say.join(' · ') || 'nothing to do'}`)
  }

  /* ── R144 · Hangouts and designers' public profiles (pending modules S27 — her "build all of them" 2026-10-11; cards public:hangouts ·
     api:designer-portfolio-profiles) ─────────────────────────────────────────────────────────────────────────────────────────────────────
     1.0's Hangouts were Qanvast's events (its own tables, its staff console). The studio's copy of Qanvast's feed is written here the way a
     real feed writes it: the demo's three sample events (lib/hangouts/demo.ts — one that ended three days ago, one today, one in three and a half
     weeks still open) through the feed's one mapper (lib/hangouts/feed.ts `rowsFromFeed` → `feedStatements`), with Qanvast's answer to the
     studio's two applications (confirmed, tables 11 · 12 and 7 · 8). What the studio did, each as the app writes it:
       · its plan for both: who sat at the tables on which shift (Dane and Germaine at Suntec; Germaine, Michelle and Sarah today, their shares
         50 · 25 · 25), who it would like to meet with 1.0's weights, the plan sent to Qanvast, and its own booking page (`page_token`);
       · Suntec's two chats, held: Nur Aisyah (R45's Hangout lead — Dane booked her at the table, a follow-up: "Needs second meeting") and
         Kelvin Goh (booked on the page, with Germaine: converted). Each is its lead's meeting, written up from the notes with its brief by the
         app's own rule (lib/meetings: readMeeting → briefOf), its follow-up task for the designer, the lead held by them;
       · today's three bookings on the page — Lim Wei Ling and Chloe Tan in the morning, Rahul Menon in the evening — each a lead (source
         Hangout) held by the designer the rule picked, waiting at the studio's tables;
       · the designers' public cards: years in interior design and their work, with pictures (the app's own room pictures), for Dane, Germaine,
         Michelle and Sarah — one piece of Dane's is the Siglap terrace the studio handed over (P-2025-001).
     Kept in step: a booking whose lead is gone takes its chats with it; a chat's lead is its booking's; the plan is only on events the studio
     takes part in. Idempotent (fixed ids from `sid`; a sample event keeps the day it was first written — restoreBaseline moves the days). */
  console.log('\nR144 Hangouts and public profiles')
  {
    const say: string[] = []
    const ms = (sec: number) => sec * 1000
    const tok = (seed: string) => createHash('sha256').update(`hangout-token:${seed}`).digest('base64url').slice(0, 24)
    const feed = hangoutRows(hangoutDemoFeed(new Date(D0 * 1000)))
    await client.batch(hangoutStatements(feed, D0 * 1000, (eventId) => sid(eventId, 'hangout:participation')), 'write')
    say.push(`${feed.events.length} Hangout(s) from Qanvast’s feed, ${feed.shifts.length} shift(s)`)
    const team = new Set(rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE is_active = 1`)).map((r) => r.id))
    type Ev = { id: string; starts_on: number; venue: string; name: string }
    const evOf = async (feedRef: string) => rows<Ev>(await client.execute({ sql: `SELECT id, starts_on, venue, name FROM hangout_events WHERE feed_ref = ?`, args: [feedRef] }))[0]
    const shiftsOf = async (eventId: string) => rows<{ id: string; label: string; day_at: number; start_time: string }>(await client.execute({ sql: `SELECT id, label, day_at, start_time FROM hangout_shifts WHERE event_id = ? ORDER BY day_at, position`, args: [eventId] }))
    const at = (dayMs: number, hhmm: string, plusMin = 0) => { const [h, m] = hhmm.split(':').map(Number); const d = new Date(dayMs); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h!, (m ?? 0) + plusMin).getTime() }
    const PAST = await evOf(HANGOUT_DEMO.past), TODAY = await evOf(HANGOUT_DEMO.today)

    /* ── the studio's plan, its page and who it would like to meet ── */
    const plans: { ev: Ev | undefined; sentDaysBefore: number; designers: { id: string; shifts: ('am' | 'pm')[]; share: number | null }[]; prefs: unknown }[] = [
      { ev: PAST, sentDaysBefore: 9, designers: [{ id: 'dane', shifts: ['am', 'pm'], share: null }, { id: 'germaine', shifts: ['am', 'pm'], share: null }],
        prefs: { propertyType: ['HDB', 'Condo'], propertyStatus: ['Resale', 'New'], budgetRange: ['40k-60k', '60k-80k'], keyCollection: 'in 3 months', region: ['East', 'Central'], designStyle: ['Modern', 'Scandinavian', 'Minimalist'], weights: { propertyType: 20, propertyStatus: 15, budgetRange: 25, keyCollection: 15, region: 15, designStyle: 10 } } },
      { ev: TODAY, sentDaysBefore: 5, designers: [{ id: 'germaine', shifts: ['am', 'pm'], share: 50 }, { id: 'michelle', shifts: ['am'], share: 25 }, { id: 'sarah', shifts: ['pm'], share: 25 }],
        prefs: { propertyType: ['HDB', 'Condo', 'Landed'], propertyStatus: ['New', 'Resale'], budgetRange: ['40k-60k', '60k-80k', '80k-100k'], keyCollection: 'in 3 months', region: ['Central', 'East', 'North East'], designStyle: ['Modern', 'Japandi', 'Scandinavian', 'Contemporary'], weights: { propertyType: 20, propertyStatus: 15, budgetRange: 25, keyCollection: 15, region: 15, designStyle: 10 } } },
    ]
    for (const p of plans) {
      if (!p.ev) continue
      const part = rows<{ id: string; status: string; page_token: string | null; plan_sent_at: number | null; preferences_json: string | null }>(await client.execute({ sql: `SELECT id, status, page_token, plan_sent_at, preferences_json FROM hangout_participations WHERE event_id = ?`, args: [p.ev.id] }))[0]
      if (!part || part.status !== 'confirmed') continue
      const sent = p.ev.starts_on - p.sentDaysBefore * D * 1000 + 15 * H * 1000
      await client.execute({ sql: `UPDATE hangout_participations SET page_token = COALESCE(page_token, ?), preferences_json = COALESCE(preferences_json, ?), plan_saved_at = COALESCE(plan_saved_at, ?), plan_sent_at = COALESCE(plan_sent_at, ?), plan_sent_by = COALESCE(plan_sent_by, 'dane'), applied_by = COALESCE(applied_by, 'dane') WHERE id = ?`,
        args: [tok(`page:${p.ev.id}`), JSON.stringify(p.prefs), sent - 20 * 60_000, sent, part.id] })
      const shifts = await shiftsOf(p.ev.id)
      const am = shifts.find((s) => s.label === 'Morning'), pm = shifts.find((s) => s.label !== 'Morning')
      for (const d of p.designers) {
        if (!team.has(d.id)) continue
        const ids = d.shifts.map((x) => (x === 'am' ? am : pm)?.id).filter((x): x is string => !!x)
        await client.execute({ sql: `INSERT OR IGNORE INTO hangout_designers (id, event_id, member_id, shift_ids, share_pct, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, args: [sid(`${p.ev.id}:${d.id}`, 'hangout:designer'), p.ev.id, d.id, JSON.stringify(ids), d.share, sent - 3 * H * 1000, sent - 3 * H * 1000] })
      }
    }
    say.push('the studio’s plans for Suntec and today')

    /* ── the bookings: each a lead (source Hangout), its registration and its chat ── */
    type Booking = { key: string; ev: Ev | undefined; leadId: string; name: string; phone: string; email: string | null; via: 'page' | 'desk'; shift: 'am' | 'pm'; member: string; table: number; bookedSec: number; prefs: HangoutHomeownerPrefs
      lead?: { propertyType: string; address: string; budgetMinor: number; area: string; style: string; condition: string; keys: string; seen: boolean }
      held?: { startMin: number; minutes: number; outcome: 'converted' | 'follow-up'; reason: string; scope: string; notes: string } }
    const pastDay = PAST ? Math.floor(PAST.starts_on / 1000) : 0
    const bookings: Booking[] = [
      { key: 'nur', ev: PAST, leadId: 'plead-hangout', name: 'Nur Aisyah', phone: '91238801', email: 'nur.aisyah@example.com', via: 'desk', shift: 'am', member: 'dane', table: 11, bookedSec: pastDay + 10 * H + 40 * 60,
        prefs: { propertyType: 'HDB 5-Room', status: 'Resale', budget: '40k-60k', keys: 'Collected', area: 'East', styles: ['Modern'] },
        held: { startMin: 10 * 60 + 45, minutes: 45, outcome: 'follow-up', reason: 'Needs second meeting', scope: 'Full renovation of a 5-room resale flat in Tampines',
          notes: ['Nur: We collected the keys last month — a resale 5-room at Tampines St 24.', 'Nur: We want a modern kitchen and both bathrooms redone, and new flooring.', 'Dane: What budget are you working with?', 'Nur: Around 55k for everything.', 'Nur: My husband decides on the kitchen with me — he couldn’t come today.', 'Nur: We’re also talking to two other studios here.', 'Dane: Let’s meet again with your husband this week and walk through the kitchen.'].join('\n') } },
      { key: 'kelvin', ev: PAST, leadId: sid('hangout:kelvin', 'lead'), name: 'Kelvin Goh', phone: '93360518',   /* (S42 B-18, R160) his own number — 9182 7364 is Mei Ling Han's */ email: 'kelvin.goh@example.com', via: 'page', shift: 'pm', member: 'germaine', table: 12, bookedSec: pastDay - 3 * D + 21 * H,
        prefs: { propertyType: 'Condo 3-bedder', status: 'New', budget: '80k-100k', keys: 'in 3 months', area: 'Central', styles: ['Luxury', 'Contemporary'] },
        lead: { propertyType: 'Condo 3-bedder', address: 'Irwell Hill Residences', budgetMinor: 9_000_000, area: 'Central', style: 'Luxury', condition: 'New', keys: 'in 3 months', seen: true },
        held: { startMin: 14 * 60 + 20, minutes: 50, outcome: 'converted', reason: 'Signed', scope: 'A new 3-bedder at Irwell Hill — kitchen, wardrobes and the living room feature wall',
          notes: ['Kelvin: We get the keys in about three months — a new 3-bedder at Irwell Hill Residences.', 'Kelvin: We like warm luxury — marble, brass, dark wood.', 'Germaine: What budget do you have in mind?', 'Kelvin: About 90k, a bit more if the kitchen needs it.', 'Kelvin: We want you to do it. Can you send the quote next week?', 'Germaine: Yes — I’ll start the quote and send a mood board with it.'].join('\n') } },
      { key: 'limwl', ev: TODAY, leadId: sid('hangout:limwl', 'lead'), name: 'Lim Wei Ling', phone: '98123476', email: 'weiling.lim@example.com', via: 'page', shift: 'am', member: 'germaine', table: 7, bookedSec: D0 - 2 * D + 20 * H + 15 * 60,
        prefs: { propertyType: 'BTO 4-Room', status: 'New', budget: '40k-60k', keys: 'in 3 months', area: 'North East', styles: ['Scandinavian', 'Japandi'] },
        lead: { propertyType: 'BTO 4-Room', address: 'Punggol Northshore', budgetMinor: 5_000_000, area: 'North East', style: 'Scandinavian', condition: 'New', keys: 'in 3 months', seen: true } },
      { key: 'chloe', ev: TODAY, leadId: sid('hangout:chloe', 'lead'), name: 'Chloe Tan', phone: '93318842', email: null, via: 'page', shift: 'am', member: 'michelle', table: 8, bookedSec: D0 - D + 9 * H + 5 * 60,
        prefs: { propertyType: 'Condo 2-bedder', status: 'Resale', budget: '60k-80k', keys: 'in 6 months', area: 'West', styles: ['Minimalist'] },
        lead: { propertyType: 'Condo 2-bedder', address: 'The Trilinq, Clementi', budgetMinor: 7_000_000, area: 'West', style: 'Minimalist', condition: 'Resale', keys: 'in 6 months', seen: false } },
      { key: 'rahul', ev: TODAY, leadId: sid('hangout:rahul', 'lead'), name: 'Rahul Menon', phone: '96652018', email: 'rahul.menon@example.com', via: 'page', shift: 'pm', member: 'sarah', table: 8, bookedSec: D0 - D + 18 * H + 30 * 60,
        prefs: { propertyType: 'Landed — Terrace', status: 'Renovated', budget: '100k+', keys: 'Collected', area: 'Central', styles: ['Contemporary'] },
        lead: { propertyType: 'Landed — Terrace', address: 'Jalan Bunga Rampai', budgetMinor: 10_000_000, area: 'Central', style: 'Contemporary', condition: 'Renovated', keys: 'Collected', seen: true } },
    ]
    /* the studio's playbook, read as the app reads it (R140's) — for the briefs of the held chats */
    type AnswerSql = { id: string; default_key: string | null; objection_type: string; objection_title: string; objection_description: string | null; recommended_response: string; is_active: number; sort_order: number; deleted_at: number | null }
    const answers = meetingAnswersFrom(rows<AnswerSql>(await client.execute(`SELECT * FROM studio_objection_responses`)).map((r) => ({ id: r.id, defaultKey: r.default_key, objectionType: r.objection_type, objectionTitle: r.objection_title, objectionDescription: r.objection_description, recommendedResponse: r.recommended_response, isActive: !!r.is_active, sortOrder: r.sort_order, deletedAt: r.deleted_at })))
    const rivals = rows<{ name: string }>(await client.execute(`SELECT competitor_name AS name FROM studio_competitor_list WHERE deleted_at IS NULL ORDER BY competitor_name`)).map((r) => r.name)
    const idsOf = (v: string | null) => { try { const a = JSON.parse(v ?? '[]'); return Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string') : [] } catch { return [] } }
    const own = rows<{ id: string; label: string; category: string; objective_types: string; detection_keywords: string }>(await client.execute(`SELECT id, label, category, objective_types, detection_keywords FROM studio_checklist_items WHERE deleted_at IS NULL ORDER BY sort_order, created_at`))
      .map((i) => ({ id: i.id, label: i.label, category: i.category, aims: idsOf(i.objective_types), words: idsOf(i.detection_keywords).length ? idsOf(i.detection_keywords) : meetingParseWords(i.label) }))
    const copilotRow = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'meeting_copilot'`))[0]
    const copilot = parseCopilotSettings(copilotRow ? (() => { try { return JSON.parse(copilotRow.value) } catch { return null } })() : null)
    const names = rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM members WHERE is_active = 1`)).map((r) => r.name)
    let made = 0
    for (const b of bookings) {
      if (!b.ev || !team.has(b.member)) continue
      const part = rows<{ preferences_json: string | null; status: string }>(await client.execute({ sql: `SELECT preferences_json, status FROM hangout_participations WHERE event_id = ?`, args: [b.ev.id] }))[0]
      if (part?.status !== 'confirmed') continue
      const shift = (await shiftsOf(b.ev.id)).find((s) => (b.shift === 'am' ? s.label === 'Morning' : s.label !== 'Morning'))
      if (!shift) continue
      const regId = sid(`${b.ev.id}:${b.key}`, 'hangout:registration'), hmId = sid(`${b.ev.id}:${b.key}`, 'hangout:meeting')
      if (rows(await client.execute({ sql: `SELECT 1 FROM hangout_registrations WHERE id = ?`, args: [regId] })).length) continue
      /* the lead: the one the number already is (Nur), else a new one from the booking, held by the designer */
      if (b.lead) {
        const clash = rows(await client.execute({ sql: `SELECT 1 FROM leads WHERE phone = ? AND id <> ?`, args: [b.phone, b.leadId] })).length
        if (clash) continue
        const has = rows(await client.execute({ sql: `SELECT 1 FROM leads WHERE id = ?`, args: [b.leadId] })).length
        if (!has) {
          const l = b.lead
          await client.execute({ sql: `INSERT INTO leads (id, name, phone, email, source, property_type, property_address, budget_minor, stage, key_collection, condition, style, area, notes, created_at, updated_at, seen_at) VALUES (?, ?, ?, ?, 'Hangout', ?, ?, ?, 'New', ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [b.leadId, b.name, b.phone, b.email, l.propertyType, l.address, l.budgetMinor, l.keys, l.condition, l.style, l.area, `Booked a chat at ${b.ev.name}.`, b.bookedSec, b.bookedSec, l.seen ? b.bookedSec + 2 * H : null] })
          await client.execute({ sql: `INSERT OR IGNORE INTO lead_assignees (id, lead_id, member_id, assigned_at) VALUES (?, ?, ?, ?)`, args: [`${b.leadId}-a`, b.leadId, b.member, b.bookedSec] })
        }
      } else {
        const lead = rows<{ id: string; created_at: number }>(await client.execute({ sql: `SELECT id, created_at FROM leads WHERE id = ? AND deleted_at IS NULL`, args: [b.leadId] }))[0]
        if (!lead) continue
        /* Dane booked Nur at the table — the lead was made then (R45 wrote it three days back at the run's hour) */
        await client.execute({ sql: `UPDATE leads SET created_at = ?, updated_at = MAX(updated_at, ?) WHERE id = ? AND created_at <> ?`, args: [b.bookedSec, b.bookedSec, b.leadId, b.bookedSec] })
        await client.execute({ sql: `UPDATE lead_assignees SET assigned_at = ?, assigned_by = 'dane' WHERE lead_id = ? AND member_id = ?`, args: [b.bookedSec, b.leadId, b.member] })
      }
      const match = hangoutMatchScore(b.prefs, hangoutStudioPrefs(part.preferences_json))
      const regToken = tok(`reg:${regId}`)
      await client.execute({ sql: `INSERT INTO hangout_registrations (id, event_id, lead_id, name, phone, email, preferences_json, shift_id, via, token, created_by, created_at, link_sent_at, viewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [regId, b.ev.id, b.leadId, b.name, b.phone, b.email, JSON.stringify(b.prefs), shift.id, b.via, regToken, b.via === 'desk' ? b.member : null, ms(b.bookedSec), ms(b.bookedSec + 30), b.via === 'page' ? ms(b.bookedSec + 5 * 60) : null] })
      if (!b.held) {
        await client.execute({ sql: `INSERT INTO hangout_meetings (id, event_id, registration_id, lead_id, member_id, shift_id, table_number, status, match_score, assigned_by, assigned_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 'rule', ?, ?, ?)`,
          args: [hmId, b.ev.id, regId, b.leadId, b.member, shift.id, b.table, match?.score ?? null, ms(b.bookedSec), ms(b.bookedSec), ms(b.bookedSec)] })
        made++
        continue
      }
      const h = b.held
      const start = at(shift.day_at, '00:00', h.startMin), end = start + h.minutes * 60_000
      const notes = `Scope: ${h.scope}\n\n${h.notes}`
      const meetingId = sid(hmId, 'lead-meeting')
      const reading = readMeeting({ notes, aim: 'first_consultation', client: b.name, members: names, own, state: parseMeetingState(null), answers, competitors: rivals, weights: copilot.weights, features: copilot.features })
      const writtenAt = end + 5 * 60_000
      const brief = meetingBriefOf({ reading, meeting: { aim: 'first_consultation', whereKind: 'In person', startsAt: start }, lead: { name: b.name, propertyType: b.prefs.propertyType }, features: copilot.features, madeFrom: 'notes', now: writtenAt })
      const place = `${b.ev.name}, ${b.ev.venue} · Table ${b.table}`
      const title = hangoutFollowUp(h.outcome, h.reason, b.name)
      const taskId = title ? sid(hmId, 'follow-up') : null
      const dueSec = Math.floor(new Date(new Date(D0 * 1000).getFullYear(), new Date(D0 * 1000).getMonth(), new Date(D0 * 1000).getDate() + 1, 10, 0).getTime() / 1000)
      await client.batch([
        { sql: `INSERT OR IGNORE INTO meetings (id, lead_id, project_id, aim, where_kind, place, starts_at, ends_at, status, member_ids, source, notes, file_ids, state_json, brief_json, brief_at, created_by, created_at, updated_at) VALUES (?, ?, NULL, 'first_consultation', 'In person', ?, ?, ?, 'held', ?, 'notes', ?, '[]', '{}', ?, ?, ?, ?, ?)`,
          args: [meetingId, b.leadId, place, start, end, JSON.stringify([b.member]), notes, JSON.stringify(brief), writtenAt, b.member, writtenAt, writtenAt] },
        ...brief.objections.slice(0, 40).map((o, i) => ({ sql: `INSERT OR IGNORE INTO copilot_objection_log (id, meeting_id, lead_id, member_id, objection_type, objection_description, competitor_name, recommended_response, detected_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [sid(meetingId, `objection:${i}`), meetingId, b.leadId, b.member, o.kind, o.said, o.competitor, o.answer, writtenAt] })),
        ...(taskId ? [
          { sql: `INSERT OR IGNORE INTO lead_tasks (id, lead_id, title, kind, due_at, done, created_at, creator_id, updated_at, seen_at) VALUES (?, ?, ?, 'Follow-up', ?, 0, ?, ?, ?, ?)`, args: [taskId, b.leadId, title, dueSec, Math.floor(end / 1000), b.member, Math.floor(end / 1000), Math.floor(end / 1000) + 60] },
          { sql: `INSERT INTO task_assignees (task_id, member_id) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM task_assignees WHERE task_id = ? AND member_id = ?)`, args: [taskId, b.member, taskId, b.member] },
        ] : []),
        { sql: `INSERT INTO hangout_meetings (id, event_id, registration_id, lead_id, member_id, shift_id, table_number, status, outcome, sub_status, scope, notes, match_score, started_at, started_by, ended_at, ended_by, duration_min, meeting_id, task_id, assigned_by, assigned_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [hmId, b.ev.id, regId, b.leadId, b.member, shift.id, b.table, h.outcome, h.reason, h.scope, h.notes, match?.score ?? null, start, b.via === 'page' ? 'client' : b.member, end, b.member, h.minutes, meetingId, taskId, b.via === 'desk' ? b.member : 'rule', ms(b.bookedSec), ms(b.bookedSec), end] },
      ], 'write')
      made++
    }
    if (made) say.push(`${made} booking(s) with their leads and chats`)

    /* ── the designers' public cards ── */
    const fs = await import('node:fs')
    const pic = (rel: string) => `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), 'public', rel)).toString('base64')}`
    const SIGLAP = rows<{ id: string }>(await client.execute(`SELECT id FROM projects WHERE number = 'P-2025-001' AND deleted_at IS NULL`))[0]?.id ?? null
    const cards: { member: string; years: number; work: { key: string; title: string; place: string; type: string; style: string; desc: string; project?: string | null; pics: [string, string][] }[] }[] = [
      { member: 'dane', years: 12, work: [
        { key: 'tampines', title: 'A calm 5-room in Tampines', place: 'Tampines GreenVines', type: 'HDB 5-Room', style: 'Japandi', desc: 'Light oak, plaster walls and one long kitchen run — the home of a family of five who wanted less, not more.', pics: [['marketplace/rooms/living-room-japandi.jpg', 'The living room'], ['marketplace/rooms/kitchen-japandi.jpg', 'One long kitchen run'], ['marketplace/rooms/bedroom-japandi.jpg', 'The main bedroom']] },
        { key: 'siglap', title: 'A family terrace in Siglap', place: 'Siglap', type: 'Landed — Terrace', style: 'Scandinavian', desc: 'Three floors opened up to the garden, handed over this year.', project: SIGLAP, pics: [['marketplace/rooms/living-room-scandinavian.jpg', 'Opened up to the garden'], ['marketplace/rooms/kitchen-scandinavian.jpg', 'The kitchen']] },
      ] },
      { member: 'germaine', years: 10, work: [
        { key: 'marina', title: 'A penthouse kitchen that hides everything', place: 'Marina One Residences', type: 'Penthouse', style: 'Luxury', desc: 'Full-height storage behind marble and brass, so the kitchen reads as part of the living room.', pics: [['marketplace/rooms/kitchen-dubai-luxury.jpg', 'Storage behind the marble'], ['marketplace/rooms/living-room-dubai-luxury.jpg', 'The living room'], ['marketplace/rooms/bedroom-dubai-luxury.jpg', 'The main suite']] },
      ] },
      { member: 'michelle', years: 6, work: [
        { key: 'tapestry', title: 'A warm Scandinavian condo', place: 'The Tapestry, Tampines', type: 'Condo 3-bedder', style: 'Scandinavian', desc: 'Pale timber, soft linen and a reading corner by the window.', pics: [['marketplace/rooms/bedroom-scandinavian.jpg', 'The reading corner'], ['marketplace/rooms/living-room-scandinavian.jpg', 'The living room']] },
      ] },
      { member: 'sarah', years: 4, work: [
        { key: 'punggol', title: 'A bright BTO for a young family', place: 'Punggol Northshore', type: 'BTO 4-Room', style: 'Eclectic', desc: 'Colour, pattern and plenty of low storage for the toys.', pics: [['marketplace/rooms/living-room-bohemian.jpg', 'The living room'], ['marketplace/rooms/bedroom-bohemian.jpg', 'The children’s room']] },
      ] },
    ]
    let works = 0
    for (const c of cards) {
      if (!team.has(c.member)) continue
      await client.execute({ sql: `UPDATE members SET portal_years = ? WHERE id = ? AND portal_years IS NULL`, args: [c.years, c.member] })
      for (const [i, w] of c.work.entries()) {
        const wid = sid(`${c.member}:${w.key}`, 'portfolio')
        if (rows(await client.execute({ sql: `SELECT 1 FROM member_portfolio_projects WHERE id = ?`, args: [wid] })).length) continue
        const t = ms(D0 - (30 - i) * D + 11 * H)
        await client.execute({ sql: `INSERT INTO member_portfolio_projects (id, member_id, title, place, property_type, style, description, project_id, position, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [wid, c.member, w.title, w.place, w.type, w.style, w.desc, w.project ?? null, i, c.member, t, t] })
        for (const [j, [rel, caption]] of w.pics.entries()) {
          await client.execute({ sql: `INSERT OR IGNORE INTO member_portfolio_pictures (id, portfolio_id, data, caption, position, created_at) VALUES (?, ?, ?, ?, ?, ?)`, args: [sid(`${wid}:${j}`, 'portfolio-picture'), wid, pic(rel), caption, j, t] })
        }
        works++
      }
    }
    if (works) say.push(`${works} piece(s) of work on the designers’ public cards`)

    /* ── kept in step ── */
    const gone = await client.execute(`DELETE FROM hangout_meetings WHERE registration_id NOT IN (SELECT id FROM hangout_registrations) OR lead_id NOT IN (SELECT id FROM leads)`)
    const regGone = await client.execute(`DELETE FROM hangout_registrations WHERE lead_id NOT IN (SELECT id FROM leads)`)
    const leadFix = await client.execute(`UPDATE hangout_meetings SET lead_id = (SELECT r.lead_id FROM hangout_registrations r WHERE r.id = hangout_meetings.registration_id) WHERE lead_id <> (SELECT r.lead_id FROM hangout_registrations r WHERE r.id = hangout_meetings.registration_id)`)
    const stray = await client.execute(`DELETE FROM hangout_designers WHERE event_id NOT IN (SELECT event_id FROM hangout_participations WHERE status = 'confirmed') AND invite_id IS NULL`)
    const fixed = gone.rowsAffected + regGone.rowsAffected + leadFix.rowsAffected + stray.rowsAffected
    if (fixed) say.push(`${fixed} Hangout row(s) brought into step`)
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R145 · The studio's listing on Qanvast (pending modules S37 — her "build all of them" 2026-10-11; cards
     onboarding:qanvast-listing-verification · studio:verify-listing) ──────────────────────────────────────────────────────────────────────
     1.0 seeded its demo studio `verification_status = 'verified'` with no application behind it (supabase/seeds/022_seed_studios.sql), and
     2.0's demo studio is a Qanvast partner on every page: Qanvast's leads arrive in its Leads, Qanvast Ops lists them and their returns, it
     takes part in Qanvast's Hangouts. Honest data (REG-343): the studio's one record of its listing says so — Listed, as a listing made before
     the studio used OpenMaison (`kind = 'outside'`: no words of an application are on record, so none are made up; Company › Profile says
     exactly that and offers Update your listing). Its date is the first record that proves it: the arrival of the studio's first Qanvast lead
     (nothing earlier is invented); it names no answer (`answered_via` null — neither Qanvast's on this prototype, nor a play of one). Written only while the studio has a Qanvast lead and no listing record at all — a studio that applied,
     withdrew or was answered keeps its own history. Idempotent ("already on record"). Kept in step: a proof file whose bytes are not a PDF
     or a picture is taken off the list (never deleted), and a second waiting application (only one may wait) is withdrawn, the older first. */
  console.log('\nR145 the studio’s listing on Qanvast')
  {
    const say: string[] = []
    const any = rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM studio_verifications`))[0]?.n ?? 0
    const first = rows<{ t: number | null; id: string | null }>(await client.execute(`SELECT min(created_at) AS t, (SELECT id FROM leads WHERE source = 'Qanvast' ORDER BY created_at LIMIT 1) AS id FROM leads WHERE source = 'Qanvast'`))[0]
    if (!Number(any) && first?.t) {
      const at = Number(first.t) * 1000
      const brandRow = rows<{ value: string }>(await client.execute(`SELECT value FROM settings WHERE key = 'brand'`))[0]
      let name: string | null = null, uen: string | null = null
      try { const d = (JSON.parse(String(brandRow?.value ?? '{}')) as { details?: { name?: string; uen?: string } }).details; name = d?.name?.trim() || null; uen = d?.uen?.trim() || null } catch { /* the brand reads as empty */ }
      await client.execute({ sql: `INSERT OR IGNORE INTO studio_verifications (id, kind, status, studio_name, uen, submitted_at, reviewed_at) VALUES (?, 'outside', 'verified', ?, ?, ?, ?)`,
        args: [sid('qanvast-listing:outside', 'studio-verification'), name, uen, at, at] })
      say.push(`listed on Qanvast before OpenMaison — as of the first Qanvast lead (${new Date(at).toISOString().slice(0, 10)})`)
    } else say.push(Number(any) ? 'already on record' : 'no Qanvast lead — not listed')
    const junk = await client.execute(`UPDATE studio_verification_files SET removed_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE removed_at IS NULL AND data NOT LIKE 'data:application/pdf;base64,%' AND data NOT LIKE 'data:image/png;base64,%' AND data NOT LIKE 'data:image/jpeg;base64,%' AND data NOT LIKE 'data:image/webp;base64,%'`)
    if (junk.rowsAffected) say.push(`${junk.rowsAffected} proof file(s) that aren’t a PDF or a picture taken off the list`)
    const waiting = rows<{ id: string }>(await client.execute(`SELECT id FROM studio_verifications WHERE status = 'pending' ORDER BY submitted_at DESC`))
    for (const w of waiting.slice(1)) await client.execute({ sql: `UPDATE studio_verifications SET status = 'withdrawn', withdrawn_at = CAST(strftime('%s','now') AS INTEGER) * 1000 WHERE id = ?`, args: [w.id] })
    if (waiting.length > 1) say.push(`${waiting.length - 1} older waiting application(s) withdrawn — only one waits`)
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R146 · Try the tools without an account (pending modules S41b-3 — her "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12;
     the S41b data sweep's M-01; 1.0's deployment/plg anonymous workspace) ─────────────────────────────────────────────────────────────────
     A website visitor's leads, quote read and Quote X-Ray reading are kept in a workspace of their own — 1.0's anon_workspaces, in a database
     file beside the demo's (`<the demo's file>.trial.db`, lib/trial/store.ts), never a studio's — and move into the studio they start
     (lib/trial/claim.ts, each with a `trial_claimed` Activity line). The demo studio is the demo: a claim never writes into it, so it holds no
     such line. Nothing to write; the check below keeps the line. */
  console.log('\nR146 try the tools without an account')
  {
    const n = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM lead_events WHERE kind = 'trial_claimed'`))[0]?.n ?? 0)
    console.log(n ? '  the demo holds free-trial work brought in — see the check below' : '  the demo is the demo — a visitor’s trial work moves only into a studio they start')
  }

  /* ── R123 · The sign-ins the demo's history implies (pending modules S39 — card studio:studio-health, Company › Reports › Studio health) ────
     Studio health counts sign-ins from the records S30 keeps — a member's (`studio_sessions`) and a client's (`portal_sessions`) — and the
     demo's history held none: for months its members moved leads, wrote notes, sent quotes and ran AI tools, its clients wrote, raised issues
     and chose on their portal, and no record said any of them signed in. (S30 seeded none on purpose, and that stays true: a browser that never
     signed in or out is the demo's own standing session, which needs no row.) Honest data (REG-343) — every visible state backed by the records
     that produce it — so the demo's PAST gets the sign-ins its own acts imply, once, read through the one list of acts the report reads
     (lib/studio-health/sources.ts):
       · a member's — one a day for each day before today the records name them doing something (ACT_SOURCES), 15 minutes before that day's
         first act, last seen at its last, the 24-hour kind (Keep me signed in left off), signed out ten minutes after the last act
         (`ended_reason = 'signed-out'`): none is live, so nobody is signed in by one and R120's "no live sessions" holds;
       · a client's — a portal sign-in (30 days, lib/portal/model.ts SESSION_DAYS) on their first act on the portal (CLIENT_SOURCES: opening
         it, a message, an issue, a choice, a payment they reported, an update they opened), and again on the first act after it ran out; last
         seen at their last act inside it; it simply runs out (a client rarely signs out).
     Written once (ids `ss-trail-…` · `ps-trail-…`): a database that already holds a trail keeps it, and a sign-in made in the app is the app's.
     Today's acts get none (today is the standing session's). */
  console.log('\nR123 the sign-ins the demo’s history implies')
  {
    const say: string[] = []
    const day = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}` }
    const cut = D0 * 1000
    /* members: one sign-in a day they did something */
    const hasTrail = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM studio_sessions WHERE id LIKE 'ss-trail-%'`))[0]?.n ?? 0) > 0
    if (!hasTrail) {
      const team = new Map(rows<{ id: string; phone: string | null; email: string | null }>(await client.execute(`SELECT id, phone, email FROM members`)).map((m) => [m.id, m]))
      const acts = rows<{ m: string; at: number }>(await client.execute(healthStampsSql(HEALTH_ACTS.filter((a) => a.table !== 'studio_sessions'))))
        .filter((a) => team.has(String(a.m)) && Number(a.at) < cut)
      const days = new Map<string, { m: string; first: number; last: number }>()
      for (const a of acts) {
        const at = Number(a.at), key = `${a.m}:${day(at)}`
        const d = days.get(key)
        if (!d) days.set(key, { m: String(a.m), first: at, last: at }); else { d.first = Math.min(d.first, at); d.last = Math.max(d.last, at) }
      }
      const writes: InStatement[] = []
      for (const [key, d] of days) {
        const started = d.first - 15 * 60_000, ended = d.last + 10 * 60_000
        const who = team.get(d.m)
        writes.push({ sql: `INSERT OR IGNORE INTO studio_sessions (id, member_id, remember, via, channel, started_at, last_seen_at, expires_at, ended_at, ended_reason, user_agent) VALUES (?, ?, 0, 'code', ?, ?, ?, ?, ?, 'signed-out', NULL)`,
          args: [`ss-trail-${key.replace(':', '-')}`, d.m, who?.phone ? 'phone' : 'email', started, d.last, started + 86_400_000, Math.min(ended, started + 86_400_000)] })
      }
      for (let i = 0; i < writes.length; i += 200) await client.batch(writes.slice(i, i + 200), 'write')
      say.push(`${writes.length} member sign-in(s) on the days the records name them doing something`)
    } else say.push('members’ sign-ins already on record')
    /* clients: a 30-day portal sign-in when they came, and again after it ran out */
    const hasPortalTrail = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM portal_sessions WHERE id LIKE 'ps-trail-%'`))[0]?.n ?? 0) > 0
    if (!hasPortalTrail) {
      const clients = new Set(rows<{ id: string }>(await client.execute(`SELECT id FROM homeowner_profiles`)).map((h) => h.id))
      const acts = rows<{ m: string; at: number }>(await client.execute(healthStampsSql(HEALTH_CLIENT_ACTS)))
        .filter((a) => clients.has(String(a.m)) && Number(a.at) < cut).map((a) => ({ c: String(a.m), at: Number(a.at) })).sort((a, b) => a.at - b.at)
      const span = PORTAL_SESSION_DAYS * 86_400_000
      const open = new Map<string, { id: string; start: number; last: number }>()
      const made: { id: string; c: string; start: number; last: number }[] = []
      for (const a of acts) {
        const cur = open.get(a.c)
        if (cur && a.at < cur.start + span) { cur.last = a.at; continue }
        const next = { id: `ps-trail-${a.c}-${day(a.at)}`, c: a.c, start: a.at - 5 * 60_000, last: a.at }
        open.set(a.c, next); made.push(next)
      }
      const sec = (ms: number) => Math.floor(ms / 1000)
      if (made.length) await client.batch(made.map((x) => ({ sql: `INSERT OR IGNORE INTO portal_sessions (id, homeowner_id, kind, member_id, created_at, expires_at, last_seen_at, ended_at) VALUES (?, ?, 'client', NULL, ?, ?, ?, NULL)`,
        args: [x.id, x.c, sec(x.start), sec(x.start + span), sec(x.last)] })), 'write')
      say.push(`${made.length} client portal sign-in(s) by ${new Set(made.map((x) => x.c)).size} client(s)`)
    } else say.push('clients’ portal sign-ins already on record')
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R124 · An upgrade offer in the bell is its record's live offer (pending modules S41b-4 — the S41b data sweep's M-02, 1.0's plg upgrade
     nudges; her "build all of them" 2026-10-11) ────────────────────────────────────────────────────────────────────────────────────────
     The Free plan's offers live as one row each in the Owner's bell, kept by `nudge_state.offer_id` (lib/credits/nudges.ts). Honest data
     (REG-343): an offer row nothing stands behind (its record answered or gone), or any offer while the studio is not on Free (1.0's R1 — every
     offer stops on a paid plan or a trial), leaves the bell; a record pointing at a row that is gone lets it go. The demo is on Pro — no row and
     no record to begin with; this keeps it so through every Reset and every plan switch. Idempotent. */
  console.log('\nR124 an upgrade offer in the bell is its record’s live offer')
  {
    const plan = rows<{ p: string }>(await client.execute(`SELECT plan_id AS p FROM subscriptions WHERE cancelled_at IS NULL ORDER BY created_at DESC LIMIT 1`))[0]?.p ?? 'free'
    const offFree = plan !== 'free'
    const orphans = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM notifications n WHERE n.kind = 'upgrade_offer' AND (${offFree ? '1 = 1' : '0 = 1'} OR NOT EXISTS (SELECT 1 FROM nudge_state s WHERE s.offer_id = n.id AND s.member_id = n.member_id))`))[0]?.n ?? 0)
    if (orphans) await client.execute(`DELETE FROM notifications WHERE kind = 'upgrade_offer' AND (${offFree ? '1 = 1' : '0 = 1'} OR NOT EXISTS (SELECT 1 FROM nudge_state s WHERE s.offer_id = notifications.id AND s.member_id = notifications.member_id))`)
    const dangling = Number(rows<{ n: number }>(await client.execute(`SELECT count(*) AS n FROM nudge_state s WHERE s.offer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.id = s.offer_id AND n.member_id = s.member_id)`))[0]?.n ?? 0)
    if (dangling) await client.execute(`UPDATE nudge_state SET offer_id = NULL, version = version + 1 WHERE offer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.id = nudge_state.offer_id AND n.member_id = nudge_state.member_id)`)
    console.log(`  ${orphans || dangling ? `${orphans} offer row(s) with nothing behind them taken out · ${dangling} record(s) let go of a row that was gone` : `nothing to mend — ${offFree ? `the studio is on ${plan}, no offer` : 'every offer has its record'}`}`)
  }

  /* ── R160 · One mobile number, one person (S42 B-18 — the audit found 9182 7364 on three people) ─────────────────────────────────────
     Kelvin Goh (the Hangout's lead and his registration, R144) and Priya Tan (the Accounting member, R102) were given Mei Ling Han's number
     (Benjamin Han's second client and the portal's homeowner) — and the duplicate finder, the portal's sign-in and the studio's sign-in all key
     on a phone. Each gets a number of their own, only while their record still holds the shared one and their name (a studio that changed
     either keeps its own). Mei Ling keeps hers. Idempotent; the closing check: no member shares a mobile with a client. */
  console.log('\nR160 one mobile number, one person')
  {
    const SHARED = '91827364'
    const kelvinLead = await client.execute({ sql: `UPDATE leads SET phone = '93360518' WHERE phone = ? AND name = 'Kelvin Goh'`, args: [SHARED] })
    const kelvinReg = await client.execute({ sql: `UPDATE hangout_registrations SET phone = '93360518' WHERE phone = ? AND name = 'Kelvin Goh'`, args: [SHARED] })
    const priya = await client.execute({ sql: `UPDATE members SET phone = '96417305' WHERE id = 'priya' AND phone = ? AND name = 'Priya Tan'`, args: [SHARED] })
    const n = kelvinLead.rowsAffected + kelvinReg.rowsAffected + priya.rowsAffected
    console.log(`  ${n ? `${kelvinLead.rowsAffected + kelvinReg.rowsAffected} of Kelvin Goh’s record(s) → 9336 0518 · ${priya.rowsAffected} Priya Tan → 9641 7305` : 'nothing to mend — each has a number of their own'}`)
  }

  /* ── R170 · Demo Studio's own logo (S42E — call E·5 as recommended, her "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md) ──────
     The brand kit's logo was OpenMaison's mark (R31 seeds the kit from DEFAULT_BRAND), so the public Hangout page, the client portal, the link
     cards and every paper read as OpenMaison's brand in the demo — S27's rule is "the studio's brand, never OpenMaison's". Demo Studio gets a
     mark of its own (public/demo-studio/logo.svg). Only while the kit still holds OpenMaison's mark: a logo the studio chose is kept. Idempotent. */
  console.log('\nR170 Demo Studio’s own logo')
  {
    const DEMO_LOGO = '/demo-studio/logo.svg'
    const r = await client.execute({ sql: `UPDATE settings SET value = json_set(value, '$.kit.logo', ?) WHERE key = 'brand' AND json_valid(value) AND json_extract(value, '$.kit.logo') = '/figma-assets/logo.svg'`, args: [DEMO_LOGO] })
    const missing = (() => { try { return !statSync(path.join(process.cwd(), 'public', DEMO_LOGO)).isFile() } catch { return true } })()
    console.log(`  ${r.rowsAffected ? 'the brand kit’s logo is Demo Studio’s own' : 'the brand kit already has a logo of the studio’s'}${missing ? ' · MISSING the logo file' : ''}`)
  }

  /* ── R171 · Market Insights' sample words in the house's quotes (S42E, E-17) ───────────────────────────────────────────────────────────
     R142 rewrites the demo's sample articles from lib/market-insights/demo.ts on every run, so the curly quotes there reach the record; this
     says whether any article's prose (outside its chart blocks, which are JSON) still carries a straight quote or apostrophe. Read-only. */
  console.log('\nR171 Market Insights’ sample words')
  {
    const arts = rows<{ id: string; title: string; excerpt: string | null; content: string }>(await client.execute(`SELECT id, title, excerpt, content FROM market_insights WHERE sample = 1 AND removed_at IS NULL`))
    const straight = arts.filter((a) => {
      const prose = a.content.replace(/```[\s\S]*?```/g, '').replace(/\]\([^)]*\)/g, ']')   // chart blocks and link targets aside
      return /['"]/.test(`${a.title}\n${a.excerpt ?? ''}\n${prose}`)
    }).map((a) => a.id)
    console.log(`  ${straight.length ? `STRAIGHT quotes left in ${straight.join(', ')}` : `${arts.length} sample article(s), every quote and apostrophe curly`}`)
  }

  /* ── R125 · The demo's recent moments, recent again (S42 audit A-03 — "the demo's recent moments age") ─────────────────────────────────
     Since S42 a restore moves every moment of the demo by the same whole days (lib/db/demo-day.ts), so the base no longer ages between
     snapshots. Before it, the base aged on itself: it was re-snapshotted every day with only open tasks (and a few others) moving, so the
     projects build's "just now" moments of 5 Oct had grown nine days old. Two of them break a rule that reads recency:
       · Benjamin Han's floor plan, shown to him "an hour ago" by R71, had left the portal's "new for 7 days" window (`NEW_FILE_DAYS`) — the
         portal's "What needs you first" lost its row (pj-r4a · pj-fix-F);
       · his three newest updates (R70 dates them off its run day: the kitchen published five days back, the wardrobe sent back three, the
         panels in review since yesterday) were ten days older than written — the Dashboard's fortnight of site updates (`UPDATES_WINDOW_DAYS`)
         was about to empty and the panels had "waited" ten days for a review.
     So, on R71's and R70's own rows (their ids) and everything that dates them — the Activity line, the bell rows and their WhatsApp / email
     copies, the photos filed in Site updates, the client's read keys — moved by whole days, never past now:
       · the floor plan's "shown" moment (and its Activity line) back inside the window, to the latest whole day before an hour ago;
       · the three updates by the whole days since the day R70 wrote them (read off the panels' "yesterday at 11:00").
     Guarded: each moves only when it has aged (the plan out of its window, the updates a whole day or more); idempotent — once back, nothing
     moves, and a later restore keeps them where they are. Activity follows (it reads these rows). The money month is not moved: a calendar
     month can't be held by moving days — the Dashboard's tile says a month below nothing plainly instead (S42 call A·3). */
  console.log('\nR125 the demo’s recent moments, recent again')
  {
    const { shiftDemoRows } = await import('../lib/db/demo-day')
    const { timeColumns } = await import('../lib/db/time-columns')
    const { NEW_FILE_DAYS } = await import('../lib/portal/needs')
    const say: string[] = []
    /* the rows a WHERE picks, every moment in them moved by whole days through restore's own rules (by rowid — any table's key) */
    const moveRows = async (table: string, where: string, args: (string | number)[], days: number): Promise<number> => {
      const got = rows<Record<string, unknown>>(await client.execute({ sql: `SELECT rowid AS _rid, * FROM ${table} WHERE ${where}`, args }))
      if (!got.length || !days) return 0
      const moved = shiftDemoRows({ [table]: got }, days, timeColumns())[table] ?? []
      const batch: InStatement[] = []
      moved.forEach((n, i) => {
        const o = got[i]!
        const set = Object.keys(n).filter((c) => c !== '_rid' && n[c] !== o[c])
        if (set.length) batch.push({ sql: `UPDATE ${table} SET ${set.map((c) => `${c} = ?`).join(', ')} WHERE rowid = ?`, args: [...set.map((c) => n[c] as string | number | null), o._rid as number] })
      })
      if (batch.length) await client.batch(batch, 'write')
      return batch.length
    }
    const [ben] = rows<{ id: string; project: string | null }>(await client.execute(`SELECT l.id, (SELECT p.id FROM projects p WHERE p.lead_id = l.id AND p.deleted_at IS NULL) AS project FROM leads l WHERE l.name = 'Benjamin Han' AND l.deleted_at IS NULL LIMIT 1`))
    if (!ben) say.push('no Benjamin Han — nothing to bring back')
    else {
      /* the floor plan shown to him (R71) */
      const plan = sid(ben.id, 'file:floor-plan')
      const [f] = rows<{ shown: number | null }>(await client.execute({ sql: `SELECT shown_to_client_at AS shown FROM lead_files WHERE id = ? AND deleted_at IS NULL`, args: [plan] }))
      const shown = f?.shown == null ? null : Number(f.shown)
      if (shown == null) say.push('the floor plan is not shown to him — left')
      else if (shown >= NOW - (NEW_FILE_DAYS - 1) * D) say.push('the floor plan is still new to him — nothing to move')
      else {
        const days = Math.floor((NOW - H - shown) / D)
        await client.execute({ sql: `UPDATE lead_files SET shown_to_client_at = shown_to_client_at + ? WHERE id = ?`, args: [days * D, plan] })
        const ev = await moveRows('lead_events', `id = ? AND kind = 'file_shown'`, [sid(plan, 'ev:shown')], days)
        say.push(`the floor plan shown ${days} days later (${fmt(shown + days * D)})${ev ? ', its Activity line with it' : ''}`)
      }
      /* his three newest updates (R70) */
      if (!ben.project) say.push('no project for Benjamin Han — his updates left')
      else {
        const ids = ['kitchen', 'wardrobe', 'panels'].map((k) => sid(ben.project!, `update:${k}`))
        const ups = rows<{ id: string; created_at: number; newest: number }>(await client.execute({ sql: `SELECT id, created_at, max(created_at, coalesce(updated_at, 0), coalesce(submitted_at, 0), coalesce(reviewed_at, 0), coalesce(published_at, 0)) AS newest FROM project_updates WHERE id IN (?, ?, ?) AND deleted_at IS NULL`, args: ids }))
        const panels = ups.find((u) => u.id === ids[2])
        if (ups.length !== 3 || !panels) say.push('his three newest updates are not all there — left')
        else {
          const written = Number(panels.created_at) + D - 11 * H   // R70: the panels came "yesterday at 11:00" of its run day
          const days = Math.min(Math.round((D0 - written) / D), Math.floor((NOW - Math.max(...ups.map((u) => Number(u.newest)))) / D))
          if (days < 1) say.push('his newest updates are as R70 dated them — nothing to move')
          else {
            const list = ids.map(() => '?').join(', ')
            let n = await moveRows('project_updates', `id IN (${list})`, ids, days)
            const fileIds = rows<{ file_id: string }>(await client.execute({ sql: `SELECT file_id FROM project_update_files WHERE update_id IN (${list})`, args: ids })).map((r) => r.file_id)
            n += await moveRows('project_update_files', `update_id IN (${list})`, ids, days)
            if (fileIds.length) {
              const fl = fileIds.map(() => '?').join(', ')
              for (const t of ['lead_files', 'lead_file_images', 'lead_file_thumbs']) n += await moveRows(t, `${t === 'lead_files' ? 'id' : 'file_id'} IN (${fl})`, fileIds, days)
            }
            const like = ids.map(() => `detail LIKE ?`).join(' OR ')
            n += await moveRows('lead_events', `lead_id = ? AND (${like})`, [ben.id, ...ids.map((u) => `%"${u}"%`)], days)
            const bells = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM notifications WHERE ${ids.map(() => 'href LIKE ?').join(' OR ')}`, args: ids.map((u) => `%open=${u}%`) })).map((r) => r.id)
            n += await moveRows('notifications', ids.map(() => 'href LIKE ?').join(' OR '), ids.map((u) => `%open=${u}%`), days)
            n += await moveRows('notification_outbox', `${ids.map(() => 'href LIKE ?').join(' OR ')}${bells.length ? ` OR notification_id IN (${bells.map(() => '?').join(', ')})` : ''}`, [...ids.map((u) => `%open=${u}%`), ...bells], days)
            n += await moveRows('portal_bell_reads', ids.map(() => 'row_key LIKE ?').join(' OR '), ids.map((u) => `update:${u}:%`), days)
            say.push(`his three newest updates ${days} days later (${n} rows with what dates them)`)
          }
        }
      }
    }
    console.log(`  ${say.join(' · ')}`)
  }

  /* ── R161 · A project always has a member (S42F — New project took an empty team: the owner's "Dane Testing", P-2026-006, made on :3000 with
     nobody on it, so R68's "direct lead … no member" and "lead past New with no member" failed) ─────────────────────────────────────────────
     New project, Duplicate project and every stage move past New now refuse a project with nobody on it (TEAM_NEEDED). A project made before
     that — direct or Won — whose client record has no member gets the member who made it (`projects.created_by`), assigned when the project
     was made and by them, as New project would have written it; a maker who is gone, deactivated or in Accounting (never on a project) hands
     it to the studio's first active Owner. Touches only a lead that has a project and no member; idempotent (`INSERT OR IGNORE` on the
     lead + member pair, a fixed id); its check is R68's own pair plus "project whose client record has no member" below. */
  console.log('\nR161 a project always has a member')
  {
    const bare = rows<{ leadId: string; createdBy: string | null; createdAt: number; number: string }>(await client.execute(
      `SELECT p.lead_id AS leadId, p.created_by AS createdBy, p.created_at AS createdAt, p.number AS number FROM projects p
         WHERE NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = p.lead_id) ORDER BY p.created_at`))
    const owner = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role = 'Owner' AND coalesce(is_active, 1) = 1 ORDER BY coalesce(is_you, 0) DESC, id LIMIT 1`))[0]?.id ?? null
    const mended: string[] = []
    for (const b of bare) {
      const [maker] = b.createdBy ? rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM members WHERE id = ? AND coalesce(is_active, 1) = 1 AND role <> 'Accounting'`, args: [b.createdBy] })) : []
      const who = maker?.id ?? owner
      if (!who) continue
      const r = await client.execute({ sql: `INSERT OR IGNORE INTO lead_assignees (id, lead_id, member_id, assigned_at, assigned_by) VALUES (?, ?, ?, ?, ?)`, args: [sid(`r161:${b.leadId}`, 'assignee'), b.leadId, who, b.createdAt, who] })
      if (r.rowsAffected) mended.push(`${b.number} → ${who}${maker ? '' : ' (the Owner — its maker can’t hold it)'}`)
    }
    console.log(`  ${mended.length ? `${mended.length} project(s) given a member: ${mended.join(' · ')}` : 'nothing to mend — every project has a member'}`)
  }

  /* ── R147 · The demo's month is never a loss (S43B · F1-04 — her "fix all the pending things" 2026-10-15, as recommended; S42 call A·3) ─────
     The Dashboard's "Profit this month" is a calendar month (studios think in months, and A·3 kept it). The fixture's October held one recorded
     invoice (S$648) against two credit notes (2 and 3 Oct, S$1,635) and its costs, so the front door opened on a loss. A restore moves every
     moment by whole days (S42A's demo day, lib/db/demo-day.ts), so money dated ON the demo day is in "this month" on every restore — save one
     made in the first minutes after midnight on the 1st, where the last day's squeeze may land it on the month before.
     So, once, on the demo day: Aisha Rahman's flooring upgrade — engineered oak in place of the vinyl in both bedrooms, a one-off invoice outside
     her stages (an Upgrade, 1.0's reason; her Commencement invoice stays Ready to send — the demo's showcase of a stage ready to bill) — made and
     sent by Dane and paid the same afternoon by PayNow, recorded by him, with its whole trail as the app writes it: the invoice's number, due day,
     contract stamps and no-login link (`sendInvoice`), its PDF in Files › Payments, Activity's created · sent · payment lines, the money runners'
     "Dane sent …" bell rows (Hui Min, Priya — never the one who sent it), the payment with its receipt number, file and link (`recordPayment`).
     The client reads it on her portal's Money as paid. Guarded: Aisha's project live and in progress, the invoice's fixed id not yet written;
     idempotent (a second run finds it). Its checks are R72's / R75's / R79's own (number, due day, send line, receipt, file, link, Activity). */
  console.log('\nR147 the demo’s month is never a loss')
  {
    const [ais] = rows<{ id: string; lead_id: string; name: string; number: string; quote_id: string | null; agreed: number | null; stage: string; client: string }>(await client.execute(
      `SELECT p.id, p.lead_id, p.name, p.number, p.quote_id, p.agreed_value_minor AS agreed, p.stage, l.name AS client FROM projects p JOIN leads l ON l.id = p.lead_id
         WHERE p.number = 'P-2026-003' AND p.deleted_at IS NULL`))
    const invId = ais ? sid(ais.id, 'r147:upgrade') : ''
    const [have] = ais ? rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_invoices WHERE id = ?`, args: [invId] })) : []
    if (!ais || ais.stage !== 'in_progress') console.log('  Aisha Rahman’s project isn’t in progress — nothing to send')
    else if (have) console.log('  her flooring upgrade is on record — nothing to do')
    else {
      const { displayDate } = await import('../lib/format')
      const money = (minor: number) => `${minor < 0 ? '−' : ''}S$${new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(minor) / 100)}`
      const token = (seed: string) => createHash('sha256').update(`r147-token:${seed}`).digest('base64url').slice(0, 22)
      const nextNumber = async (prefix: string) => {
        const given = rows<{ n: string }>(await client.execute({ sql: `SELECT number AS n FROM project_invoices WHERE number LIKE ? UNION SELECT receipt_number AS n FROM project_payments WHERE receipt_number LIKE ?`, args: [`${prefix}%`, `${prefix}%`] })).map((r) => r.n)
        return `${prefix}${String(given.reduce((m, x) => Math.max(m, Number(x.slice(prefix.length)) || 0), 0) + 1).padStart(3, '0')}`
      }
      /* the day's moments, in order and never after now: 09:30 made · 09:40 sent · 15:10 paid · 15:12 recorded — squeezed into the hours since
         midnight when the run is earlier than that */
      const k = Math.min(1, Math.max(0, NOW - 120 - D0) / (15.2 * H))
      const t = (h: number) => Math.floor(D0 + h * H * k)
      const made = t(9.5), sent = Math.max(made + 1, t(9.67)), paid = Math.max(sent + 1, t(15.17)), recorded = Math.max(paid + 1, t(15.2))
      const gstPct = 9
      const lines = [
        { id: 'l1', description: 'Engineered oak flooring in place of the vinyl — master and common bedrooms, 32 m²', qty: 32, unitMinor: 11_800 },
        { id: 'l2', description: 'Oak skirting to match', qty: 18, unitMinor: 2_200 },
      ]
      const subtotal = lines.reduce((s, l) => s + Math.round(l.qty * l.unitMinor), 0)
      const gst = Math.round((subtotal * gstPct) / 100), total = subtotal + gst
      const title = 'Bedroom flooring upgrade'
      const number = await nextNumber(`INV-${new Date(sent * 1000).getFullYear()}-`)
      const due = D0 + 7 * D
      const folder = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM lead_files WHERE lead_id = ? AND kind = 'folder' AND name = 'Payments' AND parent_id IS NULL AND deleted_at IS NULL LIMIT 1`, args: [ais.lead_id] }))[0]?.id
        ?? await (async () => { const id = sid(ais.lead_id, 'files:payments'); await client.execute({ sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'folder','Payments',NULL,?,NULL,'dane',NULL,NULL,?)`, args: [id, ais.lead_id, sent, sent] }); return id })()
      const base = ais.quote_id ? Number(rows<{ a: number }>(await client.execute({ sql: `SELECT amount_minor AS a FROM quotes WHERE id = ?`, args: [ais.quote_id] }))[0]?.a ?? 0) : ais.agreed ?? 0
      const vos = Number(rows<{ s: number }>(await client.execute({ sql: `SELECT coalesce(sum(amount_minor), 0) AS s FROM quotes WHERE project_id = ? AND kind = 'variation' AND deleted_at IS NULL AND status IN ('Confirmed','Signed')`, args: [ais.id] }))[0]?.s ?? 0)
      const ev = (id: string, kind: string, actor: string, atSec: number, detail: Record<string, unknown>) =>
        client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`, args: [id, ais.lead_id, kind, actor, atSec, JSON.stringify({ name: ais.name, number: ais.number, ...detail }), ais.id] })
      const fileId = sid(invId, 'file:invoice')
      const batch: InStatement[] = [
        { sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'dane',NULL,'application/pdf',?)`, args: [fileId, ais.lead_id, `${number} · ${title}.pdf`, sent, folder, sent] },
        { sql: `INSERT OR IGNORE INTO project_invoices (id, project_id, stage_ref, stage_name, pct, position, number, status, amount_minor, gst_minor, sent_by, sent_at, due_at, created_by, created_at, updated_at, contract_minor, base_minor, variations_minor, kind, reason, description, client_note, lines_json, charge_gst, share_token, file_id)
                VALUES (?,?,?,?,0,1001,?,'sent',?,?,'dane',?,?,'dane',?,?,?,?,?,'one_off','upgrade',NULL,?,?,1,?,?)`,
          args: [invId, ais.id, `extra:${invId}`, title, number, total, gst, sent, due, made, sent, Math.max(0, base + vos), base, vos, 'As agreed on site — engineered oak in both bedrooms in place of the vinyl in your quote.', JSON.stringify(lines), token(invId), fileId] },
      ]
      await client.batch(batch, 'write')
      await ev(sid(invId, 'ev:created'), 'project_invoice_created', 'dane', made, { id: invId, kind: 'one_off', stage: title, reason: 'Upgrade', to: money(total) })
      await ev(sid(invId, 'ev:sent'), 'project_invoice_sent', 'dane', sent, { id: invId, stage: title, title: number, to: money(total), due: displayDate(new Date(due * 1000)) })
      /* the money runners hear it (UC-098), never the one who sent it */
      const runners = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner','Admin','Accounting') AND coalesce(is_active, 1) = 1 AND id <> 'dane'`))
      for (const r of runners) await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?, ?, 'invoice_sent', ?, ?, ?, ?, NULL, 'in_app', 'dane', ?, NULL)`,
        args: [sid(invId, `bell:${r.id}`), r.id, `Dane sent ${number} to ${ais.client}`, `${title} · ${money(total)} — ${ais.name}, due ${displayDate(new Date(due * 1000))}`, `/projects/${ais.id}/money?open=${encodeURIComponent(invId)}`, ais.lead_id, sent] })
      /* paid by PayNow that afternoon — recorded by Dane, confirmed on entry with its receipt (F-10 · F-11) */
      const payId = sid(invId, 'payment')
      const receipt = await nextNumber(`RCT-${new Date(recorded * 1000).getFullYear()}-`)
      const rFile = sid(payId, 'file:receipt')
      const dayOf = (sec: number) => { const d = new Date(sec * 1000); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 1000) }
      await client.batch([
        { sql: `INSERT OR IGNORE INTO lead_files (id, lead_id, kind, name, thumb, created_at, parent_id, owner_id, size_bytes, mime, updated_at) VALUES (?,?,'pdf',?,NULL,?,?,'dane',NULL,'application/pdf',?)`, args: [rFile, ais.lead_id, `${receipt} · ${title}.pdf`, recorded, folder, recorded] },
        { sql: `INSERT OR IGNORE INTO project_payments (id, project_id, invoice_id, amount_minor, paid_on, method, reference, source, status, trusted, recorded_by, confirmed_by, confirmed_at, receipt_number, receipt_file_id, created_at, updated_at, share_token) VALUES (?,?,?,?,?,'paynow',?,'studio','confirmed',0,'dane','dane',?,?,?,?,?,?)`,
          args: [payId, ais.id, invId, total, dayOf(paid), `TXN ${new Date(paid * 1000).toLocaleDateString('en-SG', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\D/g, '')}-4417`, recorded, receipt, rFile, recorded, recorded, token(payId)] },
      ], 'write')
      await ev(sid(payId, 'ev:recorded'), 'project_payment_recorded', 'dane', recorded, { id: payId, invoice: invId, stage: title, title: number, to: money(total), method: 'paynow', receipt })
      console.log(`  ${number} · ${title} · ${money(total)} sent ${fmt(sent)}, paid ${fmt(paid)} by PayNow (${receipt}) — ${runners.length} bell row(s)`)
    }
  }

  /* ── R172 · Every stored piece of rich text through the house allowlist (S44Q — the UAT comments' triage §12.1, her UAT ask 2026-10-15) ────
     A quote line's or section's description, the quote's Terms and Notes, the T&Cs & Notes library, the Price book's items and saved sections,
     a lead's formatted note, a quote template's Text blocks and the kept versions of quotes were stored as the browser sent them — and drawn as
     raw HTML, on the client's own pages too. Every save goes through the allowlist since S44Q (lib/rich-html.ts) and every render does; this
     cleans the rows written before. Each value is rewritten only when the allowlist changes it (a stray tag becomes text, a handler or a
     `javascript:` link goes); idempotent — a clean row is left as it is. Its check: no stored body holding a script, a handler or a script link. */
  console.log('\nR172 every stored rich text through the allowlist')
  {
    const { sanitizeRichHtml } = await import('../lib/rich-html')
    const said: string[] = []
    const cleanCol = async (table: string, key: string, col: string, where = `${col} IS NOT NULL AND ${col} <> ''`) => {
      const got = rows<{ k: string; v: string }>(await client.execute(`SELECT ${key} AS k, ${col} AS v FROM ${table} WHERE ${where}`))
      const batch: InStatement[] = []
      for (const r of got) { const v = String(r.v); const clean = sanitizeRichHtml(v); if (clean !== v) batch.push({ sql: `UPDATE ${table} SET ${col} = ? WHERE ${key} = ?`, args: [clean, r.k] }) }
      for (let at = 0; at < batch.length; at += 200) await client.batch(batch.slice(at, at + 200), 'write')
      if (batch.length) said.push(`${batch.length} ${table}.${col}`)
    }
    await cleanCol('quote_items', 'id', 'description_html')
    await cleanCol('price_book_items', 'id', 'description_html')
    await cleanCol('quotes', 'id', 'terms_html')
    await cleanCol('quotes', 'id', 'notes_html')
    await cleanCol('quote_text_templates', 'id', 'body')
    await cleanCol('lead_notes', 'id', 'body', `body LIKE '%<%'`)   // a plain-text note has no markup to clean
    /* JSON that carries rich text: a saved section's notes and lines, a kept quote version's lines and texts, a template's Text blocks */
    const cleanJson = async (table: string, key: string, col: string, mend: (j: Record<string, unknown>) => boolean) => {
      const got = rows<{ k: string; v: string }>(await client.execute(`SELECT ${key} AS k, ${col} AS v FROM ${table} WHERE ${col} LIKE '%<%'`))
      const batch: InStatement[] = []
      for (const r of got) { let j: Record<string, unknown>; try { j = JSON.parse(String(r.v)) as Record<string, unknown> } catch { continue } if (j && typeof j === 'object' && mend(j)) batch.push({ sql: `UPDATE ${table} SET ${col} = ? WHERE ${key} = ?`, args: [JSON.stringify(j), r.k] }) }
      for (let at = 0; at < batch.length; at += 100) await client.batch(batch.slice(at, at + 100), 'write')
      if (batch.length) said.push(`${batch.length} ${table}.${col}`)
    }
    const fix = (o: Record<string, unknown> | null | undefined, k: string): boolean => { if (!o || typeof o[k] !== 'string') return false; const clean = sanitizeRichHtml(o[k] as string); if (clean === o[k]) return false; o[k] = clean; return true }
    const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [])
    await cleanJson('price_book_sections', 'id', 'lines_json', (j) => {
      let n = fix(j, 'descriptionHtml') ? 1 : 0
      for (const l of list(j.lines)) n += fix(l, 'descriptionHtml') ? 1 : 0
      for (const g of list(j.subs)) { n += fix(g, 'descriptionHtml') ? 1 : 0; for (const l of list(g.lines)) n += fix(l, 'descriptionHtml') ? 1 : 0 }
      return n > 0
    })
    await cleanJson('quote_versions', 'id', 'snapshot_json', (j) => {
      let n = 0
      const q = j.quote && typeof j.quote === 'object' ? j.quote as Record<string, unknown> : null
      n += fix(q, 'termsHtml') ? 1 : 0; n += fix(q, 'notesHtml') ? 1 : 0
      for (const i of list(j.items)) n += fix(i, 'descriptionHtml') ? 1 : 0
      return n > 0
    })
    const textBlocks = (j: Record<string, unknown>) => { let n = 0; for (const b of list(j.blocks)) if (b.kind === 'text') n += fix(b, 'html') ? 1 : 0; const d = j.design && typeof j.design === 'object' ? j.design as Record<string, unknown> : null; if (d) for (const b of list(d.blocks)) if (b.kind === 'text') n += fix(b, 'html') ? 1 : 0; return n > 0 }
    await cleanJson('quote_templates', 'id', 'design_json', textBlocks)
    await cleanJson('quote_templates', 'id', 'draft_json', textBlocks)
    await cleanJson('quote_template_versions', 'id', 'design_json', textBlocks)
    console.log(`  ${said.length ? `cleaned: ${said.join(' · ')}` : 'every stored rich text is the allowlist’s already'}`)
  }

  /* ── R173 · A Blank Quote is pinned to the default template's version (S44Q — row 312, triage §12.10 · M11; her UAT ask 2026-10-15) ────────
     A quote started blank kept no template of its own and printed through the default's LATEST design for ever — a template edited after the
     quote went out changed the client's paper (Spaces Studio's "the header band came back"). createQuote pins a new one since S44Q; a quote
     made before (a variation order made from one too) is pinned to the default as it prints today, so nothing it shows changes now and nothing
     changes it later. Only while a published default exists; idempotent (a pinned quote is left). */
  console.log('\nR173 blank quotes pinned to the default template')
  {
    const [def] = rows<{ id: string; version: number; name: string }>(await client.execute(`SELECT id, version, name FROM quote_templates WHERE is_default = 1 AND status = 'published' AND deleted_at IS NULL LIMIT 1`))
    if (!def) console.log('  no published default template — left')
    else {
      const r = await client.execute({ sql: `UPDATE quotes SET template_id = ?, template_version = ? WHERE template_id IS NULL`, args: [def.id, def.version] })
      console.log(`  ${r.rowsAffected ? `${r.rowsAffected} quote(s) pinned to ${def.name} v${def.version}` : 'every quote is pinned to its template'}`)
    }
  }

  /* ── R126 · The printed quote's new records keep their rules (S44T — her UAT ask 2026-10-15, rows 246–364) ──────────────────────────
     Migration 0111 adds a quote's Remarks, a fixed fee's own word, a section priced after the contract and a name's emphasis — every one empty
     on every row, so nothing a studio has prints differently. Their rules, mended where a write went round them (idempotent): only a section
     at the top of a quote — never a sub-section, never a line, never a variation order's — is priced after the contract; only a fixed row
     carries a fixed fee's word. Nothing is seeded: the demo prints as it did. */
  console.log('\nR126 the printed quote’s new records')
  {
    const after = await client.execute(`UPDATE quote_items SET priced_after = 0 WHERE priced_after = 1 AND (kind <> 'group' OR parent_id IS NOT NULL OR quote_id IN (SELECT id FROM quotes WHERE kind = 'variation'))`)
    const word = await client.execute(`UPDATE quote_payments SET fixed_label = NULL WHERE fixed_label IS NOT NULL AND (fixed_minor IS NULL OR trim(fixed_label) = '')`)
    console.log(`  ${after.rowsAffected + word.rowsAffected ? `${after.rowsAffected} mark(s) priced-after and ${word.rowsAffected} fixed-fee word(s) taken off rows they can't be on` : 'every mark on a row it belongs to'}`)
  }

  /* ── R162 · the AI Visualizer's sample rooms are the owner's photos (pending modules S43C — her "fix all the pending things" 2026-10-15;
     the ledger's F1-05) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     The sample photos and the kitchen sketch are the owner's new ones (1.0's 4a51f3522), each room traced again, its looks, relit picture
     and empty plate made by the engine from the photo itself. What the demo kept of the old rooms follows: (a) a sample room's stored
     reading becomes the room's reading now — a surface or piece the studio redrew or hid keeps that only where the same id still names the
     same thing, its own additions always stay; (b) the demo's versions (R61's fixed ids — Kevin Ng's living room, bedroom and kitchen, the
     showroom's kitchen sketch) list what their pictures show: a look is the engine's restyle with its picks, the edit DEMO_EDIT on the new
     labels; (c) every client link's frozen copy of those versions says the same; (d) the two pins sit on what they talk about (the walnut
     floor, the emerald sofa); (e) the two swatch materials carry the colour their new swatch photos read as. Idempotent: each step writes
     only what differs from what the rooms say now; its check is below. */
  console.log('\nR162 the sample rooms are the owner’s photos')
  {
    const say: string[] = []
    /* (a) */
    let readings = 0
    for (const r of rows<{ id: string; sample_key: string; detection_json: string }>(await client.execute(`SELECT id, sample_key, detection_json FROM project_rooms WHERE sample_key IS NOT NULL AND detection_json IS NOT NULL`))) {
      const sample = sampleByKey(r.sample_key)
      let d: Detection
      try { d = JSON.parse(r.detection_json) as Detection } catch { continue }
      if (!sample || d.source !== 'sample') continue
      const fresh = sampleDetection(sample, d.kind === 'sketch')
      const was = new Map([...d.surfaces, ...d.furniture].map((x) => [x.id, x]))
      const still = (id: string, label: string) => { const o = was.get(id); return !!o && !o.manual && o.label === label }
      const keepRegion = <T extends { id: string; label: string; region?: { x: number; y: number }[] }>(x: T): T => { const o = was.get(x.id); return still(x.id, x.label) && o?.region ? { ...x, region: o.region } : x }
      const freshLabel = new Map([...fresh.surfaces, ...fresh.furniture].map((x) => [x.id, x.label]))
      const hidden = (d.hidden ?? []).filter((id) => { const o = was.get(id); return !!o && (o.manual || freshLabel.get(id) === o.label) })
      const next: Detection = { ...fresh, ...(d.hidden ? { hidden } : {}), surfaces: [...fresh.surfaces.map(keepRegion), ...d.surfaces.filter((x) => x.manual)], furniture: [...fresh.furniture.map(keepRegion), ...d.furniture.filter((x) => x.manual)] }
      if (JSON.stringify(next) === JSON.stringify(d)) continue
      await client.execute({ sql: `UPDATE project_rooms SET detection_json = ? WHERE id = ?`, args: [JSON.stringify(next), r.id] })
      readings++
    }
    if (readings) say.push(`${readings} sample room reading(s) on the owner’s photos`)
    /* (b) */
    const kevin = rows<{ id: string }>(await client.execute(`SELECT id FROM leads WHERE name = 'Kevin Ng' ORDER BY created_at LIMIT 1`))[0]?.id ?? null
    const golden = presetById(DEMO_EDIT.relit.preset)!.label
    const edit = demoEdit()
    const want = new Map<string, { applied: Applied; finishes: Finishes }>()
    if (kevin) {
      const J = (room: string, tag: string) => sid(kevin, `viz-job-${room}-${tag}`)
      want.set(J('living-room', 'japandi'), demoLook('living-room', 'Japandi', 'restyle'))
      want.set(J('living-room', 'edit'), edit)
      want.set(J('living-room', 'golden'), { applied: { ...vizBlank('relight'), lighting: golden }, finishes: { ...edit.finishes, lighting: golden } })
      want.set(J('kitchen', 'scandinavian'), demoLook('kitchen', 'Scandinavian', 'restyle'))
    }
    want.set(sid('showroom-kitchen', 'viz-job'), demoLook('kitchen', 'Japandi', 'sketch'))
    const rewritten = new Map<string, { applied: Applied; n: number }>()
    for (const [jobId, w] of want) {
      const job = rows<{ variants_json: string; style: string | null }>(await client.execute({ sql: `SELECT variants_json, style FROM render_jobs WHERE id = ?`, args: [jobId] }))[0]
      if (!job) continue
      let vs: Variant[]
      try { vs = JSON.parse(job.variants_json) as Variant[] } catch { continue }
      const v = vs.find((x) => x.id === 1)
      if (!v) continue
      rewritten.set(versionKey(jobId, 1), { applied: w.applied, n: v.n })
      /* only what a version says it did — its picture, its place in the room and when it was made stay */
      const next = vs.map((x) => (x.id === 1 ? { ...x, applied: { ...w.applied, caveat: x.applied?.caveat ?? null }, finishes: w.finishes, materials: vizMaterials(w.applied) } : x))
      const style = descriptor(w.applied)
      if (JSON.stringify(next) === job.variants_json && style === job.style) continue
      await client.execute({ sql: `UPDATE render_jobs SET variants_json = ?, style = ? WHERE id = ?`, args: [JSON.stringify(next), style, jobId] })
      say.push(`version ${style} now lists what its picture shows`)
    }
    /* (c) */
    let links = 0
    for (const l of rows<{ id: string; snapshot: string }>(await client.execute(`SELECT id, snapshot FROM render_share_links WHERE snapshot IS NOT NULL`))) {
      let snap: { versions?: { key: string; label: string; materials: { label: string; material: string }[] }[] }
      try { snap = JSON.parse(l.snapshot) } catch { continue }
      if (!Array.isArray(snap.versions)) continue
      let changed = false
      const versions = snap.versions.map((v) => {
        const w = rewritten.get(v.key); if (!w) return v
        const label = `V${w.n} · ${descriptor(w.applied)}`, materials = changeLines(w.applied).map((c) => ({ label: c.what, material: c.to }))
        if (label === v.label && JSON.stringify(materials) === JSON.stringify(v.materials)) return v
        changed = true
        return { ...v, label, materials }
      })
      if (!changed) continue
      await client.execute({ sql: `UPDATE render_share_links SET snapshot = ? WHERE id = ?`, args: [JSON.stringify({ ...snap, versions }), l.id] })
      links++
    }
    if (links) say.push(`${links} client link(s) say the same`)
    /* (d) */
    if (kevin) {
      const pinMoves: [string, { x: number; y: number }][] = [[sid(kevin, 'viz-pin-studio'), VIZ_PINS.studio], [sid(kevin, 'viz-pin-client'), VIZ_PINS.client]]
      for (const [id, at] of pinMoves) {
        const r = await client.execute({ sql: `UPDATE render_annotations SET x = ?, y = ? WHERE id = ? AND (abs(x - ?) > 0.0001 OR abs(y - ?) > 0.0001)`, args: [at.x, at.y, id, at.x, at.y] })
        if (r.rowsAffected) say.push('a pin moved onto what it talks about')
      }
    }
    /* (e) */
    for (const [id, sw] of [['sm-walnut-vinyl', DEMO_EDIT.swatches.walnut], ['sm-oak-veneer', DEMO_EDIT.swatches.oak]] as const) {
      const r = await client.execute({ sql: `UPDATE studio_materials SET hex = ? WHERE id = ? AND image_url = ? AND hex <> ?`, args: [sw.hex, id, sw.image, sw.hex] })
      if (r.rowsAffected) say.push(`${id}: its swatch reads ${sw.hex}`)
    }
    console.log(`  ${say.length ? say.join(' · ') : 'already in step — the sample rooms are the owner’s photos'}`)
  }

  /* ── R127 · A letter of appointment in the contract library (S44R — UAT row 358, call C7, as recommended — her UAT ask 2026-10-15) ─────
     Spaces Studio starts a project with a letter of appointment and a deposit: the library holds one, written on the house's fields (the
     Deposit field reads the quote's first payment), with the client's signature at its foot. Seeded once — a studio's edits are kept; never
     the default, never the handover letter. Nothing else changes: Settings › Projects › When a project starts stays "The quote is signed". */
  console.log('\nR127 a letter of appointment in the contract library')
  {
    const id = sid('template', 'contract-appointment')
    const at = D0 - 12 * D + 10 * H
    const r = await client.execute({ sql: `INSERT INTO contract_templates (id, title, body, created_by, updated_by, created_at, updated_at, requires_scroll, requires_accept, kind) VALUES (?, ?, ?, 'dane', 'dane', ?, ?, 1, 1, 'document') ON CONFLICT(id) DO NOTHING`, args: [id, APPOINTMENT_TITLE, appointmentHtml(), at, at] })
    console.log(`  ${r.rowsAffected ? `“${APPOINTMENT_TITLE}” added to Company › Templates › Contracts` : 'already in the library'}`)
  }

  /* ── R128 · A supplier bill waiting for its OK (S44R — UAT row 361, call C8, as recommended; REVERSES F1-Q10 "bills: no approval") ───────
     Settings › Finance › Money out now holds bills over the PO approval limit with no PO (or more than their PO by over the tolerance) for an
     Owner's or an Admin's OK before they are paid. The demo shows it with its whole trail: Priya (Accounting) recorded Bright Spark Electrical's
     bill EL-2207 on Benjamin Han's project two days ago — S$5,600 + GST, on no PO, so over the S$5,000 limit — its Activity line says it waits,
     and Dane and Hui Min each have its bell row. The five bills recorded before keep paying as they did: each is on its PO and within it, or
     its recorder approves (Hui Min's rent), or something is paid on it. Idempotent (fixed ids). */
  console.log('\nR128 a supplier bill waiting for its OK')
  {
    const [proj] = rows<{ id: string; lead_id: string; name: string }>(await client.execute(`SELECT id, lead_id, name FROM projects WHERE number = 'P-2026-002' AND deleted_at IS NULL LIMIT 1`))
    const [vendor] = rows<{ id: string; name: string }>(await client.execute(`SELECT id, name FROM vendors WHERE name = 'Bright Spark Electrical' LIMIT 1`))
    const [priya] = rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE id = 'priya' AND coalesce(is_active, 1) = 1 LIMIT 1`))
    if (!proj || !vendor || !priya) console.log('  skipped — Benjamin Han’s project, Bright Spark Electrical or Priya is not in this database')
    else {
      const id = sid('bill', 'ben-electrical-EL-2207')
      const at = D0 - 2 * D + 10 * H
      const sub = 560000, gst = Math.round((sub * 9) / 100), total = sub + gst
      const lines = JSON.stringify([{ id: 'r1', description: 'Electrical rewiring, whole unit — 32 points, new DB box', qty: 1, unitMinor: 480000 }, { id: 'r2', description: 'Lighting installation, living and bedrooms', qty: 1, unitMinor: 80000 }])
      const made = await client.execute({ sql: `INSERT OR IGNORE INTO supplier_bills (id, project_id, vendor_id, po_id, reference, issued_on, due_on, subtotal_minor, gst_minor, total_minor, lines_json, note, read_from, read_fields, created_by, created_at, updated_by, updated_at, approval_why) VALUES (?,?,?,NULL,?,?,?,?,?,?,?,NULL,NULL,NULL,'priya',?,'priya',?,'limit')`,
        args: [id, proj.id, vendor.id, 'EL-2207', at - D, at + 12 * D, sub, gst, total, lines, at, at] })
      const words = 'Over S$5,000.00, on no PO'
      const money = `S$${(total / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 })}`
      await client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`,
        args: [sid(id, 'event:recorded'), proj.lead_id, 'project_bill_recorded', 'priya', at, JSON.stringify({ name: proj.name, id, title: 'EL-2207', vendor: vendor.name, to: money, po: null, due: displayDate(new Date((at + 12 * D) * 1000)), waits: words }), proj.id] })
      let bells = 0
      for (const m of rows<{ id: string }>(await client.execute(`SELECT id FROM members WHERE role IN ('Owner','Admin') AND coalesce(is_active, 1) = 1`))) {
        const b = await client.execute({ sql: `INSERT OR IGNORE INTO notifications (id, member_id, kind, title, body, href, lead_id, quote_id, channels, actor_id, created_at, read_at) VALUES (?,?,?,?,?,?,?,NULL,?,?,?,NULL)`,
          args: [sid(id, `bell:review:${m.id}`), m.id, 'bill_review', `${vendor.name}’s bill EL-2207 needs your OK before it is paid`, `${money} · ${words} · ${proj.name}`, `/company/finance/todo?open=${id}`, proj.lead_id, 'in_app,email', 'priya', at] })
        bells += b.rowsAffected
      }
      console.log(`  ${made.rowsAffected ? `EL-2207 recorded by Priya, waiting for an Owner’s or an Admin’s OK${bells ? ` — ${bells} bell row(s)` : ''}` : 'EL-2207 is on record'}`)
    }
  }

  /* ── R129 · The completion & warranty letter, used at handover (S44R — UAT row 359, call C9, as recommended — her UAT ask 2026-10-15) ─────
     The library holds "Completion & Warranty Letter", written on the Handover fields (the project's number, the completion day, the defects
     period and the day it ends) with the client's "Received by" signature, and marked *Use at handover* — the Hand over sheet offers it.
     Seeded once; marked only while no other template is (one at most — a studio's own pick stands). No letter is sent in the demo: none of its
     projects is completed by the Hand over sheet since (Shalini Menon's ended before letters existed). */
  console.log('\nR129 the completion letter, used at handover')
  {
    const id = sid('template', 'contract-completion')
    const at = D0 - 12 * D + 10 * H + 600
    const r = await client.execute({ sql: `INSERT INTO contract_templates (id, title, body, created_by, updated_by, created_at, updated_at, requires_scroll, requires_accept, kind) VALUES (?, ?, ?, 'dane', 'dane', ?, ?, 0, 0, 'document') ON CONFLICT(id) DO NOTHING`, args: [id, COMPLETION_TITLE, completionHtml(), at, at] })
    const marked = await client.execute({ sql: `UPDATE contract_templates SET use_at_handover = 1 WHERE id = ? AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM contract_templates WHERE use_at_handover = 1)`, args: [id] })
    console.log(`  ${r.rowsAffected ? `“${COMPLETION_TITLE}” added` : 'in the library'}${marked.rowsAffected ? ' and used at handover' : ''}`)
  }

  /* ── R148 · Contractors on site (S45B · H-UHD-2 — her "build everything and complete it" 2026-10-17; 1.0's `uhd-contractors.sql` and
     `uhd-sample-projects.sql`, in the demo's own vendors and projects — no sample projects, no second roster) ─────────────────────────────
     Six of Finance › Vendors' trades people are marked as working on site (their trades from the studio's own list, the sites they run at
     once, the studio's code): Woodcraft (Carpentry, one site), Stone & Tile (Hacking · Masonry · Tiling, two), Bright Spark (Electrical, two),
     AquaFlow (Plumbing, two), ColourPro (Painting, one), Floor Xpert (Flooring, one) and ClearView (Fittings, two). The suppliers (Hafary, Soon
     Bee Huat, the haulage and the co-work) stay suppliers, and Wood Craft Carpentry stays the merge demo's duplicate.
     Their places on the projects follow each project's own schedule and its records: Shalini's finished job has its five crews done (Dane's
     Leader check on each); Ryan's — hacking and masonry done and checked, Bright Spark's electrical done (the stage waits on the plumber's
     pressure test — AquaFlow still on it, running late), Woodcraft on site on the carpentry (running late), and **no painter on Painting**, which
     was to start this week (the gap the view and Needs you show; ColourPro is free); Benjamin's — the wet works done, Woodcraft on site on the
     carpentry too (so Woodcraft runs two sites against one — over capacity), and Bright Spark on dates of its own for three days of extra
     lighting points (free again within the week); Aisha's (on hold) — Stone & Tile on site and the next crews planned, none busy while she is
     away; Marcus's — no schedule yet, Floor Xpert booked on dates of its own three weeks out. Each place has the line the app writes (put on,
     on site, checked) at its moment, by the project's member. Idempotent: fixed ids, INSERT OR IGNORE; a vendor already marked keeps its own
     answers. Guarded: each project and milestone must be there, else that place is skipped and said. */
  console.log('\nR148 contractors on site')
  {
    const vendorBy = async (name: string) => rows<{ id: string; is_contractor: number; name: string }>(await client.execute({ sql: `SELECT id, is_contractor, name FROM vendors WHERE name = ? AND is_active = 1 AND merged_into IS NULL LIMIT 1`, args: [name] }))[0] ?? null
    const CREW: [string, string[], number, string][] = [
      ['Woodcraft Carpentry Pte Ltd', ['Carpentry'], 1, 'WC'],
      ['Stone & Tile Masonry Pte Ltd', ['Hacking', 'Masonry', 'Tiling'], 2, 'ST'],
      ['Bright Spark Electrical', ['Electrical'], 2, 'BS'],
      ['AquaFlow Plumbing Works', ['Plumbing'], 2, 'AF'],
      ['ColourPro Painting Services', ['Painting'], 1, 'CP'],
      ['Floor Xpert Pte Ltd', ['Flooring'], 1, 'FX'],
      ['ClearView Glass & Aluminium', ['Fittings'], 2, 'CV'],
    ]
    const ids = new Map<string, string>()
    let marked = 0
    for (const [name, trades, cap, code] of CREW) {
      const v = await vendorBy(name)
      if (!v) { console.log(`  ${name} isn’t in the directory — skipped`); continue }
      ids.set(name, v.id)
      if (v.is_contractor) continue
      await client.execute({ sql: `UPDATE vendors SET is_contractor = 1, trades_json = ?, crew_capacity = ?, code = ?, updated_by = 'dane', updated_at = ? WHERE id = ? AND is_contractor = 0`, args: [JSON.stringify(trades), cap, code, NOW - 30 * D, v.id] })
      marked++
    }
    type Place = { project: string; milestone: string | null; vendor: string; trade: string; status: 'planned' | 'on_site' | 'done'; checkedBy?: string; own?: [number, number]; note?: string }
    const PLACES: Place[] = [
      /* Shalini Menon — handed over: every crew done, each Leader checked */
      { project: 'P-2025-001', milestone: 'Hacking & demolition', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Hacking', status: 'done', checkedBy: 'dane' },
      { project: 'P-2025-001', milestone: 'Electrical & plumbing', vendor: 'Bright Spark Electrical', trade: 'Electrical', status: 'done', checkedBy: 'dane' },
      { project: 'P-2025-001', milestone: 'Electrical & plumbing', vendor: 'AquaFlow Plumbing Works', trade: 'Plumbing', status: 'done', checkedBy: 'dane' },
      { project: 'P-2025-001', milestone: 'Carpentry', vendor: 'Woodcraft Carpentry Pte Ltd', trade: 'Carpentry', status: 'done', checkedBy: 'dane' },
      { project: 'P-2025-001', milestone: 'Painting & cleaning', vendor: 'ColourPro Painting Services', trade: 'Painting', status: 'done', checkedBy: 'dane' },
      /* Ryan D'Souza — the plumber's pressure test holds Electrical & plumbing; the carpentry runs late; nobody on Painting yet */
      { project: 'P-2026-001', milestone: 'Hacking & demolition', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Hacking', status: 'done', checkedBy: 'dane' },
      { project: 'P-2026-001', milestone: 'Masonry & tiling', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Tiling', status: 'done', checkedBy: 'dane' },
      { project: 'P-2026-001', milestone: 'Electrical & plumbing', vendor: 'Bright Spark Electrical', trade: 'Electrical', status: 'done', checkedBy: 'huimin' },
      { project: 'P-2026-001', milestone: 'Electrical & plumbing', vendor: 'AquaFlow Plumbing Works', trade: 'Plumbing', status: 'on_site', note: 'The pressure test needs the PUB inspector — AquaFlow books him' },
      { project: 'P-2026-001', milestone: 'Carpentry fabrication', vendor: 'Woodcraft Carpentry Pte Ltd', trade: 'Carpentry', status: 'on_site' },
      /* Benjamin Han — the wet works done; Woodcraft on site on the carpentry as well; three days of extra lighting points on their own dates */
      { project: 'P-2026-002', milestone: 'Hacking & demolition', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Hacking', status: 'done', checkedBy: 'dane' },
      { project: 'P-2026-002', milestone: 'Masonry & tiling', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Tiling', status: 'done' },
      { project: 'P-2026-002', milestone: 'Electrical & plumbing', vendor: 'Bright Spark Electrical', trade: 'Electrical', status: 'done', checkedBy: 'huimin' },
      { project: 'P-2026-002', milestone: 'Electrical & plumbing', vendor: 'AquaFlow Plumbing Works', trade: 'Plumbing', status: 'done' },
      { project: 'P-2026-002', milestone: 'Carpentry fabrication', vendor: 'Woodcraft Carpentry Pte Ltd', trade: 'Carpentry', status: 'on_site' },
      { project: 'P-2026-002', milestone: null, vendor: 'Bright Spark Electrical', trade: 'Electrical', status: 'on_site', own: [-1, 1], note: 'Extra lighting points in the study — Benjamin’s ask after the wiring' },
      /* Aisha Rahman — on hold while she is away: the crews keep their places, none busy */
      { project: 'P-2026-003', milestone: 'Hacking & demolition', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Hacking', status: 'done', checkedBy: 'dane' },
      { project: 'P-2026-003', milestone: 'Masonry & tiling', vendor: 'Stone & Tile Masonry Pte Ltd', trade: 'Masonry', status: 'on_site' },
      { project: 'P-2026-003', milestone: 'Electrical & plumbing', vendor: 'AquaFlow Plumbing Works', trade: 'Plumbing', status: 'planned' },
      { project: 'P-2026-003', milestone: 'Carpentry fabrication', vendor: 'Woodcraft Carpentry Pte Ltd', trade: 'Carpentry', status: 'planned' },
      /* Marcus Teo — no schedule yet: the flooring crew booked on its own dates */
      { project: 'P-2026-004', milestone: null, vendor: 'Floor Xpert Pte Ltd', trade: 'Flooring', status: 'planned', own: [20, 24], note: 'Booked early — vinyl planks for the bedrooms' },
    ]
    const short = (n: string) => n.replace(/\b(pte\.?|ltd\.?)(?=\s|$)/gi, '').replace(/\s+/g, ' ').trim().replace(/[\s,&.-]+$/, '')
    let made = 0
    for (const pl of PLACES) {
      const vendorId = ids.get(pl.vendor)
      const [p] = rows<{ id: string; lead_id: string; name: string; number: string; created_at: number }>(await client.execute({ sql: `SELECT id, lead_id, name, number, created_at FROM projects WHERE number = ? AND deleted_at IS NULL`, args: [pl.project] }))
      if (!vendorId || !p) { console.log(`  ${pl.project} · ${pl.vendor}: not there — skipped`); continue }
      const [m] = pl.milestone ? rows<{ id: string; start_date: number; end_date: number; status: string }>(await client.execute({ sql: `SELECT id, start_date, end_date, status FROM project_milestones WHERE project_id = ? AND title = ? AND deleted_at IS NULL LIMIT 1`, args: [p.id, pl.milestone] })) : []
      if (pl.milestone && !m) { console.log(`  ${pl.project} · ${pl.milestone}: no such milestone — skipped`); continue }
      const id = sid(`${p.id}:${pl.milestone ?? 'own'}:${vendorId}:${pl.trade}`, 'r148:crew')
      const [have] = rows<{ id: string }>(await client.execute({ sql: `SELECT id FROM project_contractors WHERE id = ?`, args: [id] }))
      if (have) continue
      const [who] = rows<{ member_id: string }>(await client.execute({ sql: `SELECT member_id FROM lead_assignees WHERE lead_id = ? ORDER BY assigned_at LIMIT 1`, args: [p.lead_id] }))
      const by = who?.member_id ?? 'dane'
      const start = m ? m.start_date : D0 + pl.own![0] * D, end = m ? m.end_date : D0 + pl.own![1] * D
      /* put on five days before the work (never before the project, never after now), on site at 9:00 on its first day, checked the day after it ended */
      const opened = Number(p.created_at) > 1e12 ? Math.floor(Number(p.created_at) / 1000) : Number(p.created_at)
      const putOn = Math.min(NOW - 2 * H, Math.max(opened + H, Math.min(start - 5 * D + 10 * H, D0 - 2 * D + 10 * H)))
      const onSite = Math.min(NOW - H, Math.max(putOn + H, start + 9 * H))
      const checked = pl.checkedBy ? Math.min(NOW - 30 * 60, Math.max(onSite + H, end + D + 17 * H)) : null
      const updated = pl.status === 'done' ? Math.min(NOW - 60, Math.max(onSite, end + 18 * H)) : pl.status === 'on_site' ? onSite : putOn
      await client.execute({
        sql: `INSERT OR IGNORE INTO project_contractors (id, project_id, vendor_id, trade, milestone_id, start_date, end_date, status, note, checked_by, checked_at, created_by, created_at, updated_by, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [id, p.id, vendorId, pl.trade, m?.id ?? null, m ? null : start, m ? null : end, pl.status, pl.note ?? null, pl.checkedBy ?? null, checked !== null ? checked * 1000 : null, by, putOn * 1000, by, updated * 1000],
      })
      const ev = (kind: string, at: number, actor: string, detail: Record<string, unknown>) => client.execute({ sql: `INSERT OR IGNORE INTO lead_events (id, lead_id, kind, actor_id, at, detail, project_id) VALUES (?,?,?,?,?,?,?)`,
        args: [sid(id, `r148:${kind}`), p.lead_id, kind, actor, at, JSON.stringify({ name: p.name, number: p.number, id, vendor: short(pl.vendor), trade: pl.trade, ...(pl.milestone ? { title: pl.milestone } : {}), ...detail }), p.id] })
      await ev('project_contractor_assigned', putOn, by, { status: 'planned' })   // no dates in its words: a milestone's move with the demo day would leave them behind (S42A's EMBEDDED rule)
      if (pl.status === 'on_site') await ev('project_contractor_status', onSite, by, { from: 'Planned', to: 'On site', before: { status: 'planned' } })
      if (checked !== null) await ev('project_contractor_checked', checked, pl.checkedBy!, { before: { checkedBy: null, checkedAt: null } })
      made++
    }
    console.log(`  ${marked} vendor(s) marked as working on site · ${made} place(s) on projects${made || marked ? '' : ' — already in step'}`)
  }

  /* ── R176 · Deleted Leads' demo leads sit inside its 30 days (pending modules S46C · R1 — her "fix everything" 2026-10-19, findability L-1) ──
     Deleted Leads now keeps the promise its words make — a lead deleted more than 30 days ago is removed for good (lib/leads/purge.ts
     `purgeExpiredLeads`, run whenever the sheet is read and by the daily sweep). The demo's deleted leads were deleted 46–57 days before the demo
     day, so the sheet would have emptied on its first read. Each keeps its story and its order — Jason Lim (Not a real lead), then Daniel Ong
     (Duplicate), then the six test leads deleted together — now 25, 19 and 14 days before the day it runs; a restore moves every moment with
     the demo day (lib/db/demo-day.ts), so they stay inside the 30 days. Only a deleted lead no project keeps and older than 28 days moves (any
     other: 20 days), never before it was made; `updated_at` follows where it was the deletion's moment. Idempotent: a second run finds none. */
  console.log('\nR176 deleted demo leads inside Deleted Leads’ 30 days')
  {
    const DAY_S = 86_400, nowS = Math.floor(Date.now() / 1000)
    const AGO: Record<string, number> = {
      '793719a3-2863-4daa-ac02-feb4358d7a01': 25,   // Jason Lim — Not a real lead
      'de7dd8d9-3485-416c-bc30-24e8ad0376e0': 19,   // Daniel Ong — Duplicate
      ...Object.fromEntries(['b4e86bf8-9eba-4fa3-bbef-d8c3ffa8b29f', 'cdd17b82-c0ad-457a-aee2-8f9a3158f89d', '75b22b2c-ee2e-454b-b96c-a9e888cc17a1',
        '9c4e9136-7c42-4bad-9ce0-fa158605d2f1', 'c37196a9-9afa-4d5d-99ab-dffab3a3b173', 'e27ce3b9-d4f6-4731-98ad-e79f4f2dc12e'].map((id) => [id, 14])),   // the six test leads, one delete
    }
    const stale = rows<{ id: string; created_at: number }>(await client.execute({ sql: `SELECT id, created_at FROM leads WHERE deleted_at IS NOT NULL AND direct = 0 AND deleted_at < ? AND id NOT IN (SELECT lead_id FROM projects)`, args: [nowS - 28 * DAY_S] }))
    for (const l of stale) {
      const at = Math.max(nowS - (AGO[l.id] ?? 20) * DAY_S, Number(l.created_at) + 3600)
      await client.execute({ sql: `UPDATE leads SET updated_at = CASE WHEN updated_at = deleted_at THEN ? ELSE updated_at END, deleted_at = ? WHERE id = ?`, args: [at, at, l.id] })
    }
    console.log(`  ${stale.length ? `${stale.length} deleted lead(s) brought inside the 30 days` : 'every deleted lead inside the 30 days'}`)
  }

  /* (pending modules S43C, R162) the labels each sample room has now — a version on it lists only those */
  const SAMPLE_LABEL_CHECK = SAMPLE_ROOMS.map((r) => `SELECT j.id FROM render_jobs j JOIN project_rooms pr ON pr.id = j.room_id, json_each(j.variants_json) v, json_each(json_extract(v.value, '$.applied.surfaces')) s WHERE pr.sample_key = '${r.key}' AND json_extract(s.value, '$.id') LIKE '${r.key}-s%' AND json_extract(s.value, '$.label') NOT IN (${r.surfaces.map((x) => `'${x.label.replace(/'/g, "''")}'`).join(', ')})`).join(' UNION ALL ')

  /* (S44O — C3, R163) a quote this run seeded with its client since R163 ran keeps the GST its amount was worked out by */
  { const late = await stampSentGst(); if (late.line + late.rate) note(`R163 again: ${late.line + late.rate} quote(s) seeded since stamped`) }
  const checks: [string, string][] = [
    /* (pending modules S46C · R1, R176) Deleted Leads keeps its 30 days — nothing it lists is past them, unless a project keeps it */
    ['deleted lead past Deleted Leads’ 30 days that no project keeps (S46C, R176)', `SELECT name FROM leads WHERE deleted_at IS NOT NULL AND direct = 0 AND deleted_at < strftime('%s','now') - 30 * 86400 AND id NOT IN (SELECT lead_id FROM projects)`],
    ['deleted lead deleted before it was made (S46C, R176)', `SELECT name FROM leads WHERE deleted_at IS NOT NULL AND deleted_at < created_at`],
    /* (S45B · H-UHD-2, R148) contractors on site keep their rules */
    ['contractor with no trade, or sites at once out of 1–20 (S45B, R148)', `SELECT name FROM vendors WHERE is_contractor = 1 AND (trades_json IS NULL OR json_valid(trades_json) = 0 OR json_array_length(trades_json) = 0 OR crew_capacity < 1 OR crew_capacity > 20)`],
    ['crew row on a missing vendor, or on a milestone of another project (S45B, R148)', `SELECT c.id FROM project_contractors c LEFT JOIN vendors v ON v.id = c.vendor_id LEFT JOIN project_milestones m ON m.id = c.milestone_id WHERE v.id IS NULL OR (c.milestone_id IS NOT NULL AND m.id IS NOT NULL AND m.project_id <> c.project_id)`],
    ['crew row on its own dates with a day missing or the last before the first (S45B, R148)', `SELECT id FROM project_contractors WHERE milestone_id IS NULL AND (start_date IS NULL OR end_date IS NULL OR end_date < start_date)`],
    ['crew row of an unknown status, or checked without who or when (S45B, R148)', `SELECT id FROM project_contractors WHERE status NOT IN ('planned','on_site','done') OR ((checked_at IS NULL) <> (checked_by IS NULL))`],
    ['the same contractor twice on one milestone for one trade (S45B, R148)', `SELECT project_id FROM project_contractors WHERE removed_at IS NULL GROUP BY project_id, vendor_id, lower(trade), coalesce(milestone_id, '') HAVING count(*) > 1`],
    ['crew row with no line saying who put them on, or checked with no check line (S45B, R148 — REG-343)', `SELECT c.id FROM project_contractors c WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.kind = 'project_contractor_assigned' AND json_extract(e.detail, '$.id') = c.id) OR (c.checked_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.kind = 'project_contractor_checked' AND json_extract(e.detail, '$.id') = c.id))`],
    /* (S44R, R127 · R128 · R129) the agreements' and the bills' new records keep their rules */
    ['more than one contract template used at handover (S44R, R129)', `SELECT id FROM contract_templates WHERE use_at_handover = 1 AND deleted_at IS NULL AND (SELECT count(*) FROM contract_templates WHERE use_at_handover = 1 AND deleted_at IS NULL) > 1`],
    ['a standard PDF used at handover (S44R, R129)', `SELECT id FROM contract_templates WHERE use_at_handover = 1 AND kind = 'pdf'`],
    ['a bill approved that never waited, or waiting with a reason the app doesn’t know (S44R, R128)', `SELECT id FROM supplier_bills WHERE (approved_at IS NOT NULL AND approval_why IS NULL) OR (approval_why IS NOT NULL AND approval_why NOT IN ('limit', 'differs'))`],
    ['a bill waiting for its OK with something paid on it — paid before it was approved (S44R, R128)', `SELECT b.id FROM supplier_bills b WHERE b.approval_why IS NOT NULL AND b.approved_at IS NULL AND b.deleted_at IS NULL AND b.created_at > ${NOW - 365 * D} AND EXISTS (SELECT 1 FROM payments_out p WHERE p.bill_id = b.id AND p.reversed_at IS NULL AND p.created_at > b.created_at)`],
    ['a letter to read that is not a handover letter, or a handover letter that names a quote (S44R, C9)', `SELECT id FROM contracts WHERE (to_read = 1 AND coalesce(purpose, '') <> 'handover') OR (purpose = 'handover' AND from_quote_id IS NOT NULL)`],
    ['a contract asking for the deposit with no quote to ask it of (S44R, C7)', `SELECT id FROM contracts WHERE ask_deposit = 1 AND from_quote_id IS NULL AND deleted_at IS NULL`],
    /* (S44Q, R172) no stored rich text carries a script, an event handler or a script link — the allowlist on every save and render */
    ['stored rich text with a script, a handler or a script link (S44Q, R172)', `SELECT 'quote_items:' || id FROM quote_items WHERE (description_html LIKE '%<script%' OR description_html LIKE '%<iframe%' OR description_html LIKE '%<img %onerror%' OR description_html LIKE '%href=_javascript:%' OR description_html LIKE '%href=javascript:%')
      UNION ALL SELECT 'quotes:' || id FROM quotes WHERE (coalesce(terms_html, '') || coalesce(notes_html, '') LIKE '%<script%' OR coalesce(terms_html, '') || coalesce(notes_html, '') LIKE '%<iframe%' OR coalesce(terms_html, '') || coalesce(notes_html, '') LIKE '%<img %onerror%' OR coalesce(terms_html, '') || coalesce(notes_html, '') LIKE '%href=_javascript:%' OR coalesce(terms_html, '') || coalesce(notes_html, '') LIKE '%href=javascript:%')
      UNION ALL SELECT 'price_book_items:' || id FROM price_book_items WHERE (description_html LIKE '%<script%' OR description_html LIKE '%<iframe%' OR description_html LIKE '%<img %onerror%' OR description_html LIKE '%href=_javascript:%' OR description_html LIKE '%href=javascript:%')
      UNION ALL SELECT 'price_book_sections:' || id FROM price_book_sections WHERE (lines_json LIKE '%<script%' OR lines_json LIKE '%<iframe%' OR lines_json LIKE '%<img %onerror%' OR lines_json LIKE '%href=_javascript:%' OR lines_json LIKE '%href=javascript:%')
      UNION ALL SELECT 'quote_text_templates:' || id FROM quote_text_templates WHERE (body LIKE '%<script%' OR body LIKE '%<iframe%' OR body LIKE '%<img %onerror%' OR body LIKE '%href=_javascript:%' OR body LIKE '%href=javascript:%')`],   /* the tripwire's shapes; the allowlist on every save and render is the guarantee */
    /* (S44Q, R173) a quote prints through a pinned template version — a Blank Quote is pinned to the default's */
    ['quote with no template while a default is published (S44Q, R173)', `SELECT number FROM quotes WHERE template_id IS NULL AND EXISTS (SELECT 1 FROM quote_templates WHERE is_default = 1 AND status = 'published' AND deleted_at IS NULL)`],
    /* (S44T, R126) a section priced after the contract is a quote's own top section; a fixed fee's word sits on a fixed row */
    ['priced after the contract on a line, a sub-section or a variation order (S44T, R126)', `SELECT id FROM quote_items WHERE priced_after = 1 AND (kind <> 'group' OR parent_id IS NOT NULL OR quote_id IN (SELECT id FROM quotes WHERE kind = 'variation'))`],
    ['a fixed fee’s word on a row that is not a fixed fee (S44T, R126)', `SELECT id FROM quote_payments WHERE fixed_label IS NOT NULL AND fixed_minor IS NULL`],
    /* (pending modules S43C, R162) a sample room's version lists only surfaces and pieces the room has now */
    ['sample-room version listing a surface the room no longer has (S43C, R162)', SAMPLE_LABEL_CHECK],
    /* (S42F, R161) a project's client record always has a member — New project, Duplicate and Won refuse one without (TEAM_NEEDED) */
    ['project whose client record has no member (S42F, R161)', `SELECT p.number FROM projects p WHERE NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = p.lead_id)`],
    /* (S42 B-18, R160) a mobile number is one person's: a member's never a client's (sign-in, the portal's sign-in and the duplicate finder key on it) */
    ['member whose mobile is also a client’s (S42 B-18, R160)', `SELECT m.name FROM members m WHERE m.phone IS NOT NULL AND m.phone <> '' AND (EXISTS (SELECT 1 FROM leads l WHERE l.deleted_at IS NULL AND (l.phone = m.phone OR l.client2_phone = m.phone)) OR EXISTS (SELECT 1 FROM homeowner_profiles h WHERE h.phone = m.phone))`],
    /* (S42E, R170) Demo Studio's papers, portal and public pages wear its own logo, never OpenMaison's mark */
    ['brand kit logo is OpenMaison’s mark (S42E, R170)', `SELECT key FROM settings WHERE key = 'brand' AND json_extract(value, '$.kit.logo') = '/figma-assets/logo.svg'`],
    /* (S42E, R171) the sample articles' titles and first lines in the house's quotes (their bodies are checked in R171's block) */
    ['Market Insights sample title or first lines with a straight quote (S42E, R171)', `SELECT id FROM market_insights WHERE sample = 1 AND removed_at IS NULL AND (title GLOB '*[''"]*' OR coalesce(excerpt, '') GLOB '*[''"]*')`],
    /* (S42 audit A-03, R125) the demo's recent moments stay recent: the floor plan shown to Benjamin Han inside the portal's "new" window, his
       newest site update inside the Dashboard's fortnight, and an update's Activity line on its update's own moment */
    ['the floor plan shown to Benjamin Han has left the portal’s “new for 7 days” window (S42 A-03, R125)', `SELECT f.id FROM lead_files f JOIN leads l ON l.id = f.lead_id WHERE l.name = 'Benjamin Han' AND f.name LIKE 'Floor plan — %' AND f.deleted_at IS NULL AND f.shown_to_client_at IS NOT NULL AND f.shown_to_client_at < ${NOW - 7 * D}`],
    ['Benjamin Han’s newest site update has left the Dashboard’s fortnight (S42 A-03, R125)', `SELECT u.id FROM project_updates u WHERE u.title = 'Kitchen cabinets are in' AND u.status = 'published' AND u.deleted_at IS NULL AND u.published_at < ${NOW - 12 * D}`],
    ['an update’s Activity line not on its update’s own moment (S42 A-03, R125)', `SELECT e.id FROM lead_events e JOIN project_updates u ON e.detail LIKE '%"' || u.id || '"%' WHERE (e.kind IN ('project_update_posted', 'project_update_approved') AND e.at <> u.published_at) OR (e.kind = 'project_update_submitted' AND e.at <> u.submitted_at)`],
    /* (pending modules S41b-4, R124) the Free plan's upgrade offers: each bell row is its record's live offer, none off Free, records the app can read */
    ['upgrade offer in the bell with no live record behind it (S41b-4, R124)', `SELECT n.id FROM notifications n WHERE n.kind = 'upgrade_offer' AND NOT EXISTS (SELECT 1 FROM nudge_state s WHERE s.offer_id = n.id AND s.member_id = n.member_id)`],
    ['upgrade offer live while the studio is not on Free (S41b-4, R124)', `SELECT s.member_id FROM nudge_state s WHERE s.offer_id IS NOT NULL AND coalesce((SELECT plan_id FROM subscriptions WHERE cancelled_at IS NULL ORDER BY created_at DESC LIMIT 1), 'free') <> 'free'`],
    ['upgrade-offer record the app can’t read (S41b-4)', `SELECT member_id FROM nudge_state WHERE json_valid(spent) = 0 OR json_type(spent) <> 'object' OR json_valid(answers_json) = 0 OR json_type(answers_json) <> 'object' OR (offer_id IS NOT NULL AND (offer_json IS NULL OR json_valid(offer_json) = 0 OR json_extract(offer_json, '$.id') <> offer_id))`],
    /* (pending modules S39, R123) the demo's past sign-ins: none live, none longer than its kind, a client's never a member's look-as */
    ['a sign-in from the demo’s history still live (S39, R123)', `SELECT id FROM studio_sessions WHERE id LIKE 'ss-trail-%' AND (ended_at IS NULL OR ended_reason <> 'signed-out')`],
    ['a sign-in that ends before it starts or outlasts its 24 hours (S39, R123)', `SELECT id FROM studio_sessions WHERE id LIKE 'ss-trail-%' AND (ended_at < started_at OR last_seen_at < started_at OR ended_at > started_at + 86400000 OR remember <> 0)`],
    ['a client’s portal sign-in that runs past its 30 days, or a studio member’s look-as kept as a client’s (S39, R123)', `SELECT id FROM portal_sessions WHERE (expires_at - created_at) > 30 * 86400 + 60 OR (kind = 'client' AND member_id IS NOT NULL)`],
    /* (pending modules S37, R145) the studio's listing on Qanvast holds together: Qanvast's leads only for a listed studio; one application waits
       at a time; an answered one says when; a status and a kind the app knows; a proof file is a PDF or a picture */
    ['Qanvast leads arrive but the studio is not listed on Qanvast (S37, R145)', `SELECT id FROM leads WHERE source = 'Qanvast' AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM studio_verifications WHERE status = 'verified') LIMIT 1`],
    ['more than one listing application waiting for Qanvast (S37, R145)', `SELECT count(*) FROM studio_verifications WHERE status = 'pending' HAVING count(*) > 1`],
    ['listing application answered with no answer time, or a status or kind the app doesn’t know (S37, R145)', `SELECT id FROM studio_verifications WHERE (status IN ('verified', 'rejected', 'closed') AND reviewed_at IS NULL) OR status NOT IN ('pending', 'verified', 'rejected', 'withdrawn', 'closed') OR kind NOT IN ('apply', 'update', 'outside') OR (kind = 'outside' AND status <> 'verified')`],
    ['proof file for Qanvast that is not a PDF or a picture (S37, R145)', `SELECT id FROM studio_verification_files WHERE removed_at IS NULL AND data NOT LIKE 'data:application/pdf;base64,%' AND data NOT LIKE 'data:image/%'`],
    /* (pending modules S28, R119) a floor-plan photo is a lead's until it is won, then the project's floor plan; a layout traces only a picture on record */
    ['floor-plan photo of a lead that has a live project — it should be the project’s floor plan (S28, R119)', `SELECT f.id FROM floor_plan_photos f JOIN projects p ON p.lead_id = f.lead_id WHERE p.deleted_at IS NULL`],
    ['personal floor-plan photo that names a client’s file (S28)', `SELECT id FROM floor_plan_photos WHERE lead_id IS NULL AND file_id IS NOT NULL`],
    ['lead’s floor-plan photo whose original is another lead’s file (S28)', `SELECT f.id FROM floor_plan_photos f JOIN lead_files lf ON lf.id = f.file_id WHERE f.lead_id IS NOT NULL AND lf.lead_id != f.lead_id`],
    ['3D layout traced on a floor-plan photo that is not there (S28)', `SELECT l.id FROM space_layouts l WHERE json_valid(l.plan) AND json_extract(l.plan, '$.underlay.url') LIKE '/planner/plan-picture/%' AND substr(json_extract(l.plan, '$.underlay.url'), 23) NOT IN (SELECT id FROM floor_plan_photos UNION SELECT id FROM project_floor_plans)`],
    /* (pending modules S27, R144) Hangouts hold together: a booking is a lead's and its chat is that lead's; a held chat is its lead's meeting;
       the plan sits only on events the studio takes part in; a confirmed place has its booking page; a piece of work's picture is a picture */
    ['Hangout booking whose lead is gone, or a chat not on its booking’s lead (S27, R144)', `SELECT r.id FROM hangout_registrations r WHERE r.lead_id NOT IN (SELECT id FROM leads) UNION ALL SELECT m.id FROM hangout_meetings m JOIN hangout_registrations r ON r.id = m.registration_id WHERE m.lead_id <> r.lead_id`],
    ['Hangout chat held with no meeting on its lead (S27, R144)', `SELECT m.id FROM hangout_meetings m WHERE m.status = 'completed' AND (m.meeting_id IS NULL OR m.meeting_id NOT IN (SELECT id FROM meetings WHERE lead_id = m.lead_id AND status = 'held'))`],
    ['Hangout chat held with no outcome, or an outcome on one that isn’t (S27, R144)', `SELECT id FROM hangout_meetings WHERE (status = 'completed' AND (outcome NOT IN ('converted','follow-up','dropped') OR sub_status IS NULL OR ended_at IS NULL)) OR (status <> 'completed' AND outcome IS NOT NULL)`],
    ['Hangout plan on an event the studio does not take part in (S27, R144)', `SELECT d.id FROM hangout_designers d WHERE json_array_length(d.shift_ids) > 0 AND d.event_id NOT IN (SELECT event_id FROM hangout_participations WHERE status = 'confirmed')`],
    ['confirmed Hangout place without its booking page (S27, R144)', `SELECT id FROM hangout_participations WHERE status = 'confirmed' AND (page_token IS NULL OR page_token = '')`],
    ['piece of work’s picture that is not a picture, or on work that is not there (S27, R144)', `SELECT id FROM member_portfolio_pictures WHERE data NOT LIKE 'data:image/%' OR portfolio_id NOT IN (SELECT id FROM member_portfolio_projects)`],
    /* (pending modules S26, R143) the studio's own conversations hold together: each line on a conversation that is there, two people's with its
       two, a group with its name, nobody in one who keeps the books, a lead's on a lead that is there, every author in the conversation */
    ['conversation line on a conversation that is not there (S26, R143)', `SELECT m.id FROM conversation_messages m WHERE m.conversation_id NOT IN (SELECT id FROM conversations)`],
    ['two members’ conversation without its two, or its pair not theirs (S26, R143)', `SELECT c.id FROM conversations c WHERE c.kind = 'direct' AND (c.pair_key IS NULL OR (SELECT count(*) FROM conversation_participants p WHERE p.conversation_id = c.id) <> 2 OR EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND instr('|' || c.pair_key || '|', '|' || p.member_id || '|') = 0))`],
    ['group with no name, or a kind the app doesn’t know (S26, R143)', `SELECT id FROM conversations WHERE (kind = 'group' AND trim(coalesce(name, '')) = '') OR kind NOT IN ('direct', 'group', 'studio', 'lead') OR (kind = 'studio' AND id <> 'studio')`],
    ['someone in a members’ conversation who is not a member, or keeps the books (S26, R143)', `SELECT p.member_id FROM conversation_participants p LEFT JOIN members m ON m.id = p.member_id WHERE m.id IS NULL OR m.role = 'Accounting'`],
    ['lead’s Team conversation with no lead, or on a lead deleted for good (S26, R143)', `SELECT c.id FROM conversations c LEFT JOIN leads l ON l.id = c.lead_id WHERE c.kind = 'lead' AND (c.lead_id IS NULL OR l.id IS NULL)`],
    ['line in a direct or group conversation by someone never in it (S26, R143)', `SELECT m.id FROM conversation_messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.kind IN ('direct', 'group') AND NOT EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.member_id = m.author_id)`],
    ['members’ conversation file with no bytes kept, or on a conversation that is gone (S26, R143)', `SELECT f.id FROM conversation_files f WHERE f.conversation_id NOT IN (SELECT id FROM conversations) OR f.data NOT LIKE 'data:%'`],

    /* (pending modules S19, R118) a render's charge and the render are one moment (the demo's paid work rides with its charges) */
    ['AI credits: a render charged on another day than it ran (S19, R118)', `SELECT l.id FROM credit_ledger l JOIN render_jobs j ON l.ref_id = 'render:' || j.id WHERE l.reason = 'spend' AND abs(l.created_at - j.created_at) > 3600`],
    /* (pending modules S19) auto top-up: a record the app knows, nothing claimed twice in a month, and a top-up's amount on 1.0's grid */
    ['AI credits: an auto top-up setting the app can’t read (S19)', `SELECT key FROM settings WHERE key = 'auto_topup' AND (json_valid(value) = 0 OR json_type(value, '$.on') NOT IN ('true', 'false'))`],
    ['AI credits: a top-up bought off 1.0’s grid — 100 to 5,000 in fifties (S19)', `SELECT id FROM billing_checkout_sessions WHERE kind IN ('topup', 'auto_topup') AND credits_requested IS NOT NULL AND (credits_requested < 100 OR credits_requested > 5000 OR credits_requested % 50 != 0)`],
    ['AI credits: fewer seats waiting that the plan can’t take — under its three, or not fewer (S19)', `SELECT id FROM subscriptions WHERE scheduled_seats IS NOT NULL AND (scheduled_seats < 3 OR scheduled_seats >= seats OR plan_id != 'pro_studio')`],
    /* (pending modules S18, R117) a member's own choices are ones the app knows; a summary is an email to a member */
    ['member’s email choice the app does not know, or a summary time with no summary chosen (S18, R117)', `SELECT id FROM members WHERE (notice_email IS NOT NULL AND notice_email != 'daily') OR (notice_email IS NULL AND notice_email_at IS NOT NULL)`],
    ['member’s muted notices that are not a list of the notices the studio sends (S18, R117)', `SELECT m.id FROM members m WHERE m.notice_muted IS NOT NULL AND (CASE WHEN json_valid(m.notice_muted) = 0 THEN 1 WHEN json_type(m.notice_muted) != 'array' THEN 1 WHEN EXISTS (SELECT 1 FROM json_each(m.notice_muted) j WHERE j.value NOT IN (${NOTICE_EVENTS.map((e) => `'${e.key}'`).join(',')})) THEN 1 ELSE 0 END) = 1`],
    ['daily summary that is not an email to a member (S18)', `SELECT id FROM notification_outbox WHERE event = 'daily_summary' AND (member_id IS NULL OR channel != 'email')`],
    /* (pending modules S23, R140) a meeting written up holds what was said; a planned meeting's reminder rides its hour; a Met log points only at a meeting there is; the objection log and the co-pilot's charges belong to their meeting */
    ['meeting written up from notes or a recording with no notes (S23, R140)', `SELECT id FROM meetings WHERE status = 'held' AND source IN ('notes', 'recording') AND trim(notes) = '' AND deleted_at IS NULL`],
    ['planned meeting whose open reminder is not due on its hour (S23, R140)', `SELECT t.id FROM lead_tasks t JOIN meetings m ON m.id = t.meeting_id WHERE m.status = 'planned' AND m.deleted_at IS NULL AND t.done = 0 AND t.kind = 'Follow-up' AND t.due_at != m.starts_at / 1000`],
    ['Met log pointing at a meeting that is not there (S23, R140)', `SELECT s.id FROM stage_logs s, json_each(s.payload, '$.meetings') j WHERE s.to_stage = 'Met' AND json_valid(s.payload) AND json_extract(j.value, '$.meetingId') IS NOT NULL AND json_extract(j.value, '$.meetingId') NOT IN (SELECT id FROM meetings)`],
    ['objection log row on another lead than its meeting (S23, R140)', `SELECT o.id FROM copilot_objection_log o JOIN meetings m ON m.id = o.meeting_id WHERE o.lead_id != m.lead_id`],
    ['meeting that ran paid co-pilot time with no charge on the ledger (S23, R140)', `SELECT m.id FROM meetings m WHERE m.blocks > m.free_blocks AND NOT EXISTS (SELECT 1 FROM credit_ledger c WHERE c.action_key = 'copilot_block' AND c.ref_id LIKE 'meeting:' || m.id || ':%')`],
    ['meeting held live with no consent on record (S23, R140)', `SELECT id FROM meetings WHERE started_at IS NOT NULL AND (consent_at IS NULL OR consent_by IS NULL)`],
    /* (pending modules S24, R141) the Marketplace's copy of the feed holds together; the studio's links and asks point at what is there, once each */
    ['Marketplace deal or product of a brand the feed’s copy doesn’t have (S24, R141)', `SELECT id FROM marketplace_deals WHERE brand_id NOT IN (SELECT id FROM marketplace_brands) UNION ALL SELECT id FROM marketplace_products WHERE brand_id NOT IN (SELECT id FROM marketplace_brands)`],
    ['Marketplace product priced in a unit quotes don’t count in (S24, R141)', `SELECT id FROM marketplace_products WHERE unit IS NOT NULL AND unit NOT IN ('Pieces', 'Lot', 'sqft', 'ft run', 'point', 'hour', 'set')`],
    ['Marketplace ask for a deal that is not there, by no member, or by a way the deal doesn’t have (S24, R141)', `SELECT a.id FROM marketplace_deal_asks a LEFT JOIN marketplace_deals d ON d.id = a.deal_id LEFT JOIN marketplace_brands b ON b.id = d.brand_id WHERE d.id IS NULL OR a.member_id NOT IN (SELECT id FROM members) OR a.how NOT IN ('link', 'whatsapp', 'email') OR (a.how = 'link' AND d.cta_url IS NULL) OR (a.how = 'whatsapp' AND b.whatsapp IS NULL) OR (a.how = 'email' AND b.email IS NULL)`],
    ['vendor linked to a Marketplace brand that is not there, or two vendors standing for one brand (S24, R141)', `SELECT id FROM vendors WHERE marketplace_brand_id IS NOT NULL AND marketplace_brand_id NOT IN (SELECT id FROM marketplace_brands) UNION ALL SELECT marketplace_brand_id FROM vendors WHERE marketplace_brand_id IS NOT NULL AND merged_into IS NULL GROUP BY marketplace_brand_id HAVING count(*) > 1`],
    ['Price book item from a Marketplace product that is not there, or two live items from one product (S24, R141)', `SELECT id FROM price_book_items WHERE marketplace_product_id IS NOT NULL AND marketplace_product_id NOT IN (SELECT id FROM marketplace_products) UNION ALL SELECT marketplace_product_id FROM price_book_items WHERE marketplace_product_id IS NOT NULL AND deleted_at IS NULL GROUP BY marketplace_product_id HAVING count(*) > 1`],
    ['Marketplace banner that opens nothing (S24, R141)', `SELECT id FROM marketplace_banners WHERE href NOT LIKE '/marketplace%' AND href NOT LIKE 'https://%'`],
    /* (pending modules S25, R142) the editors' feed's copy holds what the pages can read: 1.0's four categories, tags as a list, a sane read time, a picture that is the app's own file or on the web, a sample never dated ahead of the demo day */
    ['Market Insights article under a category 1.0 never had (S25, R142)', `SELECT id FROM market_insights WHERE category NOT IN ('trends', 'reports', 'case-studies', 'industry-news')`],
    ['Market Insights article whose tags are not a list, or whose read time is outside 1–120 minutes (S25, R142)', `SELECT id FROM market_insights WHERE json_valid(tags) = 0 OR json_type(tags) != 'array' OR read_minutes < 1 OR read_minutes > 120`],
    ['Market Insights cover that is not the app’s own file or on the web over https (S25, R142)', `SELECT id FROM market_insights WHERE cover IS NOT NULL AND cover NOT LIKE '/%' AND cover NOT LIKE 'https://%'`],
    ['Market Insights sample article dated after the demo day (S25, R142)', `SELECT id FROM market_insights WHERE sample = 1 AND published_at > (strftime('%s', 'now') + 86400) * 1000`],
    /* (pending modules S14, R116) a CaseTrust badge or award with CaseTrust not done on the record; a contract signed while the studio had CaseTrust on record, without the client's tick */
    ['CaseTrust badge in the brand kit or award on the About page while the studio’s record says not done (S14, R116)', `SELECT 'brand' FROM settings b WHERE b.key = 'brand' AND (b.value LIKE '%CaseTrust%' OR EXISTS (SELECT 1 FROM settings a WHERE a.key = 'studio_about' AND a.value LIKE '%CaseTrust%')) AND coalesce((SELECT json_extract(value, '$.CASETRUST_RENOVATION.done') FROM settings WHERE key = 'compliance_studio'), 0) != 1`],
    ['contract signed while CaseTrust was on record, without the client’s CaseTrust tick (S14, R116)', `SELECT c.id FROM contracts c, settings s WHERE s.key = 'compliance_studio' AND json_extract(s.value, '$.CASETRUST_RENOVATION.done') = 1 AND c.status = 'Signed' AND c.signed_at IS NOT NULL AND c.signed_at * 1000 > json_extract(s.value, '$.CASETRUST_RENOVATION.at') AND c.casetrust_at IS NULL AND c.signature_kind IS NOT NULL`],
    /* (pending modules S13, R115) the portal's foot holds web addresses only, and a member's look is never the portal's face form */
    ['client portal foot link that is not a web address (S13, R115)', `SELECT key FROM settings WHERE key = 'portal_links' AND (json_valid(value) = 0 OR EXISTS (SELECT 1 FROM json_each(settings.value) j WHERE j.value IS NOT NULL AND j.value NOT LIKE 'http://%' AND j.value NOT LIKE 'https://%'))`],
    ['member look in the portal’s face form — made for a client’s page, never stored (S13, R115)', `SELECT id FROM members WHERE color LIKE 'face:%'`],
    /* (pending modules S12, R114) a waste share is 0–50, and a quote line taken from My Items names an entry the book still holds */
    ['My Items entry with a waste share outside 0–50% (S12, R114)', `SELECT name FROM price_book_items WHERE waste_pct < 0 OR waste_pct > 50`],
    ['quote line taken from a My Items entry the book no longer holds (S12)', `SELECT i.id FROM quote_items i WHERE i.kind = 'item' AND i.price_book_item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM price_book_items p WHERE p.id = i.price_book_item_id)`],
    /* (pending modules S10, R113) a member's own questions: their member exists, 20 at most, never an empty one, cleared no earlier than asked */
    ['Maison AI question of a member no longer there (S10, R113)', `SELECT q.id FROM maison_questions q LEFT JOIN members m ON m.id = q.member_id WHERE m.id IS NULL`],
    ['member with more than 20 Maison AI questions kept (S10, R113)', `SELECT member_id FROM maison_questions GROUP BY member_id HAVING count(*) > 20`],
    ['Maison AI question that is empty, or cleared before it was asked (S10)', `SELECT id FROM maison_questions WHERE trim(question) = '' OR (cleared_at IS NOT NULL AND cleared_at < asked_at)`],
    /* (pending modules S09, R112) an invitation is its member's, waiting at most once, never on a deactivated member, and accepted only once sent */
    ['invitation whose member is gone (S09)', `SELECT i.id FROM studio_invitations i LEFT JOIN members m ON m.id = i.member_id WHERE m.id IS NULL`],
    ['member with two invitations waiting (S09)', `SELECT member_id FROM studio_invitations WHERE status = 'pending' GROUP BY member_id HAVING count(*) > 1`],
    ['invitation still waiting on a deactivated member (S09, R112)', `SELECT i.id FROM studio_invitations i JOIN members m ON m.id = i.member_id WHERE i.status = 'pending' AND m.is_active = 0`],
    ['invitation of a status the app does not know, or accepted / cancelled with no time (S09)', `SELECT id FROM studio_invitations WHERE status NOT IN ('pending','accepted','cancelled') OR (status = 'accepted' AND accepted_at IS NULL) OR (status = 'cancelled' AND cancelled_at IS NULL)`],
    /* (pending modules S35, R122) the website's records: each has who sent it, an email that reads as one, and its word to the team */
    ['website demo request with no name, studio or email (S35)', `SELECT id FROM beta_signups WHERE trim(name) = '' OR trim(coalesce(studio_name, '')) = '' OR email NOT LIKE '%_@_%._%'`],
    ['website contact message with no name, email or message, or over 5,000 characters (S35)', `SELECT id FROM contact_messages WHERE trim(name) = '' OR email NOT LIKE '%_@_%._%' OR trim(message) = '' OR length(message) > 5000`],
    ['newsletter address that is not one, or unsubscribed before it subscribed (S35)', `SELECT id FROM newsletter_subscribers WHERE email NOT LIKE '%_@_%._%' OR email <> lower(email) OR (unsubscribed_at IS NOT NULL AND unsubscribed_at < created_at)`],
    ['website demo request or message the team never heard of (S35, R122)', `SELECT b.id FROM beta_signups b WHERE NOT EXISTS (SELECT 1 FROM notification_outbox o WHERE o.key = 'site:demo:' || b.id || ':email') UNION ALL SELECT c.id FROM contact_messages c WHERE NOT EXISTS (SELECT 1 FROM notification_outbox o WHERE o.key = 'site:contact:' || c.id || ':email')`],
    ['website email to the team sent to a member, or to another address (S35)', `SELECT id FROM notification_outbox WHERE event IN ('site_demo_request','site_contact') AND (member_id IS NOT NULL OR coalesce(to_address, '') <> 'hello@openmaison.ai')`],
    /* (pending modules S31, R121) a new studio is made in a database of its own — never in the demo's */
    ['a sign-up’s record in the demo’s database — a new studio is made in its own (S31, R121)', `SELECT key FROM settings WHERE key = 'studio_origin'`],
    /* (pending modules S41b-3, R146) a visitor's free-trial work moves only into a studio they start — never the demo's */
    ['free-trial work brought into the demo’s database — it moves only into a studio the visitor starts (S41b-3, R146)', `SELECT id FROM lead_events WHERE kind = 'trial_claimed'`],
    /* (pending modules S30, R120) a session is its member's, live only while they are, and ends with a reason the app knows */
    ['sign-in session whose member is gone (S30)', `SELECT s.id FROM studio_sessions s LEFT JOIN members m ON m.id = s.member_id WHERE m.id IS NULL`],
    ['sign-in session still live for a deactivated member (S30, R120)', `SELECT s.id FROM studio_sessions s JOIN members m ON m.id = s.member_id WHERE s.ended_at IS NULL AND m.is_active = 0`],
    ['sign-in session ended with no reason the app knows, or a reason with no end (S30)', `SELECT id FROM studio_sessions WHERE (ended_at IS NOT NULL AND coalesce(ended_reason, '') NOT IN ('signed-out','replaced','deactivated')) OR (ended_at IS NULL AND ended_reason IS NOT NULL)`],
    ['sign-in session that ends before it starts, or of a kind the app does not know (S30)', `SELECT id FROM studio_sessions WHERE expires_at <= started_at OR last_seen_at < started_at OR via NOT IN ('code','join') OR coalesce(channel, 'phone') NOT IN ('phone','email')`],
    /* (pending modules S08b, R111) the demo's credits month holds today, and nothing in the credits story is ahead of now */
    ['AI credits: the demo’s month has ended — the first page would roll it (S08b, R111)', `SELECT 'studio' FROM studio_credit_balances b JOIN subscriptions s ON s.cancelled_at IS NULL AND s.id = '${sid('credits', 'sub-pro')}' WHERE b.id = 'studio' AND b.period_end <= ${NOW}`],
    ['AI credits: a charge, top-up or refresh dated after now (S08b)', `SELECT id FROM credit_ledger WHERE created_at > ${NOW + 60}`],
    /* (S43B · F1-10, R111) the credits story's bookkeeping stamps are never ahead of now */
    ['AI credits: the balance, the plan or a cap last written after now (S43B, R111)', `SELECT 'balance' FROM studio_credit_balances WHERE updated_at > ${NOW + 60} UNION ALL SELECT id FROM subscriptions WHERE updated_at > ${NOW + 60} UNION ALL SELECT member_id FROM studio_member_credit_caps WHERE updated_at > ${NOW + 60}`],
    /* (pending modules S08, R110) a member is owed the first-visit welcome or has had it; the set-up record is JSON, finished no earlier than seen */
    ['member neither owed a welcome nor with a first visit (S08, R110)', `SELECT id FROM members WHERE welcome_due = 0 AND welcomed_at IS NULL`],
    ['set-up record that is not JSON, or finished before it was first seen open (S08)', `SELECT key FROM settings WHERE key = 'studio_setup' AND (json_valid(value) = 0 OR (json_extract(value, '$.doneAt') IS NOT NULL AND json_extract(value, '$.seenOpenAt') > json_extract(value, '$.doneAt')))`],
    /* (pending modules S07, R109) an overpayment held as the client's credit: no GST, on the invoice its payment settled; never used or refunded
       beyond what it held; a payment from a credit is an overpayment's, on its own project, by the credit method; a credit note's Files entry is its paper */
    ['overpayment credit with GST, or with no payment on the invoice it names (S07)', `SELECT c.number FROM credit_notes c WHERE c.kind = 'overpayment' AND (c.gst_minor <> 0 OR c.payment_id IS NULL OR NOT EXISTS (SELECT 1 FROM project_payments p WHERE p.id = c.payment_id AND p.invoice_id = c.invoice_id))`],
    ['overpayment credit used or refunded beyond what it held (S07)', `SELECT c.number FROM credit_notes c WHERE c.kind = 'overpayment' AND coalesce(c.refund_minor, 0) + (SELECT coalesce(sum(p.amount_minor), 0) FROM project_payments p WHERE p.credit_note_id = c.id AND p.status = 'confirmed') > c.amount_minor`],
    ['payment from a credit that is not an overpayment’s, on another project, or not by the credit method (S07)', `SELECT p.id FROM project_payments p LEFT JOIN credit_notes c ON c.id = p.credit_note_id WHERE (p.credit_note_id IS NOT NULL AND (c.id IS NULL OR c.kind <> 'overpayment' OR c.project_id <> p.project_id OR p.method <> 'credit')) OR (p.credit_note_id IS NULL AND p.method = 'credit')`],
    ['credit note of a kind the app does not know (S07)', `SELECT number FROM credit_notes WHERE kind NOT IN ('credit','overpayment')`],
    ['credit note entry in Files holding a stand-in page instead of its paper (S07, R109)', `SELECT f.name FROM lead_files f JOIN credit_notes c ON c.file_id = f.id WHERE EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id)`],
    ['lead’s 3-D layout left on a lead whose project is live (S07, R109)', `SELECT l.name FROM space_layouts l WHERE l.project_id IS NULL AND l.lead_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.lead_id AND p.deleted_at IS NULL)`],
    /* (pending modules S06, R108) a repeating expense: every one the rule logged names a first expense of its own project, on a later day; a
       live repeat always knows its next day */
    ['repeating expense logged from one that is not a series’ first, or from another project (S06, R108)', `SELECT e.id FROM expenses e LEFT JOIN expenses r ON r.id = e.repeat_of WHERE e.repeat_of IS NOT NULL AND (r.id IS NULL OR r.repeat_of IS NOT NULL OR coalesce(r.project_id, '') <> coalesce(e.project_id, '') OR e.spent_on <= r.spent_on)`],
    ['live repeating expense with no next day, or a rhythm the app does not know (S06, R108)', `SELECT id FROM expenses WHERE repeat_every IS NOT NULL AND ((repeat_stopped_at IS NULL AND deleted_at IS NULL AND repeat_next IS NULL) OR repeat_every NOT IN ('week','month','quarter','year'))`],
    ['repeat set on an expense the rule logged (S06)', `SELECT id FROM expenses WHERE repeat_of IS NOT NULL AND (repeat_every IS NOT NULL OR repeat_next IS NOT NULL)`],
    /* (pending modules S05, R107) leads: a second client is a person with a name and a mobile of 8 digits; an appeal appeals its lead's rejected return */
    ['lead with a second client’s NRIC or mobile and no name (S05, R107)', `SELECT name FROM leads WHERE client2_name IS NULL AND (client2_nric IS NOT NULL OR client2_phone IS NOT NULL)`],
    ['lead whose second client’s mobile is not 8 digits (S05)', `SELECT name FROM leads WHERE client2_phone IS NOT NULL AND (length(client2_phone) <> 8 OR client2_phone GLOB '*[^0-9]*')`],
    ['appeal of a return that is not its lead’s, not rejected, or later than it (S05)', `SELECT a.id FROM lead_returns a LEFT JOIN lead_returns r ON r.id = a.appeal_of WHERE a.appeal_of IS NOT NULL AND (r.id IS NULL OR r.lead_id <> a.lead_id OR r.status <> 'rejected' OR r.returned_at > a.returned_at)`],
    /* (pending modules S04, R106) quotes: the confirmation link's key, a line's status dropped, the preparer kept at send, the client's opens */
    ['quote with no confirmation link key (S04, R106)', `SELECT number FROM quotes WHERE confirm_token IS NULL OR confirm_token = ''`],
    ['quote line with a status of its own (S04, R106)', `SELECT q.number || ' · ' || i.name FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE i.status <> 'Pending'`],
    ['quote with its client and no kept preparer, or one kept before it went out (S04, R106)', `SELECT number FROM quotes WHERE ((client_sent_at IS NOT NULL OR status IN ('Confirmed', 'Signed')) AND prepared_json IS NULL) OR (client_sent_at IS NULL AND status NOT IN ('Confirmed', 'Signed') AND prepared_json IS NOT NULL)`],
    ['quote opened on its link with no first open or no count (S04)', `SELECT number FROM quotes WHERE (client_last_viewed_at IS NOT NULL AND (client_viewed_at IS NULL OR client_view_count < 1 OR client_viewed_at > client_last_viewed_at)) OR (client_last_viewed_at IS NULL AND (client_viewed_at IS NOT NULL OR client_view_count <> 0))`],
    ['quote drafted by Maison AI that is a variation order (S04)', `SELECT number FROM quotes WHERE draft_brief IS NOT NULL AND kind = 'variation'`],
    /* (pending modules S03, R105) contracts: the link's key and window, the PDFs kept, consent, the signed total */
    ['contract with no signing link key (S03, R105)', `SELECT title FROM contracts WHERE sign_token IS NULL OR sign_token = ''`],
    ['contract out for signature with no window, or a Draft with one (S03, R105)', `SELECT title FROM contracts WHERE (status = 'Sent to Client' AND sign_expires_at IS NULL) OR (status = 'Draft' AND sign_expires_at IS NOT NULL)`],
    ['contract PDF on another lead, in the trash, or on a written contract (S03)', `SELECT c.title FROM contracts c JOIN lead_files f ON f.id IN (c.file_id, c.signed_file_id) WHERE c.deleted_at IS NULL AND (f.lead_id <> c.lead_id OR f.deleted_at IS NOT NULL OR f.kind <> 'pdf') UNION ALL SELECT title FROM contracts WHERE source = 'composed' AND file_id IS NOT NULL`],
    ['contract PDF with no bytes kept (S03)', `SELECT c.title FROM contracts c WHERE c.deleted_at IS NULL AND (c.file_id IS NOT NULL OR c.signed_file_id IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id IN (c.file_id, c.signed_file_id))`],
    ['standard PDF with no bytes, or a written template with some (S03)', `SELECT title FROM contract_templates t WHERE (t.kind = 'pdf' AND NOT EXISTS (SELECT 1 FROM contract_template_files f WHERE f.template_id = t.id)) OR (t.kind <> 'pdf' AND EXISTS (SELECT 1 FROM contract_template_files f WHERE f.template_id = t.id))`],
    ['saved signature with no answer on documents, or an answer with no time (S03, R105)', `SELECT id FROM members WHERE (signature_kind IS NOT NULL AND signature_consent IS NULL) OR (signature_consent IS NOT NULL AND (signature_consent NOT IN ('yes','no') OR signature_consent_at IS NULL))`],
    ['signed quote with no signed total (S03, R105)', `SELECT number FROM quotes WHERE status = 'Signed' AND signed_amount_minor IS NULL`],
    /* (Projects round 7, R76) the ending: every completion, reopening, request and deletion with its record */
    ['completed project with no completion stamp or line (R76)', `SELECT number FROM projects WHERE stage = 'completed' AND deleted_at IS NULL AND (completed_at IS NULL OR completed_by IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = projects.id AND e.kind = 'project_completed'))`],
    ['completion stamp on a project that is not completed (R76)', `SELECT number FROM projects WHERE stage <> 'completed' AND (completed_at IS NOT NULL OR completed_by IS NOT NULL)`],
    ['completed project with an unfinished milestone and no reason (R76)', `SELECT p.number FROM projects p WHERE p.stage = 'completed' AND p.complete_reason IS NULL AND EXISTS (SELECT 1 FROM project_milestones m WHERE m.project_id = p.id AND m.deleted_at IS NULL AND m.status <> 'done')`],
    /* (REG-1073) completed with no reason = every checklist item was met when it was pressed: nothing the checklist reads came after it */
    ['completed project with no reason whose last payment, invoice or client answer came after its completion (R76, REG-1020)', `SELECT p.number FROM projects p WHERE p.stage = 'completed' AND p.deleted_at IS NULL AND p.complete_reason IS NULL AND (EXISTS (SELECT 1 FROM project_payments x WHERE x.project_id = p.id AND x.status = 'confirmed' AND coalesce(x.confirmed_at, x.created_at) > p.completed_at) OR EXISTS (SELECT 1 FROM project_invoices i WHERE i.project_id = p.id AND i.status = 'sent' AND i.sent_at > p.completed_at) OR EXISTS (SELECT 1 FROM project_milestones m WHERE m.project_id = p.id AND m.deleted_at IS NULL AND m.confirm_answered_at > p.completed_at))`],
    ['completed project with no reason with money still to collect (R76, REG-1020)', `SELECT p.number FROM projects p WHERE p.stage = 'completed' AND p.deleted_at IS NULL AND p.complete_reason IS NULL AND EXISTS (SELECT 1 FROM project_invoices i WHERE i.project_id = p.id AND i.status = 'sent' AND i.amount_minor > (SELECT coalesce(sum(x.amount_minor), 0) FROM project_payments x WHERE x.invoice_id = i.id AND x.status = 'confirmed'))`],
    ['handover waiting for review on a project not in progress, or with no one who asked (R76)', `SELECT number FROM projects WHERE handover_requested_at IS NOT NULL AND (stage <> 'in_progress' OR handover_requested_by IS NULL)`],
    ['deleted project with no one who deleted it, or no line (R76)', `SELECT number FROM projects WHERE deleted_at IS NOT NULL AND (deleted_by IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = projects.id AND e.kind = 'project_deleted'))`],
    ['deleted direct project whose client record stayed (R76)', `SELECT p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NOT NULL AND coalesce(l.direct, 0) = 1 AND l.deleted_at IS NULL`],
    ['live project on a deleted lead (R76, Q-27)', `SELECT p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NULL AND l.deleted_at IS NOT NULL`],
    /* (Projects round 6, R75) payments: every state with its trail */
    ['payment with an unknown status, source or method (R75)', `SELECT id FROM project_payments WHERE status NOT IN ('to_confirm','confirmed','not_received','reversed') OR source NOT IN ('studio','client') OR method NOT IN ('bank_transfer','paynow','cheque','cash')`],
    ['payment on an invoice not sent, or on another project (R75)', `SELECT y.id FROM project_payments y JOIN project_invoices i ON i.id = y.invoice_id WHERE i.status = 'draft' OR i.project_id <> y.project_id`],
    /* (fix-D, D-32) a payment may come before its invoice went out (a deposit paid on signing) — never after it was recorded */
    ['payment paid after it was recorded (R75 · fix-D)', `SELECT y.id FROM project_payments y WHERE y.paid_on > y.created_at + 86400`],
    ['confirmed or reversed payment with no receipt, or a receipt on one that never counted (R75)', `SELECT id FROM project_payments WHERE (status IN ('confirmed','reversed') AND (receipt_number IS NULL OR confirmed_at IS NULL OR receipt_file_id IS NULL)) OR (status IN ('to_confirm','not_received') AND receipt_number IS NOT NULL)`],
    ['reversed payment with no reason, or not received with no reason (R75)', `SELECT id FROM project_payments WHERE (status = 'reversed' AND (reverse_reason IS NULL OR reversed_at IS NULL OR reversed_by IS NULL)) OR (status = 'not_received' AND (reject_reason IS NULL OR rejected_at IS NULL))`],
    ['invoice paid beyond its amount (R75)', `SELECT i.number FROM project_invoices i WHERE (SELECT coalesce(sum(y.amount_minor), 0) FROM project_payments y WHERE y.invoice_id = i.id AND y.status IN ('confirmed','to_confirm')) > i.amount_minor`],
    ['client’s payment with no proof, no sender or a portal never opened (R75)', `SELECT y.id FROM project_payments y JOIN projects p ON p.id = y.project_id WHERE y.source = 'client' AND (y.proof_file_id IS NULL OR y.submitted_by IS NULL OR NOT EXISTS (SELECT 1 FROM homeowner_lead_links h WHERE h.lead_id = p.lead_id AND h.homeowner_id = y.submitted_by AND h.opened_at IS NOT NULL AND h.opened_at <= y.created_at))`],
    ['studio’s payment with no recorder (R75)', `SELECT id FROM project_payments WHERE source = 'studio' AND (recorded_by IS NULL OR status = 'to_confirm')`],
    ['payment with no line in Activity (R75)', `SELECT y.id FROM project_payments y WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = y.project_id AND json_extract(e.detail, '$.id') = y.id AND e.kind = CASE y.source WHEN 'client' THEN 'project_payment_submitted' ELSE 'project_payment_recorded' END)`],
    ['reversed payment with no reversal line (R75)', `SELECT y.id FROM project_payments y WHERE y.status = 'reversed' AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = y.project_id AND json_extract(e.detail, '$.id') = y.id AND e.kind = 'project_payment_reversed')`],
    ['receipt or proof filed on another lead (R75)', `SELECT y.id FROM project_payments y JOIN projects p ON p.id = y.project_id JOIN lead_files f ON f.id IN (y.receipt_file_id, y.proof_file_id) WHERE f.lead_id <> p.lead_id`],
    ['two payments with one receipt number (R75)', `SELECT receipt_number FROM project_payments WHERE receipt_number IS NOT NULL GROUP BY receipt_number HAVING count(*) > 1`],
    ['variation order from a choice on another project (R75)', `SELECT q.number FROM quotes q JOIN project_selections s ON s.id = q.selection_id WHERE q.project_id <> s.project_id`],
    /* (Projects round 4b, R73) a client's answer to a stage, and what the portal records they saw */
    ['stage answered without being asked, or before it (R73)', `SELECT title FROM project_milestones WHERE confirm_answer IS NOT NULL AND (confirm_asked_at IS NULL OR confirm_answered_at < confirm_asked_at)`],
    ['stage answer with no time or no one who gave it (R73)', `SELECT title FROM project_milestones WHERE confirm_answer IS NOT NULL AND (confirm_answered_at IS NULL OR confirm_answered_by IS NULL)`],
    ['stage answer of an unknown kind (R73)', `SELECT title FROM project_milestones WHERE confirm_answer IS NOT NULL AND confirm_answer NOT IN ('confirmed','changes')`],
    ['stage answered by someone with no link to its lead (R73)', `SELECT m.title FROM project_milestones m JOIN projects p ON p.id = m.project_id WHERE m.confirm_answered_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links k WHERE k.lead_id = p.lead_id AND k.homeowner_id = m.confirm_answered_by) AND NOT EXISTS (SELECT 1 FROM homeowner_household_links x WHERE x.lead_id = p.lead_id AND x.homeowner_id = m.confirm_answered_by)`],   /* (R77) someone from the household answers too */
    ['stage answered that was never shared as done before it (R73)', `SELECT m.title FROM project_milestones m WHERE m.confirm_answer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM project_schedule_shares s, json_each(s.snapshot, '$.rows') r WHERE s.project_id = m.project_id AND s.shared_at <= m.confirm_answered_at AND json_extract(r.value, '$.id') = m.id AND json_extract(r.value, '$.state') = 'done')`],
    ['client answer with no line in Activity (R73)', `SELECT m.title FROM project_milestones m WHERE m.confirm_answer IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = m.project_id AND json_extract(e.detail, '$.id') = m.id AND e.kind = CASE m.confirm_answer WHEN 'confirmed' THEN 'project_stage_confirmed' ELSE 'project_stage_changes' END)`],
    ['update opened that was never published (R73)', `SELECT title FROM project_updates WHERE client_opened_at IS NOT NULL AND published_at IS NULL`],
    ['update opened before its client first opened the portal (R73)', `SELECT u.title FROM project_updates u JOIN projects p ON p.id = u.project_id WHERE u.client_opened_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links k WHERE k.lead_id = p.lead_id AND k.opened_at IS NOT NULL AND k.opened_at <= u.client_opened_at) AND NOT EXISTS (SELECT 1 FROM homeowner_household_links x WHERE x.lead_id = p.lead_id AND x.opened_at IS NOT NULL AND x.opened_at <= u.client_opened_at)`],   /* (R77) or someone from the household */
    /* (Projects round 9, R77) the household, the bell, the set-up: every state with its trail */
    ['household link opened before it was invited (R77)', `SELECT id FROM homeowner_household_links WHERE opened_at IS NOT NULL AND (invited_at IS NULL OR opened_at < invited_at)`],
    ['household link withdrawn while never invited, or last opened before first (R77)', `SELECT id FROM homeowner_household_links WHERE (withdrawn_at IS NOT NULL AND invited_at IS NULL) OR (last_opened_at IS NOT NULL AND (opened_at IS NULL OR last_opened_at < opened_at))`],
    ['household member with the client’s own number (R77)', `SELECT x.id FROM homeowner_household_links x JOIN homeowner_profiles h ON h.id = x.homeowner_id JOIN leads l ON l.id = x.lead_id WHERE h.phone = l.phone`],
    ['household member invited with no Activity line (R77)', `SELECT x.id FROM homeowner_household_links x WHERE x.invited_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = x.lead_id AND e.kind IN ('household_added','household_invited') AND json_extract(e.detail, '$.id') = x.id)`],
    ['household member opened with no Activity line (R77)', `SELECT x.id FROM homeowner_household_links x WHERE x.opened_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = x.lead_id AND e.kind = 'household_opened' AND json_extract(e.detail, '$.id') = x.id)`],
    ['bell read by someone who opens no home (R77)', `SELECT r.homeowner_id FROM portal_bell_reads r WHERE NOT EXISTS (SELECT 1 FROM homeowner_lead_links k WHERE k.homeowner_id = r.homeowner_id) AND NOT EXISTS (SELECT 1 FROM homeowner_household_links x WHERE x.homeowner_id = r.homeowner_id)`],
    ['portal welcome line past its limit, or sections not JSON (R77)', `SELECT key FROM settings WHERE (key = 'portal_welcome' AND (json_valid(value) = 0 OR length(coalesce(json_extract(value, '$.line'), '')) > 80)) OR (key = 'portal_sections' AND json_valid(value) = 0)`],
    ['schedule looked at before the portal was opened (R73)', `SELECT lead_id FROM homeowner_lead_links WHERE schedule_seen_at IS NOT NULL AND (opened_at IS NULL OR schedule_seen_at < opened_at)`],
    /* (Projects round 8, R74) Choices: every state with its trail */
    ['choice with an unknown status (R74)', `SELECT title FROM project_selections WHERE status NOT IN ('draft','shared','chosen','declined')`],   /* (gaps build D) a client's no */
    ['chosen choice with no pick, or a pick off its own options (R74)', `SELECT s.title FROM project_selections s WHERE s.status = 'chosen' AND (s.chosen_option_id IS NULL OR s.chosen_at IS NULL OR coalesce(s.chosen_by, '') NOT IN ('client','studio') OR NOT EXISTS (SELECT 1 FROM project_selection_options o WHERE o.id = s.chosen_option_id AND o.selection_id = s.id AND o.deleted_at IS NULL))`],
    ['pick kept on a choice not chosen (R74)', `SELECT title FROM project_selections WHERE status <> 'chosen' AND (chosen_option_id IS NOT NULL OR chosen_at IS NOT NULL)`],
    ['shared choice with no share stamp (R74)', `SELECT title FROM project_selections WHERE status = 'shared' AND (shared_at IS NULL OR shared_by IS NULL)`],
    ['shared or chosen choice with no option (R74)', `SELECT s.title FROM project_selections s WHERE s.status <> 'draft' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM project_selection_options o WHERE o.selection_id = s.id AND o.deleted_at IS NULL)`],
    ['choice option from an unknown source (R74)', `SELECT name FROM project_selection_options WHERE source NOT IN ('material','price_book','render','upload')`],
    ['choice option picture on another lead (R74)', `SELECT o.name FROM project_selection_options o JOIN project_selections s ON s.id = o.selection_id JOIN projects p ON p.id = s.project_id JOIN lead_files f ON f.id = o.file_id WHERE f.lead_id <> p.lead_id`],
    ['choice tied to a milestone of another project (R74)', `SELECT s.title FROM project_selections s JOIN project_milestones m ON m.id = s.milestone_id WHERE m.project_id <> s.project_id`],
    ['shared choice with no share line in Activity (R74)', `SELECT s.title FROM project_selections s WHERE s.status = 'shared' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = s.project_id AND e.kind = 'project_choice_shared' AND json_extract(e.detail, '$.id') = s.id)`],
    ['client’s pick with no line in Activity (R74)', `SELECT s.title FROM project_selections s WHERE s.status = 'chosen' AND s.chosen_by = 'client' AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = s.project_id AND e.kind = 'project_choice_chosen' AND json_extract(e.detail, '$.id') = s.id)`],
    ['client’s pick on a portal never opened (R74)', `SELECT s.title FROM project_selections s JOIN projects p ON p.id = s.project_id WHERE s.chosen_by = 'client' AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links h WHERE h.lead_id = p.lead_id AND h.opened_at IS NOT NULL AND h.opened_at <= s.chosen_at)`],
    /* (Projects round 5, R72) money in */
    ['project with payment stages and no invoices (R72)', `SELECT p.number FROM projects p WHERE p.deleted_at IS NULL AND (EXISTS (SELECT 1 FROM quote_payments qp WHERE qp.quote_id = p.quote_id) OR (p.quote_id IS NULL AND json_array_length(json_extract(p.payment_template, '$.rows')) > 0)) AND NOT EXISTS (SELECT 1 FROM project_invoices i WHERE i.project_id = p.id AND i.status <> 'void')`],
    ['payment stage with two live invoices (R72)', `SELECT project_id || ' · ' || stage_name FROM project_invoices WHERE status <> 'void' GROUP BY project_id, stage_ref HAVING count(*) > 1`],
    ['invoice with an unknown status (R72)', `SELECT id FROM project_invoices WHERE status NOT IN ('draft','sent','void')`],
    ['sent invoice with no number, due day or send line (R72)', `SELECT i.id FROM project_invoices i WHERE i.status <> 'draft' AND i.kind <> 'external' AND (i.number IS NULL OR i.due_at IS NULL OR i.sent_at IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = i.project_id AND e.kind = 'project_invoice_sent' AND json_extract(e.detail, '$.id') = i.id))`],   /* (gaps build B) a recorded invoice keeps its own number — R79's checks */
    ['invoice sent before its project was made (R72)', `SELECT i.number FROM project_invoices i JOIN projects p ON p.id = i.project_id WHERE i.sent_at < p.created_at`],
    ['void invoice with no reason, or a Draft with a number (R72)', `SELECT id FROM project_invoices WHERE (status = 'void' AND (void_reason IS NULL OR voided_at IS NULL)) OR (status = 'draft' AND number IS NOT NULL)`],
    ['live invoices that do not add up to the contract value (R72)', `SELECT p.number FROM projects p WHERE p.deleted_at IS NULL AND EXISTS (SELECT 1 FROM project_invoices i WHERE i.project_id = p.id AND i.status <> 'void')
      AND (SELECT sum(i.amount_minor) FROM project_invoices i WHERE i.project_id = p.id AND i.status <> 'void' AND i.stage_ref NOT LIKE 'extra:%') <> max(0, coalesce((SELECT q.amount_minor FROM quotes q WHERE q.id = p.quote_id AND q.deleted_at IS NULL), p.agreed_value_minor, 0)
        + coalesce((SELECT sum(v.amount_minor) FROM quotes v WHERE v.project_id = p.id AND v.kind = 'variation' AND v.status IN ('Confirmed','Signed') AND v.deleted_at IS NULL), 0))`],
    ['variation order on no project, or numbered off its project (R72)', `SELECT number FROM quotes WHERE kind = 'variation' AND (project_id IS NULL OR number NOT LIKE 'VO-%')`],
    ['approved variation order with no approval line (R72)', `SELECT v.number FROM quotes v WHERE v.kind = 'variation' AND v.status IN ('Confirmed','Signed') AND v.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = v.project_id AND e.kind = 'project_vo_approved' AND json_extract(e.detail, '$.id') = v.id)`],
    ['variation order with a payment schedule of its own (R72)', `SELECT v.number FROM quotes v WHERE v.kind = 'variation' AND EXISTS (SELECT 1 FROM quote_payments p WHERE p.quote_id = v.id)`],
    /* (Projects r4a, R71) the client portal */
    ['portal with no current address, or two (R71)', `SELECT 'portal_addresses' WHERE (SELECT count(*) FROM portal_addresses WHERE retired_at IS NULL) <> 1`],
    ['portal link opened before it was invited (R71)', `SELECT lead_id FROM homeowner_lead_links WHERE opened_at IS NOT NULL AND (invited_at IS NULL OR opened_at < invited_at)`],
    ['portal link last opened before its first open (R71)', `SELECT lead_id FROM homeowner_lead_links WHERE (last_opened_at IS NOT NULL AND opened_at IS NULL) OR last_opened_at < opened_at`],
    ['opened portal with no first-open event (R71)', `SELECT h.lead_id FROM homeowner_lead_links h WHERE h.opened_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = h.lead_id AND e.kind = 'portal_opened')`],
    ['invited link with no invite event (R71)', `SELECT h.lead_id FROM homeowner_lead_links h WHERE h.invited_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = h.lead_id AND e.kind = 'invite_sent')`],
    ['withdrawn link with no withdrawal event (R71)', `SELECT h.lead_id FROM homeowner_lead_links h WHERE h.withdrawn_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = h.lead_id AND e.kind = 'portal_withdrawn')`],
    ['folder marked shown to the client (R71)', `SELECT name FROM lead_files WHERE kind = 'folder' AND shown_to_client_at IS NOT NULL`],
    /* (REG-911…932, R68) Projects round 1 */
    ['Won lead with no project (R68)', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage = 'Won' AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id)`],
    ['direct lead with no project (R68)', `SELECT l.name FROM leads l WHERE coalesce(l.direct, 0) = 1 AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id)`],
    ['project on a lead that is not Won (R68)', `SELECT p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.deleted_at IS NULL AND l.stage <> 'Won'`],
    ['project made before its lead was won (R68)', `SELECT p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE coalesce(l.direct, 0) = 0 AND p.created_at < (SELECT max(s.created_at) FROM stage_logs s WHERE s.lead_id = l.id AND s.to_stage = 'Won') - 60`],
    ['Won move logged before its signature (R68)', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.to_stage = 'Won' AND coalesce(l.direct, 0) = 0 AND s.created_at < (SELECT max(c.signed_at) FROM contracts c WHERE c.lead_id = l.id AND c.status = 'Signed' AND c.deleted_at IS NULL)`],
    ['project with no project_created event (R68)', `SELECT p.number FROM projects p WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = p.id AND e.kind = 'project_created')`],
    ['two projects with one number (R68)', `SELECT number FROM projects GROUP BY number HAVING count(*) > 1`],
    ['project in progress with no start (R68)', `SELECT number FROM projects WHERE stage = 'in_progress' AND (start_date IS NULL OR started_at IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = projects.id AND e.kind = 'project_started'))`],
    ['direct lead with a stage trail, a quote or no member (R68)', `SELECT l.name FROM leads l WHERE coalesce(l.direct, 0) = 1 AND (EXISTS (SELECT 1 FROM stage_logs s WHERE s.lead_id = l.id) OR NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = l.id))`],
    /* (Projects round 2, R69) the Schedule */
    ['milestone that ends before it starts (R69)', `SELECT title FROM project_milestones WHERE end_date < start_date`],
    ['milestone moving with one on another project or itself (R69)', `SELECT m.title FROM project_milestones m LEFT JOIN project_milestones f ON f.id = m.follows_id WHERE m.follows_id IS NOT NULL AND (f.id IS NULL OR f.project_id <> m.project_id OR f.id = m.id)`],
    ['milestone off its gap after what it moves with (R69)', `SELECT m.title FROM project_milestones m JOIN project_milestones f ON f.id = m.follows_id WHERE m.deleted_at IS NULL AND f.deleted_at IS NULL AND m.status <> 'done' AND round((m.start_date - f.end_date) / 86400.0) <> m.gap_days`],
    ['done milestone with no done day, or a done day on an open one (R69)', `SELECT title FROM project_milestones WHERE (status = 'done') <> (done_at IS NOT NULL)`],
    ['milestone with an unknown status (R69)', `SELECT title FROM project_milestones WHERE status NOT IN ('not_started','in_progress','blocked','done')`],
    ['running project with no schedule line for its milestones (R69)', `SELECT p.number FROM projects p WHERE EXISTS (SELECT 1 FROM project_milestones m WHERE m.project_id = p.id) AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = p.id AND e.kind = 'project_schedule_created')`],
    ['payment stage tied to a milestone of another quote (R69)', `SELECT m.title FROM project_milestones m JOIN projects p ON p.id = m.project_id WHERE m.payment_ref IS NOT NULL AND m.payment_ref NOT LIKE 'split:%' AND NOT EXISTS (SELECT 1 FROM quote_payments q WHERE q.id = m.payment_ref AND q.quote_id = p.quote_id)`],
    ['payment stage tied to two milestones (R69)', `SELECT payment_ref FROM project_milestones WHERE payment_ref IS NOT NULL AND deleted_at IS NULL GROUP BY project_id, payment_ref HAVING count(*) > 1`],
    ['share with no line in Activity (R69)', `SELECT s.id FROM project_schedule_shares s WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = s.project_id AND e.kind = 'project_schedule_shared' AND abs(e.at - s.shared_at) < 120)`],
    ['shown milestone with no plan dates after a share (R69)', `SELECT m.title FROM project_milestones m WHERE m.client_visible = 1 AND m.plan_start_date IS NULL AND m.created_at < (SELECT min(s.shared_at) FROM project_schedule_shares s WHERE s.project_id = m.project_id)`],
    ['target end apart from the schedule’s handover (R69)', `SELECT p.number FROM projects p WHERE EXISTS (SELECT 1 FROM project_milestones m WHERE m.project_id = p.id AND m.deleted_at IS NULL) AND p.target_end_date <> (SELECT max(m.end_date) FROM project_milestones m WHERE m.project_id = p.id AND m.deleted_at IS NULL)`],
    ['task in a milestone of another lead’s project (R69)', `SELECT t.title FROM lead_tasks t JOIN project_milestones m ON m.id = t.milestone_id JOIN projects p ON p.id = m.project_id WHERE t.lead_id <> p.lead_id`],
    ['waiting with no one named (R69)', `SELECT title FROM project_milestones WHERE (waiting_on = 'member' AND waiting_member_id IS NULL) OR (waiting_on = 'supplier' AND coalesce(waiting_name, '') = '') OR (waiting_on IS NOT NULL AND waiting_since IS NULL)`],
    /* (REG-948…, R70) Projects round 3 — updates: every state with its trail */
    ['update with an unknown status (R70)', `SELECT title FROM project_updates WHERE status NOT IN ('draft','in_review','published','sent_back','withdrawn')`],
    ['published update with no publish stamp (R70)', `SELECT title FROM project_updates WHERE status = 'published' AND (published_at IS NULL OR published_by IS NULL)`],
    ['update in review with no sender (R70)', `SELECT title FROM project_updates WHERE status = 'in_review' AND (submitted_at IS NULL OR submitted_by IS NULL)`],
    ['update sent back with no reason or reviewer (R70)', `SELECT title FROM project_updates WHERE status = 'sent_back' AND (review_note IS NULL OR reviewed_by IS NULL OR reviewed_at IS NULL)`],
    ['update withdrawn with no withdraw stamp (R70)', `SELECT title FROM project_updates WHERE status = 'withdrawn' AND (withdrawn_at IS NULL OR withdrawn_by IS NULL)`],
    ['update published with no event that published it (R70)', `SELECT u.title FROM project_updates u WHERE u.status = 'published' AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = u.project_id AND json_extract(e.detail, '$.id') = u.id AND e.kind IN ('project_update_posted','project_update_approved'))`],
    ['update in review or sent back with no send event (R70)', `SELECT u.title FROM project_updates u WHERE u.status IN ('in_review','sent_back') AND u.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = u.project_id AND json_extract(e.detail, '$.id') = u.id AND e.kind = 'project_update_submitted')`],
    ['update carrying another lead’s file (R70)', `SELECT u.title FROM project_update_files f JOIN project_updates u ON u.id = f.update_id JOIN projects p ON p.id = u.project_id JOIN lead_files lf ON lf.id = f.file_id WHERE lf.lead_id <> p.lead_id`],
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
    ['Default Quote PDF: new quotes open without the Category column (R67, Dane UAT)', `SELECT t.id FROM quote_templates t JOIN quote_template_versions v ON v.template_id = t.id AND v.version = t.version WHERE t.id = '${sid('Default Quote PDF', 'quote_template')}' AND t.deleted_at IS NULL AND (coalesce(json_extract(t.defaults_json, '$.columns'), '') NOT LIKE '%"category"%' OR coalesce(json_extract(v.defaults_json, '$.columns'), '') NOT LIKE '%"category"%')`],
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
    ['member with an unknown role (REG-601, parity map P-I)', `SELECT name FROM members WHERE role NOT IN ('Owner', 'Admin', 'Manager', 'Designer', 'Marketing', 'Accounting')`],   // (S44O — C6) Marketing, the sixth role
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
    ['live lead past New with no stage trail', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 AND l.stage <> 'New' AND NOT EXISTS (SELECT 1 FROM stage_logs s WHERE s.lead_id = l.id)`],
    ['lead whose last move does not match its stage', `SELECT l.name FROM leads l JOIN stage_logs s ON s.lead_id = l.id WHERE l.deleted_at IS NULL AND s.created_at = (SELECT max(created_at) FROM stage_logs x WHERE x.lead_id = l.id) AND s.to_stage <> l.stage`],
    ['stage log before its lead existed', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.created_at <= l.created_at`],
    ['stage log in the future', `SELECT l.name FROM stage_logs s JOIN leads l ON l.id = s.lead_id WHERE s.created_at > ${NOW}`],
    ['completed Contacted stage with no contact log', `SELECT l.name FROM leads l JOIN stage_logs s ON s.lead_id = l.id AND s.to_stage = 'Contacted' WHERE l.deleted_at IS NULL AND json_type(s.payload, '$.logs') IS NOT 'array'`],
    ['lead past New with no member', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND l.stage <> 'New' AND NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = l.id)`],
    ['assignment with no date', `SELECT l.name FROM lead_assignees a JOIN leads l ON l.id = a.lead_id WHERE a.assigned_at IS NULL`],
    ['Quote Sent / Won lead with no quote', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 AND l.stage IN ('Quote Sent','Won') AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.lead_id = l.id AND q.deleted_at IS NULL)`],
    ['Won lead with no signed contract', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 AND l.stage = 'Won' AND NOT EXISTS (SELECT 1 FROM contracts c WHERE c.lead_id = l.id AND c.status = 'Signed' AND c.deleted_at IS NULL)`],
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
    ['live quote with no payment schedule (Payment Schedule section)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND q.kind <> 'variation' AND NOT EXISTS (SELECT 1 FROM quote_payments p WHERE p.quote_id = q.id)`],   /* (Projects round 5) a variation order has none of its own */
    ['payment row with a date on an approval milestone, or none on a dated one', `SELECT q.number || ' · ' || p.name FROM quote_payments p JOIN quotes q ON q.id = p.quote_id WHERE (p.due_kind = 'approval' AND p.due_at IS NOT NULL) OR (p.due_kind <> 'approval' AND p.due_at IS NULL)`],
    ['quote file that is a folder or trashed', `SELECT q.number || ' · ' || f.name FROM quote_files x JOIN lead_files f ON f.id = x.file_id JOIN quotes q ON q.id = x.quote_id WHERE f.kind = 'folder' OR f.deleted_at IS NOT NULL OR f.lead_id <> q.lead_id`],
    ['priced quote with no terms or notes (Terms / Notes sections)', `SELECT q.number FROM quotes q WHERE q.deleted_at IS NULL AND q.amount_minor > 0 AND (q.terms_html IS NULL OR q.notes_html IS NULL)`],
    ['text template library missing a kind', `SELECT k FROM (SELECT 'terms' AS k UNION SELECT 'notes') WHERE NOT EXISTS (SELECT 1 FROM quote_text_templates t WHERE t.kind = k)`],
    ['signed-in member with no signature (Signature section)', `SELECT name FROM members WHERE is_you = 1 AND signature_kind IS NULL`],
    /* (pending modules S04, a deliberate change of this rule) the demo's one line the client passed on is an optional work they said no to — a line's status is dropped */
    ['demo quote with no line the client passed on (S04)', `SELECT 'OM-10008' WHERE EXISTS (SELECT 1 FROM quotes WHERE number = 'OM-10008' AND deleted_at IS NULL) AND NOT EXISTS (SELECT 1 FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE q.number = 'OM-10008' AND i.optional = 1 AND i.client_choice = 'skip' AND i.parent_id IS NULL)`],
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
      'design_deleted','design_restored','design_purged','room_deleted','room_restored','version_deleted','version_restored','share_stopped','share_renewed','share_reopened',
      'task_completed','task_reopened','task_edited','task_assigned','project_created','project_renamed','project_started','project_edited',
      'project_schedule_created','project_milestone_added','project_milestone_renamed','project_milestone_moved','project_milestone_status','project_milestone_edited','project_milestone_deleted','project_milestone_restored','project_schedule_shared',
      'project_update_drafted','project_update_posted','project_update_submitted','project_update_approved','project_update_sent_back','project_update_edited','project_update_withdrawn','project_update_deleted',
      'portal_opened','portal_withdrawn','file_shown','file_hidden',
      'project_choice_added','project_choice_edited','project_choice_shared','project_choice_unshared','project_choice_chosen','project_choice_changed','project_choice_deleted','project_choice_option_added','project_choice_option_removed',
      'project_stage_confirmed','project_stage_changes','project_stage_asked',
      'project_handover_requested','project_handover_sent_back','project_completed','project_reopened','project_deleted','project_restored','project_purged','project_milestone_task',
      'project_vo_created','project_vo_approved','project_money_rebalanced','project_invoice_submitted','project_invoice_sent_back','project_invoice_sent','project_invoice_voided','project_invoice_edited',
      'household_added','household_invited','household_withdrawn','household_removed','household_opened','portal_reminded',
      'project_payment_recorded','project_payment_submitted','project_payment_confirmed','project_payment_not_received','project_payment_reversed','project_invoice_reminded',
      'project_vo_reopened','project_put_on_hold','project_resumed','project_client_edited',
      'project_invoice_created','project_invoice_removed','project_invoice_recorded','project_invoice_details','project_invoice_approver_reminded','project_split_set',
      'task_outside','task_sent_outside','project_schedule_rebuilt','project_milestone_more_asked','project_milestone_more_approved','project_milestone_more_declined','project_milestone_more_withdrawn',
      'project_milestone_done_asked','project_milestone_done_approved','project_milestone_done_sent_back','project_milestone_done_withdrawn','project_schedule_share_asked','project_schedule_share_sent_back','project_schedule_share_withdrawn','project_stage_resolved',
      'project_choice_declined','project_vo_declined','project_po_created','project_po_edited','project_po_submitted','project_po_withdrawn','project_po_sent_back','project_po_sent','project_po_answered','project_po_cancelled','project_po_closed','project_po_removed','project_bill_recorded','project_bill_edited','project_bill_removed','project_expense_logged','project_expense_edited','project_expense_approved','project_expense_sent_back','project_expense_removed','project_payout_recorded','project_payout_reversed','project_floor_plan_added','project_floor_plan_main','project_floor_plan_renamed','project_floor_plan_put_away','project_floor_plan_restored','project_floor_plan_scale','project_floor_plan_resolved','project_floor_plan_reopened','project_floor_plan_task','project_floor_plan_vo','project_floor_plan_confirmed','project_credit_issued','project_credit_voided','project_credit_refunded','project_commission_paid','project_commission_reversed','project_ticket_raised','project_ticket_resolved','project_ticket_reopened','project_ticket_closed','project_ticket_escalated','project_ticket_assigned','project_compliance_done','project_compliance_not_needed','project_compliance_reopened','project_compliance_tasks','project_layout_created','project_layout_shared','project_layout_share_updated','project_layout_unshared','project_layout_viewed','project_layout_linked','project_layout_deleted','project_layout_restored','project_contractor_assigned','project_contractor_moved','project_contractor_status','project_contractor_checked','project_contractor_unchecked','project_contractor_removed') AND kind NOT LIKE 'parity\_%' ESCAPE '\\'`],   /* (gaps build, package C) (gaps build D) */   /* (REG-634 · 641 · audit 2026-09-26 · UX audit T10 · REG-912) every kind LeadEventKind names */
    ['bank question with an unknown type (REG-612)', `SELECT question FROM studio_scope_questions WHERE question_type NOT IN ('text','yes_no','number','single_select','multi_select','date')`],
    ['member preferences that are not JSON (REG-612)', `SELECT name FROM members WHERE lead_preferences IS NOT NULL AND json_valid(lead_preferences) = 0`],
    ['custom field value on an inactive or missing field (REG-612)', `SELECT v.id FROM lead_custom_field_values v LEFT JOIN lead_custom_fields f ON f.id = v.field_id WHERE f.id IS NULL`],
    ['client-answered questionnaire on a lead never asked (REG-609)', `SELECT l.name FROM leads l WHERE l.deleted_at IS NULL AND EXISTS (SELECT 1 FROM questions q WHERE q.lead_id = l.id AND q.answered_by = 'client') AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links h WHERE h.lead_id = l.id AND h.last_asked_at IS NOT NULL)`],
    ['Qanvast lead without its Qanvast id (REG-609)', `SELECT name FROM leads WHERE source = 'Qanvast' AND deleted_at IS NULL AND qanvast_lead_id IS NULL`],
    ['task with an unknown kind (REG-608)', `SELECT title FROM lead_tasks WHERE kind NOT IN ('General', 'Call', 'Follow-up')`],
    ['follow-up task on a lead with members but nobody on it (REG-608)', `SELECT t.title FROM lead_tasks t WHERE t.kind = 'Follow-up' AND EXISTS (SELECT 1 FROM lead_assignees x WHERE x.lead_id = t.lead_id) AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id)`],
    ['lead with a district outside the vocabulary (REG-607)', `SELECT name FROM leads WHERE area IS NOT NULL AND area NOT IN ('North', 'North East', 'East', 'West', 'Central')`],
    ['keyboard-mash task left behind', `SELECT title FROM lead_tasks WHERE lower(title) IN ('test','tse6y"') OR title LIKE 'hgdk%' OR title LIKE 'adfad%' OR title LIKE 'sdajk%'`],
    /* (fix-C) Updates and Choices tell one story */
    ['update photo still named after the sample picture (R70b)', `SELECT f.name FROM lead_files f JOIN project_update_files uf ON uf.file_id = f.id WHERE f.name IN ('original.jpg','defurnished.jpg') AND f.deleted_at IS NULL`],
    ['milestone waiting on the client for a choice already chosen (R74b)', `SELECT m.title FROM project_milestones m WHERE m.waiting_on = 'client' AND m.status <> 'done' AND m.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM project_selections s WHERE s.milestone_id = m.id AND s.status = 'shared' AND s.deleted_at IS NULL) AND EXISTS (SELECT 1 FROM project_selections s WHERE s.milestone_id = m.id AND s.status = 'chosen' AND s.deleted_at IS NULL AND (m.waiting_note IS NULL OR instr(lower(m.waiting_note), lower(s.title)) > 0 OR instr(lower(s.title), lower(m.waiting_note)) > 0))`],
    ['held change to an update that is not published (fix-C, C-01)', `SELECT title FROM project_updates WHERE pending IS NOT NULL AND status NOT IN ('published','withdrawn')`],
    /* (fix-A) the record says a number once, and keeps what the Won step uploaded */
    ['project number above the numbers-given mark (R68b)', `SELECT p.number FROM projects p WHERE CAST(substr(p.number, length(rtrim(p.number, '0123456789')) + 1) AS INTEGER) > coalesce((SELECT json_extract(s.value, '$."' || substr(p.number, 1, instr(p.number, '-') - 1) || '"') FROM settings s WHERE s.key = 'project_numbers_given'), 0)`],
    ['uploaded signed quote not filed (R68b)', `SELECT p.number FROM projects p JOIN leads l ON l.id = p.lead_id WHERE p.quote_id IS NULL AND l.direct = 0 AND p.deleted_at IS NULL AND json_extract((SELECT s.payload FROM stage_logs s WHERE s.lead_id = p.lead_id AND s.to_stage = 'Won' ORDER BY s.created_at DESC LIMIT 1), '$.wonQuoteTab') = 'upload' AND NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.lead_id = p.lead_id AND f.name LIKE 'Signed quote — %' AND f.deleted_at IS NULL)`],
    ['pick variation order on another option (fix-C, C-02)', `SELECT q.number FROM quotes q JOIN project_selections s ON s.id = q.selection_id JOIN project_selection_options o ON o.id = s.chosen_option_id WHERE q.kind = 'variation' AND q.deleted_at IS NULL AND q.status = 'Draft' AND NOT EXISTS (SELECT 1 FROM quote_items i WHERE i.quote_id = q.id AND i.kind <> 'group' AND i.name LIKE '%' || o.name)`],
    /* (fix-E, R76b) the ending's records */
    ['handover review row with no request waiting (R76b, E-04)', `SELECT n.id FROM notifications n WHERE n.kind = 'handover_review' AND NOT EXISTS (SELECT 1 FROM projects p WHERE n.href = '/projects/' || p.id AND p.handover_requested_at IS NOT NULL AND p.stage = 'in_progress' AND p.deleted_at IS NULL)`],
    ['completion or request naming an open item by its met words (R76b, E-03)', `SELECT e.id FROM lead_events e WHERE e.kind IN ('project_completed','project_handover_requested') AND EXISTS (SELECT 1 FROM json_each(CASE WHEN json_valid(e.detail) THEN e.detail ELSE '{}' END, '$.open') j WHERE j.value IN ('Every milestone is done','Nothing is outstanding on money','No update waits for review') OR j.value LIKE '% has confirmed “%')`],
    ['lead with a live project that is not Won (R76b, A-01)', `SELECT l.name FROM leads l JOIN projects p ON p.lead_id = l.id WHERE p.deleted_at IS NULL AND l.deleted_at IS NULL AND coalesce(l.direct, 0) = 0 AND l.stage <> 'Won'`],
    ['direct client record with no project (R76b, E-01)', `SELECT l.name FROM leads l WHERE coalesce(l.direct, 0) = 1 AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.lead_id = l.id)`],
    /* (fix-D, R75b) a sent invoice keeps the contract it was raised on (D-02 · F-08) */
    ['sent or void invoice with no contract stamp (R75b)', `SELECT number FROM project_invoices WHERE status <> 'draft' AND (contract_minor IS NULL OR base_minor IS NULL OR variations_minor IS NULL)`],
    ['invoice whose contract stamp does not add up (R75b)', `SELECT number FROM project_invoices WHERE contract_minor IS NOT NULL AND contract_minor <> max(0, base_minor + variations_minor)`],
    /* (fix-F, R77b) the portal as the client lives in it: what it shows opens, and every stamp names a person who could have made it */
    ['PDF shown to a client that opens no page (R77b, F-06)', `SELECT f.name FROM lead_files f WHERE f.shown_to_client_at IS NOT NULL AND f.deleted_at IS NULL AND f.kind = 'pdf' AND NOT EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id)`],
    ['update opened by someone with no link to its lead (R77b, C-07)', `SELECT u.title FROM project_updates u JOIN projects p ON p.id = u.project_id WHERE u.client_opened_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM homeowner_lead_links k WHERE k.lead_id = p.lead_id AND k.homeowner_id = u.client_opened_by) AND NOT EXISTS (SELECT 1 FROM homeowner_household_links x WHERE x.lead_id = p.lead_id AND x.homeowner_id = u.client_opened_by)`],
    ['choice picked on the portal by someone with no link to its lead (R77b, F-03)', `SELECT s.title FROM project_selections s JOIN projects p ON p.id = s.project_id WHERE s.chosen_homeowner_id IS NOT NULL AND (s.chosen_by <> 'client' OR (NOT EXISTS (SELECT 1 FROM homeowner_lead_links k WHERE k.lead_id = p.lead_id AND k.homeowner_id = s.chosen_homeowner_id) AND NOT EXISTS (SELECT 1 FROM homeowner_household_links x WHERE x.lead_id = p.lead_id AND x.homeowner_id = s.chosen_homeowner_id)))`],
    ['client’s question asked with no ask on record (R77b)', `SELECT l.name FROM leads l JOIN homeowner_lead_links k ON k.lead_id = l.id WHERE k.last_asked_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = l.id AND e.kind = 'questionnaire_asked')`],
    ['quote with the client but not shared, or never sent (R77b)', `SELECT number FROM quotes WHERE status = 'Sent to Client' AND deleted_at IS NULL AND (client_sent_at IS NULL OR visibility <> 'Shared')`],
    /* (gaps build, package A — R78) the project record: a hold says why and has its line, ends with the project; the scope keeps to the rooms */
    ['project on hold with no reason, no one who put it, or no line (R78)', `SELECT p.number FROM projects p WHERE p.on_hold_at IS NOT NULL AND (coalesce(trim(p.on_hold_reason), '') = '' OR p.on_hold_by IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = p.id AND e.kind = 'project_put_on_hold' AND e.at <= p.on_hold_at / 1000 + 60))`],
    ['hold on a completed or deleted project (R78)', `SELECT number FROM projects WHERE on_hold_at IS NOT NULL AND (stage = 'completed' OR deleted_at IS NOT NULL)`],
    ['hold field without its hold (R78)', `SELECT number FROM projects WHERE on_hold_at IS NULL AND (on_hold_reason IS NOT NULL OR on_hold_until IS NOT NULL OR on_hold_by IS NOT NULL)`],
    ['resume day before the hold began (R78)', `SELECT number FROM projects WHERE on_hold_until IS NOT NULL AND on_hold_until < on_hold_at - 86400000`],
    ['scope with a room outside the twelve, or not JSON (R78)', `SELECT p.number FROM projects p WHERE p.scope IS NOT NULL AND (json_valid(p.scope) = 0 OR EXISTS (SELECT 1 FROM json_each(p.scope) j WHERE j.value NOT IN ('Living Room','Kitchen','Master Bedroom','Bedroom 2','Bedroom 3','Bathroom 1','Bathroom 2','Balcony','Service Yard','Study','Dining','Others')))`],
    ['deferred items on a project not completed and not asked about, or not JSON (R78)', `SELECT number FROM projects WHERE handover_deferred IS NOT NULL AND (json_valid(handover_deferred) = 0 OR (stage <> 'completed' AND handover_requested_at IS NULL))`],
    ['two live projects with one name (R78)', `SELECT lower(name) FROM projects WHERE deleted_at IS NULL GROUP BY lower(trim(name)) HAVING count(*) > 1`],
    /* (gaps build B, R79) money in, complete: every link, file, kind and line with its record */
    ['invoice the client may hold with no link token (R79)', `SELECT coalesce(number, id) FROM project_invoices WHERE share_token IS NULL AND kind <> 'external'`],
    ['receipt with no link token (R79)', `SELECT receipt_number FROM project_payments WHERE receipt_number IS NOT NULL AND share_token IS NULL`],
    ['sent invoice not filed in Files › Payments (R79)', `SELECT number FROM project_invoices i WHERE i.status IN ('sent','void') AND i.kind <> 'external' AND i.number IS NOT NULL AND (i.file_id IS NULL OR NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = i.file_id AND f.deleted_at IS NULL))`],
    ['one-off whose amount is not its lines (R79)', `SELECT coalesce(number, id) FROM project_invoices WHERE kind = 'one_off' AND amount_minor <> gst_minor + (SELECT coalesce(sum(round(json_extract(j.value, '$.qty') * json_extract(j.value, '$.unitMinor'))), 0) FROM json_each(CASE WHEN json_valid(lines_json) THEN lines_json ELSE '[]' END) j)`],
    ['invoice outside the stages whose kind does not match its ref (R79)', `SELECT coalesce(number, id) FROM project_invoices WHERE (stage_ref LIKE 'vo:%' AND kind <> 'variation') OR (kind = 'variation' AND stage_ref NOT LIKE 'vo:%') OR (kind = 'one_off' AND stage_ref NOT LIKE 'extra:%')`],
    ['variation order billed on its own that the client has not approved (R79)', `SELECT coalesce(i.number, i.id) FROM project_invoices i WHERE i.kind = 'variation' AND i.status <> 'void' AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = i.variation_id AND q.status IN ('Confirmed','Signed') AND q.deleted_at IS NULL)`],
    ['variation order billed twice (R79)', `SELECT variation_id FROM project_invoices WHERE kind = 'variation' AND status <> 'void' GROUP BY variation_id HAVING count(*) > 1`],
    ['recorded invoice with no reference, or not sent (R79)', `SELECT id FROM project_invoices WHERE kind = 'external' AND (external_ref IS NULL OR status NOT IN ('sent','void') OR number IS NOT NULL)`],
    ['one-off or VO invoice with no Activity line (R79)', `SELECT coalesce(i.number, i.id) FROM project_invoices i WHERE i.kind IN ('one_off','variation') AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = i.project_id AND e.kind = 'project_invoice_created' AND json_extract(e.detail, '$.id') = i.id)`],
    ['recorded invoice with no Activity line (R79)', `SELECT i.external_ref FROM project_invoices i WHERE i.kind = 'external' AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = i.project_id AND e.kind = 'project_invoice_recorded' AND json_extract(e.detail, '$.id') = i.id)`],
    ['reminder on an invoice before it was sent (R79)', `SELECT e.id FROM lead_events e JOIN project_invoices i ON i.id = json_extract(e.detail, '$.id') WHERE e.kind = 'project_invoice_reminded' AND (i.sent_at IS NULL OR e.at < i.sent_at)`],
    ['fixed-amount stage invoice off its fixed amount while a Draft (R79)', `SELECT id FROM project_invoices WHERE fixed_minor IS NOT NULL AND status = 'draft' AND variance_reason IS NULL AND amount_minor <> fixed_minor`],
    /* (gaps build, package C — R80) the schedule and tasks: every ask, link, answer and outside person with its record and its line */
    ['ready-made schedule with no milestones, or given with no flag (R80)', `SELECT name FROM schedule_templates t WHERE t.preset_key IS NOT NULL AND (NOT EXISTS (SELECT 1 FROM schedule_template_items i WHERE i.template_id = t.id) OR NOT EXISTS (SELECT 1 FROM settings WHERE key = 'schedule_presets_seeded'))`],
    ['outside person half written, or with a number WhatsApp can’t take (R80)', `SELECT title FROM lead_tasks WHERE (external_name IS NULL) <> (external_kind IS NULL) OR (external_kind IS NOT NULL AND external_kind NOT IN ('subcontractor','supplier')) OR (external_phone IS NOT NULL AND external_phone NOT GLOB '[89][0-9][0-9][0-9][0-9][0-9][0-9][0-9]') OR (external_sent_at IS NOT NULL AND (external_name IS NULL OR external_phone IS NULL))`],
    ['outside person on a lead’s task with no Activity line (R80)', `SELECT t.title FROM lead_tasks t WHERE t.external_name IS NOT NULL AND t.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = t.lead_id AND e.kind = 'task_outside' AND json_extract(e.detail, '$.id') = t.id)`],
    ['task sent to an outside person with no line (R80)', `SELECT t.title FROM lead_tasks t WHERE t.external_sent_at IS NOT NULL AND t.lead_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = t.lead_id AND e.kind = 'task_sent_outside' AND json_extract(e.detail, '$.id') = t.id)`],
    ['more time asked for a day not after the last day, or with no line (R80)', `SELECT x.id FROM project_milestone_extensions x WHERE x.to_end <= x.from_end OR trim(x.reason) = '' OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = x.project_id AND e.kind = 'project_milestone_more_asked' AND json_extract(e.detail, '$.id') = x.milestone_id)`],
    ['more time answered with nobody answering, or waiting with an answer (R80)', `SELECT id FROM project_milestone_extensions WHERE (status IN ('approved','declined') AND (answered_by IS NULL OR answered_at IS NULL)) OR (status = 'pending' AND answered_at IS NOT NULL) OR status NOT IN ('pending','approved','declined','withdrawn')`],
    ['two open asks for more time on one milestone (R80)', `SELECT milestone_id FROM project_milestone_extensions WHERE status = 'pending' GROUP BY milestone_id HAVING count(*) > 1`],
    ['more time asked on a milestone of another project, or a done one (R80)', `SELECT x.id FROM project_milestone_extensions x JOIN project_milestones m ON m.id = x.milestone_id WHERE m.project_id <> x.project_id OR (x.status = 'pending' AND m.status = 'done')`],
    ['milestone waiting on itself, on another project’s, or twice on one (R80)', `SELECT l.id FROM project_milestone_links l JOIN project_milestones a ON a.id = l.milestone_id JOIN project_milestones b ON b.id = l.after_id WHERE l.milestone_id = l.after_id OR a.project_id <> b.project_id OR a.project_id <> l.project_id OR a.follows_id = l.after_id`],
    ['stage resolved with no note or no line (R80)', `SELECT m.title FROM project_milestones m WHERE (m.resolved_at IS NULL) <> (m.resolved_note IS NULL) OR (m.resolved_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = m.project_id AND e.kind = 'project_stage_resolved' AND json_extract(e.detail, '$.id') = m.id))`],
    ['a Done waiting on a milestone already done (R80)', `SELECT title FROM project_milestones WHERE done_asked_at IS NOT NULL AND (status = 'done' OR done_asked_by IS NULL)`],
    ['running or finished milestone with no start day (R80)', `SELECT title FROM project_milestones WHERE deleted_at IS NULL AND status IN ('in_progress','blocked','done') AND started_at IS NULL`],
    ['bar colour outside the eight (R80)', `SELECT title FROM project_milestones WHERE color IS NOT NULL AND color NOT IN ('blue','green','amber','brown','navy','pink','teal','purple')`],
    ['ask to share with no changes named, or not JSON (R80)', `SELECT id FROM project_share_requests WHERE json_valid(milestone_ids) = 0 OR json_array_length(milestone_ids) = 0 OR status NOT IN ('pending','shared','sent_back','withdrawn')`],
    /* (gaps build F1, R83) money out: every PO, bill, expense and payment out with its record and its trail */
    ['PO whose totals are not its lines (R83)', `SELECT p.number FROM purchase_orders p WHERE p.subtotal_minor <> (SELECT coalesce(sum(l.amount_minor), 0) FROM purchase_order_lines l WHERE l.po_id = p.id) OR p.total_minor <> p.subtotal_minor + p.gst_minor`],
    ['PO line whose amount is not its quantity × price (R83)', `SELECT id FROM purchase_order_lines WHERE abs(amount_minor - qty * unit_minor) > 0.5`],
    ['PO with GST from a vendor who charges none, or an advance above its total (R83)', `SELECT p.number FROM purchase_orders p WHERE (p.gst_minor > 0 AND p.charges_gst = 0) OR p.advance_minor > p.total_minor OR p.advance_minor < 0`],
    ['PO sent with no send stamp, link or line (R83)', `SELECT p.number FROM purchase_orders p WHERE p.status <> 'draft' AND p.status <> 'cancelled' AND (p.sent_at IS NULL OR p.vendor_token IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = p.project_id AND e.kind = 'project_po_sent' AND json_extract(e.detail, '$.id') = p.id))`],
    ['PO answered with no stamp, or a Draft carrying an answer (R83)', `SELECT number FROM purchase_orders WHERE (vendor_answer IS NOT NULL AND (vendor_answered_at IS NULL OR answer_via IS NULL OR status = 'draft' OR vendor_answer NOT IN ('accepted','changes','declined'))) OR (vendor_answer IS NULL AND vendor_answered_at IS NOT NULL)`],
    ['PO waiting for approval with nobody who submitted it, or not a Draft (R83)', `SELECT number FROM purchase_orders WHERE submitted_at IS NOT NULL AND (submitted_by IS NULL OR status <> 'draft')`],
    ['closed PO with no close stamp, or paid short with no note (R83)', `SELECT p.number FROM purchase_orders p WHERE p.status = 'closed' AND (p.closed_at IS NULL OR p.closed_by IS NULL OR (p.close_note IS NULL AND (SELECT coalesce(sum(o.amount_minor), 0) FROM payments_out o WHERE o.po_id = p.id AND o.reversed_at IS NULL) < p.total_minor))`],
    ['cancelled PO with something paid on it, or no reason (R83)', `SELECT p.number FROM purchase_orders p WHERE p.status = 'cancelled' AND (p.cancel_reason IS NULL OR p.cancelled_at IS NULL OR EXISTS (SELECT 1 FROM payments_out o WHERE o.po_id = p.id AND o.reversed_at IS NULL))`],
    ['PO of an unknown status or terms (R83)', `SELECT number FROM purchase_orders WHERE status NOT IN ('draft','sent','closed','cancelled') OR terms NOT IN ('cod','net15','net30','net60','custom') OR advance_kind NOT IN ('none','pct','fixed')`],
    ['PO paid beyond what its vendor is owed (R83)', `SELECT p.number FROM purchase_orders p WHERE (SELECT coalesce(sum(o.amount_minor), 0) FROM payments_out o WHERE o.po_id = p.id AND o.reversed_at IS NULL) > max(p.total_minor, (SELECT coalesce(sum(b.total_minor), 0) FROM supplier_bills b WHERE b.po_id = p.id AND b.deleted_at IS NULL))`],
    ['bill paid beyond its total (R83)', `SELECT b.reference FROM supplier_bills b WHERE (SELECT coalesce(sum(o.amount_minor), 0) FROM payments_out o WHERE o.bill_id = b.id AND o.reversed_at IS NULL) > b.total_minor`],
    ['bill on a PO of another vendor or project, or one never sent (R83)', `SELECT b.reference FROM supplier_bills b JOIN purchase_orders p ON p.id = b.po_id WHERE p.vendor_id <> b.vendor_id OR coalesce(p.project_id, '') <> coalesce(b.project_id, '') OR p.sent_at IS NULL`],
    ['bill whose total is not its subtotal and GST (R83)', `SELECT reference FROM supplier_bills WHERE abs(subtotal_minor + gst_minor - total_minor) > 1 OR total_minor <= 0`],
    ['bill read from a file it does not keep (R83)', `SELECT b.reference FROM supplier_bills b WHERE b.read_from IS NOT NULL AND NOT EXISTS (SELECT 1 FROM cost_documents d WHERE d.record_kind = 'bill' AND d.record_id = b.id)`],
    ['payment out on a bill that is not its PO’s, or of an unknown kind (R83)', `SELECT o.id FROM payments_out o LEFT JOIN supplier_bills b ON b.id = o.bill_id WHERE o.kind NOT IN ('po','bill','claim') OR (o.kind = 'bill' AND (b.id IS NULL OR coalesce(b.po_id, '') <> coalesce(o.po_id, ''))) OR (o.kind = 'po' AND o.po_id IS NULL) OR o.amount_minor <= 0`],
    ['claim paid back before it was approved, beyond its amount, or to someone else (R83)', `SELECT e.description FROM payments_out o JOIN expenses e ON e.id = o.expense_id WHERE o.kind = 'claim' AND o.reversed_at IS NULL AND (e.status <> 'approved' OR e.paid_by <> 'member' OR o.member_id <> e.claimant_id OR (SELECT sum(x.amount_minor) FROM payments_out x WHERE x.expense_id = e.id AND x.reversed_at IS NULL) > e.amount_minor)`],
    ['expense answered with nobody answering, or waiting with an answer (R83)', `SELECT description FROM expenses WHERE status NOT IN ('pending','approved','sent_back') OR (status IN ('approved','sent_back') AND (reviewed_by IS NULL OR reviewed_at IS NULL)) OR (status = 'pending' AND reviewed_at IS NOT NULL) OR (paid_by = 'member') <> (claimant_id IS NOT NULL)`],
    ['project cost with no Activity line (R83)', `SELECT x.n FROM (SELECT p.number AS n, p.project_id AS pid, p.id AS id, 'project_po_created' AS k FROM purchase_orders p WHERE p.deleted_at IS NULL UNION ALL SELECT b.reference, b.project_id, b.id, 'project_bill_recorded' FROM supplier_bills b WHERE b.project_id IS NOT NULL AND b.deleted_at IS NULL UNION ALL SELECT e.description, e.project_id, e.id, 'project_expense_logged' FROM expenses e WHERE e.project_id IS NOT NULL AND e.deleted_at IS NULL) x WHERE NOT EXISTS (SELECT 1 FROM lead_events v WHERE v.project_id = x.pid AND v.kind = x.k AND json_extract(v.detail, '$.id') = x.id)`],
    ['cost made before its project (R83)', `SELECT p.number FROM purchase_orders p JOIN projects j ON j.id = p.project_id WHERE p.created_at < j.created_at UNION ALL SELECT e.description FROM expenses e JOIN projects j ON j.id = e.project_id WHERE e.created_at < j.created_at`],
    ['merged vendor still active, merged into itself, or still holding records (R83)', `SELECT v.name FROM vendors v WHERE v.merged_into IS NOT NULL AND (v.is_active = 1 OR v.merged_into = v.id OR EXISTS (SELECT 1 FROM purchase_orders p WHERE p.vendor_id = v.id) OR EXISTS (SELECT 1 FROM supplier_bills b WHERE b.vendor_id = v.id) OR EXISTS (SELECT 1 FROM expenses e WHERE e.vendor_id = v.id))`],
    ['two active vendors of one name (R83)', `SELECT lower(trim(name)) FROM vendors WHERE is_active = 1 GROUP BY lower(trim(name)) HAVING count(*) > 1`],
    ['vendor with a mobile WhatsApp can’t take (R83)', `SELECT name FROM vendors WHERE phone IS NOT NULL AND phone NOT GLOB '[689][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'`],
    ['cost document with no record (R83)', `SELECT d.name FROM cost_documents d WHERE (d.record_kind = 'bill' AND NOT EXISTS (SELECT 1 FROM supplier_bills b WHERE b.id = d.record_id)) OR (d.record_kind = 'expense' AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id = d.record_id)) OR (d.record_kind = 'payout' AND NOT EXISTS (SELECT 1 FROM payments_out o WHERE o.id = d.record_id)) OR d.record_kind NOT IN ('bill','expense','payout')`],
    /* (gaps build E, R82) files and delivery: every file's bytes, picture and size with its record; the starter folders; the outbox */
    ['PDF with no bytes that is not an invoice’s or a receipt’s entry (R82)', `SELECT f.name FROM lead_files f WHERE f.kind = 'pdf' AND NOT EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_invoices v WHERE v.file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_selections sr WHERE sr.receipt_file_id = f.id) AND NOT EXISTS (SELECT 1 FROM project_payments p WHERE p.receipt_file_id = f.id) AND NOT EXISTS (SELECT 1 FROM credit_notes cn WHERE cn.file_id = f.id)`],   /* (gaps build F2) a credit note's entry is its paper */
    ['a file’s picture address with nothing behind it (R82)', `SELECT name FROM lead_files f WHERE (f.thumb = '/files/thumb/' || f.id AND NOT EXISTS (SELECT 1 FROM lead_file_thumbs t WHERE t.file_id = f.id)) OR (f.thumb = '/files/img/' || f.id AND NOT EXISTS (SELECT 1 FROM lead_file_images i WHERE i.file_id = f.id))`],
    ['kept file whose size is not its bytes (R82)', `SELECT f.name FROM lead_files f JOIN lead_file_images i ON i.file_id = f.id WHERE f.size_bytes IS NULL OR abs(f.size_bytes - (length(i.data) - instr(i.data, ',')) * 3 / 4) > 3`],
    ['live project missing a starter folder (R82)', `SELECT p.number || ' · ' || s.name FROM projects p CROSS JOIN (SELECT 'Contract & VOs' AS name, 'contract & vos,contract,contracts,contract/vo,variation orders' AS also UNION ALL SELECT 'Floor plans', 'floor plans,floor plan,floorplans' UNION ALL SELECT 'Renders', 'renders' UNION ALL SELECT 'Quotes & BOQ', 'quotes & boq,quotes,boq' UNION ALL SELECT 'Site photos', 'site photos,photos') s WHERE p.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.lead_id = p.lead_id AND f.kind = 'folder' AND f.parent_id IS NULL AND f.deleted_at IS NULL AND instr(',' || s.also || ',', ',' || lower(f.name) || ',') > 0)`],
    ['two live root folders of one name on a lead (R82)', `SELECT lead_id || ' · ' || name FROM lead_files WHERE kind = 'folder' AND parent_id IS NULL AND deleted_at IS NULL GROUP BY lead_id, lower(trim(name)) HAVING count(*) > 1`],
    ['outbox message with no words, no channel or an unknown status (R82)', `SELECT id FROM notification_outbox WHERE trim(body) = '' OR channel NOT IN ('email','whatsapp') OR status NOT IN ('sent','failed','no_address') OR (status = 'sent' AND to_address IS NULL) OR (channel = 'email' AND subject IS NULL)`],
    ['outbox message whose bell row is gone or went to someone else (R82)', `SELECT o.id FROM notification_outbox o WHERE o.notification_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.id = o.notification_id AND n.member_id = o.member_id AND n.kind = o.event AND instr(n.channels, o.channel) > 0)`],
    /* (gaps build D, R81) updates, choices and the portal: every no, receipt and answer change with its record and its line */
    ['declined variation order with no reason or line, approved, or not a variation order (R81)', `SELECT number FROM quotes q WHERE q.declined_at IS NOT NULL AND q.deleted_at IS NULL AND (q.kind <> 'variation' OR q.declined_note IS NULL OR trim(q.declined_note) = '' OR q.status IN ('Confirmed','Signed') OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = q.project_id AND e.kind = 'project_vo_declined' AND json_extract(e.detail, '$.id') = q.id))`],
    ['choice the client said no to with no answer, reason or line (R81)', `SELECT s.title FROM project_selections s WHERE s.status = 'declined' AND s.deleted_at IS NULL AND (s.client_answer IS NULL OR s.client_answer NOT IN ('reject','other_options') OR s.client_answer_note IS NULL OR s.client_answer_at IS NULL OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = s.project_id AND e.kind = 'project_choice_declined' AND json_extract(e.detail, '$.id') = s.id))`],
    ['chosen choice with no selection receipt, or a receipt on one neither chosen nor answered no (R81, parity map TD-044)', `SELECT s.title FROM project_selections s WHERE s.deleted_at IS NULL AND ((s.status = 'chosen' AND (s.receipt_file_id IS NULL OR s.receipt_hash IS NULL OR NOT EXISTS (SELECT 1 FROM lead_files f JOIN projects p ON p.id = s.project_id WHERE f.id = s.receipt_file_id AND f.deleted_at IS NULL AND f.lead_id = p.lead_id))) OR (s.status NOT IN ('chosen','declined') AND s.receipt_hash IS NOT NULL))`],   // (parity map, TD-044) a client's no keeps its receipt
    ['answer history that does not end at the answer (R81)', `SELECT q.text FROM questions q WHERE EXISTS (SELECT 1 FROM question_answer_history h WHERE h.question_id = q.id) AND coalesce((SELECT h.after FROM question_answer_history h WHERE h.question_id = q.id ORDER BY h.at DESC LIMIT 1), '') <> coalesce(q.answer, '')`],
    ['answer change on another lead, by nobody, or of an unknown kind (R81)', `SELECT h.id FROM question_answer_history h JOIN questions q ON q.id = h.question_id WHERE h.lead_id <> q.lead_id OR h.by_kind NOT IN ('studio','client') OR (h.by_kind = 'studio' AND h.by_member_id IS NULL) OR (h.by_kind = 'client' AND h.by_homeowner_id IS NULL)`],
    ['CaseTrust tick on a contract not signed online (R81)', `SELECT title FROM contracts WHERE casetrust_at IS NOT NULL AND (signed_by IS NULL OR status <> 'Signed')`],
    /* (gaps build G, R85) the floor plan: every plan with its picture and its file, one main plan, every mark of a known tool and layer, every link
       and every confirmation with its line */
    ['floor plan with no picture, or its file gone or on another lead (R85)', `SELECT p.name FROM project_floor_plans p WHERE NOT EXISTS (SELECT 1 FROM floor_plan_pictures x WHERE x.plan_id = p.id) OR (p.file_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = p.file_id AND f.lead_id = p.lead_id)) OR NOT EXISTS (SELECT 1 FROM projects pr WHERE pr.id = p.project_id AND pr.lead_id = p.lead_id)`],
    ['project whose live floor plans have no main plan, or two (R85)', `SELECT pr.number FROM projects pr WHERE EXISTS (SELECT 1 FROM project_floor_plans p WHERE p.project_id = pr.id AND p.put_away_at IS NULL) AND (SELECT count(*) FROM project_floor_plans p WHERE p.project_id = pr.id AND p.put_away_at IS NULL AND p.is_main = 1) <> 1`],
    ['floor plan mark of an unknown tool or layer, a client’s mark the client may not draw, or not on its plan’s project (R85)', `SELECT m.id FROM floor_plan_marks m JOIN project_floor_plans p ON p.id = m.plan_id WHERE m.tool NOT IN ('pen','rect','arrow','text','pin','photo','hatch','cloud','callout','symbol','dimension') OR m.layer NOT IN ('general','carpentry','electrical','plumbing','lighting','tiling','client','studio_only') OR (m.author_kind = 'client' AND (m.layer <> 'client' OR m.tool NOT IN ('pin','pen','rect','arrow','text','photo'))) OR m.author_kind NOT IN ('studio','client') OR m.project_id <> p.project_id OR m.status NOT IN ('open','resolved') OR (m.status = 'resolved') <> (m.resolved_at IS NOT NULL)`],
    ['floor plan mark whose task or variation order is gone, or whose photo is not a file of the project (R85)', `SELECT m.id FROM floor_plan_marks m JOIN project_floor_plans p ON p.id = m.plan_id WHERE (m.task_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = m.task_id AND t.lead_id = p.lead_id)) OR (m.variation_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.id = m.variation_id AND q.kind = 'variation' AND q.project_id = p.project_id)) OR EXISTS (SELECT 1 FROM json_each(m.shape, '$.photos') j WHERE NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = j.value AND f.lead_id = p.lead_id))`],
    ['layout confirmation with no line, or by nobody (R85)', `SELECT c.id FROM floor_plan_confirmations c WHERE trim(c.name) = '' OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = c.project_id AND e.kind = 'project_floor_plan_confirmed' AND json_extract(e.detail, '$.id') = c.plan_id)`],
    ['floor plan comment on a mark that is gone, or with no words and no photo (R85)', `SELECT c.id FROM floor_plan_comments c WHERE NOT EXISTS (SELECT 1 FROM floor_plan_marks m WHERE m.id = c.mark_id) OR (trim(c.body) = '' AND (c.photos IS NULL OR json_array_length(c.photos) = 0))`],
    /* (gaps build F2, R84) the books: every credit note, rule, share, ask and payout with its record and its trail */
    ['credit note more than its invoice can take (R84)', `SELECT i.number FROM project_invoices i WHERE (SELECT coalesce(sum(c.amount_minor), 0) FROM credit_notes c WHERE c.invoice_id = i.id AND c.status = 'issued' AND c.kind <> 'overpayment') > i.amount_minor`],   /* (pending modules S07) an overpayment's credit lowers no invoice */
    ['credit note on an invoice not sent, or on another project’s (R84)', `SELECT c.number FROM credit_notes c JOIN project_invoices i ON i.id = c.invoice_id WHERE i.status NOT IN ('sent','void') OR i.project_id <> c.project_id OR c.amount_minor <= 0`],
    ['credit note whose GST is not at its invoice’s rate (R84)', `SELECT c.number FROM credit_notes c JOIN project_invoices i ON i.id = c.invoice_id WHERE c.kind <> 'overpayment' AND abs(c.gst_minor - (CASE WHEN i.amount_minor > 0 THEN round(c.amount_minor * 1.0 * i.gst_minor / i.amount_minor) ELSE 0 END)) > 1`],   /* (pending modules S07) an overpayment carries none */
    ['credit note with no reason, no issuer or an unknown status (R84)', `SELECT number FROM credit_notes WHERE trim(reason) = '' OR issued_by IS NULL OR status NOT IN ('issued','void')`],
    ['void credit note with no reason or stamp, or an issued one with a void stamp (R84)', `SELECT number FROM credit_notes WHERE (status = 'void' AND (void_reason IS NULL OR voided_at IS NULL)) OR (status = 'issued' AND voided_at IS NOT NULL)`],
    ['credit note refund beyond the credit, or with no day, method or who (R84)', `SELECT number FROM credit_notes WHERE refund_minor IS NOT NULL AND (refund_minor > amount_minor OR refunded_on IS NULL OR refund_method IS NULL OR refunded_by IS NULL)`],
    ['credit note with no entry in Files, or an entry on another lead (R84)', `SELECT c.number FROM credit_notes c JOIN projects p ON p.id = c.project_id LEFT JOIN lead_files f ON f.id = c.file_id WHERE f.id IS NULL OR f.lead_id <> p.lead_id`],
    ['credit note with no Activity line (R84)', `SELECT c.number FROM credit_notes c WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = c.project_id AND e.kind = 'project_credit_issued' AND json_extract(e.detail, '$.id') = c.id)`],
    ['commission rule of an unknown basis, a rate out of range or a fixed one with no amount (R84)', `SELECT id FROM commission_rules WHERE basis NOT IN ('none','payments','profit','fixed') OR (basis IN ('payments','profit') AND (rate_bp <= 0 OR rate_bp > 5000)) OR (basis = 'fixed' AND fixed_minor <= 0)`],
    ['two commission rules in force for one scope (R84)', `SELECT coalesce(member_id, '*') || ' · ' || coalesce(project_id, '*') FROM commission_rules WHERE ended_at IS NULL GROUP BY coalesce(member_id, '*'), coalesce(project_id, '*') HAVING count(*) > 1`],
    ['commission shares that don’t add up to 100% (R84)', `SELECT project_id FROM commission_shares GROUP BY project_id HAVING sum(share_bp) <> 10000`],
    ['commission share for someone not on the project’s team (R84)', `SELECT s.member_id FROM commission_shares s JOIN projects p ON p.id = s.project_id WHERE NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = p.lead_id AND a.member_id = s.member_id)`],
    ['approved commission ask with no rule, or answered with nobody answering (R84)', `SELECT r.id FROM commission_requests r WHERE (r.status = 'approved' AND NOT EXISTS (SELECT 1 FROM commission_rules x WHERE x.request_id = r.id AND x.member_id = r.member_id AND x.project_id = r.project_id)) OR (r.status IN ('approved','declined') AND (r.answered_by IS NULL OR r.answered_at IS NULL OR r.answered_at < r.created_at))`],
    ['open commission ask by someone not on the team, or two open on one project (R84)', `SELECT r.member_id FROM commission_requests r JOIN projects p ON p.id = r.project_id WHERE r.status = 'open' AND (NOT EXISTS (SELECT 1 FROM lead_assignees a WHERE a.lead_id = p.lead_id AND a.member_id = r.member_id) OR (SELECT count(*) FROM commission_requests o WHERE o.status = 'open' AND o.member_id = r.member_id AND o.project_id = r.project_id) > 1)`],
    ['commission payout of nothing, reversed with no reason, or with no Activity line (R84)', `SELECT x.id FROM commission_payouts x WHERE x.amount_minor <= 0 OR (x.reversed_at IS NOT NULL AND (x.reverse_reason IS NULL OR x.reversed_by IS NULL)) OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = x.project_id AND e.kind = 'project_commission_paid' AND json_extract(e.detail, '$.id') = x.id)`],
    /* (gaps build H, R86) tickets, Messages, the About page: every ticket on its project's lead with a known state, priority and number, its stamps
       matching its state, its photos files of the lead, a line for its raising; every reply on a ticket, every message on its project's lead; the
       About page's pictures readable and its members real */
    ['ticket with an unknown state or priority, a bad number, or not on its project’s lead (R86)', `SELECT t.number FROM project_tickets t WHERE t.status NOT IN ('open','in_progress','resolved','closed') OR t.priority NOT IN ('normal','urgent') OR t.number NOT GLOB 'T-[0-9][0-9][0-9][0-9]-[0-9]*' OR t.raised_kind NOT IN ('client','studio') OR NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = t.project_id AND p.lead_id = t.lead_id)`],
    ['ticket whose stamps don’t match its state (R86)', `SELECT number FROM project_tickets WHERE (status = 'resolved' AND resolved_at IS NULL) OR (status = 'closed' AND closed_at IS NULL) OR (status IN ('open','in_progress') AND (resolved_at IS NOT NULL OR closed_at IS NOT NULL)) OR (escalated_at IS NOT NULL AND priority <> 'urgent')`],
    ['ticket photo that is not a live file of its lead (R86)', `SELECT t.number FROM project_tickets t, json_each(coalesce(t.photos, '[]')) j WHERE NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = j.value AND f.lead_id = t.lead_id)`],
    ['ticket with no line for its raising (R86)', `SELECT t.number FROM project_tickets t WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = t.project_id AND e.kind = 'project_ticket_raised' AND json_extract(e.detail, '$.id') = t.id)`],
    ['ticket reply with no words, no photo and no state, or a client’s internal note (R86)', `SELECT r.id FROM ticket_replies r WHERE (r.event IS NULL AND trim(r.body) = '' AND (r.photos IS NULL OR json_array_length(r.photos) = 0)) OR (r.internal = 1 AND r.author_kind = 'client') OR r.author_kind NOT IN ('client','studio') OR (r.event IS NOT NULL AND r.event NOT IN ('resolved','reopened','closed','escalated','assigned','priority'))`],
    ['message not on its project’s lead, or with no words and no photo (R86)', `SELECT m.id FROM project_messages m WHERE NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = m.project_id AND p.lead_id = m.lead_id) OR (m.deleted_at IS NULL AND trim(m.body) = '' AND (m.photos IS NULL OR json_array_length(m.photos) = 0)) OR m.author_kind NOT IN ('client','studio')`],
    ['About page picture that is not a picture, or a member shown on it who has left (R86)', `SELECT id FROM studio_pictures WHERE data NOT LIKE 'data:image/%' OR kind NOT IN ('about','member') UNION ALL SELECT id FROM members WHERE portal_shown = 1 AND is_active = 0`],
    /* (gaps build I, R87) compliance answers with their lines and a known item and state; starter tasks tied to a live item of their project's
       kind, each done with its answer; capacities in range */
    ['compliance answer of an unknown state, or with no Activity line (R87)', `SELECT c.item_id FROM project_compliance c WHERE c.state NOT IN ('done','not_needed') OR NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = c.project_id AND e.kind IN ('project_compliance_done','project_compliance_not_needed') AND json_extract(e.detail, '$.item') = c.item_id)`],
    ['compliance answer by nobody, or for a project that is gone (R87)', `SELECT c.item_id FROM project_compliance c WHERE c.by IS NULL OR NOT EXISTS (SELECT 1 FROM members m WHERE m.id = c.by) OR NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = c.project_id)`],
    ['starter task done while its item is to do, or its item done while the task is open (R87)', `SELECT t.title FROM lead_tasks t JOIN projects p ON p.lead_id = t.lead_id WHERE t.compliance_item IS NOT NULL AND ((t.done = 1 AND NOT EXISTS (SELECT 1 FROM project_compliance c WHERE c.project_id = p.id AND c.item_id = t.compliance_item)) OR (t.done = 0 AND EXISTS (SELECT 1 FROM project_compliance c WHERE c.project_id = p.id AND c.item_id = t.compliance_item)))`],
    ['project with two starter tasks for one item (R87)', `SELECT t.compliance_item FROM lead_tasks t WHERE t.compliance_item IS NOT NULL GROUP BY t.lead_id, t.compliance_item HAVING count(*) > 1`],
    ['project with starter tasks and no line saying so (R87)', `SELECT p.number FROM projects p WHERE EXISTS (SELECT 1 FROM lead_tasks t WHERE t.lead_id = p.lead_id AND t.compliance_item IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = p.id AND e.kind = 'project_compliance_tasks')`],
    ['member capacity out of range (R87)', `SELECT name FROM members WHERE project_capacity IS NOT NULL AND (project_capacity < 1 OR project_capacity > 20)`],
    /* (one-home N-07) CaseTrust lives in the studio's one record of registrations — the old switch's row is gone */
    ['the old CaseTrust switch’s row still stored (one-home N-07, R90)', `SELECT key FROM settings WHERE key = 'casetrust'`],
    ['vendor written in another spelling than its directory vendor (one-home N-16, R91)', "SELECT DISTINCT x.vendor FROM (SELECT vendor FROM price_book_items UNION SELECT vendor FROM quote_items) x JOIN vendors v ON lower(trim(v.name)) = lower(trim(x.vendor)) AND v.name <> x.vendor WHERE v.is_active = 1 AND v.merged_into IS NULL"],
    ['stage log moved by someone who is not a member (parity P-13, R92)', `SELECT id FROM stage_logs WHERE moved_by IS NOT NULL AND moved_by NOT IN (SELECT id FROM members)`],
    ['member added by someone who is not a member (parity P-13, R92)', `SELECT id FROM lead_assignees WHERE assigned_by IS NOT NULL AND assigned_by NOT IN (SELECT id FROM members)`],
    ['Won move whose mover is not who won it on the project’s line (parity P-13, R92)', `SELECT s.id FROM stage_logs s JOIN lead_events e ON e.lead_id = s.lead_id AND e.kind = 'project_created' AND abs(e.at - s.created_at) <= 2 AND coalesce(json_extract(e.detail, '$.remade'), 0) = 0 WHERE s.to_stage = 'Won' AND s.from_stage <> 'Won' AND s.moved_by IS NOT NULL AND e.actor_id IS NOT NULL AND s.moved_by <> e.actor_id`],
    /* (simplify Q-10 · S-10, R93 · R94) Order from the quote has its vendors; the approvers' bell rows open Finance › To do */
    ['signed quote line of a trade the directory has, naming nobody (simplify Q-10, R93)', `SELECT q.id FROM quote_items q WHERE q.kind = 'item' AND (q.vendor IS NULL OR q.vendor = '') AND q.quote_id IN (SELECT quote_id FROM projects WHERE quote_id IS NOT NULL AND deleted_at IS NULL) AND EXISTS (SELECT 1 FROM vendors v WHERE v.trade = q.category AND v.merged_into IS NULL AND v.is_active = 1)`],
    ['approver’s bell row not opening To do (simplify S-10, R94)', `SELECT id FROM notifications WHERE kind IN ('po_review','expense_review') AND href NOT LIKE '/company/finance/todo?open=%'`],
    ['client ask whose task or order is still there but not on its message or ticket (simplify round 2, R95)', `SELECT e.id FROM lead_events e WHERE e.kind IN ('project_ask_task','project_ask_vo') AND ((e.kind = 'project_ask_task' AND EXISTS (SELECT 1 FROM lead_tasks t WHERE t.id = json_extract(e.detail, '$.id'))) OR (e.kind = 'project_ask_vo' AND EXISTS (SELECT 1 FROM quotes q WHERE q.id = json_extract(e.detail, '$.id') AND q.kind = 'variation' AND q.deleted_at IS NULL))) AND NOT EXISTS (SELECT 1 FROM project_messages m WHERE json_extract(e.detail, '$.source') = 'message' AND m.id = json_extract(e.detail, '$.ref') AND (CASE e.kind WHEN 'project_ask_task' THEN m.task_id ELSE m.variation_id END) = json_extract(e.detail, '$.id')) AND NOT EXISTS (SELECT 1 FROM project_tickets k WHERE json_extract(e.detail, '$.source') = 'ticket' AND k.id = json_extract(e.detail, '$.ref') AND (CASE e.kind WHEN 'project_ask_task' THEN k.task_id ELSE k.variation_id END) = json_extract(e.detail, '$.id'))`],
    ['Germaine or Michelle without a PayNow (simplify round 2, R96)', `SELECT id FROM members WHERE id IN ('germaine','michelle') AND (paynow IS NULL OR paynow = '')`],
    /* (REG-1360, R89) Finance lives in Company — no stored link to its old address */
    ['bell row pointing at Finance’s old address (R89)', `SELECT id FROM notifications WHERE (href = '/finance' OR href LIKE '/finance/%' OR href LIKE '/finance?%') AND href NOT LIKE '/finance/doc/%'`],
    /* (gaps build J, R88) the 3-D Space Planner: a project's layout carries its project's lead, a live share its layout's lead and one per layout, a
       first open no later than the last, every project's layout its started line, every share its shared line */
    /* (pending modules S07 — a deliberate change of this rule) a layout with a lead and no project is a lead's, started before Won: never a template */
    ['layout whose lead is not its project’s, or a template with a lead (R88)', `SELECT name FROM space_layouts l WHERE (l.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = l.project_id AND p.lead_id = l.lead_id)) OR (l.project_id IS NULL AND l.lead_id IS NOT NULL AND coalesce(l.is_template, 0) = 1)`],
    ['layout share not on its layout’s lead, two live shares on one layout, or opened before it was shared (R88)', `SELECT s.name FROM space_layout_shares s JOIN space_layouts l ON l.id = s.layout_id WHERE coalesce(s.lead_id, '') <> coalesce(l.lead_id, '') OR (s.first_viewed_at IS NOT NULL AND (s.first_viewed_at < s.shared_at OR s.view_count < 1 OR s.last_viewed_at < s.first_viewed_at)) UNION ALL SELECT layout_id FROM space_layout_shares WHERE revoked_at IS NULL GROUP BY layout_id HAVING count(*) > 1`],
    ['layout share snapshot with the studio’s floor plan under it (R88)', `SELECT name FROM space_layout_shares WHERE json_extract(snapshot, '$.underlay') IS NOT NULL`],
    ['project layout with no line for its start, or a live share with no line for its sharing (R88)', `SELECT l.name FROM space_layouts l WHERE l.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = l.project_id AND e.kind IN ('project_layout_created','project_layout_linked') AND json_extract(e.detail, '$.id') = l.id) UNION ALL SELECT s.name FROM space_layout_shares s JOIN space_layouts l ON l.id = s.layout_id WHERE l.project_id IS NOT NULL AND s.revoked_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.project_id = l.project_id AND e.kind = 'project_layout_shared' AND json_extract(e.detail, '$.id') = l.id)`],
    /* (parity map 2026-10-10) the build's records */
    ['template on a project or with a lead (parity map P-J, R97)', `SELECT name FROM space_layouts WHERE is_template = 1 AND (project_id IS NOT NULL OR lead_id IS NOT NULL)`],
    ['layout version kept before its layout began (parity map P-J, R97)', `SELECT v.id FROM space_layout_versions v JOIN space_layouts l ON l.id = v.layout_id WHERE v.created_at < l.created_at`],
    ['share snapshot with a floor plan under one of its levels (parity map P-J, R97)', `SELECT s.name FROM space_layout_shares s, json_each(s.snapshot, '$.levels') e WHERE json_extract(e.value, '$.underlay') IS NOT NULL`],
    ['Ryan’s Blocked stage without an expected restart (parity map CP-064, R98)', `SELECT m.id FROM project_milestones m JOIN projects p ON p.id = m.project_id WHERE p.number = 'P-2026-001' AND m.status = 'blocked' AND m.resume_on IS NULL AND m.deleted_at IS NULL`],
    ['commission ask without its Activity line (parity map FB-057, R99)', `SELECT r.id FROM commission_requests r WHERE NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.kind = 'parity_c_commission_asked' AND json_extract(e.detail, '$.ask') = r.id)`],
    ['team message on a lead that is not its project’s (R100)', `SELECT m.id FROM project_messages m JOIN projects p ON p.id = m.project_id WHERE m.channel = 'team' AND m.lead_id <> p.lead_id`],
    ['client line in a team conversation (R100)', `SELECT id FROM project_messages WHERE channel = 'team' AND author_kind = 'client'`],
    ['lead message on a deleted lead (R100)', `SELECT m.id FROM lead_messages m LEFT JOIN leads l ON l.id = m.lead_id WHERE l.id IS NULL OR l.deleted_at IS NOT NULL`],
    ['days on a quote that is not a variation order (parity map SC-094, R101)', `SELECT number FROM quotes WHERE timeline_days IS NOT NULL AND kind <> 'variation'`],
    ['an Accounting member on a lead or a project (parity map P-I, R102)', `SELECT la.lead_id FROM lead_assignees la JOIN members m ON m.id = la.member_id WHERE m.role = 'Accounting'`],
    /* (S44O — call C6, R164) Marketing hands leads out — never on one itself */
    ['a Marketing member on a lead or a project (S44O, R164)', `SELECT la.lead_id FROM lead_assignees la JOIN members m ON m.id = la.member_id WHERE m.role = 'Marketing'`],
    /* (S44O — call C3, R163) a quote with its client keeps the GST rounding it went out with */
    ['quote with its client and no GST rule stamped (S44O, R163)', `SELECT number FROM quotes WHERE gst_rule IS NULL AND (client_sent_at IS NOT NULL OR status IN ('Confirmed', 'Signed'))`],
    ['GST rule that is neither rate nor line (S44O, R163)', `SELECT number FROM quotes WHERE gst_rule IS NOT NULL AND gst_rule NOT IN ('rate', 'line')`],
    /* (pending modules S01, R103) a member's photo, and nobody else's name, email or phone */
    ['member photo whose picture is gone or someone else’s (S01, R103)', `SELECT id FROM members WHERE color LIKE 'photo:%' AND NOT EXISTS (SELECT 1 FROM studio_pictures p WHERE p.kind = 'member' AND p.member_id = members.id AND p.deleted_at IS NULL AND members.color LIKE 'photo:' || p.id || '|%')`],
    ['member whose About portrait is not their photo (S01, R103)', `SELECT id FROM members WHERE (portal_photo_id IS NOT NULL AND color NOT LIKE 'photo:' || portal_photo_id || '|%') OR (color LIKE 'photo:%|%' AND portal_photo_id IS NULL)`],
    /* (pending modules S02, R104) the client links */
    ['view-only link on a variation order, or with no time it was made (S02, R104)', `SELECT number FROM quotes WHERE view_token IS NOT NULL AND (kind = 'variation' OR view_token_at IS NULL)`],
    ['render link from Files live while its file is not shown, or on another lead (S02, R104)', `SELECT s.id FROM render_share_links s WHERE s.file_id IS NOT NULL AND s.revoked_at IS NULL AND NOT EXISTS (SELECT 1 FROM lead_files f WHERE f.id = s.file_id AND f.lead_id = s.lead_id AND f.shown_to_client_at IS NOT NULL AND f.deleted_at IS NULL)`],
    ['two members with one name, email or phone (S01, R103)', `SELECT lower(name) FROM members GROUP BY lower(name) HAVING count(*) > 1 UNION ALL SELECT lower(email) FROM members WHERE coalesce(email, '') <> '' GROUP BY lower(email) HAVING count(*) > 1 UNION ALL SELECT phone FROM members WHERE coalesce(phone, '') <> '' GROUP BY phone HAVING count(*) > 1`],
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
