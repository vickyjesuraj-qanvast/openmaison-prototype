// The full regression's runner (2026-10-06, kept in the repo 2026-10-07 after the scratch copy was lost twice).
// Usage, from the repo, after one `DATABASE_URL=file:<scratch>/build.db npx next build`:
//   RUN_DIR=<a scratch folder> node design-source/verify/regression/prepare.cjs        (copies local.db → base.db · empty.db · noleads.db)
//   RUN_DIR=<same> node design-source/verify/regression/run.cjs <port> <id> [id…]      (ids in probes.cjs; two lanes on two ports is plenty)
//   RUN_DIR=<same> node design-source/verify/regression/tally.cjs                       (n/n per probe from each lane's log)
// Each probe runs on its own fresh copy of base.db with its own `next start -p <port>` (DATABASE_URL on the same command), as a patched
// scratch copy of the probe (port, scratch paths, the repo root). Never touches local.db, :3000 or :3001.
const fs = require('fs'), path = require('path'), { execSync, spawn } = require('child_process')
const R = process.env.RUN_DIR || (console.error('Set RUN_DIR to a scratch folder'), process.exit(2)), HERE = __dirname, REPO = path.resolve(__dirname, '../../..'), V = `${REPO}/design-source/verify`
const CFG = require(`${HERE}/probes.cjs`)
const port = process.argv[2], ids = process.argv.slice(3)
const BASE = `http://localhost:${port}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const killPort = () => { try { execSync(`lsof -ti tcp:${port} -sTCP:LISTEN | xargs kill 2>/dev/null`, { stdio: 'ignore' })   /* the listening server only — never this runner's own connection to it */ } catch {} }
async function up() {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(`${BASE}/leads`); if (r.status < 500) return true } catch {} await sleep(1000) }
  return false
}
;(async () => {
  for (const id of ids) {
    const c = CFG[id]; if (!c) { console.log('no config', id); continue }
    const L = `${R}/lanes/${id}`
    fs.rmSync(L, { recursive: true, force: true }); fs.mkdirSync(`${L}/shots`, { recursive: true })
    const db = `${L}/test.db`
    fs.copyFileSync(`${R}/${c.db || 'base.db'}`, db)
    if (c.prep) execSync(`sqlite3 "${db}" < "${HERE}/${c.prep}"`)
    const src = `${V}/${c.file}`
    // side files (inputs) next to the probe
    for (const f of fs.readdirSync(path.dirname(src))) if (!/\.(cjs|png|jpg|gif|webm)$/.test(f) && fs.statSync(`${path.dirname(src)}/${f}`).isFile()) fs.copyFileSync(`${path.dirname(src)}/${f}`, `${L}/${f}`)
    let code = fs.readFileSync(src, 'utf8')
    code = code.replace(/localhost:30\d\d/g, `localhost:${port}`)
      .replace(/'\/private\/tmp\/claude-501\/[^']*'/g, `'${L}'`)
      .replace(/path\.(resolve|join)\(__dirname, '\.\.\/\.\.\/\.\.\/\.\.(\/)?/g, (_m, fn, sl) => `path.${fn}('${REPO}${sl || ''}`)
    // three levels up from design-source/verify/<dir>/ is the repo — a probe copied into its lane can't climb there (tpl-parity, qe-r5)
    if (path.relative(V, path.dirname(src)).split(path.sep).length === 1) code = code.replace(/__dirname, '\.\.\/\.\.\/\.\.(\/|')/g, (_m, end) => end === '/' ? `'${REPO}/` : `'${REPO}'`)
    // every sqlite3 call waits for a lock instead of failing on the server's write ("database is locked" between a probe and its server)
    code = code.replace(/sqlite3 (-json )?(?!-cmd)/g, (_m, json) => `sqlite3 ${json || ''}-cmd ".timeout 30000" `)
    if (c.patch) code = c.patch(code)
    fs.writeFileSync(`${L}/probe.cjs`, code)
    killPort(); await sleep(800)
    const srv = spawn('zsh', ['-c', `DATABASE_URL=file:${db} exec npx next start -p ${port}`], { cwd: REPO, detached: true, stdio: ['ignore', fs.openSync(`${L}/server.log`, 'w'), fs.openSync(`${L}/server.log`, 'a')] })
    srv.unref()
    if (!(await up())) { fs.appendFileSync(`${R}/summary.txt`, `${id}\tSERVER DID NOT START\n`); killPort(); continue }
    const env = { ...process.env, NODE_PATH: `${REPO}/node_modules`, S: L, TESTDB: db, DB: db, B: BASE, BASE, OUT: `${L}/shots`, SHOTS: `${L}/shots`, ...(c.env || {}) }
    const args = (c.args || []).map((a) => a.replace('$L', L).replace('$DB', db).replace('$BASE', BASE))
    const t0 = Date.now(); let exit = 0
    try { execSync(`node "${L}/probe.cjs" ${args.map((a) => JSON.stringify(a)).join(' ')} > "${L}/probe.log" 2>&1`, { env, cwd: REPO, timeout: (c.timeout || 900) * 1000 }) } catch (e) { exit = e.status ?? 'timeout' }
    killPort(); await sleep(800)
    const log = fs.readFileSync(`${L}/probe.log`, 'utf8')
    const pass = (log.match(/^\s*(ok\b|✓|PASS\b)/gm) || []).length, fail = (log.match(/^\s*(FAIL\b|✗)/gm) || []).length
    fs.appendFileSync(`${R}/summary.txt`, `${id}\t${pass} ok\t${fail} fail\texit ${exit}\t${Math.round((Date.now() - t0) / 1000)}s\n`)
  }
})()
