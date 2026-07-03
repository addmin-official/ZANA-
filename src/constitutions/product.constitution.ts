import { Constitution } from "../types/constitution.ts";

export const productConstitution: Constitution = {
  id: "const-product-v1",
  version: "1.0.0",
  title: "ZANA Product Strategy Constitution",
  description: "Specifies feature boundaries, parent engagement, and daily learning routine workflows.",
  priority: 60,
  metadata: {
    dailyAssessmentQuestionCount: 5,
    minimumSyllabusGrades: ["9", "10", "11", "12"],
  },
  rules: [
    {
      id: "prod-rule-onboarding-first",
      title: "Mandatory Onboarding Gate",
      description: "Students must complete profile onboarding (name, grade, active subject, experience level) before any core screens or chat capabilities are unlocked.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "prod-rule-parental-transparency",
      title: "Parental Growth Visibility",
      description: "The application must provide a dedicated growth report displaying the progress percent, weekly stats, weak areas, and actionable guidelines written for parents.",
      severity: "high",
      enabled: true,
    },
    {
      id: "prod-rule-assessment-triggers",
      title: "Progress Evaluation Milestones",
      description: "Allow the student to perform lightweight, 5-question micro-assessments to measure and adjust their academic level setting.",
      severity: "high",
      enabled: true,
    },
  ],
};
