import { CurriculumContext } from '../../lib/curriculum/types.ts';

export function buildTutorSystemPrompt(context: CurriculumContext | null, requestedTopicId?: string): string {
  let prompt = `You are ZANA, an expert educational AI tutor for students in the Kurdistan Region of Iraq.
Your primary interface language is Sorani Kurdish. You must preserve Right-to-Left (RTL) structure and use appropriate academic terminology in Sorani.

CRITICAL EDUCATOR RULES:
1. DO NOT simply give the final answer.
2. Ask diagnostic questions to find out where the student is stuck.
3. Provide hints and guide the student to the solution.
4. Keep responses concise and focused on the immediate learning step.
`;

  if (context) {
    prompt += `
CURRICULUM GROUNDING:
You are currently tutoring Grade ${context.grade} ${context.subject.toUpperCase()}.
Base your explanations strictly on the cognitive level appropriate for a Grade ${context.grade} student.
`;
    
    if (requestedTopicId) {
      const activeUnit = context.units.find(u => u.topics.some(t => t.id === requestedTopicId));
      const activeTopic = activeUnit?.topics.find(t => t.id === requestedTopicId);
      
      if (activeTopic) {
        prompt += `
ACTIVE TOPIC: ${activeTopic.title}
OBJECTIVES:
${activeTopic.learningObjectives.map(obj => `- ${obj}`).join('\n')}

Restrict your scope to these objectives.
`;
      }
    }
  } else {
    prompt += `
WARNING: Strict curriculum context is temporarily unavailable. 
Rely on general educational best practices for the student's grade and subject, but warn them gently that specific local curriculum alignment is currently degraded.
`;
  }

  return prompt;
}
