// Pending modules, step S29 · AI writing help on quote text (the owner's "build all of them but one after the other", 2026-10-11; survey key
// api:ai-writing-help-quotes — "Improve · Shorten · Expand · Rewrite · Plain English on a quote's Terms and Notes (the rich editor) and on a
// contract's text"; 1.0: the quote document editor's ✨ menu sent the section to the mAIson Bot and replaced it at once). Each item asserted as
// the rule it builds, never a count from another round:
//  - Write with AI where the words are written: the quote's Terms and Notes (the mock's button), a line's Description, a contract's formatting
//    bar (and its templates'), a T&Cs & Notes template, the send dialogs' message, a quote template's prose field, a Price book item
//  - the menu offers what the place can do, each row saying what it would do here — or, disabled, why not (in the row)
//  - every action is a PROPOSAL: the change marked word by word (Changes · Before · After), plain lines saying what changed, Not now leaves
//    the words (and the record) as they were; Use these words puts them in (autosaved as an edit) with Undo after
//  - by rule from the records: Plain English swaps formal words; Improve fixes spelling / short forms / capitals / full stops and writes the
//    recipient's name their way; Add what's missing brings the quote's own clauses and the studio's templates (its [fields] filled with the
//    quote's records; a template for an HDB flat only on an HDB home); Rewrite from this quote / Use My Items' words / Back to the template's
//    wording; an empty section opens "Write from this quote" straight away
//  - a contract: the clause at the caret, your selection or the whole contract ("Acts on"), its chips and signature fields never touched; a
//    signed contract offers nothing
//  - client-safe: a line's proposal never carries its cost; nothing metered (no AI credits move); no model is called
//  - Maison AI's sheet in the quote editor offers it when it would do something, and opens the same proposal; the Ask box answers where it is
//  - 390 / 320 / 768 touch: bottom sheets, no sideways scroll against screen.width; the page error log is empty
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3160 NODE_PATH=<repo>/node_modules node verify-pm2-s29.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s29')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3160'
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean)
const want = (n) => !ONLY.length || ONLY.includes(String(n))
const shq = (q) => q.replace(/(["$`\\])/g, '\\$1')
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim()
const json = (q) => { const out = execSync(`sqlite3 -cmd ".timeout 30000" -json "${DB}" "${shq(q)}"`, { maxBuffer: 256 * 1024 * 1024 }).toString().trim(); return out ? JSON.parse(out) : [] }
const sqlFile = (text) => { const f = path.join(os.tmpdir(), `pm2-s29-${process.pid}.sql`); fs.writeFileSync(f, text); execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" < "${f}"`, { maxBuffer: 256 * 1024 * 1024 }); fs.unlinkSync(f) }
const lit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const as = (member) => sql(`update members set is_you = (id = '${member}')`)
const id = (q) => sql(q).split('\n')[0]

/* the demo's records */
const Q1 = id(`select id from quotes where number = 'OM-10001'`)          // Olivia Martinez · HDB 4-Room · Draft
const Q6 = id(`select id from quotes where number = 'OM-10006'`)          // Harpreet Kaur · Approved — Send for confirmation
const Q7 = id(`select id from quotes where number = 'OM-10007'`)          // Serena Koh — Germaine is on her lead
const CT = id(`select c.id from contracts c join leads l on l.id = c.lead_id where l.name = 'Olivia Martinez' and c.status = 'Draft' and c.deleted_at is null`)
const SIGNED = id(`select id from contracts where status = 'Signed' and source <> 'uploaded' and deleted_at is null limit 1`)
const CTPL = id(`select id from contract_templates where kind = 'document' and deleted_at is null order by created_at limit 1`)
const BTO = id(`select id from quote_text_templates where title = 'Terms and Conditions for BTO Works'`)
const GENERAL = id(`select id from quote_text_templates where title = 'Terms and Conditions for Renovation Works'`)
const QTPL = id(`select id from quote_templates where is_default = 1 and deleted_at is null limit 1`)
const PAINT_LINE = id(`select id from quote_items where quote_id = '${Q1}' and name = 'Painting, whole unit'`)
const TV_LINE = id(`select id from quote_items where quote_id = '${Q1}' and name like 'TV console%'`)
const PAINT_BOOK = id(`select id from price_book_items where name = 'Painting, whole unit' and deleted_at is null`)

const settle = (p, ms = 500) => p.waitForTimeout(ms)
const snackText = async (p) => (await p.locator('[role="status"][aria-live="polite"]').last().innerText().catch(() => '')).replace(/\s+/g, ' ')
const proposal = (p) => p.getByTestId('writing-proposal')
const dialogOf = (p) => p.locator('[role=dialog]').filter({ has: p.getByTestId('writing-proposal') })
const menuRows = async (p) => (await p.locator('[role=menu] [role=menuitem]').evaluateAll((els) => els.map((e) => ({ text: e.innerText.replace(/\s+/g, ' ').trim(), disabled: e.getAttribute('aria-disabled') === 'true' }))))
const row = (rows, label) => rows.find((r) => r.text.startsWith(label))
const openSection = async (p, key, title) => {   // (the calm UI build 2026-10-27, a deliberate change) the cards' titles in sentence case (W-200)
  const s = p.locator(`#section-${key}`)
  if (!(await s.locator('[contenteditable]').count())) { await s.getByText(title, { exact: true }).first().click(); await settle(p, 600) }
  await s.scrollIntoViewIfNeeded()
  return s
}
const editorText = (s) => s.locator('[contenteditable]').first().innerText()
const noOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth <= screen.width + 1)

;(async () => {
  const b = await chromium.launch()
  const errors = []
  const you0 = sql(`select id from members where is_you = 1`)
  const WHOLE = ['quotes', 'quote_items', 'contracts', 'quote_text_templates', 'quote_templates', 'quote_template_versions', 'price_book_items', 'maison_questions', 'notifications', 'notification_outbox', 'lead_events', 'credit_ledger']
  const kept = WHOLE.map((t) => [t, json(`select * from ${t}`)])
  const sumOf = () => WHOLE.map((t) => sql(`select count(*) from ${t}`)).join(',')
  const sum0 = sumOf()
  const credits0 = sql(`select count(*) || ':' || coalesce(sum(credits), 0) from credit_ledger`)
  const terms0 = sql(`select terms_html from quotes where id = '${Q1}'`)
  const notes0 = sql(`select notes_html from quotes where id = '${Q1}'`)
  const body0 = sql(`select body from contracts where id = '${CT}'`)
  const putBack = () => {
    let text = 'PRAGMA foreign_keys=OFF;\nBEGIN;\n'
    for (const [t, rows] of kept) {
      text += `DELETE FROM ${t};\n`
      for (const r of rows) text += `INSERT INTO ${t} (${Object.keys(r).map((k) => `"${k}"`).join(',')}) VALUES (${Object.values(r).map(lit).join(',')});\n`
    }
    text += 'COMMIT;\n'
    sqlFile(text)
    as(you0)
  }
  const ctx = async (o = {}) => {
    const c = await b.newContext({ viewport: { width: 1440, height: 1024 }, ...o })
    const p = await c.newPage()
    p.on('pageerror', (e) => errors.push(`${p.url()} ${e.message}`))
    p.setDefaultTimeout(15000)
    return { c, p }
  }
  try {
    as('dane')

    /* ── 1 · the quote's Terms: the menu, a proposal, Not now, Use these words, Undo ──────────────────────────────────────── */
    if (want(1)) {
      console.log('1 · the quote’s Terms and Conditions')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      const s = await openSection(p, 'terms', 'Terms and conditions')
      const btn = s.getByTestId('writing-help')
      ok(await btn.count() === 1 && /Write with AI/.test(await btn.innerText()), 'the Terms toolbar keeps the mock’s Write with AI button')
      await btn.click(); await settle(p, 400)
      const rows = await menuRows(p)
      ok(['Improve the writing', 'Shorten', 'Add what’s missing', 'Rewrite from this quote', 'Plain English'].every((l) => row(rows, l)), 'the menu offers Improve · Shorten · Add what’s missing · Rewrite from this quote · Plain English')
      ok(row(rows, 'Improve the writing')?.disabled && /Nothing to fix — it already reads cleanly/.test(row(rows, 'Improve the writing').text), 'a clean text: Improve is disabled and says why in the row')
      ok(!row(rows, 'Plain English')?.disabled && /\d+ changes? to everyday words/.test(row(rows, 'Plain English').text), 'Plain English says what it would do here (n changes to everyday words)')
      ok(!row(rows, 'Add what’s missing')?.disabled && /working hours/i.test(row(rows, 'Add what’s missing').text), 'Add what’s missing names what an HDB home’s terms leave out (working hours, from the HDB template)')
      await p.screenshot({ path: `${dir}/01-terms-menu.png` })
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Plain English' }).click(); await settle(p, 600)
      const d = dialogOf(p)
      ok(await d.count() === 1 && /Plain English/.test(await d.locator('h2, [class*=title]').first().innerText()), 'Plain English opens a proposal dialog')
      ok(/Terms and conditions · OM-10001/i.test(await d.innerText()), 'its subtitle names the words and the quote')
      ok(/commence → start/.test(await proposal(p).innerText()), 'its lines say what changed (commence → start)')
      ok(await p.getByTestId('writing-paper').locator('ins').count() > 0 && await p.getByTestId('writing-paper').locator('del').count() > 0, 'Changes: the added words marked, the taken-out words struck')
      await p.screenshot({ path: `${dir}/02-terms-plain-changes.png` })
      await p.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(p, 200)
      const after = await p.getByTestId('writing-paper').innerText()
      ok(/Works start only after/.test(after) && !/Homeowner\/Client/.test(after) && await p.getByTestId('writing-paper').locator('del').count() === 0, 'After: the clean result')
      await p.getByTestId('writing-view').getByRole('radio', { name: 'Before' }).click(); await settle(p, 200)
      ok(/Works commence only after/.test(await p.getByTestId('writing-paper').innerText()), 'Before: the words as they are')
      await d.getByRole('button', { name: 'Not now' }).click(); await settle(p, 1400)
      ok(await dialogOf(p).count() === 0 && sql(`select terms_html from quotes where id = '${Q1}'`) === terms0 && /Works commence only after/.test(await editorText(s)), 'Not now: nothing changes — the editor and the record as they were')
      await btn.click(); await settle(p, 300)
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Plain English' }).click(); await settle(p, 500)
      await p.getByTestId('writing-use').click(); await settle(p, 1800)
      ok(/Works start only after/.test(await editorText(s)), 'Use these words: the editor holds the plain words')
      ok(/Works start only after/.test(sql(`select terms_html from quotes where id = '${Q1}'`)), '…saved like any edit (the quote’s terms_html)')
      ok(/Terms and conditions in plain English/i.test(await snackText(p)), 'the snackbar says what happened, with Undo')
      await p.screenshot({ path: `${dir}/03-terms-plain-used.png` })
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800)
      ok(/Works commence only after/.test(await editorText(s)) && sql(`select terms_html from quotes where id = '${Q1}'`) === terms0, 'Undo puts the words back, in the record too')
      await c.close()
    }

    /* ── 2 · the Notes: Add what's missing from the quote and the templates; an empty section writes from this quote; Improve ─────────── */
    if (want(2)) {
      console.log('2 · the quote’s Additional Notes')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      let s = await openSection(p, 'notes', 'Additional notes')
      await s.getByTestId('writing-help').click(); await settle(p, 300)
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Add what’s missing' }).click(); await settle(p, 600)
      const t = await proposal(p).innerText()
      ok(/Adds what it covers, working hours and access, material lead times and what it excludes/.test(t), 'Add what’s missing: what the notes leave out, named')
      ok(/From this quote, “Working Hours and Site Access”, “Material Lead Times” and “What This Quote Excludes”/.test(t), '…from this quote and the studio’s own Notes templates')
      await p.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(p, 200)
      const after = await p.getByTestId('writing-paper').innerText()
      /* (S44Q — row 311, a deliberate change of this rule) the studio's [fields] land as the live {studio_name} / {studio_phone}, which print the quote's issuing entity */
      ok(/This quotation covers \d+ items/.test(after) && /\{studio_name\}/.test(after) && !/\[(Studio Name|Team Member Full Name)\]/.test(after), '…the templates’ [fields] filled — the studio’s as its live field')
      await p.screenshot({ path: `${dir}/04-notes-expand.png` })
      await p.getByTestId('writing-use').click(); await settle(p, 1800)
      ok(/excludes the removal of existing furniture/.test(sql(`select notes_html from quotes where id = '${Q1}'`)), 'Use these words: the notes saved with the added paragraphs')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800)
      ok(sql(`select notes_html from quotes where id = '${Q1}'`) === notes0, 'Undo: the notes as they were')
      await c.close()
      /* an empty Notes section: Write with AI goes straight to "Write from this quote" */
      sql(`update quotes set notes_html = '' where id = '${Q1}'`)
      const r = await ctx(); const q = r.p
      await q.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(q, 1200)
      s = await openSection(q, 'notes', 'Additional notes')
      await s.getByTestId('writing-help').click(); await settle(q, 600)
      ok(await q.locator('[role=menu]').count() === 0 && await dialogOf(q).count() === 1 && /Write from this quote/.test(await dialogOf(q).innerText()), 'an empty section: the press opens “Write from this quote” straight away (no menu)')
      ok(await q.getByTestId('writing-view').count() === 0 && /This quotation covers/.test(await q.getByTestId('writing-paper').innerText()), '…the composed words shown first (nothing to compare: no Changes / Before)')
      await q.screenshot({ path: `${dir}/05-notes-write-empty.png` })
      await q.getByTestId('writing-use').click(); await settle(q, 1800)
      ok(/This quotation covers/.test(sql(`select notes_html from quotes where id = '${Q1}'`)), '…Use these words writes them in')
      ok(/Additional notes written/i.test(await snackText(q)), '…“Additional Notes written”, with Undo')
      await q.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(q, 1800)
      ok(sql(`select coalesce(notes_html, '') from quotes where id = '${Q1}'`).replace(/<br>|<p><\/p>/g, '') === '', '…Undo empties it again')
      /* Improve on words typed in a hurry */
      const ed = s.locator('[contenteditable]').first()
      await ed.click(); await q.keyboard.type('pls note the the qtn is valid abt 3 wks , thx'); await settle(q, 1200)
      await s.getByTestId('writing-help').click(); await settle(q, 300)
      const rows = await menuRows(q)
      ok(!row(rows, 'Improve the writing')?.disabled && /fixes/.test(row(rows, 'Improve the writing').text), 'typed in a hurry: Improve counts its fixes in the row')
      await q.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Improve the writing' }).click(); await settle(q, 500)
      const pt = await proposal(q).innerText()
      ok(/spellings?|short forms? spelt out/.test(pt) && /qtn → quotation/.test(pt), 'Improve’s lines name the kinds of fix and give examples (qtn → quotation)')
      await q.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(q, 200)
      ok(/^Please note the quotation is valid about 3 weeks, thanks\.$/.test((await q.getByTestId('writing-paper').innerText()).trim()), 'Improve: “Please note the quotation is valid about 3 weeks, thanks.” — the figure untouched')
      await q.screenshot({ path: `${dir}/06-notes-improve.png` })
      await dialogOf(q).getByRole('button', { name: 'Not now' }).click(); await settle(q, 400)
      await r.c.close()
      sql(`update quotes set notes_html = ${lit(notes0)} where id = '${Q1}'`)
    }

    /* ── 3 · Maison AI's sheet in the quote editor, and the Ask box ─────────────────────────────────────────────────────────── */
    if (want(3)) {
      console.log('3 · Maison AI in the quote editor')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.locator('[aria-label="Maison AI"]').last().click(); await settle(p, 600)
      const sheet = await p.locator('body').innerText()
      ok(/Add what the terms leave out — working hours/.test(sheet) && /Put the terms in plain English/.test(sheet), 'the sheet offers the writing help that would do something here')
      ok(/Add what the notes leave out — 4 points/.test(sheet), '…several things counted, not listed (the proposal names them)')
      await p.screenshot({ path: `${dir}/07-maison-sheet.png` })
      await p.getByRole('button', { name: 'Put the terms in plain English' }).click(); await settle(p, 900)
      ok(await dialogOf(p).count() === 1 && /Plain English/.test(await dialogOf(p).innerText()) && /Terms and conditions · OM-10001/i.test(await dialogOf(p).innerText()), 'a press opens the same proposal (it never writes by itself)')
      ok(await p.locator('#section-terms [contenteditable]').count() === 1, '…and opens the folded Terms section behind it')
      await dialogOf(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 400)
      ok(sql(`select terms_html from quotes where id = '${Q1}'`) === terms0, '…Not now leaves the terms as they were')
      await p.locator('[aria-label="Maison AI"]').last().click(); await settle(p, 500)
      await p.getByPlaceholder('Ask Maison AI').or(p.getByLabel('Ask Maison AI')).first().fill('shorten the terms please'); await p.keyboard.press('Enter'); await settle(p, 1500)
      ok(/Write with AI sits beside the words/.test(await p.locator('body').innerText()), 'the Ask box, asked in other words, says where the help is and how it works')
      await p.screenshot({ path: `${dir}/08-maison-ask.png` })
      await c.close()
    }

    /* ── 4 · a line's Description: My Items' words, phrases keep no full stop, never a cost ─────────────────────────────────── */
    if (want(4)) {
      console.log('4 · a line’s Description')
      sql(`update quote_items set description = 'two coats paint w/ sealer', description_html = null where id = '${PAINT_LINE}'`)
      const cost = Number(sql(`select cost_minor from quote_items where id = '${PAINT_LINE}'`))
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      const open = async (lineId) => {
        const r = p.locator(`[data-item-id="${lineId}"]`).first()
        await r.scrollIntoViewIfNeeded(); await r.locator('[class*=descText]').first().dispatchEvent('mousedown'); await settle(p, 300)
        await r.getByRole('button', { name: 'Expand description' }).click(); await settle(p, 500)
      }
      await open(PAINT_LINE)
      const dd = p.getByRole('dialog', { name: 'Words on this line' })   // (S44I — call C2, a deliberate change of this rule: a line's Description dialog is Words on this line)
      ok(await dd.getByTestId('description-writing').count() === 1, 'the Description dialog carries Write with AI in its foot')
      await dd.getByTestId('description-writing').click(); await settle(p, 300)
      let rows = await menuRows(p)
      ok(!row(rows, 'Use My Items’ words')?.disabled && /My Items’ words for “Painting, whole unit”/.test(row(rows, 'Use My Items’ words').text), 'a line from My Items: Use My Items’ words, named')
      ok(!row(rows, 'Improve the writing')?.disabled, '…Improve offered on the typed words')
      await p.screenshot({ path: `${dir}/09-desc-menu.png` })
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Improve the writing' }).click(); await settle(p, 500)
      await p.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(p, 200)
      ok((await p.getByTestId('writing-paper').innerText()).trim() === 'Two coats paint with sealer', 'Improve on a description: “Two coats paint with sealer” — a phrase keeps no full stop')
      await dialogOf(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 300)
      await dd.getByTestId('description-writing').click(); await settle(p, 300)
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Use My Items’ words' }).click(); await settle(p, 500)
      await p.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(p, 200)
      const prop = await proposal(p).innerText()
      const money = (n) => `S$${(n / 100).toLocaleString('en-SG', { minimumFractionDigits: 2 })}`
      ok(/Two coats of washable emulsion/.test(prop) && !prop.includes(money(cost)) && !prop.includes(String(cost / 100)) && !/\b(cost|markup)\b/i.test(await p.getByTestId('writing-paper').innerText()), 'the proposal carries My Items’ words only — never the line’s cost or markup')
      await p.getByTestId('writing-use').click(); await settle(p, 500)
      ok(/Two coats of washable emulsion/.test(await dd.getByRole('textbox', { name: 'Description' }).innerText()), 'Use these words: the dialog’s box takes them (Save keeps them, Cancel doesn’t)')
      await p.screenshot({ path: `${dir}/10-desc-used.png` })
      await dd.getByRole('button', { name: 'Cancel' }).click(); await settle(p, 800)
      ok(sql(`select description from quote_items where id = '${PAINT_LINE}'`) === 'two coats paint w/ sealer', '…Cancel: the line keeps what it had')
      await open(TV_LINE)
      await p.getByRole('dialog', { name: 'Words on this line' }).getByTestId('description-writing').click(); await settle(p, 300)   // (S44I — call C2)
      rows = await menuRows(p)
      ok(row(rows, 'Use My Items’ words')?.disabled && /My Items has no words for a line like this/.test(row(rows, 'Use My Items’ words').text), 'a line My Items has nothing for: the row says so')
      await p.keyboard.press('Escape'); await c.close()
      sql(`update quote_items set description = ${lit(kept.find(([t]) => t === 'quote_items')[1].find((r) => r.id === PAINT_LINE).description)} where id = '${PAINT_LINE}'`)
    }

    /* ── 5 · a contract: the clause at the caret, the whole contract, chips untouched; a signed one offers nothing ─────────────── */
    if (want(5)) {
      console.log('5 · a contract’s text')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/contracts/${CT}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      const chips0 = await p.getByTestId('contract-doc').locator('.om-token').count()
      await p.getByTestId('contract-doc').locator('p', { hasText: 'Works commence within' }).click(); await settle(p, 300)
      await p.getByTestId('contract-writing').click(); await settle(p, 400)
      const menu = (await p.locator('[role=menu]').innerText()).replace(/\s+/g, ' ')
      ok(/For “4\. Programme”/i.test(menu), 'the menu says what it acts on — the clause the caret is in')
      ok(/Back to the template’s wording/.test(menu), '…a contract’s Rewrite is its template’s wording')
      await p.screenshot({ path: `${dir}/11-contract-menu.png` })
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Plain English' }).click(); await settle(p, 500)
      const parts = p.getByTestId('writing-parts')
      ok(await parts.getByRole('radio', { name: '“4. Programme”' }).getAttribute('aria-checked') === 'true' && await parts.getByRole('radio', { name: 'The whole contract' }).count() === 1, 'Acts on: the clause (picked) or the whole contract')
      await p.getByTestId('writing-use').click(); await settle(p, 1800)
      const body1 = sql(`select body from contracts where id = '${CT}'`)
      ok(/Works start within 14 days/.test(body1) && /The Designer shall carry out/.test(body1), 'the clause took the plain words — the rest of the contract untouched')
      ok(/“4\. Programme” in plain English/.test(await snackText(p)), '…the snackbar names the clause, with Undo')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800)
      ok(sql(`select body from contracts where id = '${CT}'`) === body0, 'Undo: the contract as it was')
      await p.getByTestId('contract-doc').locator('p', { hasText: 'Works commence within' }).click(); await settle(p, 300)
      await p.getByTestId('contract-writing').click(); await settle(p, 300)
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Plain English' }).click(); await settle(p, 500)
      await p.getByTestId('writing-parts').getByRole('radio', { name: 'The whole contract' }).click(); await settle(p, 400)
      ok(/shall → will/.test(await proposal(p).innerText()), 'the whole contract: shall → will')
      ok(await p.getByTestId('writing-paper').locator('.om-token').count() === chips0, '…its chips drawn as chips, every one kept')
      await p.screenshot({ path: `${dir}/12-contract-whole.png` })
      await p.getByTestId('writing-use').click(); await settle(p, 1800)
      const body2 = sql(`select body from contracts where id = '${CT}'`)
      ok(/The Designer will carry out/.test(body2) && (body2.match(/class="om-token"/g) || []).length === (body0.match(/class="om-token"/g) || []).length && (body2.match(/om-sign/g) || []).length === (body0.match(/om-sign/g) || []).length, '…saved; every chip and signature field still there')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 1800)
      ok(sql(`select body from contracts where id = '${CT}'`) === body0, '…Undo restores the whole contract')
      await p.goto(`${BASE}/contracts/${SIGNED}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      const sb = p.getByTestId('contract-writing')
      ok(await sb.count() === 0 || await sb.isDisabled(), 'a signed contract offers no writing help')
      await p.goto(`${BASE}/templates/contracts/${CTPL}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.getByTestId('contract-writing').click(); await settle(p, 300)
      const trows = await menuRows(p)
      ok(trows.length === 3 && ['Improve the writing', 'Shorten', 'Plain English'].every((l) => row(trows, l)), 'a contract template: Improve · Shorten · Plain English (no template of its own to add from)')
      await p.keyboard.press('Escape'); await c.close()
    }

    /* ── 6 · the T&Cs & Notes library, a quote template's prose, a Price book item ─────────────────────────────────────────── */
    if (want(6)) {
      console.log('6 · templates and the Price book')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/templates/terms/${BTO}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.getByTestId('template-writing').click(); await settle(p, 300)
      let rows = await menuRows(p)
      ok(!row(rows, 'Add what’s missing')?.disabled && !row(rows, 'Rewrite'), 'the BTO terms: Add what’s missing offered; no Rewrite (a template has no quote to write from)')
      await p.screenshot({ path: `${dir}/13-library-menu.png` })
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Add what’s missing' }).click(); await settle(p, 500)
      ok(/working hours/.test(await proposal(p).innerText()) && /“Terms and Conditions for HDB Works”/.test(await proposal(p).innerText()), '…it brings the HDB template’s working hours (a BTO is an HDB flat)')
      await p.getByTestId('writing-view').getByRole('radio', { name: 'After' }).click(); await settle(p, 200)
      ok(/\[Studio Name\]/.test(await p.getByTestId('writing-paper').innerText()) || /6\. Permitted Hours|Permitted Hours/.test(await p.getByTestId('writing-paper').innerText()), '…a template keeps its [fields] as fields')
      await dialogOf(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 300)
      await p.goto(`${BASE}/templates/terms/${GENERAL}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.getByTestId('template-writing').click(); await settle(p, 300)
      rows = await menuRows(p)
      ok(row(rows, 'Add what’s missing')?.disabled, 'the general terms: nothing to add — an HDB or BTO template never feeds a template for every home')
      await p.keyboard.press('Escape')
      await p.goto(`${BASE}/templates/${QTPL}`, { waitUntil: 'networkidle' }); await settle(p, 1800)
      await p.getByText('We are to submit the following quotation', { exact: false }).first().click(); await settle(p, 700)
      const tw = p.getByTestId('txt-writing')
      ok(await tw.count() >= 1, 'a quote template’s prose (the cover note) carries Write with AI beside Insert a field')
      await tw.first().click(); await settle(p, 300)
      rows = await menuRows(p)
      ok(!row(rows, 'Plain English')?.disabled, '…Plain English reads a studio letter’s formal turns')
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Plain English' }).click(); await settle(p, 500)
      ok(/for your kind perusal and consideration → for you to read and consider/.test(await proposal(p).innerText()), '…“for your kind perusal and consideration” → “for you to read and consider”')
      await p.screenshot({ path: `${dir}/14-template-cover.png` })
      await dialogOf(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 300)
      await p.goto(`${BASE}/company/price-book`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.getByRole('button', { name: /^(Open|Edit) Painting, whole unit$/ }).click(); await settle(p, 700)
      ok(await p.getByTestId('book-writing').count() === 1, 'a Price book item’s description carries Write with AI')
      await p.getByTestId('book-writing').click(); await settle(p, 300)
      rows = await menuRows(p)
      ok(rows.length === 3 && row(rows, 'Shorten'), '…Improve · Shorten · Plain English')
      await p.keyboard.press('Escape'); await c.close()
    }

    /* ── 7 · the message composers: the quote's Send for confirmation ───────────────────────────────────────────────────────── */
    if (want(7)) {
      console.log('7 · a message to the client')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q6}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      await p.getByTestId('quote-send').click(); await settle(p, 300)
      await p.getByRole('menuitem', { name: /Ask to confirm/ }).click(); await settle(p, 700)   // (the calm UI build 2026-10-27, a deliberate change) W-358
      const dlg = p.getByRole('dialog', { name: 'Send for confirmation' })
      const box = dlg.getByLabel('Message to the client')
      const draft = await box.inputValue()
      const link = (draft.match(/https?:\/\/\S+/) || [''])[0]
      await dlg.getByTestId('message-writing').click(); await settle(p, 300)
      const rows = await menuRows(p)
      ok(rows.length === 3 && row(rows, 'Improve the writing')?.disabled, 'the house draft already reads cleanly: Improve says so; Improve · Shorten · Plain English only')
      await p.keyboard.press('Escape'); await settle(p, 200)
      await box.fill(`hi harpreet , pls see the qtn w/ the link below . thx\n${link}`)
      await dlg.getByTestId('message-writing').click(); await settle(p, 300)
      await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Improve the writing' }).click(); await settle(p, 500)
      await p.screenshot({ path: `${dir}/15-message-improve.png` })
      await p.getByTestId('writing-use').click(); await settle(p, 400)
      const v = await box.inputValue()
      ok(/^Hi Harpreet, please see the quotation with the link below\. Thanks\.\n/.test(v), 'Improve: the recipient’s name written their way, short forms spelt out')
      ok(v.endsWith(link) && link.length > 10, '…the link left exactly as it was')
      await p.locator('[role="status"]').getByRole('button', { name: 'Undo' }).last().click(); await settle(p, 300)
      ok(/^hi harpreet , pls/.test(await box.inputValue()), '…Undo puts the typed message back')
      await dlg.getByRole('button', { name: 'Close' }).first().click().catch(async () => { await p.keyboard.press('Escape') }); await settle(p, 400)
      await c.close()
    }

    /* ── 8 · roles, nothing metered ──────────────────────────────────────────────────────────────────────────────────────── */
    if (want(8)) {
      console.log('8 · roles and credits')
      as('germaine')
      const { c, p } = await ctx()
      await p.goto(`${BASE}/quotes/${Q7}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
      const s = await openSection(p, 'terms', 'Terms and conditions')
      ok(await s.getByTestId('writing-help').count() === 1 && !(await s.getByTestId('writing-help').isDisabled()), 'a Designer on her client’s quote has the same help')
      await c.close()
      as('dane')
      ok(sql(`select count(*) || ':' || coalesce(sum(credits), 0) from credit_ledger`) === credits0, 'nothing metered: no AI credits moved (1.0’s writing help charged none)')
    }

    /* ── 9 · widths: 390 · 320 · 768 touch ───────────────────────────────────────────────────────────────────────────────── */
    if (want(9)) {
      console.log('9 · widths')
      for (const [w, h] of [[390, 844], [320, 640], [768, 1024]]) {
        const { c, p } = await ctx({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
        await p.goto(`${BASE}/quotes/${Q1}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
        const s = await openSection(p, 'terms', 'Terms and conditions')
        const btn = s.getByTestId('writing-help')
        await btn.scrollIntoViewIfNeeded()
        if (w < 768) {
          const bw = (await btn.boundingBox()).width, sw = (await s.boundingBox()).width
          ok(bw > sw * 0.75, `${w}: the button takes its own full line under the tools`)
        }
        await btn.click(); await settle(p, 500)
        if (w < 768) ok(/Write with AI/.test(await p.locator('body').innerText()) && await p.locator('[role=menu]').count() === 1, `${w}: the menu rises as a sheet titled Write with AI`)
        await p.locator('[role=menu] [role=menuitem]').filter({ hasText: 'Shorten' }).click(); await settle(p, 700)
        if (w < 768) ok(await dialogOf(p).locator('[class*=grabber]').count() === 1, `${w}: the proposal is a bottom sheet`)
        ok(await noOverflow(p), `${w}: no sideways scroll with the proposal open`)
        if (w === 390) await p.screenshot({ path: `${dir}/16-390-proposal.png` })
        await dialogOf(p).getByRole('button', { name: 'Not now' }).click(); await settle(p, 400)
        await p.goto(`${BASE}/contracts/${CT}`, { waitUntil: 'networkidle' }); await settle(p, 1200)
        ok(await noOverflow(p), `${w}: the contract editor never scrolls sideways (its bar wraps on a phone; the meta row gives way at 768)`)
        ok(await p.getByTestId('contract-writing').count() === 1, `${w}: the contract’s Write with AI is there (the mark alone, named)`)
        if (w === 390) await p.screenshot({ path: `${dir}/17-390-contract.png` })
        await c.close()
      }
    }
  } finally {
    putBack()
    ok(sumOf() === sum0, 'the scratch DB is left as found (each table’s rows)')
    ok(sql(`select terms_html from quotes where id = '${Q1}'`) === terms0 && sql(`select body from contracts where id = '${CT}'`) === body0, '…the terms and the contract as they were')
    ok(errors.length === 0, `the page error log is empty${errors.length ? ` — ${errors.slice(0, 3).join(' | ')}` : ''}`)
    await b.close()
    console.log(`\n${pass} / ${pass + fail}${fail ? `  (${fail} failed)` : ''}`)
    process.exit(fail ? 1 : 0)
  }
})()
