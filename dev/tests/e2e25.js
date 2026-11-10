// Vidéos d'Echo et Prism : vues entre 1 et 100 000 ; au-delà de 95 000, une nouvelle « succès » ; sous 1 000, une nouvelle « flop ».
// Usage : NONO_EMAIL=… node dev/tests/e2e25.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; localStorage.setItem('rp-night-open', JSON.stringify(['echo:data-next-night'])); }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); await p.waitForTimeout(800);
  // Répartition des vues sur 5 ans de dates
  const st = await p.evaluate(() => { const v = []; for (let i = 0; i < 1826; i++) { const d = new Date(2024, 0, 1 + i); v.push(viewsOf(keyOf(d), false), viewsOf(keyOf(d), true)); }
    return { min: Math.min(...v), max: Math.max(...v), top: v.filter(x => x > FILM_TOP).length / v.length, flop: v.filter(x => x < FILM_FLOP).length / v.length }; });
  ok(st.min >= 1 && st.max <= 100000, `vues entre 1 et 100 000 (de ${st.min} à ${st.max})`);
  ok(st.top > 0.01 && st.top < 0.08 && st.flop > 0.02 && st.flop < 0.12, `succès et flops rares (${(st.top * 100).toFixed(1)} % / ${(st.flop * 100).toFixed(1)} %)`);
  const lines = await p.evaluate(() => [pickLine(FILM_TOP_LINES, 'x')('Echo et Prism', '98 000 vues'), pickLine(FILM_FLOP_LINES, 'y')('Echo et Prism', '512 vues')]);
  ok(lines[0].includes('98 000') && lines[0].includes('Echo et Prism') && lines[1].includes('512'), 'textes : nombre de vues et duo cités');
  // Nuit chaude d'Echo avec Prism, filmée : nouvelle pour Jynette seulement si succès ou flop
  await p.evaluate(() => go('echo')); await p.waitForTimeout(200);
  await p.evaluate(() => setNight('echo', true, 'prism')); await p.evaluate(() => renderChar('echo')); await p.waitForTimeout(200);
  await p.click('#film-echo'); await p.waitForTimeout(300);
  const r = await p.evaluate(() => ({ v: filmViews('echo'), b: filmBuzz('echo'), n: NEWS.filter(n => n.key === filmNewsKey('echo')).map(n => ({ to: n.to, text: n.text })) }));
  if (r.b) ok(r.n.length === 1 && r.n[0].to === 'elle' && r.n[0].text === r.b.text && (await p.textContent('.film-buzz')).includes(r.b.text), `${r.v} vues : nouvelle « ${r.b.kind} » pour Jynette, affichée aussi sur la fiche`);
  else ok(r.n.length === 0 && await p.locator('.film-buzz').count() === 0, `${r.v} vues : ni succès ni flop, pas de nouvelle`);
  await p.click('#film-echo'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => NEWS.filter(n => n.key === filmNewsKey('echo')).length) === 0, 'vidéo retirée : nouvelle retirée');
  ok(await p.evaluate(() => newsKind({ key: 'film:2026-11-10:buzz' })) === 'k-hot', 'nouvelle en rose');
  // Jours de succès et de flop (horloge du navigateur avancée à ces dates)
  const days = await p.evaluate(() => { const out = {}; for (let i = 0; i < 2000 && !(out.top && out.flop); i++) { const d = new Date(2027, 0, 1 + i), v = viewsOf(keyOf(d), false);
    if (v > FILM_TOP && !out.top) out.top = [d.getFullYear(), d.getMonth(), d.getDate(), v]; if (v < FILM_FLOP && !out.flop) out.flop = [d.getFullYear(), d.getMonth(), d.getDate(), v]; } return out; });
  for (const kind of ['top', 'flop']) {
    const [y, m, dd, v] = days[kind];
    const c2 = await b.newContext({ viewport: { width: W, height: 900 } });
    await c2.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
    await c2.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
    const q = await c2.newPage(); q.on('pageerror', x => errs.push(x.message));
    await q.clock.install({ time: new Date(y, m, dd, 12, 0) });
    await q.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
    await q.goto('http://localhost:8765/'); await q.clock.runFor(500); await q.click('#login-btn'); await q.clock.runFor(1500);
    await q.evaluate(() => { go('echo'); setNight('echo', true, 'prism'); renderChar('echo'); }); await q.clock.runFor(200);
    await q.evaluate(() => document.getElementById('film-echo').click()); await q.clock.runFor(300);
    const n = await q.evaluate(() => NEWS.filter(x => x.key === filmNewsKey('echo')).map(x => ({ to: x.to, text: x.text })));
    const want = kind === 'top' ? /enflamme|Carton plein|tourne en boucle|brûlant|serveurs chauffent|faire fondre/ : /Flop|inaperçue|Bide|refroidi|zappé/;
    ok(n.length === 1 && n[0].to === 'elle' && want.test(n[0].text) && n[0].text.includes(v.toLocaleString('fr-FR') + (v > 1 ? ' vues' : ' vue')), `${v} vues le ${dd}/${m + 1}/${y} : nouvelle « ${kind === 'top' ? 'succès' : 'flop'} » pour Jynette`);
    ok(await q.evaluate(t => document.querySelector('.film-buzz')?.textContent.includes(t), n[0]?.text || '§'), 'affichée aussi sur la fiche pour Nono');
    await c2.close();
  }
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await ctx.close();
  }
  await b.close();
})();
