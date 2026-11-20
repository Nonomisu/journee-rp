// Mise à jour automatique de l'appli. Usage : python3 -m http.server 8765 (racine du dépôt), puis node dev/tests/mise-a-jour.js <dossier du dépôt> [largeur] [e-mail]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const REPO = process.argv[2], W = +process.argv[3], EMAIL = process.argv[4];
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: 800 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(REPO, 'dev/tests/mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'x'; window.MOCK_EMAIL = e; }, EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1500);
  await p.evaluate(() => window.RP_UPDATE.check(true)); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.querySelector('.update-bar')), 'même version : rien ne se passe');
  await p.evaluate(() => { window.MARK = 1; document.querySelector('script[src*="app.js?v="]').setAttribute('src', 'app.js?v=ancienne'); });
  // Ancienne version, saisie en cours : bandeau, pas de rechargement
  await p.evaluate(() => { const i = document.createElement('textarea'); i.id = 'tmp'; document.body.appendChild(i); i.value = 'brouillon'; i.focus(); window.RP_UPDATE.check(true); });
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => window.MARK === 1 && !!document.querySelector('.update-bar')), 'texte en cours : bandeau « Mettre à jour », pas de rechargement');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  await p.click('.update-bar button'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.MARK === undefined), '« Mettre à jour » recharge l\'appli');
  await p.evaluate(() => { window.MARK = 1; document.querySelector('script[src*="app.js?v="]').setAttribute('src', 'app.js?v=ancienne'); window.RP_UPDATE.check(true); });
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.MARK === undefined), 'retour sur l\'appli sans saisie : rechargement automatique');
  ok(!errs.length, 'aucune erreur ' + errs.join(' | '));
  await b.close(); })();
