import { StudentProfile, StudentProfileDraft } from "./studentTypes.ts";

const PROFILE_KEY = "zana:student-profile";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function getStudentProfile(): StudentProfile | null {
  if (!isBrowser) return null;
  try {
    const data = window.localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    const profile = JSON.parse(data) as StudentProfile;
    // Align backwards-compatible properties
    if (profile) {
      profile.subject = profile.activeSubject;
      profile.onboarded = profile.onboardingCompleted;
    }
    return profile;
  } catch (error) {
    console.error("Error reading student profile from localStorage:", error);
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (!isBrowser) return;
  try {
    // Sync backward compatibility fields
    const profileToSave: StudentProfile = {
      ...profile,
      subject: profile.activeSubject,
      onboarded: profile.onboardingCompleted,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profileToSave));
  } catch (error) {
    console.error("Error saving student profile to localStorage:", error);
  }
}

export function deleteStudentProfile(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    console.error("Error deleting student profile from localStorage:", error);
  }
}

export function createStudentProfile(draft: StudentProfileDraft): StudentProfile {
  const now = new Date().toISOString();
  
  // Stable random ID generation
  const uniqueId = "stud_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  
  const profile: StudentProfile = {
    id: uniqueId,
    name: draft.name.trim(),
    grade: draft.grade,
    stream: draft.stream,
    activeSubject: draft.activeSubject,
    level: draft.level,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
    subject: draft.activeSubject,
    onboarded: true
  };
  
  saveStudentProfile(profile);
  return profile;
}

export function updateStudentProfile(
  current: StudentProfile,
  updates: Partial<StudentProfileDraft>
): StudentProfile {
  const updatedProfile: StudentProfile = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    grade: updates.grade !== undefined ? updates.grade : current.grade,
    stream: updates.stream !== undefined ? updates.stream : current.stream,
    activeSubject: updates.activeSubject !== undefined ? updates.activeSubject : current.activeSubject,
    level: updates.level !== undefined ? updates.level : current.level,
    updatedAt: new Date().toISOString()
  };
  
  // Keep backward compatibility fields aligned
  updatedProfile.subject = updatedProfile.activeSubject;
  updatedProfile.onboarded = updatedProfile.onboardingCompleted;
  
  saveStudentProfile(updatedProfile);
  return updatedProfile;
}
