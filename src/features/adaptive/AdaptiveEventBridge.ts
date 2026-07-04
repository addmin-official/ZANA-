import { StudentProfile } from "../student/studentTypes.ts";
import { AdaptiveSnapshot } from "./adaptiveTypes.ts";
import { DomainEventFactory } from "../../domain/DomainEventFactory.ts";
import { DomainEventStore } from "../../domain/DomainEventStore.ts";
import { StudentIntelligenceEngine } from "../../intelligence/StudentIntelligenceEngine.ts";
import { learningSessionEngineInstance } from "../../session/LearningSessionEngine.ts";

export class AdaptiveEventBridge {
  /**
   * Propagates adaptive assessment results back into:
   * 1. Student Intelligence Platform (SIP) - via StudentIntelligenceEngine
   * 2. Learning Session Engine (LSE) - via learningSessionEngineInstance
   * 3. Domain Event Store - emitting key domain events
   */
  public static propagateResults(
    profile: StudentProfile,
    snapshot: AdaptiveSnapshot,
    conceptLabels: Record<string, string> = {}
  ): void {
    const studentId = profile.id;
    const score = snapshot.scorePercentage;
    const store = DomainEventStore.getInstance();
    const sipEngine = StudentIntelligenceEngine.getInstance(profile);

    // Ensure we have an active session loaded in LSE
    const lseSnapshot = learningSessionEngineInstance.generateSnapshot();
    const activeSession = lseSnapshot.currentSession;

    // 1. WEAKNESS_DETECTED for weak concepts
    snapshot.weakConceptIds.forEach(conceptId => {
      const label = conceptLabels[conceptId] || "چەمکی لاواز";
      
      // Emit Domain Event
      const ev = DomainEventFactory.createEvent(
        "WEAKNESS_DETECTED",
        studentId,
        "assessment-engine",
        {
          conceptId,
          wrongAttemptsCount: 1,
          priority: score < 30 ? "high" : "medium"
        },
        {
          subject: profile.activeSubject,
          sessionId: activeSession?.id
        }
      );
      store.append(ev);

      // Write to SIP: record incorrect attempt to register weakness and update confidence
      sipEngine.recordExerciseAttempt(conceptId, label, false);

      // Write to LSE review queue
      if (activeSession) {
        // Access LSE's internal sessionEngine via a dynamic check or property
        // sessionEngine is private, but we can access it or use getters
        // Let's check how LSE is written. It has a constructor with sessionEngine.
        // We can cast learningSessionEngineInstance as any to call sessionEngine methods if needed, 
        // or add helper delegators, but wait: we can just modify the active session object in the sessionEngine state.
        // Let's call the proper addToReviewQueue on the sessionEngine directly or via any.
        const lseAny = learningSessionEngineInstance as any;
        if (lseAny.sessionEngine && typeof lseAny.sessionEngine.addToReviewQueue === "function") {
          lseAny.sessionEngine.addToReviewQueue(conceptId);
        }
      }
    });

    // 2. Strong concepts
    snapshot.strongConceptIds.forEach(conceptId => {
      const label = conceptLabels[conceptId] || "چەمکی بەهێز";

      // Emit CONFIDENCE_UPDATED
      const oldConfidence = sipEngine.getSnapshot().confidence[conceptId]?.confidenceScore ?? 0.5;
      const newConfidence = Math.min(1.0, oldConfidence + 0.15);
      
      const confEv = DomainEventFactory.createEvent(
        "CONFIDENCE_UPDATED",
        studentId,
        "assessment-engine",
        {
          conceptId,
          oldScore: oldConfidence,
          newScore: newConfidence
        },
        {
          subject: profile.activeSubject,
          sessionId: activeSession?.id
        }
      );
      store.append(confEv);

      // If score >= 80, we mark it as completed/mastered
      if (score >= 80) {
        // Emit CONCEPT_COMPLETED
        const compEv = DomainEventFactory.createEvent(
          "CONCEPT_COMPLETED",
          studentId,
          "assessment-engine",
          {
            conceptId,
            sessionId: activeSession?.id
          },
          {
            subject: profile.activeSubject,
            sessionId: activeSession?.id
          }
        );
        store.append(compEv);

        // Emit MASTERY_UPDATED
        const oldMastery = sipEngine.getSnapshot().mastery[conceptId]?.value ?? 0.0;
        const newMastery = Math.min(1.0, oldMastery + 0.20); // Conservative mastery update
        
        const mastEv = DomainEventFactory.createEvent(
          "MASTERY_UPDATED",
          studentId,
          "assessment-engine",
          {
            conceptId,
            oldValue: oldMastery,
            newValue: newMastery,
            status: newMastery >= 0.8 ? "Mastered" : "Practicing"
          },
          {
            subject: profile.activeSubject,
            sessionId: activeSession?.id
          }
        );
        store.append(mastEv);

        // Update SIP completion
        sipEngine.completeLearningNode(conceptId, label);

        // Update SIP Mastery/Exercise attempt
        sipEngine.recordExerciseAttempt(conceptId, label, true);

        // Update LSE completed list and queues
        const lseAny = learningSessionEngineInstance as any;
        if (lseAny.sessionEngine) {
          if (typeof lseAny.sessionEngine.completeNode === "function") {
            lseAny.sessionEngine.completeNode(conceptId);
          }
          if (typeof lseAny.sessionEngine.removeFromReviewQueue === "function") {
            lseAny.sessionEngine.removeFromReviewQueue(conceptId);
          }
          if (typeof lseAny.sessionEngine.removeFromPracticeQueue === "function") {
            lseAny.sessionEngine.removeFromPracticeQueue(conceptId);
          }
        }
      } else {
        // Score < 80, strong concepts are put into practiceQueue for further reinforcing
        sipEngine.recordExerciseAttempt(conceptId, label, true);

        const lseAny = learningSessionEngineInstance as any;
        if (lseAny.sessionEngine && typeof lseAny.sessionEngine.addToPracticeQueue === "function") {
          lseAny.sessionEngine.addToPracticeQueue(conceptId);
        }
      }
    });

    // 3. GOAL_COMPLETED if assessment passes daily goal
    // We can assume passing with score >= 50 progress towards daily goals
    if (score >= 50) {
      const activeSessionObj = learningSessionEngineInstance.generateSnapshot().currentSession;
      if (activeSessionObj && activeSessionObj.dailyGoal) {
        // Register daily goal progress in LearningSessionEngine
        learningSessionEngineInstance.registerActivity(
          activeSessionObj.currentNodeId,
          activeSessionObj.currentMode,
          score >= 80, // count as completed node if score >= 80
          120 // mock 2 minutes spent
        );

        // Check if goal completed after registering
        const updatedSession = learningSessionEngineInstance.generateSnapshot().currentSession;
        if (updatedSession?.dailyGoal?.isCompleted) {
          const goalEv = DomainEventFactory.createEvent(
            "GOAL_COMPLETED",
            studentId,
            "assessment-engine",
            {
              goalId: "daily_goal_" + updatedSession.id,
              title: "ئامانجی ڕۆژانە",
              type: "daily"
            },
            {
              subject: profile.activeSubject,
              sessionId: activeSession?.id
            }
          );
          store.append(goalEv);
        }
      }
    }
  }
}
