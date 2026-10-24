/* Static: every `.x { composes: y from 'f'; prop: v }` whose composed class `.y` in f (unlayered) also sets prop (or its shorthand family) at the
   same weight — an override that only holds while the bundler emits f's sheet first. node fragile-composes.cjs [root]
   (responsive audit 2026-10-23, W1) Written when this round's rebuild reordered the CSS chunks and three such overrides flipped at 1440 (the
   project Money tab's Needs you padding; Commissions' and Reports › Finance's digits). A layered source (REG-727's @layer) is safe and skipped.
   It does not see a `font:` shorthand on one class resetting another class's `font-variant-numeric` on the same element — the Commissions case. */
const fs = require('fs'), path = require('path')
const ROOT = process.argv[2] || process.cwd()
const files = []
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/node_modules|\.next|vendor|floorplan-3d/.test(e.name)) walk(p) } else if (e.name.endsWith('.module.css')) files.push(p) } }
for (const d of ['app', 'components']) walk(path.join(ROOT, d))
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '')
/* top-level (and @media-nested) single-class rules: class → [{props, layered, media}] */
function rulesOf(file) {
  const t = strip(fs.readFileSync(file, 'utf8'))
  const out = []
  // walk blocks with a tiny brace parser
  const stack = []
  let i = 0, start = 0
  while (i < t.length) {
    const c = t[i]
    if (c === '{') { stack.push(t.slice(start, i).trim()); start = i + 1 }
    else if (c === '}') {
      const sel = stack.pop(); const body = t.slice(start, i)
      if (sel && !sel.startsWith('@')) out.push({ sel, body, ctx: [...stack] })
      start = i + 1
    } else if (c === ';' && stack.length && stack[stack.length - 1].startsWith('@') && t.slice(start, i).includes(':') === false) { start = i + 1 }
    i++
  }
  return out
}
const FAM = (p) => (p.startsWith('padding') ? 'padding' : p.startsWith('margin') ? 'margin' : p.startsWith('border-radius') ? 'border-radius' : p === 'font' || p.startsWith('font-') || p === 'line-height' ? 'font' : p.startsWith('inset') || ['top', 'left', 'right', 'bottom'].includes(p) ? p : p)
const propsOf = (body) => body.split(';').map((d) => d.trim()).filter((d) => d && d.includes(':') && !d.startsWith('composes')).map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()])
const cache = new Map()
const get = (f) => { if (!cache.has(f)) cache.set(f, rulesOf(f)); return cache.get(f) }
const hits = []
for (const f of files) {
  for (const r of get(f)) {
    const m = r.body.match(/composes:\s*([\w\s-]+?)\s+from\s+['"]([^'"]+)['"]/)
    if (!m) continue
    const target = path.resolve(path.dirname(f), m[2]); if (!fs.existsSync(target)) continue
    const own = propsOf(r.body); if (!own.length) continue
    const names = m[1].trim().split(/\s+/)
    const selfCls = r.sel.match(/^\.([\w-]+)$/); if (!selfCls) continue   // a bare `.x` composing (the only form composes allows)
    for (const n of names) {
      for (const tr of get(target)) {
        if (tr.ctx.some((c) => c.startsWith('@layer'))) continue   // a layered source always loses — safe (REG-727)
        if (tr.sel !== `.${n}`) continue                           // the composed class's own same-weight rule
        if (tr.ctx.length !== r.ctx.length) continue                // compare like with like: base with base
        const theirs = propsOf(tr.body)
        for (const [p, v] of own) for (const [q, w] of theirs) if (FAM(p) === FAM(q) && v !== w) hits.push(`${path.relative(ROOT, f)}  .${selfCls[1]} { ${p}: ${v} }  ⟂  ${path.relative(ROOT, target)} .${n} { ${q}: ${w} }${r.ctx.length ? '  in ' + r.ctx.join(' ') : ''}`)
      }
    }
  }
}
console.log(hits.length + ' fragile overrides')
for (const h of [...new Set(hits)].sort()) console.log(h)
