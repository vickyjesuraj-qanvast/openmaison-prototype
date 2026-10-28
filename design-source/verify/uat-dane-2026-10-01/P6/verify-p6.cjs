// Dane's UAT fixes 2026-10-01 — package P6: the shell and the house pieces, plus a few lead surfaces (b-links · b-copy · g-snackbar ·
// g-back-more · g-locked · x-suggest · g-newtab · x-nric · x-return). Run against a production build on a scratch DB copied from the
// demo baseline. It writes (View as, an assignment, an NRIC, the demo plan): re-copy the scratch DB before re-running.
//   DATABASE_URL=file:<scratch.db> npx next start -p 3038
//   TESTDB=<scratch.db> BASE=http://localhost:3038 NODE_PATH=$PWD/node_modules node design-source/verify/uat-dane-2026-10-01/P6/verify-p6.cjs
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const DB = process.env.TESTDB, BASE = process.env.BASE || 'http://localhost:3038', OUT = __dirname
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const host = (page) => page.locator('[role="status"][aria-live="polite"]')
const snackText = (page) => host(page).innerText().catch(() => '')
async function snack(page, re, timeout = 8000) { const t0 = Date.now(); while (Date.now() - t0 < timeout) { const t = await snackText(page); if (re.test(t)) return t; await page.waitForTimeout(100) } return snackText(page) }
/** How long a snackbar matching `re` stays on screen from the moment it is seen (ms), polled every 100ms; `during` runs once it shows. */
async function lifetime(page, re, { max = 16000, during } = {}) {
  const t0 = Date.now(); let seen = 0
  while (Date.now() - t0 < 6000) { if (re.test(await snackText(page))) { seen = Date.now(); break } await page.waitForTimeout(50) }
  if (!seen) return -1
  if (during) await during(seen)
  while (Date.now() - seen < max) { if (!re.test(await snackText(page))) return Date.now() - seen; await page.waitForTimeout(100) }
  return Infinity
}
const shot = (page, n, clip) => page.screenshot({ path: path.join(OUT, `${n}.png`), ...(clip ? { clip } : {}) })
const lead = (name) => sql(`select id from leads where name = '${name}'`)
const PRIMARY = 'rgb(85, 0, 255)'
const KEVIN = lead('Kevin Ng'), OLIVIA = lead('Olivia Martinez'), VIVIEN = lead('Vivien Lee'), GAVIN = lead('Gavin See')
const SIGNED = sql(`select id from contracts where status in ('Sent to Client','Signed') and from_quote_id is not null and deleted_at is null limit 1`)
const XRAY = sql(`select id from quote_comparisons order by created_at desc limit 1`)
const DRAFT_Q = sql(`select id from quotes where status = 'Draft' and deleted_at is null limit 1`)
const SENT_Q = sql(`select id from quotes where status in ('Approved', 'Sent to Client', 'Confirmed') and deleted_at is null limit 1`)
const SHARE = sql(`select token from render_share_links where revoked_at is null limit 1`)

/** Every <a> on the page, as it renders now and as it rendered under the old unlayered `a { color: inherit }` (injected for the
    comparison, then removed). Returns the anchors whose colour or underline differs between the two. */
const linkDiff = (page) => page.evaluate(() => {
  const snap = () => [...document.querySelectorAll('a')].map((a) => { const s = getComputedStyle(a); return `${s.color}|${s.textDecorationLine}` })
  /* a colour transition (the house link has one) would report the starting colour: switch transitions off while measuring */
  const still = document.createElement('style'); still.textContent = '*, *::before, *::after { transition: none !important; }'; document.head.appendChild(still)
  const now = snap()
  const st = document.createElement('style'); st.textContent = 'a { color: inherit; text-decoration: none; }'; document.head.appendChild(st)
  const old = snap(); st.remove(); still.remove()
  const all = [...document.querySelectorAll('a')]
  const diffs = all.map((a, i) => ({ a, i })).filter(({ i }) => now[i] !== old[i]).map(({ a, i }) => ({ cls: String(a.className), now: now[i], old: old[i], text: (a.textContent || '').trim().slice(0, 40) }))
  return { count: all.length, diffs }
})
/* (the calm UI build 2026-10-27, a deliberate change — audit 1-40) the studio block's menu holds the demo's tools under one "Demo" fold (View as ·
   plan · studios), closed until pressed and remembered per browser (`om.viewas.demo`): open it when it is closed, then pick the member */
const openDemo = async (page) => {
  const m = page.locator('[role="menu"][aria-label="View as"], [role="dialog"][aria-label="View as"], [role="dialog"][aria-label="You"]').first()
  await m.waitFor({ timeout: 8000 }).catch(() => {})
  const f = m.getByTestId('demo-fold')
  if (await f.count() && (await f.getAttribute('aria-expanded')) !== 'true') { await f.click(); await page.waitForTimeout(300) }
}
const viewAs = async (page, who) => {
  await page.getByRole('button', { name: /Demo Studio.*View as/ }).click()
  await openDemo(page)
  await page.getByRole('menuitemradio', { name: new RegExp(`^${who}\\b`) }).first().click()
  await snack(page, new RegExp(`Viewing as ${who}`)); await page.waitForTimeout(800)
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  page.setDefaultTimeout(12000)

  /* ── b-links: the house text link keeps its primary on an <a>; nothing else changed colour ── */
  await step('b-links', async () => {
    await page.goto(`${BASE}/sign/${SIGNED}`); await ready(page)
    const q = page.getByTestId('view-quote').first()
    ok('b-links the signing page’s quote link is the primary', (await q.evaluate((e) => getComputedStyle(e).color)) === PRIMARY, await q.evaluate((e) => getComputedStyle(e).color))
    const order = await page.evaluate(() => { const out = []; for (const s of document.styleSheets) { try { for (const r of s.cssRules) { if (r.constructor.name === 'CSSLayerStatementRule') out.push(...r.nameList); else if (r.constructor.name === 'CSSLayerBlockRule' && r.name) out.push(r.name) } } catch {} } return [...new Set(out)] })
    ok('b-links om-reset is the first named layer, below every house layer', order[0] === 'om-reset' && order.includes('om-text-link'), order.join(' < '))
    await q.scrollIntoViewIfNeeded(); const box = await q.boundingBox()
    await shot(page, 'b-links-signing-quote-link', { x: Math.max(0, box.x - 24), y: Math.max(0, box.y - 60), width: 720, height: 140 })
    await page.goto(`${BASE}/quote-x-ray/${XRAY}`); await ready(page)
    const xr = await page.evaluate(() => [...document.querySelectorAll('a[class*="xray-result-module"][class*="__link"]')].map((a) => getComputedStyle(a).color))
    ok('b-links X-Ray’s caption links are the primary', xr.length > 0 && xr.every((c) => c === PRIMARY), xr.join(', '))
    await shot(page, 'b-links-xray-caption', { x: 0, y: 0, width: 1440, height: 260 })
    await page.goto(`${BASE}/settings`); await ready(page)
    const hl = await page.evaluate(() => [...document.querySelectorAll('a[class*="help-link-module"]')].map((a) => getComputedStyle(a).color))
    ok('b-links a HelpLink is the primary', hl.length > 0 && hl.every((c) => c === PRIMARY), hl.join(', '))
    await page.goto(`${BASE}/company/templates`); await ready(page)
    const used = await page.evaluate(() => [...document.querySelectorAll('a[class*="usedLink"], button[class*="usedLink"]')].map((a) => getComputedStyle(a).color))
    ok('b-links quote templates’ “Used by” is the primary', used.length > 0 && used.every((c) => c === PRIMARY), used.join(', '))
    /* every other anchor: the same colour and underline as under the old unlayered reset — only house text links moved */
    const pages = ['/leads', `/leads/${KEVIN}`, `/leads/${KEVIN}/activity`, '/tasks', '/quotes', '/contracts', '/company/members', '/company/templates', '/company/price-book', '/settings', `/sign/${SIGNED}`, `/quote-x-ray/${XRAY}`, `/confirm/${SENT_Q}`, `/renders/${SHARE}`]
    let anchors = 0, moved = 0; const strays = []
    for (const u of pages) {
      await page.goto(BASE + u); await ready(page); await page.mouse.move(1430, 1010)
      const d = await linkDiff(page)
      anchors += d.count; moved += d.diffs.length
      for (const x of d.diffs) if (!/text-link-module/.test(x.cls) || x.now.split('|')[1] !== x.old.split('|')[1] || !/^rgb\((85, 0, 255|153, 153, 153)\)\|/.test(x.now)) strays.push(`${u}: ${x.cls} ${x.old} → ${x.now} “${x.text}”`)
    }
    ok(`b-links only house text links changed — to the primary; every other anchor keeps its colour and underline (${anchors} anchors on ${pages.length} pages, ${moved} house links)`, strays.length === 0 && anchors > 100, strays.slice(0, 4).join(' ¦ '))
    await page.goto(`${BASE}/leads`); await ready(page)
    await shot(page, 'b-links-plain-anchors-listing')
  })

  /* ── b-copy: no Clipboard API (plain http on a LAN address) — Copy still copies, a failed copy says so, ids still made ── */
  await step('b-copy', async () => {
    const insecure = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
    await insecure.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, get: () => undefined })
      try { Object.defineProperty(Crypto.prototype, 'randomUUID', { configurable: true, value: undefined }) } catch {}
      window.__copies = []
      document.addEventListener('copy', () => { const a = document.activeElement; window.__copies.push(a && 'value' in a ? a.value.slice(a.selectionStart, a.selectionEnd) : String(document.getSelection())) }, true)
    })
    const p = await insecure.newPage(); p.setDefaultTimeout(12000)
    const errors = []; p.on('pageerror', (e) => errors.push(e.message))
    await p.goto(`${BASE}/leads/${GAVIN}`); await ready(p)
    ok('b-copy the simulated page has no Clipboard API and no crypto.randomUUID', await p.evaluate(() => navigator.clipboard === undefined && typeof crypto.randomUUID !== 'function'))
    /* the lead's kebab › Copy Link (a direct copy) */
    await p.getByRole('button', { name: 'More options' }).first().click()
    await p.getByRole('menuitem', { name: 'Copy Link' }).click()
    const t1 = await snack(p, /Link copied|Couldn’t copy/)
    const c1 = await p.evaluate(() => window.__copies.slice(-1)[0] || '')
    ok('b-copy the lead’s Copy Link copies through the fallback', /Link copied/.test(t1) && c1.endsWith(`/leads/${GAVIN}`), `${t1.trim()} · copied “${c1}”`)
    /* Invite to Portal › Copy. (REG-966, Projects round 4a) Invite to Portal now opens the Client access panel in place of the bare Invite
       dialog; its "Their page" Copy goes through copyText (the same fallback) and says "Address copied". */
    await p.getByRole('button', { name: 'More options' }).first().click()
    await p.getByRole('menuitem', { name: /^(Client portal|Invite to Portal)$/ }).click() /* (the calm UI build 2026-10-27, a deliberate change) the menu row reads "Client portal" (3-25 · W-218) */
    const dlg = p.getByRole('dialog', { name: /^(Client portal|Invite to Portal)$/ }).last()   /* (the calm UI build 2026-10-27, a deliberate change) the panel's title is "Client portal" (3-25) */   // (one-home N-15, a deliberate change of this rule) the panel's title is "Invite to Portal" now
    await dlg.getByTestId('access-address').waitFor()
    await dlg.getByRole('button', { name: 'Copy', exact: true }).click()
    const t2 = await snack(p, /Address copied|Couldn’t copy/)
    const c2 = await p.evaluate(() => window.__copies.slice(-1)[0] || '')
    ok('b-copy Invite to Portal’s Copy copies the portal’s address through the fallback', /Address copied/.test(t2) && /^https?:\/\/[^/]+\/my\/[^/]+$/.test(c2), `${t2.trim()} · copied “${c2}”`)
    await shot(p, 'b-copy-invite-copied')
    await p.keyboard.press('Escape'); await p.waitForTimeout(400)
    /* the quote editor's Copy confirmation link — `navigator.clipboard?.…` used to do nothing here */
    await p.goto(`${BASE}/quotes/${DRAFT_Q}`); await ready(p); await p.mouse.move(1430, 300)
    await p.getByRole('button', { name: 'More options' }).first().click()
    await p.getByRole('menuitem', { name: 'Copy confirmation link' }).click()
    const t3 = await snack(p, /Confirmation link copied|Couldn’t copy/)
    const c3 = await p.evaluate(() => window.__copies.slice(-1)[0] || '')
    ok('b-copy the quote’s confirmation link copies (it was silent)', /Confirmation link copied/.test(t3) && c3.includes(`/confirm/${DRAFT_Q}`), c3)
    /* a copy that still fails says so */
    await p.goto(`${BASE}/leads/${GAVIN}`); await ready(p)
    await p.evaluate(() => { document.execCommand = () => false })
    await p.getByRole('button', { name: 'More options' }).first().click()
    await p.getByRole('menuitem', { name: 'Copy Link' }).click()
    ok('b-copy a copy that fails shows the house failure line', /Couldn’t copy — please try again/.test(await snack(p, /Couldn’t copy/)))
    await shot(p, 'b-copy-failure-snackbar', { x: 0, y: 824, width: 760, height: 200 })
    /* Add an entity makes an id without crypto.randomUUID — (the calm UI build 2026-10-27, a deliberate change — audit 5-36) Company › Profile is
       four tabs on one page; Issuing entities & bank details is `?tab=entities` */
    await p.goto(`${BASE}/company/profile?tab=entities`); await ready(p)
    const before = await p.locator('input').count()
    await p.getByRole('button', { name: 'Add an entity' }).click(); await p.waitForTimeout(500)
    ok('b-copy Add an entity works without crypto.randomUUID', (await p.locator('input').count()) > before && !errors.some((e) => /randomUUID/.test(e)), errors.join(' | '))
    await insecure.close()
    /* lib/uid.ts in Node with no randomUUID: an RFC 4122 v4 id */
    const id = execSync(`npx tsx -e "Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true }); import('./lib/uid.ts').then((m) => console.log(m.newId()))"`, { cwd: path.join(__dirname, '../../../..') }).toString().trim()
    ok('b-copy newId falls back to a v4 id from getRandomValues', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id), id)
  })

  /* ── g-snackbar: 4 s plain · 8 s with an action or wrapped words · held while hovered, pressed or focused · the action on one line ── */
  await step('g-snackbar', async () => {
    /* (pending modules S22, a deliberate change of this rule) the rail's Dashboard is live — the plain "Coming soon" now comes from Qanvast Ops'
       Lead credits tab (Qanvast's own product, a signpost)
       (pending modules S41b-5, a deliberate change of this rule) Lead credits is live now (1.0's Qanvast line's Credits) — the plain
       "Coming soon" comes from the same page's Request Leads, still a signpost (REG-193) */
    await page.goto(`${BASE}/qanvast-ops`); await ready(page); await page.mouse.move(1430, 100)
    /* (the calm UI build 2026-10-27, a deliberate change) B2 2-27: Request leads is the header ⋮'s row (`qanvast-request-leads`) — it still says Coming soon */
    await page.getByRole('button', { name: 'More options' }).first().click(); await page.waitForTimeout(300)
    const soon = page.getByTestId('qanvast-request-leads').first()
    await soon.click(); await page.mouse.move(1430, 100)
    const plain = await lifetime(page, /Coming soon in OpenMaison 2\.0/)
    ok('g-snackbar a plain one-line message stays 4 s', plain > 3700 && plain < 4800, `${plain} ms`)
    /* hovered: the clock stops; it runs on with what was left — (the calm UI build 2026-10-27) the row's press closed the ⋮: open it again */
    await page.getByRole('button', { name: 'More options' }).first().click(); await page.waitForTimeout(300)
    await soon.click(); await page.mouse.move(1430, 100)
    let held = false
    const hovered = await lifetime(page, /Coming soon in OpenMaison 2\.0/, { during: async (seen) => {
      await page.waitForTimeout(1000); const b = await host(page).locator('div').first().boundingBox(); await page.mouse.move(b.x + 60, b.y + b.height / 2)
      await page.waitForTimeout(5000); held = /Coming soon/.test(await snackText(page)); await page.mouse.move(1430, 100)
    } })
    ok('g-snackbar hovered, it waits; let go, it runs on (≥ 2 s)', held && hovered > 8500 && hovered < 10500, `${hovered} ms (hover 1 s → 6 s)`)
    /* wrapped words: the quote's long confirmation line, no action */
    await page.goto(`${BASE}/quotes/${DRAFT_Q}`); await ready(page); await page.mouse.move(1430, 300)
    await page.getByRole('button', { name: 'More options' }).first().click()
    await page.getByRole('menuitem', { name: 'Copy confirmation link' }).click(); await page.mouse.move(1430, 300)
    let wrapH = 0
    const wrapped = await lifetime(page, /Confirmation link copied — it opens/, { during: async () => { wrapH = await host(page).locator('div > span').first().evaluate((e) => e.offsetHeight) } })
    ok('g-snackbar a message that wraps stays 8 s', wrapH > 30 && wrapped > 7700 && wrapped < 8800, `${wrapped} ms, message ${wrapH}px tall`)
    /* an action: View as James — "Back to Dane" */
    await page.goto(`${BASE}/leads`); await ready(page)
    await page.getByRole('button', { name: /Demo Studio.*View as/ }).click()
    await openDemo(page)   // (the calm UI build 2026-10-27, a deliberate change) 1-40: View as is under the Demo fold
    await page.getByRole('menuitemradio', { name: /^James\b/ }).first().click(); await page.mouse.move(1430, 100)
    let act = null
    const withAction = await lifetime(page, /Viewing as James/, { during: async () => {
      act = await host(page).getByRole('button', { name: 'Back to Dane' }).evaluate((b) => { const s = getComputedStyle(b); return { ws: s.whiteSpace, fs: s.flexShrink, h: b.getBoundingClientRect().height } })
      await page.waitForTimeout(500)
      await shot(page, 'g-snackbar-action-one-line', { x: 0, y: 860, width: 760, height: 164 })
    } })
    ok('g-snackbar a message with an action stays 8 s', withAction > 7700 && withAction < 8800, `${withAction} ms`)
    ok('g-snackbar the action keeps to one line (nowrap, never shrinks)', act && act.ws === 'nowrap' && act.fs === '0' && act.h <= 36, JSON.stringify(act))
    /* focus inside: a keyboard user on the action holds it */
    await viewAs(page, 'Dane')
    await page.waitForTimeout(8500)
    await viewAs(page, 'James'); await page.mouse.move(1430, 100)
    let focusHeld = false, afterBlur = -1
    await lifetime(page, /Viewing as James/, { max: 20000, during: async (seen) => {
      await page.waitForTimeout(6000 - (Date.now() - seen))
      await host(page).getByRole('button', { name: 'Back to Dane' }).focus()
      await page.waitForTimeout(6000); focusHeld = /Viewing as James/.test(await snackText(page))
      await page.evaluate(() => document.activeElement && document.activeElement.blur())
      const b0 = Date.now(); while (Date.now() - b0 < 6000) { if (!/Viewing as James/.test(await snackText(page))) { afterBlur = Date.now() - b0; break } await page.waitForTimeout(100) }
    } })
    ok('g-snackbar focus inside holds it; focus out, it runs on', focusHeld && afterBlur > 1700 && afterBlur < 3000, `held past 12 s: ${focusHeld}, gone ${afterBlur} ms after blur`)
  })

  /* ── g-locked: as James (a Manager), members outside his team look disabled ── */
  await step('g-locked', async () => {
    await page.goto(`${BASE}/leads/${KEVIN}`); await ready(page)
    ok('g-locked viewing as James', /James/.test(await page.getByRole('button', { name: /Demo Studio.*View as/ }).getAttribute('aria-label')))
    await page.locator('aside[aria-label="Lead info"] [data-kb="assign"]').first().click()
    const pop = page.getByRole('dialog', { name: 'Assign Member' }); await pop.waitFor(); await page.waitForTimeout(400)
    const row = (n) => pop.locator('[class*="rowName"]', { hasText: new RegExp(`^${n}$`) }).locator('xpath=ancestor::button[1]')
    const look = (r) => r.evaluate((b) => { const tok = document.createElement('span'); tok.style.color = 'var(--om-color-on-surface-disabled)'; document.body.appendChild(tok); const dis = getComputedStyle(tok).color; tok.remove()
      return { locked: b.hasAttribute('data-locked'), avatar: getComputedStyle(b.firstElementChild).opacity, name: getComputedStyle(b.querySelector('[class*="rowName"]')).color, dis } })
    const dane = await look(row('Dane')), sarah = await look(row('Sarah'))
    ok('g-locked a row outside the team: avatar at 50%, the name in the disabled ink', dane.locked && dane.avatar === '0.5' && dane.name === dane.dis, JSON.stringify(dane))
    ok('g-locked a row in the team stays at full strength', !sarah.locked && sarah.avatar === '1' && sarah.name !== sarah.dis, JSON.stringify(sarah))
    await row('Dane').hover(); await page.waitForTimeout(250)
    const lockedFill = await row('Dane').evaluate((b) => getComputedStyle(b).backgroundColor)
    await row('Sarah').hover(); await page.waitForTimeout(250)
    const openFill = await row('Sarah').evaluate((b) => getComputedStyle(b).backgroundColor)
    ok('g-locked a locked row takes no hover fill; an open one does', lockedFill === 'rgba(0, 0, 0, 0)' && openFill !== 'rgba(0, 0, 0, 0)', `${lockedFill} · ${openFill}`)
    await row('Dane').hover()
    const pb = await pop.boundingBox(); await shot(page, 'g-locked-assign-as-james', { x: pb.x - 8, y: pb.y - 8, width: pb.width + 16, height: pb.height + 16 })
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    await viewAs(page, 'Dane')
  })

  /* ── x-suggest: "Assign to {name}" assigns at once ── */
  await step('x-suggest', async () => {
    await page.goto(`${BASE}/leads/${OLIVIA}`); await ready(page)
    await page.locator('aside[aria-label="Lead info"] [data-kb="assign"]').first().click()
    const pop = page.getByRole('dialog', { name: 'Assign Member' }); await pop.waitFor(); await page.waitForTimeout(400)
    const box = pop.getByTestId('assign-suggestion')
    const who = ((await box.innerText()).match(/Suggested: ([^\n]+)/) || [])[1]?.trim()   // (the calm UI build 2026-10-27, a deliberate change) 2-41: "Suggested: Sarah" 
    await shot(page, 'x-suggest-box', await pop.boundingBox().then((b) => ({ x: b.x - 8, y: b.y - 8, width: b.width + 16, height: b.height + 16 })))
    await box.getByRole('button', { name: `Assign ${who}`, exact: true }).click()   // (the calm UI build 2026-10-27, a deliberate change) 2-41: "Assign Sarah"
    const t = await snack(page, /Members saved|Couldn’t/)   // (the calm UI build 2026-10-27, a deliberate change) 2-34: "Members saved" 
    await page.waitForTimeout(600)
    const ids = sql(`select group_concat(m.name) from lead_assignees a join members m on m.id = a.member_id where a.lead_id = '${OLIVIA}'`)
    ok('x-suggest one press assigns the suggested member (same snackbar as Assign)', !!who && /Members saved/.test(t) && ids === who && (await pop.count()) === 0, `${who} → ${ids} · ${t.trim()}`)
  })

  /* ── g-newtab: Open existing lead → a new tab; the form stays as typed ── */
  await step('g-newtab', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    /* (the calm UI build 2026-10-27, a deliberate change) B2 2-33 · W-475: New lead ▾ › Type in a lead opens "New lead" (Name* · Mobile number*, Add lead); the duplicate's title "Already in your leads" */
    await page.getByRole('button', { name: 'New lead' }).click()
    await page.getByRole('menuitem', { name: /^Type in a lead/ }).click()
    const form = page.getByRole('dialog', { name: 'New lead' }); await form.waitFor(); await page.waitForTimeout(400)
    await form.getByLabel('Name*', { exact: true }).fill('Probe Duplicate')
    await form.getByLabel('Mobile number*', { exact: true }).fill('91238803')
    await form.getByRole('button', { name: 'Add lead', exact: true }).click()
    const dup = page.getByRole('dialog').filter({ hasText: /A lead with this phone already exists|Already in your leads/ }).last(); await dup.waitFor()
    await shot(page, 'g-newtab-duplicate-warning')
    const [tab] = await Promise.all([ctx.waitForEvent('page'), dup.getByRole('button', { name: 'Open existing lead' }).click()])
    await tab.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    ok('g-newtab Open existing lead opens it in a new tab', tab.url().includes(`/leads/${lead('Kenji Sato')}`), tab.url())
    ok('g-newtab the form stays open with what was typed; the warning closes', (await dup.count()) === 0 && (await form.isVisible()) && (await form.getByLabel('Name*', { exact: true }).inputValue()) === 'Probe Duplicate' /* (the calm UI build 2026-10-27, a deliberate change) "Name*" */ && /9123 8803/.test(await form.getByLabel('Mobile number*', { exact: true }).inputValue()) /* (the calm UI build 2026-10-27, a deliberate change) 2-49: the phone is "Mobile number" */)
    await tab.close()
    await shot(page, 'g-newtab-form-kept')
    await form.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300)
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog').filter({ hasText: /Discard|discard/ }))
    if (await confirm.count()) { const d = confirm.last().getByRole('button', { name: /Discard/ }); if (await d.count()) await d.first().click() }
  })

  /* ── x-nric: masked in the info column and in Activity; Owners and Admins may Show it ── */
  await step('x-nric', async () => {
    await page.goto(`${BASE}/leads`); await ready(page)
    if (!/^Demo Studio\. View as$/.test(await page.getByRole('button', { name: /Demo Studio.*View as/ }).getAttribute('aria-label'))) await viewAs(page, 'Dane')
    sql(`update leads set ic_number = 'S1234567D' where id = '${VIVIEN}'`)
    sql(`insert into lead_events (id, lead_id, kind, actor_id, at, detail) values ('probe-nric-ev', '${VIVIEN}', 'field_edited', 'dane', strftime('%s','now'), '{"fields":[{"key":"icNumber","label":"NRIC / FIN","from":"—","to":"S1234567D"}]}')`)
    await page.goto(`${BASE}/leads/${VIVIEN}`); await ready(page)
    const cell = page.getByTestId('lead-nric')
    ok('x-nric the info column shows it masked, with Show for the Owner', (await cell.innerText()).startsWith('•••••567D') && (await cell.getByRole('button', { name: 'Show NRIC / FIN' }).count()) === 1, await cell.innerText())
    await shot(page, 'x-nric-masked-owner', await cell.boundingBox().then((b) => ({ x: 0, y: b.y - 220, width: 380, height: 300 })))
    await cell.getByRole('button', { name: 'Show NRIC / FIN' }).click()
    ok('x-nric Show reveals it for this view', (await cell.innerText()).trim() === 'S1234567D')
    await shot(page, 'x-nric-shown-owner', await cell.boundingBox().then((b) => ({ x: 0, y: b.y - 220, width: 380, height: 300 })))
    await page.goto(`${BASE}/leads/${VIVIEN}/activity`); await ready(page)
    const body = await page.locator('main').innerText()
    ok('x-nric Activity’s edit line shows it masked (an older full one too)', /NRIC \/ FIN: — → •••••567D/.test(body) && !/S1234567D/.test(body))
    /* an edit made now is logged masked */
    await page.goto(`${BASE}/leads/${VIVIEN}`); await ready(page)
    await page.getByRole('button', { name: 'Edit lead' }).click()
    const form = page.getByRole('dialog', { name: 'Edit Lead' }); await form.waitFor(); await page.waitForTimeout(400)
    if (!(await form.getByLabel('NRIC / FIN').count())) await form.getByRole('button', { name: /Additional info/ }).click()
    await form.getByLabel('NRIC / FIN').fill('T7654321J')
    await form.getByRole('button', { name: 'Save', exact: true }).click()
    await page.waitForTimeout(1500)
    const logged = sql(`select detail from lead_events where lead_id = '${VIVIEN}' and kind = 'field_edited' and id <> 'probe-nric-ev' order by at desc limit 1`)
    ok('x-nric an edit is logged with the NRIC masked', /•••••321J/.test(logged) && !/T7654321J/.test(logged) && sql(`select ic_number from leads where id = '${VIVIEN}'`) === 'T7654321J', logged)
    await viewAs(page, 'Sarah')
    await page.goto(`${BASE}/leads/${VIVIEN}`); await ready(page)
    ok('x-nric a Designer sees it masked, with no Show', (await cell.innerText()).trim() === '•••••321J' && (await cell.getByRole('button').count()) === 0, await cell.innerText())
    await shot(page, 'x-nric-masked-designer', await cell.boundingBox().then((b) => ({ x: 0, y: b.y - 220, width: 380, height: 300 })))
    await viewAs(page, 'Dane')
  })

  /* ── x-return: the attachments label says it is optional ── */
  await step('x-return', async () => {
    await page.goto(`${BASE}/leads/${GAVIN}`); await ready(page)
    await page.getByRole('button', { name: 'More options' }).first().click()
    await page.getByRole('menuitem', { name: /^(Return Lead|Return to Qanvast)/ }).click()   // (the calm UI build 2026-10-27, a deliberate change) B2: "Return to Qanvast"
    const wiz = page.getByTestId('return-wizard'); await wiz.waitFor()
    // (leads on the move, a deliberate change of this rule — L3 · A-29, return-lead-wizard.tsx's 'late' step): a lead past Qanvast's 30 days
    // opens on the late-return notice first; the demo's Gavin See arrived 56 days before the demo day, so the probe goes on as a late return
    const late = wiz.getByRole('button', { name: 'Return it anyway' })
    if (await late.count()) { await late.click(); await page.waitForTimeout(400) }
    await wiz.getByLabel('Select a reason').click()
    await page.getByRole('option', { name: 'Lead is junk/spam' }).click(); await page.waitForTimeout(400)
    const label = wiz.getByText(/^Attach images\/screenshots of all your attempts/)
    ok('x-return “Attach images/screenshots of all your attempts (optional)”', (await label.innerText()).trim() === 'Attach images/screenshots of all your attempts (optional)', await label.innerText())
    await shot(page, 'x-return-optional-label')
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  })

  /* ── g-back-more (phone 390): More › Company / View as / AI credits lead back to More ── */
  await step('g-back-more', async () => {
    const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    const p = await phone.newPage(); p.setDefaultTimeout(12000)
    await p.goto(`${BASE}/leads`); await ready(p)
    const more = () => p.getByRole('dialog', { name: 'More' })
    const openMore = async () => { await p.locator('nav[aria-label="Primary"] button[aria-haspopup="dialog"]').tap(); await more().waitFor(); await p.waitForTimeout(450) }
    for (const [row, title] of [[/^Company/, 'Company'], [/^View as/, 'View as']]) {
      await openMore()
      await more().getByRole('button', { name: row }).first().tap()
      const sheet = p.getByRole(title === 'Company' ? 'menu' : 'menu', { name: title }).last(); await sheet.waitFor(); await p.waitForTimeout(450)
      const back = sheet.getByRole('button', { name: 'Back' })
      ok(`g-back-more ${title} carries Back`, (await back.count()) === 1)
      await p.screenshot({ path: path.join(OUT, `g-back-more-${title === 'Company' ? 'company' : 'view-as'}-390.png`) })
      await back.tap(); await p.waitForTimeout(600)
      ok(`g-back-more ${title} › Back returns to More`, (await more().count()) === 1 && (await sheet.count()) === 0)
      await p.screenshot({ path: path.join(OUT, `g-back-more-${title === 'Company' ? 'company' : 'view-as'}-back-390.png`) })
      await more().getByRole('button', { name: 'Close', exact: true }).tap(); await p.waitForTimeout(500)
      ok(`g-back-more after ${title} › Back › Close the page scrolls again`, (await p.evaluate(() => document.body.style.overflow)) === '')
    }
    /* AI credits: the studio on Pro (View as › Studio plan · demo only), then More › the credits row */
    await openMore()
    await more().getByRole('button', { name: /^View as/ }).first().tap()
    const va = p.getByRole('menu', { name: 'View as' }).last(); await va.waitFor(); await p.waitForTimeout(400)
    await va.getByRole('menuitemradio', { name: /^Pro — Studio\b/ }).first().tap()
    await snack(p, /Studio plan: /); await p.waitForTimeout(1200)
    await openMore()
    await more().getByRole('button', { name: /AI credits/ }).first().tap()
    const cs = p.getByRole('dialog', { name: 'AI credits' }).last(); await cs.waitFor(); await p.waitForTimeout(450)
    ok('g-back-more AI credits carries Back', (await cs.getByRole('button', { name: 'Back' }).count()) === 1)
    await p.screenshot({ path: path.join(OUT, 'g-back-more-credits-390.png') })
    await cs.getByRole('button', { name: 'Back' }).tap(); await p.waitForTimeout(600)
    ok('g-back-more AI credits › Back returns to More', (await more().count()) === 1 && (await cs.count()) === 0)
    await more().getByRole('button', { name: 'Close', exact: true }).tap(); await p.waitForTimeout(500)

    /* g-snackbar on a phone: a finger held on it holds it */
    const cdp = await phone.newCDPSession(p)
    // (pending modules S22, a deliberate change of this rule) the dock's Dashboard is live — Qanvast Ops' Lead credits tab says Coming soon
    // (pending modules S41b-5, a deliberate change of this rule) Lead credits is live — Request Leads says Coming soon
    await p.goto(`${BASE}/qanvast-ops`); await p.waitForTimeout(1500)
    await p.getByRole('button', { name: 'More options' }).first().tap(); await p.waitForTimeout(400)   // (the calm UI build 2026-10-27, a deliberate change) B2 2-27: Request leads is the header ⋮'s row
    await p.getByTestId('qanvast-request-leads').first().tap()
    let pressHeld = false
    const touched = await lifetime(p, /Coming soon in OpenMaison 2\.0/, { max: 20000, during: async () => {
      await p.waitForTimeout(1000)
      const b = await host(p).locator('div').first().boundingBox(); const pt = { x: Math.round(b.x + 40), y: Math.round(b.y + b.height / 2) }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] })
      await p.waitForTimeout(5000); pressHeld = /Coming soon/.test(await snackText(p))
      await p.screenshot({ path: path.join(OUT, 'g-snackbar-held-by-touch-390.png') })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } })
    ok('g-snackbar a finger held on it holds it; lifted, it runs on', pressHeld && touched > 8500 && touched < 10500, `${touched} ms (touch 1 s → 6 s)`)
    await phone.close()
  })

  await browser.close()
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${results.length - failed.length}/${results.length} PASS`)
  process.exit(failed.length ? 1 : 0)
})()
