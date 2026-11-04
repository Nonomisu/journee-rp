// Garde-fou de position : un navigateur qui remonte la page juste après le réaffichage est corrigé ; la molette reste libre.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  // Simule un navigateur qui, après le réaffichage, fait remonter la page tout en haut (focus perdu → scroll)
  await p.addInitScript(e => { window.name = 'ff'; window.MOCK_EMAIL = e; localStorage.setItem('rp-night-open', JSON.stringify(['tamachag:data-next-night']));
    document.addEventListener('change', () => setTimeout(() => window.scrollTo({ top: 0 }), 30)); }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.removeItem('mockdb')); await p.reload(); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.evaluate(() => go('tamachag'));
  const top = s => p.evaluate(x => Math.round(document.querySelector(x).getBoundingClientRect().top), s);
  for (const sel of ['#hot-tamachag', '[data-next-night="Nuit calme"]', '#hot-tamachag', '#hot-tamachag']) {
    await p.evaluate(x => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(150);
    const a = await top(sel); await p.click(sel); await p.waitForTimeout(400); const b1 = await top(sel); await p.waitForTimeout(2500);
    console.log(sel.padEnd(32), a, '→', b1, '→', await top(sel), '| scroll', await p.evaluate(() => Math.round(scrollY)));
  }
  // Un vrai défilement juste après n'est pas bloqué
  await p.click('#hot-tamachag'); await p.mouse.wheel(0, -600); await p.waitForTimeout(300); console.log('Molette après clic : défilement libre ?', await p.evaluate(() => Math.round(scrollY)));
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })();
