// S44G · a quote template's Text block takes formatting (row NB-08 of s42/sweep-newer-branches-2026-10-15.md; S43D's F2-05) — her ask
// 2026-10-15 ("fix all the pending things"), every call as recommended. Each build asserted as the rule it makes:
//  - the block is written with the house rich editor (its dense form for the 320 inspector): Bold · Italic · Underline | Bulleted list ·
//    Numbered list | Text colour (the kit's four only) | Link — no strikethrough, no alignment; the tools are 36 boxes in one row
//  - an existing block opens as its same words (its marks kept) and nothing is written until it is edited
//  - Insert a field puts the field where the caret was (a space either side of a word), and the five money fields are back in its menu
//  - "Prints as" under the box; Write with AI offered on the formatted words
//  - the editor's own Undo / Redo cover the edits; the draft holds the marks through the allowlist (a stray script never stays)
//  - the print (the editor's page, Preview, /confirm/<token>, /quote/<token>) draws the marks as the editor shows them: bold, italic,
//    underline, bullets, numbers, an underlined link that opens beside the quote, a run in the kit's colour as the kit has it today;
//    a link on the editor's page never opens; nothing outside the allowlist reaches a client page
//  - 768 / 1024 touch: the Edit drawer holds the tools in one row, its colour menu and Add link dialog open over it; 390: a phone views a
//    template (never edits it) and the view draws the formatting; the phone's confirmation page shows it under View as printed; no sideways scroll
// Run against `next start` on a scratch copy of the repaired demo DB — never local.db. Everything it writes is put back in `finally`.
// Usage: BASE=http://localhost:3185 NODE_PATH=<repo>/node_modules node verify-pm2-s44g.cjs <scratch.db> [shotDir] [base]
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')
const [DB, dirArg, baseArg] = process.argv.slice(2)
if (!DB || /local\.db$/.test(DB)) { console.error('Give the scratch DB path — never local.db'); process.exit(2) }
const dir = dirArg || path.join(__dirname, 'pm2-s44g')
fs.mkdirSync(dir, { recursive: true })
const BASE = baseArg || process.env.BASE || 'http://localhost:3185'
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 30000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const ok = (cond, name) => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name) } }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 's44g-'))

/* the demo's records: the 4-Room BTO template (published v1, a Text block with emphasis and bold) and OM-10008 printing through it */
const TPL = sql(`select id from quote_templates where name = '4-Room BTO' and deleted_at is null limit 1`)
const TEXT_ID = sql(`select json_extract(value, '$.id') from quote_templates, json_each(json_extract(design_json, '$.blocks')) where quote_templates.id = '${TPL}' and json_extract(value, '$.kind') = 'text' limit 1`)
const Q = sql(`select id from quotes where number = 'OM-10008' and deleted_at is null limit 1`)
const CLIENT = sql(`select l.name from quotes q join leads l on l.id = q.lead_id where q.id = '${Q}'`)
const VIEW_TOKEN = 'probes44gviewlink0001'

/* every row this probe touches, whole — put back column by column */
const BK = []
const backup = (table, where, key = 'id') => { const t = `s44g_bk_${BK.length}`; sql(`drop table if exists ${t}; create table ${t} as select * from ${table} where ${where}`); BK.push({ t, table, where, key }) }
const restoreAll = () => {
  for (const { t, table, where, key } of BK.slice().reverse()) {
    const cols = sql(`select group_concat('"' || name || '"', ',') from pragma_table_info('${table}')`)
    sql(`delete from ${table} where (${where}) and ${key} not in (select ${key} from ${t})`)
    sql(`update ${table} set (${cols}) = (select ${cols} from ${t} where ${t}.${key} = ${table}.${key}) where ${key} in (select ${key} from ${t}); insert or ignore into ${table} select * from ${t}; drop table ${t}`)
  }
}
const writeFile = (name, v) => { const f = path.join(TMP, name); fs.writeFileSync(f, typeof v === 'string' ? v : JSON.stringify(v)); return f }
const textBlockOf = (json) => { try { const j = JSON.parse(json); return ((j.design || j).blocks || []).find((b) => b.id === TEXT_ID) || null } catch { return null } }   // a draft is { design, defaults }
const hexRgb = (h) => { const n = parseInt(h.replace('#', ''), 16); return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})` }

;(async () => {
  if (!TPL || !TEXT_ID || !Q) { console.log('  ✗ the demo records are missing (4-Room BTO · its Text block · OM-10008)'); process.exit(1) }
  const b = await chromium.launch()
  const errors = []
  backup('quote_templates', `id = '${TPL}'`)
  backup('quote_template_versions', `template_id = '${TPL}'`)
  backup('quotes', `id = '${Q}'`)
  backup('settings', `key = 'brand'`, 'key')
  const settle = (p, ms = 700) => p.waitForTimeout(ms)
  const go = async (p, url) => { await p.goto(BASE + url, { waitUntil: 'networkidle' }); await settle(p, 600) }
  const shot = (p, n, full = false) => p.screenshot({ path: path.join(dir, `${n}.png`), fullPage: full })
  const page = async (ctx, tag) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(`${tag}: ${String(e).slice(0, 200)}`)); return p }
  const text = async (l) => ((await l.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim()
  const noSideways = (p) => p.evaluate(() => document.documentElement.scrollWidth <= screen.width + 1 && document.body.scrollWidth <= screen.width + 1)
  /* select the words `t` inside a contenteditable */
  const selectWords = (loc, t) => loc.evaluate((el, w) => {
    el.focus()
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n
    while ((n = walk.nextNode())) { const i = n.textContent.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + w.length); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true } }
    return false
  }, t)
  const caretAfter = (loc, t) => loc.evaluate((el, w) => {
    el.focus()
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n
    while ((n = walk.nextNode())) { const i = n.textContent.indexOf(w); if (i >= 0) { const r = document.createRange(); r.setStart(n, i + w.length); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return true } }
    return false
  }, t)
  const caretEnd = (loc) => loc.evaluate((el) => { el.focus(); const s = getSelection(); s.selectAllChildren(el); s.collapseToEnd() })
  const marksOf = (loc, w) => loc.evaluate((el, word) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n
    while ((n = walk.nextNode())) if (n.textContent.includes(word)) { const tags = []; let a = n.parentElement; while (a && a !== el) { tags.push(a.tagName.toLowerCase() + (a.getAttribute('data-kit') ? `[${a.getAttribute('data-kit')}]` : '')); a = a.parentElement } return tags }
    return null
  }, w)

  try {
    sql(`update members set is_you = (id = 'dane')`)
    const brandAccent = JSON.parse(sql(`select value from settings where key = 'brand'`) || '{}').kit?.colors?.accent || null   // the studio's kit (the template overrides ink · band · red, not Accent)
    const draft0 = sql(`select coalesce(draft_json, '') from quote_templates where id = '${TPL}'`)

    // ── 1 · the editor: the block opens as its words, the tools ────────────────────────────────────────────────────────────────────
    console.log('1 · the Text block in the editor (1440)')
    const D = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const d = await page(D, 'desk')
    const popups = []; D.on('page', (p) => popups.push(p.url()))
    await go(d, `/templates/${TPL}`); await d.waitForSelector('[data-page]', { timeout: 30000 }); await settle(d, 1200)
    const onPage = d.locator(`[data-page] [data-block-id="${TEXT_ID}"]`).first()
    const pageHtml0 = await onPage.innerHTML()
    await onPage.click({ position: { x: 20, y: 6 } }); await settle(d, 700)
    const insp = d.getByTestId('inspector')
    ok((await text(insp.locator('[class*="headTitle"]').first())) === 'Text', 'pressing the Text block opens its Edit pane')
    const body = insp.locator('[role="textbox"][aria-label="Text"]')
    const bar = insp.locator('[role="toolbar"][aria-label="Text formatting"]')
    ok(await body.count() === 1 && await bar.count() === 1, 'the block is written in the house rich editor (a formatting toolbar over a text box), not a plain box')
    ok(await insp.locator('textarea').count() === 0, '…the plain paragraph box is gone')
    const tools = await bar.locator('button[aria-label]').evaluateAll((bs) => bs.map((x) => ({ l: x.getAttribute('aria-label'), w: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height), top: Math.round(x.getBoundingClientRect().top) })))
    const labels = tools.map((t) => t.l)
    const want = ['Bold', 'Italic', 'Underline', 'Bulleted list', 'Numbered list', 'Text colour', 'Link']
    ok(JSON.stringify(labels.filter((l) => want.includes(l))) === JSON.stringify(want), `the tools in order: ${want.join(' · ')}`)
    ok(!labels.some((l) => /Strikethrough|Align/.test(l)), '…no strikethrough and no alignment (the block’s Text style aligns it)')
    const fmt = tools.filter((t) => want.includes(t.l))
    ok(fmt.every((t) => t.w >= 36 && t.h >= 36), '…each tool a 36 box (REG-542)')
    ok(new Set(fmt.map((t) => t.top)).size === 1, '…all seven in one row in the 320 pane')
    ok(await bar.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), '…nothing in the toolbar scrolls out of sight')
    ok(await insp.getByTestId('text-insert-field').count() === 1 && await insp.getByTestId('text-writing').count() === 1, 'Insert a field and Write with AI sit on the line under the tools')
    const html0 = await body.innerHTML()
    ok(/<em>\* Any default in payment/.test(html0) && /<strong>/.test(html0) && /PAYNOW UEN/.test(html0), 'the stored block opens as its same words, its italic and bold kept (the old plain box dropped them on any edit)')
    await settle(d, 2600)
    ok(sql(`select coalesce(draft_json, '') from quote_templates where id = '${TPL}'`) === draft0, '…opening it writes nothing — the page is as it was until it is edited')
    ok((await onPage.innerHTML()) === pageHtml0, '…and the block on the page is unchanged')
    await shot(d, '01-text-block-opens-1440')

    // ── 2 · formatting: bold · italic · underline · lists · link · the kit's colour ───────────────────────────────────────────────
    console.log('2 · formatting the words')
    await caretEnd(body); await d.keyboard.press('Enter'); await d.keyboard.type('Probe bold words'); await d.keyboard.press('Enter')
    await bar.locator('button[aria-label="Bulleted list"]').click(); await settle(d, 200)
    await d.keyboard.type('Bullet one'); await d.keyboard.press('Enter'); await d.keyboard.type('Bullet two'); await d.keyboard.press('Enter'); await d.keyboard.press('Enter'); await settle(d, 200)
    await bar.locator('button[aria-label="Numbered list"]').click(); await settle(d, 200)
    await d.keyboard.type('Number one'); await d.keyboard.press('Enter'); await d.keyboard.press('Enter'); await settle(d, 200)
    await d.keyboard.type('Visit our site'); await settle(d, 300)
    ok(await body.locator('ul > li').count() === 2 && /Bullet one/.test(await text(body.locator('ul > li').first())), 'Bulleted list: two bullet lines')
    ok(await body.locator('ol > li').count() === 1 && /Number one/.test(await text(body.locator('ol > li').first())), 'Numbered list: a numbered line')
    /* typing after the block's last bold field carries its bold on, as every editor does: the probe clears the new lines' marks first, so
       each tool below is seen to add its own */
    await body.evaluate((el) => {
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n, first = null, last = null
      while ((n = walk.nextNode())) { if (!first && n.textContent.includes('Probe bold words')) first = n; if (first) last = n }
      const r = document.createRange(); r.setStart(first, first.textContent.indexOf('Probe bold words')); r.setEnd(last, last.textContent.length)
      el.focus(); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand('removeFormat')
    }); await settle(d, 200)
    await selectWords(body, 'Probe bold words'); await settle(d, 200)
    ok((await bar.locator('button[aria-label="Bold"]').getAttribute('aria-pressed')) === 'false', 'plain words picked: the Bold tool reads unpressed')
    for (const t of ['Bold', 'Italic', 'Underline']) { await bar.locator(`button[aria-label="${t}"]`).click(); await settle(d, 200) }
    const m1 = await marksOf(body, 'Probe bold words') || []
    ok(m1.some((t) => /^(b|strong)$/.test(t)) && m1.some((t) => /^(i|em)$/.test(t)) && m1.some((t) => t === 'u'), `Bold · Italic · Underline mark the picked words (${m1.join(' < ')})`)
    ok(await bar.locator('button[aria-label="Bold"]').getAttribute('aria-pressed') === 'true', '…and the Bold tool reads pressed while they are picked')
    ok(!(await marksOf(body, 'Bullet one') || []).some((t) => /^(b|strong|i|em|u)$/.test(t)), '…the lines after them keep their own plain words')
    await settle(d, 1100)
    await selectWords(body, 'Visit our site')
    await bar.locator('button[aria-label="Link"]').click(); await settle(d, 400)
    const linkDlg = d.getByRole('dialog').filter({ hasText: 'Add link' })
    ok(await linkDlg.count() === 1, 'Link opens the house Add link dialog')
    await linkDlg.getByLabel('Link URL').fill('example.com'); await linkDlg.getByRole('button', { name: 'Add', exact: true }).click(); await settle(d, 1100)
    ok(await body.locator('a[href="https://example.com"]').count() === 1 && (await text(body.locator('a[href="https://example.com"]'))) === 'Visit our site', '…the picked words link to https://example.com')
    await selectWords(body, 'Probe bold words')
    await bar.locator('button[aria-label="Text colour"]').click(); await settle(d, 300)
    const colourMenu = d.locator('[role="menu"]').last()
    const swatches = (await colourMenu.locator('[role="menuitem"]').allInnerTexts()).map((s) => s.trim())
    ok(JSON.stringify(swatches) === JSON.stringify(['Ink', 'Accent', 'Red', 'Grey', 'The text’s own colour']), `Text colour offers the kit’s four and the text’s own colour — never a free colour (${swatches.join(' · ')})`)
    await colourMenu.locator('[role="menuitem"]').filter({ hasText: 'Accent' }).click(); await settle(d, 1100)
    ok((await marksOf(body, 'Probe bold words') || []).includes('span[accent]'), '…Accent wraps the picked words as the kit’s colour (data-kit="accent"), their bold · italic · underline kept')
    await shot(d, '02-formatted-1440')

    // ── 3 · Insert a field at the caret; Prints as; the money fields ──────────────────────────────────────────────────────────────
    console.log('3 · Insert a field')
    await caretAfter(body, 'Bullet two'); await settle(d, 300)
    await insp.getByTestId('text-insert-field').click(); await settle(d, 400)
    const fieldMenu = d.locator('[role="menu"]').last()
    const fieldRows = (await fieldMenu.locator('[role="menuitem"]').allInnerTexts()).map((s) => s.trim())
    ok(['Item count', 'Subtotal', 'GST amount', 'GST rate', 'Grand total'].every((l) => fieldRows.includes(l)), 'the Insert a field menu lists Item count · Subtotal · GST amount · GST rate · Grand total again (a comment had swallowed them)')
    await fieldMenu.locator('[role="menuitem"]').filter({ hasText: /^Client name$/ }).click(); await settle(d, 1100)
    const li2 = await text(body.locator('ul > li').nth(1))
    ok(li2 === 'Bullet two {client_name}', `the field lands where the caret was, a space before it — “${li2}”`)
    ok(!/\{client_name\}$/.test(await text(body)), '…not at the end of the words')
    const helper = await text(insp.locator('[class*="helper"]').first())
    ok(/^Prints as: /.test(helper) && !/\{client_name\}/.test(helper), `“Prints as” under the box reads the field as the quote on the page prints it (${helper.slice(0, 60)}…)`)
    await insp.getByTestId('text-writing').click(); await settle(d, 400)
    const helpRows = (await d.locator('[role="menu"]').last().locator('[role="menuitem"]').allInnerTexts()).map((s) => s.trim().split('\n')[0])
    ok(['Improve the writing', 'Shorten', 'Plain English'].every((l) => helpRows.includes(l)), `Write with AI is offered on the formatted words (${helpRows.join(' · ')})`)
    await d.keyboard.press('Escape'); await settle(d, 300)

    // ── 4 · the editor's undo; the draft; the canvas ─────────────────────────────────────────────────────────────────────────────
    console.log('4 · Undo, the saved draft, the page')
    await settle(d, 2600)
    const h1 = textBlockOf(sql(`select draft_json from quote_templates where id = '${TPL}'`))?.html || ''
    ok(/<(b|strong)>/.test(h1) && /<(i|em)>/.test(h1) && /<u>/.test(h1) && /<ul>\s*<li>/.test(h1) && /<ol>\s*<li>/.test(h1) && /<a href="https:\/\/example\.com"/.test(h1) && /data-kit="accent"/.test(h1) && /\{client_name\}/.test(h1), 'the draft saves the words with every mark (bold · italic · underline · lists · link · the kit’s colour · the field)')
    ok(/<em>\* Any default in payment/.test(h1), '…and the block’s earlier words keep their italic')
    const undoBtn = d.locator('button[aria-label="Undo"]').first(), redoBtn = d.locator('button[aria-label="Redo"]').first()
    let undos = 0
    while (undos < 6 && /\{client_name\}/.test(await body.innerHTML())) { await undoBtn.click(); await settle(d, 350); undos++ }
    ok(!/\{client_name\}/.test(await body.innerHTML()) && /data-kit="accent"/.test(await body.innerHTML()), `the editor’s Undo takes the field back out of the box (${undos} step${undos === 1 ? '' : 's'}), the colour before it kept`)
    let u2 = 0
    while (u2 < 6 && /<a href/.test(await body.innerHTML())) { await undoBtn.click(); await settle(d, 350); u2++ }
    ok(!/<a href/.test(await body.innerHTML()) && /Visit our site/.test(await body.innerHTML()), '…further back, the link is gone and its words stay')
    for (let i = 0; i < undos + u2; i++) { await redoBtn.click(); await settle(d, 250) }
    await settle(d, 600)
    ok(/<a href="https:\/\/example\.com"/.test(await body.innerHTML()) && /\{client_name\}/.test(await body.innerHTML()), 'Redo brings the link and the field back into the box')
    const canvasBlock = d.locator(`[data-page] [data-block-id="${TEXT_ID}"] [class*="textBlock"]`).first()
    ok(await canvasBlock.evaluate((el) => getComputedStyle(el.querySelector('ul')).listStyleType === 'disc' && getComputedStyle(el.querySelector('ol')).listStyleType === 'decimal'), 'the editor’s page draws the bullets and the numbers')
    const url0 = d.url()
    await d.locator(`[data-page] [data-block-id="${TEXT_ID}"] a`).first().click(); await settle(d, 800)
    ok(d.url() === url0 && popups.length === 0, 'a link on the editor’s page never opens while the template is being made')
    ok((await text(insp.locator('[class*="headTitle"]').first())) === 'Text', '…the press selects its block')
    await shot(d, '03-canvas-1440')
    const structRow = await d.locator('aside').first().innerText().catch(() => '')
    ok(!/&amp;|<\/?[a-z]/.test(structRow), 'the Page list names the block by its words, no markup or entities')
    await D.close()

    // ── 5 · the print and the client pages, through the client projection ───────────────────────────────────────────────────────
    console.log('5 · Preview and the client’s pages')
    const printed = `${h1}<p onclick="window.__s44g = 1">Probe tail</p><img src="x" onerror="window.__s44g = 2"><script>window.__s44g = 3</script>`
    const design = JSON.parse(sql(`select design_json from quote_template_versions where template_id = '${TPL}' and version = 1`))
    for (const blk of design.blocks) if (blk.id === TEXT_ID || blk.kind === 'text') blk.html = printed
    const f = writeFile('design.json', design)
    /* published as v1 (the quote prints the template's own design while it is on the latest version, else the kept version's) */
    sql(`update quote_template_versions set design_json = cast(readfile('${f}') as text) where template_id = '${TPL}' and version = 1; update quote_templates set design_json = cast(readfile('${f}') as text), draft_json = null where id = '${TPL}'`)
    sql(`update quotes set template_id = '${TPL}', template_version = 1, view_token = '${VIEW_TOKEN}' where id = '${Q}'`)
    const token = sql(`select confirm_token from quotes where id = '${Q}'`)
    const P = await b.newContext({ viewport: { width: 1440, height: 1024 } })
    const checkPrint = async (p, where, accent) => {
      await p.waitForSelector('[data-page]', { timeout: 30000 }); await settle(p, 1200)
      const blk = p.locator('[data-page] [class*="textBlock"]').filter({ hasText: 'Probe bold words' }).first()
      ok(await blk.count() === 1, `${where}: the Text block prints`)
      const r = await blk.evaluate((el, word) => {
        let n; const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        while ((n = walk.nextNode())) if (n.textContent.includes(word)) break
        const cs = n ? getComputedStyle(n.parentElement) : null
        const ul = el.querySelector('ul'), ol = el.querySelector('ol'), a = el.querySelector('a[href="https://example.com"]'), kit = el.querySelector('span[data-kit="accent"]')
        const deco = (x) => { let e = x; while (e && e !== el) { if (getComputedStyle(e).textDecorationLine.includes('underline')) return true; e = e.parentElement } return false }
        return {
          weight: cs ? Number(cs.fontWeight) : 0, italic: cs ? cs.fontStyle : '', underline: n ? deco(n.parentElement) : false,
          kitColor: kit ? getComputedStyle(kit).color : null,
          ul: ul ? getComputedStyle(ul).listStyleType : null, ulItems: ul ? ul.querySelectorAll('li').length : 0, ol: ol ? getComputedStyle(ol).listStyleType : null,
          link: a ? { target: a.getAttribute('target'), rel: a.getAttribute('rel'), underline: getComputedStyle(a).textDecorationLine.includes('underline') } : null,
          words: el.innerText, scripts: document.querySelectorAll('[data-page] script').length, handlers: document.querySelectorAll('[data-page] [onclick], [data-page] [onerror]').length,
        }
      }, 'Probe bold words')
      ok(r.weight >= 700 && r.italic === 'italic' && r.underline, `${where}: bold · italic · underline print as the editor shows them`)
      ok(r.ul === 'disc' && r.ulItems === 2 && r.ol === 'decimal', `${where}: the bullets and the numbers print`)
      ok(r.link && r.link.target === '_blank' && /noopener/.test(r.link.rel || '') && r.link.underline, `${where}: the link prints underlined and opens beside the quote`)
      ok(!!accent && r.kitColor === hexRgb(accent), `${where}: the coloured words print in the kit’s Accent (${r.kitColor})`)
      ok(r.words.includes(`Bullet two ${CLIENT}`) && !/\{client_name\}/.test(r.words), `${where}: the field prints as the client’s name (“Bullet two ${CLIENT}”)`)
      ok(r.scripts === 0 && r.handlers === 0 && await p.evaluate(() => window.__s44g === undefined), `${where}: a handler or a script stored in the block never reaches the page (the allowlist)`)
      return blk
    }
    const pv = await page(P, 'preview')
    await go(pv, `/quotes/${Q}/preview`)
    const pBlk = await checkPrint(pv, 'Preview', brandAccent)
    await pBlk.scrollIntoViewIfNeeded(); await pv.evaluate(() => window.scrollBy(0, 200)); await shot(pv, '04-preview-1440')
    const cf = await page(P, 'confirm')
    await go(cf, `/confirm/${token}`)
    const cBlk = await checkPrint(cf, '/confirm/<token>', brandAccent)
    await cBlk.scrollIntoViewIfNeeded(); await shot(cf, '05-confirm-1440')
    const vw = await page(P, 'view')
    await go(vw, `/quote/${VIEW_TOKEN}`)
    await checkPrint(vw, '/quote/<token>', brandAccent)
    /* the words follow the kit: the studio changes its Accent, the print's colour follows (the editor wrote a key, never a colour) */
    const brand = JSON.parse(sql(`select value from settings where key = 'brand'`))
    brand.kit = { ...(brand.kit || {}), colors: { ...((brand.kit || {}).colors || {}), accent: '#1F6F5C' } }
    sql(`update settings set value = cast(readfile('${writeFile('brand.json', brand)}') as text) where key = 'brand'`)
    await go(pv, `/quotes/${Q}/preview`)
    await checkPrint(pv, 'Preview after the kit’s Accent changed', '#1F6F5C')
    await P.close()

    // ── 6 · phone and tablet ─────────────────────────────────────────────────────────────────────────────────────────────────────
    console.log('6 · 390, 768 and 1024 touch')
    /* a phone views a template, never edits it ("Templates are edited on a tablet or computer"): the view draws the formatted block */
    {
      const T = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
      const t = await page(T, 'touch-390')
      await go(t, `/templates/${TPL}`); await t.waitForSelector('[data-page]', { timeout: 30000 }); await settle(t, 1200)
      const v = t.locator(`[data-page] [data-block-id="${TEXT_ID}"] [class*="textBlock"]`).first()
      ok(/edited on a tablet or computer/i.test(await text(t.locator('body'))) && await v.evaluate((el) => !!el.querySelector('ul li') && !!el.querySelector('ol li') && !!el.querySelector('a[href]') && !!el.querySelector('span[data-kit]')), '390 touch: the template’s view (a phone never edits) draws the formatted block')
      ok(await noSideways(t), '390 touch: the view never scrolls sideways')
      await v.scrollIntoViewIfNeeded(); await shot(t, '06-view-390-touch')
      await T.close()
    }
    for (const [w, h, tag] of [[768, 1024, '768'], [1024, 768, '1024']]) {
      const T = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true })
      const t = await page(T, `touch-${tag}`)
      await go(t, `/templates/${TPL}`); await t.waitForSelector('[data-page]', { timeout: 30000 }); await settle(t, 1200)
      await t.locator(`[data-page] [data-block-id="${TEXT_ID}"]`).first().tap({ position: { x: 10, y: 4 } }); await settle(t, 900)
      const openEdit = async () => { if (await t.getByRole('dialog').getByRole('toolbar', { name: 'Text formatting' }).count() === 0) { await t.getByRole('button', { name: /^Edit( selection)?$/ }).tap(); await settle(t, 900) } }
      await openEdit()
      const tb = t.getByRole('dialog').getByRole('toolbar', { name: 'Text formatting' })
      ok(await tb.count() === 1, `${tag} touch: the Edit drawer opens the Text block’s editor`)
      const tt = await tb.locator('button[aria-label]').evaluateAll((bs) => bs.map((x) => ({ top: Math.round(x.getBoundingClientRect().top), w: Math.round(x.getBoundingClientRect().width), right: Math.round(x.getBoundingClientRect().right) })))
      ok(tt.length === 7 && new Set(tt.map((x) => x.top)).size === 1 && tt.every((x) => x.w >= 36 && x.right <= w), `${tag} touch: the seven tools in one row, each a 36 box, inside the screen`)
      const tbody = t.getByRole('dialog').locator('[role="textbox"][aria-label="Text"]')
      ok(await tbody.evaluate((el) => !!el.querySelector('ul li') && !!el.querySelector('a[href]')), `${tag} touch: the box holds the formatted words`)
      ok(await noSideways(t), `${tag} touch: the editor never scrolls sideways`)
      await shot(t, `06-drawer-${tag}-touch`)
      /* the colour menu and the Add link dialog open over the drawer, reachable */
      await selectWords(tbody, 'Visit our site'); await tb.locator('button[aria-label="Text colour"]').tap(); await settle(t, 500)
      const cm = t.locator('[role="menu"]').filter({ hasText: 'Accent' }).last()
      ok(await cm.count() === 1 && await cm.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(20, r.height / 2)); return !!top && el.contains(top) }), `${tag} touch: Text colour’s menu opens over the drawer`)
      await t.keyboard.press('Escape'); await settle(t, 400)
      await openEdit()
      await selectWords(t.getByRole('dialog').locator('[role="textbox"][aria-label="Text"]'), 'Visit our site')
      await t.getByRole('dialog').getByRole('toolbar', { name: 'Text formatting' }).locator('button[aria-label="Link"]').tap(); await settle(t, 500)
      const ld = t.getByRole('dialog').filter({ hasText: 'Add link' }).filter({ hasNot: t.getByTestId('inspector') })
      ok(await ld.count() === 1 && await ld.getByLabel('Link URL').evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!top && (el === top || el.contains(top) || top.contains(el)) }), `${tag} touch: the Add link dialog opens over the drawer, its box reachable`)
      if (await ld.count()) { await ld.getByRole('button', { name: 'Cancel' }).tap(); await settle(t, 400) }
      await T.close()
    }
    const Ph = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const ph = await page(Ph, 'phone-confirm')
    await go(ph, `/confirm/${token}`); await settle(ph, 800)
    const printedBtn = ph.getByRole('button', { name: /View as printed/ }).first()
    if (await printedBtn.count()) { await printedBtn.tap(); await settle(ph, 1200) }
    const phBlk = ph.locator('[data-page] [class*="textBlock"]').filter({ hasText: 'Probe bold words' }).first()
    ok(await phBlk.count() === 1 && await phBlk.evaluate((el) => !!el.querySelector('ul li') && !!el.querySelector('a[target="_blank"]')), '390: the confirmation page’s View as printed shows the formatted block')
    ok(await noSideways(ph), '390: the confirmation page never scrolls sideways')
    if (await phBlk.count()) { await phBlk.scrollIntoViewIfNeeded(); await shot(ph, '07-confirm-390-touch') }
    await Ph.close()

    ok(errors.length === 0, `no page errors${errors.length ? ` — ${errors.join(' | ')}` : ''}`)
  } catch (e) {
    fail++; console.log('  ✗ probe stopped:', String(e).slice(0, 400))
  } finally {
    try { restoreAll() } catch (e) { console.log('  ✗ restore failed', String(e).slice(0, 200)) }
    sql(`update members set is_you = (id = 'dane')`)
    const back = sql(`select coalesce(draft_json, '') || '|' || coalesce(view_token, '') from quote_templates, quotes where quote_templates.id = '${TPL}' and quotes.id = '${Q}'`)
    ok(!/Probe bold words|probes44g/.test(back), 'every record the probe touched is put back')
    await b.close()
    console.log(`\n${pass} passed, ${fail} failed`)
    process.exit(fail ? 1 : 0)
  }
})()
