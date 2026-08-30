import { auth } from '../config/firebase.ts';

export interface StudentFeedbackPayload {
  topicId: string;
  grade: number | string;
  subject: string;
  issueType: 'AI_INACCURATE' | 'TECHNICAL_ERROR' | 'CONFUSING_EXPLANATION' | string;
  comments?: string;
}

export async function submitStudentFeedback(payload: StudentFeedbackPayload): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated user');

  const token = await user.getIdToken();

  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to submit feedback');
  }
}
