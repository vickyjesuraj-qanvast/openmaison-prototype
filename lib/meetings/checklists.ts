/**
 * (pending modules S23) The meeting checklist — 1.0's platform items per meeting type (src/data/copilot-checklists.ts DEFAULT_CHECKLIST_ITEMS), with
 * their detection words. In 1.0 the words were stored and never read (ticks came from the model alone) and a studio's own items never reached a
 * meeting (`mergeCustomChecklist` had no caller); here the words tick an item as soon as they appear in what was said, and the studio's own items
 * (Settings › Meetings › Meeting checklists) are listed after the platform's for the meeting's aim. Pure and client-safe.
 */
import type { AimKey } from './model'

export type ChecklistCategory = 'critical' | 'important' | 'nice_to_have'
export const CATEGORIES: { key: ChecklistCategory; label: string }[] = [
  { key: 'critical', label: 'Must ask' },
  { key: 'important', label: 'Important' },
  { key: 'nice_to_have', label: 'Good to cover' },
]
export const categoryLabel = (k: string) => CATEGORIES.find((c) => c.key === k)?.label ?? 'Important'
export const isCategory = (v: unknown): v is ChecklistCategory => v === 'critical' || v === 'important' || v === 'nice_to_have'

export type ChecklistDef = { id: string; label: string; category: ChecklistCategory; aims: AimKey[]; words: string[]; own?: boolean }

/** 1.0's items, labels as 1.0 wrote them (British spelling), every aim's list then the universal one. */
export const PLATFORM_ITEMS: readonly ChecklistDef[] = [
  { id: 'budget_discussed', label: 'Budget range discussed', category: 'critical', aims: ['first_consultation'], words: ['budget', 'how much', 'price range', 'afford', 'spend', 'cost', 'ballpark', 'range'] },
  { id: 'property_confirmed', label: 'Property type & size confirmed', category: 'critical', aims: ['first_consultation'], words: ['hdb', 'condo', 'bto', 'resale', 'landed', 'sqft', 'sq ft', 'square feet', 'square meter', 'sqm', 'room type', 'flat type', 'apartment', 'semi-d', 'terrace', 'bungalow'] },
  { id: 'key_collection', label: 'Key collection / move-in date', category: 'critical', aims: ['first_consultation'], words: ['key collection', 'keys', 'move in', 'when can we start', 'handover', 'possession', 'completion date', 'top date'] },
  { id: 'decision_maker', label: 'Decision maker(s) present', category: 'critical', aims: ['first_consultation'], words: ['husband', 'wife', 'spouse', 'partner', 'parents', 'family', 'decide together', 'discuss with', 'check with'] },
  { id: 'style_preferences', label: 'Style preferences explored', category: 'important', aims: ['first_consultation'], words: ['style', 'modern', 'minimalist', 'scandinavian', 'japandi', 'industrial', 'muji', 'contemporary', 'classic', 'rustic', 'design style', 'look and feel', 'theme'] },
  { id: 'room_scope', label: 'Room scope defined (which rooms)', category: 'important', aims: ['first_consultation'], words: ['kitchen', 'bedroom', 'bathroom', 'living room', 'master', 'whole unit', 'full reno', 'partial', 'rooms', 'areas'] },
  { id: 'timeline_expectations', label: 'Timeline expectations set', category: 'important', aims: ['first_consultation'], words: ['how long', 'timeline', 'duration', 'weeks', 'months', 'when done', 'deadline', 'completion', 'how fast'] },
  { id: 'previous_reno', label: 'Previous renovation experience', category: 'important', aims: ['first_consultation'], words: ['first time', 'previous renovation', 'last time', 'done before', 'renovated before', 'first reno'] },
  { id: 'lifestyle_needs', label: 'Lifestyle needs (kids, pets, WFH)', category: 'nice_to_have', aims: ['first_consultation'], words: ['kids', 'children', 'baby', 'pet', 'dog', 'cat', 'work from home', 'wfh', 'home office', 'elderly', 'parents staying'] },
  { id: 'material_prefs', label: 'Material preferences discussed', category: 'nice_to_have', aims: ['first_consultation'], words: ['quartz', 'laminate', 'wood', 'marble', 'tile', 'vinyl', 'material', 'finish', 'texture', 'surface'] },
  { id: 'references_shown', label: 'Reference photos / inspiration discussed', category: 'nice_to_have', aims: ['first_consultation'], words: ['pinterest', 'instagram', 'photo', 'picture', 'reference', 'inspiration', 'saw online', 'this look', 'like this'] },
  { id: 'competitor_mentioned', label: 'Competitor quotes discussed', category: 'nice_to_have', aims: ['first_consultation'], words: ['other id', 'another firm', 'another designer', 'another studio', 'other quote', 'comparing', 'also met', 'also meeting'] },

  { id: 'followup_concerns', label: 'Address concerns from last meeting', category: 'critical', aims: ['follow_up'], words: ['last time', 'previously', 'you mentioned', 'concern', 'worried about', 'question about', 'issue', 'follow up on'] },
  { id: 'followup_quote_reviewed', label: 'Quote reviewed / discussed', category: 'critical', aims: ['follow_up'], words: ['quote', 'quotation', 'pricing', 'line item', 'breakdown', 'proposal', 'estimate'] },
  { id: 'followup_scope_changes', label: 'Changes to scope captured', category: 'important', aims: ['follow_up'], words: ['change', 'add', 'remove', 'instead', 'swap', 'different', 'adjust', 'modify', 'update scope'] },
  { id: 'followup_timeline_reconfirm', label: 'Timeline reconfirmed', category: 'important', aims: ['follow_up'], words: ['timeline', 'schedule', 'when start', 'how long', 'duration', 'weeks', 'months'] },
  { id: 'followup_next_steps', label: 'Next steps agreed', category: 'important', aims: ['follow_up'], words: ['next step', 'what\'s next', 'proceed', 'go ahead', 'move forward', 'sign', 'deposit'] },
  { id: 'followup_additional_rooms', label: 'Additional rooms discussed', category: 'nice_to_have', aims: ['follow_up'], words: ['another room', 'additional', 'also want', 'extend', 'more rooms', 'full unit'] },

  { id: 'quote_walkthrough', label: 'Line items walked through', category: 'critical', aims: ['quote_presentation'], words: ['line item', 'each item', 'breakdown', 'let me walk', 'go through', 'explain each', 'what this covers'] },
  { id: 'quote_total_confirmed', label: 'Total budget confirmed', category: 'critical', aims: ['quote_presentation'], words: ['total', 'grand total', 'all in', 'final price', 'bottom line', 'overall cost', 'total comes to'] },
  { id: 'quote_payment_schedule', label: 'Payment schedule discussed', category: 'critical', aims: ['quote_presentation'], words: ['payment', 'deposit', 'installment', 'instalment', 'milestone', 'payment schedule', 'how to pay', 'payment terms', 'progress payment'] },
  { id: 'quote_material_options', label: 'Material substitution options offered', category: 'important', aims: ['quote_presentation'], words: ['alternative', 'option', 'substitute', 'instead of', 'upgrade', 'downgrade', 'can swap', 'different material'] },
  { id: 'quote_timeline_milestones', label: 'Timeline tied to milestones', category: 'important', aims: ['quote_presentation'], words: ['milestone', 'phase', 'stage', 'week 1', 'first phase', 'demolition', 'carpentry', 'painting'] },
  { id: 'quote_inclusions', label: 'What’s included vs excluded clarified', category: 'important', aims: ['quote_presentation'], words: ['included', 'excluded', 'not included', 'extra', 'additional cost', 'covers', 'does not cover', 'on top of'] },
  { id: 'quote_warranty', label: 'Warranty / aftercare mentioned', category: 'nice_to_have', aims: ['quote_presentation'], words: ['warranty', 'guarantee', 'aftercare', 'defect', 'maintenance', 'after completion', 'support'] },

  { id: 'closing_price_agreed', label: 'Final price agreed', category: 'critical', aims: ['closing'], words: ['agree', 'confirmed', 'ok with the price', 'accept', 'go with this', 'fine with', 'lock in'] },
  { id: 'closing_payment_confirmed', label: 'Payment schedule confirmed', category: 'critical', aims: ['closing'], words: ['payment confirmed', 'deposit', 'first payment', 'transfer', 'pay now', 'when to pay'] },
  { id: 'closing_contract_reviewed', label: 'Contract terms reviewed', category: 'critical', aims: ['closing'], words: ['contract', 'agreement', 'terms', 'sign', 'signature', 'document', 'read through'] },
  { id: 'closing_start_date', label: 'Start date agreed', category: 'critical', aims: ['closing'], words: ['start date', 'when to start', 'begin', 'kick off', 'commence', 'renovation starts'] },
  { id: 'closing_deposit', label: 'Deposit amount discussed', category: 'important', aims: ['closing'], words: ['deposit', 'down payment', 'upfront', 'first payment', 'advance'] },
  { id: 'closing_comms_channel', label: 'Communication channel agreed', category: 'important', aims: ['closing'], words: ['whatsapp', 'email', 'group chat', 'communicate', 'contact', 'reach you', 'update me'] },
  { id: 'closing_referral', label: 'Referral programme mentioned', category: 'nice_to_have', aims: ['closing'], words: ['referral', 'refer', 'friend', 'recommend', 'tell your friends', 'discount for referral'] },

  { id: 'site_measurements', label: 'Site measurements confirmed', category: 'critical', aims: ['site_visit_debrief'], words: ['measurement', 'measure', 'dimensions', 'length', 'width', 'height', 'ceiling height', 'floor area'] },
  { id: 'site_conditions', label: 'Existing condition issues noted', category: 'critical', aims: ['site_visit_debrief'], words: ['damage', 'crack', 'leak', 'mould', 'mold', 'damp', 'condition', 'existing', 'worn', 'defect', 'issue found'] },
  { id: 'site_electrical', label: 'Electrical / plumbing points discussed', category: 'important', aims: ['site_visit_debrief'], words: ['power point', 'socket', 'switch', 'wire', 'electrical', 'plumbing', 'pipe', 'water point', 'drainage'] },
  { id: 'site_hacking_scope', label: 'Hacking scope confirmed', category: 'important', aims: ['site_visit_debrief'], words: ['hack', 'demolish', 'remove wall', 'break', 'tear down', 'knock down', 'open up'] },
  { id: 'site_neighbour', label: 'Neighbour coordination mentioned', category: 'nice_to_have', aims: ['site_visit_debrief'], words: ['neighbor', 'neighbour', 'next door', 'noise', 'working hours', 'permission', 'management'] },

  { id: 'universal_next_meeting', label: 'Next meeting / follow-up date set', category: 'important', aims: [], words: ['next meeting', 'meet again', 'follow up', 'come back', 'schedule', 'next appointment', 'when can we meet'] },
]

/** The studio's own item as the meeting reads it. */
export type OwnItem = { id: string; label: string; category: string; aims: string[]; words: string[] }

/** The checklist for a meeting's aim: the platform's items for it (or every aim's universal ones), then the studio's own, critical first. */
export function checklistFor(aim: string, own: readonly OwnItem[] = []): ChecklistDef[] {
  const fits = (aims: readonly string[]) => aims.length === 0 || aims.includes(aim)
  const items: ChecklistDef[] = [
    ...PLATFORM_ITEMS.filter((i) => fits(i.aims)),
    ...own.filter((i) => fits(i.aims)).map((i) => ({ id: `own:${i.id}`, label: i.label, category: isCategory(i.category) ? i.category : 'important', aims: i.aims as AimKey[], words: i.words, own: true })),
  ]
  const rank: Record<ChecklistCategory, number> = { critical: 0, important: 1, nice_to_have: 2 }
  return items.map((i, k) => ({ i, k })).sort((a, b) => rank[a.i.category] - rank[b.i.category] || a.k - b.k).map((x) => x.i)
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** A word or phrase heard as a whole word ("cat" is not in "location"), case-folded, curly quotes straightened. */
export function heard(text: string, word: string): RegExpExecArray | null {
  const w = word.trim().toLowerCase().replace(/[’']/g, "'")
  if (!w) return null
  return new RegExp(`(^|[^a-z0-9])${esc(w)}(?=$|[^a-z0-9])`, 'i').exec(text.toLowerCase().replace(/[’']/g, "'"))
}

/** "a, b , c" → ["a","b","c"] — a checklist item's words as Settings types them. */
export const parseWords = (s: string): string[] => [...new Set(s.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2 && w.length <= 40))].slice(0, 20)
