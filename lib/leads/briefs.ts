/**
 * Maison AI briefs — the scripted list behind the Lead Overview's "MAISON AI BRIEF" card (858:24867).
 * The first brief is the stage's primary nudge (the card shown at rest); the rest stack below it behind
 * Show more (REG-237).
 *
 * The first brief for New is the mock's copy verbatim (Olivia Martinez frame, 858:24770). Every other brief —
 * the extra New briefs and all briefs for Contacted / Met / Quote Sent / Won / On Hold / Lost — is INVENTED COPY
 * pending designer sign-off (REG-1xx: AI briefs scripted per stage; New = mock, the rest invented in the same
 * voice: one situational sentence, one bold nudge with a figure, one consequence; two 36px outlined actions).
 *
 * Pure data: no clock, no randomness — the list order is stable across renders and reloads.
 */
import { moneyCompact } from '@/lib/format'

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
}

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

  switch (stage) {
    case 'New':
      return keep(
        {
          // Mock verbatim (858:24867).
          tag: 'Fresh lead · respond fast',
          text: [
            { t: `New inquiry from ${source} — ${propertyType}, ${known ? `${budget} budget` : 'budget not stated'}, ${keys}.${lead.contacted ? '' : ' No contact yet.'} ` },
            { t: 'Call or WhatsApp within 24h:', bold: true },
            { t: ' leads contacted same-day reach Met 3.1× more often.' },
          ],
          actions: ['Draft intro WhatsApp', 'Auto-schedule first meet'],
        },
        known ? {
          tag: 'Budget fit · strong match',
          text: [
            { t: `${budget} on a ${propertyType} sits in your studio's sweet spot. ` },
            { t: 'Open with a matching portfolio piece:', bold: true },
            { t: ' leads shown a like-for-like project on the first call book a meet 2.2× more often.' },
          ],
          actions: ['Pick a portfolio match', 'Suggest a package'],
        } : null,
        {
          tag: 'Prepare the first call',
          text: [
            { t: `${source} lead, ${keys}. ` },
            { t: 'Ask about the move-in date early:', bold: true },
            { t: ' timeline-driven clients decide on a designer within a week of first contact.' },
          ],
          actions: ['Build a call script', 'Set a follow-up reminder'],
        },
      )
    case 'Contacted': {
      const briefs: Brief[] = [
        {
          tag: 'Keep momentum · book the meet',
          text: [
            { t: 'First contact logged. ' },
            { t: 'Propose two slots and lock one in today:', bold: true },
            { t: ' leads met within 7 days of contact convert to Met 2.4× more often.' },
          ],
          actions: ['Propose meeting slots', 'Draft follow-up WhatsApp'],
        },
        {
          tag: 'Site visit prep',
          text: [
            { t: `${propertyType}, ${keys}. ` },
            { t: 'Offer the first meet on site:', bold: true },
            { t: ' on-site first meetings move to Quote Sent 1.6× faster than showroom ones.' },
          ],
          actions: ['Plan site visit', 'Send prep checklist'],
        },
      ]
      // "no questionnaire yet" is a claim about the record, not a nudge — with questions on the lead it contradicts the
      // QUESTIONNAIRE card beside it ("7 / 11 answered"), so the brief drops out rather than assert a state it can't see.
      if (!lead.questionnaire?.total) {
        briefs.push({
          tag: 'Qualify the brief',
          text: [
            { t: known ? `Budget ${budget}, no questionnaire yet. ` : 'No budget or questionnaire yet. ' },
            { t: 'Send the questionnaire before the meet:', bold: true },
            { t: ' briefs answered in advance cut the first meeting by 25 minutes.' },
          ],
          actions: ['Send questionnaire', 'Summarise call remarks'],   // "notes" → "remarks" outside the Notes tab (REG-267)
        })
      }
      return briefs
    }
    case 'Met':
      return keep(
        {
          tag: 'Quote window · 5 days',
          text: [
            { t: 'Meeting logged. ' },
            { t: 'Send the quote within 5 days:', bold: true },
            { t: ` quotes sent inside the window win 1.8× more often — start from the ${propertyType} package and ${known ? `fit it to ${budget}` : 'confirm the budget first'}.` },
          ],
          actions: ['Start quote from package', 'Draft meeting recap'],
        },
        known ? {
          tag: 'Budget check',
          text: [
            { t: `Stated budget ${budget}. ` },
            { t: 'Quote within 10% of the stated figure:', bold: true },
            { t: ' quotes further out get renegotiated twice as often before signing.' },
          ],
          actions: ['Compare to past quotes', 'Flag scope risks'],
        } : null,
        {
          tag: 'Keep the client warm',
          text: [
            { t: 'The quote is in progress. ' },
            { t: 'Share a moodboard while they wait:', bold: true },
            { t: ' clients who see a direction before the quote accept it 1.4× more often.' },
          ],
          actions: ['Share moodboard', 'Schedule check-in'],
        },
      )
    case 'Quote Sent':
      return keep(
        {
          tag: 'Follow up · day 3',
          text: [
            { t: 'Quote sent. ' },
            { t: 'Check in on day 3 and ask what would make it a yes:', bold: true },
            { t: ' most quotes are decided within 10 days of sending.' },
          ],
          actions: ['Draft check-in message', 'Schedule a call'],
        },
        known ? {
          tag: 'Negotiation ready',
          text: [
            { t: `Quote against a ${budget} budget. ` },
            { t: 'Prepare optional trims before they ask:', bold: true },
            { t: ' a ready alternative closes 1.5× more often than a reworked quote.' },
          ],
          actions: ['Prepare a revised quote', 'List optional trims'],
        } : null,
        {
          tag: 'Close with confidence',
          text: [
            { t: `${source} clients compare two to three studios at this stage. ` },
            { t: 'Send a recent client review with the follow-up:', bold: true },
            { t: ' social proof lifts sign rate by 20%.' },
          ],
          actions: ['Attach a client review', 'Offer a site walk-through'],
        },
      )
    case 'Won':
      return [
        {
          tag: 'Project kickoff',
          text: [
            { t: 'Signed and won. ' },
            { t: 'Hand over to the project team within 48h:', bold: true },
            { t: ' fast handovers keep clients at 4.8★ — confirm the milestone schedule and site start date.' },
          ],
          actions: ['Draft kickoff message', 'Create project checklist'],
        },
        {
          tag: 'Referral moment',
          text: [
            { t: 'The client just said yes. ' },
            { t: 'Ask for a review and a referral now:', bold: true },
            { t: ' requests made at signing are answered 3× more often than after handover.' },
          ],
          actions: ['Ask for a review', 'Send referral offer'],
        },
      ]
    case 'On Hold':
      return [
        {
          tag: 'Parked · set a nudge',
          text: [
            { t: 'Lead is on hold. ' },
            { t: 'Schedule a light check-in every 2 weeks:', bold: true },
            { t: ' parked leads that hear from you resume 3× more often than ones left alone.' },
          ],
          actions: ['Draft check-in message', 'Set follow-up reminder'],
        },
        {
          tag: 'Re-engage with news',
          text: [
            { t: `${propertyType} client, ${keys}. ` },
            { t: 'Share a just-completed project of the same type:', bold: true },
            { t: ' a fresh reference is the most common reason a parked lead comes back.' },
          ],
          actions: ['Share a recent project', 'Offer a revised package'],
        },
      ]
    case 'Lost':
      return [
        {
          tag: 'Learn from the loss',
          text: [
            { t: 'Lead marked lost. ' },
            { t: 'Log the reason while it is fresh:', bold: true },
            { t: ' studios that record why sharpen their next quotes — and know when a revisit makes sense.' },
          ],
          actions: ['Log loss reason', 'Set a 6-month revisit'],
        },
        {
          tag: 'Keep the door open',
          text: [
            { t: `${source} clients often renovate again within 5 years. ` },
            { t: 'Send a short thank-you note:', bold: true },
            { t: ' lost leads who part on good terms return or refer 1 time in 6.' },
          ],
          actions: ['Send a thank-you note', 'Add to newsletter list'],
        },
      ]
    default:
      // Unknown stage (defensive): the mock's brief still reads correctly for any lead.
      return briefsFor('New', lead).slice(0, 1)
  }
}
