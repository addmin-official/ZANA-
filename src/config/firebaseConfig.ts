export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

type RuntimeEnv = Record<string, string | undefined>;

const viteEnv: RuntimeEnv =
  (import.meta as ImportMeta & { env?: RuntimeEnv }).env ?? {};

const nodeEnv: RuntimeEnv =
  typeof process !== "undefined" && process.env
    ? (process.env as RuntimeEnv)
    : {};

const readEnv = (...names: string[]): string => {
  for (const name of names) {
    const value = viteEnv[name] ?? nodeEnv[name];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
};

const isTestEnvironment =
  readEnv("NODE_ENV") === "test" ||
  readEnv("ZANA_ENV") === "test";

const firebaseConfig: FirebaseClientConfig = {
  apiKey: readEnv("VITE_FIREBASE_API_KEY", "FIREBASE_API_KEY"),
  authDomain: readEnv(
    "VITE_FIREBASE_AUTH_DOMAIN",
    "FIREBASE_AUTH_DOMAIN",
  ),
  projectId:
    readEnv(
      "VITE_FIREBASE_PROJECT_ID",
      "FIREBASE_PROJECT_ID",
    ) || (isTestEnvironment ? "zana-test-project" : ""),
  storageBucket: readEnv(
    "VITE_FIREBASE_STORAGE_BUCKET",
    "FIREBASE_STORAGE_BUCKET",
  ),
  messagingSenderId: readEnv(
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_MESSAGING_SENDER_ID",
  ),
  appId: readEnv("VITE_FIREBASE_APP_ID", "FIREBASE_APP_ID"),
  measurementId:
    readEnv(
      "VITE_FIREBASE_MEASUREMENT_ID",
      "FIREBASE_MEASUREMENT_ID",
    ) || undefined,
  firestoreDatabaseId:
    readEnv(
      "VITE_FIREBASE_FIRESTORE_DATABASE_ID",
      "FIREBASE_FIRESTORE_DATABASE_ID",
    ) || undefined,
};

export default firebaseConfig;
