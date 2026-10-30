// Configuration Firebase de l'appli « Journée RP » (projet journal-rp).
// Ces valeurs identifient le projet ; elles ne sont pas secrètes : la sécurité repose sur les règles Firestore.
// SDK chargé par balise <script type="module"> depuis le CDN Google, version proposée par la console :
//   https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js (+ firebase-auth.js, firebase-firestore.js)
export const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/13.1.0";
// Hébergement : GitHub Pages du compte nonomisu (domaine autorisé dans Firebase Authentication).
export const PAGES_DOMAIN = "nonomisu.github.io";
export const firebaseConfig = {
  apiKey: "AIzaSyB1AvFflrrq8qiCAH81fVVy6PJYS0RW5vw",
  authDomain: "journal-rp.firebaseapp.com",
  projectId: "journal-rp",
  storageBucket: "journal-rp.firebasestorage.app",
  messagingSenderId: "341361076439",
  appId: "1:341361076439:web:e775fe73fb029972996892",
};
