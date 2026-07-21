const detectTestEnv = (): boolean => {
  if (typeof process === "undefined" || !process.env) return false;
  if (process.env.NODE_ENV === "test" || process.env.ZANA_ENV === "test") return true;
  if (process.env.NODE_TEST_CONTEXT !== undefined) return true;
  if (process.argv && process.argv.some(arg => arg.includes("test") || arg.includes("tsx"))) return true;
  return false;
};

const isTest = detectTestEnv();

export const firebaseConfig = {
  projectId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_PROJECT_ID) ||
             (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_PROJECT_ID) ||
             (isTest ? "gen-lang-client-0009572581" : ""),

  appId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_APP_ID) ||
         (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_APP_ID) ||
         (isTest ? "1:958839183835:web:80cec81bbb0227f7b82ffe" : ""),

  apiKey: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) ||
          (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_API_KEY) ||
          (isTest ? "AIzaSyFakeKeyForTestEnvironmentOnly12345" : ""),

  authDomain: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) ||
              (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_AUTH_DOMAIN) ||
              (isTest ? "gen-lang-client-0009572581.firebaseapp.com" : ""),

  firestoreDatabaseId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_DATABASE_ID) ||
                       (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_DATABASE_ID) ||
                       (isTest ? "ai-studio-zana-61fd6b5f-d052-40d1-8657-de471d642e8c" : ""),

  storageBucket: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) ||
                 (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_STORAGE_BUCKET) ||
                 (isTest ? "gen-lang-client-0009572581.firebasestorage.app" : ""),

  messagingSenderId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
                     (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
                     (isTest ? "958839183835" : ""),

  measurementId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) ||
                 (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_MEASUREMENT_ID) || "",

  oAuthClientId: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID) ||
                 (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_OAUTH_CLIENT_ID) || "",

  recaptchaSiteKey: (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY) ||
                    (typeof process !== "undefined" && process.env && process.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY) || "",
};

export default firebaseConfig;
