const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const S=process.argv[2];
 for (const [w,h,m] of [[1440,1024,false],[390,844,true]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:m, hasTouch:m });
  await p.goto('http://localhost:3011/leads'); await p.waitForTimeout(1500);
  if (m) await p.click('[aria-label="Notifications"]'); else await p.click('[data-notifications-tile]');
  await p.waitForTimeout(800); await p.screenshot({ path:`${S}/notif-${w}.png` });
  if (!m) { const r = await p.locator('[role=dialog][aria-label=Notifications]').boundingBox(); console.log(JSON.stringify(r));
   await p.keyboard.press('Escape'); await p.waitForTimeout(400); console.log('after esc', await p.locator('[role=dialog][aria-label=Notifications]').count()); }
 } await b.close(); })();
