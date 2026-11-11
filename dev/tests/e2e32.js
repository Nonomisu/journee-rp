// Fiche validée : la vie intime proposée par l'autre personnage se reprend depuis le récap (sans rouvrir la fiche) ;
// une fiche rouverte après validation est signalée (bandeau, menu, cartes) jusqu'à la revalidation.
// Usage : NONO_EMAIL=… node dev/tests/e2e32.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  await ctx.route('**/html-to-image.js', r => r.fulfill({ body: fs.readFileSync(require.resolve('html-to-image/dist/html-to-image.js')), contentType: 'application/javascript' }));
  let discord = 0; await ctx.route('https://discord.com/api/webhooks/**', r => { discord++; r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"m1"}' }); });
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(() => { localStorage.removeItem('mockdb'); localStorage.setItem('mockdb', JSON.stringify({ 'shared/discord': { webhook: 'https://discord.com/api/webhooks/1/x' } })); }); await seed.close();
  const nono = await open('f1', process.env.NONO_EMAIL), elle = await open('f2', 'jynette@example.com');
  const ym = await elle.evaluate(() => RP_APP.ym), day = await elle.evaluate(() => RP_APP.day);
  const db = () => elle.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  // Jynette valide Taiga ; Nono note ensuite une vie intime de Tamachag avec Taiga
  await elle.evaluate(() => go('taiga')); await elle.fill('#mood-taiga', 'Sereine'); await elle.click('#done-taiga'); await elle.waitForTimeout(2500);
  await nono.evaluate(() => go('tamachag')); await nono.waitForTimeout(200);
  await nono.fill('#intime-tamachag', "Tamachag a offert un long massage à Taiga.");
  await nono.evaluate(() => document.querySelector('[data-intime-with="taiga"]').click()); await nono.waitForTimeout(200);
  await nono.click('#done-tamachag'); await nono.waitForTimeout(2500);
  await elle.waitForTimeout(800); await elle.evaluate(() => go('taiga')); await elle.waitForTimeout(300);
  ok(await elle.evaluate(() => state.taiga.done), 'Taiga toujours validée');
  ok(await elle.locator('.recap-intime [data-intime-take="tamachag"]').count() === 1, 'récap : « Vie intime proposée » avec le bouton d\'ajout');
  ok(discord >= 1, 'validation : fiche envoyée sur Discord');
  ok(await elle.inputValue('[id^="intime-mirror-taiga-"]') === 'Taiga a reçu un long massage de Tamachag.', 'reformulation : « Taiga a reçu un long massage de Tamachag. »');
  const before = discord;
  await elle.click('.recap-intime [data-intime-take="tamachag"]'); await elle.waitForTimeout(2500);
  let e = (await db())[`days/taiga/months/${ym}`][day];
  ok(e.done === true && /massage/i.test(e.intime || '') && JSON.stringify(e.intimeWith).includes('tamachag'), 'reprise enregistrée, fiche toujours validée');
  ok(discord > before, 'message Discord mis à jour');
  ok((await elle.textContent('.recap')).includes('Vie intime'), 'le récap montre la vie intime');
  ok(await elle.locator('.recap-intime').count() === 0, 'plus de proposition une fois reprise');
  // Fiche rouverte : bandeau, menu, carte
  await elle.click('#edit-taiga'); await elle.waitForTimeout(400);
  ok((await elle.textContent('.reopen-note')).includes('pense à la revalider'), 'fiche rouverte : bandeau « pense à la revalider »');
  ok(await elle.evaluate(() => document.querySelector('[data-go="taiga"] .dot')?.classList.contains('reopen')), 'menu : pastille « à revalider »');
  await elle.evaluate(() => go('home')); await elle.waitForTimeout(300);
  ok(await elle.evaluate(() => [...document.querySelectorAll('.state.reopen')].some(x => x.textContent.includes('À revalider'))), 'accueil : « ⚠ À revalider »');
  await elle.evaluate(() => go('taiga')); await elle.waitForTimeout(200); await elle.click('#done-taiga'); await elle.waitForTimeout(1500);
  ok(await elle.locator('.reopen-note').count() === 0 && await elle.evaluate(() => !document.querySelector('[data-go="taiga"] .dot.reopen')), 'revalidée : plus de signal');
  // Une fiche jamais validée n'a pas le bandeau
  await elle.evaluate(() => go('khubunjin')); await elle.waitForTimeout(200);
  ok(await elle.locator('.reopen-note').count() === 0, 'fiche jamais validée : pas de bandeau');
  ok(await elle.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
