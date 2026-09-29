const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:1024} });
 for (const [url,name] of [['/leads','leads'],['/tasks','tasks-rail'],['/company/price-book','pricebook'],['/leads/2bc08444-0409-47c3-9675-0750977c5838/tasks','tasks']]) {
  await p.goto('http://localhost:3011'+url); await p.waitForTimeout(2500);
  const rows = p.locator('[role=row]:has([class*=ctionsInner])'); const n = await rows.count(); if (n < 3) { console.log(name,'few rows'); continue }
  const first = await rows.first().boundingBox(); const last = await rows.nth(Math.min(n-1, 12)).boundingBox();
  await p.evaluate(() => { window.__s = []; const rs = [...document.querySelectorAll('[role=row]')].filter(r => r.querySelector('[class*=ctionsInner]'));
    const tick = () => { const h = rs.findIndex(r => r.matches(':hover'));
      const rec = rs.map(r => { const pin = r.querySelector('[class*=pin]') || r.firstElementChild; const un = [...r.children].find(c => !/pin/.test(c.className) && c.getAttribute('role') === 'cell') || r.children[3];
        const bg = (el) => { let e = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)') return c; e = e.parentElement } return '' };
        return bg(pin) + '|' + bg(un) });
      window.__s.push({ h, rec }); if (window.__s.length < 200) requestAnimationFrame(tick) }; requestAnimationFrame(tick) });
  await p.mouse.move(first.x + 400, first.y + 5);
  await p.mouse.move(first.x + 400, last.y + 30, { steps: 12 });
  await p.waitForTimeout(400);
  const s = await p.evaluate(() => window.__s);
  // per frame: hovered row's colors, and any non-hovered row still tinted
  const white = 'rgb(255, 255, 255)';
  let lagFrames = 0, trail = 0, mism = 0, maxTinted = 0;
  for (const f of s) { let tinted = 0; f.rec.forEach((c, i) => { const [a, u] = c.split('|'); if (a !== u) mism++; if (i !== f.h && (u !== white)) tinted++ }); maxTinted = Math.max(maxTinted, tinted); if (f.h >= 0) { const [a,u] = f.rec[f.h].split('|'); if (u === white) lagFrames++ } }
  console.log(name, 'frames', s.length, 'hovered-but-untinted frames', lagFrames, 'max other rows tinted at once', maxTinted, 'pin≠cell samples', mism, 'rest', white);
 }
 await b.close() })();
