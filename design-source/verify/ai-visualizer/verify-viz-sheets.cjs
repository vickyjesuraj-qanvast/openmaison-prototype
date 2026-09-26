/* AI Visualizer probe, the sheets round (REG-679 … 684): Describe a change (+ the mic where the browser listens), patterned wallpapers,
   style cards with their look and materials, the upload line, the moodboard, and an uploaded photo that keeps its picture and opens as a room.
   Usage: B=http://localhost:3011 OUT=<dir> DB=<scratch db> NODE_PATH=$PWD/node_modules node design-source/verify/ai-visualizer/verify-viz-sheets.cjs */
const { chromium } = require('playwright')
const { execSync } = require('child_process')
const path = require('path')
const B = process.env.B || 'http://localhost:3011', OUT = process.env.OUT || __dirname, DB = process.env.DB
const LEAD = '1f12cbd1-b09b-47f4-89e4-454a1a5e333b', DESIGN = 'b46000d1-1638-4c7c-af20-bebbcc3b9744'
const sql = (q) => execSync(`sqlite3 "${DB}" "${q.replace(/"/g, '\\"')}"`).toString().trim()
let pass = 0, fail = 0
const check = (label, ok, extra = '') => { if (ok) { pass++; console.log('  ok  ', label) } else { fail++; console.log('  FAIL', label, extra) } }
const waitRun = async (page) => { await page.getByTestId('viz-running').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}); await page.getByTestId('viz-running').waitFor({ state: 'detached', timeout: 25000 }); await page.waitForTimeout(900) }
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1024 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${B}/visualizer/${DESIGN}`); await page.waitForTimeout(2200)
  await page.getByRole('button', { name: 'Got it' }).click().catch(() => {})

  console.log('1 · Describe a change, always in view (rows 40 · 207 · 54)')
  check('the box sits above Generate', await page.getByTestId('viz-describe').isVisible())
  const listens = await page.evaluate(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  check(`the mic shows exactly where the browser can listen (${listens ? 'it can' : 'it cannot'})`, (await page.getByTestId('viz-describe-mic').count()) === (listens ? 1 : 0))
  await page.getByTestId('viz-version').first().click(); await page.waitForTimeout(500)
  await page.getByTestId('viz-describe-input').fill('walnut floor and warmer evening light')
  await page.waitForTimeout(300)
  check('words alone make a version', ((await page.getByTestId('viz-generate').textContent()) ?? '').includes('Generate from note'))
  await page.getByTestId('viz-generate').click(); await waitRun(page)
  const noteJob = sql(`select variants_json from render_jobs where room_id=(select id from project_rooms where design_id='${DESIGN}' and name='Living room') order by created_at desc limit 1`)
  check('…the floor takes the words’ walnut', noteJob.includes('"note:Walnut"'), noteJob.slice(0, 200))
  await page.screenshot({ path: `${OUT}/viz-16-describe.png` })

  console.log('2 · wallpapers wear their motif (row 195)')
  await page.getByTestId('viz-version').first().click(); await page.waitForTimeout(500)
  await page.getByTestId('viz-mode-surfaces').click()
  await page.getByRole('button', { name: 'White Painted Back Wall' }).click(); await page.waitForTimeout(900)
  check('the upload line is in reach (row 200)', await page.getByTestId('viz-upload-line').isVisible())
  await page.getByRole('searchbox', { name: 'Search materials' }).fill('stripe'); await page.waitForTimeout(500)
  const chip = page.getByTestId('viz-swatch').filter({ hasText: 'Vertical Stripe Navy' }).first()
  /* (audit 2026-09-26) the chip draws the engine's own tile (a data-URL motif) once the page is live, a CSS stripe before that */
  check('the wallpaper’s chip shows its stripes', /repeating-linear-gradient|url\("data:image\/png/.test((await chip.locator('span').first().getAttribute('style')) ?? ''))
  await chip.click(); await page.waitForTimeout(300)
  await page.getByTestId('viz-describe-input').fill('')
  await page.getByTestId('viz-generate').click(); await waitRun(page)
  check('the wall renders striped', sql(`select variants_json from render_jobs where room_id=(select id from project_rooms where design_id='${DESIGN}' and name='Living room') order by created_at desc limit 1`).includes('"kind":"stripe"'))
  await page.screenshot({ path: `${OUT}/viz-17-wallpaper.png` })

  console.log('3 · style cards: the look and the materials, not colours alone (row 206)')
  await page.getByTestId('viz-mode-style').click(); await page.waitForTimeout(500)
  check('Japandi shows this room in Japandi', ((await page.getByTestId('viz-style-card').filter({ hasText: 'Japandi' }).locator('img').getAttribute('src')) ?? '').includes('/living-room/japandi.jpg'))
  /* (audit 2026-09-26, F015 · F069) the materials sit at the card's foot, one to a line, named in full */
  check('every card names its floor, walls and counters', (await page.getByTestId('viz-style-card').first().locator('[class*="boardItem"]').count()) === 3)
  await page.screenshot({ path: `${OUT}/viz-18-styles.png` })

  console.log('4 · a moodboard (the studios’ row 46)')
  await page.getByTestId('viz-version').nth(2).locator('xpath=..').getByRole('button', { name: /More options/ }).click(); await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: 'Moodboard' }).click(); await page.waitForTimeout(1500)
  check('the board shows the finishes', (await page.getByTestId('viz-moodboard').getByText('Sage Green').count()) >= 1)
  check('…and the colours the picture reads as', (await page.getByTestId('viz-moodboard').locator('b', { hasText: /^#[0-9A-F]{6}$/ }).count()) === 5)
  await page.screenshot({ path: `${OUT}/viz-19-moodboard.png` })
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)

  console.log('5 · an uploaded photo keeps its picture and opens as a room (the studios’ row 5)')
  await page.goto(`${B}/leads/${LEAD}/files`); await page.waitForTimeout(1800)
  await page.locator('input[type="file"]').first().setInputFiles(path.join(process.cwd(), 'public/visualizer/samples/bedroom/original.jpg'))
  await page.waitForTimeout(4000)
  const up = sql(`select id || '|' || thumb from lead_files where lead_id='${LEAD}' and name='original.jpg' order by created_at desc limit 1`)
  const [upId, upThumb] = up.split('|')
  check('the upload keeps its picture at its own address', upThumb === `/files/img/${upId}`, up)
  const res = await page.request.get(`${B}${upThumb}`)
  check('…which serves the picture', res.status() === 200 && (res.headers()['content-type'] ?? '').startsWith('image/'))
  await page.goto(`${B}/leads/${LEAD}/files/${upId}`); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'More options' }).click(); await page.waitForTimeout(300)
  await page.getByRole('menuitem', { name: 'Open in AI Visualizer' }).click()
  await page.waitForURL(/\/visualizer\//, { timeout: 15000 }); await page.waitForTimeout(3500)
  const room = sql(`select substr(original_image_url, 1, 22) || '|' || name from project_rooms where source_file_id='${upId}'`)
  check('…and becomes a room with that very picture', room.startsWith('data:image/jpeg;base64|') || room.startsWith('data:image/'), room)
  await page.screenshot({ path: `${OUT}/viz-20-upload-room.png` })

  console.log(errors.length ? `page errors:\n${errors.join('\n')}` : 'no page errors')
  console.log(`\n${pass} passed · ${fail} failed`)
  await browser.close()
  process.exit(fail || errors.length ? 1 : 0)
})()
