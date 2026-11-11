// S9 Interact' : Echo et Prism, recopiés dans l'appli de groupe de Solution 9 (masquer une activité, personnages de S9,
// retour des activités communes depuis s9/…). Usage : NONO_EMAIL=… node dev/tests/e2e29.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  const pad = n => String(n).padStart(2, '0'), rp = new Date(Date.now() - 5 * 3600e3), ym = `${rp.getFullYear()}-${pad(rp.getMonth() + 1)}`, day = String(rp.getDate());
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(([ym, day]) => localStorage.setItem('mockdb', JSON.stringify({
    [`days/echo/months/${ym}`]: { [day]: { mood: 'Studio', done: true, checked: { $set: ['Prépare le set à la maison'] } } },
    [`s9/echo/months/${ym}`]: { [day]: { added: ['Soirée au club'], with: { 'Soirée au club': ['Joy', 'Tala'] } } },
    [`iloh/echo/months/${ym}`]: { [day]: { added: ['Ne doit pas apparaître'] } },
    's9/_noms/months/liste': { chars: { joy: { name: 'Joy' }, tala: { name: 'Tala' }, aaron: { name: 'Aaron' }, yololo: { name: 'Yololo' }, kai: { name: 'Kai' } } },
  })), [ym, day]);
  await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 's9'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(800);
  await p.evaluate(() => go('echo')); await p.waitForTimeout(300);
  const rec = await p.textContent('.recap');
  ok(rec.includes("Sur S9 Interact'") && rec.includes('Soirée au club avec Joy et Tala'), 'récap : activité acceptée dans S9 Interact\'');
  ok(!rec.includes('Ne doit pas apparaître'), 'Echo : seul le retour de S9 compte (pas celui d\'Iloh)');
  ok(await p.evaluate(() => Object.keys(S9_ONLY).sort().join()) === 'aaron,joy,kai,tala,yololo', 'liste des personnages de S9 lue dans s9/_noms');
  await p.evaluate(() => { state.echo.done = false; go('echo'); }); await p.waitForTimeout(300);
  await p.click('[data-act="Va à la salle de muscu"]'); await p.waitForTimeout(200);
  ok((await p.textContent('.iloh-row')).includes("Visible dans S9 Interact'"), 'activité : « Visible dans S9 Interact\' »');
  await p.click('[data-iloh-hide="Va à la salle de muscu"]'); await p.waitForTimeout(1200);
  ok((await p.textContent('.iloh-row')).includes("Masquée dans S9 Interact' aujourd"), 'masquée dans S9 ce jour-là');
  const db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  ok(JSON.stringify(db[`days/echo/months/${ym}`]?.[day]?.hideS9) === '{"$set":["Va à la salle de muscu"]}' && !db[`days/echo/months/${ym}`]?.[day]?.hideIloh?.$set?.length, 'enregistré dans hideS9 (pas hideIloh)');
  await p.click('details[data-with-fold="Va à la salle de muscu"] summary'); await p.waitForTimeout(150);
  ok((await p.textContent('details[data-with-fold="Va à la salle de muscu"]')).includes('Personnages de Solution 9'), 'activité commune : groupe « Personnages de Solution 9 »');
  await p.evaluate(() => document.querySelector('[data-share-act="Va à la salle de muscu"][data-share="joy"]').click()); await p.waitForTimeout(1200);
  const db2 = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  ok(JSON.stringify(db2[`days/echo/months/${ym}`]?.[day]?.withActs?.['Va à la salle de muscu']) === '["joy"]', 'Joy notée sur l\'activité');
  ok(!Object.keys(db2).some(k => k.startsWith('news/') && JSON.stringify(db2[k]).includes('joy')), 'pas de nouvelle ici : c\'est s9-miroir qui la crée dans S9 Interact\'');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'rien ne dépasse');
  ok(!errs.length, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
  }
  await b.close();
})();
