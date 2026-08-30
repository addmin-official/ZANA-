import { verifyAuthToken } from '../../auth/firebase.ts';
import { calculateNextBestAction } from '../../learning/nextBestActionEngine.ts';
import { MasteryEnv } from '../../learning/masteryService.ts';
import { GradeLevel, SubjectId } from '../../../lib/curriculum/types.ts';

export interface StudyPlanRouteEnv extends MasteryEnv {
  FIREBASE_PROJECT_ID?: string;
  [key: string]: unknown;
}

export async function handleStudyPlanRoute(request: Request, env: StudyPlanRouteEnv): Promise<Response> {
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

  // 2. Parse Query Params (GET request preferred for fetching data)
  const url = new URL(request.url);
  const gradeParam = url.searchParams.get('grade');
  const subjectParam = url.searchParams.get('subject') as SubjectId | null;

  if (!gradeParam || !subjectParam) {
    return new Response(JSON.stringify({ error: 'Missing grade or subject parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const grade = parseInt(gradeParam, 10) as GradeLevel;

  try {
    // 3. Execute Engine
    const nextBestAction = await calculateNextBestAction(env, studentId, grade, subjectParam);

    // 4. Return Plan
    return new Response(
      JSON.stringify({
        success: true,
        nextBestAction: nextBestAction || {
          actionType: 'COURSE_COMPLETE',
          rationale: 'پیرۆزە! هەموو بابەتەکانی ئەم وانەیەت تەواو کردووە.', // "Congratulations! You have completed all topics."
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[Study Plan Route Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
