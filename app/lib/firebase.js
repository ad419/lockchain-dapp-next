import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvdIVxvUb3uqpubOvkhPTdEro8aaqbKuI",
  authDomain: "lockchain-tickets-3eb4d.firebaseapp.com",
  projectId: "lockchain-tickets-3eb4d",
  storageBucket: "lockchain-tickets-3eb4d.firebasestorage.app",
  messagingSenderId: "747664160474",
  appId: "1:747664160474:web:202fea05b4ed105631d7e3",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
