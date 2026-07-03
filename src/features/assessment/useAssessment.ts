import { useState, useEffect } from "react";
import { AssessmentState } from "./assessmentTypes.ts";
import { ZanaStorage, StudentProfile } from "../../services/storage.ts";
import { ZanaApiClient } from "../../services/apiClient.ts";

export function useAssessment(profile: StudentProfile, onProfileUpdate: (profile: Partial<StudentProfile>) => void) {
  const [assessment, setAssessment] = useState<AssessmentState | null>(() => ZanaStorage.getAssessment());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAssessment = async () => {
    setError(null);
    setLoading(true);

    const initialState: Omit<AssessmentState, "id"> = {
      subject: profile.subject,
      grade: profile.grade,
      currentQuestion: 1,
      totalQuestions: 5,
      questions: [],
      answers: [],
      feedbacks: [],
      correctAnswers: [],
      completed: false,
      finalLevel: null
    };

    try {
      // Call backend to generate Question 1
      const res = await ZanaApiClient.getAssessmentNextQuestion(initialState, profile);
      
      const newState: AssessmentState = {
        id: Math.random().toString(36).substring(7),
        ...initialState,
        questions: [res.question]
      };

      ZanaStorage.saveAssessment(newState);
      setAssessment(newState);
    } catch (err: any) {
      setError(err.message || "نەتوانرا تاقیکردنەوەکە دەستپێبکرێت.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (answerText: string) => {
    if (!assessment) return;

    setError(null);
    setLoading(true);

    // Prepare state to send to backend for grading the current question
    const updatedAnswers = [...assessment.answers, answerText];
    const tempState = {
      ...assessment,
      answers: updatedAnswers
    };

    try {
      // Send to backend to grade the answer and fetch the next question (or finish)
      const res = await ZanaApiClient.getAssessmentNextQuestion(tempState, profile);

      const isLastQuestion = assessment.currentQuestion === 5;
      
      const nextQuestions = [...assessment.questions];
      if (!isLastQuestion && res.question) {
        nextQuestions.push(res.question);
      }

      const updatedFeedbacks = [...assessment.feedbacks, res.feedback];
      const updatedCorrectAnswers = [...assessment.correctAnswers, res.isCorrect];

      let computedFinalLevel: string | null = null;
      if (isLastQuestion) {
        // Calculate the score
        const correctCount = updatedCorrectAnswers.filter(Boolean).length;
        if (correctCount <= 2) {
          computedFinalLevel = "beginner";
        } else if (correctCount <= 4) {
          computedFinalLevel = "intermediate";
        } else {
          computedFinalLevel = "advanced";
        }

        // Save progress to storage
        ZanaStorage.incrementQuestions(5);
        // Also update student profile level if the diagnostic suggests a change
        onProfileUpdate({ level: computedFinalLevel as any });
      }

      const finalState: AssessmentState = {
        ...assessment,
        answers: updatedAnswers,
        feedbacks: updatedFeedbacks,
        correctAnswers: updatedCorrectAnswers,
        questions: nextQuestions,
        currentQuestion: isLastQuestion ? 5 : assessment.currentQuestion + 1,
        completed: isLastQuestion,
        finalLevel: computedFinalLevel || res.finalLevel
      };

      ZanaStorage.saveAssessment(finalState);
      setAssessment(finalState);
    } catch (err: any) {
      setError(err.message || "هەڵەیەک ڕوویدا لە کاتی ناردنی وەڵامەکە.");
    } finally {
      setLoading(false);
    }
  };

  const resetAssessment = () => {
    ZanaStorage.clearAssessment();
    setAssessment(null);
    setError(null);
  };

  return {
    assessment,
    loading,
    error,
    startAssessment,
    submitAnswer,
    resetAssessment
  };
}
