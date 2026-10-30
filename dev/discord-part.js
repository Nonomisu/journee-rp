
// ---------- Discord : un embed par journée validée, avec l'image du récap ----------
// L'adresse du webhook n'est pas dans le code public : elle est rangée dans Firestore (shared/discord),
// lisible seulement par les deux joueurs. Un message par personnage et par jour ; revalider le même jour
// met à jour le message existant au lieu d'en poster un nouveau.
const APP_URL = 'https://nonomisu.github.io/journee-rp/';
const TEXT_GLYPH = { alamhigo:'◆', viggo:'▲', spectre:'✧', kha:'▼' };   // glyphes dessinés : équivalent texte pour Discord
const glyphText = t => TEXT_GLYPH[Object.keys(THEMES).find(k => THEMES[k] === t)] || (String(t.glyph).startsWith('<') ? '◆' : t.glyph);
const discordState = {};   // id → 'sending' | 'sent' | 'error'
const SLOT_ORDER = ['aube', 'matin', 'midi', 'aprem', 'soir', 'nuit'];
const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

// Embed : le nom du personnage et la date en titre (lien vers la fiche), puis l'image du récap.
// Bande de couleur : rose pour les personnages de Jynette, bleu pour ceux de Nono.
const PLAYER_COLOR = { elle: 0xe38fa8, corentin: 0x4f8fd6 };
const embedFor = id => {
  const c = C.find(x => x.id === id), t = THEMES[c.theme];
  return {
    title: `${glyphText(t)} ${c.name}${c.surname ? ' ' + c.surname : ''} — ${today}`,
    url: `${APP_URL}?fiche=${id}&jour=${isoDay(rpDay)}`,
    color: PLAYER_COLOR[c.player],
    image: { url: 'attachment://recap.png' },
  };
};
// Libellé d'activité avec ses précisions (chasse, contrat, visite…), comme dans le résumé.
const dispLabelOf = (id, l) => {
  const s = state[id];
  if (l === CONTRACT_ACT && activeContract(id)) return l + contractText(activeContract(id));
  if (s.details?.[l] && DETAIL_ACTS[l]) return `${l} : ${s.details[l]}`;
  const h = huntFor(id, l); if (h) return `${l} (${huntText(h)})`;
  return l;
};

const recapBlob = async () => {
  const card = document.querySelector('#view .recap'); if (!card) throw new Error('récap introuvable');
  const h2i = await loadH2I(); await document.fonts.ready;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#111';
  card.classList.add('capturing');
  try { return await h2i.toBlob(card, { pixelRatio: 2, backgroundColor: bg, cacheBust: true }); }
  finally { card.classList.remove('capturing'); }
};

const sendDiscord = async id => {
  const hook = window.RP_DISCORD.webhook;
  if (!hook || !owns(id) || !state[id].done) return;
  discordState[id] = 'sending'; if (current === id) rerender();
  try {
    await new Promise(r => setTimeout(r, 300));          // laisse le récap s'afficher
    const c = C.find(x => x.id === id);
    const blob = await recapBlob();
    const form = new FormData();
    const payload = { username: `${c.name} · Journée RP`, avatar_url: APP_URL + 'icon-512.png', embeds: [embedFor(id)],
      attachments: [{ id: 0, filename: 'recap.png' }] };
    form.append('payload_json', JSON.stringify(payload));
    form.append('files[0]', blob, 'recap.png');
    const prev = state[id].discordMsg;
    let res = prev ? await fetch(`${hook}/messages/${prev}`, { method: 'PATCH', body: form }) : null;
    if (!res || !res.ok) {
      const f2 = new FormData(); f2.append('payload_json', JSON.stringify(payload)); f2.append('files[0]', blob, 'recap.png');
      res = await fetch(`${hook}?wait=true`, { method: 'POST', body: f2 });
    }
    if (!res.ok) throw new Error('Discord ' + res.status);
    const msg = await res.json().catch(() => null);
    if (msg?.id) state[id].discordMsg = msg.id;
    discordState[id] = 'sent';
    window.RP_SYNC?.save();
  } catch (e) { console.error(e); discordState[id] = 'error'; }
  if (current === id) rerender();
};

window.RP_DISCORD = {
  webhook: null,
  send: id => sendDiscord(id),
  status: id => !window.RP_DISCORD.webhook ? '' : ({
    sending: ' · Envoi sur Discord…',
    sent: ' · Envoyé sur Discord',
    error: ' · Échec de l\'envoi sur Discord <button type="button" class="link" data-discord-retry="' + id + '">Réessayer</button>',
  })[discordState[id]] || (state[id].discordMsg ? ' · Envoyé sur Discord' : ''),
  // Réglage (Nono uniquement) : coller l'adresse du webhook du salon.
  settingsHtml: () => `<details class="discord-set"><summary>${icon('bell')}Discord ${window.RP_DISCORD.webhook ? '· relié ✓' : '· à relier'}</summary>
    <p class="reserved">Adresse du webhook du salon (Paramètres du salon → Intégrations → Webhooks → Copier l'URL du webhook).</p>
    <div class="special-row"><input type="url" id="discord-hook" placeholder="https://discord.com/api/webhooks/…" value="${window.RP_DISCORD.webhook ? '••••••••' : ''}">
    <button type="button" class="btn" id="discord-save">Enregistrer</button></div>
    <p class="reserved" id="discord-msg"></p></details>`,
};
document.addEventListener('click', async e => {
  const r = e.target.closest('[data-discord-retry]'); if (r) return sendDiscord(r.dataset.discordRetry);
  if (!e.target.closest('#discord-save')) return;
  const v = document.getElementById('discord-hook').value.trim(), msg = document.getElementById('discord-msg');
  if (!/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(v)) { msg.textContent = 'Cette adresse ne ressemble pas à un webhook Discord.'; return; }
  try {
    const t = await fetch(v); if (!t.ok) throw new Error();
    await window.RP_SYNC.setWebhook(v); window.RP_DISCORD.webhook = v;
    msg.textContent = 'Webhook enregistré : les prochaines journées validées partiront sur Discord.';
  } catch { msg.textContent = 'Discord ne reconnaît pas ce webhook. Vérifie l\'adresse copiée.'; }
});

// Lien direct depuis Discord : ?fiche=eoor&jour=AAAA-MM-JJ
const openFromLink = () => {
  try {
    const q = new URLSearchParams(location.search), id = q.get('fiche'), jour = q.get('jour');
    if (!id || !C.some(c => c.id === id)) return false;
    if (jour && jour !== isoDay(rpDay)) {
      const [y, m, d] = jour.split('-').map(Number);
      Object.assign(state[id], { view: 'history', cal: { y, m: m - 1 }, calSel: new Date(y, m - 1, d) });
    }
    history.replaceState(null, '', location.pathname + location.hash);
    go(id); return true;
  } catch { return false; }
};

// ---------- Wraps de l'année : envoyés une seule fois, à la première ouverture de l'appli à partir du 26 décembre ----------
// Chaque wrap est affiché comme dans l'onglet Historique, converti en image et posté sur le webhook du salon.
// Un verrou dans Firestore (shared/wraps-AAAA) empêche les deux appareils de les envoyer en double ;
// s'il est interrompu (appli fermée), le prochain lancement reprend où il s'était arrêté, 10 minutes plus tard.
// Test : avec l'aperçu secret (#apercu-wrap), Nono peut les envoyer sur un autre salon, sans toucher au verrou.
const wrapDayReal = () => (rpDay.getMonth() === 11 && rpDay.getDate() >= 26) || (rpDay.getMonth() === 0 && rpDay.getDate() <= 9);
const pause = ms => new Promise(r => setTimeout(r, ms));
const secretPreview = () => { try { return location.hash === '#apercu-wrap'; } catch { return false; } };
const HOOK_RE = /^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

// Écran affiché pendant l'envoi (les fiches défilent derrière pour être photographiées).
const wrapOverlay = txt => {
  let o = document.getElementById('wrap-sending');
  if (txt == null) { o?.remove(); return; }
  if (!o) {
    o = document.createElement('div'); o.id = 'wrap-sending';
    o.style.cssText = 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:2rem;text-align:center;background:#14161c;color:#d4af6a;font:500 1.05rem/1.5 Georgia,serif';
    document.body.appendChild(o);
  }
  o.textContent = txt;
};
const wrapBlob = async ratio => {
  const card = document.querySelector('#view article.wrap'); if (!card) throw new Error('wrap introuvable');
  const h2i = await loadH2I(); await document.fonts.ready;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#111';
  return h2i.toBlob(card, { pixelRatio: ratio, backgroundColor: bg, cacheBust: true });
};
// Envoi d'un message avec image ; respecte la limite de débit de Discord (code 429).
const postHook = async (hook, payload, blob, name) => {
  for (let i = 0; i < 5; i++) {
    const f = new FormData(); f.append('payload_json', JSON.stringify(payload)); f.append('files[0]', blob, name);
    const res = await fetch(`${hook}?wait=true`, { method: 'POST', body: f });
    if (res.status === 429) { const j = await res.json().catch(() => ({})); await pause((j.retry_after || 2) * 1000 + 300); continue; }
    if (!res.ok) throw new Error('Discord ' + res.status);
    return (await res.json().catch(() => null))?.id || 'ok';
  }
  throw new Error('Discord : trop de requêtes');
};

const sendWraps = async ({ hook, sent = {}, test = false }) => {
  const y = wrapYear(), back = { current, sim: simulateWrapDay, st: {} };
  const label = test ? 'Test des wraps' : `Les wraps ${y} partent sur Discord`;
  wrapOverlay(label + '…');
  try {
    if (window.RP_SYNC) await RP_SYNC.loadYear(y);
    Object.keys(hotDuoCache).forEach(k => delete hotDuoCache[k]);
    const days = Array.from({ length: 366 }, (_, i) => new Date(y, 0, 1 + i)).filter(d => d.getFullYear() === y);
    const list = C.filter(c => statsFor(c, days).filled > 0);   // seulement les personnages qui ont vécu cette année
    simulateWrapDay = true;                                     // le test peut avoir lieu avant le 26 décembre
    let n = 0;
    for (const c of list) {
      n++;
      if (sent[c.id]) continue;
      wrapOverlay(`${label}… ${n} / ${list.length}`);
      back.st[c.id] = { view: state[c.id].view, wrap: state[c.id].wrap };
      Object.assign(state[c.id], { view: 'history', wrap: true });
      go(c.id); await pause(600);
      let blob = await wrapBlob(2);
      if (blob.size > 9.5e6) blob = await wrapBlob(1.2);          // limite de Discord : 10 Mo par fichier
      const payload = { username: `${c.name} · Journée RP`, avatar_url: APP_URL + 'icon-512.png',
        embeds: [{ title: `${test ? '[Test] ' : ''}${glyphText(THEMES[c.theme])} ${c.name}${c.surname ? ' ' + c.surname : ''} — L'année ${y}`,
          url: `${APP_URL}?fiche=${c.id}`, color: PLAYER_COLOR[c.player], image: { url: 'attachment://wrap.png' } }],
        attachments: [{ id: 0, filename: 'wrap.png' }] };
      const msg = await postHook(hook, payload, blob, 'wrap.png');
      if (!test) await RP_SYNC.wrapSent(y, c.id, msg);
      await pause(1200);
    }
    return list.length;
  } finally {
    simulateWrapDay = back.sim;
    Object.entries(back.st).forEach(([id, v]) => Object.assign(state[id], v));
    go(back.current); wrapOverlay(null);
  }
};

let wrapsRunning = false;
const autoWraps = async () => {
  const hook = window.RP_DISCORD.webhook;
  if (wrapsRunning || !hook || !wrapDayReal() || !window.RP_SYNC?.wrapClaim) return;
  wrapsRunning = true;
  try {
    const y = wrapYear(), sent = await RP_SYNC.wrapClaim(y);
    if (!sent) return;                       // déjà envoyés, ou envoi en cours sur l'autre appareil
    await sendWraps({ hook, sent });
    await RP_SYNC.wrapDone(y);
  } catch (e) { console.error('Wraps :', e); }
  finally { wrapsRunning = false; }
};
window.RP_DISCORD.autoWraps = autoWraps;

// Aperçu secret seulement : bouton de test dans le réglage Discord (en bas de l'accueil).
const baseSettings = window.RP_DISCORD.settingsHtml;
window.RP_DISCORD.settingsHtml = () => !secretPreview() ? baseSettings() : baseSettings().replace(/<\/details>$/, `
    <p class="reserved">Aperçu secret — tester l'envoi des wraps sur un <b>autre</b> salon, que Jynette ne voit pas :</p>
    <div class="special-row"><input type="url" id="wrap-test-hook" placeholder="Webhook du salon de test">
    <button type="button" class="btn" id="wrap-test-go">Tester</button></div>
    <p class="reserved" id="wrap-test-msg"></p></details>`);
document.addEventListener('click', async e => {
  if (!e.target.closest('#wrap-test-go')) return;
  const v = document.getElementById('wrap-test-hook').value.trim();
  const say = t => { document.querySelector('.discord-set')?.setAttribute('open', ''); const m = document.getElementById('wrap-test-msg'); if (m) m.textContent = t; };
  if (!HOOK_RE.test(v)) return say('Cette adresse ne ressemble pas à un webhook Discord.');
  if (v === window.RP_DISCORD.webhook) return say('C\'est le webhook du salon principal : utilise un salon de test, sinon la surprise est gâchée.');
  try { const n = await sendWraps({ hook: v, test: true }); say(`Test terminé : ${n} wrap${n > 1 ? 's' : ''} envoyé${n > 1 ? 's' : ''} sur le salon de test.`); }
  catch (err) { console.error(err); say('Échec du test : ' + err.message); }
});
