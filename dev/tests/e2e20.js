// Iloh Khurdan : masquer une activité dans l'appli de groupe (ce jour-là, ou toujours). Usage : NONO_EMAIL=… node dev/tests/e2e20.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const MOCK = path.join(__dirname, 'mockfb');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => {
  const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(MOCK, r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.addInitScript(e => { window.name = 'n'; window.MOCK_EMAIL = e; window.MOCK_WRITES = []; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForTimeout(1500);
  await p.evaluate(() => go('tengis')); await p.waitForTimeout(200);
  ok(await p.locator('[data-iloh-hide]').count() === 0, 'rien tant qu\'aucune activité n\'est cochée');
  await p.click('[data-act="Chasse solo"]'); await p.waitForTimeout(200);
  ok(await p.locator('[data-iloh-hide="Chasse solo"]').count() === 1, 'bouton « masquer dans Iloh » sous l\'activité cochée');
  ok((await p.textContent('.iloh-row')).includes('Visible dans Iloh Khurdan'), 'visible par défaut');
  const y0 = await p.evaluate(() => document.querySelector('[data-iloh-hide]').getBoundingClientRect().top);
  await p.click('[data-iloh-hide="Chasse solo"]'); await p.waitForTimeout(1200);
  const y1 = await p.evaluate(() => document.querySelector('[data-iloh-hide]').getBoundingClientRect().top);
  ok(Math.abs(y1 - y0) < 2, 'pas de saut de page au clic');
  ok((await p.textContent('.iloh-row')).includes('Masquée dans Iloh Khurdan aujourd'), 'masquée ce jour-là');
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const ym = await p.evaluate(() => RP_APP.ym), day = await p.evaluate(() => RP_APP.day);
  let d = await db();
  ok(JSON.stringify(d[`days/tengis/months/${ym}`]?.[day]?.hideIloh) === '{"$set":["Chasse solo"]}', 'enregistré sur la journée (hideIloh)');
  await p.click('[data-act="Chasse solo"]'); await p.waitForTimeout(1200);
  d = await db();
  ok(!JSON.stringify(d[`days/tengis/months/${ym}`]?.[day]?.hideIloh || '').includes('Chasse solo'), 'décocher l\'activité retire aussi le masquage');
  // Toujours masquée : mode gestion
  await p.click('#manage-acts-tengis'); await p.waitForTimeout(200);
  ok(await p.locator('[data-iloh-always="Chasse solo"]').count() === 1, 'bouton « toujours masquer » dans le mode gestion');
  await p.click('[data-iloh-always="Chasse solo"]'); await p.waitForTimeout(1200);
  d = await db();
  ok(JSON.stringify(d['shared/global']?.hideIloh?.tengis) === '{"$set":["Chasse solo"]}', 'enregistré dans les réglages (hideIloh)');
  await p.click('#manage-acts-tengis'); await p.waitForTimeout(200);
  await p.click('[data-act="Chasse solo"]'); await p.waitForTimeout(300);
  ok((await p.textContent('.iloh-row')).includes('Toujours masquée'), 'sur la fiche : « toujours masquée »');
  // Personnage hors Khurdans : rien
  await p.evaluate(() => go('eoor')); await p.waitForTimeout(200);
  await p.click('[data-act="Session hammam"]'); await p.waitForTimeout(200);
  ok(await p.locator('.iloh-row').count() === 0, 'rien pour Eoor (pas dans Iloh Khurdan)');
  await p.click('#manage-acts-eoor'); await p.waitForTimeout(200);
  ok(await p.locator('[data-iloh-always]').count() === 0, 'rien non plus dans sa liste d\'activités');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
