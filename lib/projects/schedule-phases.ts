/**
 * (Projects round 2, Q-12 "starting from the quote's sections: yes") Where a new schedule's milestones come from — pure and client-safe, so the
 * Start card's "What you will get" draws exactly what Create schedule writes.
 *
 * **From the signed quote.** A quote's lines carry their trade (the Items table's Category — Hacking, Masonry, Plumbing, Carpentry…). The
 * schedule takes one milestone for each stage of site work the quote has lines for, in the order work runs on a Singapore renovation, then
 * the two every job ends with (cleaning and the handover). Each stage has a usual length; services and carpentry overlap the stage before by
 * four days, the rest start on the next weekday. 1.0 kept the quote category a phase came from (`sourceCategory`, E-191); 2.0 keeps the
 * stage's trades here. The lengths are the studio's starting point — every date can be dragged afterwards.
 *
 * **From a template** (Company › Templates › Schedules): each item's length and its gap after the one before, the first counted from works start.
 */
import { nextWeekday, type Milestone } from './schedule-model'

export type Phase = { key: string; title: string; trades: string[]; days: number; overlap?: number; always?: boolean }

/** The stages, in the order work runs. A trade not named here joins Installation; Design and Logistics make no stage of their own. */
export const PHASES: Phase[] = [
  { key: 'hacking', title: 'Hacking & demolition', trades: ['hacking', 'demolition'], days: 8 },
  { key: 'masonry', title: 'Masonry & tiling', trades: ['masonry', 'tiling', 'flooring', 'screeding', 'waterproofing'], days: 19 },
  { key: 'services', title: 'Electrical & plumbing', trades: ['electrical', 'plumbing', 'ceiling', 'aircon', 'air-con'], days: 19, overlap: 4 },
  { key: 'carpentry', title: 'Carpentry fabrication', trades: ['carpentry', 'fittings', 'joinery', 'cabinetry'], days: 26, overlap: 4 },
  { key: 'installation', title: 'Installation', trades: [], days: 7 },
  { key: 'painting', title: 'Painting', trades: ['painting', 'wallpaper'], days: 10 },
  { key: 'cleaning', title: 'Cleaning & touch-up', trades: [], days: 5, always: true },
  { key: 'handover', title: 'Handover & defect check', trades: [], days: 4, always: true },
]
const NO_STAGE = new Set(['design', 'logistics', 'others', 'other', ''])
/** (S43E W4-01) the words a section's name uses for a stage beyond its trades — a Singapore quote's "wet works" are its masonry and tiling */
const WORDED: Record<string, string[]> = { masonry: ['wet'] }

/** The stages a quote's trades call for, in site order. */
export function phasesFor(trades: (string | null | undefined)[]): Phase[] {
  const want = new Set<string>()
  for (const raw of trades) {
    const t = (raw ?? '').trim().toLowerCase()
    if (NO_STAGE.has(t)) continue
    /* (S43E, F3-04 W4-01) a trade named in words — "Wet & plumbing works", "Carpentry works", "Hacking & structural works", the sections an
       uploaded contractor's quote reads as (and a studio's own longer trade names) — finds its stage by the stage's word, as a section's title
       does in `draftsFromSections`; "Design & consultation" makes no stage, as Design doesn't. Before, every such line fell into Installation
       and a rebuild offered to take the done stages off. */
    const exact = PHASES.find((x) => x.trades.includes(t))
    if (exact) { want.add(exact.key); continue }
    const named = PHASES.filter((x) => [...x.trades, ...(WORDED[x.key] ?? [])].some((w) => new RegExp(`(^|[^a-z])${w}`).test(t)))   // "Wet & plumbing works" → both
    if (!named.length && /^(design|logistics|consult)/.test(t)) continue
    if (named.length) named.forEach((x) => want.add(x.key)); else want.add('installation')
  }
  return PHASES.filter((p) => p.always || want.has(p.key))
}

/** A milestone to be written: its dates, what it follows (by index in the list) and its gap. (parity map, SC-016) A template's item also
    carries its words, its colour and the further milestones it waits on (by index, each with its gap after that one's last day). */
export type Draft = { title: string; start: number; end: number; follows: number | null; gap: number; askConfirm: boolean
  description?: string | null; color?: string | null; links?: { at: number; gap: number }[] }

/** The stages laid end to end from works start: each the next weekday after the one before ends, or overlapping it. */
export function draftsFromPhases(phases: Phase[], start: number): Draft[] {
  const out: Draft[] = []
  phases.forEach((p, i) => {
    const prev = out[i - 1]
    const s = !prev ? start : p.overlap ? prev.end - p.overlap : nextWeekday(prev.end)
    out.push({ title: p.title, start: s, end: s + p.days - 1, follows: prev ? i - 1 : null, gap: prev ? s - prev.end : 0, askConfirm: p.key === 'handover' })
  })
  return out
}

/** A template's items laid from works start. (parity map, SC-016 — 1.0's milestone templates kept the description, the colour and the links
    by position, E-275 · B-259) An item may carry its words and its colour, and `follows`: the items it waits on, by position — the first is the
    one it moves with (its `gap` counts from that one's last day), the rest further links; absent, it follows the one before (today's rule). */
export type TemplateItem = { title: string; days: number; gap: number; askConfirm: boolean
  description?: string | null; color?: string | null; follows?: number[] | null }
export const TEMPLATE_DESCRIPTION_MAX = 1000
/** (SC-016) What an item waits on, by position — only earlier items (a template lays out in order), each once; the one before is the default. */
export function followsOf(it: Pick<TemplateItem, 'follows'>, i: number): number[] {
  const raw = Array.isArray(it.follows) ? it.follows : null
  if (!raw) return i > 0 ? [i - 1] : []
  const out: number[] = []
  for (const k of raw) if (Number.isInteger(k) && k >= 0 && k < i && !out.includes(k)) out.push(k)
  return out.length ? out : i > 0 ? [i - 1] : []
}
/** (SC-016) `schedule_template_items.follows_json` → positions; null when the item follows the one before (nothing stored). */
export function parseFollows(v: unknown): number[] | null {
  const raw = typeof v === 'string' ? (() => { try { return JSON.parse(v) as unknown } catch { return null } })() : v
  if (!Array.isArray(raw)) return null
  const out = raw.filter((x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0).slice(0, 12)
  return out.length ? out : null
}
/** (SC-016) The positions to store: null when they say what the default says (the one before alone). */
export function followsToStore(follows: number[] | null | undefined, i: number): number[] | null {
  if (!follows?.length) return null
  const f = followsOf({ follows }, i)
  return f.length === 1 && f[0] === i - 1 ? null : f.length ? f : null
}
export function draftsFromTemplate(items: TemplateItem[], start: number): Draft[] {
  const out: Draft[] = []
  items.forEach((it, i) => {
    const preds = followsOf(it, i)
    const main = preds[0] !== undefined ? out[preds[0]] : undefined
    const s = main ? main.end + it.gap : start + Math.max(0, it.gap)
    const end = s + Math.max(1, it.days) - 1
    out.push({
      title: it.title, start: s, end, follows: main ? preds[0]! : null, gap: main ? it.gap : 0, askConfirm: it.askConfirm,
      /* (SC-016) its words, its colour and the further ones it waits on — each further link's gap read from the laid-out days */
      ...(it.description ? { description: it.description } : {}), ...(it.color ? { color: it.color } : {}),
      ...(preds.length > 1 ? { links: preds.slice(1).map((k) => ({ at: k, gap: s - out[k]!.end })) } : {}),
    })
  })
  return out
}

/** A schedule as a template keeps it: each milestone's length and its gap after the one before it. (B-28) "Before" is the schedule's real
    order — by when each starts (then the list) — not the list's, which Move up / down changes without moving a date; lengths and gaps are
    clamped as the template editor keeps them (1–365 days, a gap of −60…+60), and each keeps whether the client is asked to confirm it.
    (parity map, SC-016) …and its description, its colour and its links by position: the milestone it moves with (its gap then counts from that
    one) and the further ones it waits on — a link to the one just before alone is the default and stores nothing. */
export function itemsFromMilestones(list: (Pick<Milestone, 'id' | 'title' | 'start' | 'end' | 'position'> & { confirm?: { askedAt: number | null }; followsId?: string | null; after?: { id: string; gap: number }[]; description?: string | null; color?: string | null })[]): TemplateItem[] {
  const sorted = [...list].sort((a, b) => a.start - b.start || a.position - b.position).slice(0, 40)
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)))
  const at = new Map(sorted.map((m, i) => [m.id, i]))
  return sorted.map((m, i) => {
    /* what it waits on, by position — only the ones before it in this order (a template lays out in order) */
    const preds = [m.followsId ?? null, ...(m.after ?? []).map((a) => a.id)].filter((x): x is string => !!x).map((id) => at.get(id)).filter((k): k is number => k !== undefined && k < i)
    const uniq = [...new Set(preds)]
    const main = uniq[0] ?? (i ? i - 1 : null)
    const follows = followsToStore(uniq.length ? uniq : null, i)
    return {
      title: m.title, days: clamp(m.end - m.start + 1, 1, 365), gap: main !== null ? clamp(m.start - sorted[main]!.end, -60, 60) : 0, askConfirm: (m.confirm?.askedAt ?? null) !== null,
      ...(m.description?.trim() ? { description: m.description.trim().slice(0, TEMPLATE_DESCRIPTION_MAX) } : {}), ...(m.color ? { color: m.color } : {}),
      ...(follows ? { follows } : {}),
    }
  })
}

/** (gaps build, package C — 4) A quote with no trades on its lines — sections only, as an uploaded contractor's quote often is — gives one
    milestone per section in its order, a week each, end to end, then the handover (asked to be confirmed). Sections named like a stage
    ("Carpentry", "Painting works") take that stage's usual length. */
export function draftsFromSections(sections: string[], start: number): Draft[] {
  const names: string[] = []
  for (const raw of sections) { const t = raw.trim().replace(/\s+/g, ' ').slice(0, 80); if (t && !names.some((n) => n.toLowerCase() === t.toLowerCase())) names.push(t) }
  const out: Draft[] = []
  const hasHandover = names.some((n) => /hand\s*-?over/i.test(n))
  const all = hasHandover ? names : [...names, 'Handover & defect check']
  all.slice(0, 40).forEach((title, i) => {
    const prev = out[i - 1]
    const phase = PHASES.find((p) => p.trades.some((t) => title.toLowerCase().includes(t)))
    const days = /hand\s*-?over/i.test(title) ? 4 : phase?.days ?? 7
    const s = prev ? nextWeekday(prev.end) : start
    out.push({ title, start: s, end: s + days - 1, follows: prev ? i - 1 : null, gap: prev ? s - prev.end : 0, askConfirm: /hand\s*-?over/i.test(title) })
  })
  return out
}
/** (gaps build, package C — 4) A quote's milestones: its trades call for stages of site work (`phasesFor`) — else, with no trade named on any
    line, its sections in their order. */
export function draftsFromQuote(q: { trades: (string | null)[]; sections: string[] }, start: number): Draft[] {
  const phases = phasesFor(q.trades)
  return phases.some((p) => !p.always) || !q.sections.length ? draftsFromPhases(phases, start) : draftsFromSections(q.sections, start)
}

/** "Handover around Fri 13 Nov, 12 weeks after works start." — the weeks, rounded. */
export const weeksBetween = (start: number, end: number) => Math.max(1, Math.round((end - start + 1) / 7))
