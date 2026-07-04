export interface ParentReportSnapshot {
  generatedAt: string;
  studentName: string;
  gradeLabel: string;
  streamLabel: string;
  subjectLabel: string;
  levelLabel: string;
  weeklyStudyMinutes: number;
  weeklySessionCount: number;
  completedConceptsCount: number;
  assessmentCount: number;
  latestAssessmentScore?: number;
  strongAreas: string[];
  weakAreas: string[];
  adaptiveRecommendation?: string;
  parentGuidance: string[];
  warnings: string[];
  dataQuality: {
    hasStudyDurationData: boolean;
    hasAssessmentData: boolean;
    hasStrengthData: boolean;
    hasWeaknessData: boolean;
  };
}
