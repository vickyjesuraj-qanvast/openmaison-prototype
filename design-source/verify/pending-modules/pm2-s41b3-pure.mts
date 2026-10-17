/*
 * (pending modules S41b-3) The rules of "Try the tools without an account", proved in one Node process — the half verify-pm2-s41b3.cjs can't
 * show through a browser: the switch, the workspace's signed name, what the server keeps of a visitor's input, the workspace store (made only
 * by a workspace, a compare-and-set write, 1.0's one-update token spend under a race, expiry, the sweep's list, reclaim), the per-address
 * counts over their own windows. Run by the probe with a scratch DATABASE_URL (the store's file goes beside it and is removed after):
 *   DATABASE_URL=file:<scratch> npx tsx --conditions=react-server design-source/verify/pending-modules/pm2-s41b3-pure.mts
 * Prints one JSON line per check ({ ok, label }) and a last line { done, pass, fail }; exits 1 on any failure. Refuses local.db.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, rmSync } from 'node:fs'

const url = process.env.DATABASE_URL ?? ''
if (!url.startsWith('file:') || /(^|\/)local\.db$/.test(url.slice(5))) { console.log(JSON.stringify({ ok: false, label: 'refuses to run without a scratch DATABASE_URL (never local.db)' })); process.exit(1) }

let pass = 0, fail = 0
const ok = (cond: unknown, label: string, extra?: unknown) => { if (cond) pass++; else fail++; console.log(JSON.stringify({ ok: !!cond, label, ...(cond ? {} : { extra }) })) }
const step = async (label: string, fn: () => Promise<void>) => { try { await fn() } catch (e) { ok(false, `${label} — threw`, e instanceof Error ? e.stack?.split('\n').slice(0, 4).join(' | ') : String(e)) } }

const policy = await import('@/lib/trial/policy')
const clean = await import('@/lib/trial/clean')
const server = await import('@/lib/trial/server')
const store = await import('@/lib/trial/store')
const { takeTry } = await import('@/lib/auth/limit')
const { validateLeadForm } = await import('@/lib/leads/lead-input')
const { hasErrors } = await import('@/lib/forms')

/* ── the switch (1.0's line: off in a real build until set; this prototype's demo shows the tools) ── */
await step('switch', async () => {
  ok(policy.toolsTrialEnabled({ TRIAL_TOOLS_ENABLED: 'false', NODE_ENV: 'production' }) === false && policy.toolsTrialEnabled({ TRIAL_TOOLS_ENABLED: '0' }) === false, 'TRIAL_TOOLS_ENABLED=false (or 0) closes the tools')
  ok(policy.toolsTrialEnabled({ TRIAL_TOOLS_ENABLED: 'true', NODE_ENV: 'production' }) === true, '…true opens them in any build')
  ok(policy.toolsTrialEnabled({ NODE_ENV: 'production' }) === policy.TOOLS_IN_DEMO, 'unset, a production build follows the prototype’s demo flag (TOOLS_IN_DEMO — a real build sets it false)')
})

/* ── the workspace's signed name (1.0's om_anon_v1: base64url({ id }).hmac-hex) ── */
await step('cookie', async () => {
  const id = randomUUID(), key = 'probe-key'
  const v = server.signWorkspaceId(id, key)
  ok(server.readWorkspaceId(v, key) === id, 'a signed name reads back as its workspace')
  ok(server.readWorkspaceId(v, 'another-key') === null, '…never under another key')
  const [body, mac] = v.split('.')
  const forged = `${Buffer.from(JSON.stringify({ id: randomUUID() })).toString('base64url')}.${mac}`
  ok(server.readWorkspaceId(forged, key) === null, 'a body changed by hand names nothing')
  ok(server.readWorkspaceId(`${body}.zz`, key) === null && server.readWorkspaceId('nonsense', key) === null && server.readWorkspaceId('', key) === null && server.readWorkspaceId(null, key) === null, 'a cut, empty or garbled cookie names nothing (never throws)')
  ok(server.readWorkspaceId(server.signWorkspaceId('not-a-uuid', key), key) === null, 'a signed value that is not a workspace id names nothing')
})

/* ── what the server keeps of a visitor's input (1.0's text(v, max) caps) ── */
await step('clean', async () => {
  const lead = clean.cleanLeadData({ name: `  ${'A'.repeat(500)}\u0007`, phone: '9123 4567', source: 'Somewhere made up', propertyType: 'HDB', notes: 'x'.repeat(9000), areaSize: '12a3', areaUnit: 'acres', budget: '70,000', extra: 'dropped' })
  ok(lead.name.length === 120 && !/\u0007/.test(lead.name), 'a lead’s name is cut to the form’s 120, control characters out')
  ok(lead.source === '' && lead.notes.length === 2000 && lead.areaSize === '123' && lead.areaUnit === 'sq ft' && !('extra' in lead), 'a pick outside the form’s list is dropped, notes cut to 2,000, digits only, the unit one of two, nothing extra kept')
  ok(!hasErrors(validateLeadForm({ ...clean.cleanLeadData({ name: 'Farah Ahmad', phone: '91234567' }), assignees: [] })) && hasErrors(validateLeadForm({ ...clean.cleanLeadData({ name: '', phone: '123' }), assignees: [] })), 'the trial checks a lead with the studio’s own form rules (name, a Singapore mobile)')
  const line = (i: number) => ({ name: `Line ${i}`, qty: 1, costMinor: 1000 })
  ok(clean.cleanGroups([{ name: 'Carpentry', lines: Array.from({ length: 501 }, (_, i) => line(i)) }]) === null, 'more than 500 lines is not one quote — refused')
  ok(clean.cleanGroups(Array.from({ length: 61 }, (_, i) => ({ name: `G${i}`, lines: [line(i)] }))) === null && clean.cleanGroups([]) === null && clean.cleanGroups('x') === null, 'more than 60 sections, none, or not a list — refused')
  const g = clean.cleanGroups([{ name: 'Masonry', lines: [{ name: '  Tiles ', qty: -2, costMinor: -5, markupMinor: Infinity, discountPct: 150, unit: 'sqft' }, { name: '' }] }])
  ok(!!g && g.length === 1 && g[0]!.lines.length === 1 && g[0]!.lines[0]!.qty === undefined && g[0]!.lines[0]!.costMinor === undefined && g[0]!.lines[0]!.markupMinor === undefined && g[0]!.lines[0]!.discountPct === undefined && g[0]!.lines[0]!.name === 'Tiles', 'a negative, endless or impossible number is dropped, a nameless line left out')
  ok(policy.workOf({ leads: { leads: Array.from({ length: 9 }, (_, i) => ({ id: String(i), at: 0, data: clean.cleanLeadData({ name: `L${i}`, phone: '91234567' }) })) } }).leads.length === policy.LEAD_LIMIT, 'a workspace reads at most the lead limit (a payload is data — never more than the cap)')
})

/* ── the store: 1.0's anon_workspaces, beside the scratch database ── */
await step('store', async () => {
  const s = store.trialStore()
  const file = store.trialStoreFile()!
  ok(!!file && file.endsWith('.trial.db') && s.ready(), `the stand-in keeps workspaces in a file beside the database (${file?.split('/').pop()})`)
  const fresh = !existsSync(file)
  if (fresh) {
    ok((await s.count(Date.now())) === 0 && (await s.expired(Date.now(), 10)).length === 0 && (await s.reclaim()).reclaimed === 0 && !existsSync(file), 'reading, sweeping or reclaiming a store nobody saved in yet makes no file')
  }
  const now = Date.now(), id = randomUUID()
  ok(await s.create(id, now, now + policy.WORKSPACE_MS) && existsSync(file), 'a workspace’s making makes the file')
  const row = await s.get(id, now)
  ok(!!row && row.spentTokens === 0 && JSON.stringify(row.payload) === '{}' && row.expiresAt - row.createdAt === 7 * 86_400_000, 'a new workspace: nothing in it, nothing spent, seven days to live (1.0’s)')
  ok(await s.write(id, row!.raw, { leads: { leads: [] } }, now) && !(await s.write(id, row!.raw, { leads: { leads: [] } }, now)), 'a write lands only on what it read (compare-and-set) — a second write from the same read is refused')
  const wins = (await Promise.all(Array.from({ length: 10 }, () => s.spend(id, 10, policy.GRANT, now)))).filter((r) => r.ok).length
  const after = await s.get(id, now)
  ok(wins === 5 && after!.spentTokens === 50, `1.0’s spend is one conditional update: ten at once against a grant of 50 — exactly five land (${wins}, ${after!.spentTokens} spent)`)
  const over = await s.spend(id, 5, policy.GRANT, now)
  ok(!over.ok && over.reason === 'quota', 'past the grant a spend is refused as the allowance (never written)')
  await s.refund(id, 10)
  ok((await s.get(id, now))!.spentTokens === 40, 'a refund gives back what the work didn’t use')
  const old = randomUUID()
  await s.create(old, now - 8 * 86_400_000, now - 86_400_000)
  ok((await s.get(old, now)) === null, 'a workspace past its seven days is gone the moment it expires, swept or not (1.0’s rule)')
  const gone = await s.spend(old, 5, policy.GRANT, now)
  ok(!gone.ok && gone.reason === 'gone', '…and nothing can be spent from it')
  const listed = await s.expired(now, 300)
  ok(listed.includes(old) && !listed.includes(id), 'the sweep lists the expired workspace and never a live one')
  await s.remove(old)
  ok((await s.expired(now, 300)).length === 0 && (await s.count(now)) >= 1, 'deleted, it is listed no more (a second sweep finds nothing)')
  const r = await s.reclaim()
  ok(r.reclaimed >= 0 && (await s.reclaim()).reclaimed === 0, 'reclaim gives the room back once — a second run has nothing to give')
  ok((await s.clear()) >= 1 && (await s.count(now)) === 0, 'Reset clears every workspace')
  ok(store.trialStoreIsStandIn(), 'the store is the prototype’s stand-in until the developers set theirs (setTrialStore)')
  if (fresh) for (const f of [file, `${file}-wal`, `${file}-shm`, `${file}-journal`]) rmSync(f, { force: true })
})

/* ── the per-address counts, each over its own window ── */
await step('limits', async () => {
  const k = `probe-${randomUUID()}`, t0 = 1_800_000_000_000
  let n = 0
  for (let i = 0; i < 26; i++) if (takeTry(k, t0 + i * 1000, policy.WORKSPACES_PER_DAY, 86_400_000)) n++
  ok(n === 25, `25 new workspaces a day from one address, the 26th refused (${n})`)
  ok(takeTry(k, t0 + 86_400_000 + 30_000, policy.WORKSPACES_PER_DAY, 86_400_000), '…a day later the address may start one again')
  const m = `probe-${randomUUID()}`
  let r = 0
  for (let i = 0; i < 6; i++) if (takeTry(m, t0 + i, policy.READS_PER_MINUTE, 60_000)) r++
  ok(r === 5 && takeTry(m, t0 + 61_000, policy.READS_PER_MINUTE, 60_000), 'five reads a minute from one address, the sixth refused, the next minute free again')
})

console.log(JSON.stringify({ done: true, pass, fail }))
process.exit(fail ? 1 : 0)
