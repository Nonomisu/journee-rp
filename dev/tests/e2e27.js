// Activités intimes : case « Activité intime » à la création (cochée d'office par mots-clés), réglable ensuite dans la liste.
// Usage : NONO_EMAIL=… node dev/tests/e2e27.js
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
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(600); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('f1', process.env.NONO_EMAIL), elle = await open('f2', 'jynette@example.com');
  const db = () => nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const P = nono;
  await P.evaluate(() => go('ankhbayar')); await P.waitForTimeout(200);
  // Mots-clés
  for (const [t, want] of [['Instant coquin', true], ['Sexe', true], ['Câlin au coin du feu', true], ['Pêche au lac', false], ['Nunchaku', false]]) {
    await P.fill('#special-ankhbayar', ''); await P.type('#special-ankhbayar', t, { delay: 5 });
    ok(await P.isChecked('#priv-ankhbayar') === want, `« ${t} » : case intime ${want ? 'cochée' : 'décochée'} d'office`);
  }
  // Instant coquin, intime
  await P.fill('#special-ankhbayar', ''); await P.type('#special-ankhbayar', 'Instant coquin', { delay: 5 });
  await P.click('#add-ankhbayar'); await P.waitForTimeout(200);
  ok(await P.isChecked('[data-act="Instant coquin"]'), 'activité ajoutée et cochée');
  ok(await P.locator('details[data-with-fold="Instant coquin"].priv-pick').count() === 1 && await P.locator('[data-share-act="Instant coquin"]').count() === 0, '« Avec… » réservé au personnage lié (pas la liste du groupe)');
  ok((await P.textContent('[data-act="Instant coquin"] >> xpath=ancestor::div[contains(@class,"act-wrap")]')).includes('Intime : reste dans Journée RP'), 'repère « Intime : reste dans Journée RP »');
  // Case décochée à la main : plus de cochage d'office
  await P.fill('#special-ankhbayar', ''); await P.type('#special-ankhbayar', 'Bain', { delay: 5 });
  await P.click('#priv-ankhbayar'); await P.click('#priv-ankhbayar');
  await P.type('#special-ankhbayar', ' nu', { delay: 5 });
  ok(!await P.isChecked('#priv-ankhbayar'), 'case touchée par le joueur : plus changée d\'office');
  await P.fill('#special-ankhbayar', 'Pêche'); await P.click('#add-ankhbayar'); await P.waitForTimeout(200);
  ok(await P.locator('details[data-with-fold="Pêche"]').count() === 1, 'activité ordinaire : « Avec… » présent');
  await P.click('details[data-with-fold="Pêche"] summary'); await P.waitForTimeout(100);
  await P.evaluate(() => document.querySelector('[data-share-act="Pêche"][data-share="khubunjin"]').click()); await P.waitForTimeout(150);
  ok(await P.evaluate(() => JSON.stringify(state.ankhbayar.withActs['Pêche']) === '["khubunjin"]'), 'Pêche avec Khubunjin');
  // Mode gestion : marquer Pêche intime, puis la démarquer
  await P.click('#manage-acts-ankhbayar'); await P.waitForTimeout(200);
  await P.evaluate(() => document.querySelector('[data-priv="Pêche"]').click()); await P.waitForTimeout(200);
  ok(await P.evaluate(() => PRIV_ACTS.has('Pêche') && !state.ankhbayar.withActs?.['Pêche']), 'marquée intime : Khubunjin retirée');
  ok(await P.evaluate(() => !NEWS.some(n => n.key.startsWith('with:') && n.key.endsWith(':Pêche'))), 'nouvelle retirée');
  await P.evaluate(() => document.querySelector('[data-priv="Pêche"]').click()); await P.waitForTimeout(200);
  ok(await P.evaluate(() => !PRIV_ACTS.has('Pêche') && PRIV_ACTS.has('Instant coquin')), 'démarquée : de nouveau ordinaire');
  ok(await P.locator('[data-priv="Sexe avec Khubunjin"]').count() === 0, 'les « Sexe avec … » restent toujours intimes (pas de bouton)');
  await P.click('#manage-acts-ankhbayar'); await P.waitForTimeout(200);
  await P.click('#done-ankhbayar'); await P.waitForTimeout(2500);
  const d = await db();
  ok(JSON.stringify(d['shared/global']?.privActs) === '{"$set":["Instant coquin"]}', 'liste partagée enregistrée (shared/global)');
  ok(!(d['today/ankhbayar']?.activities || []).includes('Instant coquin'), 'encart public « Aujourd\'hui » sans l\'activité intime');
  // L'autre joueur la voit aussi comme intime
  await elle.reload(); await elle.waitForTimeout(400); if (await elle.isVisible('#login-btn')) await elle.click('#login-btn'); await elle.waitForTimeout(1200);
  ok(await elle.evaluate(() => PRIV_ACTS.has('Instant coquin') && isPrivateAct('Instant coquin')), 'Jynette : même liste d\'activités intimes');
  ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
