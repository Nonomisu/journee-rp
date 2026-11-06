
// ---------- Persistance : ce que sync.js lit et enregistre dans Firestore ----------
// Journée d'un personnage (champs enregistrés ; le reste de state[id] ne sert qu'à l'affichage).
const ENTRY_KEYS = ['mood', 'checked', 'specials', 'slots', 'places', 'region', 'zone', 'trip', 'done', 'doneAt', 'phys', 'physNote',
  'details', 'mental', 'stateNotes', 'nightStates', 'nightNote', 'nightNotes', 'intime', 'intimeWith', 'huntSet', 'faits', 'dayEvents', 'infos', 'violet', 'jais', 'set', 'setLate', 'lateAt', 'wait', 'door', 'callPartner', 'returnHour', 'contractOff', 'discordMsg', 'hideIloh'];
const freshEntry = () => ({ mood:'', checked:new Set(), specials:[], slots:{}, places:new Set(), done:false, phys:new Set(), mental:new Set(), stateNotes:{}, nightStates:new Set() });
// Firestore ne connaît ni les Set ni les Date : on les encode.
const enc = v => v instanceof Set ? { $set: [...v].map(enc) } : v instanceof Date ? { $date: v.toISOString() }
  : Array.isArray(v) ? v.map(enc)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)]))
  : v === undefined ? null : v;
const dec = v => Array.isArray(v) ? v.map(dec)
  : v && typeof v === 'object' ? (Array.isArray(v.$set) ? new Set(v.$set.map(dec)) : typeof v.$date === 'string' ? new Date(v.$date)
    : typeof v.toDate === 'function' ? v.toDate() : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, dec(x)])))
  : v;
const replaceObj = (target, src) => { Object.keys(target).forEach(k => delete target[k]); Object.assign(target, src || {}); };
const replaceArr = (target, src) => { target.length = 0; (src || []).forEach(x => target.push(x)); };
const owns = id => C.find(c => c.id === id)?.player === me;
// Activités et lieux privés : jamais copiés dans l'encart public « Aujourd'hui » des fiches.
const isPrivateAct = a => /^Sexe avec /.test(a) || a === 'Plaisir en solo sur Moonstone';

const entryOf = id => {
  const s = state[id], o = {};
  ENTRY_KEYS.forEach(k => { if (s[k] !== undefined) o[k] = s[k]; });
  const n = nightOf(id);
  o.night = { hot: !!n.hot, with: n.hot ? (n.with || null) : null };   // pour l'historique
  if (FILM_PAIR.includes(id)) o.film = isFilmed(id);
  o.rp = rpPlayed[id] || null;
  o.calmWith = calmBy[id]?.with || null;
  if (id === NEF.host || id === NEF.partner) o.nefaste = nefText() || null;   // présence néfaste (texte, pour l'historique)                              // nuit calme : avec qui                                        // journée jouée en RP (et avec qui)                  // vidéo publiée (wrap d'Echo et Prism)
  return enc(o);
};
const isEmptyVal = v => v === '' || v === false || v === null || v === undefined || (Array.isArray(v) && !v.length)
  || (v && typeof v === 'object' && (Array.isArray(v.$set) ? !v.$set.length : !Object.keys(v).length));
const meaningful = e => !!e && (e.night?.hot || Object.entries(e).some(([k, v]) => k !== 'night' && !isEmptyVal(v)));
const applyEntry = (id, e) => {
  const s = state[id];
  ENTRY_KEYS.forEach(k => delete s[k]);
  const d = dec(e || {}); delete d.night; delete d.film; delete d.rp; delete d.calmWith; delete d.nefaste;
  Object.assign(s, freshEntry(), d);
  // Anciennes fiches : le moral était rangé avec l'état physique.
  MORAL.forEach(m => { if (s.phys?.has?.(m)) { s.phys.delete(m); s.mental.add(m); } });
};
const charDocOf = c => enc({ addedActs: c.addedActs || [], removedActs: [...(c.removedActs || [])],
  addedRegions: [...(c.added || [])], customPlaces: c.customPlaces || [], customCats: c.customCats || [], actCat: c.actCat || {}, catNames: c.catNames || {} });
const applyChar = (c, d) => {
  if (!d) return;
  (d.addedActs || []).forEach(a => { if (!allActs(c).includes(a)) (c.acts.quotidien ||= []).push(a); });
  c.addedActs = [...(d.addedActs || [])];
  c.removedActs = new Set(d.removedActs || []);
  (d.addedRegions || []).forEach(r => { if (REGIONS[r] && !c.regions.includes(r)) { c.regions = REGION_ORDER.filter(x => x === r || c.regions.includes(x)); (c.added ||= new Set()).add(r); } });
  c.customPlaces = [...(d.customPlaces || [])];
  c.customPlaces.forEach(p => { PLACE_REGION[p.name] ||= p.region; if (p.zone) ZONE_OF[p.name] ||= p.zone; if (!c.places.includes(p.name)) c.places.push(p.name); });
  c.customCats = [...(d.customCats || [])]; c.actCat = { ...(d.actCat || {}) }; c.catNames = { ...(d.catNames || {}) }; applyActLayout(c);
};
const globalOf = () => enc({ lovers: LOVERS, protect: lastProtect, alerts, events: EVENTS, arcs: ARCS, arcSeq,
  milestones: MILESTONES, contracts: CONTRACTS, workdays: WORKDAYS, hideIloh: ILOH_HIDE_ALWAYS });
const applyGlobal = g => {
  const d = dec(g || {});
  if ('lovers' in d) replaceObj(LOVERS, d.lovers);
  if ('protect' in d) replaceObj(lastProtect, d.protect);
  if ('alerts' in d) replaceObj(alerts, d.alerts);
  if ('events' in d) replaceArr(EVENTS, d.events);
  if ('arcs' in d) replaceObj(ARCS, d.arcs);
  if ('arcSeq' in d) arcSeq = Math.max(arcSeq, d.arcSeq || 1);
  if ('milestones' in d) replaceObj(MILESTONES, d.milestones);
  if ('contracts' in d) replaceObj(CONTRACTS, d.contracts);
  if ('workdays' in d) { replaceObj(WORKDAYS, d.workdays); WORKDAYS.khopses ||= new Set(); }
  if ('hideIloh' in d) replaceObj(ILOH_HIDE_ALWAYS, d.hideIloh);
};
const dayOf = () => enc({ nights: nightsBy, calm: calmBy, nefaste, filmed, weather: weatherOn, rp: rpPlayed,
  protect: Object.fromEntries(C.map(c => [c.id, !!state[c.id].protect])),
  shell: Object.fromEntries(C.map(c => [c.id, !!state[c.id].shell])) });
// Heure de création d'une nouvelle venue de Firestore (horodatage serveur, ou texte ISO dans les tests).
const newsAt = n => n.createdAt?.toMillis?.() ?? (n.createdAt ? Date.parse(n.createdAt) : null);
const applyDay = g => {
  const d = dec(g || {});
  if ('nights' in d) replaceObj(nightsBy, d.nights);
  if ('filmed' in d) replaceObj(filmed, d.filmed);
  if ('rp' in d) replaceObj(rpPlayed, d.rp);
  if ('nefaste' in d) Object.assign(nefaste, { on: false, ctx: [], host: [], inj: true }, d.nefaste);
  if ('calm' in d) { const was = new Set(Object.keys(calmBy)); replaceObj(calmBy, d.calm); C.forEach(c => { if (calmBy[c.id] || was.has(c.id)) syncCalmState(c.id); }); }
  if ('weather' in d) replaceObj(weatherOn, d.weather);
  if (d.protect) C.forEach(c => { if (c.id in d.protect) state[c.id].protect = !!d.protect[c.id]; });
  if (d.shell) C.forEach(c => { if (c.id in d.shell) state[c.id].shell = !!d.shell[c.id]; });
};
// Encart public « Aujourd'hui » : humeur, activités publiques et lieu, seulement une fois la journée validée.
const todayOf = id => {
  const s = state[id]; if (!s.done) return null;
  const place = [...s.places].find(pl => !PRIVATE_PLACES[pl]) || (s.zone && zoneOf(s)?.label) || (s.region && REGIONS[s.region]?.label) || '';
  return { mood: s.mood || '', activities: [...s.checked].filter(a => !isPrivateAct(a)), place };
};
const dayNum = String(rpDay.getDate());
const curYm = `${rpDay.getFullYear()}-${String(rpDay.getMonth() + 1).padStart(2, '0')}`;
let typingDirty = false;
// Données reçues de l'autre joueur : réaffichage, sauf pendant une saisie de texte (repris quand on quitte le champ).
// Une case à cocher ou un bouton qui garde le focus (Firefox) ne bloque pas le réaffichage.
const isTyping = f => f && document.getElementById('view').contains(f)
  && (f.tagName === 'TEXTAREA' || f.tagName === 'SELECT' || (f.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|color)$/.test(f.type)));
let pointerDown = false;
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; if (typingDirty) setTimeout(rerender, 0); }, true);
const rerender = () => {
  if (isTyping(document.activeElement)) { typingDirty = true; return; }
  // Jamais entre l'appui et le relâchement : la fiche serait remplacée sous le pointeur et le clic tomberait à côté.
  if (pointerDown) { typingDirty = true; return; }
  typingDirty = false; renderNav(); current === 'home' ? renderHome() : renderChar(current);
};
document.addEventListener('focusout', () => setTimeout(() => { if (typingDirty && !pointerDown) rerender(); }, 0));

window.RP_APP = {
  ids: C.map(c => c.id),
  owned: () => C.filter(c => c.player === me).map(c => c.id),
  setMe: m => { me = m; },
  iso: isoDay(rpDay), ym: curYm, day: dayNum,
  meaningful,
  hydrate: ({ global, day, chars, news }) => {
    applyGlobal(global); applyDay(day);
    C.forEach(c => applyChar(c, chars[c.id]));
    replaceArr(NEWS, (news || []).map(n => ({ to: n.to, text: n.text, charId: n.charId, key: n.key, read: !!n.read, at: newsAt(n) })));
  },
  // data : { '30': entrée, … } d'un document days/{id}/months/{AAAA-MM}
  applyMonth: (id, ym, data, withToday) => {
    const [y, m] = ym.split('-').map(Number);
    const h = HISTORY[id] ||= {};
    Object.entries(data || {}).forEach(([d, e]) => { h[`${y}-${m}-${+d}`] = dec(e); });
    if (withToday && ym === curYm && data?.[dayNum]) applyEntry(id, data[dayNum]);
  },
  applyGlobal, applyDay,
  applyNews: list => {
    list.forEach(n => {
      const x = NEWS.find(o => o.key === n.key);
      if (x) x.read = !!n.read; else NEWS.unshift({ to: n.to, text: n.text, charId: n.charId, key: n.key, read: !!n.read, at: newsAt(n) || Date.now() });
    });
  },
  snapshot: () => {
    const mine = C.filter(c => c.player === me);
    return {
      global: globalOf(), day: dayOf(),
      entries: Object.fromEntries(mine.map(c => [c.id, entryOf(c.id)])),
      chars: Object.fromEntries(mine.map(c => [c.id, charDocOf(c)])),
      today: Object.fromEntries(mine.map(c => [c.id, todayOf(c.id)])),
      news: NEWS.filter(newsReady).map(n => ({ to: n.to, text: n.text, charId: n.charId, key: n.key, read: !!n.read })),
    };
  },
  rerender,
  start: () => { if (!openFromLink()) go('home'); },
};
