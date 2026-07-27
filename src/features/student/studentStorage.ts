import { StudentProfile, StudentProfileDraft, VerifiedIdentity } from "./studentTypes.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel } from "./studentDefaults.ts";
import { getFirestoreDb, getFirebaseAuth, isFirebaseConfigured } from "../../services/firebase.ts";
import { doc, setDoc } from "firebase/firestore";

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

export function parseServerProfileDocument(raw: unknown): StudentProfileDraft {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid server profile document: not an object");
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  const grade = getValidatedGrade(obj.grade);
  let stream = getValidatedStream(obj.stream);
  if (grade === "9") {
    stream = "general";
  } else if (stream !== "scientific" && stream !== "literary") {
    stream = "general";
  }
  let rawSubject = obj.activeSubject;
  if (rawSubject === undefined || rawSubject === null) {
    rawSubject = obj.subject;
  }
  const activeSubject = getValidatedSubject(rawSubject);
  const level = getValidatedLevel(obj.level);

  return {
    name,
    grade,
    stream,
    activeSubject,
    level,
  };
}

export function migrateStudentProfile(raw: unknown): StudentProfile {
  const now = new Date().toISOString();
  const rawObj = isRecord(raw) ? (raw as LegacyProfileInput) : {};

  const id = typeof rawObj.id === "string" ? rawObj.id : "stud_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
  const name = typeof rawObj.name === "string" ? rawObj.name.trim() : "";
  const createdAt = typeof rawObj.createdAt === "string" ? rawObj.createdAt : now;
  const updatedAt = typeof rawObj.updatedAt === "string" ? rawObj.updatedAt : now;

  let rawSubject = rawObj.activeSubject;
  if (rawSubject === undefined || rawSubject === null) {
    rawSubject = rawObj.subject;
  }
  const activeSubject = getValidatedSubject(rawSubject);

  let rawOnboarded = rawObj.onboardingCompleted;
  if (rawOnboarded === undefined || rawOnboarded === null) {
    rawOnboarded = rawObj.onboarded;
  }
  let onboardingCompleted = typeof rawOnboarded === "boolean" ? rawOnboarded : false;

  const grade = getValidatedGrade(rawObj.grade);
  let stream = getValidatedStream(rawObj.stream);
  const level = getValidatedLevel(rawObj.level);

  if (grade === "9") {
    stream = "general";
  } else {
    if (stream !== "scientific" && stream !== "literary") {
      stream = "general";
      onboardingCompleted = false;
    }
  }

  const rawRecord = rawObj as Record<string, unknown>;
  const authoritative = typeof rawRecord.authoritative === "boolean" ? rawRecord.authoritative : false;
  const source: "guest-local" | "server-authoritative" = rawRecord.source === "server-authoritative" ? "server-authoritative" : "guest-local";
  const isStale = typeof rawRecord.isStale === "boolean" ? rawRecord.isStale : undefined;

  const migrated: StudentProfile = {
    id,
    name,
    grade,
    stream,
    activeSubject,
    level,
    onboardingCompleted,
    createdAt,
    updatedAt,
    authoritative,
    source,
    isStale,
  };

  if (isBrowser) {
    try {
      // Local storage cannot preserve authoritative=true. Store downgraded version in localStorage.
      const storageProfile = {
        ...migrated,
        authoritative: false,
        source: "guest-local" as const,
        isStale: migrated.authoritative || migrated.source === "server-authoritative" ? true : migrated.isStale,
      };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(storageProfile));
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
    const profile = migrateStudentProfile(raw);
    if (profile.authoritative || profile.source === "server-authoritative") {
      return {
        ...profile,
        authoritative: false,
        source: "guest-local",
        isStale: true,
      };
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
    const profileToSave: StudentProfile = {
      ...profile,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profileToSave));

    if (isFirebaseConfigured()) {
      const auth = getFirebaseAuth();
      const db = getFirestoreDb();
      if (auth && db && auth.currentUser && !auth.currentUser.isAnonymous && profile.id === auth.currentUser.uid) {
        setDoc(doc(db, "students", profile.id), profileToSave).catch((e) => {
          console.warn("Firestore profile backup unavailable:", e);
        });
      }
    }
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

export function createGuestStudentProfile(draft: StudentProfileDraft, customId?: string): StudentProfile {
  const now = new Date().toISOString();
  const uniqueId = customId || "stud_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();

  const grade = draft.grade;
  let stream = draft.stream;
  if (grade === "9") {
    stream = "general";
  } else {
    if (stream !== "scientific" && stream !== "literary") {
      throw new TypeError(`Invalid academic stream "${stream}" for Grade ${grade}: stream must be either "scientific" or "literary"`);
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
    updatedAt: now,
    authoritative: false,
    source: "guest-local",
  };

  saveStudentProfile(profile);
  return profile;
}

export function createVerifiedStudentProfile(identity: VerifiedIdentity, serverData: StudentProfileDraft): StudentProfile {
  if (!identity || !identity.verifiedUid || identity.isAnonymous !== false) {
    throw new Error("Cannot create verified student profile without verified non-anonymous identity");
  }

  const now = new Date().toISOString();
  const grade = serverData.grade;
  let stream = serverData.stream;
  if (grade === "9") {
    stream = "general";
  } else {
    if (stream !== "scientific" && stream !== "literary") {
      throw new TypeError(`Invalid academic stream "${stream}" for Grade ${grade}: stream must be either "scientific" or "literary"`);
    }
  }

  const profile: StudentProfile = {
    id: identity.verifiedUid,
    name: serverData.name.trim(),
    grade,
    stream,
    activeSubject: serverData.activeSubject,
    level: serverData.level,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
    authoritative: true,
    source: "server-authoritative",
  };

  return profile;
}

export function createStudentProfile(draft: StudentProfileDraft, customId?: string): StudentProfile {
  return createGuestStudentProfile(draft, customId);
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
      throw new TypeError(`Invalid academic stream "${stream}" for Grade ${grade}: stream must be either "scientific" or "literary"`);
    }
  }

  const updatedProfile: StudentProfile = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    grade,
    stream,
    activeSubject: updates.activeSubject !== undefined ? updates.activeSubject : current.activeSubject,
    level: updates.level !== undefined ? updates.level : current.level,
    updatedAt: new Date().toISOString(),
  };

  saveStudentProfile(updatedProfile);
  return updatedProfile;
}
