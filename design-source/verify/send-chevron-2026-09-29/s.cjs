const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport:{width:1440,height:1024} });
 const ids = process.argv.slice(2);
 for (const id of ids) { await p.goto('http://localhost:3011/quotes/'+id); await p.waitForTimeout(2000);
  const btn = p.locator('button:has-text("Send")').first(); if (!(await btn.count())) continue;
  const c = await btn.evaluate(el => { const s = el.querySelector('span [class*=chev], [class*=chev]'); return s ? getComputedStyle(s).color + ' / ' + getComputedStyle(el).color : 'no chev' });
  console.log(id, c); if (c !== 'no chev') { await btn.screenshot({ path: '/private/tmp/claude-501/-Users-vicky-Documents-GitHub-openmaison-prototype/542de7a8-61a2-44e5-a516-fda696b104d7/scratchpad/send.png' }); break } }
 await b.close(); })();
