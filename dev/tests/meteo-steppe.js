// Comptage des blizzards de la steppe par année (attendu : décembre et janvier seulement, 10 à 12 par an).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const ctx = await b.newContext();
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(path.join(__dirname, 'mockfb'), r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const p = await ctx.newPage(); await p.addInitScript(e => { window.name = 'wx'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  console.log(JSON.stringify(await p.evaluate(() => { const out = {};
    for (const y of [2025, 2026, 2027, 2028, 2029, 2030]) { const cnt = {}, months = {};
      for (let i = 0; i < 366; i++) { const d = new Date(y, 0, 1 + i); if (d.getFullYear() !== y) break; const w = cityWeather('ulaanbaatar', tempAt('ulaanbaatar', d), d).label; cnt[w] = (cnt[w] || 0) + 1; if (/Blizzard|Tempête/.test(w)) (months[w] ||= {})[d.getMonth() + 1] = ((months[w] || {})[d.getMonth() + 1] || 0) + 1; }
      out[y] = { blizzard: cnt['Blizzard'] || 0, tempete: cnt['Tempête'] || 0, mois: months }; }
    return out; })));
  await b.close(); })();
