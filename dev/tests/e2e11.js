// Section Voyage : départ, arrivée, durée, mode, motif ; récap, enregistrement, temps de voyage et palme du wrap.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-12-27T12:00:00'));
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'tr'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.removeItem('mockdb')); await p.reload(); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.evaluate(() => go('tamachag'));
  const order = await p.$$eval('#view > section h2', h => h.map(x => x.textContent));
  console.log('Ordre :', order.slice(order.indexOf('Activités'), order.indexOf('Activités') + 2));
  await p.check('#trip-tamachag'); await p.waitForTimeout(200);
  console.log('Activité Voyage absente :', !(await p.$('[data-act="Voyage"]')), '| fiche en cours :', await p.evaluate(() => !!dayRecord(C.find(c => c.id === 'tamachag'), rpDay)), '| note Lieux :', (await p.textContent('#view')).includes('se renseignent dans la section « Voyage »'));
  await p.click('[data-leg="to"][data-region="othard"]').catch(() => {}); await p.waitForTimeout(150);
  const zoneBtn = await p.$('[data-leg="to"][data-zone="yanxia"]'); if (zoneBtn) { await zoneBtn.click(); await p.waitForTimeout(150); }
  await p.fill('#trip-h-tamachag', '3'); await p.fill('#trip-m-tamachag', '30'); await p.dispatchEvent('#trip-m-tamachag', 'input');
  await p.check('[data-mode="Monture"]'); await p.fill('#trip-reason-tamachag', 'Troc au marché de Doma'); await p.dispatchEvent('#trip-reason-tamachag', 'input');
  await p.click('#done-tamachag'); await p.waitForTimeout(1500);
  console.log('Récap :', (await p.textContent('#view .recap .where')).replace(/\s+/g, ' ').trim());
  const db = JSON.parse(await p.evaluate(() => localStorage.getItem('mockdb')));
  const e = db['days/tamachag/months/2026-12']?.['27']?.trip; console.log('Enregistré :', e && { minutes: e.minutes, reason: e.reason, modes: e.modes });
  const w = await p.evaluate(() => {
    const add = (id, k, min) => (HISTORY[id] ||= {})[k] = { done: true, mood: 'x', checked: new Set(['Voyage']), trip: { from: { region: 'othard' }, to: { region: 'eorzea' }, modes: new Set(['Aéronef']), minutes: min } };
    add('taiga', '2026-5-3', 600); add('eoor', '2026-6-1', 120);
    Object.keys(hotDuoCache).forEach(k => delete hotDuoCache[k]);
    const out = {}; for (const id of ['taiga', 'tamachag']) { Object.assign(state[id], { view: 'history', wrap: true }); simulateWrapDay = true; go(id);
      out[id] = [...document.querySelectorAll('article.wrap .fx')].map(f => f.textContent.replace(/\s+/g, ' ').trim()).filter(t => /voyage|Voyage/.test(t)); }
    return out; });
  console.log('Wrap Taiga :', w.taiga); console.log('Wrap Tamachag :', w.tamachag);
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
