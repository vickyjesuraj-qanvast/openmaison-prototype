// Pending modules, step S14 · Settings and Company leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:settings-company, minus S01's profile lines). Each item asserted as the rule it builds, never another round's count:
//  - Settings' first module is named for what it holds — **Roles & access** (the card's "'Studio' names both a Settings module and a Company
//    group", as recommended); its address stays ?section=studio; the Company panel's group keeps "Studio"
//  - **Who sees leads** has one home: Roles & access, above Who may do what (the card's "Move Who sees leads into Studio?", as recommended).
//    Lead management keeps a pointer; an old link to its #lead-visibility lands on the card's new place; a pick changes the table's rows at once
//    and is kept; the table's rows link to the card above in the page (no navigation, focus on the chosen option); Projects' and Members'
//    pointers and ⌘K point at it; a Designer reads it (the read-only line, the options disabled); the Settings ghost draws the line too
//  - Qanvast Ops' Leads list follows Who sees leads (the survey's note: it applied none) — a Designer who sees only their own leads sees only
//    their own Qanvast leads, and its counts count those
//  - the **Review link** (1.0's Accounts Setup › Review Link): Company › Profile › Reviews — a bad address refused under its box and by Save,
//    nothing kept; a bare address kept as https; Copy; Designers read it. Maison AI's **Ask for a review** (a Won lead's brief, a completed
//    project's brief): with no link an answer that says where to add it (the button only for Owners and Admins) and *Ask without a link*;
//    with a link the WhatsApp draft carries it and opens on the press
//  - **Your PayNow** on Your profile for every member (the steps' note after S01) — Accounting too: Add → refused when it is no PayNow ID →
//    saved with Undo, on the record Members writes; Members' own dialog is the same piece; Who may do what's row says "Their own"; ⌘K finds it
//  - the studio's registrations as its brand shows them (repair R116, the card's CaseTrust data call): CaseTrust and the HDB listing on record,
//    so a sent contract's signing page carries the CaseTrust disclosure and its tick before the code
//  - the roles editor stays held (Q-40): Who may do what is read-only
//  - no page errors; no sideways scroll at 390 / 320 (against screen.width)
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s14.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s14')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s14-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const setting = (key) => { const v = sql(`select value from settings where key = '${key}'`); return v ? JSON.parse(v) : null }
const lead = (name) => sql(`select id from leads where name = '${name}' and deleted_at is null`)
const BEN = lead('Benjamin Han')
const SHALINI_P = sql(`select p.id from projects p join leads l on l.id = p.lead_id where l.name = 'Shalini Menon' and p.stage = 'completed' and p.deleted_at is null`)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  /* window.open is recorded, never followed: WhatsApp opens on the press, and the probe reads what it would open */
  const record = (ctx) => ctx.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null } })
  const desk = async (o = {}) => { const c = await b.newContext({ viewport: { width: 1440, height: 1024 }, ...o }); await record(c); return c }
  const phoneCtx = async (w = 390, h = 844) => { const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); await record(c); return c }
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 1100) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
  const undo = async (p) => { await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1600) }
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const sideways = (p) => p.evaluate(() => document.documentElement.scrollWidth - screen.width)
  const text = async (l) => ((await l.count()) ? (await l.first().innerText()).replace(/\s+/g, ' ') : '')
  const inView = (l) => l.first().evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.top < innerHeight - 40 })
  const opened = (p) => p.evaluate(() => window.__opened.slice())
  const search = async (p, q) => {
    await p.keyboard.press(process.platform === 'darwin' ? 'Meta+k' : 'Control+k'); await settle(p, 500)
    await p.keyboard.type(q, { delay: 20 }); await settle(p, 900)
    return p.getByRole('dialog', { name: /search/i }).or(p.locator('[data-global-search]')).first()
  }
  const sheet = (p) => p.locator('[role="dialog"][aria-label="Maison AI suggestions"]')
  const fab = async (p) => { await p.locator('button[aria-label="Maison AI"]').last().click(); await settle(p, 700) }
  const panel = (p) => sheet(p).locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first()
  const waitPanel = (p) => p.waitForFunction(() => { const a = document.querySelector('[data-testid="maison-answer"],[data-testid="maison-proposal"]'); return !!a && !/Looking through your records/.test(a.textContent || '') }, null, { timeout: 15000 }).catch(() => {})
  const askReview = async (p) => { await fab(p); await sheet(p).getByRole('button', { name: 'Ask for a review' }).first().click(); await waitPanel(p); await settle(p, 300); return panel(p) }
  const reach = (p, row, role) => p.locator(`[data-testid="may-${row}"] [role="cell"][data-label="${role}"]`).getAttribute('data-reach')

  /* open one page and wait before the snapshot (a first page's own lazy writes land first) */
  { const C0 = await desk(); const p0 = await C0.newPage(); await go(p0, '/settings'); await settle(p0, 1500); await C0.close() }
  const you0 = sql(`select id from members where is_you = 1`)
  const TABLES = sql(`select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '__drizzle%' order by name`).split('\n').filter(Boolean)
  const hashOf = (t) => require('crypto').createHash('sha1').update(execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "select * from \\"${t}\\" order by rowid"`, { maxBuffer: 256 * 1024 * 1024 })).digest('hex')
  const before = new Map(TABLES.map((t) => [t, hashOf(t)]))
  const kept = new Map(TABLES.map((t) => [t, json(`select * from "${t}"`)]))
  const putBack = () => {
    const changed = TABLES.filter((t) => hashOf(t) !== before.get(t))
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const t of changed) {
      text += `DELETE FROM "${t}";\n`
      for (const r of kept.get(t)) text += `INSERT INTO "${t}" (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += `UPDATE members SET is_you = (id = '${you0}');\nCOMMIT;\n`
    sqlFile(text)
    return changed
  }

  try {
    as('dane')
    const D = await desk(); const d = await page(D, 'desk')

    // ── 1 · Roles & access, and Who sees leads' one home ────────────────────────────────────────────────────────────────────────────
    console.log('1 · Roles & access — Who sees leads moved in')
    await go(d, '/settings')
    ok(await d.getByRole('tab', { name: 'Roles & access' }).getAttribute('aria-selected') === 'true' && await d.getByRole('tab', { name: 'Studio', exact: true }).count() === 0, 'Settings opens on Roles & access — no tab named “Studio” beside the Company panel’s group of that name')
    ok(await d.getByRole('heading', { level: 2, name: 'Roles & access' }).count() === 1 && /Who sees which leads in Demo Studio, and what each role may do/.test(await text(d.getByTestId('settings-studio'))), 'the module’s head says what it holds')
    const order = await d.evaluate(() => { const v = document.querySelector('[data-testid="lead-visibility"]'), r = document.querySelector('[data-testid="studio-roles"]'); return !!v && !!r && !!(v.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) && !!v.closest('[data-testid="settings-studio"]') })
    ok(order, 'Who sees leads sits in Roles & access, above Who may do what')
    ok(/its project, quotes, contracts, files and X.Ray readings, and its row in Qanvast Ops/.test(await text(d.getByTestId('lead-visibility'))), 'its help names everything it decides')
    ok(await d.getByTestId('studio-roles').locator('input, textarea, [role="switch"], select').count() === 0, 'Who may do what stays read-only — the roles editor is held (Q-40)')
    await shot(d, '01-roles-access-1440')

    /* a pick changes the table's rows at once, and is kept */
    ok(await reach(d, 'see', 'Designer') === 'yes', 'with everyone seeing every lead, a Designer’s “See a lead” is Yes')
    await d.getByRole('radio', { name: /Only the leads assigned to them/ }).click(); await settle(d, 1500)
    ok(sql(`select value from settings where key = 'lead_visibility'`) === '"assigned"' && /Designers now see only their own leads/.test(await snackText(d)), 'Only the leads assigned to them: kept, and said')
    ok(await reach(d, 'see', 'Designer') === 'own' && await reach(d, 'see', 'Manager') === 'team' && await reach(d, 'project-see', 'Designer') === 'own', '…and the table below follows at once: See a lead / See a project — Their own, Their team’s')
    await go(d, '/settings')
    ok(await d.getByRole('radio', { name: /Only the leads assigned to them/ }).getAttribute('aria-checked') === 'true' && await reach(d, 'see', 'Designer') === 'own', 'after a reload it is still the pick')

    // ── 2 · Qanvast Ops follows it ──────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('2 · Qanvast Ops follows Who sees leads')
    const qAll = Number(sql(`select count(*) from leads where source = 'Qanvast' and deleted_at is null`))
    const qMine = (m) => Number(sql(`select count(distinct l.id) from leads l join lead_assignees a on a.lead_id = l.id where l.source = 'Qanvast' and l.deleted_at is null and a.member_id = '${m}'`))
    const designer = sql(`select a.member_id from lead_assignees a join leads l on l.id = a.lead_id join members m on m.id = a.member_id where l.source = 'Qanvast' and l.deleted_at is null and m.role = 'Designer' and m.is_active = 1 group by a.member_id order by count(*) limit 1`)
    as(designer); await go(d, '/qanvast-ops')
    const shownNames = await d.getByTestId('qanvast-row').allInnerTexts()
    const mineNames = sql(`select l.name from leads l join lead_assignees a on a.lead_id = l.id where l.source = 'Qanvast' and l.deleted_at is null and a.member_id = '${designer}'`).split('\n').filter(Boolean)
    const others = sql(`select name from leads l where source = 'Qanvast' and deleted_at is null and not exists (select 1 from lead_assignees a where a.lead_id = l.id and a.member_id = '${designer}')`).split('\n').filter(Boolean)
    ok(!!designer && mineNames.length === qMine(designer) && mineNames.every((n) => shownNames.some((s) => s.includes(n))) && others.every((n) => !shownNames.some((s) => s.includes(n))), `a Designer who sees only their own leads sees only their own Qanvast leads (${mineNames.length} of ${qAll})`)
    ok(new RegExp(`All Leads[^0-9]*${mineNames.length}\\b`).test(await d.locator('body').innerText()) || !(await d.getByText(/All Leads/).count()), '…and its counts count those')
    await shot(d, '02-qanvast-ops-designer-own-1440')
    as('dane'); await go(d, '/qanvast-ops')
    const ownerNames = await d.getByTestId('qanvast-row').allInnerTexts()
    ok([...mineNames, ...others].every((n) => ownerNames.some((s) => s.includes(n))), 'an Owner still sees every Qanvast lead')

    /* Who sees leads back as it was */
    await go(d, '/settings')
    await d.getByRole('radio', { name: /Everyone sees every lead/ }).click(); await settle(d, 1500)
    ok(sql(`select value from settings where key = 'lead_visibility'`) === '"everyone"' && await reach(d, 'see', 'Designer') === 'yes', 'Everyone sees every lead again — the table follows')

    /* the table's rows land on the card above, in the page */
    const seeLink = d.getByTestId('may-link-see')
    ok(await seeLink.innerText() === 'Who sees leads, above' && await seeLink.getAttribute('href') === '#lead-visibility', 'See a lead’s row: “Set under Who sees leads, above”')
    await seeLink.scrollIntoViewIfNeeded(); const url0 = d.url()
    await seeLink.click(); await settle(d, 900)
    ok(new URL(d.url()).pathname === new URL(url0).pathname && new URL(d.url()).hash === '#lead-visibility' && !/from=/.test(d.url()), '…a press stays on the page (no navigation, no ?from=) and names the card in the address')
    ok(await inView(d.getByTestId('lead-visibility')) && await d.evaluate(() => document.activeElement?.getAttribute('role') === 'radio' && document.activeElement?.getAttribute('aria-checked') === 'true'), '…the card comes into view and focus moves to its chosen option')

    /* the doors */
    await go(d, '/settings?section=leads')
    ok(await d.getByTestId('lead-visibility').count() === 0 && /Who sees which leads — and each lead’s project, quotes and contracts — is set under/.test(await text(d.getByTestId('leads-visibility-pointer'))), 'Lead management keeps no copy — one line points at its home')
    await d.getByTestId('leads-visibility-link').click(); await d.waitForURL(/section=studio/); await settle(d, 1500)
    ok(/section=studio/.test(d.url()) && new URL(d.url()).hash === '#lead-visibility' && await inView(d.getByTestId('lead-visibility')), '…its link lands on Roles & access › Who sees leads')
    await go(d, '/settings?section=leads#lead-visibility'); await d.waitForURL(/section=studio/, { timeout: 8000 }).catch(() => {}); await settle(d, 1500)
    ok(/section=studio/.test(d.url()) && new URL(d.url()).hash === '#lead-visibility' && await inView(d.getByTestId('lead-visibility')), 'an old link to Lead management’s #lead-visibility lands on its new place')
    await go(d, '/settings?section=projects')
    ok(/section=studio/.test(await d.getByTestId('projects-visibility-link').getAttribute('href')) && (await d.getByTestId('projects-visibility-link').getAttribute('href')).endsWith('#lead-visibility') && /Roles & access › Who sees leads/.test((await d.getByTestId('projects-visibility-link').innerText()).replace(/ /g, ' ')), 'Settings › Projects’ pointer: Roles & access › Who sees leads')
    await go(d, '/company/members')
    ok(/section=studio/.test(await d.getByTestId('members-visibility-link').getAttribute('href')) && /Roles & access/.test(await d.getByTestId('members-visibility-link').innerText()), 'Company › Members’ line points there too')
    const s1 = await search(d, 'who sees leads')
    const hit = s1.getByText('Who sees leads', { exact: true })
    ok(await hit.count() >= 1 && /Settings › Roles & access/.test(await text(s1)), '⌘K finds Who sees leads under Settings › Roles & access')
    await hit.first().click(); await d.waitForURL(/section=studio/); await settle(d, 1500)
    ok(new URL(d.url()).hash === '#lead-visibility' && await inView(d.getByTestId('lead-visibility')), '…and lands on it')

    /* a Designer reads it */
    as('sarah'); await go(d, '/settings')
    /* (pending modules, a deliberate change of this rule — S41b-1) the module's read-only line, and Who sees costs and margins' own (the Owner's alone) */
    ok(await d.getByTestId('settings-studio').getByTestId('read-only-line').count() === 2 && /Only Owners and Admins change these/.test(await text(d.getByTestId('settings-studio').getByTestId('read-only-line').first())) && await d.getByRole('radio', { name: /Only the leads assigned to them/ }).isDisabled(), 'a Designer reads Roles & access — the read-only line, the options at rest')
    as('dane')

    // ── 3 · The review link and Ask for a review ───────────────────────────────────────────────────────────────────────────────────
    console.log('3 · The review link — and Ask for a review')
    ok(!setting('brand').details.reviewLink, 'the demo keeps no review link — none is made up')
    /* no link yet: the answer says where to add it */
    await go(d, `/leads/${BEN}`)
    let a = await askReview(d)
    ok(/Add your review link first/.test(await text(a)) && /nowhere to write it/.test(await text(a)), 'a Won lead’s Ask for a review, with no link: the answer says the message would have nowhere to write it')
    const add = sheet(d).getByTestId('maison-link')
    ok(await add.innerText() === 'Add your review link', '…its one button: Add your review link (an Owner may)')
    await shot(d, '03-ask-review-no-link-1440')
    await a.getByRole('listitem').filter({ hasText: 'Ask without a link' }).click(); await settle(d, 500)
    let o = await opened(d)
    ok(o.length === 1 && /^https:\/\/wa\.me\/6597731968\?text=/.test(o[0]) && /short%20review/.test(o[0]), '…Ask without a link still opens WhatsApp to Benjamin, on the press')
    await go(d, `/leads/${BEN}`); a = await askReview(d)
    await sheet(d).getByTestId('maison-link').click(); await d.waitForURL(/\/company\/profile/); await settle(d, 1500)
    ok(new URL(d.url()).pathname === '/company/profile' && new URL(d.url()).hash === '#reviews' && /from=/.test(d.url()) && await inView(d.locator('#reviews')), '…which opens Company › Profile › Reviews, with the way back')
    /* a bad address is refused under the box, and nothing is kept */
    const field = d.getByTestId('review-link').getByRole('textbox', { name: 'Review link' })
    await field.fill('not a link'); await d.getByRole('button', { name: 'Save changes' }).click(); await settle(d, 1200)
    ok(/Enter a web address, e\.g\. g\.page\/r\/your-studio\/review/.test(await text(d.getByTestId('review-link'))) && !setting('brand').details.reviewLink, 'a review link that is no web address: refused under its box, nothing saved')
    ok(await d.getByTestId('review-link-copy').count() === 0, '…and no Copy for it')
    await field.fill('g.page/r/demo-studio/review'); await settle(d, 300)
    ok(await d.getByTestId('review-link-copy').count() === 1, 'a link: Copy beside it')
    await d.getByRole('button', { name: 'Save changes' }).click(); await settle(d, 2000)
    ok(setting('brand').details.reviewLink === 'https://g.page/r/demo-studio/review' && /Company details saved/.test(await snackText(d)), 'Save keeps it as a web address — https://g.page/r/demo-studio/review')
    ok(await field.inputValue() === 'https://g.page/r/demo-studio/review', '…and the box shows it as kept')
    await shot(d, '04-profile-reviews-1440')
    await D.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {})
    await d.getByTestId('review-link-copy').click(); await settle(d, 500)
    ok(/Review link copied/.test(await snackText(d)), 'Copy: “Review link copied”')
    /* with the link, the message carries it */
    await go(d, `/leads/${BEN}`); a = await askReview(d)
    ok(await sheet(d).getByTestId('maison-proposal').count() === 1 && /you can leave it here: https:\/\/g\.page\/r\/demo-studio\/review/.test(await text(a)) && /It carries your review link, g\.page\/r\/…/.test(await text(a)), 'with the link, the draft carries it — and says so')
    await sheet(d).getByTestId('maison-confirm').click(); await settle(d, 600)
    o = await opened(d)
    ok(o.length === 1 && decodeURIComponent(o[0]).includes('https://g.page/r/demo-studio/review') && /^https:\/\/wa\.me\/6597731968/.test(o[0]), '…Open WhatsApp opens it to Benjamin with the link')
    /* a completed project: Ask for a review on its brief */
    await go(d, `/projects/${SHALINI_P}`)
    ok(await d.getByRole('button', { name: 'Ask for a review' }).count() >= 1, 'a completed project’s brief offers Ask for a review (nothing waits on you)')
    await d.getByRole('button', { name: 'Ask for a review' }).first().click(); await waitPanel(d); await settle(d, 400)
    a = d.locator('[data-testid="maison-answer"],[data-testid="maison-proposal"]').first()
    const projDraft = await text(a)
    ok(/your renovation would mean a lot/.test(projDraft) && /g\.page\/r\/demo-studio\/review/.test(projDraft), `…its draft thanks Shalini for the renovation, with the link${/renovation/.test(projDraft) ? '' : ` — read: ${projDraft.slice(0, 160)}`}`)
    await shot(d, '05-project-ask-review-1440')
    await d.keyboard.press('Escape')
    /* a Designer: no door to a page they may not change, the field read-only */
    as('sarah'); sql(`update settings set value = json_remove(value, '$.details.reviewLink') where key = 'brand'`)
    await go(d, `/leads/${BEN}`); a = await askReview(d)
    ok(/An Owner or an Admin adds the studio’s review page/.test(await text(a)) && await sheet(d).getByTestId('maison-link').count() === 0, 'a Designer, no link: told who adds it — no button to a page they may only read')
    await d.keyboard.press('Escape')
    await go(d, '/company/profile')
    ok(await d.getByTestId('review-link').getByRole('textbox').isDisabled(), '…and reads the Reviews box on Profile, at rest')
    as('dane')

    // ── 4 · Your PayNow ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('4 · Your PayNow, on Your profile')
    const pay0 = sql(`select coalesce(paynow, '') from members where id = 'priya'`)
    as('priya'); await go(d, '/profile')
    const card = d.getByTestId('profile-paynow')
    ok(await card.count() === 1 && await d.getByTestId('profile-members-link').count() === 0, 'Accounting opens Your profile and has Your PayNow (Members is not theirs to open)')
    ok(/Not set yet/.test(await text(card)) && await card.getByRole('button', { name: 'Add PayNow' }).count() === 1, '…not set yet: Add PayNow')
    await card.getByRole('button', { name: 'Add PayNow' }).click(); await settle(d, 600)
    const dlg = d.getByRole('dialog', { name: 'Your PayNow' })
    ok(await dlg.count() === 1, 'the dialog Members opens: “Your PayNow”')
    await dlg.getByLabel('PayNow (UEN or mobile)').fill('1234'); await dlg.getByTestId('member-paynow-save').click(); await settle(d, 600)
    ok(/Enter a mobile number or a UEN/.test(await text(dlg)) && sql(`select coalesce(paynow, '') from members where id = 'priya'`) === pay0, 'a number that is no PayNow ID: refused under the box, nothing saved')
    await dlg.getByLabel('PayNow (UEN or mobile)').fill('9182 7364'); await dlg.getByTestId('member-paynow-save').click(); await settle(d, 1800)
    ok(sql(`select paynow from members where id = 'priya'`) === '91827364' && /Your PayNow is saved/.test(await snackText(d)), 'saved on the member’s own record — “Your PayNow is saved”, with Undo')
    ok(/9182 7364/.test(await text(d.getByTestId('profile-paynow-value'))) && await card.getByRole('button', { name: 'Change' }).count() === 1, '…shown grouped as typed, with Change')
    await shot(d, '06-your-paynow-accounting-1440')
    await undo(d)
    ok(sql(`select coalesce(paynow, '') from members where id = 'priya'`) === pay0 && /Not set yet/.test(await text(card)), 'Undo takes it off again')
    const s2 = await search(d, 'paynow')
    ok(await s2.getByText('Your PayNow', { exact: true }).count() >= 1, '⌘K finds Your PayNow for Accounting')
    await s2.getByText('Your PayNow', { exact: true }).first().click(); await d.waitForURL(/\/profile/); await settle(d, 1200)
    ok(new URL(d.url()).hash === '#paynow' && await inView(d.getByTestId('profile-paynow')), '…and lands on the card')
    as('dane'); await go(d, '/settings')
    ok(await reach(d, 'member-paynow', 'Accounting') === 'own' && await reach(d, 'member-paynow', 'Designer') === 'own' && await reach(d, 'member-paynow', 'Admin') === 'yes', 'Who may do what: Set a member’s PayNow — Owners and Admins anyone’s, everyone else their own')
    /* a Designer: the card and its door to Members for the rest */
    as('germaine'); await go(d, '/profile')
    ok(/9661 4208/.test(await text(d.getByTestId('profile-paynow-value'))) && /New leads and preferences/.test(await text(d.getByTestId('profile-members-link'))), 'a Designer’s card shows her PayNow; the door to Members now names New leads and preferences')
    as('dane'); await go(d, '/company/members')
    const gRow = d.getByTestId('member-row').filter({ hasText: 'Germaine' }).first()
    await gRow.getByTestId('member-paynow-edit').click(); await settle(d, 600)
    ok(await d.getByRole('dialog', { name: 'Germaine’s PayNow' }).count() === 1 && await d.getByRole('dialog', { name: 'Germaine’s PayNow' }).getByLabel('PayNow (UEN or mobile)').inputValue() === '9661 4208', 'Members opens the same dialog for an Owner, starting from her record')
    await d.keyboard.press('Escape'); await settle(d, 400)

    // ── 5 · The studio's registrations, as its brand shows them ──────────────────────────────────────────────────────────────────────
    console.log('5 · CaseTrust on record (R116)')
    const reg = setting('compliance_studio') ?? {}
    ok(reg.CASETRUST_RENOVATION?.done === true && reg.HDB_DRC?.done === true, 'the record holds CaseTrust and the HDB listing, as the brand kit’s badges and the About page’s award show')
    const lastSign = Number(sql(`select coalesce(max(signed_at), 0) from contracts where signature_kind is not null and signed_at * 1000 < ${reg.CASETRUST_RENOVATION?.at ?? 0} + 1`))
    ok(Number(sql(`select count(*) from contracts where signature_kind is not null and signed_at * 1000 > ${reg.CASETRUST_RENOVATION?.at ?? 0} and casetrust_at is null`)) === 0 && lastSign >= 0, 'recorded after the studio’s last signature — no signature lacks the tick it would have needed')
    await go(d, '/company/profile#registrations')
    ok(await d.locator('[data-testid="registration"][data-id="CASETRUST_RENOVATION"]').getAttribute('data-done') === '' && /Dane/.test(await text(d.locator('[data-testid="registration"][data-id="CASETRUST_RENOVATION"]'))), 'Company › Profile shows CaseTrust done, by Dane, and when')
    /* a contract sent now (put back in finally): its signing page carries the disclosure, and the code waits for its tick */
    const C = sql(`select id from contracts where status = 'Draft' and archived_at is null and deleted_at is null and sign_token is not null and body is not null limit 1`)
    /* (S42 B-01, a deliberate change of this rule) a contract out for signature names a quote the client has — its Draft quote would hold the link ("Not ready yet"): approved for this check */
    sql(`update quotes set status = 'Approved' where id = (select from_quote_id from contracts where id = '${C}') and status in ('Draft', 'Sent for Approval')`)
    sql(`update contracts set status = 'Sent to Client', sent_at = strftime('%s','now'), sign_expires_at = strftime('%s','now') + 7 * 86400 where id = '${C}'`)
    const G = await desk(); const g = await page(G, 'sign')
    await go(g, `/sign/${sql(`select sign_token from contracts where id = '${C}'`)}`)
    ok(await g.getByTestId('gate-casetrust').count() === 1 && /CaseTrust-accredited renovation business/.test(await text(g.getByTestId('gate-casetrust'))), 'a sent contract’s signing page carries the CaseTrust disclosure')
    await g.getByTestId('paper-end').scrollIntoViewIfNeeded().catch(() => {}); await settle(g, 600)
    const code = g.getByRole('button', { name: 'Send code' }).first()
    const acceptTick = g.getByTestId('gate-accept')
    if (await acceptTick.count()) { await acceptTick.locator('label, [role="checkbox"], input').first().click({ force: true }); await settle(g, 300) }
    ok(await code.isDisabled(), '…and Send code waits for the CaseTrust tick')
    await g.getByTestId('gate-casetrust-tick').click(); await settle(g, 400)
    ok(await code.isEnabled(), '…ticked, the code can be sent')
    await shot(g, '09-sign-casetrust-1440')
    await G.close()

    // ── 6 · Phones and the narrowest width ──────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 390 · 320')
    for (const w of [390, 320]) {
      const P = await phoneCtx(w, 844); const p = await page(P, `phone-${w}`)
      for (const u of ['/settings', '/settings?section=leads', '/company/profile#reviews', '/profile#paynow']) {
        await go(p, u)
        ok(await sideways(p) <= 0, `${w}: ${u} — no sideways scroll`)
        if (w === 390) await shot(p, `07-${u.replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}-390`)
      }
      if (w === 390) {
        await go(p, '/profile#paynow'); await p.getByTestId('profile-paynow-edit').click(); await settle(p, 800)
        const sh = p.getByRole('dialog', { name: 'Your PayNow' })
        const box = await sh.boundingBox()
        ok(!!box && box.y + box.height >= 844 - 2 && box.width >= 388, '390: Your PayNow opens as a bottom sheet')
        await shot(p, '08-paynow-sheet-390')
        await p.keyboard.press('Escape')
      }
      await P.close()
    }

    await D.close()
    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++
    console.log('  ✗ the probe stopped:', String(e && e.stack || e).slice(0, 600))
  } finally {
    const changed = putBack()
    console.log(`\nput back: ${changed.length ? changed.join(', ') : 'nothing changed'}`)
    await b.close()
    console.log(`\n${pass} passed · ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
