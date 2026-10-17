/**
 * (pending modules S23 — card api:copilot-objections-competitors) The studio's answers to what clients push back on. 1.0 kept ten kinds (price ·
 * timeline · trust · scope · competition · quality · commitment · value · process · comparison), seeded from platform defaults per country
 * (src/data/copilot-objection-defaults.ts — Singapore's 26 are below, 1.0's words), edited under Accounts › AI & Copilot › Objection Responses —
 * and never shown in a meeting. Here the defaults are the studio's from the first day (no "Load platform defaults" step), a studio's edit is a
 * row over its default (`studio_objection_responses.default_key`), and the meeting's tip card shows the answer that fits what the client said.
 * Pure and client-safe; the rows are read by lib/meetings/queries.ts.
 */
import { heard } from './checklists'

export const OBJECTION_KINDS = [
  { key: 'price', label: 'Price' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'trust', label: 'Trust & credibility' },
  { key: 'scope', label: 'Scope' },
  { key: 'competition', label: 'Competition' },
  { key: 'quality', label: 'Quality & materials' },
  { key: 'commitment', label: 'Commitment' },
  { key: 'value', label: 'Value' },
  { key: 'process', label: 'Process & logistics' },
  { key: 'comparison', label: 'Comparison' },
] as const
export type ObjectionKind = (typeof OBJECTION_KINDS)[number]['key']
export const isObjectionKind = (v: unknown): v is ObjectionKind => typeof v === 'string' && OBJECTION_KINDS.some((k) => k.key === v)
export const kindLabel = (k: string) => OBJECTION_KINDS.find((x) => x.key === k)?.label ?? k

/** One answer as every surface reads it: a platform default (`key` = `sg:<n>`) or the studio's own (`key` = its row id). */
export type ObjectionAnswer = { key: string; kind: ObjectionKind; title: string; context: string | null; answer: string; active: boolean; platform: boolean; edited: boolean }

/** 1.0's Singapore defaults, in 1.0's order and words (lines 12–205 of the file). */
export const SG_DEFAULTS: readonly Omit<ObjectionAnswer, 'key' | 'active' | 'platform' | 'edited'>[] = [
  { kind: 'price', title: 'Your quote is too high', context: 'Homeowner feels the overall renovation cost is above their budget or expectations for their HDB/condo unit.', answer: 'I understand budget is a real concern, especially with the cost of living in Singapore. Let me walk you through exactly what is included in this quote — materials, labour, and project management — so you can see where every dollar goes. We can also look at phasing certain works or adjusting material grades to bring the total closer to your comfort zone without compromising the design intent.' },
  { kind: 'price', title: 'My friend’s reno cost much less', context: 'Homeowner compares the quote to a friend or family member who renovated at a lower cost.', answer: 'Every renovation is different — the layout, scope, material choices, and even the year of renovation all affect the final cost. I would be happy to show you a detailed cost breakdown so you can see exactly what you are getting. If there are specific areas where you would like to explore more cost-effective options, we can absolutely do that together.' },
  { kind: 'price', title: 'Can you give me a discount?', context: 'Homeowner asks for a blanket discount on the overall quote without specifying what to reduce.', answer: 'I appreciate you being upfront about this. Rather than an across-the-board discount that might affect quality, let me identify areas where we can optimise costs — for example, switching to a comparable laminate instead of solid surface, or adjusting the cabinetry design. That way you save money without sacrificing the look and durability you want.' },
  { kind: 'timeline', title: '6–10 weeks is too long', context: 'Homeowner feels the standard renovation timeline is excessive and wants it done faster.', answer: 'I completely understand wanting to move in quickly, especially if you are paying rent on top of your mortgage. The 6-10 week range accounts for HDB permit processing, material lead times, and proper curing periods for wet works. Rushing these stages often leads to defects that cost more to fix later. I will build in every efficiency I can and keep you updated weekly so there are no surprises.' },
  { kind: 'timeline', title: 'My BTO key collection is uncertain', context: 'Homeowner has a BTO flat but the key collection date keeps shifting, making it hard to commit to a renovation timeline.', answer: 'This is very common with BTO timelines and we have helped many homeowners navigate this. We can start the design phase now — layout planning, material selection, 3D renders — so everything is ready to go the moment you get your keys. We only lock in the construction schedule and material orders closer to your confirmed collection date, so there is zero risk on your end.' },
  { kind: 'timeline', title: 'HDB permit takes too long', context: 'Homeowner is frustrated by the time needed for HDB renovation permits.', answer: 'I hear you — the permit process can feel like a bottleneck. The good news is we handle the entire submission for you, and because we have done hundreds of HDB renovations, we know exactly how to prepare the documents to avoid rejections or delays. We also use the permit processing window to finalise your material selections and custom orders so no time is wasted.' },
  { kind: 'trust', title: 'How do I know you won’t disappear mid-project?', context: 'Homeowner has heard horror stories about contractors or IDs abandoning projects.', answer: 'That is a very valid concern and I am glad you are asking. We are a CaseTrust-accredited firm, which means we follow a structured payment schedule — you never pay the full amount upfront. You can also check our track record on Qanvast where past homeowners have shared their experience. I am committed to being reachable throughout, and you will have a dedicated project chat with me for real-time updates.' },
  { kind: 'trust', title: 'I had a bad experience with a previous ID', context: 'Homeowner was burned by a previous renovation experience and is cautious about trusting a new designer.', answer: 'I am sorry you went through that — it is unfortunately something we hear from time to time. What I can promise is full transparency: a detailed written scope, a milestone-based payment schedule, and weekly photo updates so you always know exactly where things stand. Would it help if I connected you with a recent client who had a similar concern and can share their experience with us?' },
  { kind: 'trust', title: 'Can I visit one of your ongoing sites?', context: 'Homeowner wants proof of workmanship before committing.', answer: 'Absolutely, I would be happy to arrange that. We usually have one or two projects in progress at any given time, and seeing the actual workmanship and site management firsthand is the best way to feel confident. I will check with the current homeowner for a convenient time and set it up for you.' },
  { kind: 'scope', title: 'I only want to do the kitchen and bathrooms', context: 'Homeowner wants a partial renovation instead of a full overhaul.', answer: 'Absolutely, we do partial renovations all the time. Let me put together a focused scope for just those areas so you get an accurate quote without any extras. I will also flag anything structural or plumbing-related that might be worth addressing now while the walls are open — that is entirely your call, but it is better to know upfront than discover it later.' },
  { kind: 'scope', title: 'I don’t need an ID — I can just use a contractor', context: 'Homeowner questions the value of hiring an interior designer versus going direct to a contractor.', answer: 'That is a fair question. The value an ID brings is in the planning and coordination — we catch layout issues, optimise storage, manage permits, and handle vendor scheduling so you do not have to chase five different parties. Many homeowners who started with a contractor alone end up spending more on rework. I am happy to show you a side-by-side of what our service covers so you can decide if it is right for you.' },
  { kind: 'scope', title: 'Can I supply my own materials to save cost?', context: 'Homeowner wants to purchase their own tiles, fixtures, or fittings to cut costs.', answer: 'You are welcome to supply certain items — many homeowners source their own lights, sanitary fittings, or feature tiles. I will flag which items are best for you to source and which ones we should handle to ensure warranty coverage and proper sizing. The key is coordination on delivery timing so it does not delay the project. Let me give you a list of what works well as owner-supplied items.' },
  { kind: 'competition', title: 'I’m still comparing with other firms', context: 'Homeowner is collecting quotes from multiple studios and has not made a decision.', answer: 'That is absolutely the right approach — you should feel confident in whoever you choose. While you are comparing, I would encourage you to look beyond just the bottom-line price: check what is included in each quote, the warranty terms, and the payment structure. If you have any questions about our breakdown or want to do a like-for-like comparison, I am happy to help you make sense of it.' },
  { kind: 'competition', title: 'Another firm has a cheaper package', context: 'Homeowner received a lower quote from a competing studio.', answer: 'Thanks for sharing that — it is helpful for me to understand. Package pricing can vary a lot depending on what is included: the grade of materials, whether electrical and plumbing are covered, and the warranty period. If you are comfortable sharing the other quote, I can help you do a line-by-line comparison so you are making an apples-to-apples decision. I want you to get the best value regardless of who you choose.' },
  { kind: 'quality', title: 'Will the carpentry actually last?', context: 'Homeowner is concerned about the durability and longevity of custom carpentry work.', answer: 'Great question. All our carpentry uses high-pressure laminates on moisture-resistant MDF or plywood cores, which are well-suited to Singapore’s humidity. We also provide a warranty on all built-in carpentry. I can show you samples of the actual materials and even arrange a visit to a recently completed unit so you can see and feel the quality firsthand.' },
  { kind: 'quality', title: 'What warranty do you provide?', context: 'Homeowner wants to understand what is covered after the renovation is completed.', answer: 'We provide a 1-year defect liability period on all works, covering issues like carpentry warping, paint peeling, or plumbing faults that arise from our workmanship. Appliances and fixtures carry their own manufacturer warranties which we will hand over to you. After the warranty period, we are still a phone call away for any maintenance needs.' },
  { kind: 'commitment', title: 'I need to discuss with my spouse first', context: 'Homeowner wants to consult their partner before making a commitment.', answer: 'Of course — this is a big decision and both of you should be comfortable with it. Would it help if I prepared a summary with the layout, 3D renders, and cost breakdown that you can share? I am also happy to schedule a follow-up meeting where both of you can be present so we can address any questions together.' },
  { kind: 'commitment', title: 'I’m not ready to sign anything yet', context: 'Homeowner is interested but feels pressured and wants more time.', answer: 'No pressure at all — I want you to feel completely comfortable. Let me send you the detailed proposal and 3D renders so you can review everything at your own pace. If any questions come up, just drop me a message. There is no deadline on our end, and the quote will remain valid for 30 days.' },
  { kind: 'commitment', title: 'What if renovation costs go up after I sign?', context: 'Homeowner is worried about unexpected cost increases once the contract is signed.', answer: 'Our contract locks in the agreed price for the stated scope. The only time costs change is if you request additional work — a variation order — which we will always get your written approval on before proceeding, with the exact additional cost spelled out. There are no surprise charges. Transparency on costs is something we take very seriously.' },
  { kind: 'value', title: 'Why should I pay for design when I know what I want?', context: 'Homeowner believes they have a clear vision and do not see the value in paying for design services.', answer: 'It is actually great that you have a strong vision — it makes my job easier and the outcome better. Where the design service adds value is in translating that vision into buildable plans, catching issues before they become expensive mistakes, and handling the coordination with contractors and suppliers. Think of it as insurance that your vision gets executed correctly the first time.' },
  { kind: 'value', title: 'Is 3D rendering really necessary?', context: 'Homeowner questions whether paying for 3D visualisation is worth it.', answer: '3D renders are actually one of the most valuable parts of the process — they let you walk through your renovated space before a single wall is touched. Many homeowners have caught layout issues or changed their mind on colour schemes at the render stage, which saved them thousands in rework. It is included in our design fee, not an extra charge.' },
  { kind: 'process', title: 'What happens if I’m not happy with the design?', context: 'Homeowner worries about being stuck with a design they do not like after paying.', answer: 'We build in revision rounds at every stage — concept, layout, 3D visualisation — specifically so we catch anything you are not happy with before any work begins. You will see realistic 3D renders of your space and approve every detail before we proceed to construction. The design phase is where we get it right together.' },
  { kind: 'process', title: 'How are payments structured?', context: 'Homeowner is unsure about the payment schedule and worried about paying too much upfront.', answer: 'We follow a milestone-based payment schedule, which is the CaseTrust-recommended approach. Typically it is broken into stages — deposit, after hacking, after carpentry installation, and final handover. You only pay for work that has been completed and verified. I will walk you through the exact schedule so you know exactly when each payment falls.' },
  { kind: 'comparison', title: 'I saw a nice design on Pinterest — can you do that?', context: 'Homeowner has inspirational images but is unsure if the same look is achievable in their HDB/condo.', answer: 'I love when homeowners bring references — it helps me understand your taste quickly. Let me take a look at the images and I will tell you honestly what is achievable in your space given the layout, ceiling height, and HDB guidelines. Often we can capture the same feel with some smart adaptations. I will mock up a version in your actual floor plan so you can see exactly how it translates.' },
  { kind: 'comparison', title: 'Online renovation packages seem much simpler', context: 'Homeowner is attracted to fixed-price online renovation packages that seem straightforward.', answer: 'Those packages are a great starting point for understanding base costs. What I have found is that most homeowners end up needing add-ons that are not included — things like electrical points, feature walls, or custom storage. With us, the quote covers your actual requirements from the start so there are no hidden extras. I am happy to show you exactly what is in our scope compared to a typical package.' },
  { kind: 'comparison', title: 'I wasn’t expecting to spend this much on a resale flat', context: 'Homeowner bought a resale HDB and is surprised by the renovation costs on top of the purchase price.', answer: 'Resale renovations can sometimes cost more than BTO because of the hacking and rectification work needed. The upside is you are moving into an established estate with mature amenities. Let me show you which items in the quote are resale-specific — like removing old built-ins or re-tiling — so you understand why it differs from a new flat. We can also prioritise the must-haves and phase the nice-to-haves.' },
]
export const defaultKey = (i: number) => `sg:${i + 1}`

/** A stored row as `answersFrom` reads it. */
export type AnswerRow = { id: string; defaultKey: string | null; objectionType: string; objectionTitle: string; objectionDescription: string | null; recommendedResponse: string; isActive: boolean; sortOrder: number; deletedAt: unknown }

/** The studio's answers: each platform default (or the studio's edit of it, `default_key`), then the studio's own, in each kind's order. */
export function answersFrom(rows: readonly AnswerRow[]): ObjectionAnswer[] {
  const live = rows.filter((r) => !r.deletedAt)
  const over = new Map(live.filter((r) => r.defaultKey).map((r) => [r.defaultKey!, r]))
  const defaults: ObjectionAnswer[] = SG_DEFAULTS.map((d, i) => {
    const r = over.get(defaultKey(i))
    return r ? { key: defaultKey(i), kind: d.kind, title: r.objectionTitle, context: r.objectionDescription, answer: r.recommendedResponse, active: r.isActive, platform: true, edited: true }
      : { key: defaultKey(i), kind: d.kind, title: d.title, context: d.context, answer: d.answer, active: true, platform: true, edited: false }
  })
  const own: ObjectionAnswer[] = live.filter((r) => !r.defaultKey && isObjectionKind(r.objectionType)).sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({ key: r.id, kind: r.objectionType as ObjectionKind, title: r.objectionTitle, context: r.objectionDescription, answer: r.recommendedResponse, active: r.isActive, platform: false, edited: false }))
  const order = (k: string) => OBJECTION_KINDS.findIndex((x) => x.key === k)
  return [...defaults, ...own].map((a, n) => ({ a, n })).sort((x, y) => order(x.a.kind) - order(y.a.kind) || x.n - y.n).map((x) => x.a)
}

/**
 * The words that mark each kind in a client's sentence — the rule standing in for 1.0's model classification (analysis-pass.ts
 * objectionClassification). Checked in this order; a sentence is the first kind it reads as.
 */
const KIND_WORDS: { kind: ObjectionKind; re: RegExp }[] = [
  { kind: 'competition', re: /\b(other|another) (firms?|studios?|designers?|ids?|contractors?|compan(y|ies))\b|\bcomparing\b|\b(other|more) quotes?\b|\bcheaper package\b|\b(they|someone) quoted\b/i },
  { kind: 'price', re: /\btoo (high|expensive|much|pricey)\b|\b(over|above|beyond) (our|my|the) budget\b|\bcan'?t afford\b|\bdiscount\b|\bcheaper\b|\bcost(s|ing)? (much )?(less|more)\b|\b(more|higher) than (i|we) expected\b|\b(price|cost|quote|budget)s? (feels?|seems?|is|looks?|sounds?) (a bit |a little |quite |rather |very |too )?(high|steep|expensive|pricey)\b|\bthat'?s (a lot|expensive|quite a bit)\b|\bexpensive\b/i },
  { kind: 'commitment', re: /\b(discuss|check|talk) (it )?with (my|our) (husband|wife|spouse|partner|parents|family)\b|\b(husband|wife|spouse|partner) (needs?|has|have) to\b|\bnot ready\b|\bsleep on it\b|\bthink (about )?it over\b|\bneed (some )?time\b|\b(i'?ll|we'?ll) (get back|let you know)\b|\bgo up after (i|we) sign\b/i },
  { kind: 'timeline', re: /\btoo long\b|\btakes? (so |too )?long\b|\bfaster\b|\b(key collection|bto) (is |keeps )?(uncertain|delayed|shifting)\b|\bpermit\b.*\b(long|slow|delay)|\bdelays?\b|\b(6|six)[- ]?(to|-)?[- ]?(10|ten) weeks\b/i },
  { kind: 'trust', re: /\bdisappear\b|\bbad experience\b|\bscam(med)?\b|\btrust\b|\b(horror )?stories\b|\bongoing sites?\b|\btrack record\b|\breviews?\b|\bburned\b|\bburnt\b/i },
  { kind: 'scope', re: /\bonly (want|need) (to do )?(the )?(kitchen|bathrooms?|bedrooms?|living)\b|\bjust (the )?(kitchen|bathrooms?)\b|\b(just|only) (use|get) a contractor\b|\bdon'?t need an id\b|\b(supply|buy) (my|our) own\b|\bown materials\b/i },
  { kind: 'quality', re: /\b(last|durable|durability)\b.*\b(carpentry|cabinets?|wardrobes?)\b|\bwarranty\b|\bguarantee\b|\bquality\b|\bwarp(ing)?\b|\bpeel(ing)?\b/i },
  { kind: 'value', re: /\bwhy (should|do) (i|we) pay\b|\bdesign fee\b|\b(3d|render(ing)?s?) (really )?(necessary|worth)\b|\bworth (it|the money)\b/i },
  { kind: 'process', re: /\bnot happy with the design\b|\bpayments? (are )?(structured|schedule|terms)\b|\bhow (do|does|are) (the )?payments?\b|\bpay (everything |it all )?upfront\b|\bwhat happens if\b/i },
  { kind: 'comparison', re: /\bpinterest\b.*\b(can you|do that)\b|\bonline (renovation )?packages?\b|\bpackages? seem\b|\b(wasn'?t|weren'?t|didn'?t) expect(ing)? to spend\b|\bresale flat\b.*\bspend\b/i },
]
/** The kind a sentence reads as, or null. */
export function kindOf(sentence: string): ObjectionKind | null {
  return KIND_WORDS.find((k) => k.re.test(sentence))?.kind ?? null
}

const wordsIn = (s: string) => new Set(s.toLowerCase().replace(/[’']/g, "'").split(/[^a-z0-9']+/).filter((w) => w.length >= 4))
/** The studio's answer that fits what was said: the kind's active answers, the one sharing most words with the sentence (the first on a tie). */
export function answerFor(kind: string, said: string, answers: readonly ObjectionAnswer[]): ObjectionAnswer | null {
  const pool = answers.filter((a) => a.kind === kind && a.active)
  if (!pool.length) return null
  const w = wordsIn(said)
  return pool.map((a, i) => ({ a, i, s: [...wordsIn(`${a.title} ${a.context ?? ''}`)].filter((x) => w.has(x)).length })).sort((x, y) => y.s - x.s || x.i - y.i)[0]!.a
}

/** A competitor the studio named, heard by its name. */
export function competitorIn(sentence: string, names: readonly string[]): string | null {
  return names.find((n) => n.trim().length >= 2 && heard(sentence, n)) ?? null
}
