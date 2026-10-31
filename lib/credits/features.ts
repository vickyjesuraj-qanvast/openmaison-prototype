/**
 * (pending modules S19 — card held:ai-credits "Plan feature locks … lock or soften it before demoing Free"; Q-40 as recommended (R6); 1.0's
 * plan gating, `docs/rules/plan-gating.md` + `src/lib/plan/features.ts`, live on PLG since 2026-09-28) The seven Pro features a studio on
 * Free can't use, pure and client-safe — what the server refuses (lib/credits/plan-gate.ts), what wears the Pro tag and what the lock card
 * says, read from the one place so they never disagree with the Plans table (lib/credits/pricing-data.ts derives its rows from the flags).
 *
 * 1.0's rules, kept: the server is the lock; locked openers stay visible with a Pro tag and a press explains the lock (never hidden); data is
 * kept — nothing is deleted or rewritten, approvals are forced off when read, so an upgrade or a trial gives everything back at once; a plan
 * that can't be read locks nothing (fail open — an outage never locks a paying studio). The four Max-only flags are not locked (Max is not
 * sold; locking them would take POs and accounting from Pro). 2.0's words for each feature are its own (Q-01 "AI credits", the 2.0 names).
 */
import { planRow, type FeatureKey, type PlanId } from './plans'

export const PRO_FEATURES = ['quote_xray', 'template_editor', 'package_creation', 'custom_stages', 'internal_approvals', 'whatsapp_notifications', 'expense_management'] as const satisfies readonly FeatureKey[]
export type ProFeature = (typeof PRO_FEATURES)[number]

/** Each feature's 2.0 name ("Quote X-Ray"), whether it reads as plural, and the one line the lock card says it does. */
export const FEATURE_WORDS: Record<ProFeature, { name: string; plural?: true; what: string }> = {
  quote_xray: { name: 'Quote X-Ray', what: 'Compare another studio’s quote with yours, line by line, and see where you win.' },
  template_editor: { name: 'Your own quote templates', plural: true, what: 'Design your quote paper — your layout, your brand, what new quotes start with — and pick it for any quote.' },
  package_creation: { name: 'Price book sections', plural: true, what: 'Save a section of lines once and drop it into any quote.' },
  custom_stages: { name: 'Lead stage rules', plural: true, what: 'Decide what each lead stage asks for before a lead moves on.' },
  internal_approvals: { name: 'Approvals', plural: true, what: 'Have quotes, templates, invoices, orders and updates checked by an Owner or an Admin before they go.' },
  whatsapp_notifications: { name: 'WhatsApp notifications', plural: true, what: 'Get the studio’s notices, and send your clients’ messages, on WhatsApp as well as in the app and by email.' },
  expense_management: { name: 'Expenses', plural: true, what: 'Record what the studio spends, with receipts, by project, and pay back what the team paid.' },
}

export const isProFeature = (k: unknown): k is ProFeature => typeof k === 'string' && (PRO_FEATURES as readonly string[]).includes(k)

/** 1.0's rule: `plans.feature_flags[feature] === true` is open; anything else is locked. A plan id nobody knows reads as Free. */
export const planAllows = (planId: string, f: ProFeature): boolean => planRow(planId).featureFlags[f] === true

/** What a plan locks. */
export const lockedOn = (planId: PlanId | string): ProFeature[] => PRO_FEATURES.filter((f) => !planAllows(planId, f))

/** "Quote X-Ray comes with Pro" · "Approvals come with Pro" — the lock card's title, the Pro tag's tooltip, a refusal's first half. */
export const comesWithPro = (f: ProFeature): string => `${FEATURE_WORDS[f].name} ${FEATURE_WORDS[f].plural ? 'come' : 'comes'} with Pro`

/** The refusal a locked action answers (`{ error }`): the rule, then the way on — "…; Dane can move the studio to Pro in Plans." */
export const lockRule = (f: ProFeature, owner?: string | null): string => `${comesWithPro(f)} — ${owner ? `${owner} can move the studio to Pro in Plans` : 'move the studio to Pro in Plans'}.`

/** A refusal is a plan lock (the screens open the lock card instead of a snackbar). */
export const isLockRule = (error: unknown): boolean => typeof error === 'string' && / comes? with Pro — /.test(error)
