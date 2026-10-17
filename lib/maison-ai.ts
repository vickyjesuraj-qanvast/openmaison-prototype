'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * Maison AI's context store (REG-507). The FAB and its sheet live in the app shell (components/shell/maison-ai.tsx) so every
 * page in the shell opens the same sheet; a page with scripted suggestions — the listing, Lead Details, Qanvast Ops › Leads —
 * registers them here, and the listing also says when the FAB should ride above the review banner (`raised`).
 *
 * (gaps build I, I-Q16 — 1.0's mAIson bot acted, J-228) A suggestion is its words (it still answers coming soon) or an action the sheet
 * runs: **run** (open a record, a view), **answer** (a short list in the sheet — each row opens its record; given, or fetched when pressed),
 * **propose** (what it will do, in the sheet, with one button — the press runs the page's existing server action, its rule and its refusal).
 * Nothing is metered (Q-30); every answer comes from the studio's own records. The store keeps the words; the sheet asks for the live
 * suggestion when pressed, so an action never runs on stale records.
 * (pending modules S10 — card held:maison-ai, "words-only suggestions that answer Coming soon · make each act or drop it") No suggestion is
 * words alone any more: a plain string that is still pressed is ASKED, as if typed in the Ask box, and answered by rule from the records.
 */
export type MaisonRow = { id: string; label: string; meta?: string; href?: string; run?: () => void
  /** (pending modules S10) a press asks this question — "which lead?" answered by picking one */ ask?: string
  /** (pending modules S10 — "charts drawn inside the answer") the row's share of the answer's largest figure, 0…1, drawn as a bar under it */ share?: number }
/** (parity map, TD-107 · FB-118) `chips` — questions to ask next (what Maison AI answers, when nothing matched); `link` — the one button to the
    record or the report the answer comes from.
    (pending modules S10) `plan` — a change the Ask box proposes: the sheet shows what will happen with one confirm, and the confirm runs it
    through the page's own action, with Undo (components/shell/maison-plans.ts). Nothing is written until it is pressed. */
export type MaisonAnswer = { title: string; text?: string; rows?: MaisonRow[]; chips?: string[]; link?: { label: string; href: string }; plan?: MaisonPlan }

/**
 * (pending modules S10 — 1.0's mAIson wrote leads, tasks and payments the moment it was asked, with no confirm step; the cards' question "may the
 * assistant change records itself, or only propose a change the member confirms?" taken as recommended: only propose) A change the Ask box can
 * propose — serialisable, so the server builds it from the records and the sheet runs it through the house action that does it by hand (the
 * action's own rule and refusal apply). `lines` say what will happen; `confirm` is the one button.
 */
export type MaisonPlanDo =
  /** a task — for the asker (`memberIds`), or a lead's follow-up for its members (`followUp`) — on a lead or the studio's own */
  | { kind: 'task'; title: string; dueAt: string | null; leadId: string | null; memberIds: string[]; followUp: boolean }
  /** a WhatsApp message drafted from the record — it opens in WhatsApp on the press; the studio sends it */
  | { kind: 'whatsapp'; phone: string; text: string }
  /** one of the asker's open tasks, ticked done */
  | { kind: 'task_done'; taskId: string; title: string }
  /** a repeating expense stopped — nothing more is logged, what was logged stays */
  | { kind: 'stop_repeat'; expenseId: string; title: string }
  /** a Draft variation order started on a project (Money's New ▾ › Variation order — it opens in the quote editor) */
  | { kind: 'variation'; projectId: string }
export type MaisonPlan = { title: string; text: string; lines?: string[]; confirm: string; do: MaisonPlanDo }
export type MaisonProposal = { title: string; text: string; lines?: string[]; confirm: string
  /** Runs the action; resolves true once it landed (the page says what happened, with its Undo), false when it was refused. */
  run: () => Promise<boolean> }
export type MaisonAction = { label: string; run?: () => void; answer?: MaisonAnswer | (() => Promise<MaisonAnswer>)
  /** (pending modules S10) a press asks this question, as the Ask box would — a page's words that the Ask box answers from the records */
  ask?: string
  /** A proposal, or one read when pressed — which may come back as an answer instead (nothing to do, or the rule says no). */
  propose?: MaisonProposal | (() => Promise<MaisonProposal | MaisonAnswer>) }
export const isProposal = (x: MaisonProposal | MaisonAnswer): x is MaisonProposal => 'confirm' in x
export type MaisonSuggestion = string | MaisonAction
export const suggestionLabel = (s: MaisonSuggestion) => (typeof s === 'string' ? s : s.label)

export type MaisonAiContext = { suggestions: string[]; raised: boolean; resolve: (label: string) => MaisonSuggestion | undefined }

const EMPTY: MaisonAiContext = { suggestions: [], raised: false, resolve: () => undefined }

/** (pending modules S10) The live suggestions of a page that hosts its own sheet (the editors), resolved by their words — the shell's store does
    the same for the pages inside the shell. The list is kept in a ref for the press, so a press never runs on stale records. */
export function useMaisonList(suggestions: readonly MaisonSuggestion[]): { labels: string[]; resolve: (label: string) => MaisonSuggestion | undefined } {
  const key = JSON.stringify(suggestions.map(suggestionLabel))
  const latest = useRef<readonly MaisonSuggestion[]>(suggestions)
  useEffect(() => { latest.current = suggestions })
  const [labels, setLabels] = useState<string[]>(() => JSON.parse(key) as string[])
  const [seen, setSeen] = useState(key)
  if (seen !== key) { setSeen(key); setLabels(JSON.parse(key) as string[]) }
  const resolve = useCallback((label: string) => latest.current.find((s) => suggestionLabel(s) === label), [])
  return { labels, resolve }
}
let state: MaisonAiContext = EMPTY
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
const set = (next: MaisonAiContext) => { state = next; listeners.forEach((l) => l()) }

/** What the shell's FAB and sheet show right now. */
export function useMaisonAiState(): MaisonAiContext {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY)
}

/* ── (parity map 2026-10-10, SC-060 — 1.0's milestone drawer › Ask mAIson: "Help me with the {milestone} milestone…") A question asked from
   somewhere on the page: the sheet opens with it asked — the milestone panel's "Ask Maison AI about this" passes the milestone. The shell's sheet
   (components/shell/maison-ai.tsx) reads it; the answer comes from the records (lib/maison-ai/answer.ts). ── */
export type MaisonAsk = { text: string; milestoneId?: string | null; projectId?: string | null; n: number }
let asked: MaisonAsk | null = null
let askSeq = 0
const askListeners = new Set<() => void>()
const subscribeAsk = (cb: () => void) => { askListeners.add(cb); return () => { askListeners.delete(cb) } }
/** Opens Maison AI with this question asked — `milestoneId` when it is about one milestone (its panel's "Ask Maison AI about this"). */
export function askMaisonAi(q: { text: string; milestoneId?: string | null; projectId?: string | null }): void {
  asked = { text: q.text, milestoneId: q.milestoneId ?? null, projectId: q.projectId ?? null, n: ++askSeq }
  askListeners.forEach((l) => l())
}
/** The newest question asked from the page (the sheet answers each `n` once). */
export function useMaisonAsk(): MaisonAsk | null {
  return useSyncExternalStore(subscribeAsk, () => asked, () => null)
}

/** A page's scripted suggestions (and whether the FAB is raised) for as long as the page is mounted. */
export function useMaisonAi(suggestions: readonly MaisonSuggestion[], raised = false) {
  const key = JSON.stringify(suggestions.map(suggestionLabel))   // by value: the pages build the list in render
  const latest = useRef<readonly MaisonSuggestion[]>(suggestions)
  useEffect(() => { latest.current = suggestions })   // the live list, for the press — never read in render
  useEffect(() => {
    set({ suggestions: JSON.parse(key) as string[], raised, resolve: (label) => latest.current.find((s) => suggestionLabel(s) === label) })
    return () => set(EMPTY)
  }, [key, raised])
}
