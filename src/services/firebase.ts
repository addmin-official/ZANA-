import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig.ts";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firestore (supporting custom databaseId from config if provided)
const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const auth = getAuth(app);

export { app, db, auth, isFirebaseConfigured };
export default app;
