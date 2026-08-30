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
