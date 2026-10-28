'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { createTask, setTasksDone, undoTasksDone } from '@/app/leads/tasks-actions'
import { setFollowUp } from '@/app/leads/actions'
import { stopExpenseRepeat, undoStopExpenseRepeat } from '@/app/finance/cost-actions'
import { createVariationOrder } from '@/app/projects/money-actions'
import { recordQuoteReminder, undoQuoteReminder } from '@/lib/maison-ai/remind-actions'
import { waLink } from '@/lib/portal/model'
import { confirmLink } from '@/lib/quotes/confirm'
import { reminderMessage } from '@/lib/quotes/next-step'
import { withFrom } from '@/lib/nav'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S16) unsaved Company / Settings edits ask before the move (REG-791)
import type { MaisonPlan, MaisonPlanDo, MaisonProposal, MaisonReceipt } from '@/lib/maison-ai'

/** (the Dashboard redesigned 2026-10-26, lane D4) A quote's reminder in the quote screen's own words (lib/quotes/next-step.ts), with the link
    the client already has — built here, where the link's address is known. */
export const reminderOf = (d: Extract<MaisonPlanDo, { kind: 'remind_quote' }>) =>
  reminderMessage({ clientFirst: d.first, studio: d.studio, number: d.number, link: confirmLink(d.token), variation: d.variation, validUntil: d.validUntil })

/**
 * (pending modules S10 — the cards' question "may the assistant change records itself, or only propose a change the member confirms?" taken as
 * recommended: only propose) What a change the Ask box proposes does when its one button is pressed: the HOUSE action that makes the same
 * change by hand — a task (`createTask`), a lead's follow-up (`setFollowUp`), a task ticked done (`setTasksDone`, with its Undo), a repeat
 * stopped (`stopExpenseRepeat`, with its Undo), a Draft variation order (`createVariationOrder`, opened in its editor), a WhatsApp opened with
 * the drafted words (the studio sends it). Each action's own rule and
 * refusal apply; the answer is the page's house sentence. Nothing here is metered.
 * (the Dashboard redesigned 2026-10-26 — his marks P-01 · P-10 · lane D4) …a client reminded about a quote (`remind_quote`: WhatsApp opens on the
 * press with the quote's own reminder, and it is kept on their Activity — `recordQuoteReminder`, with its Undo). And where Maison AI is docked,
 * what a change did comes back as a **receipt** in the conversation (`onReceipt`: the same house sentence, its Undo and its door) instead of a
 * snackbar; the sheet everywhere else keeps the snackbar, as before.
 */
export function usePlanRunner(opts?: { onReceipt?: (r: MaisonReceipt) => void }): (plan: MaisonPlan) => MaisonProposal {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  const onReceipt = opts?.onReceipt
  return useCallback((plan: MaisonPlan): MaisonProposal => ({
    title: plan.title, text: plan.do.kind === 'remind_quote' ? `“${reminderOf(plan.do)}”` : plan.text, lines: plan.lines, confirm: plan.confirm,
    run: async () => {
      const d = plan.do
      const here = `${window.location.pathname}${window.location.search}`
      switch (d.kind) {
        case 'whatsapp': {
          window.open(waLink(d.phone, d.text), '_blank', 'noopener')   // opened on the press — the studio reads it there and sends it
          onReceipt?.({ text: 'WhatsApp opened with your message', meta: 'Send it from WhatsApp — nothing was sent from here' })
          return true
        }
        case 'remind_quote': {
          window.open(waLink(d.phone, reminderOf(d)), '_blank', 'noopener')   // on the press, before anything waits (REG-534: wa.me opens on the press)
          const r = await recordQuoteReminder({ quoteId: d.quoteId }).catch(() => ({ error: 'the connection dropped' }))
          const open = { label: `Open ${d.number}`, href: withFrom(`/quotes/${d.quoteId}`, here) }
          if ('error' in r) {
            if (onReceipt) onReceipt({ text: 'Reminder opened in WhatsApp', meta: `${d.client} · ${d.number} — couldn’t keep it on the Activity: ${r.error}`, open })
            else snackbar({ message: couldnt('keep the reminder on the Activity', r.error) })
            return true
          }
          const undo = async () => { const u = await undoQuoteReminder({ eventId: r.eventId }).catch(() => ({ error: 'the connection dropped' })); router.refresh(); return 'error' in u ? u.error : null }
          if (onReceipt) onReceipt({ text: 'Reminder opened in WhatsApp', meta: `${d.client} · ${d.number}`, undo: { run: undo, done: `The reminder is off ${d.first}’s Activity` }, open })
          else snackbar({ key: 'maison-remind', message: `Reminder to ${d.first} opened in WhatsApp`, actionLabel: 'Undo', onAction: () => { void undo().then((e) => snackbar({ message: e ? couldnt('take the reminder back', e) : 'The reminder is off the Activity' })) } })
          router.refresh()
          return true
        }
        case 'task': {
          try {
            const id = d.followUp && d.leadId && d.dueAt
              ? await setFollowUp(d.leadId, { title: d.title, dueAt: d.dueAt })
              : await createTask(d.leadId, d.title, { dueAt: d.dueAt ? new Date(d.dueAt) : null, assignees: d.memberIds, description: 'Added by Maison AI from your question.' })
            const href = withFrom(`/tasks?open=${encodeURIComponent(id)}`, here)
            /* the lead and project pages' own Maison AI words (use-lead-maison.ts · use-project-maison.ts) */
            if (onReceipt) onReceipt({ text: `Task added — ${d.title}`, open: { label: 'Open the task', href } })
            else snackbar({ key: 'maison-task', message: `Task added — ${d.title}`, actionLabel: 'Open', onAction: () => leaveThen(() => router.push(href)) })
            router.refresh()
            return true
          } catch (e) { snackbar({ message: couldnt('add the task', refusalOf(e)) }); return false }
        }
        case 'task_done': {
          let res: Awaited<ReturnType<typeof setTasksDone>> = { changed: [], eventIds: [], stamps: [] }
          const ok = await run('complete the task', async () => { res = await setTasksDone([d.taskId], true) }, undefined, { guard: `done:${d.taskId}` })
          if (!ok) return false
          if (!res.changed.length) { if (onReceipt) onReceipt({ text: 'The task is already completed', meta: d.title }); else snackbar({ message: 'The task is already completed' }); return true }
          const back = res
          const reopen = () => run('reopen the task', () => undoTasksDone({ taskIds: back.changed, done: true, eventIds: back.eventIds, stamps: back.stamps }), onReceipt ? undefined : 'Task reopened', { refresh: true })
          /* the Tasks tab's own words and Undo (lead-tasks.tsx `setDone`) */
          if (onReceipt) onReceipt({ text: 'Task completed', meta: d.title, undo: { run: async () => ((await reopen()) ? null : 'it couldn’t be reopened'), done: 'Task reopened' } })
          else snackbar({ message: 'Task completed', actionLabel: 'Undo', onAction: () => { void reopen() } })
          router.refresh()
          return true
        }
        case 'variation': {
          /* Money's own New ▾ › Variation order: a Draft, opened in the quote editor — it reaches the client only when it is sent */
          let made: { id: string; number: string } | null = null
          const ok = await run('start the variation order', async () => { const r = await createVariationOrder(d.projectId); if ('error' in r) return r; made = r; return null })
          const m = made as { id: string; number: string } | null
          if (!ok || !m) return false
          leaveThen(() => router.push(withFrom(`/quotes/${m.id}`, here)))
          return true
        }
        case 'stop_repeat': {
          let made: { title: string; undo: Parameters<typeof undoStopExpenseRepeat>[0] } | null = null
          const ok = await run('stop the repeat', async () => { const r = await stopExpenseRepeat(d.expenseId); if ('error' in r) return r; made = { title: r.title, undo: r.undo }; return null })
          const m = made as { title: string; undo: Parameters<typeof undoStopExpenseRepeat>[0] } | null
          if (!ok || !m) return false
          const again = () => run('start it again', () => undoStopExpenseRepeat(m.undo), onReceipt ? undefined : `“${m.title}” repeats again`, { refresh: true })
          /* the expense row's own words and Undo (components/finance/use-costs.tsx `stopRepeat`) */
          if (onReceipt) onReceipt({ text: `“${m.title}” won’t repeat any more`, meta: 'What was logged stays', undo: { run: async () => ((await again()) ? null : 'it couldn’t be started again'), done: `“${m.title}” repeats again` } })
          else snackbar({ message: `“${m.title}” won’t repeat any more — what was logged stays`, actionLabel: 'Undo', onAction: () => { void again() } })
          router.refresh()
          return true
        }
      }
    },
  }), [router, snackbar, run, onReceipt])
}
