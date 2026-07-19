import { CurriculumLesson } from "../domain/CurriculumTypes.ts";
import { LicensePolicyEngine } from "./LicensePolicyEngine.ts";
import { UsageDecision } from "./ContentLicense.ts";

export class ContentUsageGuard {
  private policyEngine: LicensePolicyEngine;

  constructor() {
    this.policyEngine = LicensePolicyEngine.getInstance();
  }

  /**
   * Evaluates if a given action can be performed on the curriculum lesson's content.
   * If not allowed, content should be blocked from entering the AI context or being shown.
   */
  public guardContent(lesson: CurriculumLesson, action: string): UsageDecision {
    return this.policyEngine.evaluatePolicy(
      lesson.curriculumId,
      action,
      lesson.sourceStatus,
      lesson.licenseId
    );
  }

  /**
   * Helper that returns a boolean indicating permission.
   */
  public isAllowed(lesson: CurriculumLesson, action: string): boolean {
    const decision = this.guardContent(lesson, action);
    return decision.allowed;
  }
}
