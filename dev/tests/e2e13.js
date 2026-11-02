// Position de la page : aucun saut quand on plie/déplie, coche, décoche ; récap validé sans hauteur parasite.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'jp'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.removeItem('mockdb')); await p.reload(); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  const pos = async sel => p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
  const step = async (label, sel, act) => { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); const a = await pos(sel), y0 = await p.evaluate(() => scrollY); await act(); await p.waitForTimeout(150); const b1 = await pos(sel).catch(() => 'disparu'); await p.waitForTimeout(2500); const b2 = await pos(sel).catch(() => 'disparu');
    console.log(label.padEnd(34), 'avant', a, '→ juste après', b1, '→ 2,5 s après', b2, '| défilement', y0, '→', await p.evaluate(() => scrollY)); };
  await p.evaluate(() => go('eoor'));
  await step('Repli catégorie Quotidien', 'details[data-fold="quotidien"] > summary', () => p.click('details[data-fold="quotidien"] > summary'));
  await step('Ouvre « Comment va se passer »', 'details[data-night-fold="eoor:data-next-night"] > summary', () => p.click('details[data-night-fold="eoor:data-next-night"] > summary'));
  await step('Coche Nuit chaude', '#hot-eoor', () => p.click('#hot-eoor'));
  await step('Décoche Nuit chaude', '#hot-eoor', () => p.click('#hot-eoor'));
  await step('Referme la nuit à venir', 'details[data-night-fold="eoor:data-next-night"] > summary', () => p.click('details[data-night-fold="eoor:data-next-night"] > summary'));
  await p.click('details[data-fold="quotidien"] > summary'); await p.waitForTimeout(100);
  await step('Coche une activité', '[data-act="Session hammam"]', () => p.click('[data-act="Session hammam"]'));
  await step('Choix état physique', '[data-phys="Maladie"]', () => p.click('[data-phys="Maladie"]'));
  // Récap d'une fiche validée ouverte depuis l'accueil (page d'accueil longue)
  await p.evaluate(() => go('eoor')); await p.fill('#mood-eoor', 'x'); await p.dispatchEvent('#mood-eoor', 'input'); await p.click('#done-eoor'); await p.waitForTimeout(1200);
  await p.evaluate(() => go('home')); await p.evaluate(() => window.scrollTo(0, 1e6)); await p.click('#card-eoor'); await p.waitForTimeout(300);
  console.log('Récap ouvert depuis l’accueil : hauteur mini =', await p.evaluate(() => document.getElementById('view').style.minHeight || 'aucune'), '| vue', await p.evaluate(() => document.getElementById('view').offsetHeight), 'px');
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })();
