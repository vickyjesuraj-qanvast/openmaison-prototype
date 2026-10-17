/**
 * (pending modules S23) The co-pilot, by rule — what 1.0's live passes did (src/lib/copilot/fast-path.ts's seven client patterns, the model's
 * objection classification, checklist ticks, deal signals, the "Quote Shadow" estimate and the tags), read from the words the studio types or
 * pastes. Pure and client-safe: the meeting page runs it as the notes change, the server runs the same reading to make the brief, so the two
 * never disagree. Nothing here calls a model; the seam for one later is `readMeeting`.
 *
 * Who said it: a line may start with its speaker — "Client:", "Customer:", the client's first name, "Me:", "Designer:" or a member's name. When
 * any line names a speaker, the client-only rules (1.0 fired its tips on the client's words alone, so a designer's own question never reads as a
 * client's doubt) read the client's lines and the unlabelled ones; with no labels anywhere, every line counts.
 */
import { STYLE_OPTIONS, PROPERTY_TYPES } from '@/lib/leads/enums'
import { moneyCard } from '@/lib/format'
import { readBrief } from '@/lib/quotes/draft'
import { checklistFor, heard, type ChecklistDef, type OwnItem } from './checklists'
import { answerFor, competitorIn, kindLabel, kindOf, type ObjectionAnswer, type ObjectionKind } from './objections'
import {
  DIMENSIONS, START_DIMS, scoreOf, tierOf, type BriefObjection, type Dims, type Estimate, type EstimateLine, type Features, type MeetingState,
  type Profile, type Tier, type Upsell, type Weights,
} from './model'

export type Speaker = 'client' | 'studio' | 'unknown'
export type Line = { n: number; text: string; speaker: Speaker }

const CLIENT_WORDS = ['client', 'customer', 'homeowner', 'them', 'they', 'owner']
const STUDIO_WORDS = ['me', 'designer', 'id', 'us', 'we', 'studio']
const PREFIX = /^\s*(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?([A-Za-z][A-Za-z .’'-]{0,24}?)\s*:\s+(.*)$/
/** The notes as lines, each with who said it. */
export function linesOf(notes: string, o: { client: string; members: readonly string[] }): Line[] {
  const client = new Set([...CLIENT_WORDS, o.client.trim().split(/\s+/)[0]?.toLowerCase() ?? '', o.client.trim().toLowerCase()].filter(Boolean))
  const studio = new Set([...STUDIO_WORDS, ...o.members.map((m) => m.trim().toLowerCase())])
  return notes.split(/\r?\n/).map((raw) => raw.trim()).filter(Boolean).slice(0, 2000).map((raw, n) => {
    const m = PREFIX.exec(raw)
    const who = m?.[1]?.trim().toLowerCase()
    if (m && who && client.has(who)) return { n, text: m[2]!.trim(), speaker: 'client' as const }
    if (m && who && studio.has(who)) return { n, text: m[2]!.trim(), speaker: 'studio' as const }
    return { n, text: raw, speaker: 'unknown' as const }
  })
}
/** The lines the client-only rules read. */
export function clientLines(lines: readonly Line[]): Line[] {
  return lines.some((l) => l.speaker !== 'unknown') ? lines.filter((l) => l.speaker !== 'studio') : [...lines]
}

/** A quote of what was said, kept to the card's room (1.0's 140 characters, around the match). */
export function quoteOf(text: string, at = 0, max = 140): string {
  const t = text.trim()
  if (t.length <= max) return t
  const start = Math.max(0, at - Math.floor(max / 2))
  const end = Math.min(t.length, start + max)
  return `${start > 0 ? '…' : ''}${t.slice(start, end).trim()}${end < t.length ? '…' : ''}`
}

/* ── facts ── */
const NUM_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1 }
const numOf = (s: string): number | null => { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? n : NUM_WORDS[s.toLowerCase()] ?? null }
const MONEY = /(?:s\$|sgd|\$)\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m|thousand|million)?\b|\b(\d[\d,]*(?:\.\d+)?)\s?(k|m|thousand|million)\b/gi
const BUDGET_HINT = /\b(budget|spend|afford|around|about|max(imum)?|up to|ballpark|range|thinking|keep it|under|below|no more than|between|set aside)\b/i
const toMinor = (n: number, unit: string | undefined) => Math.round(n * (unit && /^k|thousand/i.test(unit) ? 1_000 : unit && /^m|million/i.test(unit) ? 1_000_000 : 1) * 100)
/** The budget the client named last — a single figure or a range ("150k to 200k", "between 150 and 200k"). */
export function budgetIn(lines: readonly Line[]): { min: number; max: number; line: number } | null {
  let found: { min: number; max: number; line: number } | null = null
  for (const l of lines) {
    if (!BUDGET_HINT.test(l.text) && !/budget/i.test(l.text)) continue
    const amounts = [...l.text.matchAll(MONEY)].map((m) => ({ n: Number((m[1] ?? m[3] ?? '').replace(/,/g, '')), unit: m[2] ?? m[4] })).filter((a) => Number.isFinite(a.n) && a.n > 0)
    if (!amounts.length) continue
    /* "150 to 200k": the first figure takes the second's unit when it has none */
    const range = /\b(\d[\d,.]*)\s?(k|thousand)?\s?(?:-|–|to|and)\s?(?:s\$|\$)?\s?(\d[\d,.]*)\s?(k|thousand)\b/i.exec(l.text)
    let min: number, max: number
    if (range) { const u = range[4]; min = toMinor(Number(range[1]!.replace(/,/g, '')), range[2] ?? u); max = toMinor(Number(range[3]!.replace(/,/g, '')), u) }
    else { min = max = toMinor(amounts[0]!.n, amounts[0]!.unit) }
    if (min > max) [min, max] = [max, min]
    if (max < 500_000 || max > 1_000_000_000) continue   // S$5,000 … S$10M — a figure outside it is not a renovation budget
    found = { min, max, line: l.n }
  }
  return found
}

const ROOM_N = /\b(\d|one|two|three|four|five)[- ]room\b/i
const BEDDER = /\b(\d|one|two|three|four|five)[- ]?(bedder|bedroom|br)\b/i
/** The kind of home the words name, in the lead form's own list (lib/leads/enums.ts PROPERTY_TYPES), or null. */
export function propertyIn(text: string): string | null {
  const t = text.toLowerCase()
  const pick = (v: string) => (PROPERTY_TYPES.includes(v) ? v : null)
  if (/\bsemi-?d(etached)?\b/.test(t)) return pick('Landed — Semi-D')
  if (/\bterrace(d)? (house|home)?\b|\bcorner terrace\b/.test(t)) return pick('Landed — Terrace')
  if (/\b(bungalow|good class bungalow|gcb|detached house)\b/.test(t)) return pick('Landed — Bungalow')
  if (/\bpenthouse\b/.test(t)) return pick('Penthouse')
  if (/\b(executive condo(minium)?|\bec)\b/.test(t)) return pick('Executive Condo')
  if (/\bcondo(minium)?\b/.test(t)) {
    if (/\b(studio|1[- ]?bedder|one[- ]bedder|1[- ]bedroom)\b/.test(t)) return pick('Condo Studio / 1-bedder')
    const m = BEDDER.exec(t); const n = m ? numOf(m[1]!) : null
    return n && n >= 2 && n <= 5 ? pick(`Condo ${n}-bedder`) : null
  }
  const m = ROOM_N.exec(t); const n = m ? numOf(m[1]!) : null
  if (/\bbto\b/.test(t) && n && n >= 2 && n <= 5) return pick(`BTO ${n}-Room`)
  if (/\b(hdb|resale|flat)\b/.test(t) || n) {
    if (/\b(hdb )?executive (flat|apartment|maisonette)\b|\bemaisonette\b/.test(t)) return pick('HDB Executive')
    if (n && n >= 2 && n <= 5) return pick(`HDB ${n}-Room`)
  }
  return null
}
/** The floor area named, in square feet (sq m converted). */
export function areaIn(text: string): number | null {
  const ft = /\b(\d[\d,]*(?:\.\d+)?)\s?(sq\.? ?ft|sqft|square feet|sf)\b/i.exec(text)
  if (ft) { const n = Number(ft[1]!.replace(/,/g, '')); return n >= 100 && n <= 50_000 ? Math.round(n) : null }
  const m = /\b(\d[\d,]*(?:\.\d+)?)\s?(sq\.? ?m|sqm|square met(?:er|re)s?|m2|m²)\b/i.exec(text)
  if (m) { const n = Number(m[1]!.replace(/,/g, '')); return n >= 10 && n <= 5_000 ? Math.round(n * 10.7639) : null }
  return null
}
/* the styles a client names: the lead form's list, and the AI Visualizer's further looks (1.0's DESIGN_STYLES) */
const MORE_STYLES = ['Muji', 'Wabi-Sabi', 'Bohemian', 'Coastal', 'Tropical', 'Farmhouse', 'Mediterranean', 'Hampton', 'Rustic', 'Art Deco', 'Biophilic', 'Balinese', 'Parisian', 'Maximalist']
const STYLE_ALIAS: Record<string, string> = { scandi: 'Scandinavian', 'mid century': 'Mid-century', 'mid-century modern': 'Mid-century', muji: 'Japandi', 'wabi sabi': 'Wabi-Sabi', boho: 'Bohemian', luxe: 'Luxury', luxurious: 'Luxury' }
export function stylesIn(text: string): string[] {
  const names = [...STYLE_OPTIONS.filter((s) => s !== 'No preference' && s !== 'Others'), ...MORE_STYLES]
  const out: string[] = []
  for (const s of names) if (heard(text, s)) out.push(s === 'Muji' ? 'Japandi' : s)
  for (const [w, s] of Object.entries(STYLE_ALIAS)) if (heard(text, w)) out.push(s)
  return [...new Set(out)].slice(0, 4)
}
const clip = (s: string, n = 48) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
export function timelineIn(lines: readonly Line[]): string | null {
  for (const l of [...lines].reverse()) {
    const t = l.text
    const m = /\b(?:move|moving) in (by|before|around|after) ([^.,;!?]+)/i.exec(t) ?? /\b(?:done|ready|finished|complete(?:d)?) (by|before) ([^.,;!?]+)/i.exec(t)
    if (m) return clip(`${/done|ready|finished|complete/i.test(m[0]) ? 'Done' : 'Move in'} ${m[1]!.toLowerCase()} ${m[2]!.trim()}`)
    const by = /\bby (cny|chinese new year|christmas|deepavali|hari raya|next year|year[- ]end|the end of the year|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*(?: \d{4})?)\b/i.exec(t)
    if (by) return clip(`By ${by[1]}`)
    const months = /\bin (\d+|two|three|four|five|six|nine|twelve) months\b/i.exec(t)
    if (months && /\b(start|done|ready|move|finish|complete|reno)/i.test(t)) return clip(`In ${months[1]} months`)
  }
  return null
}
/** Key collection in the lead form's own words (KEY_COLLECTION_OPTIONS): Collected · in 3 · 6 · 9 months · Later. */
export function keysIn(text: string): string | null {
  const t = text.toLowerCase()
  if (/\b(collected|got|have|received|picked up) (the |our |my )?keys?\b|\bkeys? (are |were )?(collected|in hand|already)\b/.test(t)) return 'Collected'
  const m = /\bkeys?(?: collection)?(?: is| are)? (?:in|after) (\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve) months\b/.exec(t)
  if (m) { const n = numOf(m[1]!) ?? 12; return n <= 3 ? 'in 3 months' : n <= 6 ? 'in 6 months' : n <= 9 ? 'in 9 months' : 'Later' }
  return null
}
const WHO = /\b(husband|wife|spouse|partner|parents|in-laws|mother|father|mum|mom|dad|son|daughter|siblings?)\b/i
const HOUSEHOLD: { label: string; re: RegExp }[] = [
  { label: 'Kids', re: /\b(kids?|children|child|baby|toddler|newborn)\b/i },
  { label: 'Pets', re: /\b(pets?|dogs?|cats?|puppy|kitten)\b/i },
  { label: 'Works from home', re: /\b(work from home|wfh|home office|working from home)\b/i },
  { label: 'Elderly parents', re: /\b(elderly|grandparents?|parents (are )?(staying|living) with)\b/i },
]

/* ── tips — 1.0's fast-path patterns (src/lib/copilot/fast-path.ts), in 1.0's words where they were plain ── */
export type TipAction = { kind: 'moodboard' | 'xray' | 'portfolio' | 'render'; label: string; style?: string }
export type Tip = {
  key: string; rule: string; kind: 'tip' | 'objection' | 'rival' | 'idea'
  title: string; body: string; said: string; line: number
  answer: { title: string; text: string } | null
  action: TipAction | null
}
type Rule = { id: string; kind: Tip['kind']; re: RegExp[]; title: string; body: string; objection?: ObjectionKind }
const RULES: Rule[] = [
  { id: 'price_pushback', kind: 'objection', objection: 'price', title: 'Price pushback — pivot now', body: 'Offer a phased approach or a smaller scope. Ask: “What if we focus on the must-haves first and phase the rest?” It keeps the project alive without a discount.',
    re: [/more than (i|we) expected/i, /that'?s (a lot|expensive|too much|quite a bit)/i, /(over|above|beyond) (our|my|the) budget/i, /(can'?t|cannot) afford/i, /didn'?t (expect|realise|realize) (it|that) (would|to) (be|cost)/i, /\btoo (expensive|high|much)\b/i] },
  { id: 'competitor_mention', kind: 'rival', objection: 'competition', title: 'Another studio is in play', body: 'Don’t compete on price — compete on value. Ask what they liked and didn’t like about the other studio: the answer tells you what they really care about.',
    re: [/(another|other) (studio|designer|contractor|company|firm|id)s?\b/i, /(comparing|compare|talked to|speaking with|met with) (another|other|a few)/i, /(they|someone) quoted/i, /getting (other|more) quotes?/i] },
  { id: 'decision_deferred', kind: 'tip', objection: 'commitment', title: 'The decision maker isn’t here', body: 'Offer a take-home pack: the summary, the 3D renders and three price options — so the partner who isn’t here can say yes without a second meeting.',
    re: [/(need to|have to|should) (discuss|check|talk|ask) (it )?(with|to) (my|our|the) (husband|wife|spouse|partner|parents)/i, /(husband|wife|spouse|partner) (needs? to|has to|should) (agree|approve|see|decide)/i, /(he|she) (makes?|handles?) (the|these) (decision|financial)/i] },
  { id: 'hesitation', kind: 'tip', objection: 'commitment', title: 'Make room to decide — gently', body: 'Say you understand they need time, then give a soft date: “Our design team has time from next week — I can hold a slot for 48 hours while you decide.”',
    re: [/(need|have) (to|some) (think|time|consider)/i, /(not|don'?t|aren'?t) (sure|ready|decided)/i, /(let me|let us) (think|consider|sleep on)/i, /(i'?ll|we'?ll) (get back|think about|let you know)/i] },
  { id: 'timeline_urgent', kind: 'tip', objection: 'timeline', title: 'A tight timeline', body: 'A fast track is worth more — dedicated project management can carry 10–15%. Call it that, never a rush fee, and confirm the date it has to be done by.',
    re: [/(need|want) (it|this|everything) (done|ready|finished) (by|before)/i, /(moving|move) (in|out) (by|before|in)/i, /(going|leaving|travelling|traveling) (away|overseas|abroad) (in|on|by)/i] },
  { id: 'visual_reference', kind: 'idea', title: 'They’re showing you a look', body: 'A good sign. Ask what they love about it — the colour, the material, the layout or the mood. It narrows the design and shows you’re listening.',
    re: [/(let me|i'?ll|can i) show you/i, /(saw|seen|found) (this|these|some) (on|in) (pinterest|instagram|houzz|xiaohongshu)/i, /(something|looks?) like this/i] },
]
const BUDGET_RULE = [/budget (is|of|around|about)\s/i, /(we'?re|we are) thinking (around|about)\s/i, /can (spend|afford|do) (around|about|up to)\s/i]

/* ── the deal score's signals — 1.0's DEAL_SIGNAL_PATTERNS (fast-path.ts): the latest signal on a dimension sets it (score ÷ 10) ── */
const SIGNALS: { dim: keyof Dims; score: number; re: RegExp[] }[] = [
  { dim: 'budget', score: 7, re: [/budget (is|of|around|about)\s/i, /can (spend|afford)\s/i] },
  { dim: 'budget', score: 3, re: [/more than (i|we) expected/i, /too (much|expensive)/i, /over (our |my |the )?budget/i] },
  { dim: 'budget', score: 8, re: [/can stretch to/i, /flexible.*budget/i, /budget.*flexible/i] },
  { dim: 'timeline', score: 8, re: [/(need|want) (it|this) (done|ready|finished) by/i, /moving in by/i] },
  { dim: 'timeline', score: 4, re: [/no (rush|hurry)/i, /no (specific|particular) (date|deadline)/i] },
  { dim: 'style', score: 9, re: [/i (love|like|want) (the |a )?(japandi|scandinavian|modern|minimalist|contemporary|industrial|classic)/i] },
  { dim: 'style', score: 8, re: [/(show|showed) (me|you|us) (on )?(pinterest|instagram)/i] },
  { dim: 'trust', score: 4, re: [/(another|other) (studio|designer|contractor)/i, /(they|someone) quoted/i] },
  { dim: 'trust', score: 8, re: [/(i|we) (feel|felt) (good|great|confident)/i, /(really|very) (like|impressed)/i] },
  { dim: 'trust', score: 7, re: [/(friend|sister|brother|colleague|cousin) (recommended|referred)/i] },
  { dim: 'decision', score: 4, re: [/(need to|have to) (discuss|check|talk) with (my|our) (husband|wife|partner|spouse)/i] },
  { dim: 'decision', score: 9, re: [/(let'?s|can we) (proceed|go ahead|start|sign|book)/i, /when can (you|we) start/i] },
  { dim: 'decision', score: 7, re: [/(site visit|come (see|visit)|schedule a visit)/i] },
  { dim: 'scope', score: 7, re: [/(also|and) (the|our) (bathroom|bedroom|kitchen|living)/i, /(what about|how about) the (bathroom|bedroom|kitchen)/i] },
  { dim: 'scope', score: 4, re: [/(just|only) (the|one) (kitchen|room|bathroom)/i] },
]

/* ── the rough estimate — 1.0's Singapore market rates (quote-estimator.ts SG_MARKET_RATES, whole dollars), named in plain words ── */
type Rate = { key: string; name: string; category: string; min: number; max: number; typical: number; words: string[]; per?: 'bathroom' | 'bedroom' }
export const SG_RATES: readonly Rate[] = [
  { key: 'kitchen_cabinets', name: 'Kitchen cabinets', category: 'Kitchen', min: 6000, max: 10000, typical: 8200, words: ['kitchen cabinets', 'kitchen cabinet', 'kitchen cabinetry', 'kitchen carpentry'] },
  { key: 'countertop', name: 'Countertop', category: 'Kitchen', min: 3500, max: 6000, typical: 4800, words: ['quartz countertop', 'countertop', 'kitchen top', 'quartz top', 'worktop'] },
  { key: 'backsplash', name: 'Backsplash', category: 'Kitchen', min: 1500, max: 3500, typical: 2500, words: ['backsplash', 'kitchen tiles', 'splashback'] },
  { key: 'kitchen_island', name: 'Kitchen island', category: 'Kitchen', min: 2000, max: 5000, typical: 3000, words: ['kitchen island', 'island counter', 'island'] },
  { key: 'kitchen_sink', name: 'Kitchen sink', category: 'Kitchen', min: 800, max: 2000, typical: 1200, words: ['kitchen sink', 'sink'] },
  { key: 'kitchen_appliances', name: 'Kitchen appliances', category: 'Kitchen', min: 2000, max: 4500, typical: 3200, words: ['kitchen appliances', 'built-in oven', 'oven', 'cooker hood', 'hob'] },
  { key: 'kitchen_lighting', name: 'Kitchen lighting', category: 'Kitchen', min: 500, max: 1500, typical: 900, words: ['kitchen lighting', 'under-cabinet light', 'under cabinet light'] },
  { key: 'walk_in_wardrobe', name: 'Walk-in wardrobe', category: 'Bedroom', min: 4500, max: 8000, typical: 5200, words: ['walk-in wardrobe', 'walk in wardrobe', 'walk-in closet', 'walk in closet'] },
  { key: 'wardrobe', name: 'Built-in wardrobe', category: 'Bedroom', min: 3500, max: 7000, typical: 5400, words: ['built-in wardrobe', 'built in wardrobe', 'wardrobes', 'wardrobe', 'closet'], per: 'bedroom' },
  { key: 'feature_wall', name: 'Feature wall', category: 'Bedroom', min: 1200, max: 3000, typical: 1800, words: ['feature wall', 'accent wall', 'headboard wall'] },
  { key: 'platform_bed', name: 'Platform bed', category: 'Bedroom', min: 800, max: 2000, typical: 1400, words: ['platform bed', 'bed frame', 'bed platform'] },
  { key: 'bedroom_doors', name: 'Bedroom doors', category: 'Bedroom', min: 600, max: 1500, typical: 1000, words: ['bedroom doors', 'bedroom door', 'room doors', 'room door'] },
  { key: 'study_table', name: 'Study table', category: 'Bedroom', min: 1000, max: 2500, typical: 1600, words: ['study table', 'desk', 'study area'] },
  { key: 'false_ceiling', name: 'False ceiling', category: 'Living Room', min: 3000, max: 6000, typical: 4900, words: ['false ceiling', 'cove ceiling', 'cove lighting', 'l-box', 'ceiling'] },
  { key: 'tv_console', name: 'TV console', category: 'Living Room', min: 2000, max: 5000, typical: 3200, words: ['tv console', 'tv cabinet', 'tv wall', 'entertainment unit', 'media console'] },
  { key: 'shoe_cabinet', name: 'Shoe cabinet', category: 'Living Room', min: 1500, max: 4000, typical: 2800, words: ['shoe cabinet', 'shoe rack', 'entryway cabinet'] },
  { key: 'display_cabinet', name: 'Display cabinet', category: 'Living Room', min: 2000, max: 5000, typical: 3500, words: ['display cabinet', 'bookshelves', 'bookshelf', 'shelving'] },
  { key: 'curtains', name: 'Curtains and blinds', category: 'Living Room', min: 1000, max: 3000, typical: 2000, words: ['curtains', 'curtain', 'blinds', 'window treatment'] },
  { key: 'vanity', name: 'Bathroom vanity', category: 'Bathroom', min: 1500, max: 3500, typical: 2200, words: ['bathroom vanity', 'vanity', 'basin cabinet'] },
  { key: 'shower_screen', name: 'Shower screen', category: 'Bathroom', min: 2000, max: 5000, typical: 3500, words: ['shower screen', 'glass partition', 'rain shower'] },
  { key: 'toilet_bowl', name: 'Toilet bowl', category: 'Bathroom', min: 1200, max: 3000, typical: 2000, words: ['toilet bowl', 'water closet', 'wc'] },
  { key: 'bathroom', name: 'Bathroom renovation', category: 'Bathroom', min: 5000, max: 12000, typical: 8000, words: ['bathroom renovation', 'toilet renovation', 'bathrooms', 'bathroom', 'toilets', 'toilet'], per: 'bathroom' },
  { key: 'flooring', name: 'Flooring', category: 'Whole home', min: 1500, max: 4500, typical: 3000, words: ['vinyl flooring', 'laminate floor', 'flooring', 'vinyl', 'parquet', 'spc'] },
  { key: 'painting', name: 'Painting', category: 'Whole home', min: 2000, max: 4000, typical: 3000, words: ['paint whole unit', 'wall paint', 'painting', 'repaint', 'paint'] },
  { key: 'electrical', name: 'Electrical works', category: 'Whole home', min: 2000, max: 5000, typical: 3500, words: ['electrical work', 'electrical', 'rewiring', 'power points', 'power point'] },
  { key: 'plumbing', name: 'Plumbing', category: 'Whole home', min: 1500, max: 4000, typical: 2500, words: ['plumbing work', 'plumbing', 'pipe work'] },
  { key: 'aircon', name: 'Aircon', category: 'Whole home', min: 800, max: 2500, typical: 1500, words: ['air conditioning', 'aircon piping', 'aircon'] },
  { key: 'carpentry', name: 'Custom carpentry', category: 'Whole home', min: 3000, max: 8000, typical: 5000, words: ['custom carpentry', 'built-in furniture', 'carpentry'] },
  { key: 'hacking', name: 'Hacking', category: 'Whole home', min: 500, max: 2000, typical: 1200, words: ['demolition', 'hacking', 'hack'] },
  { key: 'tiling', name: 'Tiling', category: 'Whole home', min: 1000, max: 3000, typical: 2000, words: ['floor tiles', 'wall tiles', 'tiling', 'retile', 'tiles'] },
  { key: 'doors', name: 'Main door and lock', category: 'Whole home', min: 2000, max: 5000, typical: 3000, words: ['main door', 'digital lock', 'gate'] },
  { key: 'lighting', name: 'Lighting', category: 'Whole home', min: 1500, max: 4000, typical: 2500, words: ['light fixtures', 'light installation', 'downlights', 'downlight', 'lighting', 'lights'] },
]
/* a room named with no works named takes the work it is known for (1.0's model priced a room's scope the same way) */
const ROOM_DEFAULTS: Record<string, string[]> = { kitchen: ['kitchen_cabinets', 'countertop'], bedroom: ['wardrobe'], bathroom: ['bathroom'], living: ['tv_console'], study: ['study_table'] }
const WHOLE_HOME = ['hacking', 'electrical', 'plumbing', 'painting', 'flooring']
/** Words that look like works and aren't (a site visit's "ceiling height", "floor area"). */
const NOT_WORKS = ['ceiling height', 'floor area', 'key collection', 'price range']

const countOf = (text: string, noun: 'bathroom' | 'bedroom'): number => {
  const re = noun === 'bathroom' ? /\b(\d|one|two|three|four|five)\s+(bathrooms?|toilets?)\b/i : /\b(\d|one|two|three|four|five)\s+(bedrooms?|rooms?)\b/i
  const m = re.exec(text); const n = m ? numOf(m[1]!) : null
  return n && n >= 1 && n <= 6 ? n : 1
}
export function estimateOf(text: string): Estimate {
  let work = ` ${text.toLowerCase().replace(/[’']/g, "'")} `
  for (const w of NOT_WORKS) work = work.split(w).join(' '.repeat(w.length))
  const picked = new Map<string, Rate>()
  /* longest words first; a phrase that matched is blanked so a shorter one never matches it again ("bathroom vanity" is not a bathroom) */
  const all = SG_RATES.flatMap((r) => r.words.map((w) => ({ r, w }))).sort((a, b) => b.w.length - a.w.length)
  for (const { r, w } of all) {
    const m = heard(work, w)
    if (!m) continue
    picked.set(r.key, r)
    const at = m.index + m[1]!.length
    work = `${work.slice(0, at)}${' '.repeat(w.length)}${work.slice(at + w.length)}`
  }
  const { rooms, whole } = readBrief(text)
  for (const room of rooms) for (const k of ROOM_DEFAULTS[room] ?? []) {
    const r = SG_RATES.find((x) => x.key === k)!
    if (![...picked.values()].some((p) => p.category === r.category)) picked.set(k, r)
  }
  if (whole) for (const k of WHOLE_HOME) if (!picked.has(k)) picked.set(k, SG_RATES.find((x) => x.key === k)!)
  const lines: EstimateLine[] = SG_RATES.filter((r) => picked.has(r.key)).map((r) => {
    const qty = r.per ? countOf(text, r.per) : 1
    return { key: r.key, name: qty > 1 ? `${r.name} × ${qty}` : r.name, category: r.category, qty, lowMinor: r.min * qty * 100, highMinor: r.max * qty * 100, typicalMinor: r.typical * qty * 100 }
  })
  const sum = (k: 'lowMinor' | 'highMinor' | 'typicalMinor') => lines.reduce((n, l) => n + l[k], 0)
  return { lines, lowMinor: sum('lowMinor'), highMinor: sum('highMinor'), typicalMinor: sum('typicalMinor') }
}

/* ── add-ons — 1.0's eight COMMON_UPSELLS: offered when their category is in scope or their words are heard, never when already in it ── */
const ADD_ONS: { key: string; description: string; category: string; value: number; words: string[]; covered: string[] }[] = [
  { key: 'pullout', description: 'Kitchen pull-out organiser with soft-close', category: 'Kitchen', value: 2800, words: ['kitchen'], covered: [] },
  { key: 'digital_lock', description: 'Smart digital lock for the main door', category: 'Whole home', value: 800, words: ['door', 'main door'], covered: ['doors'] },
  { key: 'led_strip', description: 'Under-cabinet LED strip in the kitchen', category: 'Kitchen', value: 600, words: ['kitchen'], covered: ['kitchen_lighting'] },
  { key: 'towel_rack', description: 'Heated towel rack in the bathroom', category: 'Bathroom', value: 450, words: ['bathroom'], covered: [] },
  { key: 'shoe_cabinet', description: 'Built-in shoe cabinet with ventilation', category: 'Living Room', value: 2200, words: ['living', 'entryway', 'entrance'], covered: ['shoe_cabinet'] },
  { key: 'cove', description: 'False ceiling with cove lighting', category: 'Living Room', value: 4900, words: ['living', 'ceiling'], covered: ['false_ceiling'] },
  { key: 'walk_in', description: 'Walk-in wardrobe with sliding doors', category: 'Bedroom', value: 5200, words: ['wardrobe', 'bedroom'], covered: ['walk_in_wardrobe'] },
  { key: 'shower_screen', description: 'Frameless glass shower screen', category: 'Bathroom', value: 2500, words: ['bathroom', 'shower'], covered: ['shower_screen'] },
]
export function addOnsFor(text: string, est: Estimate): Upsell[] {
  const cats = new Set(est.lines.map((l) => l.category))
  const have = new Set(est.lines.map((l) => l.key))
  return ADD_ONS.filter((a) => !a.covered.some((k) => have.has(k)) && (cats.has(a.category) || a.words.some((w) => heard(text, w)))).slice(0, 4)
    .map((a) => ({ key: a.key, description: a.description, category: a.category, valueMinor: a.value * 100 }))
}

/* ── tags — 1.0's fifteen (tag-config.ts PREDEFINED_TAGS; "Villa owner" reads "Landed owner" in Singapore), found by rule ── */
export const TAGS = ['Budget concern', 'Likes modern', 'Has kids', 'BTO owner', 'Landed owner', 'Condo owner', 'Timeline urgent', 'Comparing IDs', 'Wants kitchen', 'Wants bedroom', 'Wants bathroom', 'Price sensitive', 'Premium client', 'Spouse absent', 'First renovation'] as const
export const MAX_TAGS = 20

/** What the co-pilot reads in a meeting's words. */
export type ChecklistRow = ChecklistDef & { ticked: boolean; auto: boolean; evidence: string | null }
export type Reading = {
  lines: Line[]
  profile: Profile
  tips: Tip[]
  checklist: ChecklistRow[]
  missed: ChecklistRow[]
  closing: boolean
  dims: Dims
  score: number
  tier: Tier
  objections: BriefObjection[]
  tags: string[]
  autoTags: string[]
  estimate: Estimate
  addOns: Upsell[]
  styles: string[]
}
export type ReadInput = {
  notes: string
  aim: string
  client: string
  members: readonly string[]
  own: readonly OwnItem[]
  state: MeetingState
  answers: readonly ObjectionAnswer[]
  competitors: readonly string[]
  weights: Weights
  features: Features
}

/** The one reading — the seam a model would take later. */
export function readMeeting(i: ReadInput): Reading {
  const lines = linesOf(i.notes, { client: i.client, members: i.members })
  const said = clientLines(lines)
  const all = lines.map((l) => l.text).join('\n')
  const theirs = said.map((l) => l.text).join('\n')

  /* tips: the newest of each rule, every objection kind once per sentence; a sentence another rule already answered isn't read twice */
  const tips: Tip[] = []
  const used = new Set<number>()
  const objections: BriefObjection[] = []
  const answerTip = (kind: string, text: string) => { const a = answerFor(kind, text, i.answers); return a ? { title: a.title, text: a.answer } : null }
  for (const l of said) {
    const named = competitorIn(l.text, i.competitors)
    for (const r of RULES) {
      const hit = r.re.map((re) => re.exec(l.text)).find(Boolean)
      if (!hit && !(r.id === 'competitor_mention' && named)) continue
      used.add(l.n)
      const title = r.id === 'competitor_mention' && named ? `${named} is in play` : r.title
      const action: TipAction | null = r.id === 'competitor_mention' && i.features.competitor_analysis ? { kind: 'xray', label: 'Read their quote' } : null
      const answer = r.objection ? answerTip(r.objection, l.text) : null
      tips.push({ key: `${r.id}:${l.n}`, rule: r.id, kind: r.kind, title, body: r.body, said: quoteOf(l.text, hit?.index ?? 0), line: l.n, answer, action })
      if (r.objection && !objections.some((o) => o.kind === r.objection && o.said === quoteOf(l.text))) objections.push({ kind: r.objection, said: quoteOf(l.text), answer: answer?.text ?? null, answerTitle: answer?.title ?? null, competitor: r.objection === 'competition' ? named : null })
    }
    if (!used.has(l.n)) {
      const kind = kindOf(l.text)
      if (kind) {
        used.add(l.n)
        const a = answerTip(kind, l.text)
        tips.push({ key: `kind_${kind}:${l.n}`, rule: `kind_${kind}`, kind: kind === 'competition' ? 'rival' : 'objection', title: `${kindLabel(kind)} concern`, body: a ? 'They said it — your studio’s answer is below.' : `Settle it before you move on. Your studio has no answer saved for ${kindLabel(kind).toLowerCase()} yet — add one in Settings › Meetings.`, said: quoteOf(l.text), line: l.n, answer: a, action: null })
        objections.push({ kind, said: quoteOf(l.text), answer: a?.text ?? null, answerTitle: a?.title ?? null, competitor: kind === 'competition' ? named : null })
      }
    }
    const budget = BUDGET_RULE.map((re) => re.exec(l.text)).find(Boolean)
    if (budget) {
      const b = budgetIn([l])
      tips.push({ key: `budget_stated:${l.n}`, rule: 'budget_stated', kind: 'tip', title: 'Budget noted', body: b ? `They said ${b.min === b.max ? moneyWords(b.min) : `${moneyWords(b.min)}–${moneyWords(b.max)}`}. Use it as your anchor — show options just above and below it.` : 'They mentioned a budget. Ask for the figure and whether it can stretch.', said: quoteOf(l.text, budget.index), line: l.n, answer: null, action: null })
    }
  }
  /* a style named: offer its mood board while it's fresh */
  const styles = stylesIn(theirs)
  if (i.features.moodboard) for (const s of styles) {
    const l = said.find((x) => heard(x.text, s) || Object.entries(STYLE_ALIAS).some(([w, v]) => v === s && heard(x.text, w)))
    if (l && !i.state.boards.includes(s)) tips.push({ key: `style_${s}:${l.n}`, rule: `style_${s}`, kind: 'idea', title: `A ${s} look`, body: `Show ${firstName(i.client)} a ${s} mood board while it’s fresh in the conversation.`, said: quoteOf(l.text), line: l.n, answer: null, action: { kind: 'moodboard', label: 'Make the mood board', style: s } })
  }
  /* one card per rule — the newest; the ones the member closed stay closed */
  const newest = new Map<string, Tip>()
  for (const t of tips) { const was = newest.get(t.rule); if (!was || t.line >= was.line) newest.set(t.rule, t) }
  const shown = i.features.coaching || i.features.moodboard ? [...newest.values()].filter((t) => (t.rule.startsWith('style_') ? i.features.moodboard : i.features.coaching)).sort((a, b) => b.line - a.line) : []

  /* the checklist: a word heard on either side ticks it (what was discussed is the point) — a hand tick or untick wins */
  const defs = checklistFor(i.aim, i.own)
  const checklist: ChecklistRow[] = defs.map((d) => {
    const ev = lines.find((l) => d.words.some((w) => heard(l.text, w)))
    const hand = i.state.hand[d.id]
    return { ...d, ticked: hand ?? !!ev, auto: hand === undefined && !!ev, evidence: ev ? quoteOf(ev.text) : null }
  })
  const tail = lines.slice(-5).map((l) => l.text).join(' ')
  const closing = /\b(next meeting|meet again|see you|thanks? (you )?for (your )?time|let'?s proceed|go ahead with|get back to (you|me|us)|speak (again|soon)|that'?s all)\b/i.test(tail)
  const missed = checklist.filter((c) => c.category === 'critical' && !c.ticked)

  /* the deal score: signals in the order they were said */
  const dims: Dims = { ...START_DIMS }
  for (const l of said) for (const s of SIGNALS) if (s.re.some((re) => re.test(l.text))) dims[s.dim] = s.score / 10
  if (budgetIn(said) && dims.budget === START_DIMS.budget) dims.budget = 0.7
  const score = scoreOf(dims, i.weights)

  /* the facts */
  const budget = budgetIn(said)
  const decision = said.map((l) => WHO.exec(l.text)?.[1]?.toLowerCase()).find(Boolean) ?? null
  const kinds = [...new Set(objections.map((o) => o.kind))]
  const named = [...new Set(said.map((l) => competitorIn(l.text, i.competitors)).filter((x): x is string => !!x))]
  const { rooms, whole } = readBrief(all)
  const profile: Profile = {
    propertyType: propertyIn(theirs) ?? propertyIn(all),
    areaSqft: areaIn(all),
    budgetMinor: budget ? { min: budget.min, max: budget.max } : null,
    styles,
    timeline: timelineIn(said),
    keyCollection: keysIn(theirs),
    decisionMakers: decision ? `With their ${decision}` : null,
    household: HOUSEHOLD.filter((h) => h.re.test(theirs)).map((h) => h.label),
    rooms: whole ? ['Whole home', ...rooms.map(roomWord)] : rooms.map(roomWord),
    concerns: kinds.map(kindLabel),
    competitors: named,
  }
  const estimate = estimateOf(all)
  const addOns = addOnsFor(all, estimate)

  /* the tags: found by rule, the member's own added, the ones they removed left out */
  const rules = new Set(tips.map((t) => t.rule))
  const pt = profile.propertyType ?? ''
  const auto: string[] = [
    ...(kinds.includes('price') ? ['Budget concern'] : []),
    ...(styles.some((s) => ['Modern', 'Contemporary', 'Minimalist'].includes(s)) ? ['Likes modern'] : []),
    ...(profile.household.includes('Kids') ? ['Has kids'] : []),
    ...(/^BTO/.test(pt) || /\bbto\b/i.test(theirs) ? ['BTO owner'] : []),
    ...(/^Landed/.test(pt) || /\b(landed|bungalow|semi-?d|terrace)\b/i.test(theirs) ? ['Landed owner'] : []),
    ...(/^(Condo|Executive Condo|Penthouse)/.test(pt) || /\bcondo\b/i.test(theirs) ? ['Condo owner'] : []),
    ...(rules.has('timeline_urgent') ? ['Timeline urgent'] : []),
    ...(kinds.includes('competition') || named.length ? ['Comparing IDs'] : []),
    ...(rooms.includes('kitchen') ? ['Wants kitchen'] : []),
    ...(rooms.includes('bedroom') ? ['Wants bedroom'] : []),
    ...(rooms.includes('bathroom') ? ['Wants bathroom'] : []),
    ...(/\b(discount|cheaper|cost[- ]effective|save (cost|money)|tight budget)\b/i.test(theirs) ? ['Price sensitive'] : []),
    ...((budget && budget.max >= 15_000_000) || /\b(luxury|premium|high[- ]end)\b/i.test(theirs) ? ['Premium client'] : []),
    ...(rules.has('decision_deferred') ? ['Spouse absent'] : []),
    ...(/\b(first time|first reno(vation)?|never renovated)\b/i.test(theirs) ? ['First renovation'] : []),
  ].filter((t) => !i.state.removedTags.includes(t))
  const tags = [...new Set([...auto, ...i.state.tags.filter((t) => !i.state.removedTags.includes(t))])].slice(0, 20)

  return { lines, profile, tips: shown.filter((t) => !i.state.dismissed.includes(t.key)), checklist, missed, closing, dims, score, tier: tierOf(score), objections, tags, autoTags: auto, estimate, addOns, styles }
}

const roomWord = (r: string) => ({ kitchen: 'Kitchen', bathroom: 'Bathrooms', bedroom: 'Bedrooms', living: 'Living and dining', balcony: 'Balcony', study: 'Study' } as Record<string, string>)[r] ?? r
const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n
/** "S$ 150,000" — the tips' and the brief's figures, the record cards' format (lib/format `moneyCard`). */
export const moneyWords = (minor: number) => moneyCard(minor)
/** The dimensions as lines, weakest first — the prep card's and the brief's "why". */
export const dimLines = (d: Dims) => DIMENSIONS.map((k) => ({ key: k.key, label: k.label, value: d[k.key], line: d[k.key] >= 0.6 ? k.high : k.low })).sort((a, b) => a.value - b.value)
