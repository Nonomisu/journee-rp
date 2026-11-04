// Chasse : prise choisie à la main ; déroulé du jour : une activité sur deux périodes apparaît dans chacune.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'hu'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.removeItem('mockdb')); await p.reload(); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.evaluate(() => go('tengis'));
  await p.click('[data-act="Chasse en groupe"]'); await p.waitForTimeout(150);
  console.log('Tirage :', (await p.textContent('.hunt')).trim());
  await p.click('[data-hunt-mode="Chasse en groupe"][data-v="manual"]'); await p.waitForTimeout(150);
  console.log('Proies proposées :', await p.$$eval('datalist option', o => o.length), '| reprise du tirage :', await p.evaluate(() => JSON.stringify(state.tengis.huntSet)));
  await p.evaluate(() => { state.tengis.huntSet['Chasse en groupe'] = []; renderChar('tengis'); });
  console.log('Vide :', (await p.textContent('.hunt')).trim());
  await p.fill('[data-hunt-name="Chasse en groupe"]', 'Mammouth'); await p.fill('[data-hunt-qty="Chasse en groupe"]', '1'); await p.click('[data-hunt-add="Chasse en groupe"]');
  await p.fill('[data-hunt-name="Chasse en groupe"]', 'Lièvre'); await p.fill('[data-hunt-qty="Chasse en groupe"]', '3'); await p.click('[data-hunt-add="Chasse en groupe"]');
  console.log('Choisi :', (await p.textContent('.hunt')).trim());
  // Activité sur deux périodes
  await p.click('[data-slot="matin"][data-for="Chasse en groupe"]').catch(() => {}); await p.click('[data-slot="aube"][data-for="Chasse en groupe"]').catch(() => {});
  await p.evaluate(() => { state.tengis.slots['Chasse en groupe'] = ['aube', 'matin']; renderChar('tengis'); });
  await p.click('#done-tengis'); await p.waitForTimeout(1200);
  console.log('Récap :', await p.$$eval('#view .recap .recap-list li', l => l.map(x => x.textContent.trim().replace(/\s+/g, ' '))));
  const db = JSON.parse(await p.evaluate(() => localStorage.getItem('mockdb'))); const ym = await p.evaluate(() => RP_APP.ym), d = await p.evaluate(() => RP_APP.day);
  console.log('Enregistré :', JSON.stringify(db[`days/tengis/months/${ym}`]?.[d]?.huntSet));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })();
