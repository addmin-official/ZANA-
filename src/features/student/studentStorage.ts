import {
  AcademicStream,
  StudentGrade,
  StudentLevel,
  StudentProfile,
  StudentProfileDraft,
  SubjectKey,
  VerifiedIdentity,
} from "./studentTypes.ts";
import {
  getValidatedGrade,
  getValidatedLevel,
  getValidatedStream,
  getValidatedSubject,
} from "./studentDefaults.ts";

const PROFILE_KEY = "zana:student-profile";
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const VALID_GRADES: readonly StudentGrade[] = ["9", "10", "11", "12"];
const VALID_STREAMS: readonly AcademicStream[] = ["scientific", "literary", "general"];
const VALID_SUBJECTS: readonly SubjectKey[] = ["math", "physics", "chemistry", "english"];
const VALID_LEVELS: readonly StudentLevel[] = ["beginner", "intermediate", "advanced"];

interface LegacyProfileInput {
  id?: unknown;
  name?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  activeSubject?: unknown;
  subject?: unknown;
  onboardingCompleted?: unknown;
  onboarded?: unknown;
  grade?: unknown;
  stream?: unknown;
  level?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createGuestId(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `stud_${randomId}` : `stud_${Date.now().toString(36)}`;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function toLocalProfile(profile: StudentProfile): StudentProfile {
  return {
    ...profile,
    authoritative: false,
    source: "guest-local",
    isStale: profile.authoritative ? true : undefined,
  };
}

export function parseServerProfileDocument(raw: unknown): StudentProfileDraft {
  if (!isRecord(raw)) {
    throw new Error("Invalid server profile document");
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name || name.length > 100) {
    throw new Error("Invalid server profile name");
  }
  if (!isOneOf(raw.grade, VALID_GRADES)) {
    throw new Error("Invalid server profile grade");
  }
  if (!isOneOf(raw.stream, VALID_STREAMS)) {
    throw new Error("Invalid server profile stream");
  }
  if (!isOneOf(raw.activeSubject, VALID_SUBJECTS)) {
    throw new Error("Invalid server profile subject");
  }
  if (!isOneOf(raw.level, VALID_LEVELS)) {
    throw new Error("Invalid server profile level");
  }

  const stream: AcademicStream = raw.grade === "9" ? "general" : raw.stream;
  if (raw.grade !== "9" && stream !== "scientific" && stream !== "literary") {
    throw new Error("Invalid academic stream for server profile grade");
  }

  return {
    name,
    grade: raw.grade,
    stream,
    activeSubject: raw.activeSubject,
    level: raw.level,
  };
}

export function migrateStudentProfile(raw: unknown): StudentProfile {
  const now = new Date().toISOString();
  const rawObject: LegacyProfileInput = isRecord(raw) ? raw : {};

  const grade = getValidatedGrade(rawObject.grade);
  let stream = getValidatedStream(rawObject.stream);
  let onboardingCompleted = typeof rawObject.onboardingCompleted === "boolean"
    ? rawObject.onboardingCompleted
    : typeof rawObject.onboarded === "boolean"
      ? rawObject.onboarded
      : false;

  if (grade === "9") {
    stream = "general";
  } else if (stream !== "scientific" && stream !== "literary") {
    stream = "general";
    onboardingCompleted = false;
  }

  const migrated: StudentProfile = {
    id: typeof rawObject.id === "string" && rawObject.id.trim()
      ? rawObject.id.trim()
      : createGuestId(),
    name: typeof rawObject.name === "string" ? rawObject.name.trim() : "",
    grade,
    stream,
    activeSubject: getValidatedSubject(rawObject.activeSubject ?? rawObject.subject),
    level: getValidatedLevel(rawObject.level),
    onboardingCompleted,
    createdAt: typeof rawObject.createdAt === "string" ? rawObject.createdAt : now,
    updatedAt: typeof rawObject.updatedAt === "string" ? rawObject.updatedAt : now,
    authoritative: false,
    source: "guest-local",
  };

  if (isBrowser) {
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
    } catch {
      // Local persistence is best-effort and must not alter authority.
    }
  }

  return migrated;
}

export function getStudentProfile(): StudentProfile | null {
  if (!isBrowser) return null;

  try {
    const value = window.localStorage.getItem(PROFILE_KEY);
    return value ? migrateStudentProfile(JSON.parse(value) as unknown) : null;
  } catch {
    return null;
  }
}

export function saveStudentProfile(profile: StudentProfile): void {
  if (!isBrowser) return;

  const localProfile = toLocalProfile({
    ...profile,
    updatedAt: new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(localProfile));
  } catch {
    // Local persistence is best-effort and must not alter authority.
  }
}

export function deleteStudentProfile(): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    // A storage failure must not crash logout/reset flows.
  }
}

export function createGuestStudentProfile(
  draft: StudentProfileDraft,
  customId?: string,
): StudentProfile {
  const now = new Date().toISOString();
  const grade = draft.grade;
  let stream = draft.stream;

  if (grade === "9") {
    stream = "general";
  } else if (stream !== "scientific" && stream !== "literary") {
    throw new TypeError("Invalid academic stream for grade");
  }

  const profile: StudentProfile = {
    id: customId?.trim() || createGuestId(),
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

export function createVerifiedStudentProfile(
  identity: VerifiedIdentity,
  serverData: StudentProfileDraft,
): StudentProfile {
  if (!identity.verifiedUid.trim() || identity.isAnonymous !== false) {
    throw new Error("Verified non-anonymous identity is required");
  }

  const now = new Date().toISOString();
  const grade = serverData.grade;
  const stream: AcademicStream = grade === "9" ? "general" : serverData.stream;

  if (grade !== "9" && stream !== "scientific" && stream !== "literary") {
    throw new TypeError("Invalid academic stream for verified profile");
  }

  return {
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
}

export function createStudentProfile(
  draft: StudentProfileDraft,
  customId?: string,
): StudentProfile {
  return createGuestStudentProfile(draft, customId);
}

export function updateStudentProfile(
  current: StudentProfile,
  updates: Partial<StudentProfileDraft>,
): StudentProfile {
  const grade = updates.grade ?? current.grade;
  let stream = updates.stream ?? current.stream;

  if (grade === "9") {
    stream = "general";
  } else if (stream !== "scientific" && stream !== "literary") {
    throw new TypeError("Invalid academic stream for grade");
  }

  const updatedProfile: StudentProfile = {
    ...current,
    name: updates.name !== undefined ? updates.name.trim() : current.name,
    grade,
    stream,
    activeSubject: updates.activeSubject ?? current.activeSubject,
    level: updates.level ?? current.level,
    updatedAt: new Date().toISOString(),
  };

  saveStudentProfile(updatedProfile);
  return updatedProfile;
}
