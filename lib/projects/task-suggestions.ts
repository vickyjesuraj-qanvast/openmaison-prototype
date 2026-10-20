/**
 * (parity map, SC-056 · TD-022 · TD-023 — his "build everything that's in 1.0" 2026-10-10; 1.0's `api/projects/plan/tasks/route.ts`) Suggested
 * tasks, BY RULE — never a model, no credits (Q-30: no metered press in Projects). 1.0 asked an AI for five to eight tasks for a milestone's
 * phase from the quote's lines and, when the AI failed, quietly added canned ones; 2.0 answers from the records every time, the same way:
 *
 * - **The phase** of a milestone is read from its words (its name, then its description) — the stages a Singapore renovation runs through, in
 *   site order (`PHASES` in ./schedule-phases.ts, plus the work before works start: permits, protection, measuring up).
 * - **From the quote:** the signed quote's lines whose trade (the Items table's Category) belongs to that phase, each as a task in the line's
 *   own words with the phase's verb when the line has none ("Fabricate and install kitchen top + bottom cabinets").
 * - **Usual for the phase:** the steps every job of that phase needs on a Singapore home — grounded in 1.0's prompt (its few-shot examples and
 *   its SG compliance reminders: the HDB permit, the MCST's approval, neighbours told before noisy works, NEA-licensed debris disposal, the snag
 *   walk-through) and in the trades' own practice (pond test, pressure test, site-measure before fabrication).
 * - Never a task the milestone already has (case and spaces aside), at most eight, the quote's first.
 *
 * Suggested from the quote (the project's Tasks › Add Task): the signed quote's sections in order, each line as a task, each landing in the
 * milestone its trade belongs to (due on that milestone's last day, as a milestone's task is), else on the project with no milestone.
 *
 * A RULE-BASED STAND-IN for 1.0's AI suggestions (outcome-P-E.md). Pure and client-safe — the milestone panel computes it in the browser from
 * the schedule's own data; the Tasks dialog's server action reads the same functions.
 *
 * INVENTED COPY: every task title in the practice table below, and the `why` words ("From the quote" · "Usual for {phase}").
 */
import { PHASES } from './schedule-phases'

export type PhaseKey = 'prep' | 'hacking' | 'masonry' | 'services' | 'carpentry' | 'installation' | 'painting' | 'cleaning' | 'handover'
export type SuggestLine = { trade: string | null; name: string; section: string | null }
export type TaskSuggestion = { key: string; title: string; why: string; source: 'quote' | 'practice' }

/** How many a milestone's list offers at most (1.0 asked for five to eight). */
export const SUGGEST_MAX = 8
const FROM_QUOTE_MAX = 4
const TITLE_MAX = 80

const PHASE_WORD: Record<PhaseKey, string> = {
  prep: 'getting started', hacking: 'hacking', masonry: 'masonry and tiling', services: 'electrical and plumbing', carpentry: 'carpentry',
  installation: 'installation', painting: 'painting', cleaning: 'cleaning', handover: 'the handover',
}

/** A milestone's words → its phase, in the order the words are most telling (handover before cleaning: "Cleaning & handover" hands over). */
const WORDS: [PhaseKey, RegExp][] = [
  ['handover', /\bhand\s*-?\s*over\b|\bdefect|\bsnag|\bkey collection/i],
  ['cleaning', /\bclean|\btouch[\s-]*up/i],
  ['painting', /\bpaint|\bwallpaper|\bcoating/i],
  ['carpentry', /\bcarpent|\bcabinet|\bwardrobe|\bjoinery|\bfabricat|\bcarpentry/i],
  ['services', /\belectric|\bplumb|\bwiring|\bceiling|\bair[\s-]*con|\bdata\b|\bpartition/i],
  ['masonry', /\bmason|\btil(e|es|ing)\b|\bfloor|\bscreed|\bwaterproof|\broofing|\bstructural/i],
  ['hacking', /\bhack|\bdemoli|\bstrip[\s-]*out|\bdismantl/i],
  ['installation', /\binstall|\bfitting|\bappliance|\blighting|\bexternal works|\blandscap/i],
  ['prep', /\bpermit|\bapproval|\bprotect|\bsurvey|\bmeasure|\bworks start|\bmobilis|\bsite set[\s-]*up|\bmcst\b|\bhdb\b/i],
]
/** The phase a milestone's name (then its description) says it is — null when nothing says. */
export function phaseOfWords(title: string, description?: string | null): PhaseKey | null {
  for (const text of [title, description ?? '']) {
    if (!text.trim()) continue
    for (const [k, re] of WORDS) if (re.test(text)) return k
  }
  return null
}
/** The phase a quote line's trade belongs to (`PHASES`' trades; any other trade is installation's; design and logistics none). */
export function phaseOfTrade(trade: string | null | undefined): PhaseKey | null {
  const t = (trade ?? '').trim().toLowerCase()
  if (!t || t === 'design' || t === 'logistics' || t === 'others' || t === 'other') return null
  const p = PHASES.find((x) => x.trades.includes(t))
  return p ? (p.key as PhaseKey) : 'installation'
}

/** Each phase's verb for a line that names a thing, not the work ("Kitchen top + bottom cabinets"). */
const VERB: Record<PhaseKey, string> = {
  prep: 'Arrange', hacking: 'Hack out', masonry: 'Lay', services: 'Install', carpentry: 'Fabricate and install', installation: 'Install',
  painting: 'Paint', cleaning: 'Clean', handover: 'Check',
}
const STARTS_WITH_VERB = /^(supply|install|hack|lay|fabricate|paint|remove|dispose|build|run|apply|fix|provide|replace|construct|demolish|strip|tile|screed|wire|relocate|extend|erect|form|fit|mount|seal|clean|re-?|touch|plaster|skim|patch|cut|core|chase|dismantle|protect|waterproof|repaint|polish|grout|level|change|add|convert|hack|deliver|set)\b/i
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase())
const lowerStart = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : s.replace(/^./, (c) => c.toLowerCase()))
const clip = (s: string) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length > TITLE_MAX ? `${t.slice(0, TITLE_MAX - 1).replace(/\s+\S*$/, '')}…` : t }
/** A quote line as a task: its own words when they say the work, else the phase's verb before them. */
export function lineTask(line: Pick<SuggestLine, 'name'>, phase: PhaseKey): string {
  const n = line.name.replace(/\s+/g, ' ').trim().replace(/[.;:]+$/, '')
  if (!n) return ''
  return clip(STARTS_WITH_VERB.test(n) ? cap(n) : `${VERB[phase]} ${lowerStart(n)}`)
}

type Home = 'hdb' | 'condo' | 'landed' | null
const homeOf = (propertyType: string | null | undefined): Home => {
  const p = (propertyType ?? '').trim().toLowerCase()
  return p.startsWith('hdb') || p.startsWith('bto') ? 'hdb' : p.includes('condo') || p.startsWith('penthouse') ? 'condo' : p.startsWith('landed') ? 'landed' : null
}

/** (invented copy) The steps a phase usually needs on a Singapore home, in the order they are done. */
function practice(phase: PhaseKey, home: Home): string[] {
  switch (phase) {
    case 'prep': return [
      home === 'hdb' ? 'Apply for the HDB renovation permit' : home === 'condo' ? 'Get the MCST’s renovation approval and pay the deposit' : home === 'landed' ? 'Check whether the works need a BCA or URA submission' : 'Confirm the building’s rules for renovation works',
      'Tell the neighbours about the works and the noisy-work days',
      'Protect the lift lobby, the corridor and the floors',
      'Site-measure and confirm the layout with the client',
      'Confirm the working hours with the management',
    ]
    case 'hacking': return [
      'Protect the lift lobby, corridors and floors before hacking',
      home === 'hdb' ? 'Check the HDB permit covers every wall to be hacked' : 'Mark every wall and floor to be hacked on site',
      'Dispose of the debris at an NEA-licensed site',
      'Check the hacked areas with the client before masonry starts',
    ]
    case 'masonry': return [
      'Lay the waterproofing membrane in the wet areas',
      'Pond test the bathrooms for 24 hours',
      'Confirm the tile layout and the grout colour with the client',
      'Screed the floors to level',
      'Grout and seal the tiled surfaces',
    ]
    case 'services': return [
      'Mark the power points and switches with the client on site',
      'Run the concealed wiring and conduits',
      'Pressure-test the water pipes',
      'Have a licensed electrical worker test and sign off the wiring',
    ]
    case 'carpentry': return [
      'Site-measure the carpentry openings before fabrication',
      'Confirm the laminates, handles and hardware with the client',
      'Install and level the carpentry on site',
      'Adjust the doors, drawers and soft-close hinges',
    ]
    case 'installation': return [
      'Confirm the appliance models and their delivery days',
      'Install the lights, fans and switch plates',
      'Install the sinks, taps and sanitary fittings',
      'Fit the curtains, blinds and accessories',
    ]
    case 'painting': return [
      'Confirm the paint colours with the client',
      'Patch and sand the walls before painting',
      'Apply the primer and two coats',
      'Do a touch-up pass after the other trades',
    ]
    case 'cleaning': return [
      'Deep clean the home — floors, windows, kitchen and bathrooms',
      'Remove the floor and carpentry protection',
      'Touch up the paint and the silicone',
      'Clear the site of leftover materials',
    ]
    case 'handover': return [
      'Walk through the home with the client and list the defects',
      'Fix the defects on the list',
      'Hand over the keys, warranty cards and manuals',
      'Book a defects check-in 30 days after handover',
    ]
  }
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

/**
 * A milestone's suggested tasks: from the signed quote's lines of its phase first (at most four), then the phase's usual steps, at most eight
 * in all, never one it already has. With no phase in its words the quote's lines are read by the milestone's name alone; with nothing at all,
 * an empty list (the panel then says it has nothing to suggest).
 */
export function suggestForMilestone(input: { title: string; description?: string | null; lines: SuggestLine[]; propertyType?: string | null; existing?: string[] }): TaskSuggestion[] {
  const phase = phaseOfWords(input.title, input.description)
  const taken = new Set((input.existing ?? []).map(norm))
  const out: TaskSuggestion[] = []
  const add = (title: string, why: string, source: TaskSuggestion['source']) => {
    const t = clip(title)
    if (!t || taken.has(norm(t)) || out.length >= SUGGEST_MAX) return
    taken.add(norm(t))
    out.push({ key: `${source}:${out.length}:${norm(t).slice(0, 40)}`, title: t, why, source })
  }
  if (phase) {
    let fromQuote = 0
    for (const l of input.lines) {
      if (fromQuote >= FROM_QUOTE_MAX) break
      if (phaseOfTrade(l.trade) !== phase) continue
      const before = out.length
      add(lineTask(l, phase), `From the quote${l.section ? ` · ${l.section}` : ''}`, 'quote')
      if (out.length > before) fromQuote++
    }
    for (const t of practice(phase, homeOf(input.propertyType))) add(t, `Usual for ${PHASE_WORD[phase]}`, 'practice')
  }
  return out
}

export type QuoteTaskRow = { key: string; title: string; phase: PhaseKey | null; milestoneId: string | null; milestoneTitle: string | null; dueDay: number | null }
export type QuoteTaskGroup = { section: string; rows: QuoteTaskRow[]; more: number }
/** How many rows a section offers before "and n more lines" — the quote's own list is a click away. */
export const SECTION_ROWS_MAX = 6

/**
 * (TD-022's other half) The signed quote's sections → tasks: each section's lines in their order, each as a task, each placed in the milestone
 * its trade belongs to (the first milestone of that phase by its words; the line's own words when its trade says nothing), due on that
 * milestone's last day; lines no milestone takes go on the project with no milestone. Never a task the project already has.
 */
export function suggestFromQuote(input: { lines: SuggestLine[]; milestones: { id: string; title: string; description?: string | null; end: number; status: string }[]; existing?: string[] }): QuoteTaskGroup[] {
  const taken = new Set((input.existing ?? []).map(norm))
  const byPhase = new Map<PhaseKey, { id: string; title: string; end: number }>()
  for (const m of input.milestones) {
    if (m.status === 'done') continue
    const p = phaseOfWords(m.title, m.description)
    if (p && !byPhase.has(p)) byPhase.set(p, { id: m.id, title: m.title, end: m.end })
  }
  const groups = new Map<string, QuoteTaskGroup>()
  let n = 0
  for (const l of input.lines) {
    const phase = phaseOfTrade(l.trade) ?? phaseOfWords(l.name)
    const title = lineTask(l, phase ?? 'installation')
    if (!title || taken.has(norm(title))) continue
    taken.add(norm(title))
    const section = l.section?.trim() || 'Other lines'
    const g = groups.get(section) ?? { section, rows: [], more: 0 }
    groups.set(section, g)
    if (g.rows.length >= SECTION_ROWS_MAX) { g.more++; continue }
    const m = phase ? byPhase.get(phase) ?? null : null
    g.rows.push({ key: `q:${n++}`, title, phase, milestoneId: m?.id ?? null, milestoneTitle: m?.title ?? null, dueDay: m?.end ?? null })
  }
  return [...groups.values()].filter((g) => g.rows.length)
}
