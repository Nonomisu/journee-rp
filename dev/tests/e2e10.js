// États du jour (physique et mental) : choix, exclusions, précisions, récap, anciennes fiches.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const jy = await open('st', 'jynette@example.com');
  await jy.evaluate(() => go('taiga'));
  console.log('Titres dans Mood du jour :', await jy.$$eval('section h3.state-h', h => h.map(x => x.textContent + ' (dans « ' + x.closest('section').querySelector('h2').textContent + ' »)')));
  console.log('Boutons mental :', await jy.$$eval('[data-mental]', bs => bs.map(x => x.textContent)));
  await jy.click('[data-phys="Douleur"]'); await jy.fill('[data-state-note="Douleur"]', 'nuit rigoureuse'); await jy.dispatchEvent('[data-state-note="Douleur"]', 'input');
  await jy.click('[data-phys="En manque"]'); await jy.fill('[data-state-note="En manque"]', 'sommeil'); await jy.dispatchEvent('[data-state-note="En manque"]', 'input');
  await jy.click('[data-mental="Bon moral"]'); await jy.click('[data-mental="Petit moral"]'); await jy.click('[data-mental="Productif"]'); await jy.click('[data-mental="Flemme"]');
  console.log('Physique :', await jy.evaluate(() => [...state.taiga.phys]), '| Mental :', await jy.evaluate(() => [...state.taiga.mental]));
  await jy.click('[data-phys="En forme"]'); console.log('Après « En forme » :', await jy.evaluate(() => [...state.taiga.phys]), await jy.evaluate(() => JSON.stringify(state.taiga.stateNotes)));
  await jy.click('[data-phys="Douleur"]'); await jy.fill('[data-state-note="Douleur"]', 'articulation'); await jy.dispatchEvent('[data-state-note="Douleur"]', 'input');
  await jy.click('[data-mental="Inspiré"]');
  await jy.click('#done-taiga'); await jy.waitForTimeout(1500);
  console.log('Récap :', await jy.$$eval('#view .recap .where', ws => ws.map(w => w.textContent.trim()).filter(t => /Douleur|moral|Inspir|Flemme/.test(t))));
  const nono = await open('st2', process.env.NONO_EMAIL); await nono.evaluate(() => go('taiga')); await nono.waitForTimeout(300);
  console.log('Chez Nono (lecture) :', await nono.$$eval('#view .recap .where', ws => ws.map(w => w.textContent.trim()).filter(t => /Douleur|moral|Inspir|Flemme/.test(t))));
  // Ancienne fiche : « Petit moral » rangé dans phys
  console.log('Ancienne fiche relue :', await nono.evaluate(() => { const d = new Date(rpDay); d.setDate(d.getDate() - 1); HISTORY.eoor[keyOf(d)] = { mood: 'x', phys: new Set(['Fatigue', 'Petit moral']) }; const r = dayRecord(C.find(c => c.id === 'eoor'), d); return { phys: r.phys, mental: r.mental }; }));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
