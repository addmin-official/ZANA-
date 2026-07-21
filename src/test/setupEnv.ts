// Test Environment Bootstrap Setup
process.env.NODE_ENV = "test";
process.env.ZANA_ENV = "test";

// Ensure a reliable JWT secret is available in tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long-1234567890-test-key";
}

// Ensure dummy values are populated so Firebase SDK does not throw/fetch anything
if (!process.env.VITE_FIREBASE_API_KEY) {
  process.env.VITE_FIREBASE_API_KEY = "AIzaSyFakeKeyForTestEnvironmentOnly12345";
}
if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  process.env.VITE_FIREBASE_PROJECT_ID = "gen-lang-client-0009572581";
}
if (!process.env.VITE_FIREBASE_APP_ID) {
  process.env.VITE_FIREBASE_APP_ID = "1:958839183835:web:80cec81bbb0227f7b82ffe";
}
if (!process.env.VITE_FIREBASE_AUTH_DOMAIN) {
  process.env.VITE_FIREBASE_AUTH_DOMAIN = "gen-lang-client-0009572581.firebaseapp.com";
}
if (!process.env.VITE_FIREBASE_DATABASE_ID) {
  process.env.VITE_FIREBASE_DATABASE_ID = "ai-studio-zana-61fd6b5f-d052-40d1-8657-de471d642e8c";
}
if (!process.env.VITE_FIREBASE_STORAGE_BUCKET) {
  process.env.VITE_FIREBASE_STORAGE_BUCKET = "gen-lang-client-0009572581.firebasestorage.app";
}
if (!process.env.VITE_FIREBASE_MESSAGING_SENDER_ID) {
  process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = "958839183835";
}
