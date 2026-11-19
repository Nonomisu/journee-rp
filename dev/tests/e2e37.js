// Discord : jamais de fiche envoyée deux fois (deux envois rapprochés → un seul message ; Discord en erreur → pas de doublon).
// Usage : NONO_EMAIL=… node dev/tests/e2e37.js
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch();
  for (const W of [420, 1280]) {
  console.log('largeur', W);
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: 'window.htmlToImage={toBlob:async()=>new Blob(["png"])};', contentType: 'application/javascript' }));
  const calls = []; let patchStatus = 200, n = 0;
  await ctx.route('https://discord.test/**', async r => { const m = r.request().method(); calls.push(m);
    await new Promise(x => setTimeout(x, 400));
    if (m === 'PATCH' && patchStatus !== 200) return r.fulfill({ status: patchStatus, body: '{}' });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: m === 'POST' ? 'msg' + (++n) : 'msg' + n }) }); });
  const errs = [];
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1200);
  await p.evaluate(() => { RP_DISCORD.webhooks = { corentin: 'https://discord.test/hook' }; go('tamachag'); state.tamachag.mood ||= 'ok'; renderChar('tamachag'); });
  // « J'ai terminé » puis, dans la foulée, un second envoi (reprise de vie intime) : un seul message.
  await p.click('#done-tamachag'); await p.evaluate(() => RP_DISCORD.send('tamachag')); await p.waitForTimeout(3000);
  ok(JSON.stringify(calls) === '["POST","PATCH"]', 'deux envois rapprochés : 1 message créé puis mis à jour (' + calls + ')');
  ok(await p.evaluate(() => state.tamachag.discordMsg === 'msg1'), 'n° du message gardé');
  // Discord surchargé (429) : pas de nouveau message, bouton Réessayer.
  calls.length = 0; patchStatus = 429;
  await p.evaluate(() => RP_DISCORD.send('tamachag')); await p.waitForTimeout(1500);
  ok(JSON.stringify(calls) === '["PATCH"]', 'Discord en erreur : aucun doublon (' + calls + ')');
  ok(await p.evaluate(() => !!document.querySelector('[data-discord-retry]')), 'bouton Réessayer affiché');
  // Message supprimé sur Discord (404) : un nouveau message est posté.
  calls.length = 0; patchStatus = 404;
  await p.evaluate(() => RP_DISCORD.send('tamachag')); await p.waitForTimeout(1800);
  ok(JSON.stringify(calls) === '["PATCH","POST"]' && await p.evaluate(() => state.tamachag.discordMsg === 'msg2'), 'message supprimé : renvoyé une fois');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'pas de débordement horizontal');
  ok(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await ctx.close(); }
  await b.close(); })();
