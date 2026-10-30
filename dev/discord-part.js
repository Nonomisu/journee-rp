
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
