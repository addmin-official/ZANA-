import { Constitution } from "../types/constitution.ts";
import { brandConstitution } from "../constitutions/brand.constitution.ts";
import { soraniConstitution } from "../constitutions/sorani.constitution.ts";
import { pedagogyConstitution } from "../constitutions/pedagogy.constitution.ts";
import { aiConstitution } from "../constitutions/ai.constitution.ts";
import { uxConstitution } from "../constitutions/ux.constitution.ts";
import { engineeringConstitution } from "../constitutions/engineering.constitution.ts";
import { productConstitution } from "../constitutions/product.constitution.ts";

export class ConstitutionRegistry {
  private static instance: ConstitutionRegistry;
  private constitutions: Map<string, Constitution> = new Map();

  private constructor() {
    // Automatically register all foundational constitutions upon boot
    this.register(brandConstitution);
    this.register(soraniConstitution);
    this.register(pedagogyConstitution);
    this.register(aiConstitution);
    this.register(uxConstitution);
    this.register(engineeringConstitution);
    this.register(productConstitution);
  }

  public static getInstance(): ConstitutionRegistry {
    if (!ConstitutionRegistry.instance) {
      ConstitutionRegistry.instance = new ConstitutionRegistry();
    }
    return ConstitutionRegistry.instance;
  }

  /**
   * Register a new constitution in the registry
   */
  public register(constitution: Constitution): void {
    this.constitutions.set(constitution.id, constitution);
  }

  /**
   * Get a registered constitution by its unique ID
   */
  public get(id: string): Constitution | undefined {
    return this.constitutions.get(id);
  }

  /**
   * Retrieves all registered constitutions sorted by priority in descending order
   */
  public getAllSorted(): Constitution[] {
    return Array.from(this.constitutions.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Retrieve rules from all constitutions that match a specific ID search
   */
  public findRule(ruleId: string) {
    for (const constitution of this.constitutions.values()) {
      const rule = constitution.rules.find((r) => r.id === ruleId);
      if (rule) {
        return { constitutionId: constitution.id, rule };
      }
    }
    return undefined;
  }
}
