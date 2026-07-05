import { useState } from "react";
import { StudentProfile, StudentProfileDraft, StudentGrade, AcademicStream, SubjectKey, StudentLevel } from "./studentTypes.ts";
import { getStudentProfile, deleteStudentProfile, createStudentProfile, updateStudentProfile } from "./studentStorage.ts";
import { getValidatedGrade, getValidatedStream, getValidatedSubject, getValidatedLevel, sanitizeStudentName } from "./studentDefaults.ts";
import { ZanaStorage } from "../../services/storage.ts";

export function useStudentProfile() {
  const [profile, setProfileState] = useState<StudentProfile>(() => {
    const saved = getStudentProfile();
    if (saved) return saved;
    
    // Default initial guest profile
    return {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "general",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const isOnboarded = profile.onboardingCompleted;

  const createProfile = (draft: StudentProfileDraft): StudentProfile => {
    const validatedGrade = getValidatedGrade(draft.grade);
    let validatedStream = getValidatedStream(draft.stream);
    
    if (validatedGrade === "9") {
      validatedStream = "general";
    } else {
      if (validatedStream !== "scientific" && validatedStream !== "literary") {
        validatedStream = "scientific";
      }
    }

    const validatedDraft: StudentProfileDraft = {
      name: sanitizeStudentName(draft.name),
      grade: validatedGrade,
      stream: validatedStream,
      activeSubject: getValidatedSubject(draft.activeSubject),
      level: getValidatedLevel(draft.level)
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

      if (updates.stream !== undefined) {
        mappedUpdates.stream = getValidatedStream(updates.stream);
      }

      // Enforce rules on update too
      if (nextGrade === "9") {
        mappedUpdates.stream = "general";
      } else if (mappedUpdates.stream !== undefined) {
        if (mappedUpdates.stream !== "scientific" && mappedUpdates.stream !== "literary") {
          mappedUpdates.stream = "scientific";
        }
      } else {
        // stream was not updated, check current stream
        if (prev.stream !== "scientific" && prev.stream !== "literary") {
          mappedUpdates.stream = "scientific";
        }
      }
      
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
      stream: "general",
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
      stream: "general",
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
      stream: "general",
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
    resetProfile
  };
}
