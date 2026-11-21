// L'Iloh depuis Journée RP : activités communes de l'Iloh à ajouter, événement du jour (participer, proposer),
// « J'y participe aussi » (demander, recevoir, accepter), ajout accepté sans tirage, boîte / logistique de Javkhaanhun et Khokkutsai.
// Usage : NONO_EMAIL=… node dev/tests/e2e38.js [largeur]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const W = +(process.argv[2] || 420);
const ok = (c, l) => { console.log((c ? '  ok  ' : '  ÉCHEC ') + l); if (!c) process.exitCode = 1; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.fulfill({ body: fs.readFileSync(path.join(__dirname, 'mockfb', r.request().url().split('/').pop())), contentType: 'application/javascript' }));
  await ctx.route('**fonts.g*.com**', r => r.fulfill({ body: '' }));
  await ctx.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ body: 'window.htmlToImage={toBlob:async()=>new Blob(["png"])};', contentType: 'application/javascript' }));
  const calls = []; await ctx.route('https://discord.test/**', r => { calls.push(r.request().method()); r.fulfill({ status: 200, contentType: 'application/json', body: '{"id":"m1"}' }); });
  const errs = [];
  const rp = new Date(Date.now() - 5 * 3600e3), pad = n => String(n).padStart(2, '0'), iso = `${rp.getFullYear()}-${pad(rp.getMonth() + 1)}-${pad(rp.getDate())}`;
  const live = { iso, at: 1, names: { boroo: 'Boroo', reaksa: 'Reaksa', buyan: 'Buyan' }, players: { idriss: 'Idriss', eden: 'Eden' }, ops: {}, todo: { mail: 2, logi: 1 },
    events: [{ id: 'e1', type: 'ceremonie', label: 'Cérémonie', text: 'Grandes Funérailles', date: iso, daily: true, by: 'Lou', going: [], acts: [{ id: 'a1', text: 'Apporter les fleurs', by: 'boroo', who: ['boroo'] }] },
      { id: 'e2', type: 'fete', label: 'Fête ou rassemblement', text: 'Fête du feu', date: iso, daily: false, by: 'Eden', going: ['buyan'], acts: [] }],
    shared: { tamachag: [{ kind: 'with', from: 'boroo', act: 'Chasse en groupe', others: ['reaksa'], slots: ['matin'] }] },
    fiches: { boroo: { player: 'idriss', acts: [{ act: 'Cuisine', with: [], slots: ['soir'] }] }, taiga: { player: 'jynette', acts: [{ act: 'Tannage', with: [], slots: [] }] }, khokkutsai: { player: 'nono', acts: [{ act: 'Pêche', with: [] }] } },
    joins: [{ id: 'jr', host: 'tamachag', act: 'Course de chevaux', chars: ['boroo'], p: 'idriss', status: 'asked', applied: false, via: null }] };
  const seed = await ctx.newPage(); await seed.goto('http://localhost:8765/icon.svg');
  await seed.evaluate(([iso, live]) => { localStorage.removeItem('mockdb'); localStorage.setItem('mockdb', JSON.stringify({ ['iloh/_live/months/' + iso]: live })); }, [iso, live]); await seed.close();
  const p = await ctx.newPage(); p.on('pageerror', x => errs.push(x.message));
  await p.addInitScript(e => { window.name = 'f1'; window.MOCK_EMAIL = e; }, process.env.NONO_EMAIL);
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(400); if (await p.isVisible('#login-btn')) await p.click('#login-btn'); await p.waitForTimeout(1500);
  const setLive = f => p.evaluate(([iso, f]) => { const db = JSON.parse(localStorage.getItem('mockdb')); const L = db['iloh/_live/months/' + iso]; new Function('L', f)(L);
    localStorage.setItem('mockdb', JSON.stringify(db)); window.dispatchEvent(new StorageEvent('storage', { key: 'mockdb' })); }, [iso, f]);
  const wide = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await p.evaluate(() => { RP_DISCORD.webhooks = { corentin: 'https://discord.test/hook' }; state.tamachag.mood ||= 'Calme'; state.tamachag.checked.add('Course de chevaux'); go('tamachag'); });
  await p.waitForTimeout(300);
  console.log('Bloc « Iloh Khurdan » sur la fiche de Tamachag');
  ok(await p.locator('.iloh-live').count() === 1, 'bloc présent sur une fiche recopiée');
  ok(await p.evaluate(() => { go('eoor'); const n = document.querySelectorAll('.iloh-live').length; go('tamachag'); return n === 0; }), 'absent des fiches non recopiées');
  ok((await p.textContent('.iloh-shared')).includes('Boroo a noté « Chasse en groupe » avec Tamachag et Reaksa'), 'activité commune notée dans l\'Iloh');
  await p.click('[data-iloh-add="0"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => { const s = state.tamachag; return s.checked.has('Chasse en groupe') && s.withFrom['Chasse en groupe'] === 'boroo' && JSON.stringify(s.withActs['Chasse en groupe']) === '["boroo","reaksa"]' && JSON.stringify(s.slots['Chasse en groupe']) === '["matin"]'; }), 'ajoutée à la fiche (avec Boroo et Reaksa, même moment)');
  ok((await p.textContent('.iloh-shared')).includes('✓ Sur la fiche'), '« ✓ Sur la fiche »');

  console.log('Événements de l\'Iloh');
  ok((await p.textContent('.iloh-events')).includes('Événement du jour · Cérémonie') && (await p.textContent('.iloh-events')).includes('Apporter les fleurs'), 'événement du jour et ses actions');
  await p.click('[data-iloh-who="e1:a1"]'); await p.waitForTimeout(300);
  let ops = await p.evaluate(() => Object.entries(state.tamachag.ilohOps || {}));
  ok(ops.some(([, o]) => o.op === 'evdayWho' && o.ev === 'e1' && o.aid === 'a1' && o.on === true && o.day), 'geste noté sur la fiche (rejoindre l\'action)');
  ok((await p.textContent('.iloh-events')).includes('envoi…') && (await p.textContent('.iloh-events')).includes('✓ Tamachag y participe'), 'affiché tout de suite, en attente');
  await p.fill('[data-iloh-text="e1"]', 'Nettoyer la yourte'); await p.press('[data-iloh-text="e1"]', 'Enter'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.values(state.tamachag.ilohOps).some(o => o.op === 'evdayAct' && o.text === 'Nettoyer la yourte')), 'action proposée');
  await p.click('[data-iloh-go="e2"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.values(state.tamachag.ilohOps).some(o => o.op === 'evGo' && o.ev === 'e2' && o.on)), 'participer à la fête');
  // Le service traite les gestes : résultats et nouvel état dans le résumé.
  const ids = await p.evaluate(() => Object.keys(state.tamachag.ilohOps));
  await setLive(`${JSON.stringify(ids)}.forEach(k => L.ops[k] = 'ok'); L.events[0].acts[0].who.push('tamachag'); L.events[0].acts.push({ id: 'a2', text: 'Nettoyer la yourte', by: 'tamachag', who: ['tamachag'] }); L.events[1].going.push('tamachag');`);
  await p.waitForTimeout(800);
  ok(!(await p.textContent('.iloh-events')).includes('envoi…') && (await p.textContent('.iloh-events')).includes('proposée par Tamachag'), 'gestes traités : plus en attente');

  console.log('« J\'y participe aussi » et demandes reçues');
  ok(await p.locator('[data-iloh-jask="khokkutsai"]').count() === 0 && await p.locator('[data-iloh-jask="taiga"]').count() === 1, 'fiches des autres joueurs seulement');
  await p.evaluate(() => { document.querySelector('.iloh-join').open = true; });
  await p.click('[data-iloh-jask="boroo"]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => Object.values(state.tamachag.ilohOps).some(o => o.op === 'joinAsk' && o.host === 'boroo' && o.act === 'Cuisine')), 'demande notée (Cuisine de Boroo)');
  ok((await p.textContent('.iloh-join')).includes('en attente'), 'en attente');
  ok((await p.textContent('.iloh-recv')).includes('Idriss : Boroo a aussi participé à « Course de chevaux »'), 'demande reçue de Boroo');
  await p.evaluate(() => { state.tamachag.done = true; renderChar('tamachag'); }); await p.waitForTimeout(200); calls.length = 0;
  await p.click('[data-iloh-jok="jr"]'); await p.waitForTimeout(2000);
  ok(await p.evaluate(() => state.tamachag.done && state.tamachag.withActs['Course de chevaux']?.includes('boroo') && Object.values(state.tamachag.ilohOps).some(o => o.op === 'joinAnswer' && o.jid === 'jr' && o.ok)), 'acceptée : Boroo ajouté, fiche toujours validée, réponse transmise');
  ok(calls.length >= 1, 'fiche republiée sur Discord');
  ok(!(await p.locator('[data-iloh-jok="jr"]').count()), 'plus de bouton une fois répondu');

  console.log('Demande acceptée : ajout sur la fiche, sans tirage');
  const jk = await p.evaluate(() => Object.entries(state.tamachag.ilohOps).find(([, o]) => o.op === 'joinAsk')[0]);
  await p.evaluate(() => { state.tamachag.checked.delete('Chasse en groupe'); delete state.tamachag.withFrom['Chasse en groupe']; delete state.tamachag.withActs['Chasse en groupe']; });
  await setLive(`L.ops['${jk}'] = 'ok'; L.joins.push({ id: 'jj', host: 'boroo', act: 'Chasse en groupe', chars: ['tamachag'], p: 'nono', status: 'ok', applied: false, via: 'jrp' }); L.fiches.boroo.acts.push({ act: 'Chasse en groupe', with: ['tamachag'], slots: ['aube'] });`);
  await p.waitForTimeout(800);
  ok(await p.evaluate(() => state.tamachag.checked.has('Chasse en groupe') && state.tamachag.joinedOf?.['Chasse en groupe'] === 'boroo' && JSON.stringify(state.tamachag.slots['Chasse en groupe']) === '["matin"]' && huntFor('tamachag', 'Chasse en groupe') === null), 'Chasse en groupe ajoutée, sans tirage (prise sur la fiche de Boroo)');
  ok(await p.evaluate(() => Object.values(state.tamachag.ilohOps).some(o => o.op === 'joinApplied' && o.jid === 'jj')), 'ajout signalé au service');

  console.log('Javkhaanhun et Khokkutsai');
  await p.evaluate(() => go('khokkutsai')); await p.waitForTimeout(300);
  ok((await p.textContent('.iloh-todo')).includes('1 demande de logistique') && await p.locator('.iloh-todo a[href$="?logistique"]').count() === 1, 'Khokkutsai : demandes de logistique, lien direct');
  ok(await wide(), 'pas de débordement horizontal');
  await p.evaluate(() => go('tamachag')); await p.waitForTimeout(300);
  ok(await wide(), 'pas de débordement horizontal (Tamachag)');
  if (process.env.SHOT) await p.locator('.iloh-live').first().screenshot({ path: process.env.SHOT });
  ok(!errs.length, 'aucune erreur JS ' + errs.join(' | '));
  await b.close(); })();
