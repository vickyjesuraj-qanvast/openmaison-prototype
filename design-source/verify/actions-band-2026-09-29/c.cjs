const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:1024} });
 for (const [url,name] of [['/leads/2bc08444-0409-47c3-9675-0750977c5838/files','files'],['/company/templates','templates'],['/company/price-book','pricebook']]) {
  await p.goto('http://localhost:3011'+url); await p.waitForTimeout(2000);
  const t = p.locator('[aria-label*="List" i], [aria-label*="list view" i]').first(); if (await t.count()) { await t.click(); await p.waitForTimeout(800) }
  const all = p.locator('[role=row]:has([class*=actionsInner])'); const n = await all.count(); if (!n) { console.log(name,'no rows'); continue }
  const row = all.nth(Math.min(1,n-1)); await row.hover({force:true}); await p.waitForTimeout(400);
  const r = await row.evaluate(el => { const a = el.querySelector('[class*=actionsInner]').getBoundingClientRect(); let over=[];
   for (const c of el.querySelectorAll('[role=cell]')) { const rg=document.createRange(); rg.selectNodeContents(c); for (const q of rg.getClientRects()) if (q.width && q.right>a.left && q.left<a.right && c.textContent.trim()) over.push(c.textContent.trim().slice(0,20)) } return {left:Math.round(a.left), over:[...new Set(over)]} });
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/542de7a8-61a2-44e5-a516-fda696b104d7/scratchpad/band-'+name+'.png', clip:{x:840,y:0,width:600,height:600} }) }
 await b.close() })();
