// The audit's one noise measure, so every lane's numbers compare. Usage (from the repo, NODE_PATH=$PWD/node_modules):
//   node measure.cjs <base> <path> <shotName> [width height touch]   e.g. node measure.cjs http://localhost:3301 /company/members members-1440
// Prints JSON for the first screen (the viewport) of the page's main area, and writes shots/<shotName>.png (viewport) + -full.png.
const { chromium } = require('playwright')
const path = require('path')
;(async () => {
  const [base, route, name, w = '1440', h = '1024', touch = ''] = process.argv.slice(2)
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: !!touch, hasTouch: !!touch })
  const p = await ctx.newPage()
  const errors = []; p.on('pageerror', (e) => errors.push(e.message))
  await p.goto(base + route, { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(2200)
  await p.mouse.move(2, 2).catch(() => {})
  const dir = path.join(__dirname, 'shots')
  await p.screenshot({ path: path.join(dir, `${name}.png`) })
  await p.screenshot({ path: path.join(dir, `${name}-full.png`), fullPage: true })
  const m = await p.evaluate(() => {
    const root = document.querySelector('main') || document.body; const vh = innerHeight
    const shown = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false } return true }
    const inView = (e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.top < vh && r.bottom > 0 }
    const els = [...root.querySelectorAll('*')].filter((e) => inView(e) && shown(e))
    const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim()
    const texts = els.filter((e) => own(e))
    const words = texts.map(own).join(' ').split(/\s+/).filter(Boolean).length
    const controls = els.filter((e) => e.matches('button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], input, select, textarea'))
    const PRIMARY = 'rgb(85, 0, 255)'
    const primaryText = texts.filter((e) => getComputedStyle(e).color === PRIMARY).map(own)
    const filled = controls.filter((e) => getComputedStyle(e).backgroundColor === PRIMARY).map((e) => e.innerText.trim().slice(0, 40))
    const upper = texts.filter((e) => getComputedStyle(e).textTransform === 'uppercase' || (own(e).length > 3 && own(e) === own(e).toUpperCase() && /[A-Z]{3}/.test(own(e)))).map(own)
    const sizes = new Set(texts.map((e) => getComputedStyle(e).fontSize + '/' + getComputedStyle(e).fontWeight))
    const colors = new Set(texts.map((e) => getComputedStyle(e).color))
    const truncated = texts.filter((e) => { const s = getComputedStyle(e); return s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1 }).map(own)
    const boxes = els.filter((e) => { const s = getComputedStyle(e); return (parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0) || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'rgb(255, 255, 255)' && e.getBoundingClientRect().width > 24) }).length
    return { words, controls: controls.length, primaryLinks: primaryText.length, primaryWords: primaryText.slice(0, 30), filledButtons: filled, uppercase: upper.length, uppercaseWords: upper.slice(0, 20), fontStyles: sizes.size, textColours: colors.size, boxes, truncated: truncated.slice(0, 20), sideways: document.documentElement.scrollWidth > innerWidth, height: document.documentElement.scrollHeight }
  })
  m.errors = errors
  console.log(JSON.stringify(m, null, 1))
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })
