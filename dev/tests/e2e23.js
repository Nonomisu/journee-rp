// Retour d'Iloh Khurdan : activités communes acceptées dans Iloh, affichées sur la fiche de Journée RP (sans la modifier).
// Usage : NONO_EMAIL=… node dev/tests/e2e23.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  const pad = n => String(n).padStart(2, '0'), rp = new Date(Date.now() - 5 * 3600e3), ym = `${rp.getFullYear()}-${pad(rp.getMonth() + 1)}`, day = String(rp.getDate());
  const past = new Date(rp); past.setDate(1); const pday = String(past.getDate()), same = pday === day;
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(([ym, day, pday]) => localStorage.setItem('mockdb', JSON.stringify({
    [`days/tamachag/months/${ym}`]: { [day]: { mood: 'Journée au camp', done: true, checked: { $set: ['Travail du bois'] } }, ...(pday !== day ? { [pday]: { mood: 'Avant', done: true, checked: { $set: ['Pêche'] } } } : {}) },
    [`iloh/tamachag/months/${ym}`]: { [day]: { added: ['Chasse en groupe'], with: { 'Travail du bois': ['Buyan', 'taiga'], 'Chasse en groupe': ['Shiruun'] } },
      ...(pday !== day ? { [pday]: { added: ['Tir à l\'arc'], with: { 'Pêche': ['Cheyenne'] } } } : {}) },
  })), [ym, day, pday]);
  await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(800);
  await p.evaluate(() => go('tamachag')); await p.waitForTimeout(300);
  const rec = await p.textContent('.recap');
  ok(rec.includes('Travail du bois avec Buyan et Taiga'), 'récap : personnages ajoutés dans Iloh sur une activité de la fiche');
  ok(rec.includes("Sur l'Iloh Khurdan") && rec.includes('Chasse en groupe avec Shiruun'), 'récap : activité acceptée dans Iloh');
  const db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  ok(JSON.stringify(db[`days/tamachag/months/${ym}`][day].checked) === '{"$set":["Travail du bois"]}' && !JSON.stringify(db[`days/tamachag/months/${ym}`]).match(/Buyan|Chasse en groupe/), 'la journée enregistrée dans Journée RP n\'est pas modifiée');
  // Fiche rouverte pour modification : la note des ajouts Iloh
  await p.click('#edit-tamachag'); await p.waitForTimeout(300);
  ok((await p.textContent('.iloh-note')).includes('Chasse en groupe avec Shiruun') && (await p.textContent('.iloh-note')).includes('Travail du bois avec Buyan et Taiga'), 'formulaire : rappel des ajouts faits sur l\'Iloh');
  // Historique
  if (!same) {
    await p.evaluate(pd => { state.tamachag.view = 'history'; const d = new Date(rpDay); d.setDate(+pd); state.tamachag.calSel = d; go('tamachag'); }, pday); await p.waitForTimeout(400);
    const h = await p.textContent('#view');
    ok(h.includes('Pêche avec Cheyenne') && h.includes("Sur l'Iloh Khurdan : Tir à l'arc"), 'historique : ajouts Iloh du jour choisi');
  }
  // Personnage hors Iloh : rien
  await p.evaluate(() => { state.eoor.view = 'day'; go('eoor'); }); await p.waitForTimeout(200);
  ok(!(await p.textContent('#view')).includes("Sur l'Iloh"), 'rien pour Eoor');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
