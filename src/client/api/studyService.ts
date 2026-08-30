import { auth } from '../config/firebase.ts';

export type StudyActionType = 'LEARN' | 'PRACTICE' | 'REVIEW' | 'MASTERY_CHECK' | 'COURSE_COMPLETE';

export interface NextBestAction {
  actionType: StudyActionType;
  topicId: string;
  topicTitle: string;
  rationale: string;
}

export async function fetchNextBestAction(grade: number, subject: string): Promise<NextBestAction | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated user');

  const token = await user.getIdToken();

  const response = await fetch(`/api/study/plan?grade=${grade}&subject=${subject}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch study plan: ${response.statusText}`);
  }

  const data = await response.json();
  return data.nextBestAction;
}
