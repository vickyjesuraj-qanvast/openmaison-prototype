/**
 * Quote X-Ray (REG-638, X-Ray parity Q-05) — 1.0's curated material facts (`src/lib/quote-xray/material-facts.ts`, B-68…B-75),
 * carried over word for word: the physics-grounded weaknesses of common renovation materials, matched on the other studio's
 * lines by keyword and context. No model, no reviews, no brand claims — every surfaced line is a question, so it reads as
 * buyer education, not an attack. 1.0's rules hold: the context gates ("swells near water" only on wet-area lines, "scorch
 * marks" only on heat-exposed ones) and the glass-house rule (never when your own quote uses the same material). Two fixes
 * (the audit's §5.4): a worktop needs a worktop word — a bare "top" beside a cabinet is a cabinet ("Top and bottom kitchen
 * cabinets with laminate finish" is a cabinet finish, B-70); and the glass-house test reads the same use in one of your lines,
 * not the word anywhere in your quote (your laminate wardrobe no longer silences their laminate worktop, B-75).
 */

type MaterialContext = 'wet-area' | 'heat-area' | 'any'

/** Where wet-area weaknesses apply: water-adjacent rooms and fittings. */
const WET_RE = /kitchen|bathroom|toilet|\bwc\b|vanity|basin|sink|shower|wet\s*area|laundry|yard|balcony|bomb\s*shelter/i
/** Where heat weaknesses apply: cooking zones and worktops. */
const HEAT_RE = /kitchen|counter\s*top|countertop|worktop|work\s*top|table\s*top|hob|stove|island/i
/** A worktop word. 1.0 also took a bare "top" — kept, unless the line is about cabinets, wardrobes or shelves. */
const WORKTOP_RE = /counter\s*top|countertop|worktop|work\s*top|table\s*top|vanity\s*top/i
const BARE_TOP_RE = /\btop\b/i
const NOT_A_TOP_RE = /cabinet|wardrobe|shel(f|ves|ving)|top[\s-]*hung/i
const isTop = (text: string) => WORKTOP_RE.test(text) || (BARE_TOP_RE.test(text) && !NOT_A_TOP_RE.test(text))

type MaterialDef = {
  key: string
  display: string
  aliases: RegExp
  /** Extra text the line must also carry for the fact to apply — `'top'` = a worktop (above). */
  require?: RegExp | 'top' | ((text: string) => boolean)
  context: MaterialContext
  weakness: string
  /** The client-safe question the designer can pass on as it stands. */
  question: string
  /** Materials that count as the better spec when your quote names one in the same trade. */
  better?: string[]
}

export const MATERIAL_FACTS: MaterialDef[] = [
  // ── Carpentry boards ─────────────────────────────────────────────────────
  { key: 'mdf', display: 'MDF', aliases: /\bmdf\b|medium[\s-]*density\s*fib/i, context: 'wet-area',
    weakness: 'MDF swells and loses structural strength with prolonged moisture exposure — a known failure mode for carcasses near sinks and wet areas.',
    question: 'Is the cabinet carcass MDF or plywood? MDF swells with prolonged moisture, which matters near the sink.',
    better: ['plywood', 'marine plywood'] },
  { key: 'particleboard', display: 'particleboard / chipboard', aliases: /particle\s*board|chip\s*board|chipboard/i, context: 'any',
    weakness: 'Particleboard sags under sustained load and disintegrates when wet — the lowest-durability carcass material in common use.',
    question: "Is the carcass particleboard? It sags under load over time and doesn’t survive water exposure.",
    better: ['plywood', 'marine plywood', 'mdf'] },
  { key: 'hollow-core', display: 'hollow-core', aliases: /hollow[\s-]*core/i, context: 'any',
    weakness: 'Hollow-core construction dents easily and provides poor sound insulation compared to solid-core.',
    question: 'Are the doors hollow-core or solid-core? Hollow-core dents easily and lets much more sound through.',
    better: ['solid core', 'solid-core', 'solid timber'] },
  { key: 'veneer', display: 'wood veneer', aliases: /\bveneer(ed)?\b/i, context: 'wet-area',
    weakness: "Veneer surfaces water-mark and lift at the edges with repeated moisture contact, and can’t be sanded back like solid wood.",
    question: 'How is the veneer sealed around water points? Veneer edges lift with repeated moisture contact.' },
  // ── Worktops and surfaces ────────────────────────────────────────────────
  { key: 'laminate-top', display: 'laminate', aliases: /\blaminate(d)?\b|\bhpl\b|formica/i, require: 'top', context: 'heat-area',
    weakness: 'Laminate worktops scorch under hot pans and swell at the seams when water gets in — the usual first thing to age in a budget kitchen.',
    question: 'Is the worktop laminate? It marks under hot pans and the seams swell if water gets in — ask how the joints are sealed.',
    better: ['quartz', 'sintered stone', 'kompacplus', 'solid surface', 'granite'] },
  { key: 'solid-surface', display: 'solid surface', aliases: /solid\s*surface|corian/i, require: 'top', context: 'heat-area',
    weakness: 'Solid surface scratches and heat-marks more readily than quartz or sintered stone (though it is repairable by polishing).',
    question: 'Solid surface tops mark under hot cookware — ask whether the price includes re-polishing, or compare against a quartz spec.',
    better: ['quartz', 'sintered stone', 'kompacplus'] },
  { key: 'marble', display: 'natural marble', aliases: /\bmarble\b/i, require: (t) => isTop(t) || /kitchen/i.test(t), context: 'heat-area',
    weakness: 'Natural marble is porous — it stains and etches on contact with acids (lemon, wine, sauces) and needs regular re-sealing in a kitchen.',
    question: 'Marble in a kitchen etches with anything acidic and needs re-sealing — ask what the maintenance plan and sealing schedule is.',
    better: ['quartz', 'sintered stone'] },
  { key: 'granite', display: 'granite', aliases: /\bgranite\b/i, require: 'top', context: 'any',
    weakness: 'Granite is porous enough to need periodic re-sealing; unsealed granite stains around cooking zones.',
    question: 'Does the granite price include sealing, and how often will it need re-sealing?' },
  // ── Flooring ─────────────────────────────────────────────────────────────
  { key: 'laminate-floor', display: 'laminate flooring', aliases: /\blaminate(d)?\b/i, require: /floor|flooring/i, context: 'wet-area',
    weakness: 'Laminate flooring swells irreversibly when water gets into the joints — unsuitable for kitchens, bathrooms and entryways that see water.',
    question: 'Is that laminate flooring rated for wet areas? Standard laminate swells permanently if water gets into the joints.',
    better: ['vinyl', 'spc', 'tiles', 'homogeneous tiles'] },
  { key: 'engineered-wood', display: 'engineered wood', aliases: /engineered\s*(wood|timber)|parquet/i, require: /floor|flooring/i, context: 'wet-area',
    weakness: 'Engineered wood and parquet cup and warp with humidity swings and standing water, and refinishing options are limited by the thin wear layer.',
    question: 'How will the engineered wood handle humidity near wet areas — and how many times can its wear layer be sanded back?',
    better: ['vinyl', 'spc', 'tiles'] },
  // ── Metals and fittings ──────────────────────────────────────────────────
  { key: 'mild-steel', display: 'mild steel', aliases: /mild\s*steel|\bm\.?s\.?\s+(frame|grille|gate|railing)/i, context: 'wet-area',
    weakness: 'Mild steel rusts once the powder coat is scratched — in wet areas it needs re-coating within a few years.',
    question: 'Is the metalwork mild steel or stainless? Mild steel rusts at any coating scratch in a wet area.',
    better: ['stainless steel', 'aluminium'] },
  { key: 'chrome-plastic', display: 'chrome-plated plastic', aliases: /chrome[\s-]*plated\s*(abs|plastic)|\babs\b/i, require: /tap|mixer|shower|faucet|basin|accessor/i, context: 'any',
    weakness: 'Chrome-plated plastic fittings peel and crack within a few years of daily hot-water use — solid brass or stainless bodies last decades.',
    question: 'Are the taps and mixers solid brass/stainless, or chrome-plated plastic? The plating on plastic bodies peels within a few years.',
    better: ['brass', 'stainless steel'] },
  { key: 'acrylic-sanitary', display: 'acrylic', aliases: /\bacrylic\b/i, require: /basin|tub|bathtub|sink|tray/i, context: 'any',
    weakness: 'Acrylic basins and trays scratch and dull with abrasive cleaning; ceramic and enamelled steel keep their finish far longer.',
    question: 'Is the basin acrylic or ceramic? Acrylic scratches with normal cleaning and dulls over time.',
    better: ['ceramic', 'enamelled steel'] },
  // ── Paint ────────────────────────────────────────────────────────────────
  { key: 'standard-emulsion', display: 'standard emulsion paint', aliases: /emulsion|standard\s*paint/i, require: /bathroom|toilet|kitchen|wet/i, context: 'wet-area',
    weakness: 'Standard emulsion in wet rooms grows mould at the ceiling line within a year or two — wet areas need anti-mould/kitchen-and-bathroom grade paint.',
    question: 'Is the bathroom paint anti-mould grade, or standard emulsion? Standard emulsion moulds at the ceiling line in wet rooms.',
    better: ['anti-mould', 'anti mould'] },
  // ── Glass and panels ─────────────────────────────────────────────────────
  { key: 'float-glass', display: 'non-tempered glass', aliases: /float\s*glass|non[\s-]*tempered|annealed\s*glass/i, context: 'any',
    weakness: 'Non-tempered glass breaks into dangerous shards — shower screens, table tops and full-height panels should always be tempered.',
    question: 'Is the glass tempered? Non-tempered glass breaks into shards, which matters for showers and full-height panels.',
    better: ['tempered glass'] },
  { key: 'pvc-foam', display: 'PVC foam board', aliases: /pvc\s*(foam)?\s*board|foam\s*board/i, context: 'any',
    weakness: 'PVC foam board dents under impact and bows across longer spans — fine for backing, weak as a primary carcass or shelf material.',
    question: 'Are the shelves and carcass PVC foam board? It bows across longer spans and dents easily.',
    better: ['plywood', 'marine plywood'] },
]

const requires = (d: MaterialDef, text: string) =>
  !d.require ? true : d.require === 'top' ? isTop(text) : typeof d.require === 'function' ? d.require(text) : d.require.test(text)
const inContext = (c: MaterialContext, text: string) => (c === 'any' ? true : c === 'wet-area' ? WET_RE.test(text) : HEAT_RE.test(text))

/** One of the other studio's lines as the material scan reads it. */
export type MaterialLine = { key: string; text: string; trade: string; name: string; amountMinor: number }
export type MaterialFinding = { materialKey: string; material: string; rowKey: string; item: string; trade: string; lineMinor: number; weakness: string; question: string; ownAlternative: string | null }

/**
 * The material questions the other quote raises: one per material, on its biggest line; never when one of your lines uses the
 * same material the same way (the glass-house rule). `sameTrade` decides where your better alternative is looked for.
 */
export function materialFindings(theirs: MaterialLine[], yours: { text: string; trade: string }[], sameTrade: (a: string, b: string) => boolean): MaterialFinding[] {
  const best = new Map<string, MaterialFinding>()
  for (const l of theirs) {
    for (const d of MATERIAL_FACTS) {
      if (!d.aliases.test(l.text) || !requires(d, l.text) || !inContext(d.context, l.text)) continue
      if (yours.some((y) => d.aliases.test(y.text) && requires(d, y.text))) continue   // glass house: the same material, the same use
      const alt = (d.better ?? []).find((b) => yours.some((y) => (sameTrade(y.trade, l.trade) || (isTop(l.text) && isTop(y.text))) && y.text.toLowerCase().includes(b)))
      const f: MaterialFinding = { materialKey: d.key, material: d.display, rowKey: l.key, item: l.name, trade: l.trade, lineMinor: l.amountMinor, weakness: d.weakness, question: d.question, ownAlternative: alt ?? null }
      const had = best.get(d.key)
      if (!had || f.lineMinor > had.lineMinor) best.set(d.key, f)
    }
  }
  return [...best.values()].sort((a, b) => b.lineMinor - a.lineMinor)
}
