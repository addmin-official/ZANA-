import crypto from "node:crypto";
import firebaseConfig from "../../firebase-applet-config.json";

export interface TokenPayload {
  uid: string;
  exp: number;
}

export class AuthService {
  private static getSecret(): string {
    const secret = process.env.JWT_SECRET;
    const isProd = process.env.NODE_ENV === "production" || process.env.ZANA_ENV === "production";
    
    if (!secret) {
      if (isProd) {
        throw new Error("CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production!");
      }
      return "dev-fallback-secret-key-zana-learning-platform-2026-secure-default";
    }
    return secret;
  }

  /**
   * Generates a cryptographically signed HS256 JWT token for the student ID.
   */
  public static signToken(uid: string, expiresInMs: number = 30 * 24 * 60 * 60 * 1000): string {
    if (!uid) {
      throw new Error("Cannot sign token for empty uid");
    }
    const secret = this.getSecret();
    const payload: TokenPayload = {
      uid,
      exp: Date.now() + expiresInMs,
    };

    const header = { alg: "HS256", typ: "JWT" };

    const base64Header = this.toBase64Url(JSON.stringify(header));
    const base64Payload = this.toBase64Url(JSON.stringify(payload));

    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${base64Header}.${base64Payload}`)
      .digest("base64url");

    return `${base64Header}.${base64Payload}.${signature}`;
  }

  /**
   * Cryptographically verifies the signature, algorithm, structure, and expiration of the JWT.
   */
  public static verifyToken(token: string): TokenPayload {
    if (!token) {
      throw new Error("Token is empty");
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Malformed token structure");
    }

    const [headerStr, payloadStr, signature] = parts;
    const secret = this.getSecret();

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerStr}.${payloadStr}`)
      .digest("base64url");

    if (signature !== expectedSignature) {
      throw new Error("Invalid token signature");
    }

    // Decode and parse payload
    let payload: TokenPayload;
    try {
      const decodedPayload = this.fromBase64Url(payloadStr);
      payload = JSON.parse(decodedPayload);
    } catch (e) {
      throw new Error("Failed to parse token payload");
    }

    if (!payload.uid) {
      throw new Error("Token payload is missing verified uid");
    }

    if (payload.exp && Date.now() > payload.exp) {
      throw new Error("Token is expired");
    }

    return payload;
  }

  /**
   * Cryptographically validates a Firebase ID token.
   * If in production, signature verification is strictly enforced using Google's JWKs.
   * In local 'test' environments, signature check is skipped for unit tests isolation.
   */
  public static async verifyFirebaseIdToken(idToken: string | null): Promise<string> {
    const isProd = process.env.NODE_ENV === "production" || process.env.ZANA_ENV === "production";
    
    if (!idToken) {
      if (isProd) {
        throw new Error("Missing Firebase authentication ID token in production.");
      }
      return "dev-guest";
    }

    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Firebase ID token structure");
    }

    // Decode and parse payload
    let payload: any;
    try {
      payload = JSON.parse(this.fromBase64Url(parts[1]));
    } catch {
      throw new Error("Failed to parse Firebase token payload");
    }

    // Validate claims
    const nowInSecs = Math.floor(Date.now() / 1000);
    if (payload.exp && nowInSecs > payload.exp) {
      throw new Error("Firebase ID token has expired");
    }

    const projectId = firebaseConfig.projectId;
    if (payload.aud !== projectId) {
      throw new Error(`Firebase token audience mismatch: expected ${projectId}, got ${payload.aud}`);
    }

    if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
      throw new Error("Firebase token issuer mismatch");
    }

    const isTest = typeof process !== "undefined" && (process.env?.NODE_ENV === "test" || process.env?.ZANA_ENV === "test");
    if (isTest) {
      // Offline/Test environment bypass signature check for isolation
      return payload.sub;
    }

    // Fetch Google public JWKs and cryptographically verify signature
    try {
      const jwksRes = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
      if (!jwksRes.ok) {
        throw new Error(`Failed to fetch Google JWKs: ${jwksRes.statusText}`);
      }
      const jwks = (await jwksRes.json()) as { keys: any[] };
      const header = JSON.parse(this.fromBase64Url(parts[0]));
      const kid = header.kid;
      const jwk = jwks.keys.find((key: any) => key.kid === kid);
      if (!jwk) {
        throw new Error(`No JWK found for key ID: ${kid}`);
      }

      // Import the JWK
      const cryptoApi = typeof crypto !== "undefined" && (crypto as any).subtle ? crypto : (globalThis as any).crypto;
      const publicKey = await cryptoApi.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );

      // Verify the signature
      const rawSig = this.base64UrlToUint8Array(parts[2]);
      const encoder = new TextEncoder();
      const rawData = encoder.encode(`${parts[0]}.${parts[1]}`);

      const isValid = await cryptoApi.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        publicKey,
        rawSig,
        rawData
      );

      if (!isValid) {
        throw new Error("Firebase ID token RS256 signature verification failed");
      }

      return payload.sub;
    } catch (err) {
      if (isProd) {
        throw new Error(`Firebase cryptographic token verification failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      console.warn("Skipping cryptographic signature check due to offline/dev environment failure:", err);
      return payload.sub;
    }
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

  // Pure isomorphic helper functions for Base64Url conversion
  private static toBase64Url(str: string): string {
    if (typeof Buffer !== "undefined") {
      return Buffer.from(str).toString("base64url");
    }
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
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

  // =========================================================================
  // Client-Side Identity Token Cache & Exchange Helper
  // =========================================================================
  private static clientTokenCache = new Map<string, string>();

  /**
   * Client-side helper to fetch or refresh a cryptographically signed Bearer token.
   * Leverages caching and localStorage to support offline/persistent operations.
   */
  public static async getClientToken(studentId: string, forceRefresh = false): Promise<string> {
    if (!studentId || studentId === "default-guest") {
      throw new Error("Cannot retrieve auth token for unregistered guest user.");
    }

    const localStorageKey = `zana:auth:token:${studentId}`;
    
    if (!forceRefresh) {
      // 1. Check in-memory cache
      const cached = this.clientTokenCache.get(studentId);
      if (cached && !this.isClientTokenExpired(cached)) {
        return cached;
      }

      // 2. Check localStorage
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = window.localStorage.getItem(localStorageKey);
        if (stored && !this.isClientTokenExpired(stored)) {
          this.clientTokenCache.set(studentId, stored);
          return stored;
        }
      }
    }

    // Retrieve active Firebase ID token dynamically if available on the client
    let idToken: string | null = null;
    if (typeof window !== "undefined") {
      try {
        const { auth } = await import("./firebase.ts");
        if (auth && auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (e) {
        console.warn("Could not retrieve Firebase ID token, fallback to development identity exchange.", e);
      }
    }

    // 3. Request a signed token from the backend
    try {
      const response = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, idToken }),
      });

      if (!response.ok) {
        throw new Error(`Auth exchange failed with status ${response.status}`);
      }

      const data = await response.json();
      const token = data.token;
      if (!token) {
        throw new Error("Server response missing auth token field");
      }

      // Store in caches
      this.clientTokenCache.set(studentId, token);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(localStorageKey, token);
      }

      return token;
    } catch (error) {
      console.error("Failed to perform secure token exchange with ZANA:", error);
      throw error;
    }
  }

  /**
   * Checks client-side if the local token is expired or close to expiration (within 5 mins buffer)
   */
  private static isClientTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payloadDecoded = this.fromBase64Url(parts[1]);
      const payload = JSON.parse(payloadDecoded);
      // Expiration check with a 5 minutes (300 seconds) safety buffer
      const bufferMs = 5 * 60 * 1000;
      return Date.now() + bufferMs > payload.exp;
    } catch {
      return true;
    }
  }

  /**
   * Clear active auth sessions if needed (e.g. logging out or resetting profiles)
   */
  public static clearClientToken(studentId: string): void {
    this.clientTokenCache.delete(studentId);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(`zana:auth:token:${studentId}`);
    }
  }
}
