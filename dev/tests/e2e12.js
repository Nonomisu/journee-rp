// Chronologie du jour : nuit précédente (reprise de la veille, modifiable), activités, nuit à venir (états).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-11-15T12:00:00'));
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  // Hier (14 nov.) : Khokkutsai a eu une nuit chaude avec Inkaraa (enregistrée)
  await seed.evaluate(() => localStorage.setItem('mockdb', JSON.stringify({ 'days/khokkutsai/months/2026-11': { '14': { mood: 'x', night: { hot: true, with: 'inkaraa' } } } }))); await seed.close();
  const nono = await open('ch', process.env.NONO_EMAIL);
  await nono.evaluate(() => go('khokkutsai'));
  console.log('Section :', await nono.$eval('section.chrono h2', h => h.textContent), '|', await nono.$$eval('section.chrono .chrono-h', h => h.map(x => x.textContent.trim().replace(/\s+/g, ' '))));
  console.log('Nuit précédente :', (await nono.textContent('section.chrono .chrono-part')).replace(/\s+/g, ' ').trim().slice(0, 130));
  await nono.click('#prev-edit-khokkutsai'); console.log('Replié par défaut :', await nono.$$eval('details.night-more', d => d.map(x => x.open))); await nono.evaluate(() => document.querySelectorAll('details.night-more > summary').forEach(s => s.click())); await nono.waitForTimeout(100); await nono.check('[data-prev-night="Insomnie"]'); await nono.check('[data-prev-night="A été pot de colle"]'); await nono.waitForTimeout(800);
  const db1 = JSON.parse(await nono.evaluate(() => localStorage.getItem('mockdb')));
  console.log('Hier enregistré :', JSON.stringify(db1['days/khokkutsai/months/2026-11']['14']));
  await nono.click('#prev-done-khokkutsai'); await nono.waitForTimeout(150);
  console.log('Résumé :', (await nono.textContent('section.chrono .chrono-part')).replace(/\s+/g, ' ').trim().slice(0, 140));
  console.log('Résumé replié :', await nono.$$eval('details.night-more > summary', s => s.map(x => x.textContent.trim().replace(/\s+/g, ' '))));
  // Nuit à venir : Nuit calme puis Nuit chaude → calme retiré ; Agité puis Calme → exclusif
  await nono.check('[data-next-night="Nuit calme"]'); await nono.check('[data-next-night="A été agité"]'); await nono.check('[data-next-night="A été calme"]');
  await nono.check('#hot-khokkutsai'); await nono.waitForTimeout(200);
  console.log('Nuit à venir :', await nono.evaluate(() => [...state.khokkutsai.nightStates]), '| chaude :', await nono.evaluate(() => nightOf('khokkutsai').hot));
  await nono.click('[data-act="Entraînement guerrier"]'); await nono.click('#done-khokkutsai'); await nono.waitForTimeout(1500);
  console.log('Récap :', await nono.$$eval('#view .recap .where', ws => ws.map(w => w.textContent.trim().replace(/\s+/g, ' ')).filter(t => /Nuit/.test(t))));
  const jy = await open('cj2', 'jynette@example.com'); await jy.evaluate(() => go('inkaraa')); await jy.waitForTimeout(200);
  console.log('Chez Inkaraa, nuit précédente :', (await jy.textContent('section.chrono .chrono-part')).replace(/\s+/g, ' ').trim().slice(0, 140));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
