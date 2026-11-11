// Activités communes dans Journée RP : Hokkyoku note « Pêche » avec Unegen ; Unegen peut la reprendre (avant ou après validation).
// Usage : NONO_EMAIL=… node dev/tests/e2e24.js
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
  const ym = await nono.evaluate(() => RP_APP.ym), day = await nono.evaluate(() => RP_APP.day);
  // Hokkyoku (Jynette) : « Pêche » avec Unegen
  await elle.evaluate(() => go('hokkyoku')); await elle.waitForTimeout(200);
  await elle.fill('#special-hokkyoku', 'Pêche'); await elle.click('#add-hokkyoku'); await elle.waitForTimeout(200);
  ok(await elle.isChecked('[data-act="Pêche"]'), 'Hokkyoku : activité « Pêche » cochée');
  await elle.click('details[data-with-fold="Pêche"] summary'); await elle.waitForTimeout(100);
  await elle.evaluate(() => { document.querySelector('[data-share-act="Pêche"][data-share="unegen"]').click(); }); await elle.waitForTimeout(150);
  ok((await elle.textContent('details[data-with-fold="Pêche"] summary')).includes('Avec Unegen'), 'sélecteur : « Avec Unegen »');
  ok(await elle.locator('[data-share-act="Pêche"][data-share="eoor"]').count() === 0, 'Eoor n\'est pas proposé à Hokkyoku');
  await elle.click('#done-hokkyoku'); await elle.waitForTimeout(2500);
  ok((await elle.textContent('.recap')).includes('Pêche avec Unegen'), 'récap de Hokkyoku : « Pêche avec Unegen »');
  let d = await db();
  ok(JSON.stringify(d[`days/hokkyoku/months/${ym}`]?.[day]?.withActs?.['Pêche']) === '["unegen"]', 'enregistré sur la journée de Hokkyoku');
  const withNews = Object.values(d).filter(v => v?.key?.startsWith?.('with:'));
  ok(withNews.length === 1 && withNews.every(n => n.to === 'corentin') && withNews.some(n => n.charId === 'unegen' && n.text === 'Hokkyoku a noté « Pêche » avec Unegen.'), 'nouvelle pour Nono (Unegen)');
  // Nono : nouvelles en vert, puis fiche d'Unegen (pas encore validée)
  await nono.reload(); await nono.waitForTimeout(400); if (await nono.isVisible('#login-btn')) await nono.click('#login-btn'); await nono.waitForTimeout(1200);
  await nono.evaluate(() => go('home')); await nono.waitForTimeout(300);
  ok(await nono.evaluate(() => { const li = [...document.querySelectorAll('.news li')].find(l => l.textContent.includes('Hokkyoku a noté'));
    return li?.classList.contains('k-with') && getComputedStyle(li).borderLeftColor === 'rgb(111, 191, 115)'; }), 'nouvelle d\'activité commune en vert');
  await nono.evaluate(() => go('unegen')); await nono.waitForTimeout(300);
  ok((await nono.textContent('.shared-acts')).includes('Hokkyoku a noté « Pêche » avec Unegen'), 'fiche d\'Unegen : activité commune notée par Hokkyoku');
  await nono.click('[data-join-from="hokkyoku"]'); await nono.waitForTimeout(1500);
  ok(await nono.evaluate(() => state.unegen.checked.has('Pêche') && JSON.stringify(state.unegen.withActs['Pêche']) === '["hokkyoku"]'), 'reprise : « Pêche » avec Hokkyoku sur la fiche d\'Unegen');
  ok((await nono.textContent('.shared-acts')).includes('Sur la fiche'), 'repère « Sur la fiche »');
  d = await db();
  ok(JSON.stringify(d[`days/unegen/months/${ym}`]?.[day]?.withActs?.['Pêche']) === '["hokkyoku"]', 'enregistré sur la journée d\'Unegen');
  ok(await nono.evaluate(() => NEWS.filter(n => n.key.startsWith('with:') && n.src === 'unegen').length) === 1, 'une seule nouvelle pour Jynette (Hokkyoku)');
  // Après validation : Yasmeen (Jynette) note « Balade » avec Eoor, qui a déjà validé sa fiche
  await nono.evaluate(() => go('eoor')); await nono.waitForTimeout(200);
  await nono.click('#done-eoor'); await nono.waitForTimeout(1500);
  await elle.evaluate(() => go('yasmeen')); await elle.waitForTimeout(200);
  await elle.fill('#special-yasmeen', 'Balade'); await elle.click('#add-yasmeen'); await elle.waitForTimeout(200);
  await elle.click('details[data-with-fold="Balade"] summary'); await elle.waitForTimeout(100);
  ok(await elle.locator('[data-share-act="Balade"][data-share="unegen"]').count() === 0, 'Unegen n\'est pas proposé à Yasmeen');
  await elle.evaluate(() => { document.querySelector('[data-share-act="Balade"][data-share="eoor"]').click(); }); await elle.waitForTimeout(150);
  await elle.click('#done-yasmeen'); await elle.waitForTimeout(2500);
  await nono.reload(); await nono.waitForTimeout(400); if (await nono.isVisible('#login-btn')) await nono.click('#login-btn'); await nono.waitForTimeout(1200);
  await nono.evaluate(() => go('eoor')); await nono.waitForTimeout(300);
  ok(await nono.locator('.recap').count() === 1 && await nono.locator('[data-join-from="yasmeen"]').count() === 1, 'fiche d\'Eoor validée : bouton de reprise toujours là');
  await nono.click('[data-join-from="yasmeen"]'); await nono.waitForTimeout(1500);
  ok((await nono.textContent('.recap')).includes('Balade avec Yasmeen'), 'après validation : ajoutée au récap d\'Eoor');
  d = await db();
  ok(d[`days/eoor/months/${ym}`]?.[day]?.checked?.$set?.includes('Balade'), 'enregistré sur la journée d\'Eoor');
  // Doublon évité avec le retour d'Iloh : un personnage déjà noté ici n'est pas répété
  ok(await nono.evaluate(() => ilohWithTxt({ with: { 'Pêche': ['taiga', 'Buyan'] } }, 'Pêche', ['taiga']) === ' et Buyan' && ilohWithTxt({ with: { 'Pêche': ['taiga'] } }, 'Pêche', ['taiga']) === ''), 'retour d\'Iloh : pas de personnage en double');
  // Jynette ne peut pas modifier la fiche d'Unegen
  await elle.evaluate(() => go('unegen')); await elle.waitForTimeout(300);
  ok(await elle.locator('[data-join-from]').count() === 0, 'lecture seule pour l\'autre joueur');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
