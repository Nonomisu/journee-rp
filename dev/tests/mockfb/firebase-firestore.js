// Firestore simulé : stockage dans localStorage, synchronisé entre onglets par l'événement « storage ».
const KEY = 'mockdb';
const load = () => JSON.parse(localStorage.getItem(KEY) || '{}');
let store = load();
const save = () => { localStorage.setItem(KEY, JSON.stringify(store)); fire(); };
window.addEventListener('storage', e => { if (e.key === KEY) { store = load(); fire(); } });
const listeners = [];
const fire = () => listeners.forEach(l => l.run());
export const initializeFirestore = () => ({});
export class FieldPath { constructor(...s) { this.s = s; } }
const DEL = { __del: true };
export const deleteField = () => DEL;
export const serverTimestamp = () => new Date().toISOString();
export const doc = (db, ...p) => ({ path: p.join('/'), id: p[p.length - 1] });
export const collection = (db, ...p) => ({ path: p.join('/'), coll: true });
export const where = (f, op, v) => ({ f, v });
export const query = (c, w) => ({ path: c.path, coll: true, w });
const snapDoc = (path) => ({ id: path.split('/').pop(), exists: () => path in store, data: () => store[path] ? JSON.parse(JSON.stringify(store[path])) : undefined, metadata: { hasPendingWrites: false } });
const docsOf = q => Object.keys(store).filter(p => p.startsWith(q.path + '/') && p.split('/').length === q.path.split('/').length + 1)
  .filter(p => !q.w || store[p][q.w.f] === q.w.v).map(snapDoc);
export const getDoc = async r => snapDoc(r.path);
export const runTransaction = async (db, fn) => fn({ get: getDoc, set: (r, d, o) => { setDoc(r, d, o); }, update: (r, d) => { updateDoc(r, d); } });
export const getDocs = async q => { const docs = docsOf(q); return { docs, forEach: f => docs.forEach(f) }; };
const deepMerge = (a, b) => { const o = { ...(a || {}) }; for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === 'object' && !Array.isArray(v) && o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? deepMerge(o[k], v) : v; return o; };
window.MOCK_WRITES = [];
export const setDoc = async (r, d, opt) => { window.MOCK_WRITES.push(['set', r.path, d]); store[r.path] = opt?.merge ? deepMerge(store[r.path], d) : JSON.parse(JSON.stringify(d)); save(); };
export const updateDoc = async (r, ...args) => {
  if (!(r.path in store)) throw Object.assign(new Error('no doc ' + r.path), { code: 'not-found' });
  window.MOCK_WRITES.push(['update', r.path, args]);
  const d = store[r.path];
  const pairs = args.length === 1 ? Object.entries(args[0]).map(([k, v]) => [[k], v]) : [];
  for (let i = 0; args.length > 1 && i < args.length; i += 2) pairs.push([args[i] instanceof FieldPath ? args[i].s : String(args[i]).split('.'), args[i + 1]]);
  for (const [segs, v] of pairs) {
    let o = d; for (const s of segs.slice(0, -1)) o = (o[s] ||= {});
    if (v === DEL) delete o[segs.at(-1)]; else o[segs.at(-1)] = JSON.parse(JSON.stringify(v));
  }
  save();
};
export const deleteDoc = async r => { window.MOCK_WRITES.push(['delete', r.path]); delete store[r.path]; save(); };
export const onSnapshot = (r, cb) => {
  let last = null;
  const l = { run: () => {
    const v = r.coll ? docsOf(r) : snapDoc(r.path);
    const j = JSON.stringify(r.coll ? v.map(x => x.data()) : v.data());
    if (j === last) return; last = j;
    cb(r.coll ? { docs: v, metadata: { hasPendingWrites: false } } : v);
  } };
  listeners.push(l); setTimeout(l.run, 0); return () => {};
};
