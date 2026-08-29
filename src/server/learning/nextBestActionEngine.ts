import { globalCurriculumRegistry } from '../../lib/curriculum/CurriculumRegistry.ts';
import { MasteryRecord, MasteryEnv } from './masteryService.ts';
import { GradeLevel, SubjectId } from '../../lib/curriculum/types.ts';

export type StudyActionType = 'LEARN' | 'PRACTICE' | 'REVIEW' | 'MASTERY_CHECK';

export interface NextBestAction {
  actionType: StudyActionType;
  topicId: string;
  topicTitle: string;
  rationale: string; // Provided in Sorani Kurdish for direct UI rendering
}

export async function calculateNextBestAction(
  env: MasteryEnv,
  studentId: string,
  grade: GradeLevel,
  subject: SubjectId
): Promise<NextBestAction | null> {
  const context = await globalCurriculumRegistry.resolveContext(grade, subject);
  if (!context || !context.units.length) return null;

  const MASTERY_THRESHOLD = 0.85;

  // Linear progression scan: Find the frontier of the student's knowledge
  for (const unit of context.units) {
    for (const topic of unit.topics) {
      const kvKey = `mastery:${studentId}:${topic.id}`;
      let record: MasteryRecord | null = null;
      if (env.LEARNING_RECORDS_KV) {
        const recordData = await env.LEARNING_RECORDS_KV.get(kvKey, 'json');
        record = recordData as MasteryRecord | null;
      }

      // 1. Untouched Topic -> LEARN
      if (!record || record.attempts === 0) {
        return {
          actionType: 'LEARN',
          topicId: topic.id,
          topicTitle: topic.title,
          rationale: 'بابەتێکی نوێ لە ڕێڕەوی فێربوونەکەت.' // "New topic in your learning path."
        };
      }

      // 2. Attempted but below mastery -> REVIEW / PRACTICE
      if (record.masteryLevel < MASTERY_THRESHOLD) {
        const hasRecentMisconceptions = record.identifiedMisconceptions.length > 0;
        return {
          actionType: hasRecentMisconceptions ? 'REVIEW' : 'PRACTICE',
          topicId: topic.id,
          topicTitle: topic.title,
          rationale: hasRecentMisconceptions 
            ? 'پێویستە پێداچوونەوە بەم بابەتە بکەیت پێش ئەوەی بچیتە پێشەوە.' // "Need to review this before moving forward."
            : 'پێویستت بە مەشقی زیاترە بۆ شارەزابوون.' // "Need more practice for mastery."
        };
      }

      // 3. Above threshold -> move to next topic in the loop
    }
  }

  // If the loop completes, the curriculum track is mastered.
  return null;
}
