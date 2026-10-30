// Notifications push côté appli : bouton, autorisation, abonnement enregistré dans Firestore, désactivation.
// Le service de push du navigateur est simulé (aucun envoi réel).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/13.1.0/*', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.googleapis.com**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  const errs = [];
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => {
    window.name = 'n7'; window.MOCK_EMAIL = e;
    let perm = 'default', sub = null;
    Object.defineProperty(Notification, 'permission', { get: () => perm });
    Notification.requestPermission = async () => (perm = 'granted');
    PushManager.prototype.getSubscription = async () => sub;
    PushManager.prototype.subscribe = async o => (window.SUB_KEY_LEN = o.applicationServerKey.length, sub = {
      endpoint: 'https://web.push.apple.com/abc123', toJSON: () => ({ endpoint: 'https://web.push.apple.com/abc123', keys: { p256dh: 'k', auth: 'a' } }),
      unsubscribe: async () => { sub = null; return true; } });
  }, process.env.NONO_EMAIL);
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg'); await seed.evaluate(() => localStorage.removeItem('mockdb')); await seed.close();
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); await p.click('#login-btn'); await p.waitForSelector('#login[hidden]', { state: 'attached' });
  await p.waitForSelector('#push-on'); console.log('Avant :', (await p.textContent('.push-set')).trim());
  console.log('Service worker :', await p.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope));
  await p.click('#push-on'); await p.waitForSelector('#push-off');
  console.log('Après :', (await p.textContent('.push-set')).replace(/\s+/g, ' ').trim(), '| clé publique (octets) :', await p.evaluate(() => window.SUB_KEY_LEN));
  const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('mockdb')));
  console.log('En base :', Object.entries(await db()).filter(([k]) => k.startsWith('pushSubs/')).map(([k, v]) => k.replace(/subs\/\w+/, 'subs/…') + ' ' + v.endpoint));
  await p.click('#push-off'); await p.waitForSelector('#push-on');
  console.log('Désactivé, reste en base :', Object.keys(await db()).filter(k => k.startsWith('pushSubs/')).length);
  console.log('erreurs :', errs.length ? errs.join('\n') : 'aucune');
  await b.close();
})().catch(e => { console.error('ÉCHEC', e.message); process.exit(1); });
