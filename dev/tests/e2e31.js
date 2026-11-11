// Deux appareils du même joueur : celui resté en veille (version ancienne) n'écrase plus la validation faite sur l'autre.
// Usage : NONO_EMAIL=… node dev/tests/e2e31.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  await ctx.route('https://discord.com/api/webhooks/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"m"}' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    // « Veille » : l'appareil ne reçoit plus les modifications des autres (FREEZE), mais peut encore écrire.
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; window.addEventListener('storage', ev => { if (window.FREEZE) ev.stopImmediatePropagation(); }, true); }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(600); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const tel = await open('f1', process.env.NONO_EMAIL);
  const ym = await tel.evaluate(() => RP_APP.ym), day = await tel.evaluate(() => RP_APP.day);
  const entry = async () => (await tel.evaluate(() => JSON.parse(localStorage.getItem('mockdb'))))[`days/echo/months/${ym}`]?.[day] || {};
  // 1. Téléphone : humeur, puis mise en veille
  await tel.evaluate(() => go('echo')); await tel.waitForTimeout(200);
  await tel.fill('#mood-echo', 'Fatigué après le set'); await tel.waitForTimeout(1500);
  ok((await entry()).mood === 'Fatigué après le set', 'téléphone : humeur enregistrée');
  await tel.evaluate(() => { window.FREEZE = true; });
  // 2. PC : une activité, puis validation
  const pc = await open('f1b', process.env.NONO_EMAIL);
  await pc.evaluate(() => go('echo')); await pc.waitForTimeout(200);
  await pc.fill('#special-echo', 'Répétition au studio'); await pc.click('#add-echo'); await pc.waitForTimeout(200);
  await pc.click('#done-echo'); await pc.waitForTimeout(2500);
  let e = await entry();
  ok(e.done === true && (e.specials?.$set || e.specials || []).includes?.('Répétition au studio') !== false, 'PC : fiche validée avec son activité');
  // 3. Le téléphone se réveille avec sa version ancienne et modifie l'humeur
  ok(await tel.evaluate(() => !state.echo.done), 'téléphone : encore la version d\'avant (pas validée)');
  await tel.fill('#mood-echo', 'Fatigué mais content'); await tel.waitForTimeout(1500);
  e = await entry();
  ok(e.mood === 'Fatigué mais content', 'téléphone : son humeur est enregistrée');
  ok(e.done === true, 'la validation faite sur le PC est gardée');
  ok(JSON.stringify(e).includes('Répétition au studio'), 'l\'activité ajoutée sur le PC est gardée');
  // 4. Le téléphone reçoit enfin les modifications : il affiche la fiche validée
  await tel.evaluate(() => { window.FREEZE = false; }); await tel.reload(); await tel.waitForTimeout(400); if (await tel.isVisible('#login-btn')) await tel.click('#login-btn'); await tel.waitForTimeout(1200);
  ok(await tel.evaluate(() => state.echo.done && state.echo.mood === 'Fatigué mais content'), 'téléphone réveillé : fiche validée, humeur à jour');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
