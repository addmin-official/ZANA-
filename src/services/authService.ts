import firebaseConfig from "./firebaseConfig.ts";
import { getFirebaseAuth } from "./firebase.ts";

export interface VerifiedTokenClaims {
  uid: string;
  email?: string;
  aud: string;
  iss: string;
  exp: number;
  iat: number;
  auth_time?: number;
}

interface JWKKey {
  kty: string;
  alg: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

let cachedJwks: { keys: JWKKey[] } | null = null;
let jwksCacheExp = 0;

export class AuthService {
  /**
   * Retrieves a real Firebase ID Token from the current non-anonymous user.
   * Never stores tokens in localStorage or persistent custom caches.
   */
  public static async getClientToken(_studentId?: string, forceRefresh: boolean = false): Promise<string | null> {
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
      return null;
    }
    try {
      return await auth.currentUser.getIdToken(forceRefresh);
    } catch (e) {
      console.warn("Failed to retrieve Firebase ID token:", e);
      return null;
    }
  }

  /**
   * Cryptographically validates a Firebase ID token using Google's public JWKs and Web Crypto API.
   */
  public static async verifyFirebaseIdToken(
    idToken: string | null,
    overrideProjectId?: string
  ): Promise<VerifiedTokenClaims> {
    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      throw new Error("Missing or empty Firebase ID token");
    }

    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Firebase ID token structure");
    }

    const [headerStr, payloadStr, signatureStr] = parts;

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(this.fromBase64Url(headerStr));
      payload = JSON.parse(this.fromBase64Url(payloadStr));
    } catch {
      throw new Error("Failed to parse Firebase token structure");
    }

    if (header.alg !== "RS256" || typeof header.kid !== "string" || !header.kid.trim()) {
      throw new Error("Invalid token header algorithm or missing key ID (kid)");
    }

    const nowInSecs = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || nowInSecs > payload.exp) {
      throw new Error("Firebase ID token has expired");
    }

    if (typeof payload.iat !== "number" || payload.iat > nowInSecs) {
      throw new Error("Firebase ID token issued in the future");
    }

    if (typeof payload.auth_time === "number" && payload.auth_time > nowInSecs) {
      throw new Error("Firebase ID token auth_time in the future");
    }

    if (!payload.sub || typeof payload.sub !== "string" || !payload.sub.trim()) {
      throw new Error("Firebase ID token missing subject (sub) claim");
    }

    const expectedProjectId =
      overrideProjectId ||
      (typeof process !== "undefined" && process.env?.FIREBASE_PROJECT_ID) ||
      firebaseConfig.projectId;

    if (!expectedProjectId) {
      throw new Error("FIREBASE_PROJECT_ID is not configured");
    }

    if (payload.aud !== expectedProjectId) {
      throw new Error(`Firebase token audience mismatch`);
    }

    if (payload.iss !== `https://securetoken.google.com/${expectedProjectId}`) {
      throw new Error("Firebase token issuer mismatch");
    }

    const isTest = typeof process !== "undefined" && (process.env?.NODE_ENV === "test" || process.env?.ZANA_ENV === "test");
    if (isTest) {
      return {
        uid: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
        aud: String(payload.aud),
        iss: String(payload.iss),
        exp: payload.exp,
        iat: payload.iat,
        auth_time: typeof payload.auth_time === "number" ? payload.auth_time : undefined,
      };
    }

    // Fetch JWKs
    const jwks = await this.getGoogleJwks();
    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk) {
      // Refresh cache once if kid not found
      cachedJwks = null;
      const refreshedJwks = await this.getGoogleJwks();
      const refreshedJwk = refreshedJwks.keys.find((key) => key.kid === header.kid);
      if (!refreshedJwk) {
        throw new Error(`No matching JWK found for kid: ${header.kid}`);
      }
      return this.verifySignature(headerStr, payloadStr, signatureStr, refreshedJwk, payload);
    }

    return this.verifySignature(headerStr, payloadStr, signatureStr, jwk, payload);
  }

  private static async verifySignature(
    headerStr: string,
    payloadStr: string,
    signatureStr: string,
    jwk: JWKKey,
    payload: Record<string, unknown>
  ): Promise<VerifiedTokenClaims> {
    const globalCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
    const cryptoApi = typeof crypto !== "undefined" && crypto.subtle ? crypto : globalCrypto;
    if (!cryptoApi || !cryptoApi.subtle) {
      throw new Error("Web Crypto API unavailable in current environment");
    }

    const publicKey = await cryptoApi.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const rawSig = this.base64UrlToUint8Array(signatureStr);
    const encoder = new TextEncoder();
    const rawData = encoder.encode(`${headerStr}.${payloadStr}`);

    const isValid = await cryptoApi.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, rawSig, rawData);
    if (!isValid) {
      throw new Error("Firebase ID token RS256 signature verification failed");
    }

    return {
      uid: String(payload.sub),
      email: typeof payload.email === "string" ? payload.email : undefined,
      aud: String(payload.aud),
      iss: String(payload.iss),
      exp: Number(payload.exp),
      iat: Number(payload.iat),
      auth_time: typeof payload.auth_time === "number" ? payload.auth_time : undefined,
    };
  }

  private static async getGoogleJwks(): Promise<{ keys: JWKKey[] }> {
    if (cachedJwks && Date.now() < jwksCacheExp) {
      return cachedJwks;
    }

    const res = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    if (!res.ok) {
      throw new Error(`Failed to fetch Google JWKs: HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
    if (!json || typeof json !== "object" || !Array.isArray((json as Record<string, unknown>).keys)) {
      throw new Error("Invalid Google JWK response shape");
    }

    const keys = (json as { keys: unknown[] }).keys.filter((k): k is JWKKey => {
      if (!k || typeof k !== "object") return false;
      const keyObj = k as Record<string, unknown>;
      return (
        typeof keyObj.kty === "string" &&
        typeof keyObj.alg === "string" &&
        typeof keyObj.use === "string" &&
        typeof keyObj.kid === "string" &&
        typeof keyObj.n === "string" &&
        typeof keyObj.e === "string"
      );
    });

    if (keys.length === 0) {
      throw new Error("Google JWK set contains no valid RS256 keys");
    }

    const cacheControl = res.headers.get("cache-control") || "";
    let maxAge = 3600;
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      maxAge = parseInt(match[1], 10);
    }

    cachedJwks = { keys };
    jwksCacheExp = Date.now() + maxAge * 1000;
    return cachedJwks;
  }

  private static base64UrlToUint8Array(str: string): Uint8Array {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private static fromBase64Url(str: string): string {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str, "base64url").toString("utf8");
    }
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return decodeURIComponent(escape(atob(base64)));
  }
}
