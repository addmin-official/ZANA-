import { CurriculumTopic } from '../../lib/curriculum/types.ts';

export function buildEvaluationPrompt(
  question: string,
  studentAnswer: string,
  topicContext?: CurriculumTopic
): string {
  let prompt = `You are ZANA, an expert educational AI evaluator.
You must evaluate the student's answer to the provided question.

Language: Sorani Kurdish (RTL).
Tone: Encouraging but academically rigorous.

QUESTION: "${question}"
STUDENT ANSWER: "${studentAnswer}"
`;

  if (topicContext) {
    prompt += `
TOPIC CONTEXT: ${topicContext.title}
OBJECTIVES: ${topicContext.learningObjectives.join(', ')}
Evaluate strictly against these objectives.
`;
  }

  prompt += `
You MUST respond with a valid JSON object matching this exact schema, and nothing else:
{
  "isCorrect": boolean,
  "confidenceScore": number, // 0.0 to 1.0 representing how completely they understood the concept
  "feedback": string, // Sorani Kurdish feedback explaining why it's right/wrong
  "detectedMisconception": string | null, // Identify specific misunderstandings, if any
  "nextAction": "REVIEW" | "ADVANCE" | "PRACTICE_AGAIN"
}
`;

  return prompt;
}
