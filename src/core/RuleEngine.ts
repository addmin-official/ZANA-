import { ConstitutionRule, RuleSeverity } from "../types/constitution.ts";
import { ConstitutionLoader } from "./ConstitutionLoader.ts";

export interface RuleViolation {
  ruleId: string;
  title: string;
  severity: RuleSeverity;
  description: string;
  context: string;
}

export interface ValidationReport {
  isValid: boolean;
  violations: RuleViolation[];
}

export class RuleEngine {
  private loader: ConstitutionLoader;

  constructor() {
    this.loader = new ConstitutionLoader();
  }

  /**
   * Evaluates a system state, student profile, or text response against active constitutional rules.
   */
  public validateProfile(profile: { name: string; grade: string; subject: string; level: string; onboarded: boolean }): ValidationReport {
    const activeRules = this.loader.loadActiveRules();
    const violations: RuleViolation[] = [];

    for (const rule of activeRules) {
      if (rule.id === "prod-rule-onboarding-first") {
        if (!profile.onboarded && (profile.name || profile.subject)) {
          // Onboarding check failure simulation/evaluation
          violations.push({
            ruleId: rule.id,
            title: rule.title,
            severity: rule.severity,
            description: rule.description,
            context: "Student attempted accessing content values before completing the onboarding workflow.",
          });
        }
      }

      if (rule.id === "brand-rule-tone") {
        if (profile.name.length > 100) {
          violations.push({
            ruleId: rule.id,
            title: rule.title,
            severity: rule.severity,
            description: "Profile name exceeds optimal brand limitations.",
            context: `Name length: ${profile.name.length} characters.`,
          });
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Sanitizes text prompts or responses to ensure they do not violate safety or curriculum constraints
   */
  public validateTextContent(text: string, subject: string): ValidationReport {
    const activeRules = this.loader.loadActiveRules();
    const violations: RuleViolation[] = [];

    for (const rule of activeRules) {
      if (rule.id === "ai-rule-curriculum-scope") {
        const lowerText = text.toLowerCase();
        // Check for out of scope triggers (e.g., asking about unrelated commercial topics)
        const blockedKeywords = ["crypto", "bitcoin", "politics", "casino", "poker", "dating"];
        for (const kw of blockedKeywords) {
          if (lowerText.includes(kw)) {
            violations.push({
              ruleId: rule.id,
              title: rule.title,
              severity: rule.severity,
              description: rule.description,
              context: `Blocked keyword detected in interaction: '${kw}'`,
            });
            break;
          }
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}
