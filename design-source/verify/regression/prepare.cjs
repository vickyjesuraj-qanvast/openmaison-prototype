// RUN_DIR=<scratch> node design-source/verify/regression/prepare.cjs — the three starting databases, all copies of local.db:
// base.db (the demo as it is), empty.db (empty.sql: the libraries and one lead's records cleared), noleads.db (no leads at all).
const { execSync } = require('child_process'), fs = require('fs'), path = require('path')
const R = process.env.RUN_DIR; if (!R) { console.error('Set RUN_DIR to a scratch folder'); process.exit(2) }
const REPO = path.resolve(__dirname, '../../..')
fs.mkdirSync(`${R}/lanes`, { recursive: true })
fs.copyFileSync(`${REPO}/local.db`, `${R}/base.db`)
fs.copyFileSync(`${R}/base.db`, `${R}/empty.db`); execSync(`sqlite3 "${R}/empty.db" < "${__dirname}/empty.sql"`)
fs.copyFileSync(`${R}/base.db`, `${R}/noleads.db`); execSync(`sqlite3 "${R}/noleads.db" "DELETE FROM leads"`)
console.log('base.db · empty.db · noleads.db ready in', R)
