/**
 * (REG-726) The anatomy check — the design's measures, checked in a real browser on every page, so a copy that drifts is caught by
 * CI instead of by the owner. It visits each page of the app, then:
 *  - every table head cell (role="columnheader") is measured against the leads listing's (components/leads/table.module.css):
 *    the 56 head, padding 16/24/16/16 (52 or 40 on a selectable first column), the label 12/500 uppercase, no letter-spacing, grey;
 *  - every modal it can open from the page's own controls — Create (C) and Filters (F), the keyboard's contract — and every
 *    modal already open must wear the house head and foot (REG-725): SurfaceHead 64 (p20/24) with the rule inside, the 20/24 bold
 *    title; SurfaceFoot p16/24 with its top rule.
 * Run against a production build: `DATABASE_URL=file:<scratch>/test.db npx next start -p 3011` then `node scripts/design-anatomy.mjs`
 * (BASE=http://localhost:3011 by default). CI runs it on every pull request (.github/workflows/ci.yml).
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3011'
const LEAD = process.env.ANATOMY_LEAD || '1f12cbd1-b09b-47f4-89e4-454a1a5e333b'   // a baseline lead with every tab filled (the ghost probes' LEAD)
const ROUTES = [
  '/leads', '/leads?view=kanban', '/leads/insights', '/leads/imports',
  `/leads/${LEAD}`, `/leads/${LEAD}/tasks`, `/leads/${LEAD}/quotes`, `/leads/${LEAD}/contracts`, `/leads/${LEAD}/files`,
  `/leads/${LEAD}/notes`, `/leads/${LEAD}/questionnaire`, `/leads/${LEAD}/activity`,
  '/tasks', '/quotes', '/contracts', '/quote-x-ray', '/visualizer',
  '/company/profile', '/company/members', '/company/questionnaire', '/company/integrations', '/company/materials',
  '/company/templates/brand', '/company/templates/quotes', '/company/templates/contracts', '/company/templates/tasks',
  '/company/templates/terms', '/company/templates/payments', '/company/price-book', '/company/price-book/sections',
  '/company/plan', '/company/plan/billing',
  '/settings', '/settings?section=leads', '/settings?section=quotes', '/settings?section=notifications',
]
/* Tables drawn to a different mock on purpose, until the owner rules on them (design-source/context/consistency/). */
const TABLE_EXCEPTIONS = [
  { where: '[class*="__eventTable"], [class*="__formTable"], [class*="questionnaire-view-module__"][class*="__table"]',
    why: 'the event tables of Settings, Integrations and Company › Questionnaire (REG-614) — a second table type, or the listing\'s? The owner rules in the tables round' },
  { where: '[class*="contracts-table-module__"][class*="__card"]',
    why: 'the Contracts table\'s mock draws a 48 head (DESIGN.md §5b) — the owner rules in the tables round' },
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
      const row = h.parentElement.getBoundingClientRect()
      const first = h === h.parentElement.firstElementChild
      return { text: (label.textContent || '').trim().slice(0, 24), first, hasBox: !!h.querySelector('input[type="checkbox"], [role="checkbox"]'),
               pl: cs.paddingLeft, color: cs.color, h: Math.round(row.height),
               size: ls.fontSize, weight: ls.fontWeight, tt: ls.textTransform, ls: ls.letterSpacing }
    })
  }, TABLE_EXCEPTIONS)
  for (const h of heads) {
    const where = `${route} · table head "${h.text || '(blank)'}"`
    if (!h.text) continue   // a selection or actions column
    ok(h.pl === '16px' || (h.first && (h.pl === '52px' || h.pl === '40px')), `${where}: padding-left ${h.pl}, the listing's is 16px`)
    ok(h.color === 'rgb(102, 102, 102)', `${where}: colour ${h.color}, the listing's head grey is rgb(102, 102, 102)`)
    ok(h.size === '12px' && h.weight === '500' && h.tt === 'uppercase', `${where}: label ${h.size}/${h.weight} ${h.tt}, the listing's is 12px/500 uppercase`)
    ok(h.ls === 'normal', `${where}: letter-spacing ${h.ls}, the listing's head has none`)
    ok(h.h === 56, `${where}: head ${h.h}px tall, the listing's is 56`)
  }
  return heads.length
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
  let tables = 0, modals = 0
  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(900)
    tables += await checkTables(page, route)
    modals += await checkOpenModals(page, route)
    for (const kb of ['create', 'filters']) modals += await openAndCheck(page, route, kb)
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
  console.log(`design anatomy — ${ROUTES.length} pages, ${tables} table heads, ${modals} dialogs measured`)
  if (fail) {
    for (const f of failures) console.log('  ✗ ' + f)
    console.log(`\n✗ ${fail} measure(s) off the house anatomy (${pass} held). The house pieces are components/om/* — see design-source/context/page-checklist.md.`)
    process.exit(1)
  }
  console.log(`✓ all ${pass} measures hold`)
})().catch((e) => { console.error(e); process.exit(1) })
