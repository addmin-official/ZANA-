export interface StudentProfile {
  name: string;
  grade: string; // "9" | "10" | "11" | "12"
  subject: string; // "math" | "physics" | "chemistry" | "english" (internal key)
  level: string; // "سەرەتا" | "مامناوەند" | "پێشکەوتوو"
  onboarded: boolean;
}

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
  PROFILE: "zana_student_profile",
  CHAT_MESSAGES_PREFIX: "zana_chat_messages_",
  ASSESSMENT_STATE: "zana_assessment_state",
  PROGRESS_STATE: "zana_progress_state"
};

const DEFAULT_PROFILE: StudentProfile = {
  name: "",
  grade: "12",
  subject: "math",
  level: "مامناوەند",
  onboarded: false
};

const DEFAULT_PROGRESS: ProgressState = {
  totalSessions: 0,
  weeklyQuestionCount: 0,
  currentProgressPercent: 0,
  weakAreas: [],
  recommendation: null
};

export const ZanaStorage = {
  // Profile
  getProfile(): StudentProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading profile", e);
    }
    return { ...DEFAULT_PROFILE };
  },

  saveProfile(profile: StudentProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error("Error saving profile", e);
    }
  },

  // Chat
  getChatMessages(subjectId: string): ChatMessage[] {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading chat messages", e);
    }
    return [];
  },

  saveChatMessages(subjectId: string, messages: ChatMessage[]): void {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (e) {
      console.error("Error saving chat messages", e);
    }
  },

  clearChatMessages(subjectId: string): void {
    try {
      const key = `${STORAGE_KEYS.CHAT_MESSAGES_PREFIX}${subjectId}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Error clearing chat messages", e);
    }
  },

  // Assessment
  getAssessment(): AssessmentState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ASSESSMENT_STATE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading assessment state", e);
    }
    return null;
  },

  saveAssessment(state: AssessmentState): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSESSMENT_STATE, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving assessment state", e);
    }
  },

  clearAssessment(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ASSESSMENT_STATE);
    } catch (e) {
      console.error("Error clearing assessment state", e);
    }
  },

  // Progress
  getProgress(): ProgressState {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROGRESS_STATE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading progress state", e);
    }
    return { ...DEFAULT_PROGRESS };
  },

  saveProgress(progress: ProgressState): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS_STATE, JSON.stringify(progress));
    } catch (e) {
      console.error("Error saving progress state", e);
    }
  },

  incrementSessions(): void {
    const progress = this.getProgress();
    progress.totalSessions += 1;
    this.saveProgress(progress);
  },

  incrementQuestions(count = 1): void {
    const progress = this.getProgress();
    progress.weeklyQuestionCount += count;
    // Mock gradual increase in progress percent as they study
    progress.currentProgressPercent = Math.min(100, progress.currentProgressPercent + Math.round(count * 2.5));
    this.saveProgress(progress);
  },

  // Global Clean Up
  clearAllData(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error("Error clearing localStorage", e);
    }
  }
};
