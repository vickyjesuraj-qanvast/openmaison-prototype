import 'server-only'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, isNotNull, isNull, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, members, projects, settings, type Expense } from '@/lib/db/schema'
import { logProjectEvent } from '@/lib/projects/events'
import { completedBlock } from '@/lib/projects/handover-model'
import { notify } from '@/lib/notifications/emit'
import { studioRunnerIds } from '@/lib/notifications/queries'
import { displayDate } from '@/lib/format'
import { money2 } from '@/lib/quotes/math'
import { COST_RULES_KEY, DEFAULT_COST_RULES, expenseWaits, parseCostRules } from './rules'
import { REPEAT_CATCH_UP, dayOf, isRepeatEvery, repeatAfter, repeatWords, type RepeatEvery } from './repeats'
import { todoHref } from './sections'

/*
 * (pending modules S06 — card `held:finance`) A repeating expense is logged by rule when its day comes — lazily, whenever the studio's money out is
 * read (`loadCostRecords`, the rail's count, Xero's list), the way AI credits roll their month (lib/credits/ledger.ts `ensurePeriod`): no
 * scheduler. Each day's expense is unique on (its series, its day), so two reads at once never log a day twice — only the read that made it
 * writes its line and its bell — and `repeat_next` then moves on only where it still holds that day (compare-and-set). Every one logged is a full record: the
 * series' maker as its maker, its own Activity line on a project, the approvers' bell when the studio's rule makes it wait.
 *
 * What a logged one copies: the series' latest expense before that day (so a change to the last one carries on) — amount, GST, category,
 * vendor, who paid, what it was for, the note, the issuing entity; never the receipts. Whether it waits: the studio's expense rule for its maker,
 * as if they had logged it (a maker who left the studio → it waits). A project handed over stops its repeats (the money is closed).
 */
/* libsql answers "database is locked" at once, with no wait (lib/notifications/delivery.ts says so): each write here is ONE autocommit
   statement, tried again a few times — never a transaction, which a read running beside it on the same connection can't let commit. */
const locked = (e: unknown): boolean => {
  for (let x: unknown = e, depth = 0; x && typeof x === 'object' && depth < 4; x = (x as { cause?: unknown }).cause, depth++) {
    if (/SQLITE_BUSY|SQLITE_LOCKED|database is locked/i.test(`${String((x as { code?: unknown }).code ?? '')} ${String((x as { message?: unknown }).message ?? '')}`)) return true
  }
  return false
}
async function written<T>(write: () => Promise<T>): Promise<T> {
  for (let n = 0; ; n++) {
    try { return await write() } catch (e) {
      if (n >= 8 || !locked(e)) throw e
      await new Promise((r) => setTimeout(r, 25 * (n + 1)))
    }
  }
}

async function costRules() {
  const [row] = await db.select().from(settings).where(eq(settings.key, COST_RULES_KEY)).limit(1)
  if (!row) return DEFAULT_COST_RULES
  try { return parseCostRules(JSON.parse(row.value)) } catch { return DEFAULT_COST_RULES }
}

/** Log every repeating expense whose day has come; returns how many were logged. Never throws (a failed read logs nothing and the next read
    tries again). Reads at once in this server share one run — the rail's count and the page ask together. */
let inflight: Promise<number> | null = null
export function raiseDueRepeats(now = Date.now()): Promise<number> {
  if (inflight) return inflight
  const run = raise(now).catch((e) => { console.error('[repeats] could not log the repeating expenses', e); return 0 }).finally(() => { if (inflight === run) inflight = null })
  inflight = run
  return run
}

async function raise(now: number): Promise<number> {
  const today = dayOf(now)
  const roots = await db.select().from(expenses).where(and(isNotNull(expenses.repeatEvery), isNotNull(expenses.repeatNext), lte(expenses.repeatNext, new Date(today)),
    isNull(expenses.repeatStoppedAt), isNull(expenses.deletedAt), isNull(expenses.repeatOf)))
  if (!roots.length) return 0
  const rules = await costRules()
  let logged = 0
  for (const root of roots) {
    const every = root.repeatEvery
    if (!isRepeatEvery(every) || !root.repeatNext) continue
    /* the project: gone → nothing more; handed over → the repeat stops (its money is closed), said on its Activity */
    const project = root.projectId ? (await db.select().from(projects).where(eq(projects.id, root.projectId)).limit(1))[0] ?? null : null
    if (root.projectId && (!project || project.deletedAt)) continue
    if (project && completedBlock(project.stage, 'money')) {
      const stop = await written(() => db.update(expenses).set({ repeatStoppedAt: new Date(now), repeatStoppedBy: null, repeatNext: null }).where(and(eq(expenses.id, root.id), isNull(expenses.repeatStoppedAt))))
      if (stop.rowsAffected) await written(() => logProjectEvent(db, project.leadId, project.id, 'project_expense_repeat', { name: project.name, id: root.id, title: root.description, stopped: true, why: 'completed' }, { actorId: null }))
      continue
    }
    const [maker] = root.createdBy ? await db.select({ id: members.id, name: members.name, role: members.role, active: members.isActive }).from(members).where(eq(members.id, root.createdBy)).limit(1) : []
    const waits = !maker || maker.active === false || expenseWaits(maker.role, rules)
    let cur = root.repeatNext.getTime()
    for (let step = 0; step < REPEAT_CATCH_UP && cur <= today; step++) {
      const series = await db.select().from(expenses).where(and(or(eq(expenses.id, root.id), eq(expenses.repeatOf, root.id)), isNull(expenses.deletedAt))).orderBy(asc(expenses.spentOn))
      const template = [...series].reverse().find((e) => e.spentOn.getTime() < cur) ?? root
      const after = repeatAfter(root.spentOn.getTime(), every, cur)
      const id = randomUUID()
      /* the day first: unique on (series, day), so only one read ever makes it — and only that one writes its Activity line and its bell */
      const made = await written(() => insertRepeat({ id, root, template, day: cur, waits, now }))
      if (made) {
        logged++
        await afterLogged({ id, root, template, day: cur, every, waits, project, maker: maker ?? null })
      }
      /* then the series moves on — only where it still holds this day (compare-and-set); another read that moved it on, or a stop, ends here */
      const claim = await written(() => db.update(expenses).set({ repeatNext: new Date(after) }).where(and(eq(expenses.id, root.id), eq(expenses.repeatNext, new Date(cur)), isNull(expenses.repeatStoppedAt))))
      if (!claim.rowsAffected) break
      cur = after
    }
  }
  return logged
}

/** The day's expense, copied from the series' latest before it; false when the day was already there (the unique index held). */
async function insertRepeat(o: { id: string; root: Expense; template: Expense; day: number; waits: boolean; now: number }): Promise<boolean> {
  const t = o.template
  const rows = await db.insert(expenses).values({
    id: o.id, projectId: o.root.projectId, vendorId: t.vendorId, category: t.category, description: t.description, amountMinor: t.amountMinor, gstMinor: t.gstMinor,
    spentOn: new Date(o.day), paidBy: t.paidBy, claimantId: t.paidBy === 'member' ? t.claimantId : null, note: t.note, issuingEntity: t.issuingEntity,
    /* one that counts at once is its maker's own answer, as when they log one themselves (app/finance/cost-actions.ts saveExpense) */
    status: o.waits ? 'pending' : 'approved', reviewedAt: o.waits ? null : new Date(o.now), reviewedBy: o.waits ? null : o.root.createdBy, reviewNote: null,
    createdBy: o.root.createdBy, createdAt: new Date(o.now), repeatOf: o.root.id,
  }).onConflictDoNothing().returning({ id: expenses.id })
  return rows.length > 0
}

async function afterLogged(o: { id: string; root: Expense; template: Expense; day: number; every: RepeatEvery; waits: boolean; project: typeof projects.$inferSelect | null; maker: { id: string; name: string } | null }) {
  const amount = money2(o.template.amountMinor)
  const claim = o.template.paidBy === 'member' && o.template.claimantId ? (await db.select({ name: members.name }).from(members).where(eq(members.id, o.template.claimantId)).limit(1))[0]?.name ?? null : null
  if (o.project) {
    const project = o.project
    await written(() => logProjectEvent(db, project.leadId, project.id, 'project_expense_logged', { name: project.name, id: o.id, title: o.template.description, to: amount, category: o.template.category, claim, repeat: repeatWords(o.every), day: displayDate(new Date(o.day)) }, { actorId: null }))
  }
  if (o.waits) {
    const to = await studioRunnerIds()
    await written(() => notify('expense_review', to, {
      title: `${o.maker?.name ?? 'A member'}’s repeating expense of ${amount} is logged for ${displayDate(new Date(o.day))}`,   // invented copy (pending modules S06)
      body: `${o.template.description}${o.project ? ` · ${o.project.name}` : ' · Studio overhead'}`, href: todoHref(o.id), leadId: o.project?.leadId ?? null, actorId: null,
      fields: { '{expense}': o.template.description, '{amount}': amount },
    }))
  }
}
