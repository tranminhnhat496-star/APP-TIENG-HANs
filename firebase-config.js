/* ===== Firebase config — YOUR project (V12 cloud sync) =====
   HOW TO ENABLE CLOUD SYNC (see FIREBASE_SETUP.md in this ZIP):
   1. Create a free Firebase project at https://console.firebase.google.com
   2. Enable Authentication: Google + Email/Password sign-in methods
   3. Create a Cloud Firestore database (production mode)
   4. Paste the Firestore Security Rules from firestore.rules
   5. In Authentication > Settings > Authorized domains, add your GitHub
      Pages domain (e.g. yourname.github.io)
   6. Copy your project's Web App config below (Project settings > Your apps)
   7. Deploy. Until these fields are filled in, the game stays fully
      offline: local saves keep working, and the Data panel says plainly
      "Chưa cấu hình Firebase" — it never pretends sync works.

   SECURITY NOTE: these values are a PUBLIC client identifier for your
   Firebase project, not a secret key. Real security comes from Firebase
   Authentication + the Firestore Rules (each player can only read/write
   their own document). NEVER paste a service-account private key or an
   Admin SDK credential here — those must never appear in frontend code.
*/
window.__FIREBASE_CONFIG__ = {
  apiKey: "AIzaSyA-bBDITssSNOhuofX7H2YqY9oKkTo-9l8",
  authDomain: "korean-english-vocab-farm.firebaseapp.com",
  projectId: "korean-english-vocab-farm",
  storageBucket: "korean-english-vocab-farm.firebasestorage.app",
  messagingSenderId: "198391866791",
  appId: "1:198391866791:web:522d19f11b7e9de2c9c282",
  measurementId: "G-H2B0ZKBG1P"
};

