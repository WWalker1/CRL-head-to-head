const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel:process.env.CHROME_CHANNEL || undefined });
  const base = process.env.EDITORIAL_TEST_ORIGIN || 'http://127.0.0.1:3107';
  const output = process.env.EDITORIAL_SCREENSHOT_DIR || '.local/editorial-screenshots';
  fs.mkdirSync(output,{recursive:true});
  try {
    for (const [width,theme] of [[320,'light'],[375,'dark'],[390,'light'],[768,'dark'],[1440,'light']]) {
      const page = await browser.newPage({viewport:{width,height:width >= 768 ? 1000 : 844},colorScheme:theme});
      for (const [route,name] of [['/meta','weekly'],['/meta/november-2026','monthly'],['/editorial/october-2026-balance-changes','balance']]) {
        const response = await page.goto(base+route,{waitUntil:'domcontentloaded'});
        assert.equal(response.status(),200);
        await page.locator('main h1').waitFor();
        const canonical = page.locator('link[rel=canonical]');
        assert.equal(await canonical.count(),1);
        assert.equal(new URL(await canonical.getAttribute('href')).pathname,route);
        if (width === 1440 && name === 'weekly') {
          await page.locator('main article img').evaluateAll(async imgs=>{
            for (const img of imgs) img.loading = 'eager';
            await Promise.all(imgs.map(img=>img.decode()));
          });
        }
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth),false,route+' overflow at '+width);
        if (name !== 'balance') {
          const deck = page.locator('main article').first();
          const cards = deck.locator('img');
          assert.equal(await cards.count(),8);
          await deck.scrollIntoViewIfNeeded();
          await cards.evaluateAll(async imgs=>{await Promise.all(imgs.map(img=>img.decode()))});
          await deck.screenshot({path:output+'/'+name+'-deck-'+width+'-'+theme+'.png'});
          await page.evaluate(()=>scrollTo(0,0));
        }
        await page.screenshot({path:output+'/'+name+'-'+width+'-'+theme+'.png'});
      }
      await page.close();
    }
    const page = await browser.newPage();
    assert.equal((await page.goto(base+'/meta/january-2001')).status(),404);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
