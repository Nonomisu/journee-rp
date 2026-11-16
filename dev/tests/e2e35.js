// Nouvelles en attente de validation : elles survivent à un rechargement de l'appli avant la validation
// (Khopses avec un client un jour de travail, notée le matin, validée le soir après réouverture).
// Usage : NONO_EMAIL=… node dev/tests/e2e35.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const news = p => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('mockdb') || '{}')).filter(k => k.startsWith('news/')));
  let elle = await open('f2', 'jynette@example.com');
  // Le matin : jour de travail, nuit avec un client, appel à Viggo ; pas encore validé.
  await elle.evaluate(() => { go('khopses'); WORKDAYS.khopses.add(weekday(rpDay)); setNight('khopses', true, 'client'); state.khopses.callPartner = true;
    const k = 'call:' + keyOf(rpDay) + ':khopses'; pushNews('viggo', 'appel', k, 'khopses'); renderChar('khopses'); document.body.click(); });
  await elle.waitForTimeout(1500);
  ok(!(await news(elle)).some(k => k.includes('client')), 'avant validation : rien d\'envoyé');
  await elle.close();
  // Le soir : l'appli a été rechargée, on valide.
  elle = await open('f2', 'jynette@example.com');
  ok(await elle.evaluate(() => nightOf('khopses').with === 'client'), 'nuit avec un client retrouvée');
  await elle.evaluate(() => go('khopses')); await elle.waitForTimeout(200);
  await elle.evaluate(() => { state.khopses.mood ||= 'ok'; renderChar('khopses'); });
  await elle.click('#done-khopses'); await elle.waitForTimeout(2000);
  const ks = await news(elle);
  ok(ks.some(k => k.includes('client:')), 'après rechargement puis validation : nouvelle du client envoyée à Viggo');
  ok(ks.some(k => k.includes('call:')), 'après rechargement puis validation : nouvelle de l\'appel envoyée à Viggo');
  // Fiche rouverte puis revalidée après un nouveau rechargement : pas de doublon remis « non lu ».
  const nono = await open('f1', process.env.NONO_EMAIL);
  await nono.waitForTimeout(800);
  ok(await nono.evaluate(() => myNews().some(n => n.key.startsWith('client:'))), 'Nono voit la nouvelle');
  await nono.evaluate(() => { NEWS.forEach(n => { n.read = true; }); document.body.click(); }); await nono.waitForTimeout(1500);
  await elle.evaluate(() => { state.khopses.done = false; renderChar('khopses'); document.body.click(); }); await elle.waitForTimeout(1500);
  await elle.close(); elle = await open('f2', 'jynette@example.com');
  await elle.evaluate(() => go('khopses')); await elle.waitForTimeout(200);
  await elle.click('#done-khopses'); await elle.waitForTimeout(2000);
  ok(await elle.evaluate(() => Object.entries(JSON.parse(localStorage.getItem('mockdb'))).filter(([k]) => k.startsWith('news/')).every(([, v]) => v.read)), 'revalidation : les nouvelles déjà lues restent lues');
  console.log('erreurs :', errs.length ? errs : 'aucune'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
