export interface MasteryRecord {
  studentId: string;
  topicId: string;
  masteryLevel: number; // 0.0 to 1.0
  attempts: number;
  lastAttemptAt: string;
  identifiedMisconceptions: string[];
}

export interface MasteryEnv {
  LEARNING_RECORDS_KV?: {
    get: (key: string, type?: string) => Promise<unknown>;
    put: (key: string, val: string) => Promise<void>;
  };
  [key: string]: unknown;
}

export async function updateStudentMastery(
  env: MasteryEnv,
  studentId: string,
  topicId: string,
  evaluation: { isCorrect: boolean; confidenceScore: number; detectedMisconception: string | null }
): Promise<MasteryRecord> {
  const kvKey = `mastery:${studentId}:${topicId}`;
  
  let record: MasteryRecord = {
    studentId,
    topicId,
    masteryLevel: 0,
    attempts: 0,
    lastAttemptAt: new Date().toISOString(),
    identifiedMisconceptions: []
  };

  if (env.LEARNING_RECORDS_KV) {
    const existingData = await env.LEARNING_RECORDS_KV.get(kvKey, 'json');
    if (existingData) {
      record = existingData as MasteryRecord;
    }
  }

  // Exponential moving average for mastery calculation
  const alpha = 0.3; // Learning rate
  const targetScore = evaluation.isCorrect ? evaluation.confidenceScore : 0.0;
  
  record.masteryLevel = (record.masteryLevel * (1 - alpha)) + (targetScore * alpha);
  record.attempts += 1;
  record.lastAttemptAt = new Date().toISOString();

  if (evaluation.detectedMisconception && !record.identifiedMisconceptions.includes(evaluation.detectedMisconception)) {
    record.identifiedMisconceptions.push(evaluation.detectedMisconception);
  }

  if (env.LEARNING_RECORDS_KV) {
    await env.LEARNING_RECORDS_KV.put(kvKey, JSON.stringify(record));
  }

  return record;
}
