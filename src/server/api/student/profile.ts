import { verifyAuthToken } from '../../auth/firebase.ts';

export interface StudentProfile {
  studentId: string;
  grade: number;
  activeSubjects: string[];
}

export interface StudentProfileEnv {
  LEARNING_RECORDS_KV?: {
    get: (key: string, type?: string) => Promise<unknown>;
    put: (key: string, val: string) => Promise<void>;
  };
  FIREBASE_PROJECT_ID?: string;
  [key: string]: unknown;
}

export async function handleStudentProfileRoute(request: Request, env: StudentProfileEnv): Promise<Response> {
  // 1. Identity Verification
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await verifyAuthToken(token, { FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID });
  if (!decodedToken || !decodedToken.uid) {
    return new Response(JSON.stringify({ error: 'Invalid identity' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const studentId = decodedToken.uid;

  try {
    // 2. Fetch authoritative profile from KV (Fallback to pilot default if new user)
    const profileKey = `profile:${studentId}`;
    let profileData: StudentProfile | null = null;
    if (env.LEARNING_RECORDS_KV) {
      profileData = (await env.LEARNING_RECORDS_KV.get(profileKey, 'json')) as StudentProfile | null;
    }

    if (!profileData) {
      // Auto-provision pilot profile for Phase 19 testing purposes
      profileData = {
        studentId,
        grade: 12,
        activeSubjects: ['chemistry'],
      };
      if (env.LEARNING_RECORDS_KV) {
        await env.LEARNING_RECORDS_KV.put(profileKey, JSON.stringify(profileData));
      }
    }

    return new Response(JSON.stringify({ success: true, profile: profileData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[Profile Route Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
