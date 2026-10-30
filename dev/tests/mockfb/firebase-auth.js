const cbs = [];
let user = null;
try { const e = localStorage.getItem('mockSession:' + (window.name || 'x')); if (e) user = { email: e }; } catch {}
export const getAuth = () => ({});
export class GoogleAuthProvider {}
export const signInWithPopup = async () => { const e = window.MOCK_EMAIL; user = { email: e }; localStorage.setItem('mockSession:' + (window.name || 'x'), e); cbs.forEach(cb => cb(user)); return { user }; };
export const signInWithRedirect = signInWithPopup;
export const getRedirectResult = async () => null;
export const onAuthStateChanged = (a, cb) => { cbs.push(cb); setTimeout(() => cb(user), 0); return () => {}; };
export const signOut = async () => { user = null; localStorage.removeItem('mockSession:' + (window.name || 'x')); cbs.forEach(cb => cb(null)); };
