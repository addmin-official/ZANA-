import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig.ts";

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

const isEmulatorEnabled = (): boolean => {
  if (typeof window !== "undefined") {
    const env = (import.meta as unknown as { env?: Record<string, string> })?.env;
    if (env?.VITE_USE_FIREBASE_EMULATOR === "true") return true;
  }
  if (typeof process !== "undefined" && process.env) {
    if (process.env.USE_FIREBASE_EMULATOR === "true" || process.env.FIREBASE_AUTH_EMULATOR_HOST) return true;
  }
  return false;
};

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;
  if (!isFirebaseConfigured() && !isEmulatorEnabled()) return null;

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

    if (isEmulatorEnabled()) {
      try {
        connectFirestoreEmulator(_db, "127.0.0.1", 8080);
      } catch {
        // Emulator may already be connected
      }
    }
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
    if (isEmulatorEnabled()) {
      try {
        connectAuthEmulator(_auth, "http://127.0.0.1:9099", { disableWarnings: true });
      } catch {
        // Emulator may already be connected
      }
    }
    return _auth;
  } catch (err) {
    console.warn("Failed to initialize Firebase Auth:", err);
    return null;
  }
}

export { isFirebaseConfigured };
