// Nuit calme : avec qui (partagée entre joueurs), nouvelle à la validation, exclusive avec la nuit chaude, nuit précédente.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-11-15T12:00:00'));
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; localStorage.setItem('rp-night-open', JSON.stringify(['tamachag:data-next-night', 'taiga:data-next-night', 'tamachag:data-prev-night'])); }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('c1', process.env.NONO_EMAIL), jy = await open('c2', 'jynette@example.com');
  await nono.evaluate(() => go('tamachag'));
  await nono.check('[data-next-night="Nuit calme"]'); await nono.waitForTimeout(300);
  console.log('Choix proposés :', await nono.$$eval('[data-calm-scope="next"][data-calm-with]', bs => bs.map(x => x.textContent + (x.getAttribute('aria-pressed') === 'true' ? ' ✓' : ''))), '|', (await nono.textContent('.calm-with + .reserved').catch(() => '')).trim());
  console.log('Résumé du repli :', (await nono.textContent('details[data-night-fold="tamachag:data-next-night"] > summary')).trim().replace(/\s+/g, ' '));
  await nono.waitForTimeout(1500);
  await jy.evaluate(() => go('taiga')); await jy.waitForTimeout(300);
  console.log('Chez Taiga (Jynette) : Nuit calme cochée ?', await jy.isChecked('[data-next-night="Nuit calme"]'), '| avec :', await jy.evaluate(() => calmWithOf('taiga')));
  const news = async () => Object.values(JSON.parse(await nono.evaluate(() => localStorage.getItem('mockdb')))).filter(v => v && v.key && v.to).map(v => v.to + ' / ' + v.charId + ' : ' + v.text);
  console.log('Nouvelles avant validation :', await news());
  await nono.click('[data-act="Travail du bois"]'); await nono.click('#done-tamachag'); await nono.waitForTimeout(1500);
  console.log('Après validation :', await news());
  console.log('Récap :', await nono.$$eval('#view .recap .where', ws => ws.map(w => w.textContent.trim()).filter(t => /Nuit/.test(t))));
  // Nuit chaude puis calme : exclusives
  await nono.click('#edit-tamachag'); await nono.waitForTimeout(200); await nono.check('#hot-tamachag'); await nono.waitForTimeout(300);
  console.log('Après Nuit chaude : calme ?', await nono.evaluate(() => !!calmBy.tamachag), '| chez Taiga :', await nono.evaluate(() => !!calmBy.taiga));
  await nono.check('[data-next-night="Nuit calme"]'); await nono.waitForTimeout(300);
  await nono.selectOption('[data-calm-select="next"]', 'khubunjin'); await nono.waitForTimeout(300);
  console.log('Avec Khubunjin : ', await nono.evaluate(() => JSON.stringify(calmBy)), '| chaude :', await nono.evaluate(() => nightOf('tamachag').hot));
  // Nuit précédente
  await nono.check('[data-prev-night="Nuit calme"]'); await nono.waitForTimeout(500);
  const db = JSON.parse(await nono.evaluate(() => localStorage.getItem('mockdb')));
  console.log('Hier :', JSON.stringify(db['days/tamachag/months/2026-11']?.['14']));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
