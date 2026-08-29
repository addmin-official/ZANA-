import { AuthService, VerifiedTokenClaims } from '../../services/authService.ts';

export async function verifyAuthToken(
  token: string,
  env?: { FIREBASE_PROJECT_ID?: string }
): Promise<VerifiedTokenClaims | { uid: string; email?: string } | null> {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const projectId = env?.FIREBASE_PROJECT_ID || (typeof process !== 'undefined' ? process.env?.FIREBASE_PROJECT_ID : undefined);

  try {
    const claims = await AuthService.verifyFirebaseIdToken(token, projectId);
    return claims;
  } catch (error) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      // In dev mode, allow dev tokens or mock dev profiles if needed
      return { uid: 'dev_student_pilot', email: 'dev@zana.krd' };
    }
    console.error('[verifyAuthToken] Token verification failed:', error);
    return null;
  }
}
