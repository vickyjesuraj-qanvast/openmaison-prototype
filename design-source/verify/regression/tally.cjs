// n/n per probe from each lane's latest log
const fs = require('fs'), R = process.env.RUN_DIR || (console.error('Set RUN_DIR'), process.exit(2)), P = require('./probes.cjs')
const rows = []
for (const id of Object.keys(P)) {
  const f = `${R}/lanes/${id}/probe.log`
  if (!fs.existsSync(f)) { rows.push([id, 'not run']); continue }
  const log = fs.readFileSync(f, 'utf8')
  const pass = (log.match(/^\s*(ok\b|✓|PASS\b)/gm) || []).length, fail = (log.match(/^\s*(FAIL\b|✗)/gm) || []).length
  const tail = (log.trim().split('\n').reverse().find((l) => /pass|PASS|fail/i.test(l)) || '').trim()
  const crashed = /Error|Timeout/.test(log.split('\n').slice(-12).join('\n')) && !/passed|PASS/.test(log.split('\n').slice(-3).join('\n'))
  rows.push([id, `${pass}/${pass + fail}`, fail ? 'FAIL' : crashed ? 'CRASH?' : 'green', tail.slice(0, 60)])
}
for (const r of rows) console.log(r.join('\t'))
