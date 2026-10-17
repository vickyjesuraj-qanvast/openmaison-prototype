import type { HangoutResults } from '@/lib/hangouts/queries'

/** (pending modules S27) How a Hangout went — its tiles' words and the line under them, kept apart from the page (results-view.tsx) so each
    tile's rule reads beside its words. *(invented copy: the help lines, the line under the tiles)* */
export const resultTiles = (r: HangoutResults) => [
  { key: 'held', label: 'Chats held', value: `${r.held} of ${r.promised}`, help: r.inProgress ? `${r.inProgress} on now · ${r.waiting} waiting` : r.waiting ? `${r.waiting} still waiting` : 'Chats promised by Qanvast' },
  { key: 'converted', label: 'Converted', value: String(r.converted), help: r.rate === null ? 'None held yet' : `${r.rate}% of the chats held` },
  { key: 'follow', label: 'Follow-ups', value: String(r.followUp), help: 'Each with its task on the lead' },
  { key: 'dropped', label: 'Dropped', value: String(r.dropped), help: 'Not a fit this time' },
]
export const leadsLine = (r: HangoutResults) => `${r.leads} ${r.leads === 1 ? 'person' : 'people'} booked a chat — each one a lead, source Hangout. `
export const LEADS_LINK = 'See them in Leads'
