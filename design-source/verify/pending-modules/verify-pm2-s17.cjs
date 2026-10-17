// Pending modules, step S17 · Consistency leftovers (the owner's "build all of them but one after the other", 2026-10-11; survey key
// held:consistency-leftovers — 2.0's own consistency programme, REG-725…729, REG-1360…1380, and the ghosts' rule REG-708). Each item asserted as
// the rule it builds, never another round's count:
//  - side panels have one width scale — narrow 360 · standard 400 · wide 480 · widest 560 (`PANEL_WIDTH`, components/om/drawer.tsx): every
//    Drawer in the source names a step (no number); Column settings opens at 400, the keyboard panel at 360
//  - a tall xl dialog has one height — `--om-modal-xl-height` 928, capped by the xxl margin: Create Quote, the Import wizard and the brand kit's
//    sample quote all stand 928 on a tall window (Create Quote and the sample quote were 960) and the window less 96 on a short one
//  - Custom fields and the Question bank are one definitions list (components/om/definition-list.tsx): both tables wear its classes, keep their
//    names and labels; the Add / Edit form is one form that closes only once its save lands — refused, it stays open with what was typed and the
//    snackbar names what failed; saved, the new row is there; the remove asks first and the row goes
//  - one spelling, "3D" (the mock's Create links 732 and 1.0's): the Tools tile, the lead's Create link and the planner's title say "3D Space
//    Planner"; no "3-D" left in the app's source
//  - the ghosts draw the page as it now looks at 390 touch and at 1440 (REG-708): on Settings' six modules, Company › Profile · Members ·
//    Questionnaire · Integrations · Plan & AI credits · Client portal · Brand kit · the libraries · Price book · Materials · Finance · Reports and
//    Your profile, the first screen's blocks stand where the page's land (≤ 4px, the held reveal against the page under it); every sentence a
//    ghost writes in a page's own class is on that page; a phone's labelled cells take their names' room
//  - 390 and 320 have no sideways scroll against screen.width on the four pages S15 named; no page errors
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s17.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s17')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const REPO = path.resolve(__dirname, '../../..')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/["$`\\]/g, (c) => `\\${c}`)}"`, { maxBuffer: 1 << 28 }).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name, more = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, more ? `— ${more}` : '') } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const PROBE_FIELD = 'S17 probe field'
const PROBE_QUESTION = 'S17 probe question?'

/* the source, read once — app · components · lib */
const SRC = []
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name !== 'node_modules') walk(p) } else if (/\.(tsx?|css)$/.test(f.name)) SRC.push([path.relative(REPO, p), fs.readFileSync(p, 'utf8')]) } }
for (const d of ['app', 'components', 'lib']) walk(path.join(REPO, d))

/* The ghost-vs-page measure: in the held reveal (PageReveal's ghost over the page, its first paint faked days away) every element carrying a page
   module's class, ghost and page, index by index after aligning the two lists (a head cell sharing a row's class shifts one); `blocks` names the
   classes compared (module.name), the first screen only. Also: every Words sentence the ghost sets in a page class, against that page's. */
async function measure(b, opts, url, blocks, max = 40, screens = 1.5) {
  const c = await b.newContext(opts)
  await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)))
  await p.goto(BASE + url, { waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(2200)
  const out = await p.evaluate(({ blocks, max, screens }) => {
    const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
    if (!reveal) return { none: true }
    const content = reveal.querySelector(':scope > [data-ready]'), ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c)))
    if (!ghost || !content) return { none: true }
    const keyOf = (el) => [...el.classList].filter((c) => /-module__/.test(c) && !/^(ghost-kit|skeleton|page-reveal)-module/.test(c)).map((c) => c.replace(/-module__[A-Za-z0-9_-]{6}__/, '.'))
    const collect = (root) => {
      const map = new Map()
      for (const el of root.querySelectorAll('*')) {
        const ks = keyOf(el); if (!ks.length) continue
        const r = el.getBoundingClientRect(); if (!r.width && !r.height) continue
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue
        for (const k of ks) { if (!blocks.includes(k)) continue; if (!map.has(k)) map.set(k, []); map.get(k).push([Math.round(r.left), Math.round(r.top + scrollY)]) }
      }
      return map
    }
    const g = collect(ghost), q = collect(content), rows = []
    for (const [k, gs] of g) {
      const ps = q.get(k); if (!ps) continue
      let best = 0, bestCost = Infinity
      for (let o = -2; o <= 2; o++) { let cost = 0, n = 0; for (let i = 0; i < gs.length && n < 4; i++) { const pp = ps[i + o]; if (!pp) continue; cost += Math.abs(pp[1] - gs[i][1]) + Math.abs(pp[0] - gs[i][0]); n++ } if (n && cost / n + Math.abs(o) * 2 < bestCost) { bestCost = cost / n + Math.abs(o) * 2; best = o } }
      for (let i = 0; i < Math.min(gs.length, max); i++) { const a = gs[i], pp = ps[i + best]; if (!pp || a[1] > innerHeight * screens) continue; rows.push({ k, i, dy: pp[1] - a[1], dx: pp[0] - a[0], gy: a[1] }) }
    }
    /* the ghost's sentences in a page class — its Words (the ghost kit's .words) — against the page's elements of that class */
    const words = []
    const pageText = new Map()
    for (const el of content.querySelectorAll('*')) for (const k of keyOf(el)) { if (!pageText.has(k)) pageText.set(k, []); pageText.get(k).push(el.textContent.replace(/\s+/g, ' ').trim()) }
    for (const el of ghost.querySelectorAll('[class*="ghost-kit-module__"][class*="__words"]')) {
      const ks = keyOf(el); if (!ks.length) continue
      const t = el.textContent.replace(/\s+/g, ' ').trim()
      if (!ks.some((k) => (pageText.get(k) || []).includes(t))) words.push(`[${ks[0]}] “${t.slice(0, 90)}”`)
    }
    return { rows, words, sideways: document.documentElement.scrollWidth - screen.width }
  }, { blocks, max, screens })
  await c.close()
  return { ...out, errs }
}

const SETTINGS = ['settings.setting', 'settings.eventRow', 'settings.sectionHead', 'document-numbers.row', 'settings.cardGroup']
const GALLERY = ['library-gallery.bar', 'folder-card.group', 'quote-templates-gallery.card']
const FIN = ['finance.toolbar', 'finance.phoneTools', 'plan.sectionHead', 'books.block', 'books.head', 'integrations-view.card']
const ROUTES = [
  /* the four S15 named, then every other Settings module */
  { key: 'settings-notifications', path: '/settings?section=notifications', blocks: SETTINGS, named: true },
  { key: 'co-members', path: '/company/members', blocks: ['members-view.card', 'members-view.row', 'members-view.prefRow'], named: true },
  { key: 'co-profile', path: '/company/profile', blocks: ['profile-view.card', 'profile-view.cardHead', 'profile-view.regRow', 'profile-view.subGroup', 'profile-view.entity'], named: true },
  { key: 'settings-leads', path: '/settings?section=leads', blocks: [...SETTINGS, 'lead-stages-card.movement'], named: true },
  { key: 'settings-studio', path: '/settings?section=studio', blocks: SETTINGS },
  { key: 'settings-projects', path: '/settings?section=projects', blocks: SETTINGS },
  { key: 'settings-quotes', path: '/settings?section=quotes', blocks: SETTINGS },
  { key: 'settings-finance', path: '/settings?section=finance', blocks: SETTINGS },
  /* the other Company pages */
  { key: 'co-questionnaire', path: '/company/questionnaire', blocks: ['questionnaire-view.card', 'definition-list.row'], max: 4, screens: 1 },   /* its next rows are the studio's own questions, wrapping as they do */
  { key: 'co-integrations', path: '/company/integrations', blocks: ['integrations-view.card', 'integrations-view.row', 'integrations-view.newHook', 'integrations-view.hook'] },
  { key: 'co-plan', path: '/company/plan', blocks: ['plan.bar', 'stat-tile.tile', 'plan.sectionHead'] },
  { key: 'co-plan-billing', path: '/company/plan/billing', blocks: ['plan.box', 'plan.boxActions'] },
  { key: 'co-portal', path: '/company/portal', blocks: ['card.card', 'portal-setup.row'], max: 6 },
  { key: 'co-portal-clients', path: '/company/portal/clients', blocks: ['plan.sectionHead'] },
  { key: 'co-tpl-brand', path: '/company/templates/brand', blocks: ['profile-view.card', 'profile-view.preview', 'profile-view.mark'] },
  ...['quotes', 'contracts', 'tasks', 'terms', 'payments', 'schedules'].map((k) => ({ key: `co-tpl-${k}`, path: `/company/templates/${k}`, blocks: GALLERY, max: 2, screens: 1 })),
  { key: 'co-pricebook', path: '/company/price-book', blocks: [...GALLERY, 'templates-table.hCell'], max: 2, screens: 1 },
  { key: 'co-pricebook-sections', path: '/company/price-book/sections', blocks: GALLERY, max: 2, screens: 1 },
  { key: 'co-materials', path: '/company/materials', blocks: GALLERY, max: 2, screens: 1 },
  ...['todo', 'money-in', 'money-out', 'vendors', 'accounting'].map((k) => ({ key: `co-fin-${k}`, path: `/company/finance/${k}`, blocks: FIN, max: 1, screens: 1 })),
  { key: 'co-fin-commissions', path: '/company/finance/commissions', blocks: ['stat-tile.tile'], max: 2, screens: 1 },
  ...['leads', 'projects'].map((k) => ({ key: `co-rep-${k}`, path: `/company/reports/${k}`, blocks: ['insights-view.bar', 'stat-tile.tile'], max: 2, screens: 1 })),
  { key: 'co-rep-finance', path: '/company/reports/finance', blocks: ['books.block', 'books.head', 'stat-tile.tile'], max: 2, screens: 1 },
  { key: 'profile', path: '/profile', blocks: ['profile-view.card', 'profile-view.cardHead'] },
]

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const desk = (w = 1440, h = 1024) => b.newContext({ viewport: { width: w, height: h } })
  const watch = (p, tag) => p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`))
  const settle = (p, ms = 900) => p.waitForTimeout(ms)
  const go = async (p, url, ms = 1500) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, ms) }
  const shot = (p, name) => p.screenshot({ path: path.join(dir, `${name}.png`) })
  const snackText = async (p) => (await p.locator('[data-om-snackbar]').allInnerTexts()).join(' | ')
  const you0 = sql(`select id from members where is_you = 1`)
  const fields0 = sql(`select count(*) from lead_custom_fields`)
  const bank0 = sql(`select count(*) from studio_scope_questions`)

  try {
    as('dane')
    /* open one page and wait before reading what the probe compares against (the habit after S08) */
    { const c = await desk(); const p = await c.newPage(); await go(p, '/leads', 2000); await c.close() }

    console.log('1 · side panels: one width scale')
    const drawers = []
    for (const [f, t] of SRC) { if (!f.endsWith('.tsx')) continue; for (const m of t.matchAll(/<Drawer\b([\s\S]{0,700}?)>/g)) { const w = /\swidth=(\{[^}]*\}|"[^"]*")/.exec(m[1]); drawers.push([f, w ? w[1] : '(standard)']) } }
    const bad = drawers.filter(([, w]) => !/^(\(standard\)|"(narrow|standard|wide|widest)")$/.test(w))
    ok(drawers.length >= 20 && bad.length === 0, `every Drawer names a step of the scale (${drawers.length} panels)`, bad.map(([f, w]) => `${f} ${w}`).join(', '))
    const scale = /PANEL_WIDTH = \{ narrow: 360, standard: 400, wide: 480, widest: 560 \}/.test(SRC.find(([f]) => f === 'components/om/drawer.tsx')?.[1] ?? '')
    ok(scale, 'the scale is 360 · 400 · 480 · 560')
    {
      const c = await desk(); const p = await c.newPage(); watch(p, 'panels')
      await go(p, '/leads', 1800)
      await p.getByRole('button', { name: 'Column settings' }).first().click(); await settle(p, 800)
      const cw = await p.locator('aside[role="dialog"][aria-label="Column settings"]').evaluate((e) => Math.round(e.getBoundingClientRect().width)).catch(() => 0)
      ok(cw === 400, 'Column settings opens at the standard 400', `${cw}`)
      await p.keyboard.press('Escape'); await settle(p, 500)
      await p.mouse.click(1000, 16); await p.keyboard.press('Shift+Slash'); await settle(p, 900)
      const kw = await p.locator('aside[role="dialog"][aria-label="Keyboard shortcuts"]').evaluate((e) => Math.round(e.getBoundingClientRect().width)).catch(() => 0)
      ok(kw === 360, 'the keyboard panel opens at the narrow 360', `${kw}`)
      await c.close()
    }

    console.log('2 · a tall xl dialog has one height (928, the window less 96 when shorter)')
    const css = SRC.find(([f]) => f === 'app/globals.css')?.[1] ?? ''
    ok(/--om-modal-xl-height: 928px/.test(css), 'the token --om-modal-xl-height is 928')
    ok(!SRC.some(([f, t]) => /(height=\{960\}|min\(960px)/.test(t) && !/visualizer|xray|qanvast/.test(f)), 'no dialog keeps a 960 of its own')
    {
      const c = await desk(1440, 1200); const p = await c.newPage(); watch(p, 'xl')
      await go(p, '/quotes', 1800)
      await p.getByRole('button', { name: /^Create Quote$/ }).first().click(); await settle(p, 1000)
      const qh = await p.locator('[role="dialog"][aria-modal="true"]').last().evaluate((e) => Math.round(e.getBoundingClientRect().height)).catch(() => 0)
      ok(qh === 928, 'Create Quote stands 928 on a 1200-tall window (it was 960)', `${qh}`)
      await p.keyboard.press('Escape'); await settle(p, 600)
      await go(p, '/leads', 1600)
      await p.locator('[data-kb="create"]').first().locator('button').first().click(); await settle(p, 500)
      await p.getByRole('menuitem', { name: 'Import from File' }).click(); await settle(p, 1000)
      const ih = await p.locator('[role="dialog"][aria-modal="true"]').last().evaluate((e) => Math.round(e.getBoundingClientRect().height)).catch(() => 0)
      ok(ih === 928, 'the Import wizard stands 928', `${ih}`)
      await p.keyboard.press('Escape'); await settle(p, 600)
      await go(p, '/company/templates/brand', 1800)
      await p.getByTestId('brand-kit-preview-open').click(); await settle(p, 1000)
      const bh = await p.locator('[role="dialog"][aria-modal="true"]').last().evaluate((e) => Math.round(e.getBoundingClientRect().height)).catch(() => 0)
      ok(bh === 928, 'the brand kit’s sample quote stands 928 (it was 960)', `${bh}`)
      await shot(p, '02-xl-sample-1200')
      await p.keyboard.press('Escape'); await settle(p, 500)
      await p.setViewportSize({ width: 1440, height: 800 }); await settle(p, 300)
      await p.getByTestId('brand-kit-preview-open').click(); await settle(p, 900)
      const sh = await p.locator('[role="dialog"][aria-modal="true"]').last().evaluate((e) => Math.round(e.getBoundingClientRect().height)).catch(() => 0)
      ok(sh === 800 - 96, 'on an 800-tall window it is the window less 96', `${sh}`)
      await c.close()
    }

    const step = async (name, fn) => { try { await fn() } catch (e) { ok(false, `${name} ran to its end`, String(e).split('\n')[0].slice(0, 200)) } }
    console.log('3 · Custom fields and the Question bank: one list, one form')
    ok(!/useDragControls|function FieldDialog|function FieldRow/.test(SRC.find(([f]) => f === 'app/settings/custom-fields-card.tsx')?.[1] ?? 'x') && !/useDragControls|function QuestionDialog|function BankRow/.test(SRC.find(([f]) => f === 'components/company/questionnaire-view.tsx')?.[1] ?? 'x'),
      'neither page keeps its own copy of the list or the form')
    await step('the definitions list', async () => {
      const c = await desk(); const p = await c.newPage(); watch(p, 'defs')
      await go(p, '/settings?section=leads', 1800)
      const ft = p.getByRole('table', { name: 'Custom fields' })
      /* refused: the form stays with what was typed, the snackbar says what failed */
      await p.getByTestId('custom-fields').getByRole('button', { name: 'Add field' }).click(); await settle(p, 600)
      const dlg = p.getByRole('dialog', { name: 'Add field' })
      await dlg.getByLabel('Label').fill(PROBE_FIELD)
      const onSettings = (u) => u.pathname === '/settings'
      await p.route(onSettings, async (route) => { if (route.request().method() === 'POST' && route.request().headers()['next-action']) await route.fulfill({ status: 500, body: 'refused' }); else await route.continue() })
      await dlg.getByRole('button', { name: 'Add', exact: true }).click(); await settle(p, 1500)
      ok(await dlg.isVisible() && (await dlg.getByLabel('Label').inputValue()) === PROBE_FIELD, 'a refused save keeps the form open with what was typed')
      ok(/Couldn’t save the fields/.test(await snackText(p)), 'and the snackbar names what failed')
      await p.unroute(onSettings)
      await dlg.getByRole('button', { name: 'Add', exact: true }).click(); await settle(p, 1800)
      ok(!(await dlg.isVisible()), 'saved, the form closes')
      ok(await ft.getByTestId('custom-field').filter({ hasText: PROBE_FIELD }).count() === 1 && sql(`select count(*) from lead_custom_fields where label='${PROBE_FIELD}'`) === '1', 'and the new field is a row, on the record')
      ok(/definition-list-module__/.test(await ft.evaluate((e) => e.className).catch(() => '')), 'Settings › Custom fields is the definitions list')
      await ft.getByRole('button', { name: `Delete ${PROBE_FIELD}` }).click(); await settle(p, 500)
      await p.getByRole('dialog', { name: 'Delete this field?' }).getByRole('button', { name: 'Delete' }).click(); await settle(p, 1600)
      ok(sql(`select count(*) from lead_custom_fields where label='${PROBE_FIELD}'`) === '0', 'its remove asks first, then the row goes')
      await go(p, '/company/questionnaire', 1800)
      const bt = p.getByRole('table', { name: 'Questions' })
      ok(/definition-list-module__/.test(await bt.evaluate((e) => e.className).catch(() => '')), 'Company › Questionnaire’s bank is the same list')
      ok(await bt.getByRole('button', { name: /^Delete “/ }).count() > 0 && await bt.getByTestId('bank-question-handle').count() > 0, 'a question keeps its quoted names and its handle')
      await p.getByRole('button', { name: 'Add question' }).click(); await settle(p, 600)
      const qd = p.getByRole('dialog', { name: 'Add question' })
      await qd.getByRole('button', { name: 'Add', exact: true }).click(); await settle(p, 400)
      ok(await qd.isVisible() && /required|fill/i.test(await qd.innerText()), 'an empty question is refused in the form, which stays')
      await qd.getByLabel('Question').fill(PROBE_QUESTION)
      await qd.getByRole('button', { name: 'Add', exact: true }).click(); await settle(p, 1800)
      ok(!(await qd.isVisible()) && sql(`select count(*) from studio_scope_questions where question='${PROBE_QUESTION}'`) === '1', 'saved, the form closes and the question is on the record')
      await shot(p, '03-bank-1440')
      await c.close()
    })

    console.log('4 · one spelling: 3D')
    ok(!SRC.some(([f, t]) => /3-D/.test(t) && !f.endsWith('.css')), 'no "3-D" left in the app’s source', SRC.filter(([, t]) => /3-D/.test(t)).map(([f]) => f).join(', '))
    {
      const c = await desk(); const p = await c.newPage(); watch(p, '3d')
      await go(p, '/planner', 1800)
      ok(/3D Space Planner/.test(await p.title()), 'the planner’s title says "3D Space Planner"', await p.title())
      await p.locator('nav[aria-label="Workspace"] button[aria-label^="Tools"]').first().click(); await settle(p, 600)
      ok(await p.getByRole('menuitem', { name: '3D Space Planner', exact: true }).count() === 1, 'Tools › 3D Space Planner')
      await p.keyboard.press('Escape'); await c.close()
    }

    console.log('5 · the ghosts draw the page as it now looks — 390 touch and 1440')
    for (const [label, opts] of [['390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }], ['1440', { viewport: { width: 1440, height: 1024 }, reducedMotion: 'reduce' }]]) {
      for (const r of ROUTES) {
        const m = await measure(b, opts, r.path, r.blocks, r.max, r.screens ?? (r.named ? 2 : 1.5))
        if (m.none) { ok(false, `${label} ${r.key}: a reveal ghost to compare`); continue }
        const off = m.rows.filter((x) => Math.abs(x.dy) > 4)
        ok(m.rows.length > 0 && off.length === 0, `${label} ${r.key}: the first ${r.screens ?? (r.named ? 2 : 1.5)} screens’ ${m.rows.length} blocks stand where the page’s land`, off.slice(0, 3).map((x) => `${x.k}#${x.i} Δy ${x.dy}`).join(' · '))
        if (r.named || r.key.startsWith('settings') || ['co-questionnaire', 'co-integrations', 'co-plan', 'co-tpl-brand', 'profile'].includes(r.key)) ok(m.words.length === 0, `${label} ${r.key}: every ghost sentence is the page’s`, m.words.slice(0, 2).join(' · '))
        if (m.errs.length) errors.push(...m.errs.map((e) => `${label} ${r.key}: ${e}`))
      }
    }
    /* a phone's labelled cells take their names' room (the channels, Who, Done) */
    {
      const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' })
      await c.addInitScript(() => { const o = performance.getEntriesByType.bind(performance); performance.getEntriesByType = (t) => (t === 'paint' ? [{ name: 'first-contentful-paint', entryType: 'paint', startTime: 1.5e9, duration: 0 }] : o(t)) })
      const p = await c.newPage(); watch(p, 'labels')
      await go(p, '/settings?section=notifications', 2000)
      const xs = await p.evaluate(() => {
        const reveal = [...document.querySelectorAll('[class*="page-reveal-module__"]')].find((e) => [...e.classList].some((c) => /__reveal$/.test(c)))
        const ghost = [...reveal.children].find((e) => [...e.classList].some((c) => /__ghost$/.test(c))), content = reveal.querySelector(':scope > [data-ready]')
        const sw = (root) => [...root.querySelectorAll('[data-label="WhatsApp"]')].slice(0, 2).map((e) => Math.round(e.lastElementChild.getBoundingClientRect().left))
        return { g: sw(ghost), p: sw(content) }
      })
      ok(xs.g.length === 2 && xs.g.every((x, i) => Math.abs(x - xs.p[i]) <= 4), 'Notifications at 390: each channel’s switch stands after its name, as the page’s', JSON.stringify(xs))
      await shot(p, '05-notifications-ghost-390')
      await c.close()
    }

    console.log('6 · every width: no sideways scroll')
    for (const [w, h] of [[390, 844], [320, 700]]) {
      const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }); const p = await c.newPage(); watch(p, `${w}`)
      for (const u of ['/settings?section=notifications', '/company/members', '/company/profile', '/settings?section=leads', '/company/questionnaire']) {
        await go(p, u, 1600)
        const over = await p.evaluate(() => document.documentElement.scrollWidth - screen.width)
        ok(over <= 0, `${w}: ${u} has no sideways scroll`, `${over}px`)
      }
      if (w === 390) { await go(p, '/company/members', 1600); await shot(p, '06-members-390') }
      await c.close()
    }
    ok(errors.length === 0, 'no page errors', errors.slice(0, 3).join(' | '))
  } finally {
    sql(`delete from lead_custom_fields where label='${PROBE_FIELD}'`)
    sql(`delete from studio_scope_questions where question='${PROBE_QUESTION}'`)
    sql(`update members set is_you = (id = '${you0}')`)
    const back = sql(`select count(*) from lead_custom_fields`) === fields0 && sql(`select count(*) from studio_scope_questions`) === bank0
    console.log(back ? '  (the record is as it was)' : '  ! the record differs from before the probe')
    await b.close()
    console.log(`\n${pass} / ${pass + fail}`)
    process.exit(fail ? 1 : 0)
  }
})().catch((e) => { console.error(e); process.exit(1) })
