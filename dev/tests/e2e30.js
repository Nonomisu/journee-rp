// Vie intime sur toutes les fiches (plus seulement les Khurdans) : bloc, personnages proposés, nouvelle pour l'autre joueur,
// jamais recopiée dans Iloh Khurdan ni S9 Interact'. Usage : NONO_EMAIL=… node dev/tests/e2e30.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'vi'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(800);
  for (const [id, want] of [['echo', ['prism']], ['eoor', ['yasmeen', 'hokkyoku']], ['viggo', ['khopses']], ['davaajav', null], ['tamachag', null]]) {
    await p.evaluate(id => go(id), id); await p.waitForTimeout(200);
    ok(await p.locator(`#intime-${id}`).count() === 1, `${id} : bloc « Vie intime »`);
    const opts = await p.evaluate(id => intimeOptions(id), id);
    if (want) ok(want.every(x => opts.includes(x)) && !opts.includes(id), `${id} : propose ${want.join(', ')}`);
    else ok(opts.length > 0 && !opts.includes(id), `${id} : personnages proposés (${opts.length})`);
  }
  ok(await p.evaluate(() => intimeOptions('echo').join()) === 'prism', 'Echo : seulement Prism');
  await p.evaluate(() => go('echo')); await p.waitForTimeout(200);
  await p.fill('#intime-echo', 'Massage aux huiles'); await p.dispatchEvent('#intime-echo', 'input');
  await p.click('[data-intime-with="prism"]'); await p.waitForTimeout(200);
  ok(await p.evaluate(() => NEWS.some(n => n.key.startsWith('intime:') && n.charId === 'prism' && n.to === 'elle')), 'nouvelle « Vie intime active » pour la joueuse de Prism');
  await p.click('#done-echo'); await p.waitForTimeout(1500);
  ok((await p.textContent('.recap')).includes('Vie intime') && (await p.textContent('.recap')).includes('Massage aux huiles'), 'récap : vie intime affichée dans Journée RP');
  const db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  const ym = await p.evaluate(() => RP_APP.ym), day = await p.evaluate(() => RP_APP.day);
  ok(db[`days/echo/months/${ym}`]?.[day]?.intime === 'Massage aux huiles', 'enregistrée sur la journée (le miroir la retire)');
  ok(!JSON.stringify(db['today/echo'] || {}).includes('Massage'), 'jamais dans l\'encart public');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'rien ne dépasse');
  ok(!errs.length, 'aucune erreur JavaScript' + (errs.length ? ' : ' + errs.join(' | ') : ''));
  await ctx.close();
  }
  await b.close();
})();
