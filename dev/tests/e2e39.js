// Vie intime : personnages cités dans le texte cochés tout seuls, une nouvelle par personnage, phrases personnalisées Taiga → Davaajav.
// Usage : NONO_EMAIL=… node dev/tests/e2e39.js [largeur]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const W = +(process.argv[2] || 420); const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join('/home/claude/journee-rp/dev/tests/mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = []; const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.evaluate(() => go('tamachag')); await p.waitForTimeout(300);
  const ta = '#intime-tamachag'; await p.locator(ta).scrollIntoViewIfNeeded();
  await p.fill(ta, 'Une nuit avec taiga'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => state.tamachag.intimeWith?.has('taiga') && document.querySelector('[data-intime-with="taiga"]').getAttribute('aria-pressed') === 'true'), 'Taiga citée (minuscules) : cochée toute seule');
  await p.fill(ta, 'Une nuit avec Taiga, puis Javkhaanhun est arrivée.'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => state.tamachag.intimeWith.has('javkhaanhun') && state.tamachag.intimeWith.size === 2), 'plusieurs personnages cités');
  ok(await p.evaluate(() => ['taiga', 'javkhaanhun'].every(x => { const n = NEWS.find(y => y.key === intimeKey('tamachag', x)); return n?.text === "Vie intime active aujourd'hui !" && n.to === 'elle'; })), 'une nouvelle générique pour chacune, vers Jynette');
  await p.evaluate(() => document.querySelector('[data-intime-with="javkhaanhun"]').click()); await p.waitForTimeout(200);
  await p.fill(ta, 'Une nuit avec Taiga, puis Javkhaanhun. Javkhaanhun encore.'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !state.tamachag.intimeWith.has('javkhaanhun') && !NEWS.some(x => x.key === intimeKey('tamachag', 'javkhaanhun'))), 'décochée à la main : pas recochée par le texte');
  await p.fill(ta, 'Avec Taiga, Ankhbayar et Ogloo, puis Inkaraaa'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => !state.tamachag.intimeWith.has('ankhbayar') && !state.tamachag.intimeWith.has('inkaraa') && state.tamachag.intimeWith.has('ogloo')), 'hors liste ignoré, nom incomplet ignoré, Ogloo cochée');
  ok(await p.evaluate(() => { const t = intimeNewsText('taiga', 'davaajav'); return INTIME_LINES['taiga>davaajav'].some(f => f('Taiga', 'Davaajav') === t) && t === intimeNewsText('taiga', 'davaajav'); }), 'Taiga → Davaajav : phrase personnalisée, la même pour la journée');
  ok(await p.evaluate(() => intimeNewsText('davaajav', 'taiga') === "Vie intime active aujourd'hui !"), 'Davaajav → Taiga : générique');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  ok(!errs.length, 'aucune erreur ' + errs.join(' | '));
  await b.close(); })();
