import { auth } from '../config/firebase.ts';

export interface StudentProfile {
  studentId: string;
  grade: number;
  activeSubjects: string[];
}

export async function fetchStudentProfile(): Promise<StudentProfile> {
  const user = auth.currentUser;
  if (!user) throw new Error('Unauthenticated user');

  const token = await user.getIdToken();

  const response = await fetch('/api/student/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch student profile');
  }

  const data = await response.json();
  return data.profile;
}
