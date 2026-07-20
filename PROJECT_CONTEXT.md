# ZANA Project Context

## Production Architecture

This is the single, authoritative deployment architecture for ZANA:

### 1. Production Frontend
* **Host:** Cloudflare Static Assets
* **Vite Output:** `dist/client`
* **SPA Fallback Routing:** Handled natively inside Cloudflare Worker fallback fetch layer via `env.ASSETS` mapping of all non-`/api` requests (fetching `/index.html` as fallback for unmatched client-side routes, supporting direct browser refresh).

### 2. Production API
* **Host:** Cloudflare Worker
* **Main Entry File:** `src/worker/index.ts`
* **Worker Name:** `zana-api-worker`
* **API Endpoints:** Prefix `/api/*` handled natively, keeping all keys (such as `GEMINI_API_KEY`, `JWT_SECRET`) securely concealed server-side.

### 3. Production Deployment
* **CI/CD Host:** GitHub Actions (`.github/workflows/ci.yml`)
* **Deployment Engine:** Wrangler (`npx wrangler deploy`)
* **Release Pipeline Flow:**
  1. `npm ci` installs clean dependencies.
  2. Lints via `npm run lint` (`tsc --noEmit`).
  3. Typechecks via `npm run typecheck` (`tsc --noEmit`).
  4. Tests via `npm run test` (running unit tests).
  5. Builds static assets (`npm run build:client` -> `dist/client`).
  6. Validates Worker configuration via Wrangler dry-run.
  7. Deploys once to Cloudflare via `wrangler deploy` (pushing both Static Assets and Worker code simultaneously).
  8. Runs automated live smoke-tests on the deployed API to ensure health, correct response payloads, and strict Origin CORS protections.
  9. Generates git release tag and uploads release metadata summary to GitHub.

---

## Retained Service Roles

### 1. Firebase Client-Side Services
* **Firebase Authentication:** Actively used for client authentication (Google/Anonymous sign-in) and cryptographic ID Token validation on the backend.
* **Firestore:** Retained as defined in `firebase.json` (`rules: firestore.rules`), but without any active deployment of static assets.
* **Firebase Hosting:** **DEACTIVATED / REMOVED**. Static assets are entirely migrated and aligned to Cloudflare Static Assets. No Firebase Hosting deployment jobs, secrets, or scripts remain active.

### 2. Local Node/Express Server (`server.ts`, `dist/server.cjs`)
* **Role:** Dedicated entirely to local sandbox development and rapid manual client-server integration testing.
* **Production Status:** **INACTIVE in Production**. Wrangler handles standard routing and execution on the live edge environment natively without Node dependency.

---

## Current Status & Phase Verification

* **Phase 15 status:** **PRODUCTION VERIFIED & DEPLOYMENT ALIGNMENT COMPLETE**.
* **Zero-Downtime Migration:** Completed without breaking Firebase Auth token exchanges, Firestore structures, or adaptive learning engine persistence layers.
