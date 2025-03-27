import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Check if all required environment variables are present
const requiredEnvVars = {
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
};

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`${key} is not set in environment variables`);
  }
});

if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    console.log(
      "Firebase Admin initialized successfully with project:",
      process.env.FIREBASE_PROJECT_ID
    );
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    throw error;
  }
}

let db;
try {
  db = getFirestore();
  // Test the connection
  db.collection("_test_")
    .limit(1)
    .get()
    .then(() => console.log("Firestore connection test successful"))
    .catch((error) =>
      console.error("Firestore connection test failed:", error)
    );
} catch (error) {
  console.error("Error getting Firestore instance:", error);
  throw error;
}

export { db };
