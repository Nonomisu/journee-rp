// Vie intime réciproque : ce qu'Inkaraa note avec Khokkutsai peut être repris sur la fiche de Khokkutsai, reformulé.
// Usage : NONO_EMAIL=… node dev/tests/e2e22.js
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
  // Reformulations proposées
  const m = (t, f, to) => nono.evaluate(([t, f, to]) => mirrorIntime(t, f, to), [t, f, to]);
  ok(await m('A proposé un massage chaud à son compagnon', 'inkaraa', 'khokkutsai') === 'A reçu un massage chaud de sa compagne', '« a proposé … à son compagnon » → « a reçu … de sa compagne »');
  ok(await m('a offert une nuit sous les étoiles à Khokkutsai', 'inkaraa', 'khokkutsai') === "a reçu une nuit sous les étoiles d'Inkaraa", 'nom du partenaire → nom de l\'auteur');
  ok(await m('a préparé un bain pour sa compagne', 'khokkutsai', 'inkaraa') === 'a reçu un bain de son compagnon', 'dans l\'autre sens (fiche de Nono vers celle de Jynette)');
  ok(await m("s'est blottie contre son compagnon", 'inkaraa', 'khokkutsai') === "s'est blottie contre sa compagne", 'sans verbe à retourner : seul le partenaire change (texte modifiable)');
  // Inkaraa (Jynette) note sa vie intime avec Khokkutsai et valide
  await elle.evaluate(() => go('inkaraa')); await elle.waitForTimeout(200);
  await elle.fill('#intime-inkaraa', 'A proposé un massage chaud à son compagnon'); await elle.dispatchEvent('#intime-inkaraa', 'input');
  await elle.click('[data-intime-with="khokkutsai"]'); await elle.waitForTimeout(200);
  await elle.click('#done-inkaraa'); await elle.waitForTimeout(2500);
  // Khokkutsai (Nono)
  await nono.evaluate(() => go('khokkutsai')); await nono.waitForTimeout(400);
  ok(await nono.isVisible('.intime-from') && (await nono.textContent('.intime-from')).includes('Inkaraa a noté avec Khokkutsai'), 'fiche de Khokkutsai : la vie intime notée par Inkaraa');
  ok(await nono.inputValue('#intime-mirror-khokkutsai-inkaraa') === 'A reçu un massage chaud de sa compagne', 'version de Khokkutsai proposée');
  await nono.fill('#intime-mirror-khokkutsai-inkaraa', 'A reçu un massage chaud de sa compagne, au coin du feu');
  const newsBefore = await nono.evaluate(() => NEWS.filter(n => n.key?.startsWith('intime:')).length);
  await nono.click('[data-intime-take="inkaraa"]'); await nono.waitForTimeout(1500);
  ok((await nono.inputValue('#intime-khokkutsai')).includes('au coin du feu') && (await nono.textContent('.intime-from')).includes('Repris dans la vie intime'), 'ajouté à la vie intime de Khokkutsai (version modifiée)');
  ok(await nono.evaluate(() => state.khokkutsai.intimeWith.has('inkaraa')), 'Inkaraa liée à la vie intime de Khokkutsai');
  ok(await nono.evaluate(() => NEWS.filter(n => n.key?.startsWith('intime:')).length) === newsBefore, 'pas de notification en double pour Jynette');
  const ym = await nono.evaluate(() => RP_APP.ym), day = await nono.evaluate(() => RP_APP.day);
  const db = await nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  ok(db[`days/khokkutsai/months/${ym}`]?.[day]?.intime?.includes('au coin du feu'), 'enregistré sur la fiche de Khokkutsai');
  // Jynette ne voit pas de proposition à reprendre tant que Khokkutsai n'a pas validé
  await elle.evaluate(() => go('inkaraa')); await elle.waitForTimeout(300);
  ok(await elle.locator('.intime-from').count() === 0, 'rien chez Inkaraa tant que la fiche de Khokkutsai n\'est pas validée');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
