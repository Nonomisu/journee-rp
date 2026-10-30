# Journée RP

Journal partagé de la vie quotidienne de nos personnages de RP sur Final Fantasy XIV :
humeur du jour, activités, lieux, nuits, événements, et récap envoyé sur Discord.

Appli web publiée sur GitHub Pages, données dans Firebase (connexion Google, Firestore).

## Évolutions prévues

- **Notifications push sur mobile et tablette** (iPhone/iPad avec iOS 16.4+, appli installée sur l'écran d'accueil) :
  bouton « Activer les notifications » dans l'appli, envoi par un petit service sur le VPS qui surveille les nouvelles
  dans Firestore et notifie le bon joueur dès qu'une fiche est validée.
- **Captures du jour** : stockage sur le VPS (les captures ne sont pas encore enregistrées).
- **Wraps du 26 décembre** : publication automatique sur Discord par le service du VPS.
- **Sauvegarde hebdomadaire** de la base Firestore depuis le VPS.
- **Encart « Aujourd'hui »** sur les fiches publiques des personnages (lecture de la collection `today`).
- Optionnel : vraie météo (Open-Meteo), lien avec la future appli Khurdans.
