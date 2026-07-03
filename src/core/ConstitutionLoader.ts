import { Constitution, ConstitutionRule } from "../types/constitution.ts";
import { ConstitutionRegistry } from "./ConstitutionRegistry.ts";

export class ConstitutionLoader {
  private registry: ConstitutionRegistry;

  constructor() {
    this.registry = ConstitutionRegistry.getInstance();
  }

  /**
   * Load active rules from all constitutions filtered and flattened
   */
  public loadActiveRules(): ConstitutionRule[] {
    const constitutions = this.registry.getAllSorted();
    const activeRules: ConstitutionRule[] = [];

    for (const cons of constitutions) {
      for (const rule of cons.rules) {
        if (rule.enabled) {
          activeRules.push(rule);
        }
      }
    }

    return activeRules;
  }

  /**
   * Load a specific constitution by its ID and return active rules
   */
  public loadRulesByConstitution(id: string): ConstitutionRule[] {
    const cons = this.registry.get(id);
    if (!cons) return [];

    return cons.rules.filter((rule) => rule.enabled);
  }

  /**
   * Retrieves rule metadata maps from all registered constitutions
   */
  public aggregateMetadata(): Record<string, Record<string, string | number | boolean | string[]>> {
    const constitutions = this.registry.getAllSorted();
    const aggregation: Record<string, Record<string, string | number | boolean | string[]>> = {};

    for (const cons of constitutions) {
      aggregation[cons.id] = cons.metadata;
    }

    return aggregation;
  }
}
