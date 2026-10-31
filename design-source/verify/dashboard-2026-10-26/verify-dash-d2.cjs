// The Dashboard redesigned (2026-10-26), lane D2 — **Needs you, one ranked inbox** (his marks P-04 · P-05 · Q-05 · Q-11 and his note "the CTAs
// are too much to the eyes because of primary color"). Each item asserted as the rule it builds, never another round's count, by real presses:
//  1 · one inbox: every project's Needs you rows (each project's count = its Overview's own), Your OK first, the chips (only with rows, each its
//      own count), the signals (a quote opened ≥ 2 times · its price ending or ended · a change asked · a contract out 3+ days · a new lead with
//      no contact past the studio's delay · AI credits low), every door with ?from=/dashboard, no filled primary background on the page at rest
//      (his note), the verbs quiet (the house Row's text button since 2026-10-27), a row's ⋮ (Open · Not today · Ask about this; no "…"; a late row says why it can't wait)
//  2 · the verbs in place, each through its module's own action, its sentence and its Undo: approve a claim (Undo), confirm a payment (Undo),
//      agree more time (Undo), publish a site update from the Review pane (the pane's one filled button; it moves on to the next row), Remind on
//      WhatsApp (the draft opens on the press with the record's own link; the Dashboard's note; Undo), Call a lead (back on the page, Log the
//      call opens the house log sheet — the after-call piece Your day shares)
//  3 · Not today: the row rests until tomorrow (dashboard_snoozes, the studio's next day), "n set aside for today · Show", Bring back; Undo
//  4 · the ring reads the records: what this member cleared from Needs you today, never a browser counter (cleared goes up with a real
//      approval and comes back down with its Undo); the member's own tasks are Your day's ring
//  5 · the keys: J walks the rows, R opens the Review pane, J / K step it, ↵ presses the row's own verb (a door)
//  6 · You're all caught up (Q-11) for a member nothing waits on — the ring full
//  7 · by role and scope: Mine keeps approvals and the member's own; a Designer's rows are their projects'; Accounting has no project or lead
//      rows; Marketing the lead desk; the Tasks page's "n approvals wait" = the Your OK chip
//  8 · a Since chip's door: the reveal event opens the list and pulses the row (`data-fresh`)
//  9 · every width: 1440 · 1280 · 1024 sideways touch · 768 upright touch · 390 · 320 · 844×390 — no sideways scroll, 44 targets on touch, a
//      phone's row keeps its own verb alone (the second in ⋮), the Review pane a sheet on a phone
// (the calm pass 2026-10-26, a deliberate change — his "too busy … simplify" and the Claude Design option, lane C2) Needs you as the option
// draws it, restated here: the tabs All · Approve n · Clients n · Late n (the Money / New leads chips and the "Your OK" name gone), five rows
// at a desk of ONE title line + ONE short caption (≤ 60 characters, where · who · when) + the amount + ONE verb (the house Row's text button since 2026-10-27), the second verb in
// the row's ⋮ (shown on the row's hover / focus at a desk, always on touch), "Show all n" a text link, no cleared ring (the records' count
// rides on the card as data-cleared), no rule between rows — and 10 · the busy measure of the card at rest at 1440.
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally` (a table
// snapshot by primary key: rows added are removed, rows taken are put back, rows changed are set back).
// Usage: BASE=http://localhost:3222 NODE_PATH=<repo>/node_modules node verify-dash-d2.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /(^|\/)local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const REPO = process.cwd()
void REPO
const dir = dirArg || path.join(__dirname, 'd2')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3222'
const esc = (q) => q.replace(/["$`\\]/g, (c) => `\\${c}`)
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -json -cmd ".timeout 30000" "${DB}" "${esc(q)}"`, { maxBuffer: 1 << 28 }).toString().trim(); return out ? JSON.parse(out) : [] }
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
/* many statements through a file — no shell quoting in the way of a value (a note with quotes, a body with lines) */
const os = require('os')
const sqlMany = (stmts) => {
  if (!stmts.length) return
  const f = path.join(os.tmpdir(), `d2-putback-${process.pid}.sql`)
  fs.writeFileSync(f, `.timeout 30000\nBEGIN;\n${stmts.join(';\n')};\nCOMMIT;\n`)
  try { execSync(`sqlite3 "${DB}" < "${f}"`) } finally { fs.rmSync(f, { force: true }) }
}

/* ── put back: a table's rows by its primary key — what was added goes, what was taken comes back, what changed is set back ── */
function keep(table) {
  const pk0 = json(`select name from pragma_table_info('${table}') where pk > 0 order by pk`).map((r) => r.name)
  const rows = json(`select * from ${table}`)
  /* a table with no primary key (dashboard_snoozes: a unique index) is keyed by every column */
  const pk = pk0.length ? pk0 : json(`select name from pragma_table_info('${table}')`).map((r) => r.name)
  const keyOf = (r) => JSON.stringify(pk.map((k) => r[k]))
  const was = new Map(rows.map((r) => [keyOf(r), r]))
  return () => {
    const now = json(`select * from ${table}`)
    const nowMap = new Map(now.map((r) => [keyOf(r), r]))
    const where = (r) => pk.map((k) => `${k} = ${lit(r[k])}`).join(' and ')
    const out = []
    for (const [k, r] of nowMap) if (!was.has(k)) out.push(`delete from ${table} where ${where(r)}`)
    for (const [k, r] of was) {
      const cur = nowMap.get(k)
      const cols = Object.keys(r)
      if (!cur) out.push(`insert into ${table} (${cols.join(', ')}) values (${cols.map((c) => lit(r[c])).join(', ')})`)
      else if (JSON.stringify(cur) !== JSON.stringify(r)) out.push(`update ${table} set ${cols.filter((c) => !pk.includes(c)).map((c) => `${c} = ${lit(r[c])}`).join(', ')} where ${where(r)}`)
    }
    try { sqlMany(out) } catch (e) { throw new Error(`${table}: ${String(e).slice(0, 200)}`) }
  }
}
const KEPT = ['project_updates', 'project_update_files', 'expenses', 'project_payments', 'project_milestone_extensions', 'project_milestones', 'lead_events', 'notifications',
  'notification_outbox', 'quotes', 'contracts', 'lead_files', 'lead_file_images', 'lead_file_thumbs', 'credit_requests', 'studio_credit_balances', 'dashboard_snoozes', 'leads', 'lead_notes', 'stage_logs', 'lead_tasks',
  'price_book_items', 'price_book_changes']

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (w = 1440, h = 1024) => b.newContext({ viewport: { width: w, height: h } })
  const touch = (w = 390, h = 844) => b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
  /* WhatsApp opens in a new window on the press (REG-534): each opened address is kept instead of a window */
  const stubOpen = (ctx) => ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name, full = false) => p.screenshot({ path: path.join(dir, `${name}.png`), fullPage: full })
  const snack = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  /* (the calm UI build 2026-10-27, a deliberate change) "See all n" opens the whole list in the house Drawer (`needs-all`) instead of growing the card: while it is open the rows are read
     there — the drawer comes after the card in the page, so the last of the two is where the rows are */
  const card = (p) => p.locator('section[data-card="needs"], [data-testid="needs-all"]').last()
  const rows = (p) => card(p).locator('[data-inbox-row]')
  const keys = (p) => rows(p).evaluateAll((els) => els.map((e) => e.getAttribute('data-inbox-row')))
  const rowOf = (p, prefix) => card(p).locator(`[data-inbox-row^="${prefix}"]`).first()
  /* (the calm pass 2026-10-26, a deliberate change) "Show all n" (was "Show n more") — (the calm UI build 2026-10-27, a deliberate change) "See all n", opening the drawer */
  const expand = async (p) => { const m = p.locator('section[data-card="needs"] [data-testid="needs-more"]'); if (await m.count() && /See all \d+/.test(await m.innerText())) { await m.click(); await settle(p, 600) } }
  /* (the calm pass 2026-10-26, a deliberate change) the cleared ring is gone (his correction 4); what the records say this member cleared
     today still rides on the card (`data-cleared`) — the same record the ring read, checked the same way */
  const ring = async (p) => { const r = p.locator('div[data-card="needs"][data-cleared]').first(); return (await r.count()) ? { cleared: Number(await r.getAttribute('data-cleared')) } : null }
  /* the count re-reads the records once the page reads itself again — wait for it, up to 6 s */
  const ringAt = async (p, n) => { for (let i = 0; i < 30; i++) { const r = await ring(p); if (r && r.cleared === n) return r; await settle(p, 200) } return ring(p) }
  const undoLast = (p) => p.locator('[data-om-snackbar]').getByRole('button', { name: 'Undo' }).last().click()
  const menuOf = async (p, row) => { await row.hover().catch(() => {}); await row.locator('[data-testid="need-more"]').click(); await settle(p, 300) }
  const item = (p, name) => p.getByRole('menuitem', { name, exact: true })
  /* (the calm pass 2026-10-26, a deliberate change) a row keeps ONE verb — Review, when it is the second, sits in the row's ⋮ (R still reviews) */
  const reviewOf = async (p, row) => {
    const own = row.locator('[data-row-actions] [data-testid="need-review"]')
    if (await own.count()) { await own.click(); return }
    await menuOf(p, row); await item(p, /^Review/).click()
  }

  const restore = KEPT.map(keep)
  const you0 = sql(`select id from members where is_you = 1`)
  const stamp = { updates: json(`select id, status from project_updates where status = 'in_review'`) }
  void stamp

  try {
    as('dane')
    const ctx = await desk(); await stubOpen(ctx); const p = await ctx.newPage(); watch(p, '1440')
    await go(p, '/dashboard', 1800)

    console.log('1 · one inbox')
    await expand(p)
    const all = await keys(p)
    ok(all.length > 0, `Needs you lists what waits (${all.length} rows)`)
    /* every project's rows: each project's row count = its own Overview's Needs you count */
    const projects = json(`select p.id, p.name from projects p join leads l on l.id = p.lead_id where p.deleted_at is null and p.stage <> 'completed' order by p.number`)
    /* (the calm UI build 2026-10-27, a deliberate change) a project's standing to-dos (its set-up, its start, a schedule to share, its compliance …) fold into ONE row for the project
       (`project:<id>:to-do`, its ⋮ holding each): its rows are the ones of its own plus the ones its roll-up stands for */
    const folded = await rows(p).evaluateAll((els) => els.flatMap((e) => (e.getAttribute('data-folded-keys') ?? '').split(' ').filter(Boolean)))
    for (const pj of projects) {
      const here = all.filter((k) => k.startsWith(`project:${pj.id}:`) && k !== `project:${pj.id}:to-do`).length + folded.filter((k) => k.startsWith(`project:${pj.id}:`)).length
      const q = await ctx.newPage(); watch(q, 'overview')
      await go(q, `/projects/${pj.id}`, 1500)
      /* the Overview card's head count ("· 7") — its own meta, never the head's right-hand words */
      const meta = await q.locator('section[data-card="needs"]').first().evaluate((el) => {
        const m = Array.from(el.querySelectorAll('span')).find((s) => Array.from(s.classList).some((c) => /__meta$/.test(c)))
        return m?.textContent ?? ''
      }).catch(() => '')
      const theirs = Number((meta.match(/\d+/) ?? ['0'])[0])
      ok(here === theirs, `${pj.name}: every one of its Needs you rows is here (${here} = its Overview's ${theirs})`)
      await q.close()
    }
    /* Your OK first */
    const okFlags = await rows(p).evaluateAll((els) => els.map((e) => e.hasAttribute('data-ok')))
    const firstNotOk = okFlags.indexOf(false)
    ok(firstNotOk < 0 || okFlags.slice(firstNotOk).every((f) => !f), 'Your OK first — no approval below the rest')
    /* the chips: only those with rows, each its own count */
    /* (the calm pass 2026-10-26, a deliberate change) the option's text tabs: All · Approve n · Clients n · Late n — only those with rows */
    const chips = (await card(p).locator('[data-testid="needs-chips"] [role="radio"]').allInnerTexts()).map((c) => c.trim())
    ok(chips.length >= 2 && chips[0] === 'All', `the tabs lead with All (${chips.join(' / ')})`)
    ok(chips.slice(1).every((c) => /^(Approvals|Clients waiting|Overdue) [1-9]\d*$/.test(c)), 'the other tabs are Approvals · Clients waiting · Overdue, each with rows under it')   // (the calm UI build 2026-10-27, a deliberate change) one vocabulary (T-01)   // (2026-10-27, a deliberate change) Finance › To do's word
    ok(await card(p).locator('[data-testid="needs-chips"] [role="radio"][aria-checked="true"]').evaluate((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').catch(() => false)
      && await card(p).locator('[data-testid="needs-chips"] [role="radio"][aria-checked="false"]').first().evaluate((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)' && getComputedStyle(e).borderTopColor === 'rgba(0, 0, 0, 0)').catch(() => false), 'the selected tab is the tinted pill, the others plain words')
    for (const c of chips.slice(1)) {
      const n = Number(c.split(' ').pop())
      await card(p).getByRole('radio', { name: c }).click(); await settle(p, 300)
      await expand(p)
      ok((await rows(p).count()) === n, `${c.split(' ')[0]} lists its own ${n}`)
    }
    await card(p).getByRole('radio', { name: chips[0] }).click(); await settle(p, 300); await expand(p)
    /* (the calm pass 2026-10-26, a deliberate change) the head's ✦ Ask and ⋮ are lane C3's CardFrame (on hover / focus) — its probe asserts them */
    /* the signals */
    const opened = json(`select q.id, q.number from quotes q join leads l on l.id = q.lead_id where q.client_view_count >= 2 and q.status in ('Sent to Client', 'Approved') and q.deleted_at is null and q.archived_at is null and l.deleted_at is null`)
    for (const q of opened) {
      const r = card(p).locator(`[data-inbox-row="quote-wait:${q.id}"]`)
      ok(await r.count() === 1 && /opened/.test(await r.innerText()) && (await r.innerText()).includes(q.number), `${q.number}, opened ${'≥'} 2 times and unanswered, is a row that says so`)
    }
    const ended = json(`select q.id, q.number from quotes q join leads l on l.id = q.lead_id where q.status in ('Sent to Client') and q.valid_until < strftime('%s','now') and q.deleted_at is null and q.archived_at is null and l.deleted_at is null and q.kind = 'quote'`)
    for (const q of ended) ok(/expired on/.test(await card(p).locator(`[data-inbox-row="quote-wait:${q.id}"]`).innerText().catch(() => '')), `${q.number}'s price ended while the client has it — its row says so ("…’s quote expired on …")`)   // (the calm UI build 2026-10-27, a deliberate change)
    const untouched = json(`select id, name, phone from leads where stage = 'New' and deleted_at is null and direct = 0`)
    const leadRows = all.filter((k) => k.startsWith('lead-call:'))
    ok(leadRows.length > 0, `new leads with no contact are rows (${leadRows.length})`)
    for (const k of leadRows) {
      const id = k.slice('lead-call:'.length)
      const l = untouched.find((x) => x.id === id)
      ok(!!l, `${l?.name ?? id}: a New lead`)
      ok(json(`select 1 from lead_notes where lead_id = '${id}' and kind = 'contact'`).length === 0, `${l?.name ?? id}: no contact logged`)
    }
    /* every door with the way back */
    const hrefs = await card(p).locator('[data-inbox-row] a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    ok(hrefs.length > 0 && hrefs.every((h) => /[?&]from=%2Fdashboard/.test(h) || /^tel:|^https:/.test(h)), `every row's door carries ?from=/dashboard (${hrefs.length})`, hrefs.filter((h) => !/from=%2Fdashboard/.test(h)).slice(0, 3).join(' '))
    /* his note: no filled button on the page — no element with the primary as its background at rest */
    const loud = await p.evaluate(() => {
      const probe = document.createElement('span'); probe.style.color = 'var(--om-color-primary-default)'; document.body.appendChild(probe)
      const primary = getComputedStyle(probe).color; probe.remove()
      const out = []
      for (const el of document.querySelectorAll('[data-testid="dashboard"] *')) {
        if (el.closest('svg')) continue
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue
        if (getComputedStyle(el).backgroundColor === primary) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)}`)
      }
      return out
    })
    ok(loud.length === 0, 'no filled primary background on the page at rest (his note)', loud.slice(0, 4).join(' · '))
    const looks = await card(p).locator('[data-inbox-row] [data-row-actions] button').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))
    ok(looks.length > 0 && looks.every((c) => c === 'rgba(0, 0, 0, 0)' || c === 'transparent' || /255, 255, 255/.test(c)), `every verb is quiet — never filled (${looks.length})`)
    ok(await card(p).locator('[data-inbox-row]').evaluateAll((els) => els.every((e) => e.querySelectorAll('[data-row-actions] button').length === 1)), 'ONE verb on every row — the second in its ⋮ (the calm pass 2026-10-26, a deliberate change: was two at most)')
    /* (2026-10-27, a deliberate change — his "not happy with these buttons"; the 2.0 consistency call) the verb is the house Row's text
       button, as the project's Needs you and Finance › To do draw a row's verb: no stroke, no fill, the primary's words */
    ok(await card(p).locator('[data-inbox-row] [data-row-actions] button').evaluateAll((els) => els.every((e) => { const st = getComputedStyle(e); return st.borderTopWidth === '0px' && !/inset/.test(st.boxShadow) && st.color === 'rgb(85, 0, 255)' })), 'that verb is the house Row\'s text button — no stroke, the primary\'s words')
    /* the ⋮ */
    const first = rows(p).first()
    await menuOf(p, first)
    const menuWords = (await p.locator('[role="menu"]').innerText()).split('\n').map((s) => s.trim()).filter(Boolean)
    ok(menuWords.includes('Open') && menuWords.includes('Not today') && menuWords.includes('Ask Maison AI about this'), `a row's ⋮: ${menuWords.join(' · ')}`)   // (the calm UI build 2026-10-27, a deliberate change) one name for the one assistant
    ok(menuWords.every((w) => !w.endsWith('…')), 'no "…" in the ⋮ (one ⋮ grammar)')
    await p.keyboard.press('Escape'); await settle(p, 200)
    console.log('1b · the calm row (the calm pass 2026-10-26)')
    await go(p, '/dashboard', 1500)
    /* (the calm pass 2026-10-26, a deliberate change — at the landing with lane C3's frame) the count sits beside the title in the frame's own
       head (`needs-count`); `__meta` is now a row's amount */
    const total = Number((await card(p).getByTestId('needs-count').first().innerText().catch(() => '0')).replace(/[^0-9]/g, '') || 0)
    ok(await rows(p).count() === Math.min(5, total), `five rows at a desk before "See all" (${await rows(p).count()} of ${total})`)
    if (total > 5) {
      const more1 = card(p).locator('[data-testid="needs-more"]')
      ok((await more1.innerText()).trim() === `See all ${total}`, `"See all ${total}" — a text link (${(await more1.innerText()).trim()})`)   // (the calm UI build 2026-10-27, a deliberate change) it opens the drawer
      ok(await more1.evaluate((e) => getComputedStyle(e).borderTopWidth === '0px' && getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)'), 'the link has no box')
    }
    ok(await card(p).locator('[data-testid="needs-ring"], [data-testid="needs-caught-ring"]').count() === 0, 'no cleared ring (his correction 4 — the head’s count says it)')
    const lines = await rows(p).evaluateAll((els) => els.map((e) => {
      const t = e.querySelector('[class*="__title"]'), c = e.querySelector('[class*="__caption"]')
      const one = (x) => !x || (getComputedStyle(x).whiteSpace === 'nowrap' && x.getBoundingClientRect().height <= 22)
      return { key: e.getAttribute('data-inbox-row'), one: one(t) && one(c), cap: c ? c.innerText.trim() : '', rule: getComputedStyle(e, '::before').content }
    }))
    ok(lines.every((l) => l.one), 'ONE title line and ONE caption line on every row at a desk', lines.filter((l) => !l.one).map((l) => l.key).join(' '))
    ok(lines.every((l) => l.rule === 'none' || l.rule === 'normal'), 'no rule between rows (the option)')
    await expand(p)
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-01) the whole list is the house Drawer now, a narrow card: there the
       amount leads the caption (`__capAmount`, the list's own narrow rule) — the caption's words are read without it */
    const capRows = await rows(p).evaluateAll((els) => els.map((e) => { const c = e.querySelector('[class*="__caption"]'); if (!c) return { key: e.getAttribute('data-inbox-row'), cap: '' }; const x = c.cloneNode(true); x.querySelectorAll('[class*="__capAmount"]').forEach((n) => n.remove()); return { key: e.getAttribute('data-inbox-row'), cap: (x.textContent ?? '').trim() } }))
    const caps = capRows.map((r) => r.cap)
    ok(caps.every((c) => c.length <= 60), `every caption is one short line — ≤ 60 characters (longest ${Math.max(...caps.map((c) => c.length))})`, caps.filter((c) => c.length > 60).slice(0, 2).join(' | '))
    /* (the calm UI build 2026-10-27, a deliberate change — the audit's 1-01) a project's standing to-dos fold into one row whose title IS the
       project and whose caption says how many and the first ("3 things to do · Start the project") — still never the project's whole name in a
       caption; the rule below reads every other project row */
    const foldedRows = capRows.filter((r) => /^project:[^:]+:to-do$/.test(r.key))
    ok(foldedRows.every((r) => /^\d+ things to do · /.test(r.cap) && !/ — /.test(r.cap)), `a folded project row: "n things to do · the first", never the project's name in its caption (${foldedRows.length})`, foldedRows.map((r) => r.cap).slice(0, 2).join(' | '))
    const projCaps = capRows.filter((r) => r.key.startsWith('project:') && !/:to-do$/.test(r.key)).map((r) => r.cap)
    const names = new Set(json(`select l.name from projects p join leads l on l.id = p.lead_id where p.deleted_at is null`).map((r) => r.name))
    ok(projCaps.length > 0 && projCaps.every((c) => names.has(c.split(' · ')[0]) && !/ — /.test(c)), `a project row's caption starts with its client — never the project's whole name (${projCaps.length} rows)`, projCaps.filter((c) => !names.has(c.split(' · ')[0])).slice(0, 2).join(' | '))
    const tints = await rows(p).evaluateAll((els) => [...new Set(els.map((e) => getComputedStyle(e.querySelector('[class*="__glyph"]')).backgroundColor))])
    ok(tints.length <= 2, `the glyphs wear one quiet tint (red only for late and ours): ${tints.join(' · ')}`)
    await go(p, '/dashboard', 1500)
    /* the ⋮ waits for the row's hover or focus at a desk */
    const r0 = rows(p).first()
    await p.mouse.move(5, 5); await settle(p, 300)
    const opRest = await r0.locator('[data-testid="need-more"]').evaluate((e) => getComputedStyle(e.closest('[class*="__more"]')).opacity)
    await r0.hover(); await settle(p, 300)
    const opHover = await r0.locator('[data-testid="need-more"]').evaluate((e) => getComputedStyle(e.closest('[class*="__more"]')).opacity)
    ok(opRest === '0' && opHover === '1', `the row's ⋮ shows on its hover at a desk (${opRest} → ${opHover})`)
    await p.mouse.move(5, 5); await settle(p, 300)
    await r0.locator('a').first().focus(); await settle(p, 200)
    ok(await r0.locator('[data-testid="need-more"]').evaluate((e) => getComputedStyle(e.closest('[class*="__more"]')).opacity) === '1', '…and on its focus (the keyboard reaches it)')
    /* the second verb leads the ⋮ — Review, with its key */
    const two = rows(p).filter({ has: p.locator('[data-kb="list.review"]:not([data-row-actions] *)') }).first()
    if (await two.count()) {
      await menuOf(p, two)
      const first = (await p.locator('[role="menu"] [role="menuitem"]').first().innerText()).replace(/\s+/g, ' ').trim()
      ok(/^Review\b/.test(first) && /R$/.test(first), `the ⋮ leads with the row's second verb, its key beside it ("${first}")`)
      await p.keyboard.press('Escape'); await settle(p, 200)
    }
    const late = card(p).locator('[data-inbox-row][data-tone-row="late"]').first()
    if (await late.count()) {
      await menuOf(p, late)
      const nt = item(p, /^Not today/)
      ok(await nt.count() === 1 && (await nt.getAttribute('aria-disabled')) === 'true', 'a late row of ours can’t be set aside — said in the row of the ⋮')
      ok(/can’t wait/.test(await p.locator('[role="menu"]').innerText()), 'its reason is the menu row’s help line')
      await p.keyboard.press('Escape'); await settle(p, 200)
    }
    await shot(p, 'd2-1440-rest')

    console.log('2 · the verbs in place, with Undo')
    const ring0 = await ring(p)
    /* a claim approved in the row → Undo */
    const claim = card(p).locator('[data-inbox-row*=":money:expense-approve:"]').first()
    if (await claim.count()) {
      const key = await claim.getAttribute('data-inbox-row')
      const id = key.split(':').pop()
      await claim.locator('[data-testid="need-approve"]').click(); await settle(p, 1600)
      ok(json(`select status from expenses where id = '${id}'`)[0]?.status !== 'pending', 'Approve answers the claim through Money’s own action')
      ok(/Expense approved/.test(await snack(p)), 'its sentence: “Expense approved”, with Undo')
      ok(await card(p).locator(`[data-inbox-row="${key}"]`).count() === 0, 'the row leaves')
      const r1 = await ringAt(p, (ring0?.cleared ?? 0) + 1)
      ok(r1 && ring0 && r1.cleared === ring0.cleared + 1, `the ring reads the record: cleared ${ring0?.cleared} → ${r1?.cleared}`)
      await undoLast(p); await settle(p, 1600)
      ok(json(`select status from expenses where id = '${id}'`)[0]?.status === 'pending', 'Undo: it waits for approval again')
      ok(await card(p).locator(`[data-inbox-row="${key}"]`).count() === 1, 'the row is back')
      const r2 = await ringAt(p, ring0?.cleared ?? 0)
      ok(r2 && ring0 && r2.cleared === ring0.cleared, `…and the ring with it (${r2?.cleared})`)
    }
    /* a client's payment confirmed → Undo */
    await expand(p)
    const pay = card(p).locator('[data-inbox-row*=":money:confirm:"]').first()
    if (await pay.count()) {
      const key = await pay.getAttribute('data-inbox-row'); const id = key.split(':').pop()
      await pay.locator('[data-testid="need-confirm"]').click(); await settle(p, 1800)
      ok(json(`select status from project_payments where id = '${id}'`)[0]?.status === 'confirmed', 'Confirm confirms the payment (Money’s own action)')
      ok(/Confirmed — S\$[\d,.]+ from \w+/.test(await snack(p)), 'its sentence: “Confirmed — S$… from {client}”, with Undo')
      await undoLast(p); await settle(p, 1800)
      ok(json(`select status from project_payments where id = '${id}'`)[0]?.status === 'to_confirm', 'Undo: back to To confirm')
    }
    /* more time agreed → Undo */
    const more = card(p).locator('[data-inbox-row*=":approve-more-time:"]').first()
    if (await more.count()) {
      const key = await more.getAttribute('data-inbox-row'); const id = key.split(':').pop()
      await more.locator('[data-testid="need-approve"]').click(); await settle(p, 1800)
      ok(json(`select status from project_milestone_extensions where id = '${id}'`)[0]?.status === 'approved', 'Agree answers the ask for more time (the Schedule’s own action)')
      await undoLast(p); await settle(p, 1800)
      ok(json(`select status from project_milestone_extensions where id = '${id}'`)[0]?.status === 'pending', 'Undo: the ask waits again')
    }
    /* the Review pane: the record, its one filled button; Publish lands and the pane moves on */
    await go(p, '/dashboard', 1500)
    const upd = card(p).locator('[data-inbox-row*=":review-update:"]').first()
    if (await upd.count()) {
      const key = await upd.getAttribute('data-inbox-row'); const id = key.split(':').pop()
      await reviewOf(p, upd); await settle(p, 700)   // (the calm pass 2026-10-26, a deliberate change) Review is the ⋮'s first row now
      const pane = p.locator('[data-testid="review-pane"]')
      ok(await pane.count() === 1 && (await pane.getAttribute('data-review')) === key, 'Review opens the record in the pane beside the list')
      ok(await upd.getAttribute('data-current') === '', 'the list keeps its place — the row it is about is marked')
      ok(await pane.locator('img').count() > 0 && (await pane.innerText()).length > 40, 'the pane holds the update’s pictures and words')
      const foot = p.locator('[role="dialog"]').filter({ has: pane })
      const filled = await foot.locator('button').evaluateAll((els) => {
        const probe = document.createElement('span'); probe.style.color = 'var(--om-color-primary-default)'; document.body.appendChild(probe)
        const primary = getComputedStyle(probe).color; probe.remove()
        return els.filter((e) => getComputedStyle(e).backgroundColor === primary).map((e) => e.textContent?.trim())
      })
      ok(filled.length === 1 && /Publish|Approve/.test(filled[0] ?? ''), `the pane’s one filled button is the decision (${filled.join(', ')})`)
      await shot(p, 'd2-1440-pane')
      const before = await pane.getAttribute('data-review')
      await p.locator('[data-testid="review-approve"]').click(); await settle(p, 2200)
      ok(json(`select status from project_updates where id = '${id}'`)[0]?.status === 'published', 'Publish publishes it through the Updates tab’s own action')
      ok(/Approved — \w+ can see|Approved/.test(await snack(p)), 'its sentence: the Overview’s own (“Approved — {client} can see …”)')
      const after = (await p.locator('[data-testid="review-pane"]').count()) ? await p.locator('[data-testid="review-pane"]').getAttribute('data-review') : null
      ok(after !== before, `the pane moved on (${after ? 'to the next row' : 'closed — none left'})`)
      if (after) { await p.keyboard.press('Escape'); await settle(p, 300) }
    }
    /* Remind on WhatsApp — the draft opens on the press with the record's own link; the reminder is the client's Activity line (one record with
       Maison AI's Remind — the Dashboard's closing pass 2026-10-26, a deliberate change of this check); Undo takes the line back */
    await go(p, '/dashboard', 1500); await expand(p)
    const vo = card(p).locator('[data-inbox-row^="quote-wait:"]').filter({ has: p.locator('[data-testid="need-remind"]') }).first()
    if (await vo.count()) {
      const key = await vo.getAttribute('data-inbox-row'); const qid = key.slice('quote-wait:'.length)
      const r0 = await ring(p)
      await vo.locator('[data-testid="need-remind"]').click(); await settle(p, 1500)
      const opened = await p.evaluate(() => window.__opened)
      const tok = json(`select coalesce(confirm_token, id) t, number from quotes where id = '${qid}'`)[0]
      const text = decodeURIComponent((opened[0] ?? '').split('text=')[1] ?? '')
      ok(/^https:\/\/wa\.me\/65\d{8}\?text=/.test(opened[0] ?? ''), 'WhatsApp opens on the press')
      ok(text.includes(tok.number) && text.includes(`/confirm/${tok.t}`), 'the draft names it and carries its confirmation link')
      ok(json(`select 1 from lead_events where kind = 'portal_reminded' and actor_id = 'dane' and json_extract(detail, '$.id') = 'quote:${qid}'`).length === 1, 'the reminder is on the client’s Activity (the record Maison AI’s Remind keeps too)')
      ok(await card(p).locator(`[data-inbox-row="${key}"]`).count() === 0, 'the row rests until tomorrow')
      const r1 = await ringAt(p, (r0?.cleared ?? 0) + 1)
      ok(r1 && r0 && r1.cleared === r0.cleared + 1, `a reminder sent counts as cleared (${r0?.cleared} → ${r1?.cleared})`)
      await undoLast(p); await settle(p, 1500)
      for (let i = 0; i < 20 && !(await card(p).locator(`[data-inbox-row="${key}"]`).count()); i++) await settle(p, 250)
      ok(await card(p).locator(`[data-inbox-row="${key}"]`).count() === 1 && json(`select 1 from lead_events where kind = 'portal_reminded' and json_extract(detail, '$.id') = 'quote:${qid}'`).length === 0, 'Undo: the Activity line is gone and the row is back in Needs you')
    }
    /* Call a lead — tel: on the press; Log the call opens the house log sheet */
    await go(p, '/dashboard', 1500); await expand(p)
    const lead = card(p).locator('[data-inbox-row^="lead-call:"]').filter({ has: p.locator('[data-testid="need-call"]') }).first()
    if (await lead.count()) {
      const name = json(`select name from leads where id = '${(await lead.getAttribute('data-inbox-row')).slice('lead-call:'.length)}'`)[0]?.name ?? ''
      await lead.locator('[data-testid="need-call"]').click().catch(() => {}); await settle(p, 1700)
      /* back on the page — the dialler had it (the Dashboard's one after-call piece, Your day's too: components/dashboard/after-call.tsx) */
      await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await settle(p, 500)
      ok(/Log the call with \w+\?/.test(await snack(p)), 'Call is remembered: back on the page, “Log the call with {first}?”')
      await p.locator('[data-om-snackbar]').getByRole('button', { name: 'Log the call' }).click()
      const sheet = p.locator('[role="dialog"]').filter({ hasText: `call with ${name.split(' ')[0]}` })
      await sheet.waitFor({ timeout: 8000 }).catch(() => {})
      ok(await sheet.count() === 1, `Log the call opens the house log sheet for ${name}`)
      await p.keyboard.press('Escape'); await settle(p, 500)
    }

    console.log('3 · Not today')
    await go(p, '/dashboard', 1500)
    const restable = rows(p).filter({ hasNot: p.locator('[data-tone-row="late"]') })
    const rest = card(p).locator('[data-inbox-row]:not([data-tone-row="late"])').first()
    void restable
    const rkey = await rest.getAttribute('data-inbox-row')
    await menuOf(p, rest); await item(p, 'Not today').click(); await settle(p, 1500)
    ok(/Set aside until tomorrow/.test(await snack(p)), 'Not today says so, with Undo')
    ok(await card(p).locator(`[data-inbox-row="${rkey}"]`).count() === 0, 'the row leaves')
    const snz = json(`select until_day, row_key from dashboard_snoozes where member_id = 'dane' and 1 = 1`)
    const today = Math.floor((Date.now() + 8 * 3600e3) / 86400e3)
    ok(snz.length === 1 && snz[0].until_day === today + 1, 'it rests until the studio’s next day (dashboard_snoozes)')
    await go(p, '/dashboard', 1500)
    ok(await card(p).locator(`[data-inbox-row="${rkey}"]`).count() === 0, 'a reload keeps it set aside')
    const toggle = card(p).locator('[data-testid="needs-set-toggle"]')
    ok(/1 set aside for today/.test(await toggle.innerText()), 'the foot says “1 set aside for today · Show”')
    await toggle.click(); await settle(p, 300)
    await card(p).locator('[data-testid="need-bring-back"]').first().click(); await settle(p, 1500)
    ok(await card(p).locator(`[data-inbox-row="${rkey}"]`).count() === 1 && json(`select 1 from dashboard_snoozes where member_id = 'dane'`).length === 0, 'Bring back puts it in its place')

    console.log('5 · keys')
    await go(p, '/dashboard', 1500)
    await p.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
    await p.keyboard.press('j'); await settle(p, 200)
    await p.keyboard.press('r'); await settle(p, 800)
    const firstKey = await rows(p).first().getAttribute('data-inbox-row')
    const hasPane = await rows(p).first().locator('[data-kb="list.review"]').count()
    if (hasPane) {
      ok((await p.locator('[data-testid="review-pane"]').getAttribute('data-review').catch(() => null)) === firstKey || (await p.locator('[role="dialog"]').count()) > 0, 'J then R reviews the cursor’s row')
      const at = await p.locator('[data-testid="review-pane"]').getAttribute('data-review').catch(() => null)
      if (at) {
        await p.locator('[data-testid="review-pane"]').focus().catch(() => {})
        await p.locator('[data-testid="review-pane"]').press('j'); await settle(p, 400)
        ok((await p.locator('[data-testid="review-pane"]').getAttribute('data-review')) !== at, 'J in the pane steps to the next row with one')
        await p.locator('[data-testid="review-pane"]').press('k'); await settle(p, 400)
        ok((await p.locator('[data-testid="review-pane"]').getAttribute('data-review')) === at, 'K steps back')
        await p.keyboard.press('Escape'); await settle(p, 300)
      }
    }
    /* ↵ presses the row's own verb — a door: (the calm pass 2026-10-26, a deliberate change) the Money chip is gone, so the first row whose verb
       is a door, walked to with J. (the calm UI build 2026-10-27, a deliberate change) the card's own rows (the whole list is a drawer now): the Clients waiting tab, whose verbs are doors */
    await go(p, '/dashboard', 1500)
    { const cw = card(p).getByRole('radio', { name: /^Clients waiting/ }); if (await cw.count()) { await cw.click(); await settle(p, 300) } }
    const verbs = await rows(p).evaluateAll((els) => els.map((e) => (e.querySelector('[data-kb-open]')?.textContent ?? '').trim()))
    const DOORS = ['Answer', 'Start', 'Resume', 'Pay', 'Send', 'Open', 'Revise', 'Reply', 'Mark done', 'Write up', 'Assign', 'Fix', 'Continue', 'Add', 'Invite', 'Share', 'Draft it', 'Write', 'Change it', 'Mark delivered']   // (the calm UI build 2026-10-27, a deliberate change) W-398 · W-622: the weekly update's door reads "Write" (was "Draft it")
    const at = verbs.findIndex((v) => DOORS.includes(v))
    if (at >= 0) {
      await p.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur() })
      for (let i = 0; i <= at; i++) { await p.keyboard.press('j'); await settle(p, 120) }
      await p.keyboard.press('Enter'); await settle(p, 1800)
      ok(/from=%2Fdashboard/.test(p.url()) && !p.url().endsWith('/dashboard'), `↵ presses the row’s own verb ("${verbs[at]}" → ${new URL(p.url()).pathname})`)
    }

    console.log('4 · the signals the page never had (scratch states, put back)')
    /* a change asked on a quote, a contract out 4 days unopened, AI credits low */
    const sent = json(`select id, number from quotes where status = 'Sent to Client' and kind = 'quote' and deleted_at is null limit 1`)[0]
    if (sent) sql(`update quotes set change_asked_at = strftime('%s','now') - 3600, change_asked_note = 'Could the kitchen use quartz instead?' where id = '${sent.id}'`)
    const draft = json(`select id, title from contracts where status = 'Draft' and deleted_at is null limit 1`)[0]
    if (draft) sql(`update contracts set status = 'Sent to Client', sent_at = strftime('%s','now') - 4 * 86400, recipient_phone = '91234567', recipient_name = 'Olivia Martinez' where id = '${draft.id}'`)
    const bal = json(`select id from studio_credit_balances limit 1`)[0]
    if (bal) sql(`update studio_credit_balances set plan_credits = 30, topup_credits = 0 where id = '${bal.id}'`)
    await go(p, '/dashboard', 1800); await expand(p)
    if (sent) ok(/asked for a change/.test(await card(p).locator(`[data-inbox-row="quote-change:${sent.id}"]`).innerText().catch(() => '')), `a change asked on ${sent.number} is a client’s row`)
    if (draft) {
      const c = card(p).locator(`[data-inbox-row="contract-wait:${draft.id}"]`)
      ok(await c.count() === 1 && /hasn’t opened/.test(await c.innerText()), 'a contract out 4 days and not opened is a row with Remind')
      await c.locator('[data-testid="need-remind"]').click(); await settle(p, 1500)
      const u = (await p.evaluate(() => window.__opened)).pop() ?? ''
      ok(/wa\.me\/6591234567/.test(u) && /%2Fsign%2F/.test(u), 'its Remind drafts the signing link on WhatsApp')
      ok(json(`select 1 from lead_events where kind = 'parity_s03_contract_reminded' and json_extract(detail, '$.id') = '${draft.id}'`).length === 1, 'and the reminder is on the lead’s Activity (renewSigningLink)')
    }
    if (bal) ok(/running low|out of AI credits/.test(await card(p).locator('[data-inbox-row="credits-low"]').innerText().catch(() => '')), 'AI credits running low is the Owner’s row, with Top up')
    /* a quote waiting for this approver: Review in the pane, Send back through the editor's own words */
    const q1 = json(`select id, number from quotes where status = 'Draft' and kind = 'quote' and deleted_at is null limit 1`)[0]
    if (q1) {
      sql(`update quotes set status = 'Sent for Approval', submitted_by = 'germaine', submitted_at = strftime('%s','now') - 3600 where id = '${q1.id}'`)
      await go(p, '/dashboard', 1600); await expand(p)   // (the calm pass 2026-10-26) five rows before Show all — the ninth approval sits under it
      const qa = card(p).locator(`[data-inbox-row="quote-approve:${q1.id}"]`)
      ok(await qa.count() === 1 && (await qa.getAttribute('data-ok')) === '', `${q1.number}, sent for approval, is a Your OK row`)
      await reviewOf(p, qa); await settle(p, 700)   // (the calm pass 2026-10-26, a deliberate change) from the row's ⋮
      const pane = p.locator('[data-testid="review-pane"]')
      ok(/Client/.test(await pane.innerText()) && /Total/.test(await pane.innerText()), 'its pane holds the quote’s facts')
      await p.locator('[data-testid="review-back"]').click(); await settle(p, 500)
      const dlg = p.getByRole('dialog', { name: 'Request changes' })
      ok(await dlg.count() === 1, 'Send back opens the quote editor’s own Request changes')
      await dlg.getByRole('textbox').fill('Please split the carpentry into its rooms'); await dlg.getByRole('button', { name: 'Send back' }).click(); await settle(p, 1800)
      const back = json(`select status, review_note from quotes where id = '${q1.id}'`)[0]
      ok(back?.status === 'Draft' && /carpentry/.test(back?.review_note ?? ''), 'it goes back to Draft with the note (requestQuoteChanges)')
      ok(/Sent back to Germaine with your note/.test(await snack(p)), 'its sentence: “Sent back to Germaine with your note”')
    }
    /* a Price book proposal approved in its pane */
    const pb = json(`select id, name from price_book_items where status = 'proposed' and deleted_at is null limit 1`)[0]
    if (pb) {
      await go(p, '/dashboard', 1600); await expand(p)
      const row = card(p).locator(`[data-inbox-row="price-book:${pb.id}"]`)
      await reviewOf(p, row); await settle(p, 700)   // (the calm pass 2026-10-26, a deliberate change) from the row's ⋮
      await p.locator('[data-testid="review-approve"]').click(); await settle(p, 1800)
      ok(json(`select status from price_book_items where id = '${pb.id}'`)[0]?.status === 'live', `${pb.name}: approved from its pane (the Price book’s own action)`)
      ok(/in the Price book for the studio/.test(await snack(p)), 'its sentence: the Price book’s own')   // (the close-out round 2026-10-31, a deliberate change) C-122: the Price book is named, not "My Items" / "My Sections"
    }

    console.log('7 · by role and scope')
    restore.forEach((r) => r())
    await go(p, '/dashboard?scope=mine', 1600); await expand(p)
    const mine = await keys(p)
    const okMine = await rows(p).evaluateAll((els) => els.map((e) => [e.getAttribute('data-inbox-row'), e.hasAttribute('data-ok')]))
    const dProjects = new Set(json(`select p.id from projects p join lead_assignees a on a.lead_id = p.lead_id where a.member_id = 'dane'`).map((r) => r.id))
    ok(okMine.every(([k, isOk]) => isOk || !k.startsWith('project:') || dProjects.has(k.split(':')[1])), `Mine keeps approvals and Dane’s own projects (${mine.length} rows)`)
    const okCount = Number(((await card(p).locator('[data-testid="needs-chips"]').innerText().catch(() => '')).match(/Approvals (\d+)/) ?? [0, 0])[1])   // (the calm UI build 2026-10-27, a deliberate change)   // (the calm pass 2026-10-26, then 2026-10-27, deliberate changes) "Your OK" is the tab "To approve" (Finance › To do's chip)
    await go(p, '/dashboard', 1500)
    const okStudio = Number(((await card(p).locator('[data-testid="needs-chips"]').innerText().catch(() => '')).match(/Approvals (\d+)/) ?? [0, 0])[1])
    ok(okStudio > 0 && okCount === okStudio, `Mine keeps every approval (${okCount} = ${okStudio})`)
    /* (Vicky 2026-10-29: brought back) the Tasks page points to them again, in one line with the Dashboard's own number — "n approvals wait for you on the Dashboard" */
    await go(p, '/tasks', 1500)
    const tasksLine = (await p.locator('[data-testid="tasks-approvals"]').innerText().catch(() => '')).replace(/\s+/g, ' ')
    ok(okStudio > 0 && new RegExp(`(^|\\s)${okStudio === 1 ? '1 approval waits' : `${okStudio} approvals wait`} for you on the Dashboard`).test(tasksLine), `the Tasks page’s line says the Dashboard’s ${okStudio} approvals`, tasksLine)   // (Vicky 2026-10-29: brought back)
    for (const [who, rule] of [['germaine', 'designer'], ['priya', 'books'], ['nurul', 'desk'], ['huimin', 'admin'], ['james', 'manager']]) {
      as(who)
      await go(p, '/dashboard', 1600); await expand(p)
      const k = await keys(p)
      if (rule === 'designer') {
        const own = new Set(json(`select p.id from projects p join lead_assignees a on a.lead_id = p.lead_id where a.member_id = '${who}'`).map((r) => r.id))
        ok(k.filter((x) => x.startsWith('project:')).every((x) => own.has(x.split(':')[1])), `a Designer's project rows are their own projects' (${k.length} rows)`)
        ok(!k.some((x) => x.startsWith('quote-approve:') || x.startsWith('price-book:') || x.startsWith('credits')), 'no approvals they don’t give')
      } else if (rule === 'books') {
        ok(!k.some((x) => x.startsWith('project:') || x.startsWith('lead-call:') || x.startsWith('quote-')), `Accounting: the money's rows only (${k.length})`)
      } else if (rule === 'desk') {
        ok(!k.some((x) => x.startsWith('project:') || x.startsWith('todo:')), `Marketing: the lead desk (${k.length})`)
      } else if (rule === 'admin') {
        ok(!k.some((x) => x.startsWith('credits-ask:')), `an Admin answers no AI credits ask — the Owner gives them (${k.length})`)
      } else ok(k.length >= 0 && !k.some((x) => x.startsWith('credits')), `a Manager's inbox (${k.length})`)
      if (!k.length) {
        ok(await card(p).locator('[data-testid="needs-empty"]').count() === 1 && /You’re all caught up/.test(await card(p).innerText()), `${who}: You’re all caught up (Q-11)`)
      }
    }
    /* 6 · caught up (Q-11): Alex sets aside what waits on him — nothing left, the ring full */
    as('alex')
    await go(p, '/dashboard', 1600)
    for (let i = 0; i < 6 && (await rows(p).count()); i++) {
      const r = rows(p).first()
      await menuOf(p, r)
      const nt = item(p, /^Not today/)
      if ((await nt.getAttribute('aria-disabled')) === 'true') { await p.keyboard.press('Escape'); break }
      await nt.click(); await settle(p, 1400)
    }
    if (!(await rows(p).count())) {
      ok(/You’re all caught up/.test(await card(p).innerText()), 'nothing left: “You’re all caught up” (Q-11)')
      ok(await card(p).locator('[data-testid="needs-caught-mark"]').count() === 1 && await card(p).locator('svg').count() === 0, 'calm: a tick in the row’s glyph, no ring (the calm pass 2026-10-26, a deliberate change — was "the ring full")')
      ok(await card(p).locator('[data-testid="needs-set-toggle"]').count() === 1, 'what was set aside is still a press away')
      await shot(p, 'd2-1440-caught-up')
    } else ok(false, 'Alex’s rows could all be set aside')
    as('dane')

    console.log('8 · a Since chip’s door')
    await go(p, '/dashboard', 1500)
    const deep = await rows(p).count()
    const all2 = json(`select 1`)
    void all2
    await expand(p); const late2 = (await keys(p)).slice(-1)[0]
    await go(p, '/dashboard', 1500)
    if (late2 && deep) {
      await p.evaluate((k) => window.dispatchEvent(new CustomEvent('om:inbox-reveal', { detail: { key: k } })), late2); await settle(p, 1200)
      ok(await card(p).locator(`[data-inbox-row="${late2}"][data-fresh]`).count() === 1, 'the reveal opens the list to the row and pulses it')   // (the calm UI build 2026-10-27, a deliberate change) the whole list's drawer opens on a row past the card's five
    }

    console.log('10 · the busy measure (the calm pass 2026-10-26 — brief-calm: the page ~200–250 words · ~12 boxes · 25–35 controls · 5 sizes · 3 text colours · ≤ 4 tints)')
    {
      await go(p, '/dashboard', 1800); await p.mouse.move(5, 5); await settle(p, 300)
      const measure = (sel) => p.evaluate((sel) => {
        const root = document.querySelector(sel); if (!root) return null
        const shown = (e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; for (let x = e; x && x !== root.parentElement; x = x.parentElement) { const cs = getComputedStyle(x); if (cs.opacity === '0' || cs.visibility === 'hidden') return false } return !(r.width <= 1 && r.height <= 1) }
        const els = [...root.querySelectorAll('*')].filter(shown)
        /* a box = a stroke you can see (a border or the DS button's inset stroke, never a transparent one) or a tint wider than 24 */
        const seen = (c) => !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c)
        const boxed = els.filter((e) => { const st = getComputedStyle(e); return (parseFloat(st.borderTopWidth) > 0 && st.borderTopStyle !== 'none' && parseFloat(st.borderLeftWidth) > 0 && seen(st.borderTopColor)) || /inset/.test(st.boxShadow) || (st.backgroundColor !== 'rgba(0, 0, 0, 0)' && st.backgroundColor !== 'rgb(255, 255, 255)' && e.getBoundingClientRect().width > 24) })
        const controls = els.filter((e) => e.matches('button, a[href], [role="button"], [role="tab"], [role="radio"]') && e.getAttribute('aria-hidden') !== 'true')
        const texts = els.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !e.closest('.msr, .mso'))
        const words = texts.map((e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ')).join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length   // "·" and "—" are not words
        return { words, boxed: boxed.length, controls: controls.length,
          sizes: [...new Set(texts.map((e) => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight))], colours: [...new Set(texts.map((e) => getComputedStyle(e).color))],
          tints: [...new Set(els.map((e) => getComputedStyle(e).backgroundColor).filter((c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'rgb(255, 255, 255)'))],
          upper: texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase').length }
      }, sel)
      const whole = await measure('section[data-card="needs"]')
      const body = await measure('section[data-card="needs"] [class*="inbox-module"][class*="__body"]')
      const tabs = await measure('section[data-card="needs"] [data-testid="needs-chips"]')
      console.log('     the card at rest:', JSON.stringify(whole))
      console.log('     its body (this lane):', JSON.stringify(body))
      console.log('     its tabs:', JSON.stringify(tabs))
      fs.writeFileSync(path.join(dir, 'busy-needs-1440.json'), JSON.stringify({ whole, body, tabs }, null, 1))
      const b2 = { ...body, words: body.words + (tabs?.words ?? 0), controls: body.controls + (tabs?.controls ?? 0), boxed: body.boxed + (tabs?.boxed ?? 0) }
      ok(b2.words <= 90, `Needs you's rows and tabs: ${b2.words} words (≤ 90 — five rows of a title and one short caption)`)
      ok(b2.boxed <= 12, `${b2.boxed} boxes — the glyphs, the verbs, the selected tab (≤ 12)`)
      ok(b2.controls <= 16, `${b2.controls} controls in reach at rest — 4 tabs, 5 rows' words and verbs, Show all (≤ 16; the ⋮ waits for a hover)`)
      ok(body.sizes.length <= 4, `${body.sizes.length} type sizes in the rows (${body.sizes.join(' · ')})`)
      ok(body.colours.length <= 3, `${body.colours.length} text colours in the rows (${body.colours.join(' · ')})`)
      ok(body.tints.length <= 2 && (tabs?.tints.length ?? 0) <= 1, `${body.tints.length} tint${body.tints.length === 1 ? '' : 's'} in the rows, one on the tabs (${[...body.tints, ...(tabs?.tints ?? [])].join(' · ')})`)
      ok(body.upper === 0 && (tabs?.upper ?? 0) === 0, 'no uppercase in the rows or the tabs')
      await card(p).screenshot({ path: path.join(dir, 'd2-1440-calm.png') })
    }

    console.log('9 · every width')
    await ctx.close()
    for (const [w, h, t] of [[1440, 1024, false], [1280, 800, false], [1024, 768, true], [768, 1024, true], [390, 844, true], [320, 640, true], [844, 390, true]]) {
      const c2 = t ? await touch(w, h) : await desk(w, h); await stubOpen(c2)
      const q = await c2.newPage(); watch(q, `${w}`)
      await go(q, '/dashboard', 1600)
      ok(await q.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${w}×${h}${t ? ' touch' : ''}: no sideways scroll`)
      if (t) {
        const small = await card(q).locator('[data-inbox-row] [data-row-actions] button').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).length)
        ok(small === 0, `${w}: every verb a 44 target on touch`)
        /* (the calm pass 2026-10-26) on touch the ⋮ is always there, the tabs 44 tall, and the words wrap rather than hide their end */
        ok(await card(q).locator('[data-inbox-row] [data-testid="need-more"]').evaluateAll((els) => els.every((e) => getComputedStyle(e.closest('[class*="__more"]')).opacity === '1')), `${w}: every row's ⋮ in reach on touch`)
        const tabsSmall = await card(q).locator('[data-testid="needs-chips"] [role="radio"]').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height < 44).length)
        ok(tabsSmall === 0, `${w}: the tabs 44 tall on touch`)
        ok(await card(q).locator('[data-inbox-row] [class*="__title"]').evaluateAll((els) => els.every((e) => getComputedStyle(e).whiteSpace !== 'nowrap')), `${w}: on touch a title wraps (no tooltip under a finger)`)
      }
      /* (the calm pass 2026-10-26, a deliberate change) one verb on every row at every width (was: a phone's only) */
      const two = await card(q).locator('[data-inbox-row]').evaluateAll((els) => els.filter((e) => e.querySelectorAll('[data-row-actions] button').length > 1).length)
      ok(two === 0, `${w}: every row keeps its own verb alone (the second in its ⋮)`)
      if (w < 768) ok(await card(q).locator('[data-testid="needs-chips"]').count() === 0 || await q.locator('section[data-card="needs"] [class*="__tabsLine"] [data-testid="needs-chips"]').count() === 1, `${w}: a phone's tabs sit on the body's first line, the card's width`)
      await card(q).scrollIntoViewIfNeeded().catch(() => {})
      /* (the calm pass 2026-10-26) on touch a viewport shot with the card at the top — an element shot taller than the screen re-lays the page
         out as a mouse (Playwright's beyond-viewport capture: the ⋮ faded, the words cut), which is not what a finger sees */
      if (t) { await card(q).evaluate((el) => window.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 64))); await settle(q, 400); await q.screenshot({ path: path.join(dir, `d2-${w}x${h}.png`) }) }
      else await card(q).screenshot({ path: path.join(dir, `d2-${w}x${h}.png`) }).catch(() => {})
      if (w === 390) {
        /* (the calm pass 2026-10-26, a deliberate change) Review from the row's ⋮ — a sheet on a phone */
        const rv = card(q).locator('[data-inbox-row]').filter({ has: q.locator('[data-kb="list.review"]:not([data-row-actions] *)') }).first()
        if (await rv.count()) {
          await rv.locator('[data-testid="need-more"]').click(); await settle(q, 600)
          await q.getByRole('menuitem', { name: /^Review/ }).click(); await settle(q, 800)
          const sheet = q.locator('[role="dialog"]').filter({ has: q.locator('[data-testid="review-pane"]') })
          const box = await sheet.boundingBox()
          ok(!!box && box.width >= 380 && box.y > 40, 'the Review pane is a sheet on a phone')
          await shot(q, 'd2-390-pane')
          await q.keyboard.press('Escape')
        }
      }
      await c2.close()
    }
  } catch (e) {
    fail++
    console.log('  ✗ the run stopped —', String(e).slice(0, 400))
  } finally {
    for (const r of restore) { try { r() } catch (e) { console.log('  ! put back failed —', String(e).slice(0, 200)) } }
    sql(`update members set is_you = (id = '${you0 || 'dane'}')`)
    await b.close()
  }
  ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '))
  console.log(`\n${pass} passed · ${fail} failed`)
  process.exit(fail ? 1 : 0)
})()
