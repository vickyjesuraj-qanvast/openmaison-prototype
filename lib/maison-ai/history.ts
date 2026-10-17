'use server'

import { fetchViewer } from '@/lib/leads/visibility'
import { clearHistoryOf, historyOf, recordAsked, restoreHistoryOf, type Asked } from './history-store'
import { cleanQuestion } from './intents'

/*
 * (pending modules S10) Maison AI's Recent — the signed-in member's own questions (lib/maison-ai/history-store.ts). Read when the sheet opens;
 * Clear hides them all with Undo (the house rule for a remove: one sentence and Undo). A member only ever reads and clears their own.
 */

export async function fetchAskHistory(): Promise<Asked[]> {
  const viewer = await fetchViewer()
  return historyOf(viewer.id)
}

export async function clearAskHistory(): Promise<{ ids: string[] }> {
  const viewer = await fetchViewer()
  return { ids: await clearHistoryOf(viewer.id) }
}

export async function restoreAskHistory(input: { ids: string[] }): Promise<{ ok: true } | { error: string }> {
  const ids = Array.isArray(input?.ids) ? input.ids.filter((x): x is string => typeof x === 'string').slice(0, 50) : []
  const viewer = await fetchViewer()
  await restoreHistoryOf(viewer.id, ids)
  return { ok: true }
}

/** A question the sheet answered from the page's own suggestions (no server answer) — kept in Recent as one typed in the box is. */
export async function rememberAsk(input: { question: string; title?: string | null }): Promise<void> {
  const question = cleanQuestion(input?.question)
  if (!question) return
  const viewer = await fetchViewer()
  await recordAsked(viewer.id, { question, title: typeof input?.title === 'string' ? input.title.slice(0, 200) : null, path: null, projectId: null, milestoneId: null })
}
