// Echo et Prism commandent ensemble : la commande de malbouffe de l'un vaut pour l'autre (même restaurant), dans les deux sens.
// Usage : NONO_EMAIL=… node dev/tests/e2e21.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
const JUNK = 'Commande de malbouffe';
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
  const dish = (p, id) => p.evaluate(([id, j]) => state[id].checked.has(j) ? state[id].details?.[j] || '' : null, [id, JUNK]);
  await nono.evaluate(() => go('echo')); await elle.evaluate(() => go('prism')); await nono.waitForTimeout(200);
  // Echo commande
  await nono.click(`[data-act="${JUNK}"]`); await nono.waitForTimeout(2000);
  const d1 = await dish(nono, 'echo');
  ok(!!d1, 'Echo : commande tirée au sort (' + d1 + ')');
  ok(await dish(elle, 'prism') === d1, 'Prism : même commande, même restaurant, chez la joueuse de Prism');
  ok((await elle.textContent('#view')).includes(d1), 'affiché sur la fiche de Prism');
  // Nouveau tirage depuis Prism
  await elle.click(`[data-redraw="${JUNK}"]`); await elle.waitForTimeout(2000);
  const d2 = await dish(elle, 'prism');
  ok(d2 && d2 !== d1 && await dish(nono, 'echo') === d2, 'nouveau tirage chez Prism : Echo suit (' + d2 + ')');
  // Prism annule
  await elle.click(`[data-act="${JUNK}"]`); await elle.waitForTimeout(2000);
  ok(await dish(elle, 'prism') === null && await dish(nono, 'echo') === null, 'commande retirée chez Prism : retirée aussi chez Echo');
  // Dans l'autre sens : Prism commande d'abord
  await elle.click(`[data-act="${JUNK}"]`); await elle.waitForTimeout(2000);
  const d3 = await dish(elle, 'prism');
  ok(!!d3 && await dish(nono, 'echo') === d3, 'Prism commande : Echo a la même commande');
  const db = await nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const ym = await nono.evaluate(() => RP_APP.ym), day = await nono.evaluate(() => RP_APP.day);
  ok(db[`days/echo/months/${ym}`]?.[day]?.details?.[JUNK] === d3 && db[`days/prism/months/${ym}`]?.[day]?.details?.[JUNK] === d3, 'enregistré sur les deux fiches');
  // Un autre personnage ne suit pas
  ok(await nono.evaluate(j => !state.eoor?.checked?.has(j), JUNK), 'les autres personnages ne sont pas concernés');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
