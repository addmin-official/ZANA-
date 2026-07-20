import { GoogleGenAI, Type } from "@google/genai";
import { AssessmentQuestion, QuestionSource, QuestionType, GenerationReviewStatus } from "../domain/AssessmentTypes.ts";
import { DifficultyLevel } from "../../learning/domain/MasteryTypes.ts";
import { QuestionBankProvider } from "../providers/QuestionBankProvider.ts";
import { CurriculumRegistry } from "../../curriculum/registry/CurriculumRegistry.ts";
import { ContentUsageGuard } from "../../curriculum/licensing/ContentUsageGuard.ts";

export class QuestionGenerator {
  /**
   * Generates a single high-quality question for a specific curriculum concept using Gemini.
   * Enforces licensing guards and subjects the output to validation before approval.
   */
  public static async generateQuestionForConcept(
    curriculumId: string,
    lessonId: string,
    conceptNameKu: string,
    difficulty: DifficultyLevel,
    type: QuestionType,
    apiKey?: string
  ): Promise<AssessmentQuestion> {
    const key = apiKey || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : undefined);
    if (!key) {
      throw new Error("GEMINI_API_KEY exists only on the server, but is currently missing.");
    }

    // 1. License Verification Guard
    const registry = CurriculumRegistry.getInstance();
    const lesson = registry.getLesson(lessonId);
    if (lesson) {
      const guard = new ContentUsageGuard();
      if (!guard.isAllowed(lesson, "generate_question")) {
        throw new Error(`Licensing violation: Lesson '${lessonId}' contains copyrighted materials restricted from AI generation.`);
      }
    }

    // Initialize client
    const ai = new GoogleGenAI({ apiKey: key });
    const model = "gemini-2.5-flash";

    const prompt = `
Generate an original assessment question for Grade 9 Math in Kurdistan.
Lesson Context: ${lesson?.title || "Algebraic Foundations"}
Concept Name: ${conceptNameKu}
Desired Difficulty: ${difficulty}
Desired Question Type: ${type}

The prompt must be written in elegant Kurdish Sorani (using correct unicode/font formatting). 
Provide a clear, pedagogical explanation in Kurdish Sorani.
For Multiple Choice questions, provide 4 options where exactly one is correct (and others are plausible distractors).
Detect potential misconceptions for incorrect options and add signatures.

Ensure the output conforms exactly to the required JSON structure.
`;

    const systemInstruction = "You are ZANA, an expert Kurdish Sorani curriculum alignment engine. You generate precise, educational, and license-safe mathematics and science assessment questions matching official curriculum standards of the Kurdistan region.";

    const responseSchema: any = {
      type: Type.OBJECT,
      properties: {
        promptKu: { type: Type.STRING, description: "The question prompt in beautiful Kurdish Sorani." },
        promptEn: { type: Type.STRING, description: "English translation of the question." },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              textKu: { type: Type.STRING }
            },
            required: ["id", "textKu"]
          }
        },
        correctAnswer: {
          type: Type.OBJECT,
          properties: {
            singleOptionId: { type: Type.STRING },
            multipleOptionIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            trueFalseValue: { type: Type.BOOLEAN },
            numericValue: { type: Type.NUMBER },
            shortAnswerPatterns: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        },
        explanationKu: { type: Type.STRING, description: "Detailed step-by-step Kurdish explanation of how to solve." },
        misconceptionSignatures: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              optionId: { type: Type.STRING },
              pattern: { type: Type.STRING },
              misconceptionId: { type: Type.STRING }
            },
            required: ["misconceptionId"]
          }
        }
      },
      required: ["promptKu", "explanationKu", "correctAnswer"]
    };

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.3
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No output received from the question generation engine.");
    }

    const payload = JSON.parse(text);

    // 2. Automated Validation and Quality Control (Review Phase)
    const errors: string[] = [];
    if (!payload.promptKu || payload.promptKu.trim().length < 5) {
      errors.push("Prompt is too short or missing.");
    }
    if (!payload.explanationKu || payload.explanationKu.trim().length < 5) {
      errors.push("Explanation is missing or insufficient.");
    }

    // Determine review status based on validation
    const reviewStatus = errors.length === 0 ? GenerationReviewStatus.GENERATED_VALIDATED : GenerationReviewStatus.REJECTED;

    const questionId = `gen_q_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;

    const newQuestion: AssessmentQuestion = {
      id: questionId,
      source: QuestionSource.GENERATED_APPROVED,
      curriculumId,
      lessonId,
      conceptId: conceptNameKu,
      difficulty,
      type,
      promptKu: payload.promptKu,
      promptEn: payload.promptEn,
      options: payload.options,
      explanationKu: payload.explanationKu,
      misconceptionSignatures: payload.misconceptionSignatures,
      estimatedDurationSeconds: 60,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      generationMetadata: {
        reviewStatus,
        generatorModel: model,
        verificationDetails: errors.length > 0 ? errors.join("; ") : "Auto-passed schema and quality checks.",
        createdAt: new Date().toISOString()
      }
    };

    if (reviewStatus === GenerationReviewStatus.GENERATED_VALIDATED) {
      // Seed into QuestionBankProvider immediately
      QuestionBankProvider.getInstance().addQuestion(newQuestion, payload.correctAnswer);
    } else {
      throw new Error(`Question generation failed quality check: ${errors.join("; ")}`);
    }

    return newQuestion;
  }
}
export class DistractorGenerator {
  /**
   * Generates plausible mathematical distractors based on common mistakes (e.g. sign flips)
   */
  public static generatePlausibleDistractors(correctValue: number, operation: string): number[] {
    const distractors = new Set<number>();
    
    if (operation === "addition_subtraction") {
      // 1. Sign flip
      distractors.add(-correctValue);
      // 2. Off by one or off by two
      distractors.add(correctValue + 1);
      distractors.add(correctValue - 1);
      distractors.add(correctValue + 2);
    } else if (operation === "multiplication_division") {
      distractors.add(correctValue * 2);
      if (correctValue % 2 === 0) distractors.add(correctValue / 2);
      distractors.add(-correctValue);
    }

    // Filter out correct answer
    distractors.delete(correctValue);
    return Array.from(distractors).slice(0, 3);
  }
}
