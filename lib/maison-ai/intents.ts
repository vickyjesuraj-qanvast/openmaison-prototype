/**
 * (parity map 2026-10-10 — TD-107 · SC-060 · FB-118 · PR-059: 1.0's mAIson bot answered free questions about compliance, a milestone, the books
 * and made projects) Maison AI's **Ask** box, by rule — pure and client-safe. Nothing here calls a model: a question is read against a table of
 * intents (the words each one answers to), and the server answers the one it matches from the studio's own records
 * (lib/maison-ai/answer.ts). A question that matches nothing is answered with what Maison AI can answer, as questions to press. A stand-in for
 * 1.0's language model — the sheet says only "Answers from your records".
 */
import { PROPERTY_TYPES, SOURCES } from '@/lib/leads/enums'
import type { MoveStep } from '@/lib/leads/move-link'

export type IntentId =
  | 'late' | 'next' | 'milestone'
  | 'compliance_rules' | 'compliance_project' | 'compliance_studio'
  | 'owed' | 'gst' | 'margin' | 'vendors' | 'commission'
  | 'start_project'
  /* (pending modules S05 — card held:leads, "Maison AI creates or updates a lead and moves its stage · revisit: it already does this for projects
     (REG-1645)"; 1.0's mAIson create_lead · update_lead) a lead added, moved or changed — the house form or window opens filled, never a write */
  | 'add_lead' | 'move_lead' | 'edit_lead'
  /* (pending modules S10 — cards studio:maison-assistant · api:maison-bot-assistant: "leads, tasks, quotes and team questions", "money questions
     answered as reports", "changes by chat … behind a confirm", "drafts", "attach a file") the rest of what 1.0's mAIson answered, by rule */
  | 'my_tasks' | 'leads_attention' | 'lead_about' | 'quotes' | 'team' | 'member_role' | 'overview'
  | 'pnl' | 'cashflow' | 'expenses' | 'repeats' | 'stop_repeat' | 'statement' | 'credit_notes' | 'credits' | 'setup'
  | 'record_payment' | 'money_new' | 'remind' | 'draft_message' | 'task_done' | 'attach' | 'help'
  /* (pending modules S10 — card held:maison-ai, the tool pages' words-only suggestions made to act) the client's side of the tools */
  | 'renders_picked' | 'designs_waiting' | 'renders_by_lead' | 'layouts_opened' | 'portal_signin' | 'portal_sees' | 'portal_opened' | 'studios_portal' | 'issues' | 'plan'
  /* (pending modules S10) 1.0's approve_expense · review_purchase_order (what waits for my OK) and its "Site Update" one-tap prompt */
  | 'approvals' | 'site_update'
  /* (pending modules S18 — the note after S10) "what did I miss today?" — the daily summary's own rows, read from the bell now */
  | 'missed'
  /* (pending modules S23 — S10's note "prepare me for my next meeting" answers from the records) the meetings: the next one's prep, and the week's */
  | 'next_meeting' | 'meetings'
  /* (pending modules S29 — card api:ai-writing-help-quotes) "improve / shorten / plain English the terms…" asked where no page suggestion matches */
  | 'writing'
  /* (pending modules S37 — cards onboarding:qanvast-listing-verification · studio:verify-listing) "are we listed on Qanvast?" — the listing's state */
  | 'qanvast_listing'
  /* (pending modules S41b-5) the studio's Qanvast account — its lead credits, its reviews and rank (Qanvast Ops › Lead credits · Reviews) */
  | 'qanvast_credits' | 'qanvast_reviews'

/** Where the question was asked: the project page it was asked on, the milestone it is about (the milestone panel's "Ask Maison AI about this"). */
export type AskContext = { projectId: string | null; milestoneId: string | null }

export type ComplianceKindWord = 'hdb' | 'condo' | 'landed'
export type PhaseWord = 'design' | 'execution' | 'handover'
export type AskParams = {
  kind?: ComplianceKindWord; phase?: PhaseWord; topic?: string
  /** the question names this project ("on this project", "here") — a studio-wide intent keeps to the page's project */
  here?: boolean
  quarter?: 'this' | 'last'
  /** Start a project: what the question gives — "start a project for Mr Lim, 9123 4567, HDB 4-Room" */
  client?: string; phone?: string; propertyType?: string
  /** (pending modules S05) Add a lead: its budget in dollars, its source, its email · Move a lead: the step · Edit a lead: the field */
  budget?: number; source?: string; email?: string; step?: MoveStep; field?: LeadField
  /** (pending modules S10) a money record to start, an amount named, which quotes, a role named, a reminder for the lead's members */
  moneyKind?: MoneyKind; amount?: number; quoteScope?: QuoteScope; role?: string; followUp?: boolean; ageing?: boolean
}
/** (pending modules S10) What "raise a … for Benjamin" starts on a project's Money — each the house form, opened for it. */
export type MoneyKind = 'vo' | 'one-off' | 'po' | 'expense' | 'bill' | 'stage'
export const MONEY_KIND_WORDS: Record<MoneyKind, string> = { vo: 'a variation order', 'one-off': 'a one-off invoice', po: 'a purchase order', expense: 'an expense', bill: 'a supplier bill', stage: 'the next stage invoice' }
/** (pending modules S10) Which quotes a question asks after. */
export type QuoteScope = 'approval' | 'expiring' | 'unanswered' | 'drafts' | 'all'
/** (pending modules S05) The lead fields "change …'s budget" can name — Edit Lead opens on that field. */
export type LeadField = 'budget' | 'phone' | 'email' | 'propertyType' | 'propertyAddress' | 'source' | 'district' | 'nric' | 'name'
export const LEAD_FIELD_WORDS: Record<LeadField, string> = { budget: 'budget', phone: 'phone number', email: 'email', propertyType: 'property type', propertyAddress: 'property address', source: 'lead source', district: 'district', nric: 'NRIC / FIN', name: 'name' }
export type Match = { id: IntentId; params: AskParams; score: number }

type IntentDef = { id: IntentId; words: [RegExp, number][]; needs?: 'project' | 'milestone'; /** (S10) words that rule it out */ unless?: RegExp }
const W = (re: RegExp, n: number): [RegExp, number] => [re, n]

/* The words each intent answers to, and their weight — the strongest total wins; ties go to the earlier row. Money words outweigh the schedule's
   ("overdue invoices" is money), a milestone named outweighs "late". */
const INTENTS: IntentDef[] = [
  /* (pending modules S05) the leads' own: a stage move outweighs an edit ("set Mrs Tan to Met"), an edit names a field */
  { id: 'move_lead', words: [W(/\b(move|mark|put|set|change|shift|bring|take)\b[^.?!]{0,60}\b(to|as|on|into)\s+(contacted|met|quote sent|won|on hold|hold|lost)\b/, 7), W(/\bmark(ed)?\b[^.?!]{0,40}\b(won|lost)\b/, 7), W(/\bput\b[^.?!]{0,40}\bon hold\b/, 7)] },
  /* (pending modules S10) the changes Maison AI proposes behind one confirm — they outweigh the questions their words also hold */
  { id: 'stop_repeat', words: [W(/\b(stop|cancel|end|pause|halt)\b[^.?!]{0,30}\b(repeat(s|ing)?|recurring|rent|subscriptions?|retainer|monthly|weekly|yearly)\b/, 8)] },
  { id: 'task_done', words: [W(/\b(mark|tick|set|check)\b[^.?!]{0,60}\b(done|complete|completed|finished)\b/, 7), W(/\b(i'?ve |i have )?(done|finished|completed)\b[^.?!]{0,10}\bthe\b[^.?!]{0,40}\btask\b/, 7)], unless: /\bmilestones?\b/ },
  { id: 'remind', words: [W(/\bremind (me|us)\b/, 8), W(/\b(add|create|make|set|put|log|new)\b[^.?!]{0,20}\b(task|reminder|to-?do)\b/, 7), W(/\bset (up )?(a )?follow[- ]?up\b/, 7), W(/^follow[- ]?up with\b/, 7)] },
  /* (pending modules S29) the writing help, asked in words: it sits where the words are written — the answer says where, and how it works */
  { id: 'writing', words: [W(/\b(improve|shorten|tidy|polish|reword|rewrite|simplify|expand|proof-?read|spell ?check)\b[^.?!]{0,40}\b(terms|t&cs?|t and c|notes|descriptions?|wording|words|text|writing|contract|clauses?|letter|intro(duction)?|messages?)\b/, 9), W(/\bplain english\b/, 7), W(/\b(grammar|spelling)\b/, 4)] },
  { id: 'draft_message', words: [W(/\b(draft|write|compose|prepare|type)\b[^.?!]{0,40}\b(messages?|whatsapps?|follow[- ]?ups?|texts?|notes?|replies|reply|intro|check-?ins?)\b/, 8), W(/\bwhatsapp\b/, 3)] },
  { id: 'site_update', words: [W(/\b(site|progress|weekly|project) update\b/, 7), W(/\b(write|draft|post|send)\b[^.?!]{0,30}\bupdates?\b/, 7)], unless: /\bwhich updates\b|\bupdates? (waiting|to review|for review)\b/ },
  { id: 'approvals', words: [W(/\b(approve|approvals?|sign off|sign-off|my ok|waiting for me|needs? my (ok|approval))\b/, 6)], unless: /\bquotes?\b/ },
  { id: 'add_lead', words: [W(/\b(add|create|new|make|log|enter|record|key in)\b[^.?!]{0,30}\b(leads?|enquir(y|ies))\b/, 6), W(/\bnew lead\b/, 6)] },
  { id: 'edit_lead', words: [W(/\b(update|change|edit|correct|fix|set)\b[^.?!]{0,50}\b(budget|phone|number|mobile|email|address|property type|source|district|nric|name)\b/, 5)] },
  { id: 'start_project', words: [W(/\b(start|create|make|open|set up|add)\b[^.?!]{0,30}\bprojects?\b/, 6), W(/\bnew project\b/, 6)] },
  { id: 'member_role', words: [W(/\bmake\b[^.?!]{0,30}\b(an? )?(admin|owner|designer|manager|accounting)\b/, 7), W(/\b(change|set|update)\b[^.?!]{0,30}\broles?\b/, 6), W(/\b(promote|demote)\b/, 6)] },
  { id: 'record_payment', words: [W(/\brecord(ed)?\b[^.?!]{0,20}\bpayments?\b/, 7), W(/\b(has |have |just |already )?paid\b/, 5), W(/\b(payment|transfer|money)\b[^.?!]{0,15}\b(came|come|received|arrived)\b/, 5)],
    unless: /\b(hasn'?t|haven'?t|not|never|yet to|who|which)\b[^.?!]{0,14}\bpaid\b|\bunpaid\b|\bpaid (out|back)\b/ },
  { id: 'money_new', words: [W(/\b(raise|create|make|new|add|record|log|issue|draft|prepare)\b[^.?!]{0,30}\b(variation orders?|vos?|purchase orders?|pos?|one-?off invoices?|invoices?|expenses?|claims?|supplier bills?|bills?)\b/, 7),
    W(/\b(generate|send|raise)\b[^.?!]{0,30}\b(milestone|stage|progress|next) (invoices?|payments?|bills?)\b/, 8), W(/^invoice\s+[a-z]/, 6)] },
  { id: 'owed', words: [W(/\b(owe|owes|owed|owing|outstanding|unpaid|receivables?|debtors?|chase|collect(ed|ion)?)\b/, 4), W(/\b(hasn'?t|haven'?t|not) (yet )?paid\b/, 4), W(/\boverdue invoices?\b|\binvoices? (that are |are )?(overdue|late)\b/, 4), W(/\binvoices?\b/, 1), W(/\boverdue\b/, 1), W(/\bpay(ment)?s?\b/, 1), W(/\b(ageing|aging|by age|how late)\b/, 2)] },
  { id: 'gst', words: [W(/\bgst\b/, 6), W(/\btax(es)?\b/, 4), W(/\bquarter(ly)?\b/, 1), W(/\b(return|iras|file)\b/, 1)] },
  { id: 'pnl', words: [W(/\b(p ?& ?l|p and l|profit and loss|income statement|revenue|turnover|sales)\b/, 6), W(/\bhow much (did|have|has) (we|i|the studio) (make|made|earn|earned|invoice|invoiced|bill|billed)\b/, 6)] },
  { id: 'margin', words: [W(/\b(margins?|profits?|profitab(le|ility)|losing money|making money|thinnest|earn(ing)?s?)\b/, 5)] },
  { id: 'cashflow', words: [W(/\bcash ?-?flow\b/, 7), W(/\b(money (coming )?in|coming in|money out|next 90 days|forecast|runway|cash position)\b/, 4)] },
  /* what the studio owes is the vendors' side ("what do we owe", "payables") — never "who owes the studio" */
  { id: 'vendors', words: [W(/\b(vendors?|suppliers?|sub-?cons?|subcontractors?)\b/, 3), W(/\b(spend|spent|spending|costs?|paid out|purchase orders?|pos?|bills?)\b/, 2), W(/\b(we|i|do we|does the studio|studio) owes?\b|\bowe (the )?(vendors?|suppliers?)\b|\bpayables?\b/, 5)] },
  { id: 'repeats', words: [W(/\b(repeat(s|ing)?|recurring|every (week|month|year)|monthly|weekly|yearly|subscriptions?|retainer|rent)\b/, 5)] },
  { id: 'expenses', words: [W(/\bexpenses?\b/, 4), W(/\b(claims?|receipts?)\b/, 2)] },
  { id: 'commission', words: [W(/\bcommissions?\b/, 6)] },
  { id: 'statement', words: [W(/\b(statement of account|statements?|soa)\b/, 6)] },
  { id: 'credit_notes', words: [W(/\bcredit notes?\b/, 6), W(/\b(use|apply|put)\b[^.?!]{0,40}\bcredits?\b/, 7), W(/\boverpa(id|yments?)\b/, 6)], unless: /\bai credits?\b/ },
  { id: 'credits', words: [W(/\bai credits?\b/, 7), W(/\bcredits?\b[^.?!]{0,20}\b(left|balance|remaining|last|refresh|reset|renew)\b/, 6), W(/\bhow many credits\b/, 7)], unless: /\blead credits?\b|\bqanvast\b/ },   // (pending modules S41b-5) Qanvast's lead credits are their own
  /* (pending modules S10) the tools and the client's side — their pages' suggestions, asked */
  { id: 'studios_portal', words: [W(/\bstudios?\b[^.?!]{0,40}\bportal\b/, 8)] },
  { id: 'renders_picked', words: [W(/\b(renders?|versions?)\b[^.?!]{0,40}\b(pick(ed|s)?|cho(se|sen|ose)|liked?|loved?|favourit\w*|favorit\w*|hearted)\b|\b(pick(ed|s)?|cho(se|sen|ose)|liked?|favourit\w*)\b[^.?!]{0,30}\brenders?\b/, 7)] },
  { id: 'designs_waiting', words: [W(/\bdesigns?\b[^.?!]{0,30}\b(waiting|waits|pending|no (reply|answer)|not answered)\b/, 7)] },
  { id: 'renders_by_lead', words: [W(/\bleads?\b[^.?!]{0,20}\b(had|have|with|got)\b[^.?!]{0,10}\brenders?\b|\brenders?\b[^.?!]{0,20}\b(by|per|for each) leads?\b/, 7)] },
  { id: 'layouts_opened', words: [W(/\blayouts?\b[^.?!]{0,40}\b(opened|seen|viewed|looked)\b|\b(opened|seen|viewed)\b[^.?!]{0,30}\blayouts?\b/, 7)] },
  { id: 'portal_signin', words: [W(/\b(sign|log)(s|ging)? ?(in|on)\b[^.?!]{0,30}\bportal\b|\bportal\b[^.?!]{0,30}\b(sign|log)(s|ging)? ?(in|on)\b/, 7)] },
  { id: 'portal_opened', words: [W(/\b(opened|visited|used|uses|signed in to|logged in to|been on)\b[^.?!]{0,30}\bportal\b|\bportal\b[^.?!]{0,30}\b(opened|visits?|this week)\b/, 6)] },
  { id: 'portal_sees', words: [W(/\b(clients?|homeowners?)\b[^.?!]{0,20}\b(see|sees|seeing|view)\b/, 6), W(/\bportal\b/, 1)] },
  { id: 'issues', words: [W(/\b(issues?|tickets?|complaints?|problems?)\b/, 4), W(/\b(reported|raised|this week)\b/, 2)] },
  { id: 'plan', words: [W(/\b(which|what|right) plan\b|\bplan (fits|suits)\b/, 7), W(/\bannual(ly)?\b|\byearly (billing|plan|price)\b/, 6)] },
  /* (pending modules S37) the studio's listing on Qanvast — it outweighs Qanvast's leads and set-up's "get started" */
  { id: 'qanvast_listing', words: [W(/\b(listed|listing|list (us|me|my studio|the studio)|verif\w*|appl(y|ied|ication))\b[^.?!]{0,40}\bqanvast\b|\bqanvast\b[^.?!]{0,40}\b(listed|listing|verif\w*|appl(y|ied|ication))\b/, 9)] },
  /* (pending modules S41b-5) Qanvast's lead credits and the studio's Qanvast reviews — they outweigh the AI credits and the quotes' "reviews" */
  { id: 'qanvast_credits', words: [W(/\b(lead|qanvast) credits?\b/, 9), W(/\bcredits?\b[^.?!]{0,30}\bqanvast\b|\bqanvast\b[^.?!]{0,30}\bcredits?\b/, 9)] },
  { id: 'qanvast_reviews', words: [W(/\b(reviews?|rating|rated|rank(ed|ing)?)\b[^.?!]{0,30}\bqanvast\b|\bqanvast\b[^.?!]{0,30}\b(reviews?|rating|rated|rank(ed|ing)?)\b/, 9), W(/\breviews?\b[^.?!]{0,30}\b(waiting|unanswered|to reply|reply to|respond)\b/, 7)], unless: /\bquotes?\b/ },
  { id: 'setup', words: [W(/\b(set ?up|setup)\b[^.?!]{0,30}\b(left|still|remaining|missing|finish(ed)?)\b/, 6), W(/\b(left|still|what) to set ?up\b/, 6), W(/\bset ?up (the |my |our )?studio\b/, 6), W(/\b(get(ting)? started|onboarding)\b/, 4)] },
  { id: 'quotes', words: [W(/\bquotes?\b/, 3), W(/\b(optimi[sz]e|improve|check|review)\b[^.?!]{0,20}\bquote\b/, 3), W(/\b(approv\w*|pending|waiting|expir\w*|valid|unanswered|no (reply|answer)|not (answered|replied)|signed|confirmed|drafts?|sent|open|this week)\b/, 2)] },
  /* (pending modules S23) before "my_tasks" and "next": a meeting named wins */
  { id: 'next_meeting', words: [W(/\b(prepare|prep|brief|ready|get me ready)\b[^.?!]{0,40}\bmeeting\b/, 8), W(/\bnext meeting\b/, 7), W(/\bmeeting (prep|brief)\b/, 7)] },
  { id: 'meetings', words: [W(/\bmeetings?\b/, 4), W(/\b(this week|today|tomorrow|upcoming|coming up|planned|booked)\b/, 1), W(/\bbriefs?\b[^.?!]{0,30}\b(save|saved|waiting|to save)\b/, 6)] },
  { id: 'my_tasks', words: [W(/\b(my|i|me)\b[^.?!]{0,30}\btasks?\b/, 5), W(/\btasks?\b/, 3), W(/\b(today|overdue|late|due|this week|tomorrow)\b/, 1), W(/\bto-?do list\b|\bmy to-?dos?\b/, 3),
    W(/\b(what do i|what should i|what have i got|what'?s on|what is on)\b[^.?!]{0,30}\b(today|tomorrow|this week|to do)\b/, 5)] },
  { id: 'leads_attention', words: [W(/\bleads?\b[^.?!]{0,40}\b(need(s|ing)?|attention|follow(ed)?[- ]?up|chase|waiting|stuck|cold|untouched|no contact|not contacted|unassigned|no (member|owner|one)|unseen|new)\b|\b(need(s|ing)?|attention|follow[- ]?up|chase|untouched|unassigned|unseen|new)\b[^.?!]{0,40}\bleads?\b/, 5),
    W(/\b(which|how many|show|list|any|summar\w*|this week|today)\b/, 2), W(/\b(unassigned|unseen|not contacted|no contact yet)\b/, 3)] },
  { id: 'team', words: [W(/\b(team|members?|designers?|staff|workload|capacity)\b/, 3), W(/\b(who is|who's|whos)\b[^.?!]{0,20}\b(busy|free|on|working)\b/, 3), W(/\bworking on\b/, 3)] },
  /* (pending modules S18) what the member missed — their bell's unread notices and what is due; outweighs the overview's "what's new" */
  { id: 'missed', words: [W(/\bwhat (did|have) i miss(ed)?\b|\bdid i miss\b|\bi'?ve missed\b|\bmissed\b/, 8), W(/\b(my|any|the) (notifications?|notices?|bell)\b|\bunread\b/, 7), W(/\b(my|daily|today'?s) (summary|digest)\b|\bdigest\b/, 7), W(/\bsince (yesterday|my last|the last)\b/, 3)] },
  { id: 'overview', words: [W(/\b(overview|summary|summari[sz]e (the |my |our )?(studio|business|week|day)|how (are|is) (we|the studio|business|things) (doing|going)|what'?s (happening|new)|catch me up|brief me|morning brief|today'?s plan)\b/, 6)] },
  { id: 'attach', words: [W(/\b(read|scan|upload|attach|analy[sz]e|digiti[sz]e|check|look at)\b[^.?!]{0,40}\b(pdf|files?|photos?|pictures?|images?|screenshots?|competitor'?s?|floor ?plans?)\b/, 6), W(/\b(render|visuali[sz]e|moodboard|3-?d|floor ?plans?)\b/, 4)] },
  { id: 'help', words: [W(/\b(what can you (do|answer)|what do you (know|do)|help me|how (do|does) (this|maison)|who are you|what are you)\b/, 6), W(/^help\b/, 6)] },
  { id: 'compliance_studio', words: [W(/\b(casetrust|bizsafe|acra|bizfile|drc|directory of renovation|bca|accreditations?|registrations?|licen[cs]es?)\b/, 5), W(/\b(studio|our|my company)\b/, 1)] },
  { id: 'compliance_rules', words: [W(/\b(rules?|permits?|regulations?|allowed|approvals?|apply|law|legal|requirements?|need to)\b/, 3), W(/\bcompliance\b/, 2), W(/\b(hdb|bto|flat|condo|condominium|executive condo|ec|landed|terrace|bungalow|semi-?d)\b/, 2)] },
  { id: 'compliance_project', words: [W(/\bcompliance\b/, 3), W(/\b(open|to do|todo|still|left|outstanding|missing|tick(ed)?)\b/, 1), W(/\b(this project|this one|here)\b/, 2)], needs: 'project' },
  { id: 'milestone', words: [W(/\b(this milestone|this stage|about this)\b/, 6), W(/\b(milestone|stage)\b/, 1)], needs: 'milestone' },
  { id: 'late', words: [W(/\b(late|overdue|behind|delayed|delays?|slipp(ing|ed)|running over)\b/, 3), W(/\b(milestones?|schedule|stages?|works?|site)\b/, 1)] },
  { id: 'next', words: [W(/\b(next|coming up|upcoming|this week|next week|starts?|starting|due soon|ahead|soon)\b/, 3), W(/\b(milestones?|schedule|stages?|works?)\b/, 1)] },
  /* (pending modules S10) asked about someone by name — "tell me about Olivia", "how is Jonathan doing": the answer reads the name it finds */
  { id: 'lead_about', words: [W(/\b(about|status|how is|how's|where (is|are)|update on|what'?s happening with|tell me|details?|info)\b/, 3)] },
]

const norm = (q: string) => q.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

/** The kind of home a question names. */
export function kindOf(q: string): ComplianceKindWord | undefined {
  const s = norm(q)
  if (/\b(landed|terrace|bungalow|semi-?d|cluster house)\b/.test(s)) return 'landed'
  if (/\b(condo|condominium|executive condo|ec|penthouse)\b/.test(s)) return 'condo'
  if (/\b(hdb|bto|flat|resale)\b/.test(s)) return 'hdb'
  return undefined
}
/** The phase a question names. */
export function phaseOf(q: string): PhaseWord | undefined {
  const s = norm(q)
  if (/\b(handover|hand over|completion|after the works|at the end|final)\b/.test(s)) return 'handover'
  if (/\b(during|on site|while|execution|works start(ed)?)\b/.test(s)) return 'execution'
  if (/\b(before|design|permit stage|start of|planning)\b/.test(s)) return 'design'
  return undefined
}
/** The checklist category a question names (lib/compliance/sg-checklist.ts `COMPLIANCE_CATEGORIES`' keys). */
const TOPICS: [RegExp, string][] = [
  [/\b(electric(al|s)?|wiring|sockets?|power points?|db box|ema)\b/, 'electrical'],
  [/\b(plumbing|pipes?|sanitary|gas|water heater|pub)\b/, 'plumbing_sanitary_gas'],
  [/\b(hack(ing)?|demolition|demolish|walls?|structural|beams?|columns?)\b/, 'structural_works'],
  [/\b(waterproof(ing)?|wet works?|toilets?|bathrooms?|ponding)\b/, 'wet_works_waterproofing'],
  [/\b(windows?|doors?|grilles?|gates?)\b/, 'windows_doors'],
  [/\b(air-?con|aircon|air conditioning|condensers?|fan coils?)\b/, 'aircon'],
  [/\b(noise|hours?|weekends?|public holidays?|working time)\b/, 'noise_hours'],
  [/\b(floor(ing)?|tiles?|tiling|vinyl|parquet)\b/, 'flooring'],
  [/\b(ceilings?|false ceiling|bulkheads?)\b/, 'ceiling'],
  [/\b(fire|sprinklers?|scdf)\b/, 'fire_safety'],
  [/\b(waste|debris|disposal|rubbish)\b/, 'waste_disposal'],
  [/\b(neighbours?|neighbors?|notice to)\b/, 'neighbour_notification'],
  [/\b(insurance|insured)\b/, 'insurance_compliance'],
  [/\b(trees?|nparks)\b/, 'tree_conservation'],
  [/\b(ura|planning permission)\b/, 'planning_permission'],
  [/\b(lifts?|corridors?|common areas?|lobby)\b/, 'common_areas'],
  [/\b(deposits?|contracts?|casetrust)\b/, 'contract_commercial'],
  [/\b(defects?|warranty|warranties)\b/, 'handover_defects'],
]
export function topicOf(q: string): string | undefined {
  const s = norm(q)
  return TOPICS.find(([re]) => re.test(s))?.[1]
}

/** Start a project's own words: the client's name after "for", a Singapore mobile, a property type the studio uses. */
export function startParams(q: string): Pick<AskParams, 'client' | 'phone' | 'propertyType'> {
  const out: Pick<AskParams, 'client' | 'phone' | 'propertyType'> = {}
  const phone = /(?:\+?65[\s-]?)?\b([689]\d{3})[\s-]?(\d{4})\b/.exec(q)
  if (phone) out.phone = `${phone[1]}${phone[2]}`
  const s = norm(q)
  const type = [...PROPERTY_TYPES].filter((t) => t !== 'Others').sort((a, b) => b.length - a.length).find((t) => s.includes(t.toLowerCase().replace(/\s+—\s+/g, ' ')) || s.includes(t.toLowerCase()))
    ?? (/\b(\d)[- ]?room\b/.exec(s) ? (() => { const n = /\b(\d)[- ]?room\b/.exec(s)![1]; return PROPERTY_TYPES.find((t) => t === `${/\bbto\b/.test(s) ? 'BTO' : 'HDB'} ${n}-Room`) })() : undefined)
  if (type) out.propertyType = type
  const name = /\bfor\s+((?:mr|mrs|ms|mdm|dr)\.?\s+)?([a-z][a-z'’.-]*(?:\s+[a-z][a-z'’.-]*){0,3}?)(?=\s*(?:,|\bat\b|\bon\b|\bin\b|\bwith\b|\bphone\b|\bmobile\b|\+?65|[689]\d{3}|\bhdb\b|\bbto\b|\bcondo\b|\blanded\b|\d|$))/i.exec(q.replace(/[?.!]+$/, ''))
  if (name) {
    const words = `${name[1] ?? ''}${name[2] ?? ''}`.trim()
    if (words && !/^(a|an|the|my|our|new|this|that|someone|somebody|client|them|him|her)$/i.test(words) && !/^(a|an|the)\s/i.test(words))
      out.client = words.replace(/\b([a-z])/g, (c) => c.toUpperCase())
  }
  return out
}

/** (pending modules S05) Add a lead's own words beyond Start a project's: the budget ("budget 80k", "S$80,000"), the source ("from Instagram"),
    the email. */
export function leadParams(q: string): Pick<AskParams, 'client' | 'phone' | 'propertyType' | 'budget' | 'source' | 'email'> {
  const out: Pick<AskParams, 'client' | 'phone' | 'propertyType' | 'budget' | 'source' | 'email'> = { ...startParams(q) }
  /* "New lead Tan Ah Kow 8123 4567 …" — a name straight after "lead" when no "for" names one */
  if (!out.client) {
    const n = /\b(?:lead|enquiry)\s*[:,-]?\s+((?:mr|mrs|ms|mdm|dr)\.?\s+)?([a-z][a-z'’.-]*(?:\s+[a-z][a-z'’.-]*){0,3}?)(?=\s*(?:,|\+?65|[689]\d{3}|\bhdb\b|\bbto\b|\bcondo\b|\blanded\b|\bexecutive\b|\bcommercial\b|\bfrom\b|\bvia\b|\bbudget\b|\bwith\b|\d|$))/i.exec(q.replace(/[?.!]+$/, ''))
    const words = n ? `${n[1] ?? ''}${n[2] ?? ''}`.trim() : ''
    if (words && !/^(for|a|an|the|from|with|called|named)\b/i.test(words)) out.client = words.replace(/\b([a-z])/g, (c) => c.toUpperCase())
  }
  const m = /\b(?:budget|budgets?\s+of|around|about)\b[^\d$]{0,12}(?:s?\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/i.exec(q) ?? /(?:\bs)?\$\s*(\d[\d,]*(?:\.\d+)?)\s*(k|m)?\b/i.exec(q)
  if (m) {
    const n = Number(m[1]!.replace(/,/g, '')) * (m[2]?.toLowerCase() === 'k' ? 1000 : m[2]?.toLowerCase() === 'm' ? 1_000_000 : 1)
    if (Number.isFinite(n) && n >= 1000 && n <= 5_000_000) out.budget = Math.round(n)
  }
  const s = norm(q)
  const source = SOURCES.filter((x) => x !== 'Others').find((x) => new RegExp(`\\b${x.toLowerCase().replace(/[-\s]+/g, '[-\\s]?')}\\b`).test(s))
  if (source) out.source = source
  const email = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(q)
  if (email) out.email = email[0]
  return out
}
/** (pending modules S05) The step a move names — "to Met", "as won", "on hold". */
export function stepOf(q: string): MoveStep | undefined {
  const s = norm(q)
  if (/\bon hold\b|\bhold\b/.test(s)) return 'on-hold'
  if (/\bquote sent\b/.test(s)) return 'quote-sent'
  if (/\bcontacted\b/.test(s)) return 'contacted'
  if (/\b(won|win)\b/.test(s)) return 'won'
  if (/\blost\b/.test(s)) return 'lost'
  if (/\bmet\b/.test(s)) return 'met'
  return undefined
}
/** (pending modules S05) The field an edit names. */
export function fieldOf(q: string): LeadField | undefined {
  const s = norm(q)
  if (/\bbudget\b/.test(s)) return 'budget'
  if (/\bproperty type\b/.test(s)) return 'propertyType'
  if (/\b(phone|mobile|number)\b/.test(s)) return 'phone'
  if (/\bemail\b/.test(s)) return 'email'
  if (/\baddress\b/.test(s)) return 'propertyAddress'
  if (/\bsource\b/.test(s)) return 'source'
  if (/\bdistrict\b/.test(s)) return 'district'
  if (/\bnric\b|\bfin\b/.test(s)) return 'nric'
  if (/\bname\b/.test(s)) return 'name'
  return undefined
}

/** (pending modules S10) The money record "raise a … " names. */
export function moneyKindOf(q: string): MoneyKind | undefined {
  const s = norm(q)
  if (/\b(generate|send|raise)\b[^.?!]{0,30}\b(milestone|stage|progress|next) (invoices?|payments?|bills?)\b/.test(s)) return 'stage'
  if (/\b(variation orders?|vos?)\b/.test(s)) return 'vo'
  if (/\b(purchase orders?|pos?)\b/.test(s)) return 'po'
  if (/\bsupplier bills?\b|\bbills?\b/.test(s)) return 'bill'
  if (/\b(expenses?|claims?)\b/.test(s)) return 'expense'
  if (/\bone-?off\b/.test(s)) return 'one-off'
  if (/\binvoices?\b|^invoice\b/.test(s)) return 'stage'
  return undefined
}
/** (pending modules S10) An amount in dollars a question names — "paid 5,000", "S$12.5k" — or undefined. */
export function amountOf(q: string): number | undefined {
  const m = /(?:s?\$\s*)?\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(k)?\b/i.exec(q.replace(/(?:\+?65[\s-]?)?\b[689]\d{3}[\s-]?\d{4}\b/g, ' '))
  if (!m) return undefined
  const n = (Number(m[1]!.replace(/,/g, '')) + (m[2] ? Number(`0.${m[2]}`) : 0)) * (m[3] ? 1000 : 1)
  return Number.isFinite(n) && n >= 1 && n <= 10_000_000 ? Math.round(n * 100) / 100 : undefined
}
/** (pending modules S10) Which quotes a question asks after. */
export function quoteScopeOf(s: string): QuoteScope {
  if (/\b(approv\w*|pending|waiting for (my|me|you|an?) )/.test(s)) return 'approval'
  if (/\b(expir\w*|valid|run out|running out)\b/.test(s)) return 'expiring'
  if (/\b(unanswered|no (reply|answer)|not (answered|replied)|waiting|heard|sent)\b/.test(s)) return 'unanswered'
  if (/\bdrafts?\b/.test(s)) return 'drafts'
  return 'all'
}

/** (pending modules S10 — the editors' own sheets, and every page's) A page's suggestion the question asks in other words — "which lines are
    below cost" on the quote editor is its "1 line sells below cost" — so the Ask box understands the page it is on. The suggestion's words that
    carry meaning (3 letters or more, the small words left out, a plural read as its singular) must mostly be in the question, and make up
    half of it at least. */
const STOP = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'what', 'which', 'who', 'are', 'was', 'has', 'have', 'from', 'into', 'your', 'our', 'their', 'any', 'all', 'how', 'its', 'one', 'get', 'can', 'you', 'out', 'about', 'there', 'them', 'they', 'will', 'does', 'did', 'show', 'tell', 'give', 'please', 'some'])
const stem = (raw: string) => {
  let w = raw.replace(/'s$/, '')
  if (/ies$/.test(w)) return `${w.slice(0, -3)}y`
  if (/(ss|us|is)$/.test(w)) return w
  if (/(ches|shes|xes|zes|sses)$/.test(w)) w = w.slice(0, -2)
  else if (/s$/.test(w)) w = w.slice(0, -1)
  if (/ing$/.test(w) && w.length > 5) w = w.slice(0, -3)
  else if (/ed$/.test(w) && w.length > 4) w = w.slice(0, -2)
  return w
}
const words = (x: string) => norm(x).replace(/[^a-z0-9%\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem)
export function matchSuggestion(question: string, labels: readonly string[]): string | null {
  const q = new Set(words(question))
  if (q.size < 2) return null
  let best: { label: string; score: number } | null = null
  for (const label of labels) {
    const w = [...new Set(words(label))]
    if (w.length < 2) continue
    const hit = w.filter((x) => q.has(x)).length
    const score = hit / w.length
    /* …and the question says little beyond it: "Start a new project for Mr Lim, 9123 4567" is a question of its own, not the page's
       "Start a project" (its words are half the question's at least) */
    if (hit >= 2 && score >= 0.6 && hit / q.size >= 0.5 && score > (best?.score ?? 0)) best = { label, score }
  }
  return best?.label ?? null
}

/** The intent a question reads as, with what it names — null when nothing matches (the answer then lists what Maison AI answers). */
export function matchQuestion(question: string, ctx: AskContext): Match | null {
  const s = norm(question)
  if (!s) return null
  const here = /\b(this project|this one|here|on this|for this)\b/.test(s)
  let best: Match | null = null
  for (const def of INTENTS) {
    if (def.needs === 'project' && !ctx.projectId) continue
    if (def.needs === 'milestone' && !ctx.milestoneId) continue
    if (def.unless?.test(s)) continue
    let score = 0
    for (const [re, n] of def.words) if (re.test(s)) score += n
    if (def.id === 'milestone' && ctx.milestoneId) score += 1   // asked from the milestone panel: about it, unless the words say otherwise
    if (def.id === 'compliance_project' && ctx.projectId && !kindOf(s)) score += 1
    if (score > (best?.score ?? 2)) best = { id: def.id, params: {}, score }
  }
  /* asked about one milestone (its panel's "Ask Maison AI about this") and nothing else in the words: the milestone itself */
  if (!best && ctx.milestoneId) best = { id: 'milestone', params: {}, score: 3 }
  if (!best) return null
  const params: AskParams = { ...(here ? { here: true } : {}) }
  if (best.id === 'compliance_rules' || best.id === 'compliance_project') {
    const kind = kindOf(s); if (kind) params.kind = kind
    const phase = phaseOf(s); if (phase) params.phase = phase
    const topic = topicOf(s); if (topic) params.topic = topic
  }
  if (best.id === 'gst') params.quarter = /\blast quarter\b|\bprevious quarter\b/.test(s) ? 'last' : 'this'
  if (best.id === 'start_project') Object.assign(params, startParams(question))
  if (best.id === 'add_lead') Object.assign(params, leadParams(question))   // (pending modules S05)
  if (best.id === 'move_lead') { const step = stepOf(question); if (step) params.step = step }
  if (best.id === 'edit_lead') { const field = fieldOf(question); if (field) params.field = field }
  if (best.id === 'money_new') { const k = moneyKindOf(s); if (k) params.moneyKind = k }
  if (best.id === 'record_payment' || best.id === 'money_new') { const a = amountOf(question); if (a) params.amount = a }
  if (best.id === 'quotes') params.quoteScope = quoteScopeOf(s)
  if (best.id === 'member_role') { const r = /\b(admin|owner|designer|manager|accounting)\b/.exec(s)?.[1]; if (r) params.role = r.charAt(0).toUpperCase() + r.slice(1) }
  if (best.id === 'remind') params.followUp = /\bfollow[- ]?up\b/.test(s) && !/\bremind (me|us)\b/.test(s)
  if (best.id === 'owed') params.ageing = /\b(ageing|aging|by age|how late)\b/.test(s)
  return { ...best, params }
}

/** The questions Maison AI answers, as chips — when a question matches nothing, and under the box. `money` for Owners and Admins. */
export function askChips(o: { money: boolean; project: boolean; milestone: boolean; /** (S10) Accounting: the books and their own tasks */ books?: boolean; leads?: boolean; runs?: boolean
  /** (S44O — call C6) Marketing: the leads' questions only */ desk?: boolean
  /** (pending modules S41b-1) sees the books' profit and margin — else no P&L or margins chip */ profit?: boolean }): string[] {
  const leads = o.leads ?? true
  const profit = o.profit !== false
  if (o.desk) return ['My tasks today', 'Which leads need attention?', 'Add a lead', 'The rules for an HDB flat']   // (S44O — call C6) the lead desk's
  if (!leads) return [   // (pending modules S10) Accounting opens the books, never the leads or the projects' schedules
    'My tasks today',
    'Who owes the studio money?', 'What does the studio owe?', 'GST this quarter', 'Cash flow', ...(profit ? ['Profit and loss this year'] : []), 'Expenses that repeat', 'Commission this year',
  ]
  return [
    ...(o.milestone ? ['What does this milestone wait on?'] : []),
    'What is overdue?',
    'My tasks today',   // (pending modules S10)
    'Which leads need attention?',
    'Quotes waiting for approval',
    'What starts this week?',
    ...(o.project ? ['What compliance is still to do here?'] : ['The rules for an HDB flat']),
    ...(o.money ? ['Who owes the studio money?', 'GST this quarter', 'Cash flow', ...(profit ? ['The thinnest margins'] : []), 'Vendor spend this year', 'Commission this year'] : []),
    ...(o.runs ? ['What’s left to set up?'] : []),
    'Which registrations are still to do?',
    'Start a project',
    'Add a lead',   // (pending modules S05)
    'What can you do?',   // (pending modules S10) the changes it proposes, in examples
  ]
}

/** A question as asked again (an answer's chip, a milestone's ask) — kept short for the sheet's title. */
export const MAX_QUESTION = 200
export const cleanQuestion = (q: unknown) => (typeof q === 'string' ? q.replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION) : '')
