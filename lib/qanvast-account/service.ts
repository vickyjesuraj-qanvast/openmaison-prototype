import 'server-only'
import { serviceSlot } from '@/lib/services/slots'
import type { ApiBusinessStatistics, ApiContract, ApiFeedbackStatistics, ApiLeadsCreditsPeriod, ApiReviewListingResponse, ApiTransaction, QanvastLinks } from './api'
import { demoQanvastAccount } from './demo'

/*
 * (pending modules S41b-5 — the S41b data sweep's M-04: 1.0's `deployment/qanvast` Qanvast Ops › Credits and Reviews & Rankings) QANVAST'S API
 * FOR THE STUDIO'S ACCOUNT, plugged in at one slot (lib/services/slots.ts `qanvast-account`; the registry's `qanvast-account`). 1.0 read every
 * one of these live, through its proxy `api/qanvast/[...path]` (the studio's Qanvast bearer token on each call, 401 → sign in again), and kept
 * no table: the credits, the contracts, the reviews and the rank are Qanvast's records. 2.0 does the same — no copy, each page asks when it
 * opens — so a developer's adapter is 1.0's calls, answering 1.0's JSON (./api.ts), and the one mapper (./model.ts) reads it:
 *   creditStatistics()        GET /company/{id}/leads-credits-statistics
 *   contracts()               GET /company/{id}/company-contracts
 *   transactions({month,year}) GET /company/{id}/transactions?month=&year=   (the previous month's last transaction first — 1.0's quirk, kept)
 *   earliestTransaction()     GET /company/{id}/transactions?earliest=true
 *   leadCredits(refs)         the credits on each Qanvast lead — 1.0's leads listing's `credits` (GET /company/{id}/leads), by Qanvast's lead id
 *   reviews({page,perPage})   GET /user-review/listing?page=&perPageCount=&populate[user|reviewee|projectImages|overallAvgRating|separateStarItemCount]
 *                             &filter[reviewOf]=Company&filter[revieweeId]={id}&filter[country]=SG&sort[createdAt]=desc
 *   reply({reviewId,text})    POST /user-review/Company/{id}/{reviewId} { revieweeResponse }
 *   businessStatistics()      GET /company/{id}/business-statistics?country=SG
 *   feedbackStatistics(i)     GET /company/{id}/feedback-statistics?interval=1|2|3
 *   links()                   https://qanvast.com/sg/reviews/new?company={id} · https://qanvast.com/sg/reviews/company/{id} · the listing · SuperTrust
 * THE STAND-IN (./demo.ts) calls nothing: it answers in the same shapes from the demo's own records — its Qanvast leads are the credits taken,
 * an approved return that Qanvast credited is the refund, its completed projects and its designers' work are what was reviewed — with
 * Qanvast-only figures (the contract, the rank, page views, board pins, Singapore's averages) as samples it says are samples; a reply is kept
 * in the demo's own store, and the pages say "Simulated on this prototype". PRODUCTION: `setQanvastAccountService({ name, … })` in
 * lib/services/install.ts. A call that fails is the page's own words ("Qanvast didn’t answer") — never a made-up figure.
 */

export type QanvastAccountService = {
  name: string
  creditStatistics: () => Promise<ApiLeadsCreditsPeriod[]>
  contracts: () => Promise<ApiContract[]>
  transactions: (q: { month: number; year: number }) => Promise<(ApiTransaction | null)[]>
  earliestTransaction: () => Promise<ApiTransaction[] | null>
  /** credits taken for each Qanvast lead, by Qanvast's lead id (a lead Qanvast didn't charge for is left out) */
  leadCredits: (refs: string[]) => Promise<Record<string, number>>
  reviews: (q: { page: number; perPage: number }) => Promise<ApiReviewListingResponse>
  /** post (or replace) the studio's public reply to one review */
  reply: (q: { reviewId: string; text: string }) => Promise<{ ok: true } | { error: string }>
  businessStatistics: () => Promise<ApiBusinessStatistics>
  feedbackStatistics: (interval: 1 | 2 | 3) => Promise<ApiFeedbackStatistics>
  links: () => QanvastLinks
}

const slot = serviceSlot<QanvastAccountService>('qanvast-account', demoQanvastAccount)

/** PRODUCTION: plug Qanvast's account API in once, at start-up (lib/services/install.ts). */
export function setQanvastAccountService(s: QanvastAccountService): void { slot.set(s) }
/** Back to the stand-in (a test that swapped one in puts it back). */
export function resetQanvastAccountService(): void { slot.reset() }
export const qanvastAccountIsStandIn = (): boolean => slot.standIn()
export const qanvastAccountName = (): string => slot.use().name
/** The adapter answering now — read at the moment of use, never kept. */
export const qanvastAccount = (): QanvastAccountService => slot.use()

/** The words a page says when Qanvast doesn't answer. *(invented copy)* */
export const NO_ANSWER = 'Qanvast didn’t answer — please try again'
/** 1.0's 401: the studio's Qanvast sign-in has expired (1.0 sent the member to sign in again — `LOGIN_URL_QANVAST_EXPIRED`). An adapter throws
    this when Qanvast answers 401 after its token refresh; the pages offer Sign in again (S30's `signInHref({ reason: 'qanvast', next })`). */
export class QanvastSessionExpired extends Error {
  constructor() { super('Qanvast session expired'); this.name = 'QanvastSessionExpired' }
}
export const SESSION_EXPIRED = 'Your Qanvast session expired'
export type QanvastFailure = { error: string; expired?: boolean }

/** One call to Qanvast, never thrown: its answer, or the page's own words (and whether the studio must sign in to Qanvast again). */
export async function askQanvast<T>(what: string, run: (s: QanvastAccountService) => Promise<T>): Promise<{ ok: T } | QanvastFailure> {
  try { return { ok: await run(slot.use()) } }
  catch (e) {
    if (e instanceof QanvastSessionExpired || (e instanceof Error && e.name === 'QanvastSessionExpired')) return { error: SESSION_EXPIRED, expired: true }
    console.error(`[qanvast-account] ${what} failed:`, e instanceof Error ? e.message : e); return { error: NO_ANSWER }
  }
}
