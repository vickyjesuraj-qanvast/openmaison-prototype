/**
 * (pending modules S14 — card held:settings-company, "Review Link — later as recommended · revisit: 'Ask for a review' sends a WhatsApp with no
 * link"; 1.0's Accounts Setup › Review Link, `settings.review_request_link`, src/app/(main)/accounts/page.tsx) The page where the studio's
 * clients review it — its Google, Qanvast or Facebook review page. Kept with the studio's details on Company › Profile (`brand.details.reviewLink`,
 * beside the website and the social links); never printed. Maison AI's **Ask for a review** (a Won lead, a completed project) sends it in the
 * WhatsApp it drafts. 1.0 saved it and read it nowhere (its Reviews & Rankings page never existed). Pure and client-safe. *(invented copy)*
 */
import { cleanLink, shortLink } from '@/lib/quotes/items-model'

/** The field's refusal — a web address only (a bare "g.page/r/…" gets https:// in front, as a quote line's link does). */
export const REVIEW_LINK_MSG = 'Enter a web address, e.g. g.page/r/your-studio/review'
/** Company › Profile › Reviews — the line under its title, said once for the page and its ghost. */
export const REVIEW_LINK_HELP = 'The page where clients review you — your Google, Qanvast or Facebook review page. When you ask a client for a review, Maison AI puts it in the message. It never prints.'
export const REVIEW_LINK_LABEL = 'Review link'

/** What a typed or stored value keeps: the cleaned link, '' for none (anything that is not a web address is dropped). */
export const keptReviewLink = (v: unknown): string => (typeof v === 'string' ? cleanLink(v) ?? '' : '')
/** Why a typed link can't be kept, or null (an empty box keeps none). */
export const reviewLinkProblem = (v: string): string | null => (cleanLink(v) === undefined ? REVIEW_LINK_MSG : null)
/** "g.page/r/…" — the link as a line of words shows it. */
export const reviewLinkText = (href: string) => shortLink(href)

/** (pending modules S41b-5) Reviews' door to Qanvast Ops › Reviews › Request reviews — the Owner's alone (1.0's rule); the page and its ghost read
    the same words. *(invented copy)* */
export const QANVAST_REVIEWS_DOOR = { lead: 'To ask clients for a review on Qanvast, use ', link: 'Request reviews on Qanvast Ops', end: '.', href: '/qanvast-ops/reviews?request=1' } as const
