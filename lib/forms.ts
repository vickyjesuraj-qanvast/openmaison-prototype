/**
 * Inline validation vocabulary (user 2026-08-29: every field validates, errors show inline
 * under the field in the DS Text Field error state — 836:23125). Copy is invented; REG-118.
 */
export const MSG = {
  required: 'This field is required',
  date: 'Enter a valid date (d/m/yyyy)',
  dateTime: 'Choose a date and time',
  email: 'Enter a valid email address',
  phone: 'Enter a valid 8-digit Singapore number',   // (REG-547) 6 / 8 / 9 first
  /* (S44O — UAT row 344, her UAT ask 2026-10-15) a member's phone that is their only sign-in key (no email): a landline takes no code */
  mobile: 'Enter a mobile number (8 or 9 first) — the sign-in code goes there',
  amount: 'Enter an amount',
  number: 'Enter a number',
  attach: 'Attach at least one file',
  choose: 'Choose an option',
  milestones: 'Milestones must add up to 100%',
  assignee: 'Assign at least one member',
  dateRange: 'From date must be on or before To date',
  future: 'Choose a date after today',   // On Hold › Follow up on (REG-453)
  mapField: 'Select a field or Ignore',   // Import Leads › mapping (REG-317)
  budgetRange: 'Enter a budget between S$1,000 and S$5,000,000',   // (REG-607, parity Q-14) 1.0's bounds
  nric: 'Enter a valid NRIC / FIN, e.g. S1234567A',
  uen: 'Enter a valid UEN, e.g. 201912345K',   // (S42 B-06)
  folderLength: 'Keep a folder’s name to 60 characters',   // (REG-664) the Files tab and every library's folders
  folderTaken: 'A folder here already has this name',
  url: 'Enter a web address, e.g. hafary.com.sg/tiles',   // (sweep S5 #24) a product or spec page   // (REG-607, parity Q-35) the lead's IC, checked like the signing page's
  capacity: 'Enter a number from 1 to 20',   // (gaps build I, I-Q3) projects one person can run at once
} as const

/** (REG-607) The budget a studio can record on a lead — 1.0's bounds, in dollars. */
export const BUDGET_MIN = 1_000
export const BUDGET_MAX = 5_000_000

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const hasErrors = (e: FieldErrors) => Object.values(e).some(Boolean)

/** (pending modules S35) The field errors to show: the browser's own checks, with what the server refused laid over them — a field the person
    has since changed (the server's entry cleared to undefined) falls back to the browser's check, never to no message at all. */
export function withServer<K extends string>(own: FieldErrors<K>, server: FieldErrors<K>): FieldErrors<K> {
  const out: FieldErrors<K> = { ...own }
  for (const [k, v] of Object.entries(server) as [K, string | undefined][]) if (v) out[k] = v
  return out
}
