const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const MOCK = path.join(__dirname, 'mockfb');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(MOCK, r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route('**/html-to-image.js', r => r.fulfill({ body: fs.readFileSync(require.resolve('html-to-image/dist/html-to-image.js')), contentType: 'application/javascript' }));
  const calls = [];
  await ctx.route('https://discord.com/api/webhooks/**', async r => {
    const req = r.request(), body = req.postDataBuffer() || Buffer.from('');
    const txt = body.toString('latin1'); const pj = txt.match(/name="payload_json"\r\n\r\n([\s\S]*?)\r\n--/);
    calls.push({ method: req.method(), url: req.url().replace(/webhooks\/\d+\/[\w-]+/, 'webhooks/…'), png: /image\/png/.test(txt) && txt.includes('PNG'), size: body.length, payload: pj ? JSON.parse(Buffer.from(pj[1], 'latin1').toString('utf8')) : null });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '123456', channel_id: '1' }) });
  });
  const errs = [];
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(e => { window.name = 'd4'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);   // l'adresse est passée au navigateur (process n'y existe pas)
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.click('.discord-set summary'); await p.fill('#discord-hook-corentin', 'https://discord.com/api/webhooks/123/abcDEF-xyz');
  await p.click('[data-discord-save="corentin"]'); await p.waitForTimeout(800);
  console.log('Réglage :', await p.textContent('#discord-msg'));
  await p.evaluate(() => go('viggo')); await p.waitForTimeout(200);
  await p.fill('#mood-viggo', 'Fatigué mais fier.'); await p.dispatchEvent('#mood-viggo', 'input');
  await p.click('[data-act="Entraînement"]'); await p.waitForTimeout(200);
  await p.click('#done-viggo'); await p.waitForTimeout(4000);
  console.log('Pied :', (await p.textContent('.recap-foot')).replace(/\s+/g, ' '));
  await p.click('#edit-viggo'); await p.waitForTimeout(200); await p.click('#done-viggo'); await p.waitForTimeout(4000);
  calls.filter(c => c.method !== 'GET').forEach(c => console.log(c.method, c.url, 'png:', c.png, Math.round(c.size / 1024) + ' ko'));
  const e = calls.find(c => c.payload)?.payload;
  console.log(JSON.stringify(e, null, 1).slice(0, 1400));
  const db = await p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  console.log('discordMsg enregistré :', db[`days/viggo/months/${await p.evaluate(() => RP_APP.ym)}`]?.[await p.evaluate(() => RP_APP.day)]?.discordMsg, '| webhook en base :', !!db['shared/discord']?.webhook);
  // Lien direct
  await p.goto('http://localhost:8765/?fiche=viggo&jour=' + await p.evaluate(() => RP_APP.iso)); await p.waitForTimeout(1200);
  console.log('Lien direct ouvre :', await p.evaluate(() => current), '| adresse :', await p.evaluate(() => location.href));
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
