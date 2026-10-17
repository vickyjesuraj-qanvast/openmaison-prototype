import { runsStudio } from '@/lib/settings/roles'

/*
 * (pending modules S41b-5) WHO SEES THE STUDIO'S QANVAST ACCOUNT — 1.0's rule, read from its code (`deployment/qanvast`
 * src/lib/access-control.ts ROUTE_ACCESS: "qanvast-ops/credits" · "qanvast-ops/credits/contracts" · "qanvast-ops/credits/transactions" ·
 * "qanvast-ops/reviews" → ["owner"]; the seeded Admin role's pages leave both out, scripts/migrations/109; its phone bar hides Credits and
 * Reviews from Qanvast's Designer sub-role). Mapped onto 2.0's roles. Who sees leads still decides which of the studio's leads a row may open.
 * (S42E — call E·2 as recommended, her "build all of them" 2026-10-11; listed in s42/calls-for-vicky.md for her review) **Lead credits stay the
 * Owner's** (money with Qanvast, as 1.0 had it); **Reviews are the Owner's and the Admins'** — they read them, reply and Request reviews, as they
 * run the studio day to day and a reply is the studio's voice (departs from 1.0's Owner-only Reviews). Manager, Designer and Accounting meet the
 * tabs' gate. Pure.
 */

/** Lead credits — the studio's money with Qanvast: the Owner only (1.0's rule). */
export const seesQanvastCredits = (role: string | null | undefined): boolean => role === 'Owner'
/** Reviews, Ranking and Feedback — and replying, and Request reviews: Owners and Admins (call E·2). */
export const seesQanvastReviews = (role: string | null | undefined): boolean => runsStudio(role)

/** The refusals — the rule in its own words, as every `{ error }` says it. *(invented copy)* */
export const QANVAST_ACCOUNT_REFUSAL = {
  read: 'Only the studio’s Owner can see its Qanvast account',
  reply: 'Only the studio’s Owner or an Admin can reply to its Qanvast reviews',
} as const

/** The tabs' gate for everyone else. *(invented copy)* */
export const GATE_WORDS = {
  credits: { title: 'Lead credits are for the studio’s Owner', help: 'What Qanvast charges for each lead, the studio’s contracts with Qanvast and its statement are the Owner’s to see.' },
  reviews: { title: 'Reviews are for the studio’s Owner and Admins', help: 'The studio’s reviews on Qanvast, its rank and what homeowners told Qanvast are for an Owner or an Admin to read and answer.' },
} as const
