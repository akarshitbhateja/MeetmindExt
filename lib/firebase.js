import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

// ✅ 1. ADD SCOPES: Calendar + Drive (Read Only for recordings)
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');

// ✅ 2. FORCE CONSENT & PERSISTENCE
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});

// Ensure Auth State Persists in Local Storage (Prevents Logout)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Persistence Error:", error);
});

export { auth, provider, signInWithPopup, GoogleAuthProvider, storage };