/*
 * (pending modules S41b-5 — his "please make sure nothing left behind from 1.0 to 2.0" 2026-10-12; the S41b data sweep's M-04) QANVAST'S OWN
 * ANSWERS about a studio's account — the shapes 1.0's Qanvast line read through its proxy `api/qanvast/[...path]` (1.0's
 * `deployment/qanvast` branch: src/types/credits-api.ts, src/app/(main)/qanvast-ops/{credits,reviews}/_api.ts). Kept as 1.0 typed them, field
 * for field, so a developer's adapter (lib/qanvast-account/service.ts) hands Qanvast's JSON straight through and the one mapper
 * (lib/qanvast-account/model.ts) reads it. 1.0 kept no table of its own for any of it — the records are Qanvast's. Pure, client-safe.
 */

/** GET /company/{id}/leads-credits-statistics — one row per month. 1.0 read `leads`, `budgets`, `credits`, `contractsClosed` (its type named
    `creditsUsed`; the mapper read `credits`, so both are taken). */
export interface ApiLeadsCreditsPeriod {
  /** "2026 2" or "Feb 2026" */
  period: string
  leads: number
  budgets?: number
  credits?: number
  creditsUsed?: number
  contractsClosed: number
  closedAmount: number
}

/** One accomplished entitlement on a contract (a photoshoot done, a post made). */
export interface ApiEntitlement {
  type: 'Photoshoot' | 'Social Media Posting'
  accomplishmentTitle?: string
  accomplishmentDate?: string
  accomplishmentLink?: string
}

/** GET /company/{id}/company-contracts */
export interface ApiContract {
  id: string
  contractStart: string
  /** what the studio paid, in dollars */
  contractSum: number
  /** credits the contract gave */
  credits: number
  freeCredits: number
  /** the leads' budget the contract buys, in dollars (0 = no ceiling) */
  budgetFilterMin: number
  budgetFilterMax: number
  photoshoots: number
  socialMediaPostings: number
  entitlements: ApiEntitlement[]
}

/** GET /company/{id}/transactions?month=&year= (and ?earliest=true). Qanvast puts the previous month's last transaction FIRST when there is one —
    1.0 read it as the balance brought forward. `lead.referenceId` is 2.0's addition (Qanvast's id for the lead, 1.0's `referenceId`), so a row can
    open the studio's own lead; a feed without it is matched by the client's phone. */
export interface ApiTransaction {
  id: string
  /** negative = credits taken (a lead), positive = credits given (a contract, free credits, a refund) */
  amount: number
  createdAt: string
  newFreeBalance: number
  newPaidBalance: number
  lead?: { budget: number; offlineUserName: string; contact: string; referenceId?: string }
  contractId?: string
  summary?: string
}

/* ── reviews (1.0's treq-app-v2 ReviewModel + ReviewListResponse, through api-neo) ── */

export interface ApiReviewUser { id?: number; name?: string; images?: { Logo?: { baseUrl?: string } } }
export interface ApiProjectImage { id?: number; baseUrl?: string
  /** 2.0's addition: the picture's own caption, where the feed sends one */ caption?: string }
export interface ApiReview {
  id: number | string
  title?: string
  content?: string
  /** "4.5" */
  averageRating?: string
  createdAt?: string
  projectCompletionDate?: string
  designerName?: string
  reviewer?: ApiReviewUser | null
  /** Qanvast's picture sizes hang off `baseUrl` (`/Thumbnail`, `/Standard`) */
  projectImages?: ApiProjectImage[]
  revieweeResponse?: string | null
  revieweeResponseCreatedAt?: string
}
export interface ApiReviewSeparateItemCount { overallItemCount: number; '1-star': number; '2-star': number; '3-star': number; '4-star': number; '5-star': number }
/** GET /user-review/listing?page=&perPageCount=&populate[…]&filter[reviewOf]=Company&filter[revieweeId]=&filter[country]=SG&sort[createdAt]=desc */
export interface ApiReviewListingResponse {
  data: ApiReview[]
  itemCount?: number
  overallAvgRating?: number
  separateItemCount?: ApiReviewSeparateItemCount
  error?: boolean
}

/** GET /company/{id}/business-statistics?country=SG */
export interface ApiBusinessStatistics {
  rank?: number
  totalCompanies?: number
  reviews?: { last12MonthsCount?: number; last12MonthsAverage?: number; currentYearCount?: number; currentYearAverage?: number }
  totalProjects?: number
  currentYearProjects?: number
  totalBoardPins?: number | string
  currentYearBoardPins?: number | string
  profileViews?: { count?: number; change?: number }
  projectViews?: { count?: number; change?: number }
  reviewViews?: { count?: number; change?: number }
}

export interface ApiStatsWithDiff { current?: { count?: number; pct?: number }; previous?: { count?: number; pct?: number }; diff?: number | null }

/** GET /company/{id}/feedback-statistics?interval=1|2|3 (30 · 60 · 90 days) — what homeowners told Qanvast about the studio. */
export interface ApiFeedbackStatistics {
  responseCount?: { current?: { count?: number } }
  leadCount?: { current?: { count?: number } }
  firstContactWithin7Days?: ApiStatsWithDiff
  firstContactLessThan3Days?: ApiStatsWithDiff
  firstContactWithinAWeek?: ApiStatsWithDiff
  firstContactMoreThanAWeek?: ApiStatsWithDiff
  met?: ApiStatsWithDiff
  notMet?: ApiStatsWithDiff
  averageMeetingRating?: ApiStatsWithDiff
  good?: ApiStatsWithDiff
  average?: ApiStatsWithDiff
  notGood?: ApiStatsWithDiff
  IDHasntContactedMe?: ApiStatsWithDiff
  IDDidNotFollowUp?: ApiStatsWithDiff
  haveYetToSetUpAMeetingDate?: ApiStatsWithDiff
  notKeenOnTheirPortfolio?: ApiStatsWithDiff
  stillDiscussingWithMyPartner?: ApiStatsWithDiff
  lackOfGoodReviews?: ApiStatsWithDiff
  professional?: ApiStatsWithDiff
  punctual?: ApiStatsWithDiff
  proposedGoodIdeas?: ApiStatsWithDiff
  slowResponse?: ApiStatsWithDiff
  lateForMeetings?: ApiStatsWithDiff
  lackOfGoodDesignIdeas?: ApiStatsWithDiff
  inexperiencedDesigner?: ApiStatsWithDiff
  poorAttitude?: ApiStatsWithDiff
  noShow?: ApiStatsWithDiff
  avgContactRating?: number | null
  avgResponseRating?: number | null
  avgExperienceScore?: number | null
}

/** The addresses Qanvast gives a studio — 1.0 built them from NEXT_PUBLIC_QANVAST_COMPANY_ID (write a review · all reviews) and two fixed ones. */
export type QanvastLinks = {
  /** where a homeowner writes a review of the studio — Request reviews sends it */
  writeReview: string
  /** the studio's reviews on Qanvast */
  allReviews: string
  /** Qanvast's professionals listing, ordered by rank */
  listing: string
  /** what Qanvast's next SuperTrust is based on */
  supertrust: string | null
}
