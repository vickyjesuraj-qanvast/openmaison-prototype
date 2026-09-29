#!/usr/bin/env node
/**
 * (REG-726) The design lint — the house rules as checks, so a copy that drifts is caught when it is written, not months later in a
 * screenshot. Owner 2026-09-29: "I don't want this to happen in the future … when the team take this repo and integrate it breaks."
 *
 * Every rule counts its violations per file across app/ and components/. The counts that exist today are held in
 * design-lint.baseline.json — the ratchet: a file's count may only go down. CI fails when any file holds more than the baseline says
 * (a new raw colour, a hand-rolled dialog head, a copied table stylesheet) and names each place. When a round fixes some, lower the
 * baseline with `npm run design:lint -- --update` and commit it with the fix.
 *
 *   npm run design:lint                  check (CI runs this)
 *   npm run design:lint -- --update      write today's counts as the baseline (only after fixing, never to let a violation in)
 *   npm run design:lint -- --list raw-colour    every place a rule finds, for a fix round
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const DIRS = ['app', 'components']
const BASELINE = join(ROOT, 'design-lint.baseline.json')
const rel = (p) => relative(ROOT, p).split(sep).join('/')

function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/* Comments never count — a rule's reason often quotes the very value it forbids. Line breaks are kept, so line numbers hold. */
const blank = (m) => m.replace(/[^\n]/g, ' ')
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank)
const stripTs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:'"`\\])(\/\/[^\n]*)/g, (m, a, b) => a + blank(b))
const linesOf = (text, re) => {
  const out = []
  text.split('\n').forEach((l, i) => { if (re.test(l)) out.push(i + 1) })
  return out
}

const isCss = (p) => p.endsWith('.module.css')
const isTsx = (p) => p.endsWith('.tsx') || p.endsWith('.ts')
const inOm = (p) => p.startsWith('components/om/') || p.startsWith('components/ds/')

/** (REG-734) The stylesheets that draw a table's rows without composing the table core. */
const TABLE_SHEETS = ['components/om/table-core.module.css', 'components/leads/table.module.css', 'components/quotes/editor/payments/payments-section.module.css', 'components/quotes/editor/items/items-table.module.css']

/** The rules. `fix` is what the message tells the person who broke it — the house piece to use instead. */
const RULES = [
  {
    id: 'overlay-head',
    title: 'A modal draws the house head and foot',
    fix: 'Use <Dialog>, <ConfirmDialog> or <Drawer>, or SurfaceHead + SurfaceFoot from components/om/dialog.tsx (REG-725).',
    applies: (p) => p.endsWith('.tsx') && !inOm(p),
    /* the JSX attribute only — a selector string ('[aria-modal="true"]') is not an overlay */
    find: (t) => (/\saria-modal[\s=}>/]/.test(t) && !/\bSurfaceHead\b|<Dialog\b|<ConfirmDialog\b|<Drawer\b|<Sheet\b/.test(t) ? linesOf(t, /\saria-modal[\s=}>/]/) : []),
  },
  {
    id: 'close-button',
    title: 'A close is the house one',
    fix: 'The close comes with SurfaceHead / Dialog / Drawer; elsewhere use <IconButton icon="close" size={24} variant="bare"> (REG-725).',
    applies: (p) => isTsx(p) && !inOm(p),
    find: (t) => linesOf(t, /aria-label=["']Close["']/),
  },
  {
    id: 'raw-colour',
    title: 'Colours come from the tokens',
    fix: 'Use an --om-color-* token (or an --om-shadow-* / --om-elevation-* token for a shadow).',
    applies: isCss,
    find: (t) => linesOf(t, /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/),
  },
  {
    id: 'raw-type',
    title: 'Type comes from the type tokens',
    fix: 'Set `font: var(--om-type-…)` — no font-size, font-weight, line-height, font-family or letter-spacing of your own.',
    applies: isCss,
    find: (t) => linesOf(t, /(^|[;{\s])(font-size|font-weight|line-height|font-family|letter-spacing)\s*:|(^|[;{\s])font\s*:\s*(?!\s|var\(|inherit)/),
  },
  {
    id: 'raw-radius',
    title: 'Corners come from the radius scale',
    fix: 'Use var(--om-radius-1 | -2 | -3 | -full): 4 fields and buttons · 8 cards · 12 modals.',
    applies: isCss,
    find: (t) => linesOf(t, /border(-[a-z]+)*-radius\s*:\s*(?!\s|var\(|0\s*[;}]|0\s*$|inherit)/),
  },
  {
    id: 'inline-style',
    title: 'No design values in inline styles',
    fix: 'Put type, colour, borders and spacing in the component\'s CSS module on --om-* tokens; inline style is for computed geometry only.',
    applies: (p) => p.endsWith('.tsx'),
    find: (t) => linesOf(t, /style=\{\{[^}]*\b(font|fontSize|fontWeight|lineHeight|color|background|backgroundColor|border|borderRadius|boxShadow|padding|margin)\s*:/),
  },
  {
    id: 'ds-bypass',
    title: 'The design system comes through @/components/ds',
    fix: "Import from '@/components/ds', never '@openmaison/react' directly.",
    applies: (p) => isTsx(p) && !p.startsWith('components/ds/'),
    find: (t) => linesOf(t, /from\s+['"]@openmaison\/react['"]/),
  },
  {
    id: 'row-fade',
    title: 'A table row\'s hover fill never fades',
    fix: 'Drop the background transition from the row, its cells and its frozen cells (REG-734): a fade trails a fast pointer and splits a row whose frozen cell transitions on its own. A table\'s hover is instant, as the table core draws it.',
    /* a table's stylesheet: the core, the listing, the Payment Schedule, and every sheet that composes the core */
    applies: (p) => isCss(p) && (TABLE_SHEETS.includes(p) || readFileSync(join(ROOT, p), 'utf8').includes('table-core.module.css')),
    find: (t) => {
      const out = []
      const re = /([^{}]*)\{([^{}]*)\}/g
      let m
      while ((m = re.exec(t))) {
        const sel = m[1].split(/[;\n]/).pop() ?? ''
        if (!/\.(row|cell|pin)(?![\w-])/.test(sel)) continue
        if (/transition\s*:[^;]*\b(background|all)\b/.test(m[2])) out.push(t.slice(0, m.index + m[0].indexOf('{')).split('\n').length)
      }
      return out
    },
  },
  {
    id: 'copied-table',
    title: 'A table uses the table core, not a copy of its stylesheet',
    fix: 'Compose the table core (components/om/table-core.module.css, REG-727): `.hCell { composes: hCell from \'…/om/table-core.module.css\'; }` — a copied .hCell drifts (REG-723).',
    applies: (p) => isCss(p) && p !== 'components/leads/table.module.css' && p !== 'components/om/table-core.module.css',
    /* a head cell's rule that declares anything beyond `composes` (and a local override or two) is a copy; one that only composes is fine */
    find: (t) => {
      const out = []
      const re = /(^|\n)(\s*)\.hCell\s*\{([^}]*)\}/g
      let m
      while ((m = re.exec(t))) {
        const body = m[3].replace(/composes:[^;]*;/g, '').trim()
        const decls = body.split(';').map((d) => d.trim()).filter(Boolean)
        if (decls.some((d) => /^(padding|color|display|font)\b/.test(d))) out.push(t.slice(0, m.index + m[1].length).split('\n').length)
      }
      return out.slice(0, 1)
    },
  },
]

function scan() {
  const found = {}   // rule → file → lines
  for (const dir of DIRS) {
    for (const abs of walk(join(ROOT, dir))) {
      const p = rel(abs)
      if (!isCss(p) && !isTsx(p)) continue
      const raw = readFileSync(abs, 'utf8')
      const css = isCss(p) ? stripCss(raw) : null
      const ts = isTsx(p) ? stripTs(raw) : null
      for (const r of RULES) {
        if (!r.applies(p)) continue
        const lines = r.find(css ?? ts ?? raw, p)
        if (lines.length) ((found[r.id] ??= {})[p] = lines)
      }
    }
  }
  return found
}

const args = process.argv.slice(2)
const found = scan()
const counts = Object.fromEntries(RULES.map((r) => [r.id, Object.fromEntries(Object.entries(found[r.id] ?? {}).sort().map(([f, l]) => [f, l.length]))]))
const total = (id) => Object.values(counts[id] ?? {}).reduce((a, b) => a + b, 0)

if (args[0] === '--list') {
  const id = args[1]
  for (const [f, lines] of Object.entries(found[id] ?? {}).sort()) console.log(`${f}:${lines.join(',')}`)
  process.exit(0)
}
if (args[0] === '--update') {
  writeFileSync(BASELINE, JSON.stringify({ note: 'The design lint\'s ratchet (scripts/design-lint.mjs, REG-726): per rule, the violations each file may still hold. Only ever lower these — fix, then run npm run design:lint -- --update.', counts }, null, 2) + '\n')
  console.log('design lint: baseline written —', RULES.map((r) => `${r.id} ${total(r.id)}`).join(' · '))
  process.exit(0)
}

const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')).counts ?? {} : {}
let failed = 0, lowered = 0
console.log('design lint — the house rules (REG-726)')
for (const r of RULES) {
  const was = base[r.id] ?? {}
  const worse = Object.entries(found[r.id] ?? {}).filter(([f, l]) => l.length > (was[f] ?? 0))
  const better = Object.entries(was).filter(([f, n]) => (counts[r.id][f] ?? 0) < n).length
  lowered += better
  const baseTotal = Object.values(was).reduce((a, b) => a + b, 0)
  console.log(`  ${worse.length ? '✗' : '✓'} ${r.id.padEnd(14)} ${String(total(r.id)).padStart(4)}  (allowed ${baseTotal})  ${r.title}`)
  for (const [f, lines] of worse) {
    failed++
    console.log(`      new: ${f}:${lines.join(',')}  (${lines.length} here, ${was[f] ?? 0} allowed)`)
    console.log(`           → ${r.fix}`)
  }
}
if (lowered) console.log(`\n  ${lowered} file(s) now hold fewer than the baseline allows — lower it: npm run design:lint -- --update`)
if (failed) {
  console.log(`\n✗ ${failed} file(s) break a house rule. Fix them with the house pieces named above; the baseline is never raised to let a new one in.`)
  process.exit(1)
}
console.log('\n✓ nothing new breaks a house rule')
