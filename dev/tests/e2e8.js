// Journée jouée en RP par binôme : les deux fiches comptent comme remplies, partagé entre joueurs, historique.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const nono = await open('nr', process.env.NONO_EMAIL), jy = await open('jr', 'jynette@example.com');
  await nono.evaluate(() => go('tamachag')); await nono.click('#rp-tamachag'); await nono.waitForTimeout(300);
  console.log('Partenaire proposé :', await nono.$eval('#rp-with-tamachag', s => s.options[s.selectedIndex].text), '|', (await nono.textContent('.rp-played .reserved')).trim());
  await nono.evaluate(() => go('home')); await nono.waitForTimeout(1500);
  const cards = async p => p.evaluate(() => ['tamachag', 'taiga', 'khokkutsai'].map(id => id + ': ' + document.querySelector('#card-' + id + ' .state').textContent));
  console.log('Accueil Nono :', await cards(nono));
  await jy.waitForTimeout(800); await jy.evaluate(() => go('home')); await jy.waitForTimeout(200);
  console.log('Accueil Jynette :', await cards(jy));
  await jy.evaluate(() => go('taiga')); console.log('Fiche Taiga (Jynette) :', await jy.isChecked('#rp-taiga'), await jy.$eval('#rp-with-taiga', s => s.value));
  const db = JSON.parse(await nono.evaluate(() => localStorage.getItem('mockdb'))); const ym = await nono.evaluate(() => RP_APP.ym), dd = await nono.evaluate(() => RP_APP.day);
  console.log('Entrée Tamachag :', JSON.stringify(db[`days/tamachag/months/${ym}`]?.[dd]?.rp), '| jour partagé :', JSON.stringify(db[`shared/day-${await nono.evaluate(() => RP_APP.iso)}`]?.rp));
  // Historique : la veille, Tamachag a noté rp avec Taiga, Taiga n'a rien enregistré
  const h = await jy.evaluate(() => { const d = new Date(rpDay); d.setDate(d.getDate() - 1); const k = keyOf(d);
    HISTORY.tamachag[k] = { rp: 'taiga' }; delete HISTORY.taiga[k];
    Object.assign(state.taiga, { view: 'history', cal: { y: d.getFullYear(), m: d.getMonth() }, calSel: d }); go('taiga');
    return { day: d.getDate(), filled: statsFor(C.find(c => c.id === 'taiga'), [d]).filled }; });
  console.log('Hier chez Taiga : case remplie ?', await jy.$eval(`.cal-day[data-day="${h.day}"]`, e => e.classList.contains('filled')), '| comptée :', h.filled, '|', (await jy.textContent('.day-detail')).replace(/\s+/g, ' ').trim().slice(0, 80));
  // Décocher : les deux fiches reviennent
  await nono.evaluate(() => go('tamachag')); await nono.click('#rp-tamachag'); await nono.waitForTimeout(1500);
  console.log('Après décochage (Jynette) :', await cards(jy).catch(() => 'n/a'), await jy.evaluate(() => JSON.stringify(rpPlayed)));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
