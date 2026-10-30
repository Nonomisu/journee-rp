const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const MOCK = path.join(__dirname, 'mockfb');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(MOCK, r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (name, email, shot) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.addInitScript(([n, e]) => { window.name = n; window.MOCK_EMAIL = e; }, [name, email]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400);
    if (shot) await p.screenshot({ path: shot });
    await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached', timeout: 5000 });
    return p;
  };
  const nono = await open('nono2', process.env.NONO_EMAIL, 'login.png');
  await nono.evaluate(() => localStorage.removeItem('mockdb'));   // base vide
  await nono.reload(); await nono.waitForTimeout(800);
  await nono.screenshot({ path: 'home.png' });
  // Historique : on injecte une journée passée d'Eoor directement dans la base
  await nono.evaluate(() => { const db = JSON.parse(localStorage.getItem('mockdb')); const ym = RP_APP.ym; const p = `days/eoor/months/${ym}`;
    db[p] = { ...(db[p] || {}), '3': { mood: 'Journée au Bazar', checked: { $set: ['Permanence au Grand Bazar'] }, places: { $set: ['Grand Bazar'] }, region: 'eorzea', done: true, night: { hot: true, with: 'yasmeen' } } };
    localStorage.setItem('mockdb', JSON.stringify(db)); });
  await nono.reload(); await nono.waitForTimeout(800);
  await nono.evaluate(() => { go('eoor'); state.eoor.view = 'history'; state.eoor.calSel = new Date(rpDay.getFullYear(), rpDay.getMonth(), 3); renderChar('eoor'); });
  await nono.waitForTimeout(300);
  console.log('Historique :', (await nono.textContent('#view')).replace(/\s+/g, ' ').match(/3 octobre.{0,140}/)?.[0]);
  console.log('Récap du mois :', (await nono.textContent('#view')).replace(/\s+/g, ' ').match(/Journées remplies.{0,60}/)?.[0]);
  // Echo rentre tard -> Prism voit le bloc
  await nono.evaluate(() => { state.eoor.view = 'day'; go('echo'); }); await nono.waitForTimeout(200);
  await nono.click('#dj-set-echo'); await nono.waitForTimeout(200); await nono.click('#dj-late-echo'); await nono.waitForTimeout(1500);
  const jy = await open('jy2', 'jynette@example.com');
  await jy.evaluate(() => go('prism')); await jy.waitForTimeout(300);
  console.log('Prism voit :', (await jy.textContent('#view')).replace(/\s+/g, ' ').match(/Echo rentre tard.{0,80}/)?.[0]);
  await jy.click('[data-wait="rale"]'); await jy.waitForTimeout(1500);
  await nono.evaluate(() => go('home')); await nono.waitForTimeout(400);
  console.log('Nono reçoit :', (await nono.textContent('#view')).replace(/\s+/g, ' ').match(/Nouvelles.{0,90}/)?.[0]);
  console.log('Session :', await nono.textContent('.session'));
  // Lecture seule : Jynette ne peut pas modifier Echo
  await jy.evaluate(() => go('echo')); await jy.waitForTimeout(200);
  console.log('Jynette sur Echo :', (await jy.textContent('#view')).replace(/\s+/g, ' ').match(/lecture seule/)?.[0]);
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
