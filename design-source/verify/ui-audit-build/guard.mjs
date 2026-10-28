// The calm UI build's "nothing is lost" guard (2026-10-27 — his "make sure no feature or functionality is lost; this is just the visual and
// UX improvements"). A static snapshot of what a person can reach and do, taken before and after a lane, so a lane can only MOVE things:
//   · every page (app/**/page.tsx → its route)
//   · every server action a screen calls (the names imported from a 'use server' module, and where)
//   · every data-testid and data-kb a control carries (the probes' and the key layer's handles; a moved control keeps its own)
//   · every key in the shortcut registry (lib/keys/registry.ts KEYS ids)
// Usage:  node guard.mjs snap <repoRoot> <out.json>
//         node guard.mjs diff <before.json> <after.json>     → lists what disappeared (exit 1 if anything did) and what is new
import fs from 'node:fs'
import path from 'node:path'

const [cmd, a, b] = process.argv.slice(2)
const SRC = ['app', 'components', 'lib']
const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out); else if (/\.(tsx?|mts)$/.test(e.name)) out.push(p)
  }
  return out
}

function snap(root) {
  const files = SRC.flatMap((d) => walk(path.join(root, d)))
  const rel = (p) => path.relative(root, p)
  const text = Object.fromEntries(files.map((f) => [rel(f), fs.readFileSync(f, 'utf8')]))
  /* pages → routes (route groups and parallel folders dropped) */
  const routes = Object.keys(text).filter((f) => /^app\/.*page\.tsx$/.test(f))
    .map((f) => '/' + f.replace(/^app\//, '').replace(/\/?page\.tsx$/, '').split('/').filter((s) => !/^\(.*\)$/.test(s)).join('/')).sort()
  /* 'use server' modules and the names screens import from them */
  const serverMods = new Set(Object.keys(text).filter((f) => /^\s*['"]use server['"]/.test(text[f])))
  const modKey = (spec, from) => {
    let p = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.join(path.dirname(from), spec) : null
    if (!p) return null
    for (const ext of ['.ts', '.tsx', '/index.ts']) if (serverMods.has(p + ext)) return p + ext
    return serverMods.has(p) ? p : null
  }
  const actions = {}
  for (const [f, s] of Object.entries(text)) {
    if (serverMods.has(f)) continue
    for (const m of s.matchAll(/import\s*(type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      if (m[1]) continue
      const mod = modKey(m[3], f); if (!mod) continue
      for (const n of m[2].split(',').map((x) => x.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)) {
        const k = `${mod}#${n}`; (actions[k] ||= []).push(f)
      }
    }
  }
  /* control handles: data-testid / data-kb / testId= props, as literals (a template's static prefix counts) */
  const handles = {}
  const add = (kind, v, f) => { const k = `${kind}:${v}`; (handles[k] ||= new Set()).add(f) }
  for (const [f, s] of Object.entries(text)) {
    if (!f.startsWith('components/') && !f.startsWith('app/')) continue
    for (const m of s.matchAll(/data-testid=\{?["'`]([^"'`$]+)/g)) add('testid', m[1], f)
    for (const m of s.matchAll(/\btestId[:=]\s*\{?["'`]([^"'`$]+)/g)) add('testid', m[1], f)
    for (const m of s.matchAll(/data-kb=\{?["'`]([^"'`$]+)/g)) add('kb', m[1], f)
  }
  const keys = [...(text['lib/keys/registry.ts'] || '').matchAll(/\bid:\s*['"]([a-z0-9.-]+)['"]/g)].map((m) => m[1]).sort()
  return { routes, actions: Object.fromEntries(Object.entries(actions).map(([k, v]) => [k, [...new Set(v)].sort()])),
    handles: Object.fromEntries(Object.entries(handles).map(([k, v]) => [k, [...v].sort()])), keys }
}

if (cmd === 'snap') {
  const s = snap(path.resolve(a))
  fs.writeFileSync(b, JSON.stringify(s))
  console.log(`snapshot: ${s.routes.length} pages · ${Object.keys(s.actions).length} server actions called · ${Object.keys(s.handles).length} control handles · ${s.keys.length} keys → ${b}`)
} else if (cmd === 'diff') {
  const A = JSON.parse(fs.readFileSync(a, 'utf8')), B = JSON.parse(fs.readFileSync(b, 'utf8'))
  const gone = (x, y) => x.filter((k) => !y.includes(k))
  const lostRoutes = gone(A.routes, B.routes)
  const lostActions = gone(Object.keys(A.actions), Object.keys(B.actions))
  const lostHandles = gone(Object.keys(A.handles), Object.keys(B.handles))
  const lostKeys = gone(A.keys, B.keys)
  const newHandles = gone(Object.keys(B.handles), Object.keys(A.handles))
  const say = (t, l) => console.log(`${l.length ? '✗' : '✓'} ${t}: ${l.length ? l.length + ' gone' : 'none gone'}${l.length ? '\n    ' + l.join('\n    ') : ''}`)
  say('pages', lostRoutes); say('server actions a screen calls', lostActions.map((k) => `${k}  (was called from ${A.actions[k].join(', ')})`))
  say('control handles (data-testid · data-kb)', lostHandles.map((k) => `${k}  (was in ${A.handles[k].join(', ')})`)); say('keyboard shortcuts', lostKeys)
  console.log(`  new handles: ${newHandles.length}`)
  process.exit(lostRoutes.length || lostActions.length || lostHandles.length || lostKeys.length ? 1 : 0)
} else { console.error('usage: guard.mjs snap <root> <out.json> | diff <before.json> <after.json>'); process.exit(2) }
