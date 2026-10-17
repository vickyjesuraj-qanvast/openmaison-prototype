import type { HangoutOwnPage, HangoutPublicPage, OwnMeeting, PublicStudio } from '@/lib/hangouts/queries'

/**
 * (pending modules S27) The studio's Hangout page's words and a homeowner's own page's — written once for the pages (hangout-public.tsx) and
 * their ghost (hangout-public-ghost.tsx: only the words the page always prints, the mobile's helper). *(invented copy: every line)*
 */
type Open = Extract<HangoutPublicPage, { state: 'open' | 'closed' | 'ended' }>
type Own = Extract<HangoutOwnPage, { state: 'ok' }>

export const pageTitle = (studio: PublicStudio) => `Meet ${studio.name} at the Hangout`
export const tablesFact = (tablesLine: string) => `Find us at ${tablesLine.replace(/^T/, 't')}`
export const bookFine = (studio: PublicStudio) => `A chat of about 45 minutes with one of ${studio.name}’s designers at our table. It’s free.`
export const MOBILE_HELP = 'Your booking’s link comes to it on WhatsApp'
export const consentLine = (studio: PublicStudio) => `${studio.name} may contact me about my renovation`
export const closedTitle = (d: Open) => (d.state === 'ended' ? 'This Hangout has ended' : 'Bookings have closed')
export const closedText = (d: Open) => (d.state === 'ended' ? `Thank you for coming. ${d.studio.name} would still love to hear about your home.` : `Come to our table on the day, or message ${d.studio.name} to meet another time.`)
export const reviewsLine = (studio: PublicStudio) => `Read ${studio.name}’s reviews`
export const messageLine = (studio: PublicStudio) => `Message ${studio.name}`

/** booked — or, once the Hangout is over or every chat of theirs is held, thanks */
export const ownTitle = (d: Own, again: boolean) => (again ? `You’re booked already, ${d.client}`
  : d.event.ended || (d.meetings.length > 0 && d.meetings.every((m) => m.status === 'completed')) ? `Thank you, ${d.client}` : `You’re booked, ${d.client}`)
export const AGAIN_LINE = 'This number has a chat booked already — here it is.'
export const ownChatTitle = (m: OwnMeeting, d: Own) => (m.designer ? `Your chat with ${m.designer.name}` : `Your chat with ${d.studio.name}`)
export const ownStatus = (m: OwnMeeting, d: Own) => m.status === 'scheduled' ? [m.shiftLine, m.table ? `Table ${m.table}` : null].filter(Boolean).join(' · ') || 'Booked'
  : m.status === 'in-progress' ? `You’re with ${m.designer?.name.split(' ')[0] ?? d.studio.name} now${m.table ? ` at table ${m.table}` : ''}`
  : m.next ?? ''
export const READY = 'I’m at the table'
/** the line under a chat that waits, when there is no press */
export const ownFine = (m: OwnMeeting, d: Own) => m.canStart ? null
  : m.status === 'scheduled' && d.event.today && !m.designer ? 'Your designer will be with you soon.'
  : m.status === 'scheduled' && !d.event.today ? 'On the day, press “I’m at the table” when you arrive.' : null
export const notesLine = (m: OwnMeeting) => (m.designer ? `Read ${m.designer.name.split(' ')[0]}’s notes` : 'Read the notes')
export const cancelledLine = (d: Own) => `Your chat was cancelled — ask at ${d.studio.name}’s table, or message us.`
