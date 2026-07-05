import { StudentProfile, StudentProfileDraft } from "./studentTypes.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel } from "./studentDefaults.ts";

const PROFILE_KEY = "zana:student-profile";

const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

interface LegacyProfileInput {
  id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  activeSubject?: string;
  subject?: string;
  onboardingCompleted?: boolean;
  onboarded?: boolean;
  grade?: string;
  stream?: string;
  level?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function migrateStudentProfile(raw: unknown): StudentProfile {
  const now = new Date().toISOString();
  const rawObj = isRecord(raw) ? (raw as LegacyProfileInput) : {};
  
  // 1. Preserve or fallback basic fields
  const id = typeof rawObj.id === "string" ? rawObj.id : "stud_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  const name = typeof rawObj.name === "string" ? rawObj.name.trim() : "";
  const createdAt = typeof rawObj.createdAt === "string" ? rawObj.createdAt : now;
  const updatedAt = typeof rawObj.updatedAt === "string" ? rawObj.updatedAt : now;

  // 2. Migration rules for subject
  let rawSubject = rawObj.activeSubject;
  if (rawSubject === undefined || rawSubject === null) {
    rawSubject = rawObj.subject;
  }
  const activeSubject = getValidatedSubject(rawSubject);

  // 3. Migration rules for onboarded
  let rawOnboarded = rawObj.onboardingCompleted;
  if (rawOnboarded === undefined || rawOnboarded === null) {
    rawOnboarded = rawObj.onboarded;
  }
  let onboardingCompleted = typeof rawOnboarded === "boolean" ? rawOnboarded : false;

  // 4. Validate other fields
  const grade = getValidatedGrade(rawObj.grade);
  let stream = getValidatedStream(rawObj.stream);
  const level = getValidatedLevel(rawObj.level);

  // Apply academic stream rules for migration
  if (grade === "9") {
    stream = "general";
  } else {
    // Grade is "10", "11", or "12"
    if (stream !== "scientific" && stream !== "literary") {
      stream = "scientific";
      onboardingCompleted = false; // Force stream selection again
    }
  }

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
  
  let grade = draft.grade;
  let stream = draft.stream;
  if (grade === "9") {
    stream = "general";
  } else {
    if (stream !== "scientific" && stream !== "literary") {
      stream = "scientific";
    }
  }

  const profile: StudentProfile = {
    id: uniqueId,
    name: draft.name.trim(),
    grade,
    stream,
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
  let grade = updates.grade !== undefined ? updates.grade : current.grade;
  let stream = updates.stream !== undefined ? updates.stream : current.stream;

  if (grade === "9") {
    stream = "general";
  } else {
    if (stream !== "scientific" && stream !== "literary") {
      stream = "scientific";
    }
  }

  const updatedProfile: StudentProfile = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    grade,
    stream,
    activeSubject: updates.activeSubject !== undefined ? updates.activeSubject : current.activeSubject,
    level: updates.level !== undefined ? updates.level : current.level,
    updatedAt: new Date().toISOString()
  };
  
  saveStudentProfile(updatedProfile);
  return updatedProfile;
}
