import type { MouseEvent } from 'react'

/*
 * Qanvast Ops' tab strip, one list for its pages (spec design-source/context/lead-return/02-qanvast-ops.txt): Leads · Studios · Lead credits ·
 * Reviews · Hangouts. (parity map, CP-148 · CP-149) **Studios** is the second live tab — (pending modules S27) **Hangouts** the third — OpenMaison's switches for a studio and its portal's
 * usage. (pending modules S41b-5) **Lead credits** and **Reviews** are live too — 1.0's Qanvast line had both (`deployment/qanvast`
 * qanvast-ops/credits · reviews), the S41b sweep's M-04: every tab now navigates. Tabs only takes hrefs, so a tab that is still inert would carry a
 * ?tab= href and `onQanvastTabsClick` would intercept its click (coming soon) — none is, today; the hook stays for the next signpost.
 */
export const QANVAST_LEADS_HREF = '/qanvast-ops'
export const QANVAST_STUDIOS_HREF = '/qanvast-ops/studios'
/** (pending modules S27) Hangouts — the studio's side of Qanvast's meet-the-designers events, the third live tab */
export const QANVAST_HANGOUTS_HREF = '/qanvast-ops/hangouts'
/** (pending modules S41b-5) Lead credits (1.0's Credits — "Credits" is the AI credits' word, one-home N-05) and Reviews (1.0's Reviews & Rankings) —
    each tab's views have their own addresses (1.0's own: …/credits/transactions · …/credits/contracts · …/reviews/feedback, and Ranking) */
export const QANVAST_CREDITS_HREF = '/qanvast-ops/credits'
export const QANVAST_REVIEWS_HREF = '/qanvast-ops/reviews'
export const QANVAST_TAB_ITEMS = [
  { label: 'Leads', href: QANVAST_LEADS_HREF },
  { label: 'Studios', href: QANVAST_STUDIOS_HREF },   /* (parity map, CP-148 · CP-149) */
  { label: 'Lead credits', href: QANVAST_CREDITS_HREF },   /* (one-home N-05) "Credits" was also the AI credits' word · (pending modules S41b-5) live */
  { label: 'Reviews', href: QANVAST_REVIEWS_HREF },   /* (pending modules S41b-5) live */
  { label: 'Hangouts', href: QANVAST_HANGOUTS_HREF },   /* (pending modules S27) live */
]
const LIVE = new Set([QANVAST_LEADS_HREF, QANVAST_STUDIOS_HREF, QANVAST_CREDITS_HREF, QANVAST_REVIEWS_HREF, QANVAST_HANGOUTS_HREF])

/** Inert tabs: intercept the Link click before Next follows it (Link honours defaultPrevented) and answer coming soon. */
export function onQanvastTabsClick(e: MouseEvent<HTMLDivElement>, comingSoon: () => void) {
  const tab = (e.target as Element).closest<HTMLAnchorElement>('a[role="tab"]')
  if (!tab || LIVE.has(tab.getAttribute('href') ?? '')) return
  e.preventDefault()
  comingSoon()
}
