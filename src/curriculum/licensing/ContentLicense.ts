export type LicenseStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface ContentLicense {
  id: string;
  curriculumId: string;
  licensee: string;
  grantedAt: string; // ISO string
  expiresAt: string; // ISO string
  allowedActions: string[]; // e.g. ["RETRIEVE", "INDEX", "EMBED", "EXPLAIN"]
  status: LicenseStatus;
}

export type DecisionType =
  | "LICENSE_VALID"
  | "OPEN_LICENSE"
  | "NO_LICENSE"
  | "LICENSE_EXPIRED"
  | "USAGE_NOT_PERMITTED";

export interface UsageDecision {
  allowed: boolean;
  reason: string;
  licenseId: string | null;
  permittedActions: string[];
  expiresAt: string | null;
  auditMetadata: Record<string, unknown>;
}
