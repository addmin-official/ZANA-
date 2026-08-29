import { useState, useEffect } from "react";
import { StudentProfile, StudentProfileDraft, StudentGrade, AcademicStream, SubjectKey, StudentLevel, VerifiedIdentity } from "./studentTypes.ts";
import { getStudentProfile, deleteStudentProfile, createStudentProfile, createVerifiedStudentProfile, updateStudentProfile, saveStudentProfile, parseServerProfileDocument } from "./studentStorage.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel, sanitizeStudentName } from "./studentDefaults.ts";
import { ZanaStorage } from "../../services/storage.ts";
import { getFirestoreDb, getFirebaseAuth, isFirebaseConfigured } from "../../services/firebase.ts";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export function useStudentProfile() {
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(
    () => !isFirebaseConfigured() || !getFirebaseAuth() || !getFirestoreDb()
  );
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfileState] = useState<StudentProfile>(() => {
    const saved = getStudentProfile();
    if (saved) return saved;

    return {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "scientific",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authoritative: false,
      source: "guest-local",
    };
  });

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const auth = getFirebaseAuth();
    const db = getFirestoreDb();

    if (!auth || !db) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsOfflineFallback(false);
        setAuthError(null);

        // Anonymous users are NEVER granted server authority
        if (user.isAnonymous) {
          setProfileState((prev) => ({
            ...prev,
            id: user.uid,
            authoritative: false,
            source: "guest-local",
          }));
          return;
        }

        const docRef = doc(db, "students", user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const rawData = docSnap.data();
            const serverDraft = parseServerProfileDocument(rawData);
            const identity: VerifiedIdentity = {
              verifiedUid: user.uid,
              isAnonymous: false,
              email: user.email,
            };
            const cloudProfile = createVerifiedStudentProfile(identity, serverDraft);
            saveStudentProfile(cloudProfile);
            setProfileState(cloudProfile);
          } else {
            const saved = getStudentProfile();
            if (saved && saved.onboardingCompleted) {
              const identity: VerifiedIdentity = {
                verifiedUid: user.uid,
                isAnonymous: false,
                email: user.email,
              };
              const draftToUpload: StudentProfileDraft = {
                name: saved.name,
                grade: saved.grade,
                stream: saved.stream,
                activeSubject: saved.activeSubject,
                level: saved.level,
              };
              // Write only allowed profile fields to Firestore
              await setDoc(docRef, {
                id: user.uid,
                name: draftToUpload.name,
                grade: draftToUpload.grade,
                stream: draftToUpload.stream,
                activeSubject: draftToUpload.activeSubject,
                level: draftToUpload.level,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              // Only after setDoc succeeds do we grant authority
              const verifiedProfile = createVerifiedStudentProfile(identity, draftToUpload);
              saveStudentProfile(verifiedProfile);
              setProfileState(verifiedProfile);
            }
          }
        } catch (e) {
          console.warn("Firestore student profile sync unavailable, running in guest mode:", e);
          setIsOfflineFallback(true);
        }
      } else {
        signInAnonymously(auth).catch((err: unknown) => {
          setIsOfflineFallback(true);
          const errCode = (err && typeof err === "object" && "code" in err) ? String((err as { code: unknown }).code) : "";
          if (errCode === "auth/admin-restricted-operation" || String(err).includes("admin-restricted-operation")) {
            console.info("Firebase Auth admin-restricted-operation caught: switching smoothly to local offline demo mode with seeded student data.");
          } else {
            console.warn("Firebase Auth anonymous sign-in unavailable, running in local guest mode:", (err as Error)?.message || err);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const isOnboarded = profile.onboardingCompleted;

  const createProfile = (draft: StudentProfileDraft): StudentProfile => {
    const validatedGrade = getValidatedGrade(draft.grade);
    let stream = draft.stream;

    if (validatedGrade === "9") {
      stream = "general";
    } else {
      if (stream !== "scientific" && stream !== "literary") {
        throw new TypeError(`Invalid academic stream "${stream}" for Grade ${validatedGrade}: stream must be either "scientific" or "literary"`);
      }
    }

    const validatedDraft: StudentProfileDraft = {
      name: sanitizeStudentName(draft.name),
      grade: validatedGrade,
      stream,
      activeSubject: getValidatedSubject(draft.activeSubject),
      level: getValidatedLevel(draft.level),
    };

    const newProfile = createStudentProfile(validatedDraft);
    setProfileState(newProfile);
    return newProfile;
  };

  interface LegacyUpdateFields {
    subject?: string;
    onboarded?: boolean;
  }

  const updateProfile = (updates: Partial<StudentProfileDraft | StudentProfile> & LegacyUpdateFields) => {
    setProfileState((prev) => {
      const mappedUpdates: Partial<StudentProfileDraft> = {};
      if (updates.name !== undefined) mappedUpdates.name = sanitizeStudentName(updates.name);

      let nextGrade = prev.grade;
      if (updates.grade !== undefined) {
        nextGrade = getValidatedGrade(updates.grade);
        mappedUpdates.grade = nextGrade;
      }

      let stream = updates.stream !== undefined ? updates.stream : prev.stream;

      if (nextGrade === "9") {
        stream = "general";
      } else {
        if (stream !== "scientific" && stream !== "literary") {
          throw new TypeError(`Invalid academic stream "${stream}" for Grade ${nextGrade}: stream must be either "scientific" or "literary"`);
        }
      }
      mappedUpdates.stream = stream;

      const rawSubject = updates.activeSubject !== undefined ? updates.activeSubject : updates.subject;
      if (rawSubject !== undefined) mappedUpdates.activeSubject = getValidatedSubject(rawSubject);

      const lvl = updates.level !== undefined ? updates.level : undefined;
      if (lvl !== undefined) mappedUpdates.level = getValidatedLevel(lvl);

      const updated = updateStudentProfile(prev, mappedUpdates);
      return updated;
    });
  };

  const deleteProfile = () => {
    deleteStudentProfile();
    const guest: StudentProfile = {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "scientific",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authoritative: false,
      source: "guest-local",
    };
    setProfileState(guest);
  };

  const resetProfileOnly = () => {
    deleteStudentProfile();
    const guest: StudentProfile = {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "scientific",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authoritative: false,
      source: "guest-local",
    };
    setProfileState(guest);
  };

  const setActiveSubject = (subject: SubjectKey) => {
    updateProfile({ activeSubject: subject });
  };

  const setLevel = (level: StudentLevel) => {
    updateProfile({ level });
  };

  const setGrade = (grade: StudentGrade) => {
    updateProfile({ grade });
  };

  const setStream = (stream: AcademicStream) => {
    updateProfile({ stream });
  };

  const completeOnboarding = (name: string, grade: string, subject: string, level: string, stream?: string) => {
    const validatedGrade = getValidatedGrade(grade);
    const validatedSubject = getValidatedSubject(subject);
    const validatedLevel = getValidatedLevel(level);
    const validatedStream = getValidatedStream(stream);

    const newProfile = createProfile({
      name,
      grade: validatedGrade,
      stream: validatedStream,
      activeSubject: validatedSubject,
      level: validatedLevel,
    });

    ZanaStorage.incrementSessions();
    return newProfile;
  };

  const resetProfile = () => {
    ZanaStorage.clearAllData();
    const guest: StudentProfile = {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "scientific",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      authoritative: false,
      source: "guest-local",
    };
    setProfileState(guest);
  };

  return {
    profile,
    isOnboarded,
    createProfile,
    updateProfile,
    deleteProfile,
    resetProfileOnly,
    setActiveSubject,
    setLevel,
    setGrade,
    setStream,
    completeOnboarding,
    resetProfile,
    isOfflineFallback,
    authError,
  };
}
