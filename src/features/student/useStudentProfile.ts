import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from "../../services/firebase.ts";
import { ZanaStorage } from "../../services/storage.ts";
import {
  getValidatedGrade,
  getValidatedLevel,
  getValidatedStream,
  getValidatedSubject,
  sanitizeStudentName,
} from "./studentDefaults.ts";
import {
  createStudentProfile,
  createVerifiedStudentProfile,
  deleteStudentProfile,
  getStudentProfile,
  parseServerProfileDocument,
  saveStudentProfile,
  updateStudentProfile,
} from "./studentStorage.ts";
import {
  AcademicStream,
  StudentGrade,
  StudentLevel,
  StudentProfile,
  StudentProfileDraft,
  SubjectKey,
  VerifiedIdentity,
} from "./studentTypes.ts";

interface LegacyUpdateFields {
  subject?: string;
  onboarded?: boolean;
}

function createDefaultGuestProfile(): StudentProfile {
  const now = new Date().toISOString();
  return {
    id: "default-guest",
    name: "",
    grade: "12",
    stream: "scientific",
    activeSubject: "math",
    level: "intermediate",
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
    authoritative: false,
    source: "guest-local",
  };
}

function toServerProfileDocument(profile: StudentProfile) {
  return {
    id: profile.id,
    name: profile.name,
    grade: profile.grade,
    stream: profile.stream,
    activeSubject: profile.activeSubject,
    level: profile.level,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function useStudentProfile() {
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfileState] = useState<StudentProfile>(
    () => getStudentProfile() ?? createDefaultGuestProfile(),
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setIsOfflineFallback(true);
      setAuthError("پەیوەندی هەژمار لە ئێستادا بەردەست نییە؛ داتاکانت بە شێوەی ناوخۆیی پارێزراون.");
      return;
    }

    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    if (!auth || !db) {
      setIsOfflineFallback(true);
      setAuthError("پەیوەندی هەژمار لە ئێستادا بەردەست نییە.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        void signInAnonymously(auth).catch(() => {
          setIsOfflineFallback(true);
          setAuthError("چوونەژوورەوەی میوان سەرکەوتوو نەبوو؛ دۆخی ناوخۆیی بەردەوامە.");
        });
        return;
      }

      if (user.isAnonymous) {
        setIsOfflineFallback(false);
        setAuthError(null);
        setProfileState((current) => ({
          ...current,
          authoritative: false,
          source: "guest-local",
        }));
        return;
      }

      void (async () => {
        const documentReference = doc(db, "students", user.uid);
        try {
          const documentSnapshot = await getDoc(documentReference);
          const identity: VerifiedIdentity = {
            verifiedUid: user.uid,
            isAnonymous: false,
            email: user.email,
          };

          if (documentSnapshot.exists()) {
            const serverDraft = parseServerProfileDocument(documentSnapshot.data());
            const verifiedProfile = createVerifiedStudentProfile(identity, serverDraft);
            saveStudentProfile(verifiedProfile);
            setProfileState(verifiedProfile);
          } else {
            const localProfile = getStudentProfile();
            if (localProfile?.onboardingCompleted) {
              const draft: StudentProfileDraft = {
                name: localProfile.name,
                grade: localProfile.grade,
                stream: localProfile.stream,
                activeSubject: localProfile.activeSubject,
                level: localProfile.level,
              };
              const candidate = createVerifiedStudentProfile(identity, draft);

              // Authority is granted only after this server write succeeds.
              await setDoc(documentReference, toServerProfileDocument(candidate));
              saveStudentProfile(candidate);
              setProfileState(candidate);
            }
          }

          setIsOfflineFallback(false);
          setAuthError(null);
        } catch {
          setIsOfflineFallback(true);
          setAuthError("هاوکاتکردنی هەژمار سەرکەوتوو نەبوو؛ داتای ناوخۆیی تەنها بۆ خوێندنەوە بەردەستە.");
          setProfileState((current) => ({
            ...current,
            authoritative: false,
            source: "guest-local",
            isStale: true,
          }));
        }
      })();
    });

    return unsubscribe;
  }, []);

  const persistVerifiedProfile = (nextProfile: StudentProfile) => {
    if (!nextProfile.authoritative) return;

    const auth = getFirebaseAuth();
    const db = getFirestoreDb();
    const user = auth?.currentUser;
    if (!db || !user || user.isAnonymous || user.uid !== nextProfile.id) {
      setIsOfflineFallback(true);
      setAuthError("گۆڕانکارییەکە تەنها بە شێوەی ناوخۆیی پارێزرا؛ ناسنامە پشتڕاست نەکراوەتەوە.");
      return;
    }

    void setDoc(
      doc(db, "students", user.uid),
      toServerProfileDocument(nextProfile),
      { merge: true },
    ).then(() => {
      setIsOfflineFallback(false);
      setAuthError(null);
    }).catch(() => {
      setIsOfflineFallback(true);
      setAuthError("گۆڕانکارییەکە لەسەر هەژمار پاشەکەوت نەکرا؛ داتای ناوخۆیی پارێزراوە.");
    });
  };

  const createProfile = (draft: StudentProfileDraft): StudentProfile => {
    const grade = getValidatedGrade(draft.grade);
    let stream = draft.stream;
    if (grade === "9") {
      stream = "general";
    } else if (stream !== "scientific" && stream !== "literary") {
      throw new TypeError("لقی خوێندن بۆ ئەم پۆلە دروست نییە.");
    }

    const validatedDraft: StudentProfileDraft = {
      name: sanitizeStudentName(draft.name),
      grade,
      stream,
      activeSubject: getValidatedSubject(draft.activeSubject),
      level: getValidatedLevel(draft.level),
    };
    const nextProfile = createStudentProfile(validatedDraft);
    setProfileState(nextProfile);
    return nextProfile;
  };

  const updateProfile = (
    updates: Partial<StudentProfileDraft | StudentProfile> & LegacyUpdateFields,
  ) => {
    const mappedUpdates: Partial<StudentProfileDraft> = {};
    if (updates.name !== undefined) mappedUpdates.name = sanitizeStudentName(updates.name);

    const nextGrade = updates.grade !== undefined
      ? getValidatedGrade(updates.grade)
      : profile.grade;
    if (updates.grade !== undefined) mappedUpdates.grade = nextGrade;

    let stream = updates.stream ?? profile.stream;
    if (nextGrade === "9") {
      stream = "general";
    } else if (stream !== "scientific" && stream !== "literary") {
      throw new TypeError("لقی خوێندن بۆ ئەم پۆلە دروست نییە.");
    }
    mappedUpdates.stream = stream;

    const rawSubject = updates.activeSubject ?? updates.subject;
    if (rawSubject !== undefined) {
      mappedUpdates.activeSubject = getValidatedSubject(rawSubject);
    }
    if (updates.level !== undefined) {
      mappedUpdates.level = getValidatedLevel(updates.level);
    }

    const nextProfile = updateStudentProfile(profile, mappedUpdates);
    setProfileState(nextProfile);
    persistVerifiedProfile(nextProfile);
  };

  const resetToGuest = () => {
    deleteStudentProfile();
    setProfileState(createDefaultGuestProfile());
    setAuthError(null);
  };

  const completeOnboarding = (
    name: string,
    grade: string,
    subject: string,
    level: string,
    stream?: string,
  ) => {
    const nextProfile = createProfile({
      name,
      grade: getValidatedGrade(grade),
      stream: getValidatedStream(stream),
      activeSubject: getValidatedSubject(subject),
      level: getValidatedLevel(level),
    });
    ZanaStorage.incrementSessions();
    return nextProfile;
  };

  const resetProfile = () => {
    ZanaStorage.clearAllData();
    setProfileState(createDefaultGuestProfile());
    setAuthError(null);
  };

  return {
    profile,
    isOnboarded: profile.onboardingCompleted,
    createProfile,
    updateProfile,
    deleteProfile: resetToGuest,
    resetProfileOnly: resetToGuest,
    setActiveSubject: (subject: SubjectKey) => updateProfile({ activeSubject: subject }),
    setLevel: (level: StudentLevel) => updateProfile({ level }),
    setGrade: (grade: StudentGrade) => updateProfile({ grade }),
    setStream: (stream: AcademicStream) => updateProfile({ stream }),
    completeOnboarding,
    resetProfile,
    isOfflineFallback,
    authError,
  };
}
