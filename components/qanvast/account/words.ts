import { QANVAST_CREDITS_HREF, QANVAST_REVIEWS_HREF } from '@/components/qanvast/qanvast-tabs'

/*
 * (pending modules S41b-5) The words Qanvast Ops › Lead credits and Reviews say in their fixed places — read by the page and by its ghost, so a
 * ghost's bars are the page's own words (REG-708, S17's rule). 1.0's titles in plain words. *(invented copy: every line here)*
 */

export const CREDIT_VIEWS = [
  { value: 'overview', label: 'Overview', href: QANVAST_CREDITS_HREF },
  { value: 'transactions', label: 'Transactions', href: `${QANVAST_CREDITS_HREF}/transactions` },
  { value: 'contracts', label: 'Contracts', href: `${QANVAST_CREDITS_HREF}/contracts` },
] as const
export const REVIEW_VIEWS = [
  { value: 'reviews', label: 'Reviews', href: QANVAST_REVIEWS_HREF },
  { value: 'ranking', label: 'Ranking', href: `${QANVAST_REVIEWS_HREF}/ranking` },
  { value: 'feedback', label: 'Feedback', href: `${QANVAST_REVIEWS_HREF}/feedback` },
] as const
export type CreditViewKey = (typeof CREDIT_VIEWS)[number]['value']
export type ReviewViewKey = (typeof REVIEW_VIEWS)[number]['value']

export const W = {
  /* Lead credits › Overview */
  left: 'Credits left',
  topUp: 'Need more? Ask your Qanvast account manager to top up.',
  usedIn: (month: string) => `Used in ${month}`,
  onTheWay: 'On the way back',
  byMonth: 'Leads received and credits used',
  byMonthHelp: 'The last six months, as Qanvast counts them',
  leadsChart: 'Leads received',
  creditsChart: 'Credits used',
  monthByMonth: 'Month by month',
  closures: 'Closures in the last six months',
  closuresFoot: 'Estimated from Qanvast Guarantee submissions and the dates contracts closed. For a truer rate, ask homeowners to submit the Qanvast Guarantee — or submit it for them.',
  /** (S42E, E-07) while the stand-in answers: the rule it counts by — 1.0's Guarantee line returns with Qanvast's own figures */
  closuresFootSimulated: 'Counted from your Qanvast leads that reached Won, and what their projects are worth.',
  /* Transactions */
  statement: (month: string) => `Statement for ${month}`,
  statementHelp: 'Credits Qanvast took for each lead, and the credits it added',
  /* Contracts */
  contracts: 'Your contracts with Qanvast',
  contractsHelp: 'What each contract gave, the leads’ budget it buys, and what it includes',
  /* Reviews */
  overview: 'Overview',
  seeAll: 'See every review on Qanvast',
  askHomeowners: 'Ask homeowners for a review',
  request: 'Request reviews',
  /* Ranking */
  rankHelp: (firms: string) => `of ${firms} firms on Qanvast`,
  rankLink: 'See Qanvast’s professionals listing',
  factors: 'What decides your rank',
  factorsHelp: 'Over the last 12 months',
  views: 'Page views',
  viewsHelp: 'Over the last 7 days, against the week before',
  told: 'What homeowners told Qanvast',
  toldHelp: 'Over the last 30 days',
  /* Feedback */
  feedbackHelp: 'What homeowners told Qanvast about your studio after it sent you their lead',
} as const
