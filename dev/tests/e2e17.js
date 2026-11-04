// Saut de page façon Safari (toucher sans focus) en cochant Nuit chaude / Nuit calme : la case doit rester en place.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 800 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = []; const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'sf'; window.MOCK_EMAIL = e; localStorage.setItem('rp-night-open', JSON.stringify(['tamachag:data-next-night'])); }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.removeItem('mockdb')); await p.reload(); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.evaluate(() => go('tamachag'));
  // Toucher « à la Safari » : pointerdown + click, sans focus
  const tap = sel => p.evaluate(s => { const el = document.querySelector(s); el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.click(); }, sel);
  const top = sel => p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
  const step = async (label, sel, target = sel) => { await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); const a = await top(target); await tap(sel); await p.waitForTimeout(200); const b1 = await top(target); await p.waitForTimeout(2500); console.log(label.padEnd(36), a, '→', b1, '→', await top(target)); };
  await step('Coche Nuit chaude', '#hot-tamachag');
  await step('Coche Nuit calme (chaude se décoche)', '[data-next-night="Nuit calme"]');
  await step('Recoche Nuit chaude (calme se décoche)', '#hot-tamachag');
  await step('Décoche Nuit chaude', '#hot-tamachag');
  console.log('erreurs :', errs.length ? errs : 'aucune'); await b.close(); })();
