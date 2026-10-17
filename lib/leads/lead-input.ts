import { BUDGET_MAX, BUDGET_MIN, EMAIL_RE, MSG, type FieldErrors } from '@/lib/forms'
import { digitsOnly, isNric, isSgPhone, isUen, parseInputDate, phoneDigits, titleCaseName } from '@/lib/format'
import { DISTRICTS, isCommercialType } from '@/lib/leads/enums'

/*
 * A lead's details as the Create New Lead form holds them, the form's one validation, and the columns a lead row keeps — pure and client-safe,
 * so the form (components/leads/lead-form.tsx), the studio's actions (app/leads/actions.ts) and (pending modules S41b-3) the website's no-account
 * trial and its claim at sign-up (lib/trial/*) all read the SAME rules. Moved here unchanged from the form and the actions (a server action may
 * not call a function from a 'use client' module — the UI sweep's rule).
 */

export type LeadFormData = {
  name: string
  phone: string
  source: string
  propertyType: string
  propertyAddress: string
  email: string
  leadAddress: string
  budget: string        // grouped digits, e.g. "70,000"
  startDate: string     // d/m/yyyy
  style: string
  keyCollection: string
  condition: string
  areaSize: string
  areaUnit: string
  notes: string
  /** (REG-607) 1.0's Area / District, the client's IC / NRIC and the studio's customer reference. */
  district: string
  nric: string
  customerId: string
  /** (pending modules S05 — testers' L-3) A commercial client: its company and UEN, asked for when the property type is Commercial — the
      lead's name is the contact person, and the NRIC / FIN steps back. */
  companyName: string
  companyUen: string
  /** (pending modules S05 — testers' L-4) A second client on the lead (a co-owner) — every new quote starts with them (REG-588). */
  client2Name: string
  client2Nric: string
  client2Phone: string
  /** Member ids (REG-231). Many-to-many, like `lead_assignees` — never a single id. */
  assignees: string[]
}

export type LeadFormErrors = FieldErrors<'name' | 'phone' | 'email' | 'budget' | 'startDate' | 'assignees' | 'nric' | 'companyUen' | 'client2Name' | 'client2Nric' | 'client2Phone'>

/**
 * Pure validation — required fields are exactly the mock's starred ones (Lead name*, Lead phone number*).
 * `requireAssignee` closes the door REG-130 already guards elsewhere: past New a lead must keep an owner, which the
 * Assign popover enforces (`requireOne`). Without it the form would be a second way to clear the last one.
 */
export function validateLeadForm(data: LeadFormData, requireAssignee = false): LeadFormErrors {
  const errors: LeadFormErrors = {}
  if (requireAssignee && data.assignees.length === 0) errors.assignees = MSG.assignee
  if (!data.name.trim()) errors.name = MSG.required
  if (!isSgPhone(phoneDigits(data.phone))) errors.phone = MSG.phone   // (REG-287 / REG-547) the one phone rule, not a local copy
  if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) errors.email = MSG.email
  const budgetDigits = data.budget.replace(/,/g, '').trim()
  if (budgetDigits && !/^\d+$/.test(budgetDigits)) errors.budget = MSG.number
  else if (budgetDigits && (Number(budgetDigits) < BUDGET_MIN || Number(budgetDigits) > BUDGET_MAX)) errors.budget = MSG.budgetRange   // (REG-607, parity Q-14) 1.0's bounds
  if (data.startDate.trim() && !parseInputDate(data.startDate)) errors.startDate = MSG.date
  if (data.nric.trim() && !isNric(data.nric)) errors.nric = MSG.nric   // (REG-607, parity Q-35)
  /* (S42 B-06) a commercial lead's UEN is ACRA's shape — checked only while the company is asked for (a home keeps an old one, unshown) */
  if (isCommercialType(data.propertyType) && data.companyUen.trim() && !isUen(data.companyUen)) errors.companyUen = MSG.uen
  /* (pending modules S05 — testers' L-4) the second client: their name once anything of theirs is typed; an NRIC and a mobile checked like the first's */
  if (!data.client2Name.trim() && (data.client2Nric.trim() || data.client2Phone.trim())) errors.client2Name = MSG.required
  if (data.client2Nric.trim() && !isNric(data.client2Nric)) errors.client2Nric = MSG.nric
  if (data.client2Phone.trim() && !isSgPhone(phoneDigits(data.client2Phone))) errors.client2Phone = MSG.phone
  return errors
}

/** What the studio's lead actions take — the form's fields, its members, the files attached on creation and the custom fields' values. */
export type LeadFormInput = {
  name: string
  phone: string
  source: string
  propertyType: string
  propertyAddress: string
  email: string
  leadAddress: string
  budget: string        // grouped digits, e.g. "70,000"
  startDate: string     // d/m/yyyy
  style: string
  keyCollection: string
  condition: string
  areaSize: string
  areaUnit: string
  notes: string
  /** (REG-607) 1.0's Area / District (one of DISTRICTS), the client's IC / NRIC and the studio's customer reference. */
  district: string
  nric: string
  customerId: string
  /** (pending modules S05 — testers' L-3 · L-4) A commercial client's company and UEN; a second client (a co-owner): name · NRIC / FIN · mobile.
      Optional — a caller that never sends them leaves the lead's own as they are. */
  companyName?: string
  companyUen?: string
  client2Name?: string
  client2Nric?: string
  client2Phone?: string
  /** Member ids from the form's Assign member field (REG-231). Replaces the lead's assignees wholesale. */
  assignees: string[]
  /** (REG-609, parity C-08) Files attached on the Create New Lead form — their names; each becomes the simulated upload's lead_files row. */
  files?: string[]
  /** (REG-612, parity Q-25) The studio's custom fields, by field id — a string, or a string[] for a multi select. */
  customValues?: Record<string, string | string[]>
}

/** (S42 B-06) The server's own check on what a studio form sends — the NRIC / FIN and a commercial lead's UEN — the rule's words, else null. */
export function leadInputBlock(input: LeadFormInput): string | null {
  if (input.nric.trim() && !isNric(input.nric)) return MSG.nric
  if (input.client2Nric?.trim() && !isNric(input.client2Nric)) return MSG.nric
  if (isCommercialType(input.propertyType) && input.companyUen?.trim() && !isUen(input.companyUen)) return MSG.uen
  return null
}
/** The `leads` columns a form's details become — one place for every writer (create, edit, the trial's claim). */
export function leadColumns(input: LeadFormInput) {
  // (REG-287) One phone rule (`phoneDigits`) and one date parser (`parseInputDate`, strict) — the hand-written
  // `digits(input.phone)` and the lax inline d/m/yyyy regex that stood here were two more copies of both.
  return {
    name: titleCaseName(input.name),   // (REG-329) typed in any case, saved as "Farah Ahmad"
    phone: phoneDigits(input.phone),
    source: input.source || 'Others',
    propertyType: input.propertyType || 'Others',
    propertyAddress: input.propertyAddress.trim() || null,
    email: input.email.trim() || null,
    leadAddress: input.leadAddress.trim() || null,
    budgetMinor: Number(digitsOnly(input.budget) || 0) * 100,
    estimatedStartDate: parseInputDate(input.startDate),
    style: input.style || null,
    keyCollection: input.keyCollection || null,
    condition: input.condition || null,
    areaSqft: (() => {
      const n = Number(digitsOnly(input.areaSize))
      if (!n) return null
      return input.areaUnit === 'sq m' ? Math.round(n * 10.7639) : n
    })(),
    notes: input.notes.trim() || null,
    area: (DISTRICTS as readonly string[]).includes(input.district) ? input.district : null,   // (REG-607) the vocabulary, or nothing
    icNumber: input.nric.replace(/\s+/g, '').toUpperCase() || null,   // (REG-607) kept the way the signing page checks it (isNric)
    customerId: input.customerId.trim() || null,
    /* (pending modules S05 — testers' L-3 · L-4) only what the caller sent: a caller with no such field leaves the stored value alone */
    ...(input.companyName !== undefined ? { companyName: input.companyName.trim().replace(/\s+/g, ' ').slice(0, 120) || null } : {}),
    ...(input.companyUen !== undefined ? { companyUen: input.companyUen.replace(/\s+/g, '').toUpperCase().slice(0, 12) || null } : {}),
    ...(input.client2Name !== undefined ? { client2Name: input.client2Name.trim() ? titleCaseName(input.client2Name).slice(0, 120) : null } : {}),
    ...(input.client2Nric !== undefined ? { client2Nric: input.client2Nric.replace(/\s+/g, '').toUpperCase().slice(0, 12) || null } : {}),
    ...(input.client2Phone !== undefined ? { client2Phone: phoneDigits(input.client2Phone).slice(-8) || null } : {}),
  }
}
