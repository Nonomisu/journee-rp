# Développement de Journée RP

L'appli publiée (`index.html` + `app.js` à la racine) est **générée** à partir de l'aperçu :

| Fichier | Rôle |
|---|---|
| `dev/apercu.html` | Source de l'interface et de toute la logique (version « aperçu » autonome, sans Firebase). C'est **ce fichier** qu'on modifie. |
| `dev/persist.js` | Ajouté à la fin d'`app.js` : sérialisation des données et API `window.RP_APP` utilisée par `sync.js`. |
| `dev/discord-part.js` | Ajouté à la fin d'`app.js` : envoi des journées validées sur Discord (embed + image du récap), lien direct `?fiche=…&jour=…`. |
| `dev/build.py` | Transforme l'aperçu en appli : retire ce qui est propre à l'aperçu, branche l'historique réel, Discord, la connexion. Chaque remplacement est vérifié. |
| `sync.js` | Écrit à la main : connexion Google, lecture/écriture Firestore, mises à jour en direct. |
| `firebase-config.js` | Configuration publique du projet Firebase `journal-rp`. |

## Modifier l'appli

1. Modifier `dev/apercu.html` (et au besoin `dev/persist.js`, `dev/discord-part.js`, `sync.js`).
2. `python3 dev/build.py` — régénère `index.html` et `app.js`.
3. `node --check app.js`, puis tests ci-dessous.
4. `git commit` puis `git push` : GitHub Pages publie en 1 à 2 minutes.

## Tests

`dev/tests/` contient des tests de bout en bout (Playwright) avec un Firestore simulé (`dev/tests/mockfb/`,
stockage dans localStorage, partagé entre onglets) :

```
python3 -m http.server 8765        # à la racine du dépôt, dans un autre terminal
npm i html-to-image@1.11.11         # une fois, pour les tests d'image
NONO_EMAIL=adresse-de-nono node dev/tests/e2e.js   # connexion, enregistrement, lecture seule, notifications
NONO_EMAIL=… node dev/tests/e2e2.js              # historique, sets d'Echo / Prism
NONO_EMAIL=… node dev/tests/e2e4.js              # Discord (webhook simulé)
NONO_EMAIL=… node dev/tests/e2e5.js              # notifications envoyées seulement à la validation
NONO_EMAIL=… node dev/tests/e2e20.js             # Iloh Khurdan : masquer une activité (ce jour-là, toujours)
NONO_EMAIL=… node dev/tests/e2e21.js             # Echo et Prism : commande de malbouffe commune (même restaurant)
NONO_EMAIL=… node dev/tests/e2e22.js             # vie intime : reprendre ce que l'autre personnage a noté, reformulé
```

## Données Firestore

- `characters/{id}` : `player`, `addedActs`, `removedActs`, `addedRegions`, `customPlaces`
- `days/{id}/months/{AAAA-MM}` : un champ par jour (`"30"`), journée encodée (Sets → `{$set:[…]}`) + `night`
- `shared/global` : amants, protection, alertes, événements, arcs, jalons, contrats, jours de travail, `hideIloh` (activités toujours masquées dans Iloh Khurdan)
- `shared/day-AAAA-MM-JJ` : nuits, vidéos, météo S9, protection et coquillages du jour
- `shared/discord` : `webhook` (adresse du webhook, lisible seulement par les deux joueurs)
- `news/{clé}` : notifications (`to`, `text`, `charId`, `key`, `read`)
- `today/{id}` : encart public des fiches (`mood`, `activities`, `place`, `updatedAt`)
- `wraps/{année}/…` : réservé (lecture autorisée à partir du 26 décembre)

Les règles de sécurité ne sont pas dans le dépôt (elles contiennent les adresses des joueurs) :
elles sont dans la console Firebase, onglet Règles de Firestore.
