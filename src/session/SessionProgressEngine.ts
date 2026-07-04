import { CurriculumNode } from "../curriculum/types.ts";

export class SessionProgressEngine {
  public calculateOverallPercentage(allSubjectNodes: CurriculumNode[], completedNodeIds: Set<string>): number {
    if (allSubjectNodes.length === 0) return 0;
    const completedInSubject = allSubjectNodes.filter(node => completedNodeIds.has(node.id)).length;
    return Math.round((completedInSubject / allSubjectNodes.length) * 100);
  }

  public calculateChapterPercentage(chapterId: string, allSubjectNodes: CurriculumNode[], completedNodeIds: Set<string>): number {
    // Find all descendants of this chapter or the chapter node itself
    const chapterNodes = allSubjectNodes.filter(
      node => node.id === chapterId || node.parentId === chapterId || (node.parentId && allSubjectNodes.some(p => p.id === node.parentId && p.parentId === chapterId))
    );

    if (chapterNodes.length === 0) return 0;
    const completed = chapterNodes.filter(node => completedNodeIds.has(node.id)).length;
    return Math.round((completed / chapterNodes.length) * 100);
  }

  public calculateLessonPercentage(lessonId: string, allSubjectNodes: CurriculumNode[], completedNodeIds: Set<string>): number {
    // Find the lesson and its children (concepts, skills, formulas)
    const lessonNodes = allSubjectNodes.filter(node => node.id === lessonId || node.parentId === lessonId);
    if (lessonNodes.length === 0) return 0;
    const completed = lessonNodes.filter(node => completedNodeIds.has(node.id)).length;
    return Math.round((completed / lessonNodes.length) * 100);
  }

  public calculateEstimatedRemainingMinutes(allSubjectNodes: CurriculumNode[], completedNodeIds: Set<string>): number {
    return allSubjectNodes
      .filter(node => !completedNodeIds.has(node.id))
      .reduce((sum, node) => sum + node.estimatedMinutes, 0);
  }

  public getCompletedConceptsCount(allSubjectNodes: CurriculumNode[], completedNodeIds: Set<string>): number {
    return allSubjectNodes.filter(node => node.type === "concept" && completedNodeIds.has(node.id)).length;
  }
}
