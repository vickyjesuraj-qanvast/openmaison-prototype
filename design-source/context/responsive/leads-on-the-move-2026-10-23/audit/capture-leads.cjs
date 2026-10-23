/* Capture every Leads surface at phone and tablet widths. node capture-leads.cjs <port> <outDir>
   Tablet shots are viewport-only (a full-page capture drops (hover: none) mid-shot); overflow is measured against clientWidth. */
const { chromium } = require('playwright')
const fs = require('fs')
const PORT = process.argv[2] || '3014'
const OUT = process.argv[3]
const BASE = `http://localhost:${PORT}`
const L = {
  olivia: '2bc08444-0409-47c3-9675-0750977c5838',   // New · 13 files · 5 tasks · 11 questions · 3 notes · quotes + a contract
  farah: 'c9691890-3132-4902-9c2a-d251f6bfda9a',    // Contacted · 3 tasks · 2 files
  gerald: 'bed4ded0-1ac7-48fd-a7c4-639a7a00f02f',   // Met
  vivien: 'bb054aa5-7284-492e-b232-607bd4cfb0f6',   // Quote Sent
  meiling: 'd925fe8f-276f-4d14-973b-6334e3acba37',  // On Hold
  muthu: '72d56067-21ce-47d1-aa5b-dbbe70d88e0b',    // Lost
  kelvin: '3c1b7221-d4ed-4d1c-aba8-d2549e58f9ff',   // New · a meeting
}
const VIEWS = [
  { tag: 'm390', width: 390, height: 844 },
  { tag: 't768', width: 768, height: 1024 },
  { tag: 't1024', width: 1024, height: 768 },
]
fs.mkdirSync(OUT, { recursive: true })
const log = []
async function shot(p, name, full = true) {
  await p.waitForTimeout(500)
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h: document.documentElement.scrollHeight, screen: screen.width }))
  log.push({ name, scrollWidth: m.sw, clientWidth: m.cw, screenWidth: m.screen, height: m.h, overflow: m.sw > m.cw })
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
}
async function tryClick(p, loc, name) {
  try { await loc.first().click({ timeout: 2500 }); await p.waitForTimeout(800); return true } catch (e) { log.push({ name, skipped: String(e.message).split('\n')[0].slice(0, 120) }); return false }
}
async function settle(p) { try { await p.waitForLoadState('networkidle', { timeout: 8000 }) } catch {} await p.waitForTimeout(1400) }
async function esc(p) { await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(350) }

;(async () => {
  const b = await chromium.launch()
  for (const v of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: v.width, height: v.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
    const p = await ctx.newPage()
    const T = (n) => `${v.tag}-${n}`
    const full = v.width < 768

    // 1 · the listing (the benchmark — his words: "the lead listing is too good")
    await p.goto(`${BASE}/leads`); await settle(p); await shot(p, T('01-list-top'), false); if (full) await shot(p, T('01-list-full'))
    await p.goto(`${BASE}/leads?view=kanban`); await settle(p); await shot(p, T('01b-kanban'), false)
    await p.goto(`${BASE}/leads`); await settle(p)
    if (await tryClick(p, p.getByRole('button', { name: 'Filters' }), T('01-filters'))) await shot(p, T('01c-filters'), false)
    await esc(p)
    // 2 · the lead form
    if (await tryClick(p, p.getByRole('button', { name: /Add Lead|Create New Lead|^Create$/ }), T('02-add'))) {
      await shot(p, T('02-add-menu'), false)
      const form = p.getByRole('menuitem', { name: /lead|manually|New lead/i }).first()
      if (await form.count()) { await tryClick(p, form, T('02-form-open')); await shot(p, T('02b-lead-form'), false); if (full) await shot(p, T('02b-lead-form-full')) }
    }
    await esc(p); await esc(p)
    // 3 · a lead's Overview in each stage
    for (const [k, id] of Object.entries(L)) {
      await p.goto(`${BASE}/leads/${id}`); await settle(p); await shot(p, T(`03-overview-${k}`), false)
      if (k === 'olivia' && full) await shot(p, T('03-overview-olivia-full'))
    }
    // 4 · the stage pill / the Move stage window (Olivia New → Contacted, Farah Contacted → Met)
    for (const k of ['olivia', 'farah']) {
      await p.goto(`${BASE}/leads/${L[k]}`); await settle(p)
      const pill = p.getByRole('button', { name: /^Stage|Move to|Contacted|Met|Quote Sent/ }).first()
      if (await tryClick(p, pill, T(`04-stage-${k}`))) await shot(p, T(`04-stage-${k}`), false)
      await esc(p); await esc(p)
    }
    // 5 · the ⋮ on a lead
    await p.goto(`${BASE}/leads/${L.olivia}`); await settle(p)
    if (await tryClick(p, p.getByRole('button', { name: 'More options' }), T('05-more'))) await shot(p, T('05-more-menu'), false)
    await esc(p)
    // 6 · the tabs (Olivia; Kelvin for Meetings)
    for (const tab of ['tasks', 'files', 'notes', 'questionnaire', 'activity']) {
      await p.goto(`${BASE}/leads/${L.olivia}/${tab}`); await settle(p); await shot(p, T(`06-tab-${tab}`), false); if (full) await shot(p, T(`06-tab-${tab}-full`))
    }
    await p.goto(`${BASE}/leads/${L.kelvin}/meetings`); await settle(p); await shot(p, T('06-tab-meetings'), false)
    // 7 · the Edit details form
    await p.goto(`${BASE}/leads/${L.olivia}?edit=1`); await settle(p); await shot(p, T('07-edit-details'), false)
    await esc(p)
    // 8 · the import entry
    await p.goto(`${BASE}/leads`); await settle(p)
    if (await tryClick(p, p.getByRole('button', { name: /Add Lead|Create New Lead|^Create$/ }), T('08-add'))) {
      const imp = p.getByRole('menuitem', { name: /Import/i }).first()
      if (await imp.count()) { await tryClick(p, imp, T('08-import-open')); await shot(p, T('08-import'), false) }
    }
    await esc(p); await esc(p)
    await ctx.close()
  }
  await b.close()
  fs.writeFileSync(`${OUT}/log.json`, JSON.stringify(log, null, 1))
  const over = log.filter((l) => l.overflow)
  console.log('shots', log.filter((l) => !l.skipped).length, 'skipped', log.filter((l) => l.skipped).length, 'overflow', over.map((o) => o.name).join(' ') || 'none')
  for (const l of log.filter((l) => l.skipped)) console.log('  skipped', l.name, l.skipped)
})()
