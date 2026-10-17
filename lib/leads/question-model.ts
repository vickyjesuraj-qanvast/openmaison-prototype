import type { Question } from '@/lib/db/schema'
import { MSG } from '@/lib/forms'

/* Lead Details › Questionnaire (931-46769) — pure model shared by the cards, the summary and the actions. */

export const QUESTION_TYPES = ['text', 'number', 'single', 'multi', 'date'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]
/** Type labels as the Question Types sub-section names them (931:47053). */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = { text: 'Text', number: 'Number', single: 'Single select (yes/no)', multi: 'Multi select', date: 'Date' }

export const parseOptions = (q: Pick<Question, 'options'>): string[] => { try { const v = JSON.parse(q.options ?? '[]'); return Array.isArray(v) ? v.map(String) : [] } catch { return [] } }
export const parseMulti = (answer: string | null): string[] => { try { const v = JSON.parse(answer ?? '[]'); return Array.isArray(v) ? v.map(String) : [] } catch { return answer ? [answer] : [] } }

/** What the answered card prints after "A: " (931:47009). */
export function answerText(q: Pick<Question, 'type' | 'answer'>): string {
  if (q.answer === null || q.answer === undefined) return ''
  if (q.type === 'multi') return parseMulti(q.answer).join(', ')
  return q.answer
}

/** Overview card counts (858:25077) derived from the questions — null when the lead has none. */
export function summarise(qs: Pick<Question, 'answeredBy'>[]): { total: number; clientAnswered: number; studioAnswered: number } | null {
  if (!qs.length) return null
  return { total: qs.length, clientAnswered: qs.filter((q) => q.answeredBy === 'client').length, studioAnswered: qs.filter((q) => q.answeredBy === 'studio').length }
}

/** Save rules: every type needs a value; numbers are digits (REG-150); dates come from the picker (REG-119). */
export function validateAnswer(type: string, value: string | string[]): string | undefined {
  if (Array.isArray(value)) return value.length ? undefined : MSG.choose
  if (!value.trim()) return type === 'single' || type === 'date' ? MSG.choose : MSG.required
  if (type === 'number' && !/^\d+$/.test(value.trim())) return MSG.required
  return undefined
}

/* ── (gaps build D, item 9 — 1.0 M-170 · M-173 · M-175) the answer history and the ask's pace ────────────────────────────────────── */

/** One change to an answer, as the card's clock lists it (the raw stored answers — `answerText` words them). */
export type AnswerChange = { before: string | null; after: string | null; byKind: 'studio' | 'client'; byName: string | null; at: number }
/** A stored answer in words, whatever its type (a multi answer is its picks joined). */
export const answerWords = (raw: string | null): string => {
  if (raw === null || raw === '') return 'No answer'
  if (raw.startsWith('[')) { try { const v = JSON.parse(raw); if (Array.isArray(v)) return v.map(String).join(', ') || 'No answer' } catch { /* plain text */ } }
  return raw
}
/** How long after an ask the client may be asked again — 1.0's 5-minute throttle on *Ask the client* (M-173). */
export const ASK_AGAIN_MS = 5 * 60_000
/** Why an ask is refused now, or null — "Asked 2 minutes ago — ask again after 3:45 pm". */
export function askAgainBlock(lastAskedAt: number | null, now: number): string | null {
  if (lastAskedAt === null || now - lastAskedAt >= ASK_AGAIN_MS) return null
  const mins = Math.max(1, Math.round((now - lastAskedAt) / 60_000))
  const at = new Date(lastAskedAt + ASK_AGAIN_MS).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  return `Asked ${mins === 1 ? 'a minute' : `${mins} minutes`} ago — ask again after ${at}`
}
