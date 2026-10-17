/**
 * (pending modules S06 — card `held:finance`, her "build all of them" 2026-10-11; 1.0's Accounts › Expense Categories) **The studio's own
 * expense categories.** 2.0 shipped a fixed list (F1-Q11); a studio now keeps its own on Settings › Finance › Money out — add one, rename it
 * (the expenses logged under it follow, and its Xero account with them), move it, remove it (the expenses already logged keep it; new ones can't
 * pick it — 1.0's rule). Reports group by them; Xero maps each to an account. Pure and client-safe.
 *
 * 1.0 also marked each category Overhead or Project; in 2.0 an expense says that itself (its Project field, or the studio's overhead), so the
 * mark had no job left and is not carried (it only labelled the picker).
 */
import { EXPENSE_CATEGORIES } from './model'
import { listedAs } from '@/lib/settings/trades'   // (S44Z — S44P's M14 words) a name already in the list names the entry it matches

export const EXPENSE_CATEGORIES_KEY = 'expense_categories'
/** The list a studio starts with — the eleven F1 shipped, so a studio that never opens the card loses nothing. */
export const DEFAULT_EXPENSE_CATEGORIES: readonly string[] = EXPENSE_CATEGORIES
export const CATEGORY_NAME_MAX = 40
export const CATEGORIES_MAX = 40
/** A name as it is kept: trimmed, one space between words, at most 40 letters. */
export const cleanCategory = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, CATEGORY_NAME_MAX) : '')
const key = (s: string) => s.trim().toLowerCase()

/** The studio's list — its own once it saved one, else the eleven; names kept once each (case-blind), at most 40. */
export function parseExpenseCategories(v: unknown): { list: string[]; managed: boolean } {
  if (!Array.isArray(v)) return { list: [...DEFAULT_EXPENSE_CATEGORIES], managed: false }
  const seen = new Set<string>(), list: string[] = []
  for (const x of v) { const n = cleanCategory(x); if (n && !seen.has(key(n))) { seen.add(key(n)); list.push(n) } }
  return list.length ? { list: list.slice(0, CATEGORIES_MAX), managed: true } : { list: [...DEFAULT_EXPENSE_CATEGORIES], managed: false }
}
/** Whether `name` is on the list (case-blind) — and the list's own spelling of it. */
export const categoryIn = (list: readonly string[], name: string) => list.find((c) => key(c) === key(name)) ?? null
/** Why a new or renamed category can't be saved, or null. `except` is the one being renamed. */
export function categoryProblem(list: readonly string[], name: string, except?: string | null): string | null {
  const n = cleanCategory(name)
  if (!n) return 'Give the category a name'
  const hit = categoryIn(list, n)
  if (hit && (!except || key(hit) !== key(except))) return listedAs([hit], n) ?? `${hit} is already in the list`   // (S44Z) names the entry it matches, as Trades, Units and the lead lists do
  if (!except && list.length >= CATEGORIES_MAX) return `Up to ${CATEGORIES_MAX} categories`
  return null
}
/** What an expense may be saved under: a category on the list — or, when it is changed, the one it already carries (a category removed since
    stays on the expenses logged under it). */
export const categoryAllowed = (list: readonly string[], name: string, current?: string | null) => !!categoryIn(list, name) || (!!current && key(current) === key(name))
