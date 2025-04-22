import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvdIVxvUb3uqpubOvkhPTdEro8aaqbKuI",
  authDomain: "lockchain-tickets-3eb4d.firebaseapp.com",
  projectId: "lockchain-tickets-3eb4d",
  storageBucket: "lockchain-tickets-3eb4d.firebasestorage.app",
  messagingSenderId: "747664160474",
  appId: "1:747664160474:web:202fea05b4ed105631d7e3",
};

// Initialize Firebase app
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Use the new preferred method for persistence with cache settings
const db = initializeFirestore(app, {
  // Use the new cache configuration approach
  cache: {
    // Use unlimited cache size
    sizeBytes: CACHE_SIZE_UNLIMITED,
  },
  // Optionally set these for better performance
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

console.log("Firestore initialized with persistent cache");

export { app, auth, db };
