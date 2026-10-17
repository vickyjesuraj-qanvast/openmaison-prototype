/**
 * (REG-726) The anatomy check — the design's measures, checked in a real browser on every page, so a copy that drifts is caught by
 * CI instead of by the owner. It visits each page of the app, then:
 *  - every table head cell (role="columnheader") is measured against the leads listing's (components/leads/table.module.css):
 *    the 56 head, padding 16/24/16/16 (52 or 40 on a selectable first column; 12 on the column right after a selection box, REG-820), the label 12/500 uppercase, no letter-spacing, grey;
 *  - every modal it can open from the page's own controls — Create (C) and Filters (F), the keyboard's contract — and every
 *    modal already open must wear the house head and foot (REG-725): SurfaceHead 64 (p20/24) with the rule inside, the 20/24 bold
 *    title; SurfaceFoot p16/24 with its top rule.
 * Run against a production build: `DATABASE_URL=file:<scratch>/test.db npx next start -p 3011` then `node scripts/design-anatomy.mjs`
 * (BASE=http://localhost:3011 by default). CI runs it on every pull request (.github/workflows/ci.yml).
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3011'
const LEAD = process.env.ANATOMY_LEAD || '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'   // a baseline lead with every tab filled (the ghost probes' LEAD)
/* (REG-1065, the Projects consistency walk) Benjamin Han's project — every tab filled — its Deposit invoice and that invoice's receipt (R68 · R72 · R75's fixed ids) */
const PROJECT = process.env.ANATOMY_PROJECT || 'a3f655a3-c603-42b0-af12-2767a0500138'
const INVOICE = process.env.ANATOMY_INVOICE || '471d130d-f65c-4b7f-aa53-70ee0f16eafa'
const PAYMENT = process.env.ANATOMY_PAYMENT || '901c42fb-3cb5-4664-adf1-79a32baf495d'
const ROUTES = [
  '/leads', '/leads?view=kanban', '/leads/imports',
  `/leads/${LEAD}`, `/leads/${LEAD}/tasks`, `/leads/${LEAD}/quotes`, `/leads/${LEAD}/contracts`, `/leads/${LEAD}/files`,
  `/leads/${LEAD}/notes`, `/leads/${LEAD}/questionnaire`, `/leads/${LEAD}/activity`,
  '/tasks', '/projects', '/quotes', '/contracts', '/quote-x-ray', '/visualizer',   // (REG-924) Projects' listing
  `/projects/${PROJECT}`, ...['schedule', 'updates', 'money', 'choices', 'tasks', 'files', 'activity'].map((t) => `/projects/${PROJECT}/${t}`),   // (REG-1065)
  `/projects/${PROJECT}/invoices/${INVOICE}`, `/projects/${PROJECT}/receipts/${PAYMENT}`, '/company/templates/schedules',
  '/company/profile', '/company/members', '/company/questionnaire', '/company/integrations', '/company/materials',
  '/company/templates/brand', '/company/templates/quotes', '/company/templates/contracts', '/company/templates/tasks',
  '/company/templates/terms', '/company/templates/payments', '/company/price-book', '/company/price-book/sections',
  '/company/plan', '/company/plan/billing',
  '/company/portal', '/company/portal/clients',   // (Projects r4a) Company › Client portal
  '/settings', '/settings?section=leads', '/settings?section=projects', '/settings?section=quotes', '/settings?section=notifications',
]
/* (gaps build H) tickets and the conversations: the project's two tabs, Projects › Tickets (C opens nothing there), the rail's Chat */
ROUTES.push(`/projects/${PROJECT}/messages`, `/projects/${PROJECT}/tickets`, '/projects/tickets', '/chat')
/* (gaps build J) Tools › 3-D Space Planner — its gallery (C opens New layout) */
ROUTES.push('/planner')
/* (REG-1360) Company › Finance — every tab, now that it is a Company section (C opens nothing there) */
/* (simplify S-10 · S-11) Finance's five tabs — To do, Money out by its four kinds, Vendors, Commission, Xero (the old tab addresses redirect here) */
ROUTES.push(...['todo', 'money-out', 'money-out?kind=bills', 'money-out?kind=expenses', 'money-out?kind=paid', 'vendors', 'commissions', 'accounting'].map((t) => `/company/finance/${t}`))
/* (simplify S-03) the views the tab groups added or made visible: Tasks › Compliance, Client › Questionnaire, Design › Floor plan · Designs, Files & notes › Notes & Logs; Settings › Finance (S-15) */
/* (simplify round 2) Compliance is measured too: each group's card table now wears its head (the item · Mark done · ⋮), as every card table does */
ROUTES.push(...['compliance', 'questionnaire', 'floor-plan', 'designs', 'notes'].map((t) => `/projects/${PROJECT}/${t}`), '/settings?section=finance')
/* (REG-1361) Company › Reports — Leads (was /leads/insights) · Projects · Finance */
ROUTES.push('/company/reports/leads', '/company/reports/projects', '/company/reports/finance')
ROUTES.push('/compliance')   // (simplify round 2) the Compliance Navigator's rule lists — card tables with their head, as the project's view
ROUTES.push('/meetings', '/settings?section=meetings', '/company/reports/meetings')   // (pending modules S23) Tools › Meeting Copilot, Settings › Meetings, Reports › Meetings
ROUTES.push('/company/reports/health')   // (pending modules S39) Reports › Studio health
ROUTES.push('/company/reports/leads?report=sales')   // (pending modules S45A) Reports › Leads › Sales — its seven tables
ROUTES.push('/marketplace', '/marketplace?view=deals', '/marketplace/mkb-4101')   // (pending modules S24) the Marketplace, its Deals, a brand's page
ROUTES.push('/market-insights', '/market-insights/mi-demo-budget-benchmark')   // (pending modules S25) Market Insights, an article
ROUTES.push('/dashboard')   // (pending modules S22) the Dashboard
ROUTES.push('/qanvast-ops/hangouts', ...['plan', 'meetings'].map((v) => `/qanvast-ops/hangouts/hge-qh-2026-marina?view=${v}`), '/qanvast-ops/hangouts/hge-qh-2026-suntec?view=results', '/company/members/germaine/profile')   // (pending modules S27) Qanvast Ops › Hangouts — the list, a Hangout's Plan · Chats · How it went — and a member's Public profile
/* Tables drawn to a different mock on purpose, until the owner rules on them (design-source/context/consistency/). */
/* The card table (REG-727) is the second table type: a short list inside a Settings / Company card — measured by its own anatomy. */
const TABLE_EXCEPTIONS = [
  { where: '[data-card-table]', why: 'the card table — measured by checkCardTables' },
  /* (REG-1167) the Schedule's date axis — months over weeks, a scale drawn on purpose (subheading months, caption weeks), not a column's
     label; its Milestone head beside it is a house head and is measured */
  { where: '[data-scale]', why: 'the Schedule timeline’s date axis — a scale, not a column label' },
]

let pass = 0, fail = 0
const failures = []
const ok = (c, m) => { if (c) pass++; else { fail++; failures.push(m) } }

async function checkTables(page, route) {
  const heads = await page.evaluate((exceptions) => {
    const skip = (el) => exceptions.some((x) => el.closest(x.where))
    return [...document.querySelectorAll('[role="columnheader"]')].filter((h) => {
      const r = h.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && !skip(h) && !h.closest('[role="dialog"]')
    }).map((h) => {
      const cs = getComputedStyle(h)
      const label = h.querySelector('[class*="__hLabel"]') || h
      const ls = getComputedStyle(label)
      /* (REG-1065) a grid whose rows are `display: contents` (the Schedule's list that is also the timeline) has no row box — the cell's own is the row's */
      const row = (getComputedStyle(h.parentElement).display === 'contents' ? h : h.parentElement).getBoundingClientRect()
      const first = h === h.parentElement.firstElementChild
      /* (REG-820) the column straight after a selection-box column starts at 12, so its words land at 52 as the listing's do */
      const prev = h.previousElementSibling
      const afterBox = !!prev && !!prev.querySelector('input[type="checkbox"], [role="checkbox"]') && !(prev.textContent || '').trim()
      return { text: (label.textContent || '').trim().slice(0, 24), first, afterBox, hasBox: !!h.querySelector('input[type="checkbox"], [role="checkbox"]'),
               pl: cs.paddingLeft, color: cs.color, h: Math.round(row.height),
               size: ls.fontSize, weight: ls.fontWeight, tt: ls.textTransform, ls: ls.letterSpacing }
    })
  }, TABLE_EXCEPTIONS)
  for (const h of heads) {
    const where = `${route} · table head "${h.text || '(blank)'}"`
    if (!h.text) continue   // a selection or actions column
    ok(h.pl === '16px' || (h.first && (h.pl === '52px' || h.pl === '40px')) || (h.afterBox && h.pl === '12px'), `${where}: padding-left ${h.pl}, the listing's is 16px`)
    ok(h.color === 'rgb(102, 102, 102)', `${where}: colour ${h.color}, the listing's head grey is rgb(102, 102, 102)`)
    ok(h.size === '12px' && h.weight === '500' && h.tt === 'uppercase', `${where}: label ${h.size}/${h.weight} ${h.tt}, the listing's is 12px/500 uppercase`)
    ok(h.ls === 'normal', `${where}: letter-spacing ${h.ls}, the listing's head has none`)
    ok(h.h === 56, `${where}: head ${h.h}px tall, the listing's is 56`)
  }
  return heads.length
}

/* (REG-727) The card table: a 40 head on the grey fill, the label 12/500 uppercase with no letter-spacing, rows of 56 at least. */
async function checkCardTables(page, route) {
  const tables = await page.evaluate(() => [...document.querySelectorAll('[data-card-table]')].filter((t) => t.getBoundingClientRect().height > 0).map((t) => {
    const head = t.firstElementChild, hs = head && getComputedStyle(head)
    const rows = [...t.children].slice(1).filter((r) => r.getBoundingClientRect().height > 0)
    return { head: head ? { h: Math.round(head.getBoundingClientRect().height), size: hs.fontSize, weight: hs.fontWeight, tt: hs.textTransform, ls: hs.letterSpacing, color: hs.color } : null,
             minRow: rows.length ? Math.min(...rows.map((r) => Math.round(r.getBoundingClientRect().height))) : null,
             label: t.getAttribute('aria-label') || (head?.textContent || '').trim().slice(0, 24) }
  }))
  for (const t of tables) {
    const w = `${route} · card table "${t.label}"`
    if (!t.head) { ok(false, `${w}: no head`); continue }
    ok(t.head.h >= 40 && t.head.h <= 44, `${w}: head ${t.head.h}px, the card table's is 40`)
    ok(t.head.size === '12px' && t.head.weight === '500' && t.head.tt === 'uppercase' && t.head.ls === 'normal', `${w}: head type ${t.head.size}/${t.head.weight} ${t.head.tt} ls ${t.head.ls}`)
    ok(t.head.color === 'rgb(102, 102, 102)', `${w}: head colour ${t.head.color}`)
    if (t.minRow !== null) ok(t.minRow >= 56, `${w}: a row ${t.minRow}px, the card table's are 56`)
  }
  return tables.length
}

async function checkOpenModals(page, where) {
  const modals = await page.evaluate(() => [...document.querySelectorAll('[aria-modal="true"]')].filter((d) => {
    const r = d.getBoundingClientRect(); return r.width > 0 && r.height > 0
  }).map((d) => {
    const head = d.querySelector('[data-surface-head]'), foot = d.querySelector('[data-surface-foot]')
    const title = head?.querySelector('h2')
    const hs = head && getComputedStyle(head), fs = foot && getComputedStyle(foot), ts = title && getComputedStyle(title)
    return {
      label: d.getAttribute('aria-label') || '(no label)',
      head: head ? { h: Math.round(head.getBoundingClientRect().height), pad: `${hs.paddingTop} ${hs.paddingRight} ${hs.paddingBottom} ${hs.paddingLeft}`, rule: /inset/.test(hs.boxShadow) } : null,
      title: ts ? `${ts.fontSize}/${ts.lineHeight}/${ts.fontWeight}` : null,
      foot: foot ? { pad: `${fs.paddingTop} ${fs.paddingRight}`, rule: fs.borderTopWidth } : null,
      phone: innerWidth <= 767,
    }
  }))
  for (const m of modals) {
    const w = `${where} · dialog "${m.label}"`
    ok(!!m.head, `${w}: no house head (SurfaceHead) — a hand-rolled head drifts (REG-725)`)
    if (!m.head) continue
    ok(m.head.h >= (m.phone ? 56 : 64), `${w}: head ${m.head.h}px, the standard is 64 (56 on a phone sheet)`)
    ok(m.head.rule, `${w}: no 1px rule under the head — the owner's rule is always (REG-725)`)
    if (!m.phone) ok(m.head.pad === '20px 24px 20px 24px', `${w}: head padding ${m.head.pad}, the standard is 20px 24px`)
    ok(m.title === '20px/24px/700', `${w}: title ${m.title}, the standard is 20px/24px/700`)
    if (m.foot) {
      if (!m.phone) ok(m.foot.pad === '16px 24px', `${w}: foot padding ${m.foot.pad}, the standard is 16px 24px`)
      ok(m.foot.rule === '1px', `${w}: no rule above the foot`)
    }
  }
  return modals.length
}

/* (REG-728) A menu is the house menu: rows at least 36 (44 on touch) on the 12 padding in body-m, a width on the scale (200 · 240 ·
   320, or its field's / a mocked width), r4 with the 1px rule, group titles with no letter-spacing. Measured on the page's own
   "More options" menu, which every page with a kebab has. */
const MENU_WIDTHS = [140, 200, 240, 320, 360, 400]
async function checkPageMenu(page, route) {
  const kebab = page.getByRole('button', { name: 'More options', exact: true }).filter({ visible: true }).first()
  if (!(await kebab.count())) return 0
  await kebab.click({ timeout: 3000 }).catch(() => {})
  await page.waitForTimeout(400)
  const m = await page.evaluate(() => {
    const menu = [...document.querySelectorAll('[role="menu"]')].filter((e) => e.getBoundingClientRect().height > 0).pop()
    if (!menu || menu.closest('[aria-modal="true"]')) return null   // a phone sheet is measured by the sheet rules
    const ms = getComputedStyle(menu)
    const rows = [...menu.querySelectorAll('[role^="menuitem"]')].filter((r) => r.getBoundingClientRect().height > 0).map((r) => {
      const rs = getComputedStyle(r); return { h: Math.round(r.getBoundingClientRect().height), pl: rs.paddingLeft, size: rs.fontSize, name: (r.textContent || '').trim().slice(0, 20) }
    })
    const labels = [...menu.querySelectorAll('[data-menu-label]')].map((l) => getComputedStyle(l).letterSpacing)
    return { w: Math.round(menu.getBoundingClientRect().width), radius: ms.borderRadius, border: ms.borderTopWidth, rows, labels }
  })
  await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(200)
  if (!m) return 0
  const w = `${route} · page menu`
  ok(MENU_WIDTHS.includes(m.w), `${w}: ${m.w}px wide — off the menu scale (200 · 240 · 320, or a mocked 140 / 360 / 400)`)
  ok(m.radius === '4px' && m.border === '1px', `${w}: radius ${m.radius} · border ${m.border}, the house menu's is 4px · 1px`)
  for (const r of m.rows) ok(r.h >= 36 && r.pl === '12px' && r.size === '14px', `${w} · "${r.name}": row ${r.h}px · padding-left ${r.pl} · ${r.size}, the house row is ≥36 · 12px · 14px`)
  for (const l of m.labels) ok(l === 'normal', `${w}: a group title with letter-spacing ${l}`)
  return 1
}

/* Opens the page's own Create and Filters through the keyboard's contract (REG-711: C creates, F opens Filters wherever the page
   has them — the key layer presses the page's marked control or runs its handler), so the check follows the pages as they change. */
async function openAndCheck(page, route, kb) {
  const key = { create: 'c', filters: 'f' }[kb]
  if (!(await page.locator(`[data-kb="${kb}"]`).filter({ visible: true }).count())) return 0
  const before = await page.locator('[aria-modal="true"]').count()
  await page.locator('body').click({ position: { x: 2, y: 2 } }).catch(() => {})   // nothing typed-into holds focus
  await page.keyboard.press(key)
  await page.waitForTimeout(800)
  const after = await page.locator('[aria-modal="true"]').count()
  if (after <= before) { await page.keyboard.press('Escape').catch(() => {}); return 0 }   // it opened a menu, not a modal
  const n = await checkOpenModals(page, `${route} · ${kb}`)
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  if ((await page.locator('[aria-modal="true"]').count()) > before) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  return n
}

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  let tables = 0, modals = 0, menus = 0
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(900)
    tables += await checkTables(page, route)
    tables += await checkCardTables(page, route)
    modals += await checkOpenModals(page, route)
    for (const kb of ['create', 'filters']) modals += await openAndCheck(page, route, kb)
    menus += await checkPageMenu(page, route)
  }
  await ctx.close()
  /* phones: every sheet and alert still wears the house head (its sheet paddings are the phone's own, REG-372) */
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const pp = await phone.newPage()
  for (const route of ['/leads', `/leads/${LEAD}/tasks`, '/company/templates/quotes', '/tasks']) {
    await pp.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
    await pp.waitForTimeout(900)
    for (const kb of ['create', 'filters']) modals += await openAndCheck(pp, `${route} (390)`, kb)
  }
  await browser.close()
  console.log(`design anatomy — ${ROUTES.length} pages, ${tables} table heads, ${modals} dialogs, ${menus} page menus measured`)
  if (fail) {
    for (const f of failures) console.log('  ✗ ' + f)
    console.log(`\n✗ ${fail} measure(s) off the house anatomy (${pass} held). The house pieces are components/om/* — see design-source/context/page-checklist.md.`)
    process.exit(1)
  }
  console.log(`✓ all ${pass} measures hold`)
})().catch((e) => { console.error(e); process.exit(1) })
