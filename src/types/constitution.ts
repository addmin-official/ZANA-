export type RuleSeverity = "critical" | "high" | "medium" | "low";

export interface ConstitutionRule {
  id: string;
  title: string;
  description: string;
  severity: RuleSeverity;
  enabled: boolean;
}

export interface Constitution {
  id: string;
  version: string;
  title: string;
  description: string;
  rules: ConstitutionRule[];
  priority: number; // Higher value represents higher priority
  metadata: Record<string, string | number | boolean | string[]>;
}
