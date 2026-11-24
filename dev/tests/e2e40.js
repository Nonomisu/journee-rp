// Capture du jour : compressée, enregistrée à côté de la fiche (days/{perso}/months/{jour}~shot), gardée après rechargement, retirée.
// Usage : NONO_EMAIL=… node dev/tests/e2e40.js <image> [largeur]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const IMG = process.argv[2], W = +(process.argv[3] || 420);
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = []; const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const open = async () => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
    await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1500); return p; };
  let p = await open();
  await p.evaluate(() => go('tamachag')); await p.waitForTimeout(300);
  p.on('dialog', d => { errs.push('dialogue : ' + d.message()); d.dismiss(); }); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setInputFiles('#shot-tamachag', IMG); await p.waitForTimeout(2500);

  const key = await p.evaluate(() => 'days/tamachag/months/' + isoDay(rpDay) + '~shot');
  let db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const img = db[key]?.img || '';
  ok(img.startsWith('data:image/jpeg') && img.length < 600e3, `capture compressée et enregistrée à part (${Math.round(img.length / 1024)} Ko, image d'origine ${Math.round(fs.statSync(IMG).size / 1024)} Ko)`);
  ok(!JSON.stringify(Object.entries(db).filter(([k]) => /\/months\/\d{4}-\d{2}$/.test(k))).includes('data:image'), 'la fiche du mois reste légère (pas d\'image dedans)');
  ok(await p.locator('.shot img').count() === 1, 'affichée sur la fiche');
  await p.close(); p = await open(); await p.evaluate(() => go('tamachag')); await p.waitForTimeout(600);
  ok(await p.locator('.shot img').count() === 1, 'toujours là après un rechargement');
  await p.evaluate(() => { state.tamachag.mood ||= 'Calme'; state.tamachag.done = true; renderChar('tamachag'); }); await p.waitForTimeout(300);
  ok(await p.locator('.recap-shot').count() === 1, 'dans le récap (image Discord)');
  await p.evaluate(() => { state.tamachag.done = false; renderChar('tamachag'); }); await p.waitForTimeout(200);
  await p.click('#shot-off-tamachag'); await p.waitForTimeout(800);
  db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  ok(!db[key] && !(await p.locator('.shot img').count()), 'retirée (document supprimé)');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  ok(!errs.length, 'aucune erreur ' + errs.join(' | '));
  await b.close(); })();
