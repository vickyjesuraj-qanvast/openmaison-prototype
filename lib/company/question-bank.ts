import type { QuestionType } from '@/lib/leads/question-model'

/* (REG-612, parity Q-21) The studio's question bank — 1.0's six question types, and how each lands on a lead's questionnaire card. Pure. */
/** (pending modules S17) The bank card's help — the page and its ghost read this one sentence, so they can't drift apart. */
/* (the calm UI build 2026-10-27 — 5-30 · W-163 · W-210) one line, "client" as everywhere in the studio app; the rest one press away (BANK_HOW) */
export const BANK_HELP = 'The questions every new lead starts with. Ask the client sends them to the client’s portal.'
export const BANK_HOW = 'New leads start with the active questions; an older lead adds them from its Questionnaire tab. Ask the client sends the lead’s questionnaire to the client’s portal, where they answer it.'
export const BANK_TYPES = ['text', 'yes_no', 'number', 'single_select', 'multi_select', 'date'] as const
export type BankType = (typeof BANK_TYPES)[number]
/** (the calm UI build 2026-10-27 — W-400) how a studio says them — display words only; the stored types are the keys */
export const BANK_TYPE_LABELS: Record<BankType, string> = { text: 'Short answer', yes_no: 'Yes or no', number: 'Number', single_select: 'Pick one', multi_select: 'Pick several', date: 'Date' }
export const isBankType = (t: string): t is BankType => (BANK_TYPES as readonly string[]).includes(t)
export const needsOptions = (t: BankType): boolean => t === 'single_select' || t === 'multi_select'
/** Yes / No and a single select both answer on the lead's single card, with their own options; a multi select on the multi card. */
export const toLeadType = (t: BankType): QuestionType => (t === 'yes_no' || t === 'single_select' ? 'single' : t === 'multi_select' ? 'multi' : t)
export const leadOptions = (t: BankType, options: string[]): string[] => (t === 'yes_no' ? ['Yes', 'No'] : needsOptions(t) ? options : [])
export const parseBankOptions = (s: string | null | undefined): string[] => { try { const v = JSON.parse(s ?? '[]'); return Array.isArray(v) ? v.map(String).filter(Boolean) : [] } catch { return [] } }
