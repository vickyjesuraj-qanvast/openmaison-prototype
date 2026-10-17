import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { members } from '@/lib/db/schema'
import { deliverDerived, releaseHeldMessages } from '@/lib/notifications/delivery'
import { fetchFeed } from '@/lib/notifications/queries'
import { sendDueSummaries } from '@/lib/notifications/summary-server'
import { tellPaymentsDue } from '@/lib/portal/payment-due'
import { raiseDueRepeats } from '@/lib/finance/repeats-server'
import { ensurePeriod } from '@/lib/credits/ledger'
import { accountingIsStandIn, autoPushXero, fetchXeroSettings } from '@/lib/finance/xero-server'
import { feedsAreStandIn, pullFeeds } from './feeds'

/*
 * (pending modules S34 — card api:message-delivery-providers, "The production five-minute sweep that runs deliverDerived and
 * releaseHeldMessages for every member; today these run when someone opens the bell"; the steps' notes after S06 · S18 · S22 · S24 · S25 ·
 * S27; 1.0's vercel.json crons) EVERY TIMED JOB, ONCE, FOR A SCHEDULER TO CALL. The prototype has no scheduler, so each job already runs
 * lazily where it is read (the bell, Sent messages, Money out, the credits) — a scheduler calling these changes nothing a person sees, it
 * only makes the timed things happen on time with nobody opening a page. Every job is idempotent (the outbox's keys, the summaries' day key,
 * the repeats' own series, the credits month's compare-and-set), so a run twice, or two at once on two servers, does each thing once; one
 * job's failure is its line in the report, never the others'.
 *
 *   messages   — every 5 min (1.0's notification-scheduled): held client mail whose Undo window passed, the failed messages' retries, every
 *                active member's derived reminders by email / WhatsApp (a task due, a milestone late, an invoice overdue — 1.0's
 *                invoice-overdue cron is one of them), the client's "A payment is due today".
 *   summaries  — hourly (1.0's notification-digest): the members' daily summaries, from 8 AM the server's time.
 *   repeats    — hourly: repeating expenses whose day came (Money out).
 *   credits    — hourly: the AI credits month rolls over, a trial ends, a lapse after grace (1.0's cron and Dodo's events, applied by rule).
 *   feeds      — hourly: OpenMaison's and Qanvast's feeds (lib/services/feeds.ts) — only once a real source is plugged in.
 *   accounting — every 5 min (1.0's accounting-sync): Push automatically to Xero — only once a real Xero is plugged in (the prototype pushes on
 *                Sync now and after a money step).
 *   trial-sweep — daily (1.0's anon-sweep, 06:00): the website's no-account workspaces past their 7 days are deleted, oldest first, a batch
 *                at a time (lib/trial/store.ts — a workspace is dead the moment it expires; this tidies; 1.0 purged each one's files first,
 *                the prototype's trial keeps none).
 *   trial-files — daily (1.0's anon-storage-gc, 08:00): the room the deleted workspaces left is given back (1.0 reclaimed the anonymous
 *                files whose workspace was gone; the prototype's trial keeps no file — the photo and the quotes are read in the browser — so
 *                what is left is the store's own freed space).
 * PRODUCTION: call `/api/cron/run` every five minutes with `Authorization: Bearer <CRON_SECRET>` — the jobs whose turn it is not yet answer
 * fast (each is a read when there is nothing to do) — or call each job's own address on its own rhythm (`CRON_ROUTES`).
 */

export type JobKey = 'messages' | 'summaries' | 'repeats' | 'credits' | 'feeds' | 'accounting' | 'trial-sweep' | 'trial-files'
export const JOB_KEYS: readonly JobKey[] = ['messages', 'summaries', 'repeats', 'credits', 'feeds', 'accounting', 'trial-sweep', 'trial-files']
export type JobResult = { ran: number } | { skipped: string } | { error: string }
export type SweepReport = { at: number; jobs: Partial<Record<JobKey, JobResult>> }

/** 1.0's cron addresses (vercel.json) and 2.0's own, each with the jobs it runs. */
export const CRON_ROUTES: Record<string, { jobs: readonly JobKey[]; every: string }> = {
  run: { jobs: JOB_KEYS, every: '*/5 * * * *' },
  'notification-scheduled': { jobs: ['messages'], every: '*/5 * * * *' },
  'notification-digest': { jobs: ['summaries'], every: '0 * * * *' },
  'accounting-sync': { jobs: ['accounting'], every: '*/5 * * * *' },
  repeats: { jobs: ['repeats', 'credits'], every: '0 * * * *' },
  feeds: { jobs: ['feeds'], every: '0 * * * *' },
  /* (pending modules S41b-3) 1.0's two daily jobs for the website's no-account workspaces, at 1.0's hours */
  'anon-sweep': { jobs: ['trial-sweep'], every: '0 6 * * *' },
  'anon-storage-gc': { jobs: ['trial-files'], every: '0 8 * * *' },
}

async function messagesJob(now: Date): Promise<JobResult> {
  let ran = await releaseHeldMessages(now)
  const team = await db.select({ id: members.id, role: members.role }).from(members).where(eq(members.isActive, true))
  for (const m of team) {
    try { ran += await deliverDerived(m.id, (await fetchFeed(m.id, m.role)).rows) } catch (e) { console.error(`[sweep] ${m.id}’s reminders:`, e instanceof Error ? e.message : e) }
  }
  ran += await tellPaymentsDue(now.getTime())
  return { ran }
}
async function accountingJob(): Promise<JobResult> {
  if (accountingIsStandIn()) return { skipped: 'Xero is simulated on this server — it pushes on Sync now and after a money step' }
  const s = await fetchXeroSettings()
  if (!s.connected || !s.auto) return { skipped: 'Xero isn’t connected with Push automatically on' }
  await autoPushXero(null)
  return { ran: 1 }
}
async function feedsJob(now: Date): Promise<JobResult> {
  if (feedsAreStandIn()) return { skipped: 'No feed source on this server — the demo’s sample rows stay as they are' }
  const r = await pullFeeds(now.getTime())
  const errors = Object.entries(r).filter(([, v]) => typeof v === 'object').map(([k, v]) => `${k}: ${(v as { error: string }).error}`)
  if (errors.length) return { error: errors.join(' · ') }
  return { ran: Object.values(r).reduce<number>((n, v) => n + (typeof v === 'number' ? v : 0), 0) }
}

/* (pending modules S41b-3 — 1.0's src/app/api/cron/anon-sweep · anon-storage-gc) one batch of 300 a run, oldest first (a bad day's backlog
   spreads over runs); a workspace deleted twice is deleted once */
const TRIAL_BATCH = 300
async function trialSweepJob(now: Date): Promise<JobResult> {
  const { trialStore } = await import('@/lib/trial/store')
  const store = trialStore()
  if (!store.ready()) return { skipped: 'No trial workspaces on this server — the website’s no-account tools need a store' }
  let ran = 0
  for (const id of await store.expired(now.getTime(), TRIAL_BATCH)) { await store.remove(id); ran++ }
  return { ran }
}
async function trialFilesJob(): Promise<JobResult> {
  const { trialStore } = await import('@/lib/trial/store')
  const store = trialStore()
  if (!store.ready()) return { skipped: 'No trial workspaces on this server — the website’s no-account tools need a store' }
  return { ran: (await store.reclaim()).reclaimed }
}

const RUN: Record<JobKey, (now: Date) => Promise<JobResult>> = {
  messages: messagesJob,
  summaries: async (now) => ({ ran: await sendDueSummaries(now) }),
  repeats: async (now) => ({ ran: await raiseDueRepeats(now.getTime()) }),
  credits: async (now) => { await ensurePeriod(now.getTime()); return { ran: 1 } },
  feeds: feedsJob,
  accounting: async () => accountingJob(),
  'trial-sweep': trialSweepJob,
  'trial-files': async () => trialFilesJob(),
}

/* one run at a time in this server — a scheduler that fires again while a slow run is still going waits for it (each job is idempotent across
   servers anyway) */
let running: Promise<SweepReport> | null = null
export function runJobs(keys: readonly JobKey[] = JOB_KEYS, now = new Date()): Promise<SweepReport> {
  if (running) return running.then(() => runJobs(keys, now))
  const run = (async () => {
    const report: SweepReport = { at: now.getTime(), jobs: {} }
    for (const k of keys) {
      try { report.jobs[k] = await RUN[k](now) } catch (e) { report.jobs[k] = { error: (e instanceof Error ? e.message : String(e)).slice(0, 300) } }
    }
    return report
  })().finally(() => { if (running === run) running = null })
  running = run
  return run
}
