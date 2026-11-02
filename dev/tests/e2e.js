const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const MOCK = path.join(__dirname, 'mockfb');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(MOCK, r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const open = async (name, email) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(name + ' console: ' + m.text()); });
    await p.addInitScript(([n, e]) => { try { localStorage.setItem('rp-night-open', JSON.stringify(['eoor','unegen','yasmeen','hokkyoku','tamachag','khokkutsai','ankhbayar','tengis','taiga','khubunjin','inkaraa','ogloo','javkhaanhun','davaajav','viggo','khopses','echo','prism'].flatMap(i => [i + ':data-next-night', i + ':data-prev-night']))); } catch {} window.name = n; window.MOCK_EMAIL = e; }, [name, email]);
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(400);
    await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached', timeout: 5000 });
    return p;
  };
  const nono = await open('nono', process.env.NONO_EMAIL);
  console.log('Nono session :', await nono.textContent('.session'));
  // Nono remplit la journée d'Eoor
  await nono.click('#card-eoor'); await nono.waitForTimeout(200);
  await nono.fill('#mood-eoor', 'Calme et concentré.');
  await nono.dispatchEvent('#mood-eoor', 'input');
  await nono.click('[data-act="Session hammam"]');
  await nono.waitForTimeout(1200);
  await nono.click('#done-eoor'); await nono.waitForTimeout(1200);
  const db = () => nono.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  let d = await db();
  console.log('docs :', Object.keys(d).sort().join(' | '));
  const ym = await nono.evaluate(() => RP_APP.ym), day = await nono.evaluate(() => RP_APP.day);
  console.log('entrée Eoor :', JSON.stringify(d[`days/eoor/months/${ym}`]?.[day]).slice(0, 200));
  console.log('today/eoor :', JSON.stringify(d['today/eoor']));
  // Jynette se connecte
  const jy = await open('jy', 'jynette@example.com');
  console.log('Jynette session :', await jy.textContent('.session'));
  await jy.click('#card-eoor'); await jy.waitForTimeout(300);
  console.log('Jynette voit Eoor :', (await jy.textContent('#view')).replace(/\s+/g, ' ').match(/Calme et concentré.{0,60}/)?.[0]);
  // Jynette : Khopses avec un client -> nouvelle pour Nono
  await jy.click('[data-go="khopses"]').catch(()=>{}); await jy.evaluate(() => go('khopses')); await jy.waitForTimeout(200);
  await jy.click('#hot-khopses'); await jy.waitForTimeout(200);
  await jy.click('[data-with="client"]'); await jy.waitForTimeout(1500);
  d = await db();
  console.log('news :', Object.entries(d).filter(([k]) => k.startsWith('news/')).map(([k, v]) => v.to + ' ← ' + v.text.slice(0, 50)).join(' / '));
  await nono.evaluate(() => go('home')); await nono.waitForTimeout(300);
  console.log('Nono reçoit :', (await nono.textContent('#view')).replace(/\s+/g, ' ').match(/Nouvelles.{0,120}/)?.[0]);
  console.log('nuit chez Nono (Viggo) :', await nono.evaluate(() => JSON.stringify(nightOf('khopses'))));
  // Rechargement : persistance
  await nono.reload(); await nono.waitForTimeout(1200);
  console.log('après rechargement, Eoor :', await nono.evaluate(() => JSON.stringify({ mood: state.eoor.mood, done: state.eoor.done, acts: [...state.eoor.checked] })));
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
