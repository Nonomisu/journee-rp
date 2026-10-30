// Journée RP — connexion Google et synchronisation avec Firestore.
// app.js (chargé avant) expose window.RP_APP ; ce module charge les données, lance l'appli,
// enregistre les changements et applique ceux de l'autre joueur en direct.
import { firebaseConfig, FIREBASE_SDK } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { initializeFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot,
  FieldPath, deleteField, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';

void FIREBASE_SDK;
// Empreinte SHA-256 de l'adresse de Nono (l'adresse elle-même ne figure pas dans le code public).
const NONO_HASH = '93f3070dff5cd551660e6fa9c55ff25aa21278d964f1c8baeec7dfe9c0da7a2a';
const sha256 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
const A = window.RP_APP;
const $ = id => document.getElementById(id);
const fb = initializeApp(firebaseConfig);
const auth = getAuth(fb);
const db = initializeFirestore(fb, { ignoreUndefinedProperties: true });

const J = v => JSON.stringify(v ?? null);
const clone = v => v === undefined ? undefined : JSON.parse(J(v));
const isMap = v => v && typeof v === 'object' && !Array.isArray(v) && !Array.isArray(v.$set) && typeof v.$date !== 'string';
const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;
const prevYm = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? ymOf(y - 1, 11) : ymOf(y, m - 2); };
const rpIso = () => { const d = new Date(Date.now() - 5 * 3600e3); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const gRef = doc(db, 'shared', 'global');
const dRef = doc(db, 'shared', 'day-' + A.iso);
const monthRef = (id, ym) => doc(db, 'days', id, 'months', ym);
const charRef = id => doc(db, 'characters', id);
const todayRef = id => doc(db, 'today', id);
const newsRef = key => doc(db, 'news', String(key).replace(/\//g, '_'));

let me = null, started = false, timer = null, base = null;
const loaded = new Set();               // mois déjà chargés (AAAA-MM)
const seenToday = {};                   // dernière version distante de la journée du jour, par personnage

// ---------------------------------------------------------------- écran de connexion
const login = (msg, { button = true, logout = false, err = false } = {}) => {
  $('login').hidden = false;
  $('login-msg').textContent = msg; $('login-msg').className = err ? 'err' : '';
  $('login-btn').hidden = !button; $('logout-btn').hidden = !logout;
};
$('login-btn').addEventListener('click', async () => {
  const p = new GoogleAuthProvider();
  try { await signInWithPopup(auth, p); }
  catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return signInWithRedirect(auth, p);
    if (e.code !== 'auth/popup-closed-by-user') login('Connexion impossible : ' + (e.message || e.code), { err: true });
  }
});
$('logout-btn').addEventListener('click', () => signOut(auth));
getRedirectResult(auth).catch(e => login('Connexion impossible : ' + (e.message || e.code), { err: true }));

// ---------------------------------------------------------------- indicateur d'enregistrement
let stateTimer = null;
const showState = (txt, err = false) => {
  const el = $('sync-state'); el.textContent = txt; el.className = 'sync-state on' + (err ? ' err' : '');
  clearTimeout(stateTimer); if (!err) stateTimer = setTimeout(() => el.className = 'sync-state', 1600);
};
const report = e => { console.error(e); showState(e?.code === 'permission-denied' ? 'Non autorisé' : 'Non enregistré — vérifie la connexion', true); };

// ---------------------------------------------------------------- API utilisée par app.js
window.RP_SYNC = {
  signOut: async () => { await flush(); await signOut(auth); location.reload(); },
  dropNews: keys => { if (!started) return; keys.forEach(k => { base?.news.delete(k); deleteDoc(newsRef(k)).catch(report); }); },
  hasMonth: (y, m) => loaded.has(ymOf(y, m)),
  loadMonth: (y, m) => loadMonth(ymOf(y, m)),
  save: () => schedule(),
  // Webhook Discord : rangé dans Firestore (lisible par les deux joueurs seulement), jamais dans le code.
  setWebhook: url => setDoc(doc(db, 'shared', 'discord'), { webhook: url }, { merge: true }),
  // Toute l'année (pour le wrap) : douze mois, tous personnages.
  loadYear: y => Promise.all(Array.from({ length: 12 }, (_, m) => ymOf(y, m)).filter(ym => ym <= A.ym).map(loadMonth)),
};

// ---------------------------------------------------------------- chargement
async function loadMonth(ym) {
  if (loaded.has(ym)) return;
  loaded.add(ym);
  await Promise.all(A.ids.map(async id => {
    const s = await getDoc(monthRef(id, ym));
    const data = s.data() || {};
    A.applyMonth(id, ym, data, ym === A.ym && !started);
    if (ym === A.ym) seenToday[id] = clone(data[A.day]);
  }));
}

async function boot() {
  A.setMe(me);
  const [g, d, cs, ns, dc] = await Promise.all([
    getDoc(gRef), getDoc(dRef), getDocs(collection(db, 'characters')),
    getDocs(query(collection(db, 'news'), where('to', '==', me))),
    getDoc(doc(db, 'shared', 'discord')),
  ]);
  if (window.RP_DISCORD) window.RP_DISCORD.webhook = dc.data()?.webhook || null;
  if (!g.exists()) await setDoc(gRef, {});
  if (!d.exists()) await setDoc(dRef, {});
  const chars = {};
  cs.forEach(x => { chars[x.id] = x.data(); });
  const mine = A.owned();
  await Promise.all(mine.filter(id => !chars[id]).map(id => {
    chars[id] = { player: me, addedActs: [], removedActs: [], addedRegions: [], customPlaces: [] };
    return setDoc(charRef(id), chars[id]);
  }));
  A.hydrate({ global: g.data() || {}, day: d.data() || {}, chars, news: ns.docs.map(x => x.data()) });
  await loadMonth(prevYm(A.ym));
  await loadMonth(A.ym);
  await Promise.all(mine.map(id => setDoc(monthRef(id, A.ym), {}, { merge: true })));
  base = {
    global: clone(g.data() || {}), day: clone(d.data() || {}),
    entries: Object.fromEntries(mine.map(id => [id, clone(seenToday[id])])),
    chars: Object.fromEntries(mine.map(id => { const { player, ...rest } = chars[id]; void player; return [id, clone(rest)]; })),
    today: {},
    news: new Map(ns.docs.map(x => [x.data().key, !!x.data().read])),
  };
  started = true;
  $('login').hidden = true;
  A.start();
  listen();
  ['click', 'change', 'input'].forEach(t => document.addEventListener(t, schedule, true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
    else if (rpIso() !== A.iso) location.reload();       // nouvelle journée RP (5 h) : on recharge
  });
  window.addEventListener('pagehide', () => flush());
}

onAuthStateChanged(auth, async user => {
  if (!user) { if (started) location.reload(); else login('Connecte-toi avec ton compte Google pour ouvrir le journal.'); return; }
  if (started) return;
  me = (await sha256((user.email || '').trim().toLowerCase())) === NONO_HASH ? 'corentin' : 'elle';
  login('Chargement du journal…', { button: false });
  try { await boot(); }
  catch (e) {
    console.error(e);
    login(e.code === 'permission-denied' ? `Le compte ${user.email} n'a pas accès à Journée RP.` : 'Erreur de chargement : ' + (e.message || e),
      { button: false, logout: true, err: true });
  }
});

// ---------------------------------------------------------------- changements de l'autre joueur (en direct)
const changedKeys = (remote, prev) => Object.fromEntries(Object.entries(remote).filter(([k, v]) => J(v) !== J(prev?.[k])));
function listen() {
  onSnapshot(gRef, s => {
    if (s.metadata.hasPendingWrites) return;
    const d = s.data() || {}, ch = changedKeys(d, base.global);
    if (!Object.keys(ch).length) return;
    A.applyGlobal(ch); base.global = { ...base.global, ...clone(ch) }; A.rerender();
  });
  onSnapshot(dRef, s => {
    if (s.metadata.hasPendingWrites) return;
    const d = s.data() || {}, ch = changedKeys(d, base.day);
    if (!Object.keys(ch).length) return;
    A.applyDay(ch); base.day = { ...base.day, ...clone(ch) }; A.rerender();
  });
  onSnapshot(query(collection(db, 'news'), where('to', '==', me)), s => {
    if (s.metadata.hasPendingWrites) return;
    const list = s.docs.map(x => x.data()).filter(n => !base.news.has(n.key) || base.news.get(n.key) !== !!n.read);
    if (!list.length) return;
    list.forEach(n => base.news.set(n.key, !!n.read));
    A.applyNews(list); A.rerender();
  });
  A.ids.forEach(id => onSnapshot(monthRef(id, A.ym), s => {
    if (s.metadata.hasPendingWrites) return;
    const data = s.data() || {}, e = data[A.day];
    A.applyMonth(id, A.ym, data, false);
    if (J(e) === J(seenToday[id])) return;
    seenToday[id] = clone(e);
    if (base.entries[id] !== undefined && J(e) === J(base.entries[id])) return;   // notre propre écriture
    A.applyMonth(id, A.ym, { [A.day]: e }, true);
    if (id in base.entries) base.entries[id] = clone(e);
    A.rerender();
  }));
}

// ---------------------------------------------------------------- enregistrement
function schedule() { if (!started) return; clearTimeout(timer); timer = setTimeout(flush, 700); }

// Différences sur deux niveaux, pour ne réécrire que ce qui a changé (et ne pas écraser les modifications de l'autre).
function diff2(prev = {}, next = {}) {
  const ups = [];
  for (const k of Object.keys(next)) {
    const a = prev[k], b = next[k];
    if (J(a) === J(b)) continue;
    if (isMap(a) && isMap(b)) {
      for (const sk of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(sk in b)) ups.push(new FieldPath(k, sk), deleteField());
        else if (J(a[sk]) !== J(b[sk])) ups.push(new FieldPath(k, sk), b[sk]);
      }
    } else ups.push(new FieldPath(k), b ?? null);
  }
  return ups;
}

let flushing = Promise.resolve();
function flush() {
  if (!started) return Promise.resolve();
  clearTimeout(timer); timer = null;
  flushing = flushing.then(doFlush).catch(report);
  return flushing;
}
async function doFlush() {
  const snap = A.snapshot(), ops = [];
  for (const [key, ref] of [['global', gRef], ['day', dRef]]) {
    const ups = diff2(base[key], snap[key]);
    if (ups.length) { base[key] = { ...base[key], ...clone(snap[key]) }; ops.push(updateDoc(ref, ...ups)); }
  }
  for (const id of A.owned()) {
    const e = snap.entries[id];
    if (J(e) !== J(base.entries[id]) && (base.entries[id] || A.meaningful(e))) {
      base.entries[id] = clone(e); seenToday[id] = clone(e);
      ops.push(updateDoc(monthRef(id, A.ym), new FieldPath(A.day), e));
    }
    if (J(snap.chars[id]) !== J(base.chars[id])) {
      base.chars[id] = clone(snap.chars[id]);
      ops.push(setDoc(charRef(id), { ...snap.chars[id], player: me }, { merge: true }));
    }
    const t = snap.today[id];
    if (t && J(t) !== J(base.today[id])) {
      base.today[id] = clone(t);
      ops.push(setDoc(todayRef(id), { ...t, updatedAt: serverTimestamp() }));
    }
  }
  for (const n of snap.news) {
    if (!base.news.has(n.key)) { base.news.set(n.key, n.read); ops.push(setDoc(newsRef(n.key), { ...n, createdAt: serverTimestamp() })); }
    else if (n.to === me && base.news.get(n.key) !== n.read) { base.news.set(n.key, n.read); ops.push(updateDoc(newsRef(n.key), { read: n.read })); }
  }
  if (!ops.length) return;
  showState('Enregistrement…');
  const res = await Promise.allSettled(ops);
  const bad = res.find(r => r.status === 'rejected');
  if (bad) report(bad.reason); else showState('Enregistré');
}
