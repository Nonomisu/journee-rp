// Activités communes des Khurdans : seulement les personnages présents dans Iloh Khurdan, plus ceux propres à Iloh.
// Usage : NONO_EMAIL=… node dev/tests/e2e26.js
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
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('f1', process.env.NONO_EMAIL), elle = await open('f2', 'jynette@example.com');
  const db = () => nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const ym = await nono.evaluate(() => RP_APP.ym), day = await nono.evaluate(() => RP_APP.day);
  const choices = (p, act) => p.evaluate(a => [...document.querySelectorAll(`[data-share-act="${a}"]`)].map(x => x.dataset.share), act);
  // Tamachag : seulement les personnages d'Iloh
  await nono.evaluate(() => go('tamachag')); await nono.waitForTimeout(200);
  await nono.fill('#special-tamachag', 'Course de chevaux'); await nono.click('#add-tamachag'); await nono.waitForTimeout(200);
  await nono.click('details[data-with-fold="Course de chevaux"] summary'); await nono.waitForTimeout(100);
  let ch = await choices(nono, 'Course de chevaux');
  ok(['echo', 'prism', 'viggo', 'khopses', 'eoor', 'yasmeen', 'hokkyoku', 'unegen'].every(x => !ch.includes(x)), 'Tamachag : aucun personnage hors Iloh');
  ok(['taiga', 'davaajav', 'khokkutsai', 'shiruun', 'buyan', 'tsewang'].every(x => ch.includes(x)) && !ch.includes('tamachag'), 'Tamachag : Khurdans, Davaajav et personnages de l\'Iloh');
  ok((await nono.textContent('details[data-with-fold="Course de chevaux"]')).includes("Personnages de l'Iloh"), 'groupe « Personnages de l\'Iloh »');
  await nono.evaluate(() => { document.querySelector('[data-share-act="Course de chevaux"][data-share="shiruun"]').click(); }); await nono.waitForTimeout(150);
  await nono.evaluate(() => { document.querySelector('[data-share-act="Course de chevaux"][data-share="taiga"]').click(); }); await nono.waitForTimeout(150);
  ok((await nono.textContent('details[data-with-fold="Course de chevaux"] summary')).includes('Avec Shiruun et Taiga'), 'sélecteur : « Avec Shiruun et Taiga »');
  await nono.click('#done-tamachag'); await nono.waitForTimeout(2500);
  ok((await nono.textContent('.recap')).includes('Course de chevaux avec Shiruun et Taiga'), 'récap : « Course de chevaux avec Shiruun et Taiga »');
  let d = await db();
  ok(JSON.stringify(d[`days/tamachag/months/${ym}`]?.[day]?.withActs?.['Course de chevaux']) === '["shiruun","taiga"]', 'enregistré sur la journée de Tamachag');
  const wn = Object.values(d).filter(v => v?.key?.startsWith?.('with:'));
  ok(wn.length === 1 && wn[0].charId === 'taiga', 'une seule nouvelle ici (Taiga) : Shiruun est prévenu par Iloh');
  // Hokkyoku : rien ne change, pas de personnages d'Iloh
  await elle.evaluate(() => go('hokkyoku')); await elle.waitForTimeout(200);
  await elle.fill('#special-hokkyoku', 'Pêche'); await elle.click('#add-hokkyoku'); await elle.waitForTimeout(200);
  await elle.click('details[data-with-fold="Pêche"] summary'); await elle.waitForTimeout(100);
  ch = await choices(elle, 'Pêche');
  ok(JSON.stringify(ch) === '["eoor","unegen","yasmeen"]', 'Hokkyoku : Eoor, Unegen et Yasmeen seulement');
  for (const [who, other] of [['echo', 'prism'], ['prism', 'echo'], ['viggo', 'khopses'], ['khopses', 'viggo']]) {
    ok(await nono.evaluate(([w, o]) => JSON.stringify(withGroups(w)[0].list.map(x => x.id)) === JSON.stringify([o]), [who, other]), `${who} : seulement ${other} dans Journée RP`);
    const s9 = await nono.evaluate(w => withGroups(w)[1] ? withGroups(w)[1].h + ':' + withGroups(w)[1].list.map(x => x.id).join() : '', who);
    ok(['echo', 'prism'].includes(who) ? s9 === 'Personnages de Solution 9:aaron,joy,tala,yololo' : s9 === '', `${who} : ${['echo', 'prism'].includes(who) ? 'plus les personnages de Solution 9' : 'aucun personnage d\'appli de groupe'}`);
  }
  // Davaajav (pas Khurdan, mais recopié) : tous les personnages, plus ceux d'Iloh
  await nono.evaluate(() => go('davaajav')); await nono.waitForTimeout(200);
  await nono.fill('#special-davaajav', 'Visite'); await nono.click('#add-davaajav'); await nono.waitForTimeout(200);
  await nono.click('details[data-with-fold="Visite"] summary'); await nono.waitForTimeout(100);
  ch = await choices(nono, 'Visite');
  ok(!ch.includes('eoor') && !ch.includes('echo') && ch.includes('tamachag') && ch.includes('shiruun'), 'Davaajav : comme les Khurdans');
  // Liste d'Iloh tenue à jour par le service du VPS
  await nono.evaluate(() => RP_APP.applyIlohNames({ chars: { shiruun: { name: 'Shiruun' }, nouveau: { name: 'Nouvelle venue' } } }));
  await nono.evaluate(() => go('tamachag')); await nono.waitForTimeout(200);
  ok(await nono.evaluate(() => JSON.stringify(withGroups('tamachag')[1].list.map(x => x.id)) === '["nouveau","shiruun"]'), 'liste d\'Iloh mise à jour (ajout, retrait)');
  ok(await nono.evaluate(() => nameOf('nouveau') === 'Nouvelle venue' && nameOf('inconnu') === 'inconnu'), 'noms des personnages d\'Iloh');
  ok(await nono.evaluate(() => ilohWithTxt({ with: { 'Chasse': ['Shiruun', 'Buyan'] } }, 'Chasse', ['shiruun']) === ' et Buyan'), 'retour d\'Iloh : Shiruun pas en double');
  ok(await nono.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
