/**
 * (pending modules S10 — 1.0's mAIson `draft_client_message` · `draft_followup_message` and its "Draft Follow-up" chip, from a model) The
 * WhatsApp messages Maison AI drafts from a lead's record, by rule — pure and client-safe, ONE copy: the lead page's brief buttons
 * (components/leads/detail/use-lead-maison.ts) and the Ask box's "Draft a follow-up for …" (lib/maison-ai/answer.ts) read the same words. A
 * draft only opens in WhatsApp on the press; the studio reads it there and sends it. The words are the briefs' voice (lib/leads/briefs.ts,
 * REG-169 — her sign-off owed). *(invented copy)*
 */
import { displayDayMonth } from '@/lib/format'

export type DraftLead = {
  name: string
  propertyType: string
  stage: string
  /** the latest quote's number, when there is one */
  quoteNumber?: string | null
  /** the last meeting logged at Met */
  meeting?: { at: Date | null; where: string | null } | null
  /** the lead is on its project (Won with a project, or a client who came directly) */
  onProject?: boolean
}

const first = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const DRAFTS = {
  intro: (l: DraftLead, me: string | null) => `Hi ${first(l.name)}, ${me ? `this is ${me} — ` : ''}thank you for your enquiry about your ${l.propertyType}. When would be a good time for a quick call to hear what you have in mind?`,
  followUp: (l: DraftLead) => `Hi ${first(l.name)}, thank you for the chat. Would you like to set a time to meet and go through your ${l.propertyType} plans?`,
  meetingSlots: (l: DraftLead, a: Date, b: Date) => `Hi ${first(l.name)}, would ${displayDayMonth(a)} at 11:00 AM or ${displayDayMonth(b)} at 3:00 PM work for a first meeting about your ${l.propertyType}?`,
  prepChecklist: (l: DraftLead) => `Hi ${first(l.name)}, to make our first meeting count, could you send your floor plan, a few photos of the space, a budget range, when you collect the keys and any must-haves? Thank you!`,
  meetingRecap: (l: DraftLead) => `Hi ${first(l.name)}, thank you for meeting us${l.meeting?.at ? ` on ${displayDayMonth(l.meeting.at)}` : ''}${l.meeting?.where ? ` at ${l.meeting.where}` : ''}. As discussed, we’ll prepare the quote for your ${l.propertyType} and send it to you shortly.`,
  checkIn: (l: DraftLead) => (l.stage === 'On Hold'
    ? `Hi ${first(l.name)}, hope you’re well! Just checking in on your ${l.propertyType} plans — whenever you’re ready to pick things up again, we’re here to help.`
    : `Hi ${first(l.name)}, just checking in on ${l.quoteNumber ? `quote ${l.quoteNumber}` : 'the quote we sent'} for your ${l.propertyType}. Is there anything you’d like us to change or explain? Happy to go through it on a call.`),
  walkThrough: (l: DraftLead) => `Hi ${first(l.name)}, would you like to see one of our finished ${l.propertyType} homes in person? We’d be happy to arrange a walk-through.`,
  kickoff: (l: DraftLead) => `Hi ${first(l.name)}, thank you for choosing us! We’re setting up your project now and will share the schedule and the site start date shortly.`,
  /** (S10) a client on their project — the works under way */
  projectCheckIn: (l: DraftLead) => `Hi ${first(l.name)}, just checking in on your renovation. Is there anything you’d like to ask us about the works this week?`,
  /** (pending modules S14) with the studio's review link (Company › Profile › Reviews) when it has one; a finished project thanks them for the
      renovation, a Won lead for trusting the studio so far */
  review: (l: DraftLead, link: string | null = null, done = false) => `Hi ${first(l.name)}, thank you again for trusting us with your ${l.propertyType}. If you have a moment, a short review of ${done ? 'your renovation' : 'your experience so far'} would mean a lot to our team${link ? ` — you can leave it here: ${link}` : '.'}`,
  referral: (l: DraftLead) => `Hi ${first(l.name)}, if friends or family are planning a renovation, we’d be glad to look after them too — just pass them our number.`,
  thankYou: (l: DraftLead) => `Hi ${first(l.name)}, thank you for considering us for your ${l.propertyType}. We hope the renovation goes smoothly — if we can ever help, we’re a message away.`,
} as const

/** The follow-up the Ask box drafts for a lead where it stands — what the lead page's brief offers at that stage, in its words. */
export function stageDraft(l: DraftLead, me: string | null): { what: string; text: string } {
  if (l.onProject) return { what: 'a check-in on the works', text: DRAFTS.projectCheckIn(l) }
  switch (l.stage) {
    case 'New': return { what: 'an intro', text: DRAFTS.intro(l, me) }
    case 'Contacted': return { what: 'a follow-up', text: DRAFTS.followUp(l) }
    case 'Met': return { what: 'a meeting recap', text: DRAFTS.meetingRecap(l) }
    case 'Quote Sent': return { what: 'a check-in on the quote', text: DRAFTS.checkIn(l) }
    case 'Won': return { what: 'a kickoff note', text: DRAFTS.kickoff(l) }
    case 'On Hold': return { what: 'a check-in', text: DRAFTS.checkIn(l) }
    case 'Lost': return { what: 'a thank-you note', text: DRAFTS.thankYou(l) }
    default: return { what: 'a follow-up', text: DRAFTS.followUp(l) }
  }
}
