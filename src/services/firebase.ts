import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./firebaseConfig.ts";

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Get Firestore (supporting custom databaseId from config if provided)
const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const auth = getAuth(app);

const isTest = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || process.env.ZANA_ENV === "test");

// CRITICAL CONSTRAINT: Test Firestore connection upon application boot
async function testConnection() {
  if (isTest || !firebaseConfig.apiKey) {
    return;
  }
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: the client is offline.");
    }
  }
}
testConnection();

export { app, db, auth };
export default app;
