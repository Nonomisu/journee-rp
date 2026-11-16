// Jour de travail de Khopses : pas de nuit avec Viggo, depuis la fiche de Viggo comme depuis celle de Khopses.
// Usage : node dev/tests/e2e36.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(() => { window.name = 'f2'; window.MOCK_EMAIL = 'jynette@example.com'; });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    WORKDAYS.khopses.add(weekday(rpDay)); const o = {};
    setNight('khopses', true); o.dflt = nightOf('khopses').with; setNight('khopses', false);
    setNight('khopses', true, 'viggo'); o.forced = nightsBy.khopses?.with || null; o.viggo = !!nightsBy.viggo?.hot;
    setNight('viggo', true, 'khopses'); o.fromViggo = nightsBy.viggo?.with || null;
    setNight('khopses', true, 'client'); o.client = nightOf('khopses').with;
    go('khopses'); const bt = document.querySelector('[data-with="viggo"]'); o.chip = bt ? bt.disabled + ':' + bt.title : 'absent';
    o.msg = [...document.querySelectorAll('.reserved')].map(x => x.textContent).find(t => t.includes('travaille ce soir')) || '';
    setCalm('khopses', true); o.calm = calmWithOf('khopses');
    WORKDAYS.khopses.clear(); setCalm('khopses', false); setNight('khopses', true, 'viggo'); o.free = nightOf('khopses').with;
    return o; });
  console.log(r);
  ok(r.dflt !== 'viggo' && r.forced !== 'viggo' && !r.viggo, 'Khopses : nuit avec Viggo impossible (par défaut comme choisie)');
  ok(r.fromViggo !== 'khopses', 'Viggo : toujours bloqué');
  ok(r.client === 'client', 'nuit avec un client toujours possible');
  ok(r.chip === 'true:Khopses travaille ce soir', 'bouton Viggo désactivé sur la fiche de Khopses');
  ok(r.msg.includes('Khopses travaille ce soir'), 'message sur la fiche : ' + r.msg);
  ok(r.calm !== 'viggo', 'nuit calme : pas avec Viggo non plus');
  ok(r.free === 'viggo', 'jour sans travail : nuit avec Viggo possible');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
