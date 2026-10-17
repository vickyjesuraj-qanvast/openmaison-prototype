'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf, useRun } from '@/components/leads/tasks/use-run'
import { createTask, setTasksDone, undoTasksDone } from '@/app/leads/tasks-actions'
import { setFollowUp } from '@/app/leads/actions'
import { stopExpenseRepeat, undoStopExpenseRepeat } from '@/app/finance/cost-actions'
import { createVariationOrder } from '@/app/projects/money-actions'
import { waLink } from '@/lib/portal/model'
import { withFrom } from '@/lib/nav'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S16) unsaved Company / Settings edits ask before the move (REG-791)
import type { MaisonPlan, MaisonProposal } from '@/lib/maison-ai'

/**
 * (pending modules S10 — the cards' question "may the assistant change records itself, or only propose a change the member confirms?" taken as
 * recommended: only propose) What a change the Ask box proposes does when its one button is pressed: the HOUSE action that makes the same
 * change by hand — a task (`createTask`), a lead's follow-up (`setFollowUp`), a task ticked done (`setTasksDone`, with its Undo), a repeat
 * stopped (`stopExpenseRepeat`, with its Undo), a Draft variation order (`createVariationOrder`, opened in its editor), a WhatsApp opened with
 * the drafted words (the studio sends it). Each action's own rule and
 * refusal apply; the answer is the page's house sentence. Nothing here is metered.
 */
export function usePlanRunner(): (plan: MaisonPlan) => MaisonProposal {
  const router = useRouter()
  const snackbar = useSnackbar()
  const { run } = useRun()
  return useCallback((plan: MaisonPlan): MaisonProposal => ({
    title: plan.title, text: plan.text, lines: plan.lines, confirm: plan.confirm,
    run: async () => {
      const d = plan.do
      const here = `${window.location.pathname}${window.location.search}`
      switch (d.kind) {
        case 'whatsapp': {
          window.open(waLink(d.phone, d.text), '_blank', 'noopener')   // opened on the press — the studio reads it there and sends it
          return true
        }
        case 'task': {
          try {
            const id = d.followUp && d.leadId && d.dueAt
              ? await setFollowUp(d.leadId, { title: d.title, dueAt: d.dueAt })
              : await createTask(d.leadId, d.title, { dueAt: d.dueAt ? new Date(d.dueAt) : null, assignees: d.memberIds, description: 'Added by Maison AI from your question.' })
            /* the lead and project pages' own Maison AI words (use-lead-maison.ts · use-project-maison.ts) */
            snackbar({ key: 'maison-task', message: `Task added — ${d.title}`, actionLabel: 'Open', onAction: () => leaveThen(() => router.push(withFrom(`/tasks?open=${encodeURIComponent(id)}`, here))) })
            router.refresh()
            return true
          } catch (e) { snackbar({ message: couldnt('add the task', refusalOf(e)) }); return false }
        }
        case 'task_done': {
          let res: Awaited<ReturnType<typeof setTasksDone>> = { changed: [], eventIds: [], stamps: [] }
          const ok = await run('complete the task', async () => { res = await setTasksDone([d.taskId], true) }, undefined, { guard: `done:${d.taskId}` })
          if (!ok) return false
          if (!res.changed.length) { snackbar({ message: 'The task is already completed' }); return true }
          const back = res
          /* the Tasks tab's own words and Undo (lead-tasks.tsx `setDone`) */
          snackbar({ message: 'Task completed', actionLabel: 'Undo', onAction: () => { void run('reopen the task', () => undoTasksDone({ taskIds: back.changed, done: true, eventIds: back.eventIds, stamps: back.stamps }), 'Task reopened', { refresh: true }) } })
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
          /* the expense row's own words and Undo (components/finance/use-costs.tsx `stopRepeat`) */
          snackbar({ message: `“${m.title}” won’t repeat any more — what was logged stays`, actionLabel: 'Undo', onAction: () => { void run('start it again', () => undoStopExpenseRepeat(m.undo), `“${m.title}” repeats again`, { refresh: true }) } })
          router.refresh()
          return true
        }
      }
    },
  }), [router, snackbar, run])
}
