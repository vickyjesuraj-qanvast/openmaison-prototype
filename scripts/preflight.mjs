import { existsSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

/**
 * Everything that has to be true before `next dev` can start — run as the `predev` / `prebuild` hook, so the
 * whole setup is ONE command:
 *
 *     npm run dev
 *
 * Plain Node with no imports beyond the standard library, because it has to run before `node_modules` exists.
 * (`tsx`, the design system, Drizzle — none of them are here yet on a fresh clone. That is the point.)
 *
 * It checks, in order:
 *   1. Node is new enough for Next 16, and says what to install when it is not.
 *   2. Dependencies are installed AND match package-lock.json — a fresh clone installs itself, and so does a
 *      clone that has just pulled a commit which changed the lockfile. That second case is the one that used
 *      to break for people: `npm run dev` after a `git pull` failed with a missing module.
 *   3. The database and its demo data (scripts/ensure-db.ts, which needs tsx and so runs after step 2).
 *
 * Every step is a no-op when it has already been done, so this costs nothing on the hundredth `npm run dev`.
 */

const QUIET = process.argv.includes('--quiet')
const log = (m) => { if (!QUIET) console.log(m) }
const die = (lines) => { console.error(`\n${lines.join('\n')}\n`); process.exit(1) }
const WIN = process.platform === 'win32'

/* ── 1. Node ──────────────────────────────────────────────────────────────────────────────────────────── */
const NEED = [20, 9]
const [major, minor] = process.versions.node.split('.').map(Number)
if (major < NEED[0] || (major === NEED[0] && minor < NEED[1])) {
  die([
    `This app needs Node ${NEED.join('.')} or newer. You are on ${process.versions.node}.`,
    '',
    '  With nvm:      nvm install    (.nvmrc in this repo pins the version)',
    '  Otherwise:     https://nodejs.org — take the LTS build, then reopen your terminal',
  ])
}

/* ── 2. Dependencies ──────────────────────────────────────────────────────────────────────────────────────
   npm stamps node_modules/.package-lock.json on every install. Missing, older than package-lock.json, or
   with the app's own entry point absent = install. `npm ci` would be the strict choice, but it deletes
   node_modules first and takes far longer, and this runs on every dev start. */
const installed = 'node_modules/.package-lock.json'
const mtime = (p) => (existsSync(p) ? statSync(p).mtimeMs : 0)
const reason =
  !existsSync('node_modules') ? 'no node_modules yet'
  : !existsSync('node_modules/next') ? 'node_modules looks incomplete'
  : mtime('package-lock.json') > mtime(installed) ? 'package-lock.json changed since the last install'
  : null

if (reason) {
  log(`· ${reason} — running npm install (this one takes a minute)`)
  const r = spawnSync(WIN ? 'npm.cmd' : 'npm', ['install'], { stdio: QUIET ? 'ignore' : 'inherit' })
  if (r.status !== 0) {
    die([
      'npm install failed.',
      '',
      'Try once more with a clean slate:',
      '  rm -rf node_modules package-lock.json && npm install',
      'If it still fails, send whatever npm printed above to Vicky.',
    ])
  }
}

/* ── 3. Database + demo data ──────────────────────────────────────────────────────────────────────────── */
const tsx = path.join('node_modules', '.bin', WIN ? 'tsx.cmd' : 'tsx')
const db = spawnSync(tsx, ['scripts/ensure-db.ts', ...(QUIET ? ['--quiet'] : [])], { stdio: QUIET ? 'ignore' : 'inherit' })
if (db.status !== 0) {
  die([
    'Could not prepare the demo database.',
    '',
    'Start it over — this only throws away local demo edits, never your code:',
    '  npm run db:reset',
  ])
}
