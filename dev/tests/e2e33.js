// Manifestation sur la nuit précédente : Hokkyoku l'ajoute après coup (nuit d'hier avec Unegen), Unegen la voit et est prévenu.
// Usage : NONO_EMAIL=… node dev/tests/e2e33.js
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
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const elle = await open('f2', 'jynette@example.com');
  // Hier : nuit chaude d'Hokkyoku avec Unegen
  const [pym, pday] = await elle.evaluate(() => { const d = prevDay(); return [`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, String(d.getDate())]; });
  await elle.evaluate(([ym, d]) => { const db = JSON.parse(localStorage.getItem('mockdb') || '{}'); db[`days/hokkyoku/months/${ym}`] = { ...(db[`days/hokkyoku/months/${ym}`] || {}), [d]: { done: true, mood: 'ok', night: { hot: true, with: 'unegen' } } }; localStorage.setItem('mockdb', JSON.stringify(db)); }, [pym, pday]);
  await elle.reload(); await elle.waitForTimeout(400); if (await elle.isVisible('#login-btn')) await elle.click('#login-btn'); await elle.waitForTimeout(1500);
  await elle.evaluate(() => go('hokkyoku')); await elle.waitForTimeout(300);
  if (await elle.locator('#prev-edit-hokkyoku').count()) { await elle.click('#prev-edit-hokkyoku'); await elle.waitForTimeout(200); }
  ok(await elle.locator('#nefp-on').count() === 1, 'nuit précédente avec Unegen : case « Manifestation »');
  ok(await elle.locator('#nef-on').count() === 0, 'nuit à venir sans Unegen : pas de manifestation pour cette nuit');
  await elle.evaluate(() => document.getElementById('nefp-on').click()); await elle.waitForTimeout(300);
  await elle.evaluate(() => document.querySelector('[data-nefp-ctx="Température glaciale"]').click()); await elle.waitForTimeout(300);
  await elle.evaluate(() => document.querySelector('[data-nefp-host="Prise de ses cachets"]').click()); await elle.waitForTimeout(1500);
  const e = (await elle.evaluate(() => JSON.parse(localStorage.getItem('mockdb'))))[`days/hokkyoku/months/${pym}`][pday];
  ok(e.nefaste === 'Manifestation : Température glaciale · Prise de ses cachets', 'texte enregistré sur la journée d\'hier d\'Hokkyoku (sans l\'injection)');
  ok(await elle.locator('[data-nefp-inj]').count() === 0 && (await elle.textContent('.nefaste')).includes("Injection d'Unegen : oui"), 'Hokkyoku voit l\'injection sans pouvoir la cocher');
  ok(e.nefPrev?.on && e.done === true && e.night?.with === 'unegen', 'détail enregistré, le reste de la journée d\'hier intact');
  ok(await elle.evaluate(() => NEWS.some(n => n.key.startsWith('nef:') && n.charId === 'unegen' && n.text.includes('la nuit dernière'))), 'nouvelle pour Unegen');
  await elle.click('#prev-done-hokkyoku'); await elle.waitForTimeout(200);
  ok((await elle.textContent('#view')).includes('Manifestation : Température glaciale'), 'résumé de la nuit précédente avec la manifestation');
  // Nono, fiche d'Unegen : la manifestation de la nuit dernière
  const nono = await open('f1', process.env.NONO_EMAIL);
  await nono.evaluate(() => go('unegen')); await nono.waitForTimeout(300);
  if (await nono.locator('#prev-edit-unegen').count()) { await nono.click('#prev-edit-unegen'); await nono.waitForTimeout(200); }
  ok((await nono.textContent('#view')).includes('Manifestation : Température glaciale'), 'Unegen : manifestation de la nuit dernière affichée');
  ok(await nono.locator('#nefp-on').count() === 0, 'Unegen ne coche pas la manifestation lui-même');
  ok(await nono.locator('[data-nefp-inj]').count() === 1, 'Unegen : case « Injection d\'Unegen » sur sa fiche');
  await nono.evaluate(() => document.querySelector('[data-nefp-inj]').click()); await nono.waitForTimeout(1200);
  const u = (await nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb'))))[`days/unegen/months/${pym}`]?.[pday] || {};
  ok(u.nefInj === false && u.nefaste === 'Manifestation : Température glaciale · Prise de ses cachets', 'injection décochée, enregistrée sur la journée d\'hier d\'Unegen');
  await elle.reload(); await elle.waitForTimeout(400); if (await elle.isVisible('#login-btn')) await elle.click('#login-btn'); await elle.waitForTimeout(1500);
  await elle.evaluate(() => go('hokkyoku')); await elle.waitForTimeout(300); if (await elle.locator('#prev-edit-hokkyoku').count()) { await elle.click('#prev-edit-hokkyoku'); await elle.waitForTimeout(200); }
  ok((await elle.textContent('.nefaste')).includes("Injection d'Unegen : non"), 'Hokkyoku voit l\'injection décochée par Unegen');
  // Retirer la manifestation
  await elle.evaluate(() => document.getElementById('nefp-on').click()); await elle.waitForTimeout(1200);
  const e2 = (await elle.evaluate(() => JSON.parse(localStorage.getItem('mockdb'))))[`days/hokkyoku/months/${pym}`][pday];
  ok(!e2.nefaste && !e2.nefPrev.on && await elle.evaluate(() => !NEWS.some(n => n.key.startsWith('nef:'))), 'manifestation retirée : texte et nouvelle retirés');
  ok(await elle.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
