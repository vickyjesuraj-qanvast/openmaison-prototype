import type { QuestionType } from '@/lib/leads/question-model'

/* (REG-612, parity Q-21) The studio's question bank — 1.0's six question types, and how each lands on a lead's questionnaire card. Pure. */
export const BANK_TYPES = ['text', 'yes_no', 'number', 'single_select', 'multi_select', 'date'] as const
export type BankType = (typeof BANK_TYPES)[number]
export const BANK_TYPE_LABELS: Record<BankType, string> = { text: 'Text', yes_no: 'Yes / No', number: 'Number', single_select: 'Single select', multi_select: 'Multi select', date: 'Date' }
export const isBankType = (t: string): t is BankType => (BANK_TYPES as readonly string[]).includes(t)
export const needsOptions = (t: BankType): boolean => t === 'single_select' || t === 'multi_select'
/** Yes / No and a single select both answer on the lead's single card, with their own options; a multi select on the multi card. */
export const toLeadType = (t: BankType): QuestionType => (t === 'yes_no' || t === 'single_select' ? 'single' : t === 'multi_select' ? 'multi' : t)
export const leadOptions = (t: BankType, options: string[]): string[] => (t === 'yes_no' ? ['Yes', 'No'] : needsOptions(t) ? options : [])
export const parseBankOptions = (s: string | null | undefined): string[] => { try { const v = JSON.parse(s ?? '[]'); return Array.isArray(v) ? v.map(String).filter(Boolean) : [] } catch { return [] } }
