/**
 * Stage movement — studio-level policy set under Settings › Leads (user brief 2026-08-29).
 *   linear   one stage at a time: changing stage opens the Move stage window for the next stage only;
 *            completed stages stay editable, later stages are locked until the current one is done.
 *   flexible leads move instantly to any stage (Undo in the snackbar); details are optional and can be
 *            recorded later from the lead's journey. Won still opens its step — it creates the project.
 * On Hold / Lost keep their compact dialogs in both modes.
 */
export const STAGE_MOVEMENTS = ['linear', 'flexible'] as const
export type StageMovement = (typeof STAGE_MOVEMENTS)[number]
export const DEFAULT_STAGE_MOVEMENT: StageMovement = 'linear'

export const STAGE_MOVEMENT_OPTIONS: { key: StageMovement; title: string; help: string }[] = [
  { key: 'linear', title: 'Linear', help: 'Stages are completed one at a time. Changing a lead’s stage opens the Move stage window and asks for that stage’s details before it moves on.' },
  { key: 'flexible', title: 'Flexible', help: 'Leads move instantly to any stage, with no details asked up front. Stage details can be added later from the lead’s journey.' },
]

export function parseStageMovement(v: unknown): StageMovement {
  return v === 'flexible' ? 'flexible' : 'linear'
}

/**
 * Quote approval — studio-level policy set under Settings › Leads (user brief 2026-08-30).
 * Studios differ on whether a quote is reviewed inside the studio before it reaches the client, so the quote's
 * lifecycle is not one fixed list: the two approval statuses exist only where approval is required.
 *   required      Draft → Sent for Approval → Approved → Sent to Client → Signed
 *   not-required  Draft → Sent to Client → Signed
 * `required` is the default because it is the studio the mocks were drawn for (the Overview widget's Draft ·
 * Sent · Approved track, 858:25057, and the five-status row menu 910:36404).
 */
export const QUOTE_APPROVALS = ['required', 'not-required'] as const
export type QuoteApproval = (typeof QUOTE_APPROVALS)[number]
export const DEFAULT_QUOTE_APPROVAL: QuoteApproval = 'required'

export const QUOTE_APPROVAL_OPTIONS: { key: QuoteApproval; title: string; help: string }[] = [
  { key: 'required', title: 'Required', help: 'Quotes are reviewed inside the studio before they reach the client. A quote runs Draft → Sent for Approval → Approved → Sent to Client → Signed.' },
  { key: 'not-required', title: 'Not required', help: 'Designers send quotes straight to the client. A quote runs Draft → Sent to Client → Signed.' },
]

export function parseQuoteApproval(v: unknown): QuoteApproval {
  return v === 'not-required' ? 'not-required' : 'required'
}

/** The studio itself (settings key `studio`, seeded by repair R23): what the quote's Issuing Entity and GST line read. */
export type Studio = { name: string; gstRegistered: boolean; /** The studio's line, as the quote's "[Studio Phone Number]" token prints it (REG-420); '' until set. */ phone: string }
export const DEFAULT_STUDIO: Studio = { name: 'Demo Studio Pte Ltd', gstRegistered: true, phone: '' }
export function parseStudio(v: unknown): Studio {
  const r = (v ?? {}) as Partial<Record<keyof Studio, unknown>>
  return { name: typeof r.name === 'string' && r.name.trim() ? r.name : DEFAULT_STUDIO.name, gstRegistered: r.gstRegistered !== false, phone: typeof r.phone === 'string' ? r.phone.trim() : '' }
}

/**
 * Template approval — studio-level policy (owner 2026-09-18, REG-501): whether a Designer's template needs an Owner's or
 * Admin's approval before it publishes. Owners and Admins always publish directly.
 *   required      Draft → Awaiting approval → Published (Approve and publish · Request changes)
 *   not-required  every member publishes
 */
export const TEMPLATE_APPROVALS = ['required', 'not-required'] as const
export type TemplateApproval = (typeof TEMPLATE_APPROVALS)[number]
export const DEFAULT_TEMPLATE_APPROVAL: TemplateApproval = 'required'
export const TEMPLATE_APPROVAL_OPTIONS: { key: TemplateApproval; title: string; help: string }[] = [
  { key: 'required', title: 'Required', help: 'A designer submits a template for approval; an Owner or Admin approves and publishes it, or requests changes. Owners and Admins publish directly.' },
  { key: 'not-required', title: 'Not required', help: 'Every member publishes templates for the whole studio.' },
]
export function parseTemplateApproval(v: unknown): TemplateApproval {
  return v === 'not-required' ? 'not-required' : 'required'
}
