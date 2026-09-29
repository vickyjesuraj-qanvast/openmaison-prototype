const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const S=process.argv[2], lead=process.argv[3];
 const p = await b.newPage({ viewport:{width:1440,height:1024} });
 const check = async (url, rowSel, actSel, name) => {
  await p.goto('http://localhost:3011'+url); await p.waitForTimeout(2000);
  // scroll table to end sideways
  await p.evaluate(() => document.querySelectorAll('*').forEach(e => { if (e.scrollWidth > e.clientWidth + 4 && getComputedStyle(e).overflowX !== 'visible' && e.clientHeight > 100) e.scrollLeft = 99999 }));
  const all = p.locator(rowSel); const row = (await all.count()) > 1 ? all.nth(1) : all.first(); if (!(await row.count())) { console.log(name, 'no rows'); return } await row.scrollIntoViewIfNeeded(); await row.hover({ force: true }); await p.waitForTimeout(400);
  const r = await row.evaluate((el, actSel) => { const a = el.querySelector(actSel); const ab = a.getBoundingClientRect();
    const cells = [...el.querySelectorAll('[role=cell], [class*=cell]')].filter(c => !a.contains(c));
    let over = []; for (const c of cells) { const rg = document.createRange(); rg.selectNodeContents(c); for (const t of rg.getClientRects()) if (t.width && t.right > ab.left && t.left < ab.right && c.textContent.trim()) over.push(c.textContent.trim().slice(0,20)) }
    return { left: Math.round(ab.left), over: [...new Set(over)] } }, actSel);
  console.log(name, JSON.stringify(r)); await p.screenshot({ path: `${S}/band-${name}.png`, clip: { x: 900, y: 0, width: 540, height: 500 } });
 };
 await check('/leads', '[role=row]:has([class*=rowActionsInner])', '[class*=rowActionsInner]', 'leads');
 await check(`/leads/${lead}/quotes`, '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'quotes');
 await check('/leads/2bc08444-0409-47c3-9675-0750977c5838/tasks', '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'tasks');
 await check('/leads/2b6d6bfc-5d25-48c8-904a-6f7a7c85cec3/contracts', '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'contracts');
 await check('/leads/2bc08444-0409-47c3-9675-0750977c5838/files?view=list', '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'files');
 await check('/tasks', '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'tasks-rail');
 await check('/quote-x-ray', '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'xray');
 await check(`/company/templates?view=list`, '[role=row]:has([class*=actionsInner])', '[class*=actionsInner]', 'templates');
 await b.close(); })().catch(e => { console.log('ERR', e.message.split('\n')[0]); process.exit(0) });
