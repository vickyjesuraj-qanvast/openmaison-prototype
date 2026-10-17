'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { commissionRequests, commissionRules, members } from '@/lib/db/schema'
import { runsStudio } from '@/lib/leads/assign-policy'
import { seesBooks } from '@/lib/settings/roles'
import { moneySummaryOf } from '@/lib/projects/money-queries'
import { forCosts, isRefusal, type Refusal } from '@/lib/finance/server'
import { dropCommissionEvent, logCommissionEvent, ruleRecord } from '@/lib/finance/books'
import {
  COMMISSION_RULE_RULE, MAX_RATE_BP, SCOPE_LABEL, isBasis, ruleFor, ruleWords, scopeOf, validRule,
  type CommissionBasis, type CommissionRuleRecord, type RuleStage,
} from '@/lib/finance/commission'

/*
 * (parity map, FB-042 · FB-043 — 1.0 B-76…B-82 · B-127…B-134 · G-180, `project-create-drawer.tsx` › Commission Structure,
 * `milestone-payment-structure-dialog.tsx` › Trigger commission) One project's commission, from the project (its ⋮ › Commission…, the
 * completed project's "Set commission for …" task): **the studio's rule** (no rule of its own), **a rate for this project** (Owners and Admins —
 * how it is worked out, the rate, and optionally the payment stages that pay it, each at its own rate), or **no commission** on it (a project rule
 * of basis none — the one thing Settings could not say). A Designer reads the rule that applies to them and asks for a different rate (today's
 * ask, `askCommissionRate` in ./books-actions.ts). Every change is a new rule version from today (earlier payments keep what they earned), writes
 * its Activity line (FB-057) and answers with an Undo. Refusals are `{ error: <the rule> }`.
 */

const NOT_ON_IT = 'Only the project’s team, Owners and Admins read its commission'
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function touch(projectId: string) {
  revalidatePath('/company/finance', 'layout')
  revalidatePath('/company/reports', 'layout')
  revalidatePath('/settings')
  revalidatePath(`/projects/${projectId}`, 'layout')
}

export type ProjectCommissionData = {
  project: { id: string; number: string; name: string; stage: string }
  viewer: { id: string; runs: boolean; onTeam: boolean }
  /** The studio's rule today, as words. */
  studio: { words: string; pays: boolean }
  /** This project's own rule (no member) in force today — a rate, or No commission; null = the studio's rule applies. */
  own: { basis: CommissionBasis; rateBp: number; fixedMinor: number; stages: RuleStage[] | null; words: string; since: number } | null
  /** A member's rate on this project (Owners and Admins read every one; a member, their own). */
  others: { memberId: string; name: string; words: string }[]
  /** The rule that applies to the viewer on this project today (a team member's read) — null when they are not on it. */
  yours: { words: string; scope: string } | null
  /** The payment stages (the signed quote's Payment Schedule, or the project's own split) a rule may pay on. */
  stages: { ref: string; name: string; pct: number; /** (S44O — row 297) a fixed fee first */ fixedMinor?: number | null }[]
  /** The viewer's open ask on this project, else their newest answered one. */
  ask: { id: string; words: string; status: 'open' | 'approved' | 'declined' | 'withdrawn'; createdAt: number; answeredAt: number | null; note: string | null } | null
}

/** The dialog's read — whoever may see the project's money (its team, their Managers, Owners and Admins). */
export async function readProjectCommission(projectId: string): Promise<ProjectCommissionData | Refusal> {
  const c = await forCosts(typeof projectId === 'string' ? projectId : '')
  if (isRefusal(c)) return c.error === 'This project is not there any more' ? c : { error: NOT_ON_IT }
  const runs = runsStudio(c.viewer.role)
  const sees = seesBooks(c.viewer.role)   // (parity map, FB-114) Accounting reads every member's rate here; only Owners and Admins change them (`runs`)
  const onTeam = c.team.includes(c.viewer.id)
  const now = Date.now()
  const [ruleRows, people, asks, money] = await Promise.all([
    db.select().from(commissionRules).where(isNull(commissionRules.endedAt)).orderBy(asc(commissionRules.createdAt)),
    db.select({ id: members.id, name: members.name }).from(members),
    db.select().from(commissionRequests).where(and(eq(commissionRequests.projectId, c.p.id), eq(commissionRequests.memberId, c.viewer.id))).orderBy(asc(commissionRequests.createdAt)),
    moneySummaryOf(c.p, now),
  ])
  const rules = ruleRows.map(ruleRecord)
  const studio = rules.filter((r) => !r.memberId && !r.projectId).sort((a, b) => b.fromDay - a.fromDay || b.createdAt - a.createdAt)[0] ?? null
  const own = rules.filter((r) => !r.memberId && r.projectId === c.p.id).sort((a, b) => b.fromDay - a.fromDay || b.createdAt - a.createdAt)[0] ?? null
  const named = (id: string) => people.find((m) => m.id === id)?.name ?? 'A member'
  const others = rules.filter((r) => r.memberId && r.projectId === c.p.id && (sees || r.memberId === c.viewer.id)).map((r) => ({ memberId: r.memberId!, name: named(r.memberId!), words: ruleWords(r) }))
  const mine = onTeam ? ruleFor(rules, c.viewer.id, c.p.id, now) : null
  const open = asks.find((a) => a.status === 'open')
  const last = open ?? [...asks].filter((a) => a.status === 'approved' || a.status === 'declined').sort((a, b) => (b.answeredAt?.getTime() ?? 0) - (a.answeredAt?.getTime() ?? 0))[0]
  return {
    project: { id: c.p.id, number: c.p.number, name: c.p.name, stage: c.p.stage },
    viewer: { id: c.viewer.id, runs, onTeam },
    studio: { words: ruleWords(studio), pays: !!studio && studio.basis !== 'none' },
    own: own ? { basis: own.basis, rateBp: own.rateBp, fixedMinor: own.fixedMinor, stages: own.stages ?? null, words: ruleWords(own), since: own.fromDay } : null,
    others,
    yours: onTeam ? { words: ruleWords(mine), scope: mine ? SCOPE_LABEL[scopeOf(mine)] : 'No rule' } : null,
    stages: money.stages.map((s) => ({ ref: s.ref, name: s.name, pct: s.pct, fixedMinor: s.fixedMinor ?? null })),
    ask: last ? {
      id: last.id, words: ruleWords({ basis: isBasis(last.basis) ? last.basis : 'payments', rateBp: last.approvedRateBp ?? last.rateBp, fixedMinor: last.approvedFixedMinor ?? last.fixedMinor }),
      status: last.status === 'approved' || last.status === 'declined' || last.status === 'withdrawn' ? last.status : 'open',
      createdAt: last.createdAt.getTime(), answeredAt: last.answeredAt?.getTime() ?? null, note: last.answerNote,
    } : null,
  }
}

export type ProjectCommissionInput = {
  /** studio = no rule of its own (the studio's applies) · rate = a rate for this project · none = no commission on it */
  mode: 'studio' | 'rate' | 'none'
  basis?: CommissionBasis; rateBp?: number; fixedMinor?: number
  /** (FB-043) the payment stages that pay it, each with its own rate (bp) or null for the rule's; null / [] = every payment */
  stages?: RuleStage[] | null
}
export type ProjectCommissionUndo = { projectId: string; added: string | null; ended: string[]; eventId: string | null }

/** Set how commission works on one project — Owners and Admins. From today; earlier payments keep what they earned. */
export async function setProjectCommission(projectId: string, i: ProjectCommissionInput): Promise<{ sentence: string; undo: ProjectCommissionUndo } | Refusal> {
  const c = await forCosts(typeof projectId === 'string' ? projectId : '')
  if (isRefusal(c)) return c
  if (!runsStudio(c.viewer.role)) return { error: COMMISSION_RULE_RULE }
  const mode = i?.mode
  if (mode !== 'studio' && mode !== 'rate' && mode !== 'none') return { error: 'Pick how commission works on this project' }
  const basis: CommissionBasis = mode === 'none' ? 'none' : isBasis(i.basis) && i.basis !== 'none' ? i.basis : 'payments'
  const rateBp = Math.round(Number(i.rateBp) || 0), fixedMinor = Math.round(Number(i.fixedMinor) || 0)
  if (mode === 'rate') { const why = validRule({ basis, rateBp, fixedMinor }); if (why) return { error: why } }
  /* (FB-043) the stages: only on a % rule, each one the project's, each own rate within the house limit */
  let stages: RuleStage[] | null = null
  if (mode === 'rate' && (basis === 'payments' || basis === 'profit') && i.stages?.length) {
    const money = await moneySummaryOf(c.p)
    const refs = new Set(money.stages.map((s) => s.ref))
    const seen = new Set<string>()
    stages = []
    for (const x of i.stages) {
      if (!x || typeof x.ref !== 'string' || !refs.has(x.ref) || seen.has(x.ref)) return { error: 'Pick the payment stages again — the schedule changed' }
      seen.add(x.ref)
      const own = x.rateBp == null ? null : Math.round(Number(x.rateBp))
      if (own !== null && !(own > 0 && own <= MAX_RATE_BP)) return { error: `Enter each stage’s rate between 0.01% and ${MAX_RATE_BP / 100}%, or leave it blank` }
      stages.push({ ref: x.ref, rateBp: own })
    }
  }
  const inForceHere = await db.select().from(commissionRules).where(and(isNull(commissionRules.memberId), eq(commissionRules.projectId, c.p.id), isNull(commissionRules.endedAt)))
  const before: CommissionRuleRecord | null = inForceHere.length ? ruleRecord(inForceHere.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]!) : null
  const fromWords = before ? ruleWords(before) : 'The studio’s rule'
  if (mode === 'studio' && !before) return { error: 'It already follows the studio’s rule' }
  const now = new Date()
  const ended = inForceHere.map((r) => r.id)
  if (ended.length) await db.update(commissionRules).set({ endedAt: now, endedBy: c.viewer.id }).where(inArray(commissionRules.id, ended))
  let added: string | null = null
  if (mode !== 'studio') {
    added = randomUUID()
    await db.insert(commissionRules).values({ id: added, memberId: null, projectId: c.p.id, basis, rateBp: basis === 'payments' || basis === 'profit' ? rateBp : 0,
      fixedMinor: basis === 'fixed' ? fixedMinor : 0, fromDay: today(), requestId: null, createdBy: c.viewer.id, createdAt: now, stagesJson: stages?.length ? JSON.stringify(stages) : null })
  }
  const toWords = mode === 'studio' ? 'The studio’s rule' : ruleWords({ basis, rateBp, fixedMinor, stages })
  const eventId = await logCommissionEvent(c.p.id, 'parity_c_commission_rule', { from: fromWords, to: toWords, removed: mode === 'studio' }, c.viewer.id)
  touch(c.p.id)
  const sentence = mode === 'studio' ? `${c.p.name} follows the studio’s rule from today` : mode === 'none' ? `No commission on ${c.p.name} from today` : `${c.p.name}: ${toWords} from today`
  return { sentence, undo: { projectId: c.p.id, added, ended, eventId } }
}
/** Undo, right after: the version it started goes, the ones it ended are back, its Activity line goes. */
export async function undoProjectCommission(u: ProjectCommissionUndo): Promise<{ ok: true } | Refusal> {
  const c = await forCosts(typeof u?.projectId === 'string' ? u.projectId : '')
  if (isRefusal(c)) return c
  if (!runsStudio(c.viewer.role)) return { error: COMMISSION_RULE_RULE }
  if (u.added) await db.delete(commissionRules).where(and(eq(commissionRules.id, u.added), eq(commissionRules.projectId, c.p.id)))
  if (u.ended?.length) await db.update(commissionRules).set({ endedAt: null, endedBy: null }).where(and(inArray(commissionRules.id, u.ended), eq(commissionRules.projectId, c.p.id)))
  await dropCommissionEvent(u.eventId)
  touch(c.p.id)
  return { ok: true }
}
