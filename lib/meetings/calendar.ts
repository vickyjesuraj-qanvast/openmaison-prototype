/**
 * (pending modules S23 — the held card's "Google Calendar invites"; 1.0's unmerged branch feat/google-calendar-meetings sent invites through a
 * connected Google account, an .ics route and an RSVP page) A meeting's calendar invite, with no account to connect: the standard calendar file
 * (.ics — Google, Apple and Outlook calendars all open it) and Google Calendar's own "add this event" page, filled in. Both are real; nothing is
 * simulated. A two-way sync with the studio's Google account is the developers' (pending modules S34). Pure and client-safe.
 */

const pad = (n: number) => String(n).padStart(2, '0')
/** 20261014T070000Z */
export const icsStamp = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z` }
/** RFC 5545 text: commas, semicolons and backslashes escaped, new lines as \n. */
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
/** Lines folded at 75 octets (the standard's limit). */
const fold = (line: string) => { const out: string[] = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = ` ${s.slice(74)}` } out.push(s); return out.join('\r\n') }

export type CalendarEvent = { uid: string; title: string; startsAt: number; endsAt: number; location: string | null; description: string; url?: string | null }

export function icsOf(e: CalendarEvent, now = Date.now()): string {
  const lines = [
    /* the product id is never the platform's name — a client's calendar keeps it */
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Studio meetings//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${icsStamp(now)}`,
    `DTSTART:${icsStamp(e.startsAt)}`,
    `DTEND:${icsStamp(e.endsAt)}`,
    `SUMMARY:${icsText(e.title)}`,
    ...(e.location ? [`LOCATION:${icsText(e.location)}`] : []),
    `DESCRIPTION:${icsText(e.description)}`,
    ...(e.url ? [`URL:${e.url}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(e.title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}

/** Google Calendar's own page for adding an event, filled in (calendar.google.com/calendar/render?action=TEMPLATE). */
export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${icsStamp(e.startsAt)}/${icsStamp(e.endsAt)}`, details: e.url ? `${e.description}\n\n${e.url}` : e.description, ...(e.location ? { location: e.location } : {}) })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}
