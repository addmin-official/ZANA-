import { ConstitutionLoader } from "./ConstitutionLoader.ts";

export class PromptCompiler {
  private loader: ConstitutionLoader;

  constructor() {
    this.loader = new ConstitutionLoader();
  }

  /**
   * Generates a structured Markdown instruction block for LLMs based on active constitutions.
   */
  public compileSystemPrompt(): string {
    const rules = this.loader.loadActiveRules();
    const metadataAgg = this.loader.aggregateMetadata();

    let compiledPrompt = "==================================================\n";
    compiledPrompt += "ZANA SYSTEM CONSTITUTIONAL DIRECTIVES (IMMUTABLE)\n";
    compiledPrompt += "==================================================\n\n";
    compiledPrompt += "You must follow these rules with zero exceptions. Your response generation pipeline must pass these safety layers.\n\n";

    // Group rules by severity or source
    const criticalRules = rules.filter((r) => r.severity === "critical");
    const highRules = rules.filter((r) => r.severity === "high");
    const otherRules = rules.filter((r) => r.severity !== "critical" && r.severity !== "high");

    compiledPrompt += "### CRITICAL THREAT MITIGATION (MUST COMPLY OR REFUSE):\n";
    for (const rule of criticalRules) {
      compiledPrompt += `- **[${rule.id}] ${rule.title}**: ${rule.description}\n`;
    }
    compiledPrompt += "\n";

    compiledPrompt += "### HIGH PRIORITIES (PEDAGOGY & CURRICULUM BOUNDS):\n";
    for (const rule of highRules) {
      compiledPrompt += `- **[${rule.id}] ${rule.title}**: ${rule.description}\n`;
    }
    compiledPrompt += "\n";

    compiledPrompt += "### CORE INTERACTION & BRAND GUIDELINES:\n";
    for (const rule of otherRules) {
      compiledPrompt += `- **[${rule.id}] ${rule.title}**: ${rule.description}\n`;
    }
    compiledPrompt += "\n";

    compiledPrompt += "### BRAND AND LOCALE METADATA PARAMETERS:\n";
    compiledPrompt += `Language: Kurdish Sorani (RTL)\n`;
    if (metadataAgg["const-sorani-v1"]) {
      const soraniMeta = metadataAgg["const-sorani-v1"];
      compiledPrompt += `- Allowed Script direction: ${soraniMeta.direction || "rtl"}\n`;
      compiledPrompt += `- Official Greetings: ${(soraniMeta.localGreetings as string[] || []).join(", ")}\n`;
    }
    if (metadataAgg["const-ai-v1"]) {
      const aiMeta = metadataAgg["const-ai-v1"];
      compiledPrompt += `- Valid subjects: ${(aiMeta.scopingLimits as string[] || []).join(", ")}\n`;
    }

    compiledPrompt += "\n==================================================\n";
    return compiledPrompt;
  }
}
