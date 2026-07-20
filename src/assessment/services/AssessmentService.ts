import {
  Assessment,
  AssessmentBlueprint,
  AssessmentAttempt,
  AnswerSubmission,
  QuestionAttempt,
  AssessmentResult,
  AssessmentStatus,
  AssessmentType,
  ScoreBreakdown,
  AssessmentRecommendation,
  PublicQuestion
} from "../domain/AssessmentTypes.ts";
import { AssessmentRecordProvider } from "../providers/AssessmentRecordProvider.ts";
import { QuestionBankProvider } from "../providers/QuestionBankProvider.ts";
import { QuestionSelectionEngine } from "../generation/QuestionSelectionEngine.ts";
import { AnswerGrader } from "../grading/AnswerGrader.ts";
import { AdaptiveQuizEngine } from "../adaptive/AdaptiveQuizEngine.ts";
import { LearningRecordProvider } from "../../learning/providers/LearningRecordProvider.ts";
import { AdaptiveLearningEngine } from "../../learning/engine/AdaptiveLearningEngine.ts";
import { DifficultyLevel, LearningEvent } from "../../learning/domain/MasteryTypes.ts";

export class AssessmentService {
  private recordProvider: AssessmentRecordProvider;

  constructor(recordProvider: AssessmentRecordProvider) {
    this.recordProvider = recordProvider;
  }

  /**
   * Starts a new assessment session.
   */
  public async startAssessment(
    studentId: string,
    blueprint: AssessmentBlueprint,
    titleKu: string,
    instructionsKu: string,
    studentMasteryScore: number = 0.0
  ): Promise<{ attempt: AssessmentAttempt; firstQuestion?: PublicQuestion }> {
    const attemptId = `sess_att_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (blueprint.targetDurationSeconds * 1000) * 2).toISOString(); // double the target time

    const attempt: AssessmentAttempt = {
      id: attemptId,
      assessmentId: blueprint.id,
      studentId,
      status: AssessmentStatus.IN_PROGRESS,
      questionAttempts: {},
      startedAt: now,
      expiresAt,
      createdAt: now,
      updatedAt: now
    };

    let firstQuestion: PublicQuestion | undefined;

    if (blueprint.type === AssessmentType.MASTERY_CHECK) {
      // Adaptive quiz flow: decide the first question dynamically
      const step = AdaptiveQuizEngine.determineNextStep(attempt, blueprint, studentMasteryScore);
      if (step.nextQuestion) {
        firstQuestion = step.nextQuestion;
        attempt.activeQuestionId = firstQuestion.id;
      }
    } else {
      // Standard flow: pre-select all questions upfront
      const questions = QuestionSelectionEngine.selectQuestionsForBlueprint(blueprint);
      if (questions.length > 0) {
        firstQuestion = QuestionBankProvider.getInstance().toPublicQuestion(questions[0]);
        attempt.activeQuestionId = firstQuestion.id;
      }
    }

    await this.recordProvider.saveAttempt(attempt);

    return { attempt, firstQuestion };
  }

  /**
   * Authoritatively submits and grades a question answer.
   * Feeds the outcomes directly back into Phase 15 student mastery systems.
   */
  public async submitAnswer(
    attemptId: string,
    questionId: string,
    submission: AnswerSubmission,
    learningRecordProvider: LearningRecordProvider,
    blueprint: AssessmentBlueprint
  ): Promise<{
    attempt: AssessmentAttempt;
    gradedAttempt: QuestionAttempt;
    isFinished: boolean;
    nextQuestion?: PublicQuestion;
    terminationReasonKu?: string;
  }> {
    const attempt = await this.recordProvider.getAttempt(attemptId);
    if (!attempt) {
      throw new Error("Assessment session not found.");
    }

    if (attempt.status !== AssessmentStatus.IN_PROGRESS) {
      throw new Error("This assessment session is no longer active.");
    }

    // Check expiration
    if (attempt.expiresAt && new Date().toISOString() > attempt.expiresAt) {
      attempt.status = AssessmentStatus.EXPIRED;
      await this.recordProvider.saveAttempt(attempt);
      throw new Error("The assessment session has expired.");
    }

    const bank = QuestionBankProvider.getInstance();
    const question = bank.getQuestion(questionId);
    if (!question) {
      throw new Error("Question not found in the official registry.");
    }

    // 1. Authoritative Server Grading
    const gradedAttempt = AnswerGrader.gradeSubmission(question, submission);

    // Record the attempt outcome
    attempt.questionAttempts[questionId] = gradedAttempt;
    attempt.updatedAt = new Date().toISOString();

    // 2. Sync Mastery Evidence back into Phase 15
    if (question.conceptId) {
      const prevProfile = await learningRecordProvider.getStudentMasteryProfile(attempt.studentId);
      const prevMastery = prevProfile.conceptMasteries[question.conceptId] || null;

      // Update concept mastery state via AdaptiveLearningEngine
      const newMastery = AdaptiveLearningEngine.calculateNewMastery(prevMastery, {
        isCorrect: gradedAttempt.isCorrect,
        responseTimeMs: submission.responseTimeMs,
        difficulty: question.difficulty
      });
      await learningRecordProvider.saveMasteryChange(attempt.studentId, question.conceptId, newMastery);

      // Append standard learning event
      const learningEvent: LearningEvent = {
        id: `event_${gradedAttempt.id}`,
        studentId: attempt.studentId,
        timestamp: new Date().toISOString(),
        type: "EXERCISE_ATTEMPT",
        data: {
          id: gradedAttempt.id,
          studentId: attempt.studentId,
          conceptId: question.conceptId,
          isCorrect: gradedAttempt.isCorrect,
          responseTimeMs: submission.responseTimeMs,
          difficulty: question.difficulty,
          questionText: question.promptKu,
          studentResponse: submission.shortAnswerText || submission.selectedOptionIds?.[0] || (submission.trueFalseValue !== undefined ? String(submission.trueFalseValue) : "")
        }
      };
      await learningRecordProvider.appendLearningEvent(attempt.studentId, learningEvent);

      // Sync active misconceptions
      if (gradedAttempt.misconceptionDetectedId) {
        const attemptRecord = {
          id: gradedAttempt.id,
          studentId: attempt.studentId,
          conceptId: question.conceptId,
          isCorrect: gradedAttempt.isCorrect,
          responseTimeMs: submission.responseTimeMs,
          difficulty: question.difficulty,
          questionText: question.promptKu,
          studentResponse: submission.shortAnswerText || submission.selectedOptionIds?.[0] || "",
          timestamp: new Date().toISOString(),
          misconceptionDetected: gradedAttempt.misconceptionDetectedId === "misc_sign_flip" 
            ? "Sign Flip" 
            : "Operation Inverse"
        };
        const detectedMisc = AdaptiveLearningEngine.detectMisconception(attemptRecord, prevProfile.activeMisconceptions);
        if (detectedMisc) {
          // Merge misconception state back into profile
          const updatedMisconceptions = [...prevProfile.activeMisconceptions];
          const idx = updatedMisconceptions.findIndex(m => m.misconceptionId === detectedMisc.misconceptionId);
          if (idx >= 0) {
            updatedMisconceptions[idx] = detectedMisc;
          } else {
            updatedMisconceptions.push(detectedMisc);
          }
          prevProfile.activeMisconceptions = updatedMisconceptions;
          await learningRecordProvider.saveRecommendation({
            id: `rec_rem_${gradedAttempt.id}`,
            studentId: attempt.studentId,
            conceptId: question.conceptId,
            type: "REMEDIAL_EXPLANATION",
            titleKu: `وانەی ڕوونکردنەوەی چارەسەری: ${detectedMisc.nameKu}`,
            explanationKu: detectedMisc.interventionKu,
            priority: "high",
            status: "ACTIVE",
            generatedAt: new Date().toISOString(),
            reasoningKu: "پێشنیار کراوە بەهۆی دۆزینەوەی لێکتێنەگەیشتنی دووبارەبووەوە."
          });
        }
      }
    }

    // 3. Determine next steps (adaptive pacing)
    let isFinished = false;
    let nextQuestion: PublicQuestion | undefined;
    let terminationReasonKu: string | undefined;

    if (blueprint.type === AssessmentType.MASTERY_CHECK) {
      // Adaptive quiz early stopping checks
      const step = AdaptiveQuizEngine.determineNextStep(attempt, blueprint);
      if (step.shouldStop) {
        isFinished = true;
        terminationReasonKu = step.terminationReasonKu;
        attempt.status = AssessmentStatus.GRADED;
      } else if (step.nextQuestion) {
        nextQuestion = step.nextQuestion;
        attempt.activeQuestionId = nextQuestion.id;
      }
    } else {
      // Standard static quiz checks
      const candidatePool = QuestionSelectionEngine.selectQuestionsForBlueprint(blueprint);
      const totalAnswered = Object.keys(attempt.questionAttempts).length;
      
      if (totalAnswered >= blueprint.totalQuestions) {
        isFinished = true;
        attempt.status = AssessmentStatus.GRADED;
      } else {
        // Retrieve next question index
        const nextQuestionObj = candidatePool[totalAnswered];
        if (nextQuestionObj) {
          nextQuestion = bank.toPublicQuestion(nextQuestionObj);
          attempt.activeQuestionId = nextQuestion.id;
        } else {
          isFinished = true;
          attempt.status = AssessmentStatus.GRADED;
        }
      }
    }

    await this.recordProvider.saveAttempt(attempt);

    return {
      attempt,
      gradedAttempt,
      isFinished,
      nextQuestion,
      terminationReasonKu
    };
  }

  /**
   * Finalizes the assessment, compiles the final diagnostics and recommendation payloads.
   */
  public async finishAssessment(
    attemptId: string,
    learningRecordProvider: LearningRecordProvider,
    blueprint: AssessmentBlueprint
  ): Promise<AssessmentResult> {
    const attempt = await this.recordProvider.getAttempt(attemptId);
    if (!attempt) {
      throw new Error("Assessment session not found.");
    }

    attempt.status = AssessmentStatus.GRADED;
    attempt.submittedAt = new Date().toISOString();
    attempt.updatedAt = new Date().toISOString();

    await this.recordProvider.saveAttempt(attempt);

    // Calculate score breakdown
    const attemptsArray = Object.values(attempt.questionAttempts);
    let totalScore = 0;
    let maxScore = 0;

    const byDifficulty: Record<DifficultyLevel, { scored: number; max: number; count: number }> = {
      [DifficultyLevel.FOUNDATION]: { scored: 0, max: 0, count: 0 },
      [DifficultyLevel.EASY]: { scored: 0, max: 0, count: 0 },
      [DifficultyLevel.STANDARD]: { scored: 0, max: 0, count: 0 },
      [DifficultyLevel.CHALLENGING]: { scored: 0, max: 0, count: 0 },
      [DifficultyLevel.ADVANCED]: { scored: 0, max: 0, count: 0 }
    };

    const byConcept: Record<string, { scored: number; max: number; count: number }> = {};
    const byQuestionType: Record<string, { scored: number; max: number; count: number }> = {};

    const bank = QuestionBankProvider.getInstance();

    for (const att of attemptsArray) {
      const q = bank.getQuestion(att.questionId);
      if (!q) continue;

      totalScore += att.partialCreditScore;
      maxScore += att.maxScore;

      // Group by difficulty
      if (byDifficulty[q.difficulty]) {
        byDifficulty[q.difficulty].scored += att.partialCreditScore;
        byDifficulty[q.difficulty].max += att.maxScore;
        byDifficulty[q.difficulty].count++;
      }

      // Group by concept
      const cId = q.conceptId || "unknown";
      if (!byConcept[cId]) {
        byConcept[cId] = { scored: 0, max: 0, count: 0 };
      }
      byConcept[cId].scored += att.partialCreditScore;
      byConcept[cId].max += att.maxScore;
      byConcept[cId].count++;

      // Group by question type
      const typeStr = q.type;
      if (!byQuestionType[typeStr]) {
        byQuestionType[typeStr] = { scored: 0, max: 0, count: 0 };
      }
      byQuestionType[typeStr].scored += att.partialCreditScore;
      byQuestionType[typeStr].max += att.maxScore;
      byQuestionType[typeStr].count++;
    }

    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
    const passed = percentage >= blueprint.passingThresholdPercentage;

    const scoreBreakdown: ScoreBreakdown = {
      totalScore,
      maxScore,
      percentage,
      passed,
      byDifficulty,
      byConcept,
      byQuestionType: byQuestionType as any
    };

    // Diagnostic strengths and weaknesses
    const strengthsKu: string[] = [];
    const weaknessesKu: string[] = [];
    const recommendations: AssessmentRecommendation[] = [];

    for (const [conceptId, stats] of Object.entries(byConcept)) {
      const pct = stats.max > 0 ? (stats.scored / stats.max) * 100 : 0;
      if (pct >= 80) {
        strengthsKu.push(conceptId);
      } else if (pct < 50) {
        weaknessesKu.push(conceptId);
        recommendations.push({
          type: "PRACTICE_DRILL",
          titleKu: `پێداچوونەوە و ڕاهێنانی تایبەت بە چەمکی: ${conceptId}`,
          explanationKu: `نمرەکەت لە بابەتی "${conceptId}" لە تاقیکردنەوەکەدا لە خوار ٥٠٪ بووە. پێشنیار دەکەین ڕاهێنانی سادەتر ئەنجام بدەیت.`,
          priority: "high",
          conceptId
        });
      }
    }

    // Load mastery profile changes to report
    const profile = await learningRecordProvider.getStudentMasteryProfile(attempt.studentId);
    
    // Convert misconceptions detected in this attempt
    const misconceptionsDetected = profile.activeMisconceptions
      .filter(m => attemptsArray.some(att => att.misconceptionDetectedId === m.misconceptionId))
      .map(m => ({
        misconceptionId: m.misconceptionId,
        nameKu: m.nameKu,
        status: m.status,
        count: m.count,
        interventionKu: m.interventionKu
      }));

    const result: AssessmentResult = {
      attemptId: attempt.id,
      assessmentId: attempt.assessmentId,
      studentId: attempt.studentId,
      scoreBreakdown,
      strengthsKu,
      weaknessesKu,
      masteryChanges: [], // populated downstream if needed
      misconceptionsDetected,
      nextRecommendedActionKu: passed 
        ? "پیرۆزە! تۆ توانیت بە سەرکەوتوویی ئەم بەشە تێپەڕێنیت. ئێستا دەتوانیت بەردەوام بیت لە خوێندنی وانە نوێیەکان."
        : "پێشنیار دەکەین پێداچوونەوەیەکی خێرا بکەیت بەو چەمکانەی نمرەت تێیاندا کەمە پێش ئەوەی دووبارە تاقیکردنەوە ئەنجام بدەیتەوە.",
      recommendations,
      interpretationConfidence: attemptsArray.length >= 5 ? "high" : "medium"
    };

    await this.recordProvider.saveResult(result);

    return result;
  }
}
