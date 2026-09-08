import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

/**
 * The data half of first-run setup, called by scripts/preflight.mjs (the `predev` / `prebuild` hook) once
 * dependencies exist. Three steps, each of which does nothing when it has already been done:
 *
 *   1. `.env.local` — copied from `.env.example`, with a real AUTH_SECRET generated.
 *   2. migrations   — run EVERY time, not just on a fresh database. They are idempotent, and running them
 *                     unconditionally is what stops "it broke after I pulled" for anyone who does not know
 *                     that `db:migrate` exists. `local.db` itself stays gitignored: a SQLite binary in git
 *                     collects everyone's demo clicking and cannot be merged.
 *   3. the demo data — restored from `fixtures/baseline.json` (the curated state Maison AI › "Reset prototype
 *                     to base" writes) ONLY when the database did not exist a moment ago.
 *
 * Step 3's condition is the load-bearing one: an existing local.db is never rewritten, so this cannot clear
 * the state someone is demoing from. `npm run db:reset` is the deliberate way to start over.
 */

const QUIET = process.argv.includes('--quiet')
const log = (m: string) => { if (!QUIET) console.log(m) }

/* 1. .env.local */
if (!existsSync('.env.local')) {
  copyFileSync('.env.example', '.env.local')
  log('· created .env.local from .env.example')
}
const env = readFileSync('.env.local', 'utf8')
if (/^AUTH_SECRET=""\s*$/m.test(env)) {
  writeFileSync('.env.local', env.replace(/^AUTH_SECRET=""\s*$/m, `AUTH_SECRET="${randomBytes(32).toString('base64')}"`))
  log('· generated AUTH_SECRET')
}

/* 2 + 3. The database. */
const { DATABASE_URL } = await import('./env')
const file = DATABASE_URL.startsWith('file:') ? DATABASE_URL.slice('file:'.length) : null

if (!file) {
  log(`· DATABASE_URL points at ${DATABASE_URL} — leaving it to the server`)
} else {
  const fresh = !existsSync(file)
  /* The local tsx, not `npx tsx`: npx on a machine that has never seen the package goes to the network,
     and this has to work on a fresh clone behind whatever proxy someone is sitting behind. */
  const tsx = path.join('node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
  const run = (script: string) => execFileSync(tsx, [script], { stdio: QUIET ? 'ignore' : 'inherit' })

  if (fresh) log(`· no ${file} yet — creating it`)
  run('scripts/migrate.ts')

  if (fresh) {
    run('scripts/restore-baseline.ts')
    log('· demo data restored from fixtures/baseline.json')
  }
}
