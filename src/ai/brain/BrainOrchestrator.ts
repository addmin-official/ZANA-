import { ZanaBrainInput, ZanaBrainOutput, StudentContext, LearningMemory } from "../types/aiBrain.ts";
import { ContextEngine } from "./ContextEngine.ts";
import { SafetyEngine } from "./SafetyEngine.ts";
import { MemoryEngine } from "./MemoryEngine.ts";
import { CurriculumEngine } from "./CurriculumEngine.ts";
import { ReasoningEngine } from "./ReasoningEngine.ts";
import { PromptEngine } from "./PromptEngine.ts";

export class BrainOrchestrator {
  private contextEngine: ContextEngine;
  private safetyEngine: SafetyEngine;
  private memoryEngine: MemoryEngine;
  private curriculumEngine: CurriculumEngine;
  private reasoningEngine: ReasoningEngine;
  private promptEngine: PromptEngine;

  constructor() {
    this.contextEngine = new ContextEngine();
    this.safetyEngine = new SafetyEngine();
    this.memoryEngine = new MemoryEngine();
    this.curriculumEngine = new CurriculumEngine();
    this.reasoningEngine = new ReasoningEngine();
    this.promptEngine = new PromptEngine();
  }

  /**
   * Combines and orchestrates all sub-engines of the ZANA AI Brain.
   * Exposes: buildZanaBrainPrompt(input)
   */
  public buildZanaBrainPrompt(input: ZanaBrainInput): ZanaBrainOutput {
    // 1. Normalize student context
    const normalizedContext: StudentContext = this.contextEngine.normalizeStudentContext(
      input.studentContext
    );

    // 2. Evaluate request safety and educational limits
    const safetyResult = this.safetyEngine.evaluateStudentRequest(input.studentRequest);

    // 3. Ensure memory is initialized or merged
    let memoryState: LearningMemory;
    if (input.learningMemory) {
      memoryState = this.memoryEngine.mergeLearningMemory(
        this.memoryEngine.createEmptyLearningMemory(),
        input.learningMemory
      );
    } else {
      memoryState = this.memoryEngine.createEmptyLearningMemory();
    }

    // 4. Resolve curriculum connection
    const curriculumContext = this.curriculumEngine.resolveCurriculumContext({
      grade: normalizedContext.grade,
      subject: normalizedContext.subject,
      topicQuery: input.studentRequest
    });

    // 5. Select personalized teaching strategy
    const teachingStrategy = this.reasoningEngine.selectTeachingStrategy(normalizedContext);

    // 6. Assemble the master LLM instructions prompt
    // Feed the updated inputs to the PromptEngine for robust output
    const compiledInput: ZanaBrainInput = {
      studentContext: normalizedContext,
      studentRequest: input.studentRequest,
      learningMemory: memoryState
    };

    const systemPrompt = this.promptEngine.buildTutorPrompt(
      compiledInput,
      teachingStrategy,
      curriculumContext
    );

    return {
      systemPrompt,
      safety: safetyResult,
      context: normalizedContext,
      memory: memoryState,
      curriculum: curriculumContext,
      strategy: teachingStrategy
    };
  }
}
