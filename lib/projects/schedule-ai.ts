/**
 * (gaps build I, I-Q13…I-Q15 — 1.0's "Generate from a quote", B-249 · B-273 · E-266…E-281, held by Q-12 until now) **Drafted by Maison AI**:
 * a schedule proposal from the quote's lines, the scope's rooms, the kind of home and the project type — curated and deterministic (the same
 * records always draft the same schedule), no model call and no AI credits (Q-30). Pure and client-safe: the Start card and the Rebuild
 * dialog draw the draft with it, and the server drafts again from its own records when it lands, dropping only what the studio unticked.
 *
 * What it does that the plain rule (lib/projects/schedule-phases.ts) does not:
 * - **Permits first** — the stage the kind of home needs before works start (an HDB flat's permit and the neighbours' notice, a condo's MCST
 *   approval, a landed home's URA / BCA checks), with the compliance items it covers.
 * - **Each stage sized by its lines** — 1.0's minimum days plus days per line, held inside the stage's usual range; more rooms, a longer paint.
 * - **Why** — every milestone says what it was drafted from ("12 carpentry lines across Kitchen and Master Bedroom").
 * - **Worth knowing** — 1.0's tips and risk warnings, saved and never shown there (E-281), shown here before anything lands.
 * 1.0's faults not ported: no silent fallback dressed as the AI's (E-280) — the draft says what it read; nothing replaces a schedule without
 * the rebuild's plan (E-279).
 */
import { nextWeekday } from './schedule-model'
import { PHASES, type Draft } from './schedule-phases'
import { complianceKindOf, type ComplianceKind } from '@/lib/compliance/model'

export type AiLine = { trade: string | null; name: string; section: string | null }
export type AiInput = { lines: AiLine[]; rooms: string[]; propertyType: string | null; projectType: string | null; quoteNumber: string | null; client?: string | null }
export type AiDraft = Draft & { key: string; why: string }
export type AiNote = { tone: 'risk' | 'tip'; text: string }
export type AiPlan = { drafts: AiDraft[]; notes: AiNote[]; read: string; kind: ComplianceKind | null }

/** Per stage: the fewest days, the days each line adds, the most (1.0's canonical phases, B-275, mapped onto 2.0's stages). */
const SIZE: Record<string, { min: number; per: number; max: number }> = {
  hacking: { min: 5, per: 0.4, max: 14 },
  masonry: { min: 7, per: 0.6, max: 28 },
  services: { min: 7, per: 0.5, max: 24 },
  carpentry: { min: 14, per: 0.8, max: 35 },
  installation: { min: 3, per: 0.3, max: 10 },
  painting: { min: 4, per: 0.3, max: 12 },
  cleaning: { min: 3, per: 0, max: 3 },
  handover: { min: 3, per: 0, max: 3 },
}
/** Words in a line's name or section that place it when its trade doesn't (1.0's synonyms, B-275). */
const WORDS: [string, RegExp][] = [
  ['hacking', /\b(hack|hacking|demoli|dismantl|strip[- ]?out|removal)/i],
  ['masonry', /\b(tile|tiling|screed|waterproof|plaster|cement|wet works|vinyl|parquet|laminate floor|flooring|skirting)/i],
  ['services', /\b(wiring|power point|socket|switch|lighting point|electrical|plumb|pipe|sanitary|aircon|air-con|false ceiling|ceiling|cove|partition)/i],
  ['carpentry', /\b(wardrobe|cabinet|carpentry|vanity|tv console|shoe cabinet|study table|built[- ]in|joinery|kitchen top|countertop|quartz)/i],
  ['painting', /\b(paint|primer|wallpaper|feature wall finish)/i],
  ['installation', /\b(install|glass|mirror|shower screen|door|ironmongery|grille|blind|curtain)/i],
]
const NO_STAGE = new Set(['design', 'logistics', 'others', 'other', ''])
const ROOM_WORDS: [string, RegExp][] = [
  ['Living Room', /\bliving\b/i], ['Kitchen', /\bkitchen\b/i], ['Master Bedroom', /\bmaster\b/i], ['Bedroom 2', /\b(bedroom 2|common bedroom|bedroom two)\b/i],
  ['Bedroom 3', /\b(bedroom 3|bedroom three)\b/i], ['Bathroom 1', /\b(master bath|bathroom 1|toilet 1)\b/i], ['Bathroom 2', /\b(common bath|bathroom 2|toilet 2)\b/i],
  ['Balcony', /\bbalcony\b/i], ['Service Yard', /\b(service yard|yard)\b/i], ['Study', /\bstudy\b/i], ['Dining', /\bdining\b/i],
]

/** The stage a line belongs to: its trade first (the plain rule's table), else its words; null for design, logistics and the like. */
export function stageOfLine(l: AiLine): string | null {
  const t = (l.trade ?? '').trim().toLowerCase()
  if (t && NO_STAGE.has(t)) return null
  const byTrade = t ? PHASES.find((p) => p.trades.includes(t))?.key ?? null : null
  if (byTrade) return byTrade
  const words = `${l.name} ${l.section ?? ''}`
  for (const [key, re] of WORDS) if (re.test(words)) return key
  return t ? 'installation' : null
}
const roomsOf = (lines: AiLine[], scope: string[]): string[] => {
  const found = new Set<string>()
  for (const l of lines) { const w = `${l.name} ${l.section ?? ''}`; for (const [room, re] of ROOM_WORDS) if (re.test(w)) found.add(room) }
  const inScope = scope.length ? [...found].filter((r) => scope.includes(r)) : [...found]
  return inScope.length ? inScope : [...found]
}
const words = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)
const lines = (n: number, what: string) => `${n} ${what} line${n === 1 ? '' : 's'}`
const TRADE_WORD: Record<string, string> = { hacking: 'hacking', masonry: 'tiling and wet-works', services: 'electrical and plumbing', carpentry: 'carpentry', installation: 'installation', painting: 'painting' }

const PERMITS: Record<ComplianceKind, { title: string; days: number; why: string }> = {
  hdb: { title: 'HDB permit & neighbours’ notice', days: 14, why: 'An HDB flat: the renovation permit and the written notice to the neighbours come before any hacking — the Compliance tab’s first items.' },
  condo: { title: 'MCST approval & site protection', days: 7, why: 'A condo: the MCST’s renovation approval and its deposit, and the common areas protected, before works start.' },
  landed: { title: 'Permits & site protection', days: 14, why: 'A landed home: whether URA planning permission and BCA plans are needed is settled first, then the site is protected.' },
}

/** The draft: permits, then each stage of work the lines call for, sized by them, laid from works start; then cleaning and the handover. */
export function draftTimeline(input: AiInput, start: number, skip: readonly string[] = []): AiPlan {
  const kind = complianceKindOf(input.propertyType)
  const commercial = /commercial/i.test(input.projectType ?? '') || /^commercial/i.test(input.propertyType ?? '')
  const byStage = new Map<string, AiLine[]>()
  for (const l of input.lines) { const k = stageOfLine(l); if (k) byStage.set(k, [...(byStage.get(k) ?? []), l]) }
  type Part = { key: string; title: string; days: number; overlap: number; why: string; askConfirm: boolean }
  const parts: Part[] = []
  if (kind && !commercial) { const p = PERMITS[kind]; parts.push({ key: 'permits', title: p.title, days: byStage.has('hacking') || kind !== 'hdb' ? p.days : 7, overlap: 0, why: p.why, askConfirm: false }) }
  const roomCount = Math.max(input.rooms.length, roomsOf(input.lines, input.rooms).length)
  for (const ph of PHASES) {
    if (ph.always) continue
    const mine = byStage.get(ph.key) ?? []
    if (!mine.length) continue
    const s = SIZE[ph.key]!
    let days = Math.round(s.min + mine.length * s.per)
    if (ph.key === 'painting' && roomCount > 3) days += Math.ceil((roomCount - 3) / 2)
    days = Math.max(s.min, Math.min(s.max, days))
    const rooms = roomsOf(mine, input.rooms)
    const named = [...new Set(mine.map((l) => l.name.trim()).filter(Boolean))].slice(0, 2)
    const why = `${lines(mine.length, TRADE_WORD[ph.key] ?? ph.title.toLowerCase())}${rooms.length ? ` across ${words(rooms.slice(0, 3))}${rooms.length > 3 ? ` and ${rooms.length - 3} more` : ''}` : ''}${named.length ? ` — ${words(named.map((n) => `“${n.slice(0, 40)}”`))}` : ''}.`
      + (ph.key === 'carpentry' ? ' Made off site while the services go in.' : ph.overlap ? ' Starts while the stage before finishes.' : '')
    parts.push({ key: ph.key, title: ph.title, days, overlap: ph.overlap ?? 0, why, askConfirm: false })
  }
  parts.push({ key: 'cleaning', title: 'Cleaning & touch-up', days: roomCount > 5 ? 4 : 3, overlap: 0, why: 'Every job ends with a clean of the whole home and a round of touch-ups.', askConfirm: false })
  parts.push({ key: 'handover', title: 'Handover & defect check', days: 3, overlap: 0, why: `The walk-through with ${input.client ?? 'the client'} — they are asked to confirm it on the portal.`, askConfirm: true })

  const kept = parts.filter((p) => !skip.includes(p.key))
  const drafts: AiDraft[] = []
  kept.forEach((p, i) => {
    const prev = drafts[i - 1]
    const s = !prev ? start : p.overlap ? Math.max(prev.start, prev.end - p.overlap) : nextWeekday(prev.end)
    drafts.push({ key: p.key, title: p.title, why: p.why, start: s, end: s + p.days - 1, follows: prev ? i - 1 : null, gap: prev ? s - prev.end : 0, askConfirm: p.askConfirm })
  })

  const notes: AiNote[] = []
  if (kind === 'hdb' && !commercial) notes.push({ tone: 'risk', text: 'HDB renovation needs the permit and an HDB-listed (DRC) contractor before hacking — file the permit as soon as the dates are set.' })
  if (kind === 'condo' && !commercial) notes.push({ tone: 'risk', text: 'Condo renovation needs the MCST’s approval and keeps to the building’s renovation hours — check its guidelines.' })
  if (kind === 'landed' && !commercial) notes.push({ tone: 'risk', text: 'Check whether URA planning permission and BCA building plans are needed before any structural works.' })
  if (!kind || commercial) notes.push({ tone: 'risk', text: 'Make sure every renovation permit the building needs is in hand before works begin.' })
  if (byStage.has('masonry')) notes.push({ tone: 'tip', text: 'Waterproofing must cure fully — 48 to 72 hours — before any tiling.' })
  if (byStage.has('services')) notes.push({ tone: 'tip', text: 'Have the electrical work checked before wiring is closed into walls or ceilings.' })
  if (byStage.has('carpentry')) notes.push({ tone: 'tip', text: `Confirm the carpentry drawings and materials with ${input.client ?? 'the client'} before fabrication starts.` })
  if (byStage.has('masonry') || byStage.has('carpentry')) notes.push({ tone: 'tip', text: 'Order tiles and laminates two weeks early — supply delays are common.' })
  if (byStage.has('masonry') && (byStage.has('carpentry') || byStage.has('painting'))) notes.push({ tone: 'risk', text: 'Wet works finish and cure before carpentry is installed and the walls are painted.' })

  const trades = new Set(input.lines.map((l) => stageOfLine(l)).filter(Boolean)).size
  const read = [
    input.quoteNumber ? `${input.quoteNumber}’s ${input.lines.length} line${input.lines.length === 1 ? '' : 's'}` : null,
    trades ? `${trades} kind${trades === 1 ? '' : 's'} of work` : null,
    input.rooms.length ? `the scope’s ${input.rooms.length} room${input.rooms.length === 1 ? '' : 's'}` : null,
    input.propertyType ? `${/^(?:[aeiou]|hdb)/i.test(input.propertyType) ? 'an' : 'a'} ${input.propertyType}` : null,
  ].filter(Boolean).join(' · ')
  return { drafts, notes, read, kind }
}

/** The plan's keys, in order — what the review's ticks name. */
export const draftKeys = (p: AiPlan) => p.drafts.map((d) => d.key)
