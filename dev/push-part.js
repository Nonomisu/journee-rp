
// ---------- Notifications push (iPhone/iPad : appli ouverte depuis l'écran d'accueil, iOS 16.4 ou plus) ----------
// L'abonnement de l'appareil est rangé dans Firestore (pushSubs/{joueur}/subs) par sync.js. Le service du VPS
// envoie une notification pour chaque nouvelle destinée à ce joueur, et une de bienvenue à l'activation.
const pushView = { st: null, busy: false, msg: '' };
const refreshPush = async () => {
  try { pushView.st = window.RP_SYNC?.pushState ? await RP_SYNC.pushState() : 'unsupported'; } catch { pushView.st = 'unsupported'; }
  if (current === 'home') go('home');
};
window.RP_PUSH = {
  refresh: refreshPush,
  html: () => {
    const st = pushView.st; if (!st) return '';
    const body = {
      unsupported: `<p class="reserved">Notifications : sur iPhone ou iPad, ouvre Journée RP depuis son icône sur l'écran d'accueil (iOS 16.4 ou plus) pour pouvoir les activer.</p>`,
      denied: `<p class="reserved">Notifications refusées sur cet appareil. Pour les réactiver : Réglages › Notifications › Journée RP.</p>`,
      off: `<button type="button" class="btn" id="push-on" ${pushView.busy ? 'disabled' : ''}>${icon('bell')}${pushView.busy ? 'Activation…' : 'Activer les notifications sur cet appareil'}</button>`,
      on: `<p class="reserved">${icon('bell')} Notifications activées sur cet appareil ✓ <button type="button" class="link ico-btn" id="push-off" title="Désactiver" aria-label="Désactiver les notifications">${icon('minus')}</button></p>`,
    }[st];
    return `<div class="push-set" style="margin-top:1rem">${body}${pushView.msg ? `<p class="reserved">${esc(pushView.msg)}</p>` : ''}</div>`;
  },
};
document.addEventListener('click', async e => {
  const on = e.target.closest('#push-on'), off = e.target.closest('#push-off'); if (!on && !off) return;
  pushView.busy = true; pushView.msg = '';
  try {
    // iOS n'accepte la demande d'autorisation que pendant le geste : on l'appelle tout de suite, sans rien afficher avant.
    if (on) { await RP_SYNC.enablePush(); pushView.msg = 'C\'est fait : une notification de bienvenue va arriver d\'ici quelques secondes.'; }
    else await RP_SYNC.disablePush();
  } catch (err) { console.error(err); pushView.msg = 'Impossible d\'activer les notifications : ' + (err.message || err); }
  pushView.busy = false; refreshPush();
});
