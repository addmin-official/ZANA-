import { StudentProfile } from "../features/student/studentTypes.ts";
export type { StudentProfile };
import { getStudentProfile, saveStudentProfile, deleteStudentProfile } from "../features/student/studentStorage.ts";

export interface ChatMessage {
  id: string;
  sender: "user" | "zana";
  text: string;
  timestamp: string;
  isEducational?: boolean;
}

export interface AssessmentState {
  id: string;
  subject: string;
  grade: string;
  currentQuestion: number; // 1 to 5
  totalQuestions: number; // 5
  questions: string[];
  answers: string[];
  feedbacks: string[];
  correctAnswers: boolean[];
  completed: boolean;
  finalLevel: string | null;
}

export interface ProgressState {
  totalSessions: number;
  weeklyQuestionCount: number;
  currentProgressPercent: number;
  weakAreas: string[];
  recommendation: string | null;
}

const STORAGE_KEYS = {
  CHAT_MESSAGES_PREFIX: "zana:chat-messages:",
  ASSESSMENT_STATE: "zana:assessment-state",
  PROGRESS_STATE: "zana:progress-state"
};

const DEFAULT_PROGRESS: ProgressState = {
  totalSessions: 0,
  weeklyQuestionCount: 0,
  currentProgressPercent: 0,
  weakAreas: [],
  recommendation: null
};

// Check if localStorage is available and we are running in browser
const isBrowser = typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export function safeGet<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error reading key "${key}" from localStorage:`, error);
    return fallback;
  }
}

export function safeSet<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key "${key}" to localStorage:`, error);
  }
}

export function safeRemove(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing key "${key}" from localStorage:`, error);
  }
}

export function safeClearByPrefix(prefix: string): void {
  if (!isBrowser) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Error clearing keys with prefix "${prefix}" from localStorage:`, error);
  }
}

export const ZanaStorage = {
  // Profile
  getProfile(): StudentProfile {
    const profile = getStudentProfile();
    if (profile) return profile;

    // Fallback default profile
    return {
      id: "default-guest",
      name: "",
      grade: "12",
      stream: "general",
      activeSubject: "math",
      level: "intermediate",
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Backward compatibility fields
      subject: "math",
      onboarded: false
    };
  },

  saveProfile(profile: StudentProfile): void {
    saveStudentProfile(profile);
  },

  // Chat
  getChatMessages(subjectId: string): ChatMessage[] {
    const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
    return safeGet<ChatMessage[]>(key, []);
  },

  saveChatMessages(subjectId: string, messages: ChatMessage[]): void {
    const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
    safeSet<ChatMessage[]>(key, messages);
  },

  clearChatMessages(subjectId: string): void {
    const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
    safeRemove(key);
  },

  // Assessment
  getAssessment(): AssessmentState | null {
    return safeGet<AssessmentState | null>(STORAGE_KEYS.ASSESSMENT_STATE, null);
  },

  saveAssessment(state: AssessmentState): void {
    safeSet<AssessmentState>(STORAGE_KEYS.ASSESSMENT_STATE, state);
  },

  clearAssessment(): void {
    safeRemove(STORAGE_KEYS.ASSESSMENT_STATE);
  },

  // Progress
  getProgress(): ProgressState {
    return safeGet<ProgressState>(STORAGE_KEYS.PROGRESS_STATE, DEFAULT_PROGRESS);
  },

  saveProgress(progress: ProgressState): void {
    safeSet<ProgressState>(STORAGE_KEYS.PROGRESS_STATE, progress);
  },

  incrementSessions(): void {
    const progress = this.getProgress();
    progress.totalSessions += 1;
    this.saveProgress(progress);
  },

  incrementQuestions(count = 1): void {
    const progress = this.getProgress();
    progress.weeklyQuestionCount += count;
    progress.currentProgressPercent = Math.min(100, progress.currentProgressPercent + Math.round(count * 2.5));
    this.saveProgress(progress);
  },

  // Global Clean Up
  clearAllData(): void {
    deleteStudentProfile();
    safeClearByPrefix("zana:");
  }
};
