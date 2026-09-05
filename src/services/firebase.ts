import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, initializeFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import firebaseConfig, { isFirebaseConfigured } from "./firebaseConfig.ts";

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getFirebaseConfigDiagnostics() {
  return {
    apiKeyConfigured:
      typeof firebaseConfig.apiKey === "string" &&
      firebaseConfig.apiKey.trim().length > 0,
    projectIdConfigured:
      typeof firebaseConfig.projectId === "string" &&
      firebaseConfig.projectId.trim().length > 0,
    appIdConfigured:
      typeof firebaseConfig.appId === "string" &&
      firebaseConfig.appId.trim().length > 0,
    authDomainConfigured:
      typeof firebaseConfig.authDomain === "string" &&
      firebaseConfig.authDomain.trim().length > 0,
    firestoreDatabaseIdConfigured:
      typeof firebaseConfig.firestoreDatabaseId === "string" &&
      firebaseConfig.firestoreDatabaseId.trim().length > 0,
    storageBucketConfigured:
      typeof firebaseConfig.storageBucket === "string" &&
      firebaseConfig.storageBucket.trim().length > 0,
    messagingSenderIdConfigured:
      typeof firebaseConfig.messagingSenderId === "string" &&
      firebaseConfig.messagingSenderId.trim().length > 0,
  };
}

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;

  if (!isFirebaseConfigured()) {
    console.error("FIREBASE CONFIG MISSING:", getFirebaseConfigDiagnostics());
    return null;
  }

  try {
    _app = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp();

    console.info("FIREBASE APP INITIALIZED:", {
      projectId: firebaseConfig.projectId,
      ...getFirebaseConfigDiagnostics(),
    });

    return _app;
  } catch (error: unknown) {
    console.error("FIREBASE INITIALIZATION ERROR:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      ...getFirebaseConfigDiagnostics(),
    });
    return null;
  }
}

export function getFirestoreDb(): Firestore | null {
  if (_db) return _db;

  const app = getFirebaseApp();

  if (!app) {
    console.error("FIRESTORE INITIALIZATION BLOCKED: Firebase App is unavailable.");
    return null;
  }

  try {
    _db = firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);

    console.info("FIRESTORE INITIALIZED:", {
      projectId: firebaseConfig.projectId,
      firestoreDatabaseIdConfigured:
        typeof firebaseConfig.firestoreDatabaseId === "string" &&
        firebaseConfig.firestoreDatabaseId.trim().length > 0,
    });

    return _db;
  } catch (error: unknown) {
    console.error("FIRESTORE INITIALIZATION ERROR:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      projectId: firebaseConfig.projectId || "(missing)",
      firestoreDatabaseIdConfigured:
        typeof firebaseConfig.firestoreDatabaseId === "string" &&
        firebaseConfig.firestoreDatabaseId.trim().length > 0,
    });
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (_auth) return _auth;

  const app = getFirebaseApp();

  if (!app) {
    console.error("AUTH INITIALIZATION BLOCKED: Firebase App is unavailable.");
    return null;
  }

  try {
    _auth = getAuth(app);

    console.info("FIREBASE AUTH INITIALIZED:", {
      projectId: firebaseConfig.projectId,
      authDomainConfigured:
        typeof firebaseConfig.authDomain === "string" &&
        firebaseConfig.authDomain.trim().length > 0,
    });

    return _auth;
  } catch (error: unknown) {
    console.error("AUTH INITIALIZATION ERROR:", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      projectId: firebaseConfig.projectId || "(missing)",
      authDomainConfigured:
        typeof firebaseConfig.authDomain === "string" &&
        firebaseConfig.authDomain.trim().length > 0,
    });
    return null;
  }
}

export { isFirebaseConfigured };