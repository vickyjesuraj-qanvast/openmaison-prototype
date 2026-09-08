import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Refresh `vendor/` from the sibling design-system checkout.
 *
 * The design system is private and unpublished, and it used to be consumed as `link:../openmaison-design-system/...`
 * — which meant a teammate needed a SECOND clone (with access to a private repo), a package manager that understands
 * the `link:` protocol, and a DS build before this app would even install. The built output is ~350KB, so the app
 * carries it instead: `vendor/` is committed, `package.json` points at `file:vendor/*`, and a clone runs with
 * `npm install && npm run dev` and nothing else.
 *
 * Run this whenever the design system changes:  npm run ds:vendor        (add --build to build the DS first)
 *
 * What lands in vendor/ is BUILD OUTPUT, never source — treat it as generated and never hand-edit it.
 */

const HERE = path.resolve(import.meta.dirname, '..')
const DS = path.resolve(HERE, '..', 'openmaison-design-system')
const OUT = path.join(HERE, 'vendor')

if (!existsSync(DS)) {
  console.error(`design system not found at ${DS}`)
  console.error('clone it beside this repo (only maintainers need it — vendor/ is committed for everyone else)')
  process.exit(1)
}

if (process.argv.includes('--build')) {
  const { execSync } = await import('node:child_process')
  console.log('building the design system…')
  execSync('corepack pnpm --filter @openmaison/icons build && corepack pnpm --filter @openmaison/tokens build && corepack pnpm --filter @openmaison/react build',
    { cwd: DS, stdio: 'inherit' })
}

const pkg = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>
const write = (p: string, v: unknown) => writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`)

/** dist/ must exist — an unbuilt DS would otherwise vendor an empty package that fails at import time. */
function requireDist(name: string, dir: string) {
  if (!existsSync(dir) || readdirSync(dir).length === 0) {
    console.error(`${name}: ${dir} is missing or empty — run \`npm run ds:vendor -- --build\``)
    process.exit(1)
  }
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

/* ── @openmaison/react ─────────────────────────────────────────────────────────────────────────────────
   dist + a manifest with the workspace: dependencies dropped: `react-aria-components` is already a direct
   dependency of this app, and `@openmaison/icons` is vendored beside this package and declared at app level,
   so both resolve from the app's own node_modules. npm cannot resolve a `workspace:` range at all. */
const reactDir = path.join(OUT, 'openmaison-react')
requireDist('@openmaison/react', path.join(DS, 'packages/react/dist'))
mkdirSync(reactDir, { recursive: true })
cpSync(path.join(DS, 'packages/react/dist'), path.join(reactDir, 'dist'), { recursive: true })
const reactPkg = pkg(path.join(DS, 'packages/react/package.json'))
delete reactPkg.dependencies
delete reactPkg.devDependencies
delete reactPkg.scripts
write(path.join(reactDir, 'package.json'), reactPkg)

/* ── @openmaison/tokens ────────────────────────────────────────────────────────────────────────────────
   dist only: the app imports the package root (the light token object) and `./css/*` for the two themes. */
const tokensDir = path.join(OUT, 'openmaison-tokens')
requireDist('@openmaison/tokens', path.join(DS, 'packages/tokens/dist'))
mkdirSync(tokensDir, { recursive: true })
/* css (the two themes) + ts (the token objects) + json; the compose/ and swift/ outputs are for the native
   platforms and nothing here imports them. */
for (const sub of ['css', 'ts', 'json']) {
  cpSync(path.join(DS, 'packages/tokens/dist', sub), path.join(tokensDir, 'dist', sub), { recursive: true })
}
const tokensPkg = pkg(path.join(DS, 'packages/tokens/package.json'))
delete tokensPkg.devDependencies
delete tokensPkg.scripts
tokensPkg.files = ['dist']
tokensPkg.exports = {
  '.': './dist/ts/tokens.light.js',
  './dark': './dist/ts/tokens.dark.js',
  './css/*': './dist/css/*',
  './json/*': './dist/json/*',
}
write(path.join(tokensDir, 'package.json'), tokensPkg)

/* ── @openmaison/icons ─────────────────────────────────────────────────────────────────────────────────
   The whole set is 15,576 files / 61MB, and this app draws its own icons (the subsetted Material Symbols font,
   REG-207) — but the DS's own components import a handful, so those have to resolve. The list is READ from the
   built react bundle rather than hard-coded, so a DS change that reaches for a new icon is picked up here. */
const iconsDir = path.join(OUT, 'openmaison-icons')
const reactIndex = readFileSync(path.join(DS, 'packages/react/dist/index.js'), 'utf8')
const used = [...new Set([...reactIndex.matchAll(/@openmaison\/icons\/icons\/([\w-]+)\.js/g)].map((m) => m[1]!))].sort()
mkdirSync(path.join(iconsDir, 'icons'), { recursive: true })
cpSync(path.join(DS, 'packages/icons/createIcon.js'), path.join(iconsDir, 'createIcon.js'))
cpSync(path.join(DS, 'packages/icons/createIcon.d.ts'), path.join(iconsDir, 'createIcon.d.ts'))
for (const name of used) {
  for (const ext of ['js', 'd.ts']) {
    const from = path.join(DS, `packages/icons/icons/${name}.${ext}`)
    if (existsSync(from)) cpSync(from, path.join(iconsDir, 'icons', `${name}.${ext}`))
  }
}
const iconsPkg = pkg(path.join(DS, 'packages/icons/package.json'))
write(path.join(iconsDir, 'package.json'), {
  name: iconsPkg.name,
  version: iconsPkg.version,
  description: `${String(iconsPkg.description)} — vendored subset: only the icons the DS components import.`,
  type: 'module',
  sideEffects: false,
  files: ['createIcon.js', 'createIcon.d.ts', 'icons'],
  exports: { './icons/*': './icons/*' },
  peerDependencies: iconsPkg.peerDependencies,
})

writeFileSync(path.join(OUT, 'README.md'), `# vendor/ — the OpenMaison design system, built

Generated by \`npm run ds:vendor\`. **Do not edit by hand** — every file here is build output copied from the
sibling \`openmaison-design-system\` checkout, and the next refresh overwrites it.

It is committed so that this repo installs and runs on its own: no second clone, no private-repo access, no DS
build step. \`package.json\` points at these three folders with \`file:\` paths.

| package | what is vendored |
| --- | --- |
| \`@openmaison/react\` | \`dist/\` — the component library the app imports, plus \`styles.css\` |
| \`@openmaison/tokens\` | \`dist/\` — the light/dark token objects and the two theme stylesheets |
| \`@openmaison/icons\` | only the ${used.length} icons the DS components import (${used.join(', ')}); the full set is 61MB and this app draws its own (REG-207) |

## Refreshing after a design-system change

\`\`\`bash
npm run ds:vendor -- --build   # builds the DS in ../openmaison-design-system, then re-copies
npm install                    # file: deps are cached by npm, so re-link them
git add vendor && git commit -m "vendor: refresh the design system"
\`\`\`
`)

const size = (d: string) => execSyncSize(d)
function execSyncSize(dir: string): string {
  let bytes = 0
  const walk = (p: string) => {
    for (const e of readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name)
      if (e.isDirectory()) walk(full)
      else bytes += readFileSync(full).byteLength
    }
  }
  walk(dir)
  return `${Math.round(bytes / 1024)}KB`
}

console.log(`vendored @openmaison/react   ${size(reactDir)}`)
console.log(`vendored @openmaison/tokens  ${size(tokensDir)}`)
console.log(`vendored @openmaison/icons   ${size(iconsDir)} (${used.length} icons: ${used.join(', ')})`)
