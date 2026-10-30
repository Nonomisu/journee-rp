const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route('**/html-to-image.js', r => r.fulfill({ body: fs.readFileSync(require.resolve('html-to-image/dist/html-to-image.js')), contentType: 'application/javascript' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('n5', process.env.NONO_EMAIL), jy = await open('j5', 'jynette@example.com');
  const newsDocs = async () => Object.values(await nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')))).filter(v => v && v.key && v.to).map(v => v.to + ': ' + v.text.slice(0, 45));
  await jy.evaluate(() => go('khopses')); await jy.click('#hot-khopses'); await jy.waitForTimeout(200); await jy.click('[data-with="client"]'); await jy.waitForTimeout(1500);
  console.log('Avant validation, nouvelles en base :', await newsDocs());
  console.log('Jynette voit (alerte protection ?) :', await jy.evaluate(() => myNews().map(n => n.text)));
  await jy.evaluate(() => { state.khopses.done = false; }); await jy.click('#done-khopses'); await jy.waitForTimeout(1500);
  console.log('Après validation :', await newsDocs());
  await nono.evaluate(() => go('home')); await nono.waitForTimeout(300);
  console.log('Nono :', (await nono.textContent('#view')).replace(/\s+/g, ' ').match(/Nouvelles.{0,70}/)?.[0]);
  // Protection : Nono coche une nuit Viggo-Khopses non protégée (Viggo) -> Jynette seulement après validation de Viggo
  await nono.evaluate(() => go('viggo')); await nono.click('#hot-viggo'); await nono.waitForTimeout(1500);
  console.log('Risque avant validation :', (await newsDocs()).filter(t => t.includes('protégé')));
  await nono.click('#done-viggo'); await nono.waitForTimeout(1500);
  console.log('Risque après validation :', (await newsDocs()).filter(t => t.includes('protégé')));
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune'); await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
