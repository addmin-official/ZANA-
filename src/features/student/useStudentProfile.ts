import { useState, useEffect } from "react";
import { StudentProfile } from "./studentTypes.ts";
import { ZanaStorage } from "../../services/storage.ts";

export function useStudentProfile() {
  const [profile, setProfileState] = useState<StudentProfile>(() => ZanaStorage.getProfile());

  const updateProfile = (updates: Partial<StudentProfile>) => {
    setProfileState((prev) => {
      const updated = { ...prev, ...updates };
      ZanaStorage.saveProfile(updated);
      return updated;
    });
  };

  const completeOnboarding = (name: string, grade: string, subject: string, level: string) => {
    const newProfile: StudentProfile = {
      name,
      grade,
      subject,
      level,
      onboarded: true
    };
    ZanaStorage.saveProfile(newProfile);
    setProfileState(newProfile);
    // Increment session for onboarding first experience
    ZanaStorage.incrementSessions();
  };

  const resetProfile = () => {
    ZanaStorage.clearAllData();
    const defaultProfile: StudentProfile = {
      name: "",
      grade: "12",
      subject: "math",
      level: "مامناوەند",
      onboarded: false
    };
    setProfileState(defaultProfile);
  };

  return {
    profile,
    updateProfile,
    completeOnboarding,
    resetProfile
  };
}
