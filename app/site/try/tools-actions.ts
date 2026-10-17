'use server'

import { randomUUID } from 'node:crypto'
import { validateLeadForm, type LeadFormErrors } from '@/lib/leads/lead-input'
import { hasErrors } from '@/lib/forms'
import { compareQuotes, refAsYours } from '@/lib/xray/compare'
import { cleanLines } from '@/lib/xray/reading'
import { trialStore } from '@/lib/trial/store'
import { changeWork, isTrialRefusal, readTry, toolsOpen, workspaceForWrite, workspaceNow, type TrialRefusal } from '@/lib/trial/server'
import { cleanGroups, cleanLeadData, readAsLines, readCount, readTotal } from '@/lib/trial/clean'
import { GRANT, LEAD_LIMIT, LEADS_WORDS, QUOTE_WORDS, READ_LIMIT, READ_PRICE, TRIAL_WORDS, XRAY_LIMIT, XRAY_WORDS, workOf,
  type TrialLead, type TrialLeadData, type TrialRead, type TrialReading, type TrialWork } from '@/lib/trial/policy'

/*
 * (pending modules S41b-3 — 1.0's src/app/api/anon/{leads,quote-digitizer,quote-xray}/route.ts) The three tools' server steps for a visitor
 * with no account. Anyone may call them (the site is public): each checks what it is sent again, keeps it in the visitor's own workspace
 * (lib/trial/server.ts — never a studio's database) and answers `{ error, reason }` when it refuses, with the rule. The caps are kept HERE,
 * not in the page (1.0: "a client-side limit on a public endpoint is not a limit"). Long inputs travel inside one object argument.
 */

type Bot = { botToken?: string | null }
const bot = (i: Bot | null | undefined) => (typeof i?.botToken === 'string' ? i.botToken.slice(0, 4096) : null)
const gone = (): TrialRefusal => ({ error: TRIAL_WORDS.couldnt('save it'), reason: 'gone' })
const no = (error: string, reason: TrialRefusal['reason']): TrialRefusal => ({ error, reason })
/** Every step refuses while the tools are switched off on this server (their pages are the site's 404 then; an action is still an address). */
const off = (): TrialRefusal | null => (toolsOpen() ? null : { error: TRIAL_WORDS.off, reason: 'off' })

/** What this browser has made, read fresh (after a write in another tab). Never refuses. */
export async function readTrialWork(): Promise<TrialWork> {
  const row = await workspaceNow()
  return row ? workOf(row.payload, row.expiresAt) : workOf(null)
}

/* ── Leads (1.0's POST /api/anon/leads: three leads, the fourth opens the account gate) ── */

/** Add a lead: the form's own rules checked again here; at three, 1.0's gate. */
export async function addTrialLead(input: Bot & { data: TrialLeadData }): Promise<{ lead: TrialLead; left: number } | { errors: LeadFormErrors } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  const data = cleanLeadData(input?.data)
  const errors = validateLeadForm({ ...data, assignees: [] })
  if (hasErrors(errors)) return { errors }
  const row = await workspaceForWrite(bot(input))
  if (isTrialRefusal(row)) return row
  const lead: TrialLead = { id: randomUUID(), at: Date.now(), data }
  return changeWork(row, (p) => {
    const leads = p.leads?.leads ?? []
    if (leads.length >= LEAD_LIMIT) return no(LEADS_WORDS.gate, 'limit')
    const next = [...leads, lead]
    return { payload: { ...p, leads: { leads: next } }, value: { lead, left: LEAD_LIMIT - next.length } }
  })
}

/** Remove a lead (the row's Remove): what it was and where it sat come back for Undo. */
export async function removeTrialLead(input: { id: string }): Promise<{ lead: TrialLead; index: number } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  const row = await workspaceNow()
  if (!row) return gone()
  return changeWork(row, (p) => {
    const leads = p.leads?.leads ?? []
    const index = leads.findIndex((l) => l.id === input?.id)
    if (index < 0) return gone()
    /* the kept quote is always a client's, and a comparison keeps the lead it was made for: their lead stays while they hold it */
    const quote = p['quote-digitizer']?.documents?.some((d) => d.leadId === input.id) ?? false
    const reading = p['quote-xray']?.xrays?.some((x) => x.leadId === input.id) ?? false
    if (quote || reading) return no(LEADS_WORDS.held(leads[index]!.data.name, quote, reading), 'held')
    return { payload: { ...p, leads: { leads: leads.filter((_, i) => i !== index) } }, value: { lead: leads[index]!, index } }
  })
}

/** Undo of a remove: the lead back where it was — checked again, and only while there is room for it. */
export async function restoreTrialLead(input: { lead: TrialLead; index: number }): Promise<{ ok: true } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  const row = await workspaceNow()
  if (!row) return gone()
  const id = typeof input?.lead?.id === 'string' && /^[0-9a-f-]{36}$/i.test(input.lead.id) ? input.lead.id : null
  const data = cleanLeadData(input?.lead?.data)
  if (!id || hasErrors(validateLeadForm({ ...data, assignees: [] }))) return gone()
  const lead: TrialLead = { id, at: typeof input.lead.at === 'number' && Number.isFinite(input.lead.at) ? input.lead.at : Date.now(), data }
  return changeWork(row, (p) => {
    const leads = p.leads?.leads ?? []
    if (leads.some((l) => l.id === id)) return { payload: p, value: { ok: true as const } }
    if (leads.length >= LEAD_LIMIT) return no(LEADS_WORDS.gate, 'limit')
    const at = Math.max(0, Math.min(leads.length, Number.isInteger(input.index) ? input.index : leads.length))
    return { payload: { ...p, leads: { leads: [...leads.slice(0, at), lead, ...leads.slice(at)] } }, value: { ok: true as const } }
  })
}

/* ── Upload a quote (1.0's POST /api/anon/quote-digitizer: one free read, kept and claimed) ── */

/** Keep the quote the visitor's browser read (Upload a quote's own reader ran there) as one of their leads' quote — the studio's shape: a
    quote is always a client's (Create Quote starts on a lead), so it comes into the studio on that lead. One kept quote (1.0's one read),
    five of the workspace's own allowance. */
export async function keepTrialRead(input: { file: string; source: string; groups: unknown; leadId: string }): Promise<{ read: TrialRead } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  const groups = cleanGroups(input?.groups)
  if (!groups) return { error: TRIAL_WORDS.couldnt('keep the quote'), reason: 'invalid' }
  const leadId = typeof input?.leadId === 'string' ? input.leadId : ''
  if (!leadId) return no(QUOTE_WORDS.needClient, 'invalid')
  if (!(await readTry())) return { error: TRIAL_WORDS.tooFast, reason: 'fast' }
  const row = await workspaceNow()
  /* the client is one of their leads, so the workspace is already theirs — a keep never makes one */
  if (!row || !(row.payload.leads?.leads ?? []).some((l) => l.id === leadId)) return no(QUOTE_WORDS.needClient, 'invalid')
  if ((row.payload['quote-digitizer']?.documents?.length ?? 0) >= READ_LIMIT) return no(QUOTE_WORDS.gate, 'limit')
  /* 1.0's order: the allowance first, given back if the read can't be kept */
  const spent = await trialStore().spend(row.id, READ_PRICE, GRANT, Date.now())
  if (!spent.ok) return spent.reason === 'quota' ? { error: QUOTE_WORDS.gate, reason: 'limit' } : gone()
  const read: TrialRead = { id: randomUUID(), at: Date.now(), file: String(input.file ?? '').trim().slice(0, 160) || 'Quote', source: String(input.source ?? '').trim().slice(0, 120) || 'your file',
    groups, count: readCount(groups), totalMinor: readTotal(groups), leadId }
  const r = await changeWork(row, (p) => {
    const docs = p['quote-digitizer']?.documents ?? []
    if (docs.length >= READ_LIMIT) return no(QUOTE_WORDS.gate, 'limit')
    if (!(p.leads?.leads ?? []).some((l) => l.id === leadId)) return no(QUOTE_WORDS.needClient, 'invalid')
    return { payload: { ...p, 'quote-digitizer': { documents: [...docs, read] } }, value: { read } }
  })
  if (isTrialRefusal(r)) await trialStore().refund(row.id, READ_PRICE)
  return r
}

/** Whose the kept quote is — another of their trial leads (never none: a quote is always a client's). */
export async function setTrialReadLead(input: { leadId: string }): Promise<{ ok: true } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  const row = await workspaceNow()
  if (!row) return gone()
  return changeWork(row, (p) => {
    const doc = p['quote-digitizer']?.documents?.[0]
    if (!doc) return gone()
    const leadId = typeof input?.leadId === 'string' && (p.leads?.leads ?? []).some((l) => l.id === input.leadId) ? input.leadId : null
    if (!leadId) return no(QUOTE_WORDS.needClient, 'invalid')
    return { payload: { ...p, 'quote-digitizer': { ...p['quote-digitizer']!, documents: [{ ...doc, leadId }] } }, value: { ok: true as const } }
  })
}

/* ── Quote X-Ray (1.0's POST /api/anon/quote-xray, 2026-09-21: one free comparison, both quotes uploaded, kept and claimed) ── */

type Side = { lines: unknown; studio?: string | null }
/** Compare their quote with yours — both read in the browser (or yours: the quote read here), checked again, compared by the studio's engine. */
export async function runTrialXray(input: Bot & { otherFile: string; yourFile: string; other: Side; yours: Side | 'read'; leadId?: string | null }): Promise<{ reading: TrialReading } | TrialRefusal> {
  const shut = off(); if (shut) return shut
  if (!(await readTry())) return { error: TRIAL_WORDS.tooFast, reason: 'fast' }
  const theirs = cleanLines(input?.other?.lines)
  if (!theirs) return { error: XRAY_WORDS.unreadable, reason: 'invalid' }
  /* both sides are checked before anything is kept: a comparison that can't run never starts a workspace (nor sets its cookie) */
  const live = await workspaceNow()
  const read = live?.payload['quote-digitizer']?.documents?.[0] ?? null
  const mine = input?.yours === 'read' ? (read ? readAsLines(read) : null) : cleanLines(input?.yours?.lines)
  if (!mine?.length) return { error: XRAY_WORDS.unreadable, reason: 'invalid' }
  /* one quote on both sides is one quote, not two (the studio's rule, E-94) */
  if (JSON.stringify(mine) === JSON.stringify(theirs)) return { error: XRAY_WORDS.same, reason: 'invalid' }
  const row = live ?? await workspaceForWrite(bot(input))
  if (isTrialRefusal(row)) return row
  if ((row.payload['quote-xray']?.xrays?.length ?? 0) >= XRAY_LIMIT) return no(XRAY_WORDS.gate, 'limit')
  const leads = row.payload.leads?.leads ?? []
  const lead = input?.leadId ? leads.find((l) => l.id === input.leadId) ?? null : null
  const otherStudio = (typeof input.other.studio === 'string' && input.other.studio.trim().slice(0, 80)) || 'The other studio'
  const yourFile = input.yours === 'read' && read ? read.file : String(input.yourFile ?? '').trim().slice(0, 120) || 'Your quote'
  const otherFile = String(input.otherFile ?? '').trim().slice(0, 120) || 'Their quote'
  const yours = refAsYours({ key: 'sheet', studio: 'Your studio', lines: mine })
  const result = compareQuotes(yours, { key: 'sheet', studio: otherStudio, lines: theirs }, { yourLabel: yourFile.replace(/\.[a-z0-9]+$/i, ''), yourStudio: 'Your studio', clientName: lead?.data.name ?? null })
  const spent = await trialStore().spend(row.id, READ_PRICE, GRANT, Date.now())
  if (!spent.ok) return spent.reason === 'quota' ? { error: XRAY_WORDS.gate, reason: 'limit' } : gone()
  const reading: TrialReading = { id: randomUUID(), at: Date.now(), otherFile, yourFile, otherStudio, yours, theirs, leadId: lead?.id ?? null, result }
  const r = await changeWork(row, (p) => {
    const xs = p['quote-xray']?.xrays ?? []
    if (xs.length >= XRAY_LIMIT) return no(XRAY_WORDS.gate, 'limit')
    return { payload: { ...p, 'quote-xray': { xrays: [...xs, reading] } }, value: { reading } }
  })
  if (isTrialRefusal(r)) await trialStore().refund(row.id, READ_PRICE)
  return r
}
