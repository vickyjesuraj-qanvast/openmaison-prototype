import { CASETRUST_ID, REGISTRATIONS_KEY, parseStudioStates } from '@/lib/compliance/studio-actions'

/**
 * (gaps build D, item 6 — 1.0 M-260 Feature Flags › *CaseTrust signing step*, I-356 · I-357) A CaseTrust-accredited studio (Singapore's
 * renovation accreditation) shows the deposit-protection disclosure on every signing page, with a tick the client must give before they sign;
 * the tick's time is kept on each contract signed (`contracts.casetrust_at`) and shown in its signing record. Off by default. Pure and
 * client-safe; the read is `fetchCaseTrust` (casetrust-queries.ts).
 * (one-home N-07) Accredited = CaseTrust done in the studio's ONE record of registrations, set on Company › Profile › Registrations &
 * accreditations (settings `compliance_studio`, `lib/compliance/studio-actions.ts`) — the record the Compliance Navigator reads too. The
 * Settings › Quotes & pricing switch (and its own key, `casetrust`) is gone; `CASETRUST_KEY` now names the record, so the read is unchanged.
 */
export const CASETRUST_KEY = REGISTRATIONS_KEY
export const parseCaseTrust = (v: unknown): boolean => parseStudioStates(v)[CASETRUST_ID]?.done === true
/** 1.0's disclosure, in the signing card's words — the studio named. */
export const caseTrustDisclosure = (studio: string) => `${studio} is a CaseTrust-accredited renovation business. Your deposit is protected under the CaseTrust deposit-protection scheme, up to the accredited amount. Please read this before you sign.`
export const CASETRUST_POINTS = ['Your deposit is held in a CaseTrust-protected account.', 'You may ask for it back under the scheme’s conditions.'] as const
export const CASETRUST_TERMS = 'https://www.case.org.sg/casetrust-renovation'
export const CASETRUST_TICK = 'I have read the CaseTrust deposit-protection disclosure'
export const CASETRUST_RULE = 'Tick that you have read the CaseTrust deposit-protection disclosure first'
