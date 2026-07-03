import { StudentContext, StudentLevel, SubjectKey, ZanaMode, AcademicStream } from "../types/aiBrain.ts";

export class ContextEngine {
  private defaultLevel: StudentLevel = "مامناوەند";
  private defaultSubject: SubjectKey = "math";
  private defaultMode: ZanaMode = "chat";

  /**
   * Normalizes raw, partial, or incoming student context parameters into a strict, validated StudentContext.
   */
  public normalizeStudentContext(input: Partial<StudentContext>): StudentContext {
    const name = (input.name || "خوێندکار").trim();
    
    // Normalize and validate Grade
    let grade = "12";
    if (input.grade) {
      const gStr = input.grade.toString();
      if (["9", "10", "11", "12"].includes(gStr)) {
        grade = gStr;
      }
    }

    // Normalize and validate Subject
    let subject: SubjectKey = this.defaultSubject;
    if (input.subject && ["math", "physics", "chemistry", "english"].includes(input.subject)) {
      subject = input.subject as SubjectKey;
    }

    // Normalize and validate Level
    let level: StudentLevel = this.defaultLevel;
    if (input.level && ["سەرەتا", "مامناوەند", "پێشکەوتوو"].includes(input.level)) {
      level = input.level as StudentLevel;
    }

    // Normalize and validate Mode
    let mode: ZanaMode = this.defaultMode;
    if (input.mode && ["chat", "assessment", "report"].includes(input.mode)) {
      mode = input.mode as ZanaMode;
    }

    // Normalize and validate Academic Stream
    let stream: AcademicStream = "general";
    if (input.stream) {
      const sStr = input.stream.toLowerCase().trim();
      if (["scientific", "zansti", "زانستی", "science"].includes(sStr)) {
        stream = "scientific";
      } else if (["literary", "wezhayi", "wêjeyî", "وێژەیی", "adabi", "ئەدەبی"].includes(sStr)) {
        stream = "literary";
      } else if (sStr === "general") {
        stream = "general";
      }
    }

    return {
      name,
      grade,
      subject,
      level,
      mode,
      stream,
      recentTopic: input.recentTopic || "",
      recentLearningState: input.recentLearningState || "لە بارودۆخی فێربوونی چالاکدایە"
    };
  }
}
