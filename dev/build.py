"""Transforme l'aperçu (dev/apercu.html) en appli réelle (index.html + app.js à la racine du dépôt).
Usage : python3 dev/build.py   (puis vérifier, puis git commit/push)

Sorties : index.html (balisage + CSS), app.js (logique de l'appli), sync.js est écrit à la main.
Chaque remplacement est vérifié (il doit trouver exactement une occurrence).
"""
import re, sys, pathlib

SRC = pathlib.Path(__file__).with_name('apercu.html')
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent.parent
html = SRC.read_text()

def one(s, a, b, label=''):
    n = s.count(a)
    assert n == 1, f'{label or a[:70]!r}: {n} occurrences'
    return s.replace(a, b)

# ---------------------------------------------------------------- découpage
i0 = html.index('<script>'); i1 = html.rindex('</script>')
page, js = html[:i0], html[i0 + len('<script>'):i1]
tail = html[i1 + len('</script>'):]

# ---------------------------------------------------------------- CSS : retirer le style du wrap
lines = page.split('\n')
def drop_css(first, last):
    a = next(i for i, l in enumerate(lines) if l.startswith(first))
    b = next(i for i, l in enumerate(lines) if l.startswith(last) and i >= a)
    del lines[a:b + 1]
drop_css('.whoami {', '.whoami button[aria-pressed')
page = '\n'.join(lines)
page = one(page, "/* Aperçu de l'appli :", "/* Journée RP :")

# Écran de connexion + scripts
LOGIN_CSS = """
/* Connexion */
.login { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 24px 16px;
  background: radial-gradient(ellipse at 50% 20%, #2a1c18, #0e0b0a 70%); color: #e9dcc4; text-align: center; }
.login[hidden] { display: none; }
.login-box { display: grid; gap: 1rem; max-width: 22rem; }
.login h1 { font: 700 2.4rem/1.1 "Cinzel", Georgia, serif; letter-spacing: .06em; color: #e9dcc4; }
.login p { margin: 0; color: #a8977d; font-style: italic; }
.login .btn { justify-self: center; font-size: 1rem; padding: .7rem 1.3rem; }
.login .err { color: #e07a5a; font-style: normal; }
.session { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; font-size: .85rem; color: var(--dim); }
.session .link { font-size: .85rem; }
.sync-state { position: fixed; right: 12px; top: calc(env(safe-area-inset-top, 0px) + 8px); z-index: 20; font-size: .75rem;
  padding: .2rem .6rem; border-radius: 999px; background: var(--surface); color: var(--dim); border: 1px solid var(--rule); opacity: 0; transition: opacity .3s; pointer-events: none; }
.sync-state.on { opacity: 1; }
.sync-state.err { color: #e07a5a; border-color: #e07a5a; opacity: 1; }
.discord-set { font-size: .8rem; color: var(--dim); opacity: .7; margin-top: 1.5rem; }
.discord-set[open] { opacity: 1; }
.discord-set summary { cursor: pointer; display: inline-flex; align-items: center; gap: .4rem; }
.discord-set summary .ico { width: 1rem; height: 1rem; color: var(--gold); }
.discord-set[open] { display: grid; gap: .5rem; }
"""
page = page.replace('</style>', LOGIN_CSS + '</style>', 1)
page = one(page, '<main><div class="wrap" id="view"></div></main>',
  '<main><div class="wrap" id="view"></div></main>\n'
  '<div class="login" id="login"><div class="login-box"><h1>Journée RP</h1>'
  '<p id="login-msg">Chargement…</p>'
  '<button type="button" class="btn primary" id="login-btn" hidden>Se connecter avec Google</button>'
  '<button type="button" class="link" id="logout-btn" hidden>Changer de compte</button></div></div>\n'
  '<div class="sync-state" id="sync-state" aria-live="polite"></div>')
# PWA
page = one(page, '<title>Journée RP</title>',
  '<title>Journée RP</title>\n<link rel="manifest" href="manifest.webmanifest">\n'
  '<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="icon-180.png">\n'
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
  '<meta name="apple-mobile-web-app-title" content="Journée RP">\n<meta name="theme-color" content="#15141a">')

# ---------------------------------------------------------------- JS
# Données d'exemple de l'aperçu
a = js.index('// Exemple pré-rempli pour Eoor'); b = js.index("let current = 'home'")
js = js[:a] + js[b:]
js = one(js, """// Dans l'appli, « me » viendra du compte Google connecté ; ici, un sélecteur le simule.
let me = 'corentin';""", """// « me » vient du compte Google connecté (fixé par sync.js avant le premier affichage).
let me = 'corentin';""")
js = re.sub(r"const MILESTONES = \{   // id → \[\{ key, type, note, with \}\]\n.*?\n\};",
            "const MILESTONES = {};   // id → [{ key, type, note, with }]", js, count=1, flags=re.S)
assert 'Demande faite au bord' not in js

# Wrap : visible par tous à partir du 26 décembre ; avant, aperçu secret réservé à Nono (#apercu-wrap).
js = one(js, "const wrapVisible = () => wrapReady() || (() => { try { return location.hash === '#apercu-wrap'; } catch { return false; } })();",
  "const wrapVisible = () => wrapReady() || (me === 'corentin' && (() => { try { return location.hash === '#apercu-wrap'; } catch { return false; } })());")
js = one(js, "let simulateWrapDay = false;   // aperçu seulement : simuler le 26 décembre", "let simulateWrapDay = false;   // aperçu secret de Nono : simuler le 26 décembre")
js = one(js, """    <p class="preview-note">Historique d'exemple généré pour l'aperçu (seule la journée en cours est la vraie). Dans l'appli, il viendra des journées enregistrées.</p>\n""", '')
# Le wrap a besoin de toute l'année (tous les personnages) : on la charge avant de l'afficher.
js = one(js, "  document.getElementById('wrap-' + id)?.addEventListener('click', () => { s.wrap = !s.wrap; renderChar(id); });",
  "  document.getElementById('wrap-' + id)?.addEventListener('click', async () => { s.wrap = !s.wrap; if (s.wrap && window.RP_SYNC) { b4wrap(); await RP_SYNC.loadYear(wrapYear()); Object.keys(hotDuoCache).forEach(k => delete hotDuoCache[k]); } renderChar(id); });")
js = one(js, "  document.getElementById('simwrap-' + id)?.addEventListener('click', () => { simulateWrapDay = true; s.wrap = true; renderChar(id); });",
  "  document.getElementById('simwrap-' + id)?.addEventListener('click', async () => { simulateWrapDay = true; s.wrap = true; if (window.RP_SYNC) { b4wrap(); await RP_SYNC.loadYear(wrapYear()); Object.keys(hotDuoCache).forEach(k => delete hotDuoCache[k]); } renderChar(id); });")
js = one(js, "function renderHistory(id) {", "const b4wrap = () => { const b = document.querySelector('.wrap-btn'); if (b) { b.disabled = true; b.textContent = \"Chargement de l’année…\"; } };\nfunction renderHistory(id) {")
# Mois de l'historique pas encore chargés : on les demande à la volée.
js = one(js, "  const { y, m } = cur, n = daysIn(y, m);",
  "  const { y, m } = cur, n = daysIn(y, m);\n  if (window.RP_SYNC && !RP_SYNC.hasMonth(y, m)) RP_SYNC.loadMonth(y, m).then(() => { if (current === id && s.view === 'history') renderChar(id); });")

# Historique réel : les jours passés viennent des journées enregistrées.
a = js.index("  if (d > rpDay) return null;\n  const k = keyOf(d) + ':' + c.id, r = seeded(k);")
b = js.index("const daysIn =")
js = js[:a] + """  if (d > rpDay) return null;
  const e0 = HISTORY[c.id]?.[keyOf(d)];
  // Jouée en RP : notée sur sa fiche, ou sur celle de son partenaire de jeu (la sienne a pu ne pas être enregistrée)
  const rp = e0?.rp || C.find(x => x.id !== c.id && HISTORY[x.id]?.[keyOf(d)]?.rp === c.id)?.id || null;
  if (!rp && (!e0 || !(e0.done || e0.mood || e0.checked?.size || e0.checked?.length || e0.trip))) return null;
  const e = e0 || {};
  return { rp, mood: e.mood || '', acts: [...(e.checked || [])].filter(a => a !== 'Voyage'), slots: e.slots || {}, place: [...(e.places || [])][0] || '', region: e.region || homeRegion(c.id),
    cond, hot: !!e.night?.hot, with: e.night?.with || null, trip: !!e.trip,
    tripInfo: e.trip ? { from: e.trip.from?.region, to: e.trip.to?.region, modes: [...(e.trip.modes || [])], minutes: e.trip.minutes || 0, reason: e.trip.reason || '' } : null,
    phys: [...(e.phys || [])].filter(p => !MORAL.includes(p)), mental: [...(e.mental || []), ...[...(e.phys || [])].filter(p => MORAL.includes(p))],
    notes: e.stateNotes || {}, nightStates: [...(e.nightStates || [])], nightNote: e.nightNote || '', real: true };
};
// Journées enregistrées, par personnage puis par date (clé keyOf) — remplies par sync.js.
const HISTORY = {};
""" + js[b:]

# Accueil : pas de sélecteur de joueur, mais la session
js = one(js, """    <p class="preview-note">Aperçu de l'interface : rien n'est enregistré ni envoyé sur Discord.</p>
    <div class="whoami" role="group" aria-label="Aperçu : je suis">Aperçu, connecté en tant que
      ${Object.entries(PLAYER_NAME).map(([k, n]) => `<button type="button" data-me="${k}" aria-pressed="${me === k}">${n}</button>`).join('')}</div>
""", """    <p class="session">Connecté : ${PLAYER_NAME[me]} · <button type="button" class="link" id="signout">Se déconnecter</button></p>
""")
js = one(js, "document.addEventListener('click', e => { const b = e.target.closest('[data-me]'); if (b) { me = b.dataset.me; go(current); } });\n",
  "document.addEventListener('click', e => { if (e.target.closest('#signout')) window.RP_SYNC?.signOut(); });\n")

# Fiche validée / saisie : plus de mentions d'aperçu
js = one(js, """: `<p class="preview-note">Aperçu de la journée validée. C'est ce résumé qui sert de base au récap Discord et à l'encart « Aujourd'hui » de la fiche.</p>`}""", ": ''}")
js = one(js, """    <p class="preview-note">Aperçu : les cases et le texte réagissent, mais rien n'est enregistré.</p>\n""", '')
js = one(js, '<footer class="recap-foot"><span>✓ Récap envoyé sur Discord</span>', '<footer class="recap-foot"><span>✓ Journée validée</span>')
js = one(js, "${icon('camera')}Image Discord</button>", "${icon('camera')}Image du récap</button>")
js = one(js, "<figcaption>Image jointe à l'embed Discord (${name})</figcaption>", "<figcaption><a href=\"${url}\" download=\"${name}\">Télécharger l'image</a></figcaption>")
js = one(js, "<p class=\"reserved\">Impossible de créer l\\'image dans cet aperçu.</p>", "<p class=\"reserved\">Impossible de créer l\\'image.</p>")
js = one(js, """${s.done ? '✓ Récap envoyé' : "J'ai terminé"}""", """${s.done ? '✓ Journée validée' : "J'ai terminé"}""")
js = one(js, """    ${s.done ? `<p class="sent">Dans l'appli, le récap partira sur Discord et l'encart « Aujourd'hui » de la fiche sera mis à jour.</p>` : ''}`;""", "`;")
# Livraison de Prism : pas de nouveau tirage hors aperçu
js = one(js, """      <button type="button" class="link small" id="dj-reroll-${id}">Nouveau tirage (aperçu seulement)</button>\n""", '')
js = one(js, "  document.getElementById('dj-reroll-'+id)?.addEventListener('click', () => { djSalt++; setDoor(id, null); renderChar(id); });\n", '')
js = one(js, "let djSalt = 0;   // aperçu uniquement : bouton « Nouveau tirage » pour tester les deux cas", "const djSalt = 0;")

# Modifications de la fiche à garder : activités ajoutées, régions, lieux personnels
js = one(js, "(c.acts.quotidien ||= []).push(v); }", "(c.acts.quotidien ||= []).push(v); (c.addedActs ||= []).push(v); }")
js = one(js, "    if (!c.places.includes(v)) c.places.push(v);",
  "    if (!c.places.includes(v)) { c.places.push(v); (c.customPlaces ||= []).push({ name: v, region: s.region, zone: s.zone || null }); }")

# Nouvelles retirées : aussi supprimées dans la base (elles peuvent être chez l'autre joueur)
js = one(js, "const dropNews = keys => { for (let i = NEWS.length - 1; i >= 0; i--) if (keys.includes(NEWS[i].key)) NEWS.splice(i, 1); };",
  "const dropNews = keys => { for (let i = NEWS.length - 1; i >= 0; i--) if (keys.includes(NEWS[i].key)) NEWS.splice(i, 1); window.RP_SYNC?.dropNews(keys); };")

# Démarrage : c'est sync.js qui lance l'appli une fois connecté et les données chargées
js = one(js, "initPlaces();\ntry { window.addEventListener('hashchange', () => go(current)); } catch {}\ngo('home');",
  "initPlaces();\n" + pathlib.Path(__file__).with_name('persist.js').read_text() + pathlib.Path(__file__).with_name('discord-part.js').read_text() + pathlib.Path(__file__).with_name('push-part.js').read_text())
# Discord : envoi à la validation, état d'envoi dans le pied du récap, réglage du webhook (Nono)
js = one(js, "document.getElementById('done-'+id).addEventListener('click', () => { s.done = true; s.doneAt ??= Date.now(); renderNav(); renderChar(id); });",
  "document.getElementById('done-'+id).addEventListener('click', () => { s.done = true; s.doneAt ??= Date.now(); renderNav(); renderChar(id); window.RP_SYNC?.saveNow(); window.RP_DISCORD?.send(id); });")
js = one(js, '<footer class="recap-foot"><span>✓ Journée validée</span>', '<footer class="recap-foot"><span>✓ Journée validée${window.RP_DISCORD ? RP_DISCORD.status(id) : \'\'}</span>')
# Réglage Discord (Nono) : discret, tout en bas de l'accueil
js = re.sub(r"(SOON\.map\(n => `<div class=\"card soon\".*?\.join\(''\) : ''\}\n    </div>)`;",
  lambda m: m.group(1) + "\n    ${window.RP_PUSH ? RP_PUSH.html() : ''}\n    ${me === 'corentin' && window.RP_DISCORD ? RP_DISCORD.settingsHtml() : ''}`;", js, count=1, flags=re.S)
assert "RP_DISCORD.settingsHtml()" in js and "RP_PUSH.html()" in js

assert 'preview-note' not in js, 'reste d\'aperçu'

(OUT / 'app.js').write_text('// Journée RP — logique de l\'appli (générée depuis l\'aperçu, voir dev/build.py).\n' + js.strip() + '\n')
page = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + page.replace('<style>', '</head>\n<body>\n<style>', 0)
# Adresses versionnées (?v=empreinte) : un téléphone ne peut pas garder une ancienne version d'app.js / sync.js en cache.
import hashlib
ver = lambda f: hashlib.sha256((OUT / f).read_bytes()).hexdigest()[:10]
page_out = page + f'<script src="app.js?v={ver("app.js")}" charset="utf-8"></script>\n<script type="module" src="sync.js?v={ver("sync.js")}"></script>\n' + tail.strip() + '\n'
(OUT / 'index.html').write_text(page_out)
print('ok', len(js.splitlines()), 'lignes JS')
