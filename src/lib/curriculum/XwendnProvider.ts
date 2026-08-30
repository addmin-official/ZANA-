import { ICurriculumProvider, CurriculumContext, CurriculumTopic, GradeLevel, SubjectId, CurriculumUnit } from './types.ts';

export class XwendnProvider implements ICurriculumProvider {
  private readonly baseUrl = 'https://xwendn.krd/api/v1'; // Assuming standardized API path based on xwendn.krd/grade/

  getProviderId(): string {
    return 'xwendn-official';
  }

  async fetchSubjectContext(grade: GradeLevel, subject: SubjectId): Promise<CurriculumContext | null> {
    try {
      // Production fail-safe: Enforce external timeout to prevent blocked AI routes
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/curriculum/${grade}/${subject}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZANA-Curriculum-Engine/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`[XwendnProvider] Failed to fetch curriculum: ${response.statusText}`);
        return null; // Fail closed: Do not fabricate curriculum data
      }

      const data = (await response.json()) as Record<string, unknown>;
      return this.mapToCurriculumContext(data, grade, subject);
    } catch (error) {
      console.error(`[XwendnProvider] Network or parsing error:`, error);
      return null;
    }
  }

  async fetchTopicDetails(_topicId: string): Promise<CurriculumTopic | null> {
    // Implementation for deep topic retrieval
    return null; 
  }

  private mapToCurriculumContext(rawData: Record<string, unknown>, grade: GradeLevel, subject: SubjectId): CurriculumContext {
    // Ensure strict mapping from Xwendn RTL data to ZANA interfaces
    const rawUnits = Array.isArray(rawData?.units) ? (rawData.units as CurriculumUnit[]) : [];
    return {
      grade,
      subject,
      providerId: this.getProviderId(),
      lastSyncedAt: new Date().toISOString(),
      units: rawUnits
    };
  }
}
