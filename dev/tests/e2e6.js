// Wraps du 26 décembre : test sur un salon séparé (aperçu secret), puis envoi automatique unique à partir du 26.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-11-15T12:00:00'));
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route('**/html-to-image.js', r => r.fulfill({ body: fs.readFileSync(require.resolve('html-to-image/dist/html-to-image.js')), contentType: 'application/javascript' }));
  const calls = [];
  await ctx.route('https://discord.com/api/webhooks/**', async r => {
    const req = r.request(), body = req.postDataBuffer() || Buffer.from(''), txt = body.toString('latin1');
    const pj = txt.match(/name="payload_json"\r\n\r\n([\s\S]*?)\r\n--/);
    const payload = pj ? JSON.parse(Buffer.from(pj[1], 'latin1').toString('utf8')) : null;
    const i = body.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    if (payload && /année/.test(payload.embeds?.[0]?.title) && i > 0 && !fs.existsSync('/tmp/wrap-' + payload.username.split(' ')[0] + '.png'))
      fs.writeFileSync('/tmp/wrap-' + payload.username.split(' ')[0] + '.png', body.subarray(i, body.lastIndexOf(Buffer.from('\r\n--'))));
    calls.push({ method: req.method(), hook: req.url().match(/webhooks\/(\d+)/)[1], title: payload?.embeds?.[0]?.title, color: payload?.embeds?.[0]?.color, kb: Math.round(body.length / 1024) });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: String(100 + calls.length) }) });
  });
  const errs = [];
  const open = async (n, e, hash = '') => { const p = await ctx.newPage(); p.on('pageerror', x => errs.push(n + ': ' + x.message));
    await p.addInitScript(([a, c]) => { window.name = a; window.MOCK_EMAIL = c; }, [n, e]);
    await p.goto('http://localhost:8765/' + hash); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' }); return p; };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  const mockdb = async p => p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));

  // 15 novembre : chacun remplit une journée
  let nono = await open('n6', process.env.NONO_EMAIL);
  await nono.click('.discord-set summary'); await nono.fill('#discord-hook', 'https://discord.com/api/webhooks/111/salon-principal');
  await nono.click('#discord-save'); await nono.waitForTimeout(600);
  await nono.evaluate(() => go('viggo')); await nono.fill('#mood-viggo', 'Fatigué mais fier.'); await nono.dispatchEvent('#mood-viggo', 'input');
  await nono.click('[data-act="Entraînement"]'); await nono.click('#done-viggo'); await nono.waitForTimeout(2500);
  let jy = await open('j6', 'jynette@example.com');
  await jy.evaluate(() => go('khopses')); await jy.fill('#mood-khopses', 'Rayonnante.'); await jy.dispatchEvent('#mood-khopses', 'input');
  await jy.click('#done-khopses'); await jy.waitForTimeout(2500);
  console.log('Journées postées :', calls.filter(c => c.method === 'POST').map(c => c.title));
  console.log('Avant le 26, sans aperçu : bannière visible chez Jynette ?', (await jy.textContent('#view')).includes('revivait'), '| bouton test visible chez Nono ?', !!(await nono.$('#wrap-test-go')));
  await nono.close(); await jy.close();

  // Aperçu secret : test sur un autre salon (le salon principal est refusé)
  nono = await open('n6b', process.env.NONO_EMAIL, '#apercu-wrap');
  await nono.click('.discord-set summary');
  await nono.fill('#wrap-test-hook', 'https://discord.com/api/webhooks/111/salon-principal'); await nono.click('#wrap-test-go'); await nono.waitForTimeout(300);
  console.log('Test sur le salon principal :', await nono.textContent('#wrap-test-msg'));
  const before = calls.length;
  await nono.fill('#wrap-test-hook', 'https://discord.com/api/webhooks/999/salon-test'); await nono.click('#wrap-test-go');
  await nono.waitForSelector('#wrap-test-msg:has-text("Test terminé")', { timeout: 30000 });
  console.log('Test :', await nono.textContent('#wrap-test-msg'));
  console.log('  envois :', calls.slice(before).map(c => `${c.hook} ${c.title} (${c.kb} ko, couleur ${c.color?.toString(16)})`));
  console.log('  retour sur :', await nono.evaluate(() => current), '| verrou créé ?', 'shared/wraps-2026' in await mockdb(nono));
  await nono.close();

  // 26 décembre : la première ouverture envoie tout, la suivante rien
  await ctx.clock.setFixedTime(new Date('2026-12-26T10:00:00'));
  const b2 = calls.length;
  jy = await open('j6b', 'jynette@example.com'); await jy.waitForTimeout(2500);
  await jy.waitForFunction(() => !document.getElementById('wrap-sending'), null, { timeout: 30000 });
  console.log('26/12, Jynette ouvre :', calls.slice(b2).map(c => `${c.hook} ${c.title}`));
  console.log('  verrou :', JSON.stringify((await mockdb(jy))['shared/wraps-2026']));
  console.log('  page affichée ensuite :', await jy.evaluate(() => current), '| bannière :', (await jy.textContent('#view')).includes('revivait'));
  const b3 = calls.length;
  nono = await open('n6c', process.env.NONO_EMAIL); await nono.waitForTimeout(4000);
  console.log('26/12, Nono ouvre ensuite : nouveaux envois =', calls.length - b3);
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
