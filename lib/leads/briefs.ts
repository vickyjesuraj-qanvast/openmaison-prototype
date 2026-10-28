/**
 * Maison AI briefs — the scripted list behind the Lead Overview's Maison AI card (858:24867).
 * (the calm UI build 2026-10-27 — audit 2-01) The first brief is the ONE card the Overview shows, with one action; the others no longer stack
 * behind Show more — their actions ride in the Maison AI sheet. Every brief is written from the record (how long the lead has been where it is,
 * whether anyone owns it, what is missing); the mock's "reach Met 3.1× more often" and the invented figures in the same voice are gone — they
 * were not the studio's numbers (Principle 11). Still invented copy, in the briefs' voice.
 *
 * Pure data: no clock, no randomness — the list order is stable across renders and reloads.
 */
import { dayWords, displayDate, moneyCompact } from '@/lib/format'

export type Brief = {
  /** The filled yellow tag in the card head ("Fresh lead · respond fast"). */
  tag: string
  /** The brief, as runs; `bold` runs render Bold (the mock mixes Regular and Bold in one paragraph). */
  text: { t: string; bold?: boolean }[]
  /** The two outlined-primary buttons under the text. */
  actions: [string, string]
}

export type BriefLead = {
  source: string
  propertyType: string
  budgetMinor: number
  keyCollection: string | null
  /** The QUESTIONNAIRE card's own summary (858:25077, `summarise` in question-model) — null / absent when the lead has no questions. */
  questionnaire?: { answered: number; total: number } | null
  /** (UX audit 2026-09-30, L2) A contact is already logged (the Notes tab's or the stage's) — the New brief stops claiming "No contact yet". */
  contacted?: boolean
  /** (fix-A, A-26) A Won lead's project, once it exists — the Won brief points at it instead of the handover. */
  project?: { number: string; stage?: string } | null
  /** (S42E, E-11) A meeting held with a lead still in New (a Hangout chat, S23's write-up) — its last contact — and the stage the studio's rule
      takes it to next (`heldMeetingStep`): the New brief stops urging a first call. */
  met?: { at: Date; where: string | null; step: 'Contacted' | 'Met' | null } | null
  /** (the calm UI build 2026-10-27 — 2-01) the client's first name, the calendar days in the current stage (the stages card's own count), whether
      a member is on the lead, and a Lost lead's recorded reason — what the brief says, from the record */
  name?: string
  daysInStage?: number | null
  owned?: boolean
  lostReason?: string | null
}

/** (fix-A, A-26) The Won brief once the project exists: where the work is now, and the way there. Invented copy, in the briefs' voice. */
export const OPEN_PROJECT = 'Open project'
/** (S42E, E-11) The met-already brief's press: the lead's next stage, the meeting as its log (`?move=…&meeting=`). Invented copy. */
export const LOG_MEETING = 'Log the meeting'
const PROJECT_STAGE_WORDS: Record<string, string> = { setting_up: 'is being set up', in_progress: 'is in progress', completed: 'is completed' }

/** "S$70.5K" — `moneyCompact` says "S$ 70.5K"; the brief writes it without the inner space (mock). */
export const briefBudget = (minor: number) => moneyCompact(minor).replace(/\s+/g, '')

const keysPhrase = (k: string | null) => (k === 'Collected' ? 'keys collected' : 'keys not collected yet')

export function briefsFor(stage: string, lead: BriefLead): Brief[] {
  /* (UX audit 2026-09-30, L8) An unknown budget is stored as 0: the briefs never quote it as "S$0" — a brief built on the figure
     drops out, and the sentences that mention it in passing say it isn't stated. */
  const known = lead.budgetMinor > 0
  const budget = briefBudget(lead.budgetMinor)
  const keys = keysPhrase(lead.keyCollection)
  const { source, propertyType } = lead
  const keep = (...bs: (Brief | null)[]): Brief[] => bs.filter((b): b is Brief => b !== null)

  /* (S42E, E-11) A lead the studio has already met (a Hangout chat held, a meeting written up) is no fresh lead to call within 24h — its first
     brief says it was met and offers to log the meeting as its next stage, by the studio's rule. Invented copy, the briefs' voice. (S42G) The
     same brief for a lead in Contacted whose meeting no Met log holds yet — not "book the meet" for a meeting already held. */
  const metAlready = (met: NonNullable<BriefLead['met']>): Brief => ({
    tag: 'Met already · log the meeting',
    text: [
      { t: `Met ${met.where === 'Video call' ? 'on a video call' : 'in person'} on ${displayDate(met.at)}. ` },   // (the calm UI build — 2-02) the type, budget and keys are the info column's
      { t: met.step ? `Move the lead to ${met.step}:` : 'Log what was said:', bold: true },
      { t: met.step === 'Contacted' ? ' the meeting becomes its first contact, and Met follows.' : ' the meeting becomes its Met log, and the stage card catches up.' },
    ],
    actions: met.step ? [LOG_MEETING, 'Draft meeting recap'] : ['Draft meeting recap', 'Set a follow-up reminder'],
  })

  /* (the calm UI build 2026-10-27 — audit 2-01 · 2-38 · 2-39 · T-09 · Principle 11) Every brief is written from the record — how long the lead
     has been where it is, whether anyone is on it, what is missing — and the "n× more often" figures are gone: they were not the studio's
     numbers. The first brief is the one card the Overview shows; the others only lend their actions to the Maison AI sheet. */
  const who = lead.name || 'The client'
  const whom = lead.name || 'the client'
  const days = lead.daysInStage ?? null
  const waited = days === null ? '' : days === 0 ? ' since today' : ` for ${dayWords(days)}`
  const ago = days === null ? 'recently' : days === 0 ? 'today' : `${dayWords(days)} ago`
  const lostWhy = (lead.lostReason ?? '').replace(/^Others:\s*/, '')
  switch (stage) {
    case 'New':
      if (lead.met) return keep(metAlready(lead.met))
      return keep(
        {
          tag: 'First contact',
          text: lead.owned === false
            ? [{ t: `${who} has been waiting${waited} and no member is on the lead yet. ` }, { t: 'Once someone is on it, call or WhatsApp the same day.', bold: true }]   // the header's filled button is Assign a member — not said twice
            : lead.contacted
              ? [{ t: `A contact with ${whom} is logged. ` }, { t: 'Log it as the Contacted step to move the lead on.', bold: true }]
              : [{ t: `${who} has been waiting${waited} with no contact logged. ` }, { t: 'Call or WhatsApp today.', bold: true }],
          actions: ['Draft intro WhatsApp', 'Book the first meeting'],
        },
        known ? {
          tag: 'Budget',
          text: [{ t: `${budget} on a ${propertyType}. ` }, { t: 'Open with a project of the same kind.', bold: true }],
          actions: ['Pick a portfolio match', 'Suggest a package'],
        } : null,
        {
          tag: 'The first call',
          text: [{ t: `${source} lead, ${keys}. ` }, { t: 'Ask about the move-in date early.', bold: true }],
          actions: ['Build a call script', 'Set a follow-up reminder'],
        },
      )
    case 'Contacted': {
      if (lead.met) return keep(metAlready(lead.met))   // (S42G)
      const briefs: Brief[] = [
        {
          tag: 'First meeting',
          text: [{ t: `In Contacted${waited}. ` }, { t: 'Propose two slots and agree a first meeting.', bold: true }],
          actions: ['Propose meeting slots', 'Draft follow-up WhatsApp'],
        },
        {
          tag: 'Site visit',
          text: [{ t: `${propertyType}, ${keys}. ` }, { t: 'Offer the first meeting on site.', bold: true }],
          actions: ['Plan site visit', 'Send prep checklist'],
        },
      ]
      // "no questionnaire yet" is a claim about the record, not a nudge — with questions on the lead it contradicts the
      // QUESTIONNAIRE card beside it ("7 / 11 answered"), so the brief drops out rather than assert a state it can't see.
      if (!lead.questionnaire?.total) {
        briefs.push({
          tag: 'The brief',
          text: [{ t: known ? `Budget ${budget}, no questionnaire yet. ` : 'No budget or questionnaire yet. ' }, { t: 'Send the questionnaire before the meeting.', bold: true }],
          actions: ['Send questionnaire', 'Summarise call remarks'],   // "notes" → "remarks" outside the Notes tab (REG-267)
        })
      }
      return briefs
    }
    case 'Met':
      return keep(
        {
          tag: 'The quote',
          text: [{ t: `Met ${ago}. ` }, { t: known ? 'Send the quote while the meeting is fresh.' : 'Confirm the budget, then send the quote.', bold: true }],
          actions: ['Start quote from package', 'Draft meeting recap'],
        },
        known ? {
          tag: 'Budget check',
          text: [{ t: `Stated budget ${budget}. ` }, { t: 'Keep the quote close to it.', bold: true }],
          actions: ['Compare to past quotes', 'Flag scope risks'],
        } : null,
        {
          tag: 'While they wait',
          text: [{ t: 'The quote is in progress. ' }, { t: 'Share a moodboard in the meantime.', bold: true }],
          actions: ['Share moodboard', 'Schedule check-in'],
        },
      )
    case 'Quote Sent':
      return keep(
        {
          tag: 'Follow up',
          text: [{ t: `The quote went to ${whom} ${ago}. ` }, { t: 'Check in and ask what would make it a yes.', bold: true }],
          actions: ['Draft check-in message', 'Schedule a call'],
        },
        known ? {
          tag: 'Options',
          text: [{ t: `Quote against a ${budget} budget. ` }, { t: 'Have optional trims ready before they ask.', bold: true }],
          actions: ['Prepare a revised quote', 'List optional trims'],
        } : null,
        {
          tag: 'Close',
          text: [{ t: `${source} clients often compare studios at this stage. ` }, { t: 'Show a finished home of the same kind.', bold: true }],
          actions: ['Attach a client review', 'Offer a site walk-through'],
        },
      )
    case 'Won':
      return [
        lead.project ? {
          tag: 'The project',
          text: [
            { t: `Project ${lead.project.number} ${PROJECT_STAGE_WORDS[lead.project.stage ?? ''] ?? 'carries the work on'}. ` },
            { t: 'Its schedule, money, tasks, files and notes live on the project;', bold: true },   // (one-home N-10) the lead's carried tabs are the project's now
            { t: ' this lead keeps its quotes and contracts.' },
          ],
          actions: [OPEN_PROJECT, 'Summarise the project'],   // (2-39) the card shows the second — the header's filled button is Open project
        } : {
          tag: 'Handover',
          text: [{ t: 'Signed and won. ' }, { t: 'Hand over to the project team — confirm the schedule and the site start date.', bold: true }],
          actions: ['Draft kickoff message', 'Create project checklist'],
        },
        {
          tag: 'Referral',
          text: [{ t: `${who} just said yes. ` }, { t: 'Ask for a review and a referral now.', bold: true }],
          actions: ['Ask for a review', 'Send referral offer'],
        },
      ]
    case 'On Hold':
      return [
        {
          tag: 'On hold',
          text: [{ t: `On hold${waited}. ` }, { t: 'A short check-in now and then keeps the lead warm.', bold: true }],
          actions: ['Draft check-in message', 'Set follow-up reminder'],
        },
        {
          tag: 'News',
          text: [{ t: `${propertyType} client, ${keys}. ` }, { t: 'Share a project of the same type you just finished.', bold: true }],
          actions: ['Share a recent project', 'Offer a revised package'],
        },
      ]
    case 'Lost':
      return [
        /* (2-38) a lost lead whose reason is on record is not asked for it again */
        lead.lostReason ? {
          tag: 'Lost',
          text: [{ t: `Marked lost ${ago} — ${lostWhy.charAt(0).toLowerCase()}${lostWhy.slice(1)}. ` }, { t: 'Keep the door open.', bold: true }],
          actions: ['Send a thank-you note', 'Remind me in 6 months'],
        } : {
          tag: 'Lost',
          text: [{ t: `Marked lost ${ago}. ` }, { t: 'Log why while it is fresh.', bold: true }],
          actions: ['Log loss reason', 'Remind me in 6 months'],
        },
        {
          tag: 'The door',
          text: [{ t: `${source} clients often renovate again. ` }, { t: 'Send a short thank-you note.', bold: true }],
          actions: lead.lostReason ? ['Log loss reason', 'Remind me in a year'] : ['Send a thank-you note', 'Remind me in a year'],   // (pending modules S10) *(invented copy)*
        },
      ]
    default:
      // Unknown stage (defensive): the mock's brief still reads correctly for any lead.
      return briefsFor('New', lead).slice(0, 1)
  }
}
