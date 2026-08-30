import { verifyAuthToken } from '../auth/firebase.ts';

export type GradeLevel = number | string;
export type SubjectId = string;

export interface FeedbackPayload {
  topicId: string;
  grade?: GradeLevel;
  subject?: SubjectId;
  issueType: 'AI_INACCURATE' | 'TECHNICAL_ERROR' | 'CONFUSING_EXPLANATION';
  comments?: string;
}

export interface FeedbackEnv {
  LEARNING_RECORDS_KV?: {
    put: (key: string, val: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
  FIREBASE_PROJECT_ID?: string;
  [key: string]: unknown;
}

export async function handleFeedbackRoute(request: Request, env: FeedbackEnv): Promise<Response> {
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

  try {
    const payload: FeedbackPayload = await request.json();
    if (!payload.topicId || !payload.issueType) {
      return new Response(JSON.stringify({ error: 'Malformed payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store feedback in KV with a timestamp-based key for chronological retrieval
    const timestamp = Date.now();
    const feedbackKey = `feedback:${payload.issueType}:${timestamp}:${decodedToken.uid}`;

    const record = {
      studentId: decodedToken.uid,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    if (env.LEARNING_RECORDS_KV) {
      await env.LEARNING_RECORDS_KV.put(feedbackKey, JSON.stringify(record));
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[Feedback Route Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
