// Projets de l'Iloh depuis Journée RP : catégorie « Projet » sur les fiches recopiées, étape verrouillée, participation,
// une par jour, annulation (y compris en décochant l'activité ailleurs), catégorie retirée quand le projet est terminé.
// Usage : NONO_EMAIL=… node dev/tests/e2e41.js [largeur]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const W = +(process.argv[2] || 420);
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: 'window.htmlToImage={toBlob:async()=>new Blob(["png"])};', contentType: 'application/javascript' }));
  const calls = []; await ctx.route('https://discord.test/**', r => { calls.push(r.request().method()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"m1"}' }); });
  const errs = [];
  const rp = new Date(Date.now() - 5 * 3600e3), pad = n => String(n).padStart(2, '0'), iso = `${rp.getFullYear()}-${pad(rp.getMonth() + 1)}-${pad(rp.getDate())}`;
  const live = { iso, at: 1, names: {}, players: {}, ops: {}, todo: {}, events: [], shared: {}, fiches: {}, joins: [],
    projects: [{ id: 'pr1', title: 'Nouvelle yourte', named: true, mode: 'suite', prog: 1, total: 3, mine: {},
      steps: [{ name: 'Matériaux', goal: 2, n: 1, open: true }, { name: 'Charpente', goal: 1, n: 0, open: false }],
      acts: [{ act: 'Couper du bois', open: true, tag: 'Étape 1' }, { act: 'Chant', open: true, tag: 'Tout le projet' }, { act: 'Tanner les peaux', open: false, tag: 'Étape 2 verrouillée' }] }] };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(([iso, live]) => { localStorage.removeItem('mockdb'); localStorage.setItem('mockdb', JSON.stringify({ ['iloh/_live/months/' + iso]: live })); }, [iso, live]); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1500);
  const setLive = f => p.evaluate(([iso, f]) => { const db = JSON.parse(localStorage.getItem('mockdb')); const L = db['iloh/_live/months/' + iso]; new Function('L', f)(L);
    localStorage.setItem('mockdb', JSON.stringify(db)); window.dispatchEvent(new StorageEvent('storage', { key: 'mockdb' })); }, [iso, f]);
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const ops = () => p.evaluate(() => Object.values(state.tamachag.ilohOps || {}).filter(o => o.op === 'projDo'));
  const box = a => p.locator(`.proj-cat input[data-iloh-pact="${a}"]`);
  await p.evaluate(() => go('tamachag')); await p.waitForTimeout(400);

  console.log('Catégorie du projet sur la fiche de Tamachag');
  ok(await p.locator('.proj-cat').count() === 1 && (await p.textContent('.proj-cat')).includes('Projet · Nouvelle yourte · 1/3'), 'catégorie « Projet · Nouvelle yourte »');
  ok((await p.textContent('.proj-cat')).includes('Étape en cours : « Matériaux » (1/2)'), 'étape en cours');
  ok(await p.locator('.chrono-part .cat.fold').first().evaluate(e => e.classList.contains('proj-cat')), 'avant les autres catégories');
  ok(await box('Tanner les peaux').isDisabled() && !(await box('Couper du bois').isDisabled()), 'action de l\'étape verrouillée impossible à cocher');
  ok(await p.evaluate(() => { go('eoor'); const n = document.querySelectorAll('.proj-cat').length; go('tamachag'); return n === 0; }), 'absente des fiches non recopiées');
  await p.waitForTimeout(200);
  await box('Couper du bois').scrollIntoViewIfNeeded(); await p.waitForTimeout(150); const y0 = (await box('Couper du bois').boundingBox()).y;
  await p.locator('.proj-cat label:has(input[data-iloh-pact="Couper du bois"])').click(); await p.waitForTimeout(400);
  ok(Math.abs((await box('Couper du bois').boundingBox()).y - y0) < 4, 'coche sans saut de page');
  let o = await ops();
  ok(o.length === 1 && o[0].pid === 'pr1' && o[0].act === 'Couper du bois' && o[0].on && await p.evaluate(() => state.tamachag.checked.has('Couper du bois')), 'geste noté pour le service, activité cochée sur la fiche');
  ok(await box('Couper du bois').isChecked() && await box('Chant').isDisabled() && (await p.textContent('.proj-cat')).includes('envoi…'), 'en attente : une seule participation par jour');
  await setLive(`L.ops = Object.fromEntries(Object.keys(${JSON.stringify(Object.fromEntries((await p.evaluate(() => Object.keys(state.tamachag.ilohOps))).map(k => [k, 1])))}).map(k => [k, 'ok'])); L.projects[0].mine = { tamachag: 'Couper du bois' }; L.projects[0].prog = 2; L.projects[0].steps[0].n = 2; L.projects[0].steps[0].open = false; L.projects[0].steps[1].open = true; L.projects[0].acts[0] = { act: 'Couper du bois', open: false, tag: 'Étape 1 terminée' }; L.projects[0].acts[2] = { act: 'Tanner les peaux', open: true, tag: 'Étape 2' };`);
  await p.waitForTimeout(800);
  ok((await p.textContent('.proj-cat')).includes('Étape en cours : « Charpente »') && await box('Couper du bois').isChecked() && !(await p.textContent('.proj-cat')).includes('envoi…'), 'résumé reçu : étape 2 débloquée, participation confirmée');
  ok(await box('Tanner les peaux').isDisabled(), 'pas de 2e participation le même jour');

  console.log('Annulation');
  await box('Couper du bois').click(); await p.waitForTimeout(300);
  o = await ops(); ok(o.at(-1).on === false && o.at(-1).act === 'Couper du bois', 'décocher : participation retirée');
  ok(!(await box('Tanner les peaux').isDisabled()), 'l\'étape 2 redevient possible');
  await box('Tanner les peaux').click(); await p.waitForTimeout(300);
  await p.evaluate(() => { const cb = document.querySelector('.cat:not(.proj-cat) input[data-act="Tanner les peaux"]'); cb.checked = false; cb.dispatchEvent(new Event('change')); }); await p.waitForTimeout(300);
  o = await ops(); ok(o.at(-1).on === false && o.at(-1).act === 'Tanner les peaux', 'activité décochée ailleurs : participation retirée aussi');

  console.log('Fiche validée et projet terminé');
  await p.evaluate(() => { state.tamachag.done = true; renderChar('tamachag'); }); await p.waitForTimeout(300);
  ok(await p.locator('.proj-cat').count() === 1, 'catégorie aussi sur la fiche validée');
  ok(await wide(), 'pas de débordement horizontal');
  await setLive(`L.projects = [];`); await p.waitForTimeout(800);
  ok(await p.locator('.proj-cat').count() === 0, 'projet terminé : la catégorie disparaît');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
