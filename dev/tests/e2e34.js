// Reprise d'une activité commune : retirer des personnages proposés avant l'ajout (l'auteur reste) ; boutons flèches haut/bas.
// Usage : NONO_EMAIL=… node dev/tests/e2e34.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('f1', process.env.NONO_EMAIL), elle = await open('f2', 'jynette@example.com');
  await nono.evaluate(() => { go('tamachag'); const s = state.tamachag; s.specials.push('Cuisine'); s.checked.add('Cuisine'); ['taiga', 'ankhbayar', 'khubunjin'].forEach(o => setWith('tamachag', 'Cuisine', o, true)); s.mood ||= 'ok'; renderChar('tamachag'); });
  await nono.click('#done-tamachag'); await nono.waitForTimeout(2500);
  await elle.waitForFunction(() => state.tamachag?.done, null, { timeout: 10000 }); await elle.evaluate(() => go('taiga')); await elle.waitForTimeout(300);
  ok(JSON.stringify(await elle.evaluate(() => [...document.querySelectorAll('[data-jp-who]')].map(b => b.dataset.jpWho + ':' + b.getAttribute('aria-pressed')))) === '["ankhbayar:true","khubunjin:true"]', 'personnages proposés, tous cochés (Tamachag fixe)');
  await elle.evaluate(() => document.querySelector('[data-jp-who="khubunjin"]').click()); await elle.waitForTimeout(200);
  await elle.evaluate(() => document.querySelector('[data-join-from="tamachag"]').click()); await elle.waitForTimeout(1500);
  ok(await elle.evaluate(() => JSON.stringify(state.taiga.withActs.Cuisine) === '["tamachag","ankhbayar"]'), 'Taiga : « Cuisine avec Tamachag et Ankhbayar », sans Khubunjin');
  ok(await elle.evaluate(() => withTxt(state.taiga.withActs, 'Cuisine') === ' avec Tamachag et Ankhbayar'), 'affichage sur la fiche');
  await elle.waitForTimeout(800);
  const nk = await elle.evaluate(() => NEWS.filter(n => n.key.startsWith('with:')).map(n => n.key));
  ok(nk.some(k => k.includes(':taiga:tamachag:Cuisine')) && !nk.some(k => k.includes(':taiga:ankhbayar:')), 'reprise : l\'auteur (Tamachag) est prévenu, pas Ankhbayar');
  ok(await elle.evaluate(() => sharedActsOf('ankhbayar').length === 1 && sharedActsOf('ankhbayar')[0].from === 'tamachag'), 'Ankhbayar : une seule proposition, celle de Tamachag');
  // Validée puis reprise depuis le récap
  await elle.evaluate(() => go('khubunjin')); await elle.waitForTimeout(200); await elle.fill('#mood-khubunjin', 'ok'); await elle.click('#done-khubunjin'); await elle.waitForTimeout(1500);
  await elle.evaluate(() => document.querySelector('[data-jp-who="taiga"]').click()); await elle.waitForTimeout(200);
  await elle.evaluate(() => document.querySelector('[data-join-from="tamachag"]').click()); await elle.waitForTimeout(1500);
  ok(await elle.evaluate(() => state.khubunjin.done && JSON.stringify(state.khubunjin.withActs.Cuisine) === '["tamachag","ankhbayar"]'), 'fiche validée : reprise sans Taiga, fiche toujours validée');
  // Flèches
  await elle.evaluate(() => scrollTo(0, 0)); await elle.waitForTimeout(300);
  const long = await elle.evaluate(() => document.documentElement.scrollHeight - innerHeight > 300);
  ok(await elle.evaluate(lg => document.getElementById('scroll-top').hidden && document.getElementById('scroll-bottom').hidden === !lg, long), 'flèches : en haut, seule celle du bas');
  if (long) { await elle.evaluate(() => document.getElementById('scroll-bottom').click()); await elle.waitForTimeout(1200);
    ok(await elle.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && document.getElementById('scroll-bottom').hidden), 'flèche du bas : tout en bas'); }
  ok(await elle.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
