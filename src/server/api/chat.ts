import { globalCurriculumRegistry } from '../../lib/curriculum/CurriculumRegistry.ts';
import { buildTutorSystemPrompt } from '../ai/promptBuilder.ts';
import { verifyAuthToken } from '../auth/firebase.ts';
import { enforceAiRateLimit } from '../middleware/rateLimiter.ts';
import { GradeLevel, SubjectId } from '../../lib/curriculum/types.ts';

export interface ChatRequestPayload {
  grade: GradeLevel;
  subject: SubjectId;
  topicId?: string;
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[];
}

export async function handleChatRoute(request: Request, env: Record<string, unknown>): Promise<Response> {
  // 1. Security: Verify Firebase Auth Token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await verifyAuthToken(token, env);
  if (!decodedToken || !decodedToken.uid) {
    return new Response(JSON.stringify({ error: 'Invalid identity' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const studentId = decodedToken.uid;

  // 2. EDGE PROTECTION: Enforce Rate Limit
  try {
    await enforceAiRateLimit(env, studentId);
  } catch (error: unknown) {
    if ((error as Error)?.message === 'RATE_LIMIT_EXCEEDED') {
      return new Response(
        JSON.stringify({
          error: 'گەیشتیتە سنوری دیاریکراوی بەکارهێنان بۆ ئەم کاتژمێرە. تکایە دواتر هەوڵبدەرەوە.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '3600',
          },
        }
      );
    }
    throw error;
  }

  // 2. Parse payload
  let payload: ChatRequestPayload;
  try {
    payload = (await request.json()) as ChatRequestPayload;
    if (!payload.grade || !payload.subject || !Array.isArray(payload.messages)) {
      throw new Error('Malformed payload');
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Bad Request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Retrieve authoritative curriculum context
  const context = await globalCurriculumRegistry.resolveContext(
    payload.grade,
    payload.subject,
    'xwendn-official'
  );

  // 4. Construct grounded system prompt
  const systemInstruction = buildTutorSystemPrompt(context, payload.topicId);

// 5. Call Gemini Provider (Using standard Google AI Studio / Vertex format)
  try {
    const apiKey = (env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '')) as string;
    const model = env.GEMINI_PRIMARY_MODEL || (typeof process !== 'undefined' ? process.env.GEMINI_PRIMARY_MODEL : 'gemini-2.5-flash') || 'gemini-2.5-flash';
    
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const geminiBody = {
      system_instruction: { parts: { text: systemInstruction } },
      contents: payload.messages,
      generationConfig: {
        temperature: 0.4, 
        maxOutputTokens: 1024,
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
      },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiResponse.ok) {
      console.error(`[AI Provider Error] Status: ${geminiResponse.status}`);
      return new Response(JSON.stringify({ error: 'AI Provider Unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiData = await geminiResponse.json();

    // 6. Return standard structured response
    return new Response(
      JSON.stringify({
        success: true,
        data: aiData,
        meta: {
          grounded: !!context,
          studentId: decodedToken.uid, // Explicitly bound to verified identity
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[Chat Route Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
