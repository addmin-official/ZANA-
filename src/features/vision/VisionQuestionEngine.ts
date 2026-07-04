import { StudentProfile } from "../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot, CurriculumNode } from "../../curriculum/types.ts";
import { SessionSnapshot } from "../../session/types.ts";
import { VisionStudyContext } from "./visionTypes.ts";

export class VisionQuestionEngine {
  /**
   * Builds the strict VisionStudyContext from student profile, curriculum, and session data.
   */
  public static buildStudyContext(
    profile: StudentProfile,
    cip: CurriculumIntelligenceSnapshot,
    lse: SessionSnapshot
  ): VisionStudyContext {
    const availableNodes = cip.resolution.availableNodes || [];
    const session = lse.currentSession;
    
    // Find current node
    const currentNodeId = session?.currentNodeId || availableNodes.find(n => n.type === "concept")?.id || "";
    const activeNode = (availableNodes.find(n => n.id === currentNodeId) || {
      title: "چەمکی خوێندن"
    }) as CurriculumNode;

    // Find active lesson node
    const activeLesson = (availableNodes.find(n => n.id === session?.currentLessonId) || activeNode) as CurriculumNode;

    return {
      studentId: profile.id,
      studentName: profile.name || "قوتابی زانا",
      grade: profile.grade,
      stream: profile.stream,
      subject: profile.activeSubject,
      level: profile.level,
      lessonTitle: activeLesson.title || undefined,
      conceptTitle: activeNode.title || undefined,
      sessionId: session?.id || undefined,
    };
  }

  /**
   * Safely revokes any existing preview URLs to prevent memory leaks in browser.
   */
  public static revokePreviewUrl(url?: string): void {
    if (url && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Failed to revoke object URL:", e);
      }
    }
  }
}
