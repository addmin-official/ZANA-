import { ContentLicense, UsageDecision, DecisionType } from "./ContentLicense.ts";

export class LicensePolicyEngine {
  private static instance: LicensePolicyEngine | null = null;
  private licenses: Map<string, ContentLicense> = new Map();

  private constructor() {}

  public static getInstance(): LicensePolicyEngine {
    if (!this.instance) {
      this.instance = new LicensePolicyEngine();
    }
    return this.instance;
  }

  public registerLicense(license: ContentLicense): void {
    this.licenses.set(license.id, license);
  }

  public getLicense(id: string): ContentLicense | undefined {
    return this.licenses.get(id);
  }

  public evaluatePolicy(
    curriculumId: string,
    action: string,
    sourceStatus: "NONE" | "OPEN_LICENSE" | "LICENSED",
    licenseId: string | null
  ): UsageDecision {
    const timestamp = new Date().toISOString();
    const auditMetadata = {
      evaluatedAt: timestamp,
      curriculumId,
      action,
      sourceStatus,
      licenseId,
    };

    if (sourceStatus === "OPEN_LICENSE") {
      return {
        allowed: true,
        reason: "Content is under an open license.",
        licenseId: licenseId || "open-license-generic",
        permittedActions: [
          "RETRIEVE",
          "INDEX",
          "EMBED",
          "SUMMARIZE",
          "EXPLAIN",
          "GENERATE_QUIZ",
          "GENERATE_REPORT",
          "DISPLAY_EXCERPT",
          "EXPORT",
        ],
        expiresAt: null,
        auditMetadata,
      };
    }

    if (sourceStatus === "NONE" || !licenseId) {
      return {
        allowed: false,
        reason: "No active license exists for this content.",
        licenseId: null,
        permittedActions: [],
        expiresAt: null,
        auditMetadata,
      };
    }

    const license = this.licenses.get(licenseId);
    if (!license) {
      return {
        allowed: false,
        reason: `License with ID ${licenseId} could not be found.`,
        licenseId: null,
        permittedActions: [],
        expiresAt: null,
        auditMetadata,
      };
    }

    if (license.status === "REVOKED") {
      return {
        allowed: false,
        reason: "The license has been explicitly revoked.",
        licenseId: license.id,
        permittedActions: [],
        expiresAt: license.expiresAt,
        auditMetadata,
      };
    }

    // Check expiration
    const now = new Date();
    const expires = new Date(license.expiresAt);
    if (now > expires || license.status === "EXPIRED") {
      return {
        allowed: false,
        reason: "The license has expired.",
        licenseId: license.id,
        permittedActions: [],
        expiresAt: license.expiresAt,
        auditMetadata,
      };
    }

    // Check action
    if (!license.allowedActions.includes(action)) {
      return {
        allowed: false,
        reason: `The action '${action}' is not permitted under this license.`,
        licenseId: license.id,
        permittedActions: license.allowedActions,
        expiresAt: license.expiresAt,
        auditMetadata,
      };
    }

    return {
      allowed: true,
      reason: "License is valid and permits the requested action.",
      licenseId: license.id,
      permittedActions: license.allowedActions,
      expiresAt: license.expiresAt,
      auditMetadata,
    };
  }

  public clear(): void {
    this.licenses.clear();
  }
}
