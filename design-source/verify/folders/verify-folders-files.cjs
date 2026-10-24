// REG-664 — the Files tab's folders on the shared kit (components/om/folders): New Folder in the toolbar, names checked, folders inside
// folders with the whole way as links and Back up one level, folders first in the list, an empty folder that says so, a search that says
// where each hit lives, the folder menu's phone sheet named for the folder, a refused move that says so, Delete forever's "items".
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const S = process.env.S, DB = process.env.TESTDB, BASE = 'http://localhost:3011'
const results = []
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`) }
const sql = (q) => execSync(`sqlite3 -cmd ".timeout 5000" "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
async function step(name, fn) { try { await fn() } catch (e) { ok(name, false, e.message.split('\n').filter((l) => /waiting for|intercepts|Timeout|Error|expected/.test(l)).slice(0, 4).join(' | ')) } }
async function ready(page) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900) }
const snack = (page) => page.locator('[role="status"][aria-live="polite"]').innerText().catch(() => '')
const LEAD = sql(`select lead_id from lead_files where kind='folder' and name='Kitchen' and deleted_at is null limit 1`)
const KITCHEN = sql(`select id from lead_files where kind='folder' and name='Kitchen' and lead_id='${LEAD}' and deleted_at is null`)
const KFILE = sql(`select name from lead_files where parent_id='${KITCHEN}' and kind<>'folder' and deleted_at is null order by created_at limit 1`)
const folderOf = (name) => sql(`select id from lead_files where lead_id='${LEAD}' and kind='folder' and name='${name}' and deleted_at is null limit 1`)

;(async () => {
  const browser = await chromium.launch()
  const shot = (p, n) => p.screenshot({ path: `${S}/shots-folders/${n}.png` })

  await step('desktop', async () => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/leads/${LEAD}/files`); await ready(page)
    // New Folder in the toolbar, with the name checked
    await page.getByRole('button', { name: 'New Folder', exact: true }).click(); await page.waitForTimeout(400)
    const dlg = page.getByRole('dialog', { name: 'Create Folder' })
    ok('the toolbar makes a folder, even with files on the page', await dlg.isVisible())
    await dlg.getByRole('textbox').fill('kitchen'); await dlg.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(300)
    ok('a sibling’s name is refused under the field', await dlg.getByText('A folder here already has this name').isVisible())
    await dlg.getByRole('textbox').fill('Bathroom'); await page.waitForTimeout(150)
    ok('the message clears as the name is fixed', await dlg.getByText('A folder here already has this name').count() === 0)
    await dlg.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1200)
    ok('it lands at the top', !!folderOf('Bathroom') && sql(`select parent_id is null from lead_files where id='${folderOf('Bathroom')}'`) === '1', (await snack(page)).slice(0, 40))
    // a folder inside a folder
    await page.getByRole('button', { name: 'Open Kitchen' }).click(); await ready(page)
    await page.getByRole('button', { name: 'New Folder', exact: true }).click(); await page.waitForTimeout(300)
    await page.getByRole('dialog', { name: 'Create Folder' }).getByRole('textbox').fill('Tiles'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200)
    const TILES = folderOf('Tiles')
    ok('New Folder inside a folder makes it there', !!TILES && sql(`select parent_id from lead_files where id='${TILES}'`) === KITCHEN)
    await page.getByRole('button', { name: 'Open Tiles' }).click(); await ready(page)
    const crumbs = await page.getByTestId('folder-crumbs').innerText()
    ok('the crumb spells the whole way', /All Files\s*\/\s*Kitchen\s*\/\s*Tiles/.test(crumbs.replace(/\n/g, ' ')), crumbs.replace(/\n/g, ' '))
    ok('an empty folder says so', await page.getByTestId('folder-empty').isVisible())
    await shot(page, 'files-01-empty-nested-1440')
    await page.getByTestId('folder-crumbs').getByRole('button', { name: 'Kitchen', exact: true }).click(); await ready(page)
    ok('a crumb on the way is a link', page.url().includes(`folder=${KITCHEN}`))
    await page.getByRole('button', { name: 'Open Tiles' }).click(); await ready(page)
    await page.getByRole('button', { name: 'Back to Kitchen' }).click(); await ready(page)
    ok('Back goes up one level', page.url().includes(`folder=${KITCHEN}`))
    // folders first in the list
    await page.getByRole('radio', { name: 'List view' }).click().catch(() => page.getByRole('button', { name: 'List view' }).click()); await page.waitForTimeout(500)
    const kinds = await page.locator('[role="row"][data-kind]').evaluateAll((rows) => rows.map((r) => r.getAttribute('data-kind')))
    ok('the list puts folders first', kinds[0] === 'folder' && kinds.lastIndexOf('folder') < kinds.indexOf('file'), kinds.join(','))
    await shot(page, 'files-02-list-folders-first-1440')
    await page.getByRole('radio', { name: 'Grid view' }).click().catch(() => page.getByRole('button', { name: 'Grid view' }).click()); await page.waitForTimeout(400)
    // a search says where each hit lives
    await page.getByRole('button', { name: 'Back to All Files' }).click(); await ready(page)
    const search = page.getByRole('searchbox', { name: 'Search files' })
    if (!(await search.isVisible().catch(() => false))) await page.getByRole('button', { name: /Search files/ }).click()
    await page.getByRole('searchbox', { name: 'Search files' }).fill(KFILE); await page.waitForTimeout(400)
    const places = await page.getByTestId('file-tile').evaluateAll((ts) => ts.map((t) => t.querySelector('[class*="tilePlace"]')?.textContent ?? ''))
    ok('a hit says where it lives — in Kitchen or at the top', places.some((p) => /Kitchen/.test(p)) && places.some((p) => /All Files/.test(p)), [...new Set(places)].join(' · '))
    await shot(page, 'files-03-search-place-1440')
    await page.getByRole('searchbox', { name: 'Search files' }).fill('')
    // a refused move says so: the destination goes while the dialog is open
    await page.getByRole('button', { name: 'Open Kitchen' }).click(); await ready(page)
    await page.getByTestId('file-tile').first().getByRole('button', { name: /^Actions for / }).click(); await page.waitForTimeout(300)
    await page.getByRole('menuitem', { name: 'Move' }).click(); await page.waitForTimeout(400)
    const mv = page.getByRole('dialog').filter({ hasText: 'Current location' })
    ok('the Move dialog names where the file sits (Kitchen)', /Current location:.*Kitchen/.test((await mv.innerText()).replace(/\n/g, ' ')), (await mv.innerText()).replace(/\n/g, ' ').slice(0, 60))
    await mv.getByRole('button', { name: 'Back' }).click().catch(() => {}); await page.waitForTimeout(200)
    sql(`update lead_files set deleted_at=strftime('%s','now') where id='${folderOf('Bathroom')}'`)
    await mv.getByRole('listitem').filter({ hasText: 'Bathroom' }).hover(); await mv.getByRole('listitem').filter({ hasText: 'Bathroom' }).getByRole('button', { name: 'Move' }).click(); await page.waitForTimeout(1200)
    ok('a refused move says it failed — not "Moved to …"', /Couldn’t move/.test(await snack(page)), (await snack(page)).slice(0, 60))
    // Delete forever says "items" when a folder is among them (a file goes to the trash too, so two are picked)
    sql(`update lead_files set deleted_at=strftime('%s','now') where id=(select id from lead_files where parent_id='${KITCHEN}' and kind<>'folder' and deleted_at is null order by created_at limit 1)`)
    await page.goto(`${BASE}/leads/${LEAD}/files`); await ready(page)
    await page.getByRole('button', { name: 'More options', exact: true }).last().click(); await page.getByRole('menuitem', { name: 'Deleted Files' }).click(); await page.waitForTimeout(600)
    const sheet = page.getByRole('dialog').filter({ hasText: 'Deleted Files' }).last()
    const row = sheet.getByRole('row').filter({ hasText: 'Bathroom' })
    await row.getByRole('checkbox').check({ force: true })
    await sheet.getByRole('row').filter({ hasText: 'Q-101' }).first().getByRole('checkbox').check({ force: true }); await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Delete Forever' }).last().click(); await page.waitForTimeout(400)
    const title = await page.getByRole('dialog').filter({ hasText: /forever\?/ }).last().innerText().catch(() => '')
    ok('Delete forever with a folder among them says items, not files', /Delete 2 items forever\?/.test(title), title.split('\n')[0])
    await shot(page, 'files-05-delete-items-1440')
    await ctx.close()
  })

  await step('phone', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const page = await ctx.newPage(); page.setDefaultTimeout(12000)
    await page.goto(`${BASE}/leads/${LEAD}/files?folder=${KITCHEN}`); await ready(page)
    /* (leads on the move, a deliberate change of this rule — L4, C-15) a phone's folder keeps ONE toolbar row and ONE ⋮: the folder's Move ·
       Rename · Delete ride in that ⋮, whose sheet is named for the folder (the crumb's own kebab is the desk's) */
    await page.getByTestId('files-phone-more').click(); await page.waitForTimeout(500)
    const named = await page.getByRole('menu', { name: 'Kitchen' }).isVisible().catch(() => false)
    const wrong = await page.getByRole('menu', { name: 'New Folder' }).count()
    const rows = await page.getByRole('menu', { name: 'Kitchen' }).innerText().catch(() => '')
    ok('390: the folder menu’s sheet is named for the folder, not "New Folder"', named && wrong === 0 && /Rename folder/.test(rows))
    await page.keyboard.press('Escape'); await page.waitForTimeout(300)
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    ok('390: the crumb row and toolbar fit', over <= 0, `${over}px`)
    await shot(page, 'files-04-phone-390')
    await ctx.close()
  })

  await browser.close()
  console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`)
})()
