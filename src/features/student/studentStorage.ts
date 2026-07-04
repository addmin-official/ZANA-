import { StudentProfile, StudentProfileDraft } from "./studentTypes.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel } from "./studentDefaults.ts";

const PROFILE_KEY = "zana:student-profile";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function migrateStudentProfile(raw: any): StudentProfile {
  const now = new Date().toISOString();
  
  // 1. Preserve or fallback basic fields
  const id = typeof raw?.id === "string" ? raw.id : "stud_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const createdAt = typeof raw?.createdAt === "string" ? raw.createdAt : now;
  const updatedAt = typeof raw?.updatedAt === "string" ? raw.updatedAt : now;

  // 2. Migration rules for subject
  let rawSubject = raw?.activeSubject;
  if (rawSubject === undefined || rawSubject === null) {
    rawSubject = raw?.subject;
  }
  const activeSubject = getValidatedSubject(rawSubject);

  // 3. Migration rules for onboarded
  let rawOnboarded = raw?.onboardingCompleted;
  if (rawOnboarded === undefined || rawOnboarded === null) {
    rawOnboarded = raw?.onboarded;
  }
  const onboardingCompleted = typeof rawOnboarded === "boolean" ? rawOnboarded : false;

  // 4. Validate other fields
  const grade = getValidatedGrade(raw?.grade);
  const stream = getValidatedStream(raw?.stream);
  const level = getValidatedLevel(raw?.level);

  const migrated: StudentProfile = {
    id,
    name,
    grade,
    stream,
    activeSubject,
    level,
    onboardingCompleted,
    createdAt,
    updatedAt
  };

  // Save the migrated canonical profile back to zana:student-profile
  if (isBrowser) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
    } catch (e) {
      console.error("Error saving migrated profile to localStorage:", e);
    }
  }

  return migrated;
}

export function getStudentProfile(): StudentProfile | null {
  if (!isBrowser) return null;
  try {
    const data = window.localStorage.getItem(PROFILE_KEY);
    if (!data) return null;
    const raw = JSON.parse(data);
    return migrateStudentProfile(raw);
  } catch (error) {
    console.error("Error reading student profile from localStorage:", error);
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (!isBrowser) return;
  try {
    const profileToSave: StudentProfile = {
      ...profile,
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
    updatedAt: now
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
  
  saveStudentProfile(updatedProfile);
  return updatedProfile;
}
