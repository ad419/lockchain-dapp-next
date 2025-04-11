import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { globalCache } from "./cache";

let dbInstance = null;

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!privateKey) {
      throw new Error("FIREBASE_PRIVATE_KEY is not properly set");
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });

    console.log("Firebase Admin initialized successfully");
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
}

// Get the Firestore instance only once
if (!dbInstance) {
  try {
    dbInstance = getFirestore();

    // Don't run a test query on every import!
    console.log("Firestore instance created");
  } catch (error) {
    console.error("Error getting Firestore instance:", error);
    throw error;
  }
}

export const db = dbInstance;
