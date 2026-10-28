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
  /** (pending modules S10 — "charts drawn inside the answer") the row's share of the answer's largest figure, 0…1, drawn as a bar under it */ share?: number
  /** (the Dashboard redesigned 2026-10-26, P-10 — "a list you can act on: rows with their verb, the same as Needs you") the row's one verb, a
      quiet button at its end: it opens (`href`) or asks (`ask`) — the words still open the row's record */
  verb?: MaisonDoor }

/* ── (the Dashboard redesigned 2026-10-26 — his marks P-10 · lane D4; 1.0's answer components A-5 · A-6 · A-7 · A-8 · A-11 · A-12 · A-13 ·
   A-14, D-1.0-home-and-chat.md §3.A) **Answers as cards you can use**, additive: an answer may carry, beside its words and rows, a few figures,
   one record, a small chart, a timeline, a comparison and its doors — drawn on the house pieces wherever Maison AI answers (the docked field on
   the Dashboard, the sheet everywhere else; components/maison-ai/answer-cards.tsx). Every value comes from the studio's records by rule, as
   the answer's words do; every door opens with the way back. A receipt is what a change Maison AI ran did, with its Undo (client-made). ── */

/** A door: one press to the place (`href`), a question asked (`ask`), or a call / WhatsApp (`tel:` · `wa.me` in `href`, `channel` drawn as its
    glyph — the only verbs that carry one, his § 2). Doors that share a `group` fold into "{group} · n ▾" (1.0's grouped doors). */
export type MaisonDoor = { label: string; href?: string; ask?: string; channel?: 'call' | 'whatsapp'; group?: string; testId?: string }
/** A figure: the house number tile (StatTile) — its caption, the figure, the line under it, and where a press goes. `grade` only where the
    figure's own report grades it. */
export type MaisonFigure = { key: string; label: string; value: string; help?: string; grade?: 'good' | 'warn' | 'bad'; href?: string; ask?: string }
/** A record: a lead or a project as one card — its name, its line (property · budget · source), the facts known, what to focus on. */
export type MaisonRecord = { kind: 'lead' | 'project'; name: string; line?: string; facts?: { label: string; value: string }[]; points?: string[]; note?: string }
/** A small chart — bars over a few periods (1.0's "Chart Engine" bar, A-12): each bar's words, its value in the figure's words, its share of
    the largest (the bar's height). The figure is in the words; the bar only shows it. */
export type MaisonChart = { label: string; bars: { key: string; label: string; value: string; share: number }[] }
/** A timeline: what happened on a record, newest first, a type glyph each (the house timeline, components/om/timeline.tsx). */
export type MaisonTimelineItem = { id: string; day: string; time: string; icon: string; text: string }
/** A comparison: this beside that, row by row (1.0's `compare_entities`, A-14). */
export type MaisonCompare = { left: string; right: string; rows: { label: string; left: string; right: string }[]; note?: string }

/** (parity map, TD-107 · FB-118) `chips` — questions to ask next (what Maison AI answers, when nothing matched); `link` — the one button to the
    record or the report the answer comes from.
    (pending modules S10) `plan` — a change the Ask box proposes: the sheet shows what will happen with one confirm, and the confirm runs it
    through the page's own action, with Undo (components/shell/maison-plans.ts). Nothing is written until it is pressed.
    (the Dashboard redesigned 2026-10-26, P-10) `figures` · `record` · `chart` · `timeline` · `compare` · `doors` — the answer's cards. */
export type MaisonAnswer = { title: string; text?: string; rows?: MaisonRow[]; chips?: string[]; link?: { label: string; href: string }; plan?: MaisonPlan
  figures?: MaisonFigure[]; record?: MaisonRecord; chart?: MaisonChart; timeline?: MaisonTimelineItem[]; compare?: MaisonCompare; doors?: MaisonDoor[] }

/** (the Dashboard redesigned 2026-10-26, P-10 · D §4.4) What a change Maison AI ran did — "Reminder opened in WhatsApp · Ryan D’Souza · VO-2" —
    with the house action's own Undo where it has one, and a door to the record. Client-made, from the run (components/shell/maison-plans.ts). */
export type MaisonReceipt = { text: string; meta?: string
  /** `run` resolves null once it landed, else the refusal's words; `done` is what the receipt then says */
  undo?: { label?: string; run: () => Promise<string | null>; done: string }; open?: { label: string; href: string } }

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
  /** (the Dashboard redesigned 2026-10-26, lane D4 — "Remind Ryan about VO-2") the quote's own reminder, opened in WhatsApp with its link (the
      quote screen's Remind words, lib/quotes/next-step.ts `reminderMessage`), and kept on the client's Activity so the team sees who nudged them */
  | { kind: 'remind_quote'; quoteId: string; phone: string; number: string; client: string; first: string; studio: string; token: string; variation: boolean; validUntil: string | null }
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

/* ── (the Dashboard redesigned 2026-10-26 — his marks P-01 · Q-02 · Q-09 · lane D4) **Maison AI, docked.** On the Dashboard the field docked at
   the page's foot IS Maison AI (components/maison-ai/dock/maison-dock.tsx): while it is mounted the shell's floating button and its sheet step
   aside, and a question asked from the page (`askMaisonAi`) is the dock's to answer. One flag, counted, so a page over a page never leaves it
   stuck. ── */
let docked = 0
const dockListeners = new Set<() => void>()
const subscribeDock = (cb: () => void) => { dockListeners.add(cb); return () => { dockListeners.delete(cb) } }
/** Whether Maison AI is docked on the page in front of you (the Dashboard's field). */
export function useMaisonDocked(): boolean {
  return useSyncExternalStore(subscribeDock, () => docked > 0, () => false)
}
/** The dock says it is there for as long as it is mounted. */
export function useDockPresence() {
  useEffect(() => {
    docked += 1; dockListeners.forEach((l) => l())
    return () => { docked = Math.max(0, docked - 1); dockListeners.forEach((l) => l()) }
  }, [])
}

/** (Q-09) The key that asks Maison AI — ⌘J / Ctrl J (lib/keys/registry.ts `maison`): the dock's field on the Dashboard, the sheet's Ask box on
    every other page. Its guard, as ⌘K's: a dialog that holds the keyboard keeps it, unless it is Maison AI's own sheet. */
export const isAskKey = (e: KeyboardEvent) => (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'j'
export const keyboardHeldElsewhere = (): boolean => !!Array.from(document.querySelectorAll('[aria-modal="true"]')).find((d) => !d.querySelector('[data-maison-ask-field], [data-testid="maison-ask"]'))
