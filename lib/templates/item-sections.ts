/**
 * The Items block's sections as the print lays them out — which lines print where, under which section, and each section's sum — and
 * (S44F — NB-03) what a client's browser needs to draw them without the lines' prices the view never prints. Pure and client-safe: the
 * renderer (`components/templates/render/slices.tsx`) and the client projection (`lib/quotes/client-quote.ts`) read the SAME function, so the
 * sums the server works out for a client page land on exactly the sections the page draws.
 *
 * `sections()` moved here from slices.tsx unchanged (S44F) — a server module can't call a function from a 'use client' file. (S44I — M17) A
 * section that prints a word carries it (`Section.word`, `Area.word`) and its lines print no amounts (`Line.underWord`).
 */
import type { ItemsBlock, TemplateDesign } from './model'
import type { ClientView } from './client-view'
import type { DocData, DocItem } from './data'
import { afterContractIds, flattenItems, lineCostMinor, lineTotalMinor, printsWord, sectionWordOf } from '@/lib/quotes/math'
import { printAsWord, UNLABELLED } from '@/lib/quotes/items-model'

/** (S44I — M17, UAT row 323) `underWord`: the line sits in a section that prints a word in place of its amount — it prints no amounts of its own
    (the section's band carries the word) and counts nowhere; `underWordText` is that word, for the client's phone cards. */
export type Line = DocItem & { noPrice: boolean; underWord?: boolean; underWordText?: string }
/** A run of lines under a label — a room under a trade, or (REG-558) a sub-section with its own note and highlight. (S44I — M17) `word`: the
    sub-section's own word in place of its amount. */
export type Area = { label: string; lines: Line[]; sub?: boolean; note?: string | null; noteHtml?: string | null; highlight?: string | null; word?: string | null }
export type Section = { id: string; label: string; note: string | null; noteHtml?: string | null; areas: Area[]; lines: Line[]; totalMinor: number; /** (REG-555, T-3) the word beside the sub-total */ subLabel?: string | null; highlight?: string | null
  /** (S44I — M17) the section's word, printed in its band's amount place — sub-totals on or off */ word?: string | null }

/**
 * (S44F — NB-03) The sums a client page prints, worked out on the server from the full lines: each section's sum (by `<block id>:<section id>`)
 * and each section printed as one line (by the section's id). With them, the client's browser gets no price the view doesn't print.
 */
export type PrintSums = { sections: Record<string, number>; rolled: Record<string, number> }

/**
 * (S44F — NB-01) A removed line the view prints: none while the quote hides its changes; since the last version, only what this version removed
 * (as always, REG-595); every version, all of them.
 */
export const showsRemoved = (l: { change?: string; history?: { removedIn?: number } }, view: Pick<ClientView, 'changes' | 'changesSince'>, version: number) =>
  l.change !== 'removed' || (view.changes && (view.changesSince === 'all' || !(l.history?.removedIn && l.history.removedIn < version)))

/** `tradeNotes` = the studio's note per trade (REG-617, parity Q-08); `inPlace` = the Optional price column prints: optional lines stay in their sections (Q-11).
    (S44T — call C1) `after` = the sections priced after the contract, in the quote's own sections whatever the table groups by.
    (S44F — NB-03) `sums` = the server's sums, for a client page whose lines came without the prices it never prints; (NB-01) `version` = the
    quote's version, for which removed lines print. */
export function sections(b: ItemsBlock, items: DocItem[], view: ClientView, tradeNotes: Record<string, string>, inPlace: boolean, sums?: PrintSums | null, version = 1): { main: Section[]; optional: Line[]; after: Section[] } {
  const groups = items.filter((i) => i.kind === 'group')
  const declinedGroups = new Set(groups.filter((g) => g.status === 'Declined').map((g) => g.id))
  const underDeclined = (i: DocItem): boolean => { let cur = i.parentId; const seen = new Set<string>(); while (cur && !seen.has(cur)) { if (declinedGroups.has(cur)) return true; seen.add(cur); cur = items.find((x) => x.id === cur)?.parentId ?? null } return false }
  const rawLines: Line[] = items
    .filter((i) => i.kind === 'item' && i.status !== 'Declined' && !underDeclined(i))
    .filter((i) => i.visibility !== 'hidden' || view.hiddenItems === 'no-price')
    .filter((i) => showsRemoved(i, view, version))   // (REG-595) the removed lines print only while the quote shows its changes · (S44F — NB-01) and which ones
    .map((i): Line => {
      /* (S44I — M17) a line in a section that prints a word: with the quote's own sections printed, the band says the word and the line no
         amount; filed by a label instead (the section isn't printed), the line carries the word itself */
      const sw = sectionWordOf(items, i)
      if (!sw) return { ...i, noPrice: i.visibility !== 'visible' }
      if (b.groupBy !== 'none') return { ...i, printAs: sw.printAs, printAsText: sw.printAsText, noPrice: i.visibility !== 'visible' }
      return { ...i, noPrice: true, underWord: true, underWordText: printAsWord(sw) }
    })
  /* (REG-585) A section that prints as one line: its lines fold into one priced line — the section's name, its description, its sum —
     at the section's own place; the studio keeps every line inside. A folded section inside a folded one folds with it. */
  const parentOf = new Map(items.map((i) => [i.id, i.parentId ?? null]))
  const chain = (id: string): string[] => { const out: string[] = []; let cur = parentOf.get(id) ?? null; const seen = new Set<string>(); while (cur && !seen.has(cur)) { out.push(cur); seen.add(cur); cur = parentOf.get(cur) ?? null } return out }
  const rolled = groups.filter((g) => g.printOneLine && g.status !== 'Declined' && !underDeclined(g))
  const rolledIds = new Set(rolled.map((g) => g.id))
  const underRolled = (id: string) => chain(id).some((a) => rolledIds.has(a))
  const rollup = (g: DocItem): Line => {
    const under = rawLines.filter((l) => !l.optional && l.change !== 'removed' && chain(l.id).includes(g.id))
    /* (S44F — NB-03) a client page: the server's folded sum — its lines came without their prices */
    const total = sums ? sums.rolled[g.id] ?? 0 : under.reduce((s, l) => s + (l.noPrice || printsWord(l) ? 0 : lineTotalMinor(l)), 0)
    const cost = sums ? 0 : under.reduce((s, l) => s + lineCostMinor(l), 0)
    /* (S44I — M17) a section printed as one line that prints a word: its one line prints the word */
    return { ...g, kind: 'item', qty: 1, unit: null, costMinor: cost, markupMinor: total - cost, discountPct: 0, gstPct: 9, visibility: 'visible', optional: false, printAs: printsWord(g) ? g.printAs : null, printAsText: printsWord(g) ? g.printAsText : null, noNumber: false, noPrice: false }
  }
  const lines: Line[] = [...rawLines.filter((l) => !underRolled(l.id)), ...rolled.filter((g) => !underRolled(g.id)).map(rollup)]
  const optional = inPlace ? [] : lines.filter((l) => l.optional)
  const afterIds = afterContractIds(items)   // (S44T — call C1) estimates print after the main items
  const pricedAll = lines.filter((l) => !l.optional || (inPlace && view.optionalWorks))
  const priced = pricedAll.filter((l) => !afterIds.has(l.id)), pricedLater = pricedAll.filter((l) => afterIds.has(l.id))
  const byPos = (a: DocItem, c: DocItem) => a.position - c.position
  /* (S44T — UAT row 284) A bucket's lines in the grid's own order: by position alone, lines from two sections interleaved in one trade. */
  const gridAt = new Map(flattenItems(items).map((x, k) => [x.id, k]))
  const byGrid = (a: DocItem, c: DocItem) => (gridAt.get(a.id) ?? 0) - (gridAt.get(c.id) ?? 0)
  const groupOf = (label: string) => groups.find((g) => g.name.trim().toLowerCase() === label.trim().toLowerCase())
  /* (REG-617, parity Q-08) A section with no note of its own prints its trade's note from Settings › Quotes › Trades. */
  const tradeNote = (label: string) => tradeNotes[label.trim().toLowerCase()] || null
  const ownNote = (g: DocItem | undefined) => !!g && !!((g.description ?? '').trim() || g.descriptionHtml)
  const noteOf = (label: string) => { if (!b.groupNotes) return null; const g = groupOf(label); return ownNote(g) ? g!.description ?? null : tradeNote(label) }
  let main: Section[] = []
  /* The quote's own sections, in order, from its top-level rows (`pool` = the lines that print there); `tag` keeps loose runs' ids apart. */
  const ownSections = (top: DocItem[], pool: Line[], tag: string): Section[] => {
    const out: Section[] = []
    let loose: Line[] = []
    const flushLoose = () => { if (loose.length) { out.push({ id: `${tag}-${out.length}`, label: '', note: null, areas: [], lines: loose, totalMinor: 0 }); loose = [] } }
    for (const t of top) {
      if (t.kind === 'group' && !t.printOneLine) {
        flushLoose(); if (t.status === 'Declined') continue
        // (REG-558) The section's rows in order: runs of its own lines, and each sub-section as an area with its lines.
        const kids = items.filter((i) => i.parentId === t.id).sort(byPos)
        const areas: Area[] = []
        const own: Line[] = []
        let run: Line[] = []
        const flushRun = () => { if (run.length) { areas.push({ label: '', lines: run }); run = [] } }
        for (const k of kids) {
          if (k.kind === 'group' && !k.printOneLine) { if (k.status === 'Declined') continue; flushRun(); const sl = pool.filter((l) => l.parentId === k.id).sort(byPos); if (sl.length) areas.push({ label: k.name, lines: sl, sub: true, note: b.groupNotes ? k.description : null, noteHtml: b.groupNotes ? k.descriptionHtml : null, highlight: k.highlight, word: printsWord(k) && !printsWord(t) ? printAsWord(k) : null }) }
          else { const l = pool.find((x) => x.id === k.id); if (l) { run.push(l); own.push(l) } }
        }
        flushRun()
        const hasSubs = areas.some((a) => a.sub)
        const all = areas.flatMap((a) => a.lines)
        out.push({ id: t.id, label: t.name, note: b.groupNotes ? (ownNote(t) ? t.description : tradeNote(t.name)) : null, noteHtml: b.groupNotes && ownNote(t) ? t.descriptionHtml : null, areas: hasSubs ? areas : [], lines: hasSubs ? all : own, totalMinor: 0, subLabel: printsWord(t) ? null : t.printAsText, highlight: t.highlight, word: printsWord(t) ? printAsWord(t) : null })
      }
      else { const l = pool.find((x) => x.id === t.id); if (l) loose.push(l) }
    }
    flushLoose()
    return out
  }
  if (b.groupBy === 'none') main = ownSections(items.filter((i) => !i.parentId && !afterIds.has(i.id)).sort(byPos), priced, 'loose')
  else {
    const field = b.groupBy
    const labelOf = (l: Line) => (l[field] ?? items.find((g) => g.id === l.parentId)?.[field] ?? UNLABELLED[field])
    const ordered = [...priced].sort(byGrid)   // (S44T, row 284)
    const order: string[] = []
    for (const l of ordered) { const k = labelOf(l); if (!order.includes(k)) order.push(k) }
    // A label bucket that matches one of the quote's sections by name carries that section's note, sub-total label and highlight (REG-555 · REG-556).
    main = order.map((label, i) => ({ id: `sec-${i}`, label, note: noteOf(label), noteHtml: b.groupNotes && ownNote(groupOf(label)) ? groupOf(label)?.descriptionHtml ?? null : null, areas: [], lines: ordered.filter((l) => labelOf(l) === label), totalMinor: 0, subLabel: groupOf(label)?.printAsText ?? null, highlight: groupOf(label)?.highlight ?? null }))
  }
  /* (S44T — call C1) The sections priced after the contract, in the grid's order — always the quote's own sections. */
  const after = afterIds.size ? ownSections(items.filter((i) => !i.parentId && afterIds.has(i.id)).sort(byPos), pricedLater, 'later') : []
  for (const s of [...main, ...after]) {
    const own = s.lines.reduce((sum, l) => sum + (l.noPrice || printsWord(l) || l.change === 'removed' || l.optional ? 0 : lineTotalMinor(l)), 0)   // an optional line printed in place never counts (REG-492)
    s.totalMinor = sums ? sums.sections[`${b.id}:${s.id}`] ?? 0 : own   // (S44F — NB-03) a client page: the server's sum
    if (b.subGroupBy !== 'none' && !s.areas.length) {
      const f = b.subGroupBy
      const order: string[] = []
      for (const l of s.lines) { const k = l[f] ?? ''; if (!order.includes(k)) order.push(k) }
      s.areas = order.map((label) => ({ label, lines: s.lines.filter((l) => (l[f] ?? '') === label) }))
    }
  }
  return { main: main.filter((s) => s.lines.length), optional, after: after.filter((s) => s.lines.length) }
}

/** The design's Items blocks that print, with their columns as the client view shows them. */
const printedItemsBlocks = (design: TemplateDesign) => design.blocks.filter((x): x is ItemsBlock => x.kind === 'items' && !x.hidden)
const inPlaceOf = (b: ItemsBlock, view: ClientView) => b.columns.some((c) => c.on && view.columns[c.key] !== false && c.key === 'optional')

/** (S44F — NB-03) The section sums and folded sums the print shows — from the full lines, on the server. */
export function printSums(design: TemplateDesign, data: DocData, view: ClientView): PrintSums {
  const out: PrintSums = { sections: {}, rolled: {} }
  const rolled = new Set(data.items.filter((i) => i.kind === 'group' && i.printOneLine).map((i) => i.id))
  for (const b of printedItemsBlocks(design)) {
    const { main, after, optional } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, inPlaceOf(b, view), null, data.quote.version)
    for (const s of [...main, ...after]) {
      out.sections[`${b.id}:${s.id}`] = s.totalMinor
      for (const l of s.lines) if (rolled.has(l.id)) out.rolled[l.id] = lineTotalMinor(l)
    }
    for (const l of optional) if (rolled.has(l.id)) out.rolled[l.id] = lineTotalMinor(l)
  }
  return out
}

/**
 * (S44F — NB-03) The lines whose own price the print shows: with *A price on every line*, every line it prints that isn't priced off (hidden
 * from the client, shown without a price) or printed as a word (FOC · Inclusive …), a removed line it strikes, an optional work it lists; with
 * *One amount per section* or *The total only*, none. A section printed as one line shows its folded sum, never its lines'.
 */
export function pricedLineIds(design: TemplateDesign, data: DocData, view: ClientView): Set<string> {
  const out = new Set<string>()
  if (view.amounts !== 'lines') return out
  for (const b of printedItemsBlocks(design)) {
    const { main, after, optional } = sections(b, data.items, view, data.studio.tradeNotes ?? {}, inPlaceOf(b, view), null, data.quote.version)
    const listed = [...main, ...after].flatMap((s) => s.lines)
    if (b.optionalSection && view.optionalWorks) listed.push(...optional)
    for (const l of listed) if (l.kind === 'item' && !l.noPrice && !printsWord(l)) out.add(l.id)
  }
  return out
}
