/**
 * (pending modules S23) The messages a meeting sends — the invitation (1.0's unmerged branch: "Schedule & Send Invite"; the held card's "the
 * client's meeting email") and the notes after it. WhatsApp opens on the press with these words and the studio sends them (REG-534); the email
 * leaves through the house outbox in the studio's words (Settings › Notifications › Messages to clients › A meeting is booked). Pure and
 * client-safe; every word invented copy.
 */
import { displayDateLong, displayTime } from '@/lib/format'
import { aimLabel, firstOf, whereWords } from './model'

export const whenWords = (startsAt: number) => `${displayDateLong(new Date(startsAt))} at ${displayTime(new Date(startsAt))}`
/** Where, for the client: the address or "a video call" — never the studio's own word for the kind alone. */
export const placeWords = (whereKind: string, place: string | null) => (whereKind === 'Video call' ? (place ? `on a video call — ${place}` : 'on a video call') : place ? `at ${place}` : whereWords(whereKind))

export function inviteMessage(o: { client: string; studio: string; aim: string; startsAt: number; whereKind: string; place: string | null; link: string }): string {
  const what = o.aim === 'other' ? 'our meeting' : `our ${aimLabel(o.aim).toLowerCase()}`
  return `Hi ${firstOf(o.client)}, this is to confirm ${what} on ${whenWords(o.startsAt)}, ${placeWords(o.whereKind, o.place)}. You can add it to your calendar, or tell us if the time doesn’t suit, here: ${o.link}`
}
export function notesMessage(o: { client: string; followUp: string | null; link: string }): string {
  const lead = o.followUp?.trim() || `Hi ${firstOf(o.client)}, thank you for meeting us.`
  return `${lead} The notes from our meeting are here: ${o.link}`
}
/** The title a calendar shows: the studio's for the client, the client's for the studio. */
export const calendarTitle = (o: { aim: string; with: string }) => `${o.aim === 'other' ? 'Meeting' : aimLabel(o.aim)} with ${o.with}`
