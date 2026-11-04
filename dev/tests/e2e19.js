// Simule Firefox : la case cliquée garde le focus ; une mise à jour arrive de l'autre joueur, puis clic suivant.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (n, e) => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; localStorage.setItem('rp-night-open', JSON.stringify(['eoor:data-next-night', 'yasmeen:data-next-night'])); }, [n, e]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const p = await open('f1', process.env.NONO_EMAIL), jy = await open('f2', 'jynette@example.com');
  await p.evaluate(() => go('eoor'));
  const top = s => p.evaluate(x => Math.round(document.querySelector(x).getBoundingClientRect().top), s);
  const calm = '[data-next-night="Nuit calme"]', hot = '#hot-eoor';
  for (const [i, sel] of [calm, hot, calm, calm, hot].entries()) {
    await p.evaluate(x => document.querySelector(x).scrollIntoView({ block: 'center' }), sel); await p.waitForTimeout(150);
    const a = await top(sel), y0 = await p.evaluate(() => Math.round(scrollY));
    await p.click(sel); await p.evaluate(x => document.querySelector(x)?.focus(), sel);   // focus gardé comme sous Firefox
    // l'autre joueur écrit quelque chose (déclenche une mise à jour en direct chez Nono)
    await jy.evaluate(i => { go('yasmeen'); document.getElementById('mood-yasmeen').value = 'm' + i; document.getElementById('mood-yasmeen').dispatchEvent(new Event('input', { bubbles: true })); }, i);
    await p.waitForTimeout(2500);
    console.log(sel.padEnd(30), 'case', a, '→', await top(sel), '| page', y0, '→', await p.evaluate(() => Math.round(scrollY)), '| cochée :', await p.isChecked(sel));
  }
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })();
