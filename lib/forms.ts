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
  amount: 'Enter an amount',
  number: 'Enter a number',
  attach: 'Attach at least one file',
  choose: 'Choose an option',
  milestones: 'Milestones must add up to 100%',
  assignee: 'Assign at least one member',
  dateRange: 'From date must be on or before To date',
  future: 'Choose a date after today',   // On Hold › Follow up on (REG-453)
  mapField: 'Select a field or Ignore',   // Import Leads › mapping (REG-317)
} as const

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const hasErrors = (e: FieldErrors) => Object.values(e).some(Boolean)
