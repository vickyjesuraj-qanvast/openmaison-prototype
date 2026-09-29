const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:1024} });
 for (const [url,name] of [['/leads','leads'],['/leads/2bc08444-0409-47c3-9675-0750977c5838/tasks','tasks'],['/tasks','tasks-rail']]) {
  await p.goto('http://localhost:3011'+url); await p.waitForTimeout(2500);
  const rows = p.locator('[role=row]:has([class*=ctionsInner])'); const n = await rows.count();
  const first = await rows.first().boundingBox(); const last = await rows.nth(n-1).boundingBox();
  await p.evaluate(() => { window.__lo = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lo.push({d: Math.round(e.duration), style: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0)}) }).observe({ type: 'long-animation-frame', buffered: false });
    window.__f = []; let last = performance.now(); const tick = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 400) requestAnimationFrame(tick) }; requestAnimationFrame(tick) });
  const x = first.x + 300; const y0 = first.y + 10, y1 = Math.min(last.y + 10, 1000);
  await p.mouse.move(x, y0); const t0 = Date.now();
  for (let k = 0; k < 3; k++) { await p.mouse.move(x, y1, { steps: 25 }); await p.mouse.move(x, y0, { steps: 25 }); }
  const dt = Date.now() - t0;
  const r = await p.evaluate(() => { const f = window.__f.slice(1); const slow = f.filter(x => x > 20).length; return { frames: f.length, avg: +(f.reduce((a,b)=>a+b,0)/f.length).toFixed(1), max: Math.round(Math.max(...f)), over20: slow, loaf: window.__lo } });
  console.log(name, n, 'rows', dt+'ms', JSON.stringify(r).slice(0,400));
 }
 await b.close() })();
