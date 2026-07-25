import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig.ts";

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;
  if (!isFirebaseConfigured()) return null;

  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return _app;
  } catch (err) {
    console.warn("Failed to initialize Firebase App:", err);
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    _db = firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
    return _db;
  } catch (err) {
    console.warn("Failed to initialize Firestore DB:", err);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    _auth = getAuth(app);
    return _auth;
  } catch (err) {
    console.warn("Failed to initialize Firebase Auth:", err);
    return null;
  }
}

export { isFirebaseConfigured };
