import { randomBytes } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

/**
 * First-run setup, folded into `npm run dev` (and `npm run build`) as a `pre` script — so a fresh clone is
 * `npm install && npm run dev` and nothing else. Three steps, each of which does nothing when it has already
 * been done:
 *
 *   1. `.env.local` — copied from `.env.example`, with a real AUTH_SECRET generated.
 *   2. `local.db`   — created by running the Drizzle migrations (the file is gitignored: a SQLite binary in git
 *                     collects everyone's demo clicking and cannot be merged).
 *   3. the demo data — restored from `fixtures/baseline.json`, the same curated state Maison AI ›
 *                     "Reset prototype to base" writes.
 *
 * IDEMPOTENT AND NON-DESTRUCTIVE: an existing local.db is left exactly as it is. This runs before every `dev`,
 * so it must never overwrite the database someone is demoing from. Use `npm run db:reset` to start over.
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

/* 2 + 3. The database, only when there is none. */
const { DATABASE_URL } = await import('./env')
const file = DATABASE_URL.startsWith('file:') ? DATABASE_URL.slice('file:'.length) : null

if (!file) {
  log(`· DATABASE_URL points at ${DATABASE_URL} — leaving it to the server`)
} else if (existsSync(file)) {
  log(`· ${file} is already here — untouched`)
} else {
  log(`· no ${file} yet — creating it`)
  const run = (script: string) => execFileSync('npx', ['tsx', script], { stdio: QUIET ? 'ignore' : 'inherit' })
  run('scripts/migrate.ts')
  run('scripts/restore-baseline.ts')
  log('· demo data restored from fixtures/baseline.json')
}
