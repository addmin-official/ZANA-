import { verifyAuthToken } from '../auth/firebase.ts';
import { globalCurriculumRegistry } from '../../lib/curriculum/CurriculumRegistry.ts';
import { buildEvaluationPrompt } from '../ai/assessmentBuilder.ts';
import { updateStudentMastery, MasteryEnv } from '../learning/masteryService.ts';
import { GradeLevel, SubjectId } from '../../lib/curriculum/types.ts';

export interface AssessmentRequestPayload {
  grade: GradeLevel;
  subject: SubjectId;
  topicId: string;
  question: string;
  studentAnswer: string;
}

export interface AssessmentRouteEnv extends MasteryEnv {
  GEMINI_PRIMARY_MODEL?: string;
  GEMINI_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  [key: string]: unknown;
}

export async function handleAssessmentRoute(request: Request, env: AssessmentRouteEnv): Promise<Response> {
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

  // 2. Parse Payload
  let payload: AssessmentRequestPayload;
  try {
    payload = (await request.json()) as AssessmentRequestPayload;
    if (!payload.topicId || !payload.question || !payload.studentAnswer) {
      throw new Error('Malformed payload');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Bad Request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Resolve Curriculum Topic Context
  const context = await globalCurriculumRegistry.resolveContext(payload.grade, payload.subject);
  const activeUnit = context?.units.find((u) => u.topics.some((t) => t.id === payload.topicId));
  const topicContext = activeUnit?.topics.find((t) => t.id === payload.topicId);

  // 4. Construct AI Evaluation Prompt
  const prompt = buildEvaluationPrompt(payload.question, payload.studentAnswer, topicContext);

  try {
    // 5. Evaluate via Gemini (Forcing JSON structure)
    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    const model = env.GEMINI_PRIMARY_MODEL || (typeof process !== 'undefined' ? process.env.GEMINI_PRIMARY_MODEL : 'gemini-1.5-flash') || 'gemini-1.5-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Highly deterministic for evaluation
        responseMimeType: 'application/json',
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      return new Response(JSON.stringify({ error: 'AI Evaluation Failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiData = (await geminiResponse.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const evaluation = JSON.parse(rawText) as {
      isCorrect: boolean;
      confidenceScore: number;
      feedback: string;
      detectedMisconception: string | null;
      nextAction: 'REVIEW' | 'ADVANCE' | 'PRACTICE_AGAIN';
    };

    // 6. Server-Authoritative Mastery Update
    const updatedMastery = await updateStudentMastery(env, studentId, payload.topicId, evaluation);

    // 7. Return Evaluation and new Mastery state to Client
    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
        mastery: updatedMastery,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[Assessment Route Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
