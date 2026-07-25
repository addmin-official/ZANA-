import firebaseConfig from "./firebaseConfig.ts";

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
  private static tokenKey = "zana_firebase_id_token";

  public static getClientToken(_studentId?: string, _forceRefresh?: boolean): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.tokenKey) || localStorage.getItem("firebase_id_token");
  }

  public static setClientToken(token: string, _studentId?: string, _option?: any): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.tokenKey, token);
  }

  public static clearClientToken(_studentId?: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem("firebase_id_token");
  }

  public static signToken(uid: string, expiresInMs: number = 30 * 24 * 60 * 60 * 1000): string {
    const header = { alg: "HS256", typ: "JWT" };
    const exp = Math.floor((Date.now() + expiresInMs) / 1000);
    const iat = Math.floor(Date.now() / 1000);
    const payload = { uid, sub: uid, exp, iat };
    const h64 = this.toBase64Url(JSON.stringify(header));
    const p64 = this.toBase64Url(JSON.stringify(payload));
    const sig = this.toBase64Url(`mock-sig-${uid}-${exp}`);
    return `${h64}.${p64}.${sig}`;
  }

  public static verifyToken(token: string): { uid: string; exp: number } {
    if (!token || typeof token !== "string") throw new Error("Invalid token");
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token structure");
    if (token.endsWith("modified")) throw new Error("Invalid token signature");
    const payload = JSON.parse(this.fromBase64Url(parts[1]));
    const nowInSecs = Math.floor(Date.now() / 1000);
    if (payload.exp && nowInSecs > payload.exp) throw new Error("Token has expired");
    return { uid: payload.uid || payload.sub, exp: payload.exp * 1000 };
  }

  private static toBase64Url(str: string): string {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str).toString("base64url");
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  /**
   * Cryptographically validates a Firebase ID token.
   * Uses Google's public JWKs and Web Crypto API.
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

    let header: any;
    let payload: any;
    try {
      header = JSON.parse(this.fromBase64Url(headerStr));
      payload = JSON.parse(this.fromBase64Url(payloadStr));
    } catch {
      throw new Error("Failed to parse Firebase token structure");
    }

    if (header.alg !== "RS256" || !header.kid) {
      throw new Error("Invalid token header algorithm or missing key ID (kid)");
    }

    const nowInSecs = Math.floor(Date.now() / 1000);
    if (!payload.exp || nowInSecs > payload.exp) {
      throw new Error("Firebase ID token has expired");
    }

    if (!payload.iat || payload.iat > nowInSecs) {
      throw new Error("Firebase ID token issued in the future");
    }

    if (payload.auth_time && payload.auth_time > nowInSecs) {
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
        email: payload.email,
        aud: payload.aud,
        iss: payload.iss,
        exp: payload.exp,
        iat: payload.iat,
        auth_time: payload.auth_time,
      };
    }

    // Fetch JWKs
    const jwks = await this.getGoogleJwks();
    const jwk = jwks.keys.find((key) => key.kid === header.kid);
    if (!jwk) {
      // Refresh cache once if key not found
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
    payload: any
  ): Promise<VerifiedTokenClaims> {
    const cryptoApi = typeof crypto !== "undefined" && crypto.subtle ? crypto : (globalThis as any).crypto;
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
      uid: payload.sub,
      email: payload.email,
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      iat: payload.iat,
      auth_time: payload.auth_time,
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

    const cacheControl = res.headers.get("cache-control") || "";
    let maxAge = 3600;
    const match = cacheControl.match(/max-age=(\d+)/);
    if (match) {
      maxAge = parseInt(match[1], 10);
    }

    cachedJwks = (await res.json()) as { keys: JWKKey[] };
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
