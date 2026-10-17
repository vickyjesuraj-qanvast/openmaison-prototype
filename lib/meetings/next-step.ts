/**
 * (S42G — the S42 audit's carried note from S42E: S23's "Move to Met" after a held meeting was refused by the default one-stage-at-a-time rule
 * for a lead still in New, "Complete Contacted first") Where a meeting held before Met offers to take its lead — the studio's own stage rule
 * answers (`heldMeetingStep`, lib/leads/stage-policy.ts; the server's `meetingStepFor`, lib/meetings/queries.ts) — and the words every meeting
 * door says it in: the meeting page's banner and its ghost, the snackbars after End and after a write-up (the page's and the Meetings tab's).
 *   · **Met** where the rule lets the lead go there now (Flexible, or a lead in Contacted) — the meeting becomes the Met log (S23's rule);
 *   · **Contacted** for a lead still in New under one stage at a time — the meeting its first contact, Met comes next;
 *   · **Met as a resume** for a lead on hold — the house's "Resume at Met?" confirm asks first;
 *   · nothing where the rule would refuse (a lost lead, one with no member on hold, one on its project, one past Met).
 * Pure and client-safe. Invented copy (the S42G register rows).
 */
import { moveStageHref } from '@/lib/leads/move-link'

export type MeetingStep = { step: 'Contacted' | 'Met'; /** the lead is on hold — the press resumes it there */ resume: boolean }

/** The press: "Move to Contacted" · "Move to Met" · "Resume at Met" (the header's own words for a parked lead). */
export const meetingStepLabel = (n: MeetingStep) => (n.resume ? `Resume at ${n.step}` : `Move to ${n.step}`)

/** Where the press lands: the lead's Move stage window at that step, carrying the meeting (the Met log, or — at Contacted — the first contact). */
export const meetingStepHref = (leadId: string, meetingId: string, n: MeetingStep) => moveStageHref(leadId, n.step === 'Met' ? 'met' : 'contacted', { meeting: meetingId })

/** The meeting page's banner: what isn't on the record yet, and what the press does about it. */
export function meetingStepWords(first: string, n: MeetingStep): { title: string; line: string } {
  if (n.step === 'Contacted') return { title: `${first}’s lead is still New`, line: 'Moving it to Contacted logs this meeting as the first contact — Met comes next.' }
  return {
    title: `This meeting isn’t in ${first}’s Met step yet`,
    line: n.resume ? 'The lead is on hold — resuming it at Met logs the meeting there: where, when and the summary.' : 'Moving the lead to Met logs it there — where, when and the summary.',
  }
}
