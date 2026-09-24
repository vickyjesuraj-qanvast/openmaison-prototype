import { MSG } from '@/lib/forms'
import { displayDate, parseInputDate } from '@/lib/format'

/* (REG-612, parity Q-25) Custom lead fields — 1.0's `lead_custom_fields` types, the value's shape and its display. Pure. */
export const CUSTOM_FIELD_TYPES = ['text', 'number', 'date', 'dropdown', 'multi_select'] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]
export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = { text: 'Text', number: 'Number', date: 'Date', dropdown: 'Dropdown', multi_select: 'Multi select' }
export const isCustomFieldType = (t: string): t is CustomFieldType => (CUSTOM_FIELD_TYPES as readonly string[]).includes(t)
export const fieldNeedsOptions = (t: CustomFieldType): boolean => t === 'dropdown' || t === 'multi_select'
export type CustomFieldDef = { id: string; label: string; fieldType: CustomFieldType; options: string[]; isRequired: boolean; orderIndex: number; isActive: boolean }
/** A lead's values by field id: a string, or a string[] for a multi select. */
export type CustomValues = Record<string, string | string[]>
export const parseFieldOptions = (s: string | null | undefined): string[] => { try { const v = JSON.parse(s ?? '[]'); return Array.isArray(v) ? v.map(String).filter(Boolean) : [] } catch { return [] } }
export function parseFieldValue(s: string | null | undefined): string | string[] | null { if (!s) return null; try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v : String(v) } catch { return s } }
/** What the Overview prints: a multi select joined, a date as the app prints dates, nothing as "—". */
export function displayCustomValue(def: CustomFieldDef, value: string | string[] | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (!value.trim()) return '—'
  if (def.fieldType === 'date') { const d = parseInputDate(value); return d ? displayDate(d) : value }
  return value
}
/** The form's rule per field: required fields need a value; numbers are digits; dates come from the picker. */
export function validateCustomValue(def: CustomFieldDef, value: string | string[] | undefined): string | undefined {
  const empty = value === undefined || (Array.isArray(value) ? value.length === 0 : !value.trim())
  if (empty) return def.isRequired ? (def.fieldType === 'dropdown' || def.fieldType === 'multi_select' || def.fieldType === 'date' ? MSG.choose : MSG.required) : undefined
  if (def.fieldType === 'number' && typeof value === 'string' && !/^\d+$/.test(value.trim())) return MSG.number
  if (def.fieldType === 'date' && typeof value === 'string' && !parseInputDate(value)) return MSG.date
  return undefined
}
