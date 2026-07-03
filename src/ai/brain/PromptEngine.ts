import { ZanaBrainInput, TeachingStrategy, CurriculumContext } from "../types/aiBrain.ts";
import { PromptCompiler } from "../../core/PromptCompiler.ts";
import { PersonaEngine } from "./PersonaEngine.ts";

export class PromptEngine {
  private compiler: PromptCompiler;
  private personaEngine: PersonaEngine;

  constructor() {
    this.compiler = new PromptCompiler();
    this.personaEngine = new PersonaEngine();
  }

  /**
   * Compiles and outputs the ultimate tutor instruction set for LLMs.
   * Exposes: buildTutorPrompt(input, strategy, curriculum)
   */
  public buildTutorPrompt(
    input: ZanaBrainInput,
    strategy: TeachingStrategy,
    curriculum: CurriculumContext
  ): string {
    const constitutionPrompt = this.compiler.compileSystemPrompt();
    const persona = this.personaEngine.createPersonaProfile();
    const ctx = input.studentContext;
    const mem = input.learningMemory;

    let prompt = `${constitutionPrompt}\n`;

    // 1. Core AI Persona Section
    prompt += `==================================================\n`;
    prompt += `ZANA TUTOR PROFILE & PERSONALITY\n`;
    prompt += `==================================================\n`;
    prompt += `Name: ${persona.name}\n`;
    prompt += `Role: ${persona.role}\n`;
    prompt += `Tone: ${persona.tone}\n`;
    prompt += `Primary Language: ${persona.language}\n\n`;
    prompt += `Behavioral Persona Directives:\n`;
    for (const d of persona.directives) {
      prompt += `- ${d}\n`;
    }
    prompt += `\n`;

    // 2. Active Teaching Strategy Section
    prompt += `==================================================\n`;
    prompt += `ACTIVE PEDAGOGICAL STRATEGY\n`;
    prompt += `==================================================\n`;
    prompt += `Strategy Name: ${strategy.strategyName}\n`;
    prompt += `Explanation Depth: ${strategy.explanationDepth}\n`;
    prompt += `Exercise Trigger Active: ${strategy.exerciseTrigger ? "YES" : "NO"}\n`;
    prompt += `Strategic Rationale: ${strategy.rationale}\n\n`;
    prompt += `Pedagogical Directives to Enforce in This Response:\n`;
    for (const d of strategy.instructionDirectives) {
      prompt += `- ${d}\n`;
    }
    prompt += `\n`;

    // 3. Current Curriculum Focus
    prompt += `==================================================\n`;
    prompt += `CURRICULUM BOUNDS & STATE\n`;
    prompt += `==================================================\n`;
    prompt += `Grade Level: پۆلی ${curriculum.grade}\n`;
    prompt += `Academic Stream: ڕێڕەوی ${curriculum.streamLabel}\n`;
    prompt += `Subject: ${curriculum.subject}\n`;
    prompt += `Chapter/Topic Area: ${curriculum.chapter} - ${curriculum.topic}\n`;
    if (curriculum.warnings && curriculum.warnings.length > 0) {
      prompt += `🚨 CURRICULUM WARNINGS:\n`;
      for (const w of curriculum.warnings) {
        prompt += `  - ${w}\n`;
      }
    }
    prompt += `\n`;

    // 4. Student Context & Memory Profile
    prompt += `==================================================\n`;
    prompt += `STUDENT PERFORMANCE AND COGNITIVE PROFILE\n`;
    prompt += `==================================================\n`;
    prompt += `Active Student: ${ctx.name}\n`;
    prompt += `Academic Level Setting: ${ctx.level}\n`;
    prompt += `Recent Topic: ${ctx.recentTopic || "گشتی"}\n`;
    prompt += `Learning State: ${ctx.recentLearningState || "فێربوونی چالاک"}\n\n`;

    if (mem) {
      prompt += `Student Historical Memory State:\n`;
      prompt += `- Mastered Topics: ${mem.masteredTopics.length > 0 ? mem.masteredTopics.join(", ") : "هیچ بابەتێکی ماستەر کراو تۆمار نەکراوە بۆ ئەم وانەیە"}\n`;
      prompt += `- Weak Areas / Difficulties: ${mem.weakAreas.length > 0 ? mem.weakAreas.join(", ") : "بێ کێشەی دیاریکراو"}\n`;
      prompt += `- Recent Common Mistakes: ${mem.recentMistakes.length > 0 ? mem.recentMistakes.join("; ") : "هیچ تۆمارێکی هەڵەی گەورە نییە"}\n`;
      prompt += `- Last Assessment Result: ${mem.lastAssessmentResult || "تاقیکردنەوەی ئەنجام نەداوە"}\n`;
    }
    prompt += `\n`;

    // 5. Final Instructions execution boundaries
    prompt += `==================================================\n`;
    prompt += `IMMEDIATE RESPONSE OUTPUT DIRECTIVES\n`;
    prompt += `==================================================\n`;
    prompt += `1. Response MUST be in professional Kurdish Sorani using the right-to-left layout guidelines.\n`;
    prompt += `2. NEVER write the direct final numerical/symbolic answer immediately if the student asks for a solution. Scaffold the problem first.\n`;
    prompt += `3. If the student request matches an out-of-scope curriculum warning or is flagged by the Safety Engine, ignore academic content and politely redirect to safe curriculum limits.\n`;
    prompt += `4. Keep markdown clear, formatted, and elegant.\n`;
    prompt += `5. ئەگەر ڕێڕەوی خوێندن گشتی بێت یان دیاری نەکرابێت، پێش وەڵامی قووڵ، بە نەرمی داوا بکە ڕێڕەوی قوتابی دیاری بکرێت.\n`;

    return prompt;
  }
}
