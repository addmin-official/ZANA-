import { useState, useEffect } from "react";
import { StudentProfile, StudentProfileDraft, StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "./studentTypes.ts";
import { getStudentProfile, deleteStudentProfile, createStudentProfile, updateStudentProfile, saveStudentProfile } from "./studentStorage.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel, sanitizeStudentName } from "./studentDefaults.ts";
import { ZanaStorage } from "../../services/storage.ts";
import { db, auth } from "../../services/firebase.ts";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";

export function useStudentProfile() {
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [profile, setProfileState] = useState<StudentProfile>(() => {
    const saved = getStudentProfile();
    if (saved) return saved;
    
    // Default initial guest profile
    return {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "scientific",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  // Synced state on Firebase Auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsOfflineFallback(false);
        setAuthError(null);
        // Authenticated! Check/Sync with Firestore
        const docRef = doc(db, "students", user.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const cloudProfile = docSnap.data() as StudentProfile;
            setProfileState(cloudProfile);
            saveStudentProfile(cloudProfile);
          } else {
            // Document doesn't exist in Firestore. Let's see if we have a legacy profile to migrate
            const saved = getStudentProfile();
            if (saved && saved.onboardingCompleted) {
              const migratedProfile: StudentProfile = {
                ...saved,
                id: user.uid,
                updatedAt: new Date().toISOString()
              };
              setProfileState(migratedProfile);
              saveStudentProfile(migratedProfile);
              await setDoc(docRef, migratedProfile);
            }
          }
        } catch (e) {
          console.error("Error syncing student profile with Firestore:", e);
        }
      } else {
        signInAnonymously(auth).catch((err) => {
          setIsOfflineFallback(true);
          // If anonymous authentication is disabled/restricted in the Firebase Console (auth/admin-restricted-operation),
          // the application will gracefully run in offline/localStorage mode. We log this as a warning instead of a fatal error.
          if (err && (err.code === "auth/admin-restricted-operation" || err.message?.includes("admin-restricted-operation"))) {
            console.warn("Firebase Anonymous Sign-In is restricted/disabled. Falling back to local guest session.");
            setAuthError("Firebase Anonymous Sign-In is restricted or disabled. Running in limited offline guest session.");
          } else {
            console.error("Firebase Auth anonymous sign-in failed:", err);
            setAuthError(`Firebase Auth anonymous sign-in failed: ${err.message || err}. Running in limited offline guest session.`);
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
      level: getValidatedLevel(draft.level)
    };
    
    const firebaseUid = auth.currentUser?.uid;
    const newProfile = createStudentProfile(validatedDraft, firebaseUid || undefined);
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

      // Enforce rules on update too
      if (nextGrade === "9") {
        stream = "general";
      } else {
        if (stream !== "scientific" && stream !== "literary") {
          throw new TypeError(`Invalid academic stream "${stream}" for Grade ${nextGrade}: stream must be either "scientific" or "literary"`);
        }
      }
      mappedUpdates.stream = stream;
      
      // Support both activeSubject and legacy subject key safely
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
      updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
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

  // Backward compatibility methods for existing callers
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
      level: validatedLevel
    });
    
    // Increment session counter for onboarding complete
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
      updatedAt: new Date().toISOString()
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
    authError
  };
}
