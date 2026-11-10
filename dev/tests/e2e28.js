// Activité intime « avec » : personnage lié (comme la nuit chaude), amants, ou « Autre… » (personnage ou PNJ). Reste dans Journée RP.
// Usage : NONO_EMAIL=… node dev/tests/e2e28.js
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
  const P = nono, F = 'details[data-with-fold="Instant coquin"]';
  await P.evaluate(() => go('ankhbayar')); await P.waitForTimeout(200);
  await P.type('#special-ankhbayar', 'Instant coquin', { delay: 5 }); await P.click('#add-ankhbayar'); await P.waitForTimeout(200);
  ok(await P.locator(F + '.priv-pick').count() === 1, 'activité intime : « Avec d\'autres personnages ? » proposé');
  await P.click(F + ' summary'); await P.waitForTimeout(100);
  const opts = await P.evaluate(() => [...document.querySelectorAll('[data-priv-act="Instant coquin"]')].map(x => x.dataset.privWith));
  ok(JSON.stringify(opts) === '["khubunjin"]', 'seul le personnage lié est proposé (Khubunjin)');
  ok(await P.locator('[data-share-act="Instant coquin"]').count() === 0, 'pas la liste des personnages du groupe');
  await P.evaluate(() => document.querySelector('[data-priv-act="Instant coquin"][data-priv-with="khubunjin"]').click()); await P.waitForTimeout(150);
  await P.evaluate(() => document.querySelector('[data-priv-other="Instant coquin"]').click()); await P.waitForTimeout(150);
  await P.fill('[data-priv-name="Instant coquin"]', 'Une danseuse'); await P.press('[data-priv-name="Instant coquin"]', 'Enter'); await P.waitForTimeout(200);
  ok((await P.textContent(F + ' summary')).includes('Avec Khubunjin et Une danseuse'), 'sélecteur : « Avec Khubunjin et Une danseuse »');
  ok(await P.locator('[data-priv-name="Instant coquin"]').count() === 0 && await P.locator(F + '[open]').count() === 1, 'champ « Autre » refermé, sélecteur resté ouvert');
  // Retirer puis remettre le PNJ
  await P.evaluate(() => document.querySelector('[data-priv-act="Instant coquin"][data-priv-with="Une danseuse"]').click()); await P.waitForTimeout(150);
  ok(await P.evaluate(() => JSON.stringify(state.ankhbayar.privWith['Instant coquin']) === '["khubunjin"]'), 'PNJ retiré d\'un geste');
  await P.evaluate(() => document.querySelector('[data-priv-act="Instant coquin"][data-priv-with="Une danseuse"]').click()); await P.waitForTimeout(150);
  ok(await P.locator('details[data-with-fold="Sexe avec Khubunjin"]').count() === 0, '« Sexe avec Khubunjin » : toujours sans sélecteur');
  await P.click('#done-ankhbayar'); await P.waitForTimeout(2500);
  ok((await P.textContent('.recap')).includes('Instant coquin avec Khubunjin et Une danseuse'), 'récap : « Instant coquin avec Khubunjin et Une danseuse »');
  let d = await db();
  ok(JSON.stringify(d[`days/ankhbayar/months/${ym}`]?.[day]?.privWith?.['Instant coquin']) === '["khubunjin","Une danseuse"]' && !d[`days/ankhbayar/months/${ym}`]?.[day]?.withActs?.['Instant coquin'], 'enregistré à part (privWith), pas dans les activités communes');
  const n = Object.values(d).filter(v => v?.key?.startsWith?.("iact:"));
  ok(n.length === 1 && n[0].to === "elle" && n[0].charId === 'khubunjin' && n[0].text === 'Ankhbayar a noté « Instant coquin » avec Khubunjin.', 'nouvelle pour Jynette (Khubunjin)');
  // Jynette : nouvelle rose, reprise sur la fiche de Khubunjin
  await elle.reload(); await elle.waitForTimeout(400); if (await elle.isVisible('#login-btn')) await elle.click('#login-btn'); await elle.waitForTimeout(1200);
  await elle.evaluate(() => go('home')); await elle.waitForTimeout(300);
  ok(await elle.evaluate(() => [...document.querySelectorAll('.news li')].find(l => l.textContent.includes('Instant coquin'))?.classList.contains('k-hot')), 'nouvelle en rose');
  await elle.evaluate(() => go('khubunjin')); await elle.waitForTimeout(300);
  ok((await elle.textContent('.shared-acts')).includes('Ankhbayar a noté « Instant coquin » avec Khubunjin et Une danseuse'), 'fiche de Khubunjin : activité notée par Ankhbayar');
  await elle.click('[data-join-from="ankhbayar"]'); await elle.waitForTimeout(1500);
  ok(await elle.evaluate(() => state.khubunjin.checked.has('Instant coquin') && JSON.stringify(state.khubunjin.privWith['Instant coquin']) === '["ankhbayar","Une danseuse"]' && !state.khubunjin.withActs?.['Instant coquin']), 'reprise : avec Ankhbayar et Une danseuse, toujours intime');
  ok(await elle.evaluate(() => NEWS.some(n => n.key.startsWith('iact:') && n.to === 'corentin' && n.charId === 'ankhbayar')), 'nouvelle en retour pour Nono');
  // Décocher l'activité : partenaires et nouvelle retirés
  await P.evaluate(() => { state.ankhbayar.done = false; go('ankhbayar'); }); await P.waitForTimeout(200);
  await P.evaluate(() => document.querySelector('[data-act="Instant coquin"]').click()); await P.waitForTimeout(200);
  ok(await P.evaluate(() => !state.ankhbayar.privWith?.['Instant coquin'] && !NEWS.some(n => n.key.startsWith('iact:') && n.src === 'ankhbayar')), 'activité décochée : partenaires et nouvelle retirés');
  ok(await P.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
