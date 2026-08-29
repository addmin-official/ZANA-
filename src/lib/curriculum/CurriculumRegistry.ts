import { ICurriculumProvider, GradeLevel, SubjectId, CurriculumContext } from './types.ts';

export class CurriculumRegistry {
  private providers: Map<string, ICurriculumProvider> = new Map();

  registerProvider(provider: ICurriculumProvider): void {
    this.providers.set(provider.getProviderId(), provider);
  }

  async resolveContext(grade: GradeLevel, subject: SubjectId, preferredProvider?: string): Promise<CurriculumContext | null> {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      return this.providers.get(preferredProvider)!.fetchSubjectContext(grade, subject);
    }

    // Fallback: iterate registered providers
    for (const provider of this.providers.values()) {
      const context = await provider.fetchSubjectContext(grade, subject);
      if (context) return context;
    }

    return null;
  }
}

// Singleton export for backend usage
export const globalCurriculumRegistry = new CurriculumRegistry();
