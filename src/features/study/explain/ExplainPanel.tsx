import { useEffect, useState } from "react";
import { StudentProfile } from "../../student/studentTypes.ts";
import { CurriculumIntelligenceSnapshot } from "../../../curriculum/types.ts";
import { SessionSnapshot } from "../../../session/types.ts";
import { useExplainMode } from "./useExplainMode.ts";
import { ExplainSection } from "./explainTypes.ts";
import { ZanaCard } from "../../../components/ZanaCard.tsx";
import { ZanaButton } from "../../../components/ZanaButton.tsx";
import { motion } from "motion/react";
import {
  Brain,
  ListOrdered,
  FileCheck,
  AlertTriangle,
  Award,
  ArrowRight,
  BookOpen,
  HelpCircle,
  CheckCircle,
  Lightbulb,
  Clock,
  Sparkles,
  Info
} from "lucide-react";
import { DomainEventBus } from "../../../domain/DomainEventBus.ts";
import { DomainEventFactory } from "../../../domain/DomainEventFactory.ts";

interface ExplainPanelProps {
  studentProfile: StudentProfile;
  curriculumSnapshot: CurriculumIntelligenceSnapshot;
  sessionSnapshot: SessionSnapshot;
  onNavigate: (tab: string) => void;
  onNextStep?: () => void;
}

export function ExplainPanel({
  studentProfile,
  curriculumSnapshot,
  sessionSnapshot,
  onNavigate,
  onNextStep
}: ExplainPanelProps) {
  const { snapshot, isLoading, error } = useExplainMode({
    studentProfile,
    curriculumSnapshot,
    sessionSnapshot
  });

  const [expandedSection, setExpandedSection] = useState<string>("sec_theory");
  const [practiceAnswered, setPracticeAnswered] = useState<boolean>(false);
  const [practiceRevealed, setPracticeRevealed] = useState<boolean>(false);

  // Reset states when the concept shifts
  useEffect(() => {
    setExpandedSection("sec_theory");
    setPracticeAnswered(false);
    setPracticeRevealed(false);
  }, [snapshot?.conceptTitle]);

  // Emit Domain Events LESSON_STARTED and CONCEPT_STARTED
  useEffect(() => {
    if (snapshot) {
      try {
        const eventBus = DomainEventBus.getInstance();
        const currentSession = sessionSnapshot.currentSession;

        if (currentSession) {
          // 1. Create and publish LESSON_STARTED event
          const lessonEvent = DomainEventFactory.createEvent(
            "LESSON_STARTED",
            studentProfile.id,
            "ai-tutor",
            {
              lessonId: currentSession.currentLessonId || "unknown_lesson",
              sessionId: currentSession.id
            },
            {
              nodeId: currentSession.currentNodeId,
              sessionId: currentSession.id,
              subject: studentProfile.activeSubject,
              grade: studentProfile.grade,
              stream: studentProfile.stream
            }
          );
          eventBus.publish(lessonEvent);

          // 2. Create and publish CONCEPT_STARTED event
          const conceptEvent = DomainEventFactory.createEvent(
            "CONCEPT_STARTED",
            studentProfile.id,
            "ai-tutor",
            {
              conceptId: currentSession.currentNodeId || "unknown_concept",
              sessionId: currentSession.id
            },
            {
              nodeId: currentSession.currentNodeId,
              sessionId: currentSession.id,
              subject: studentProfile.activeSubject,
              grade: studentProfile.grade,
              stream: studentProfile.stream
            }
          );
          eventBus.publish(conceptEvent);
        }
      } catch (e) {
        console.warn("Domain event system could not publish start events:", e);
      }
    }
  }, [snapshot?.conceptTitle, studentProfile.id, sessionSnapshot.currentSession?.currentNodeId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3" dir="rtl">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-sans text-xs text-slate-500">خەریکە ڕوونکردنەوەی فێربوون ئامادە دەکرێت...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-center space-y-4" dir="rtl">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="font-sans text-sm font-bold text-rose-800">{error || "هیچ زانیارییەک بەردەست نییە."}</p>
        <ZanaButton variant="secondary" onClick={() => window.location.reload()}>
          دووبارە تاقیکردنەوە
        </ZanaButton>
      </div>
    );
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "theory":
        return <Brain className="w-4 h-4 text-blue-500" />;
      case "steps":
        return <ListOrdered className="w-4 h-4 text-purple-500" />;
      case "example":
        return <FileCheck className="w-4 h-4 text-indigo-500" />;
      case "common_mistake":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "mini_practice":
        return <Award className="w-4 h-4 text-emerald-500" />;
      case "next_step":
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSectionStyles = (type: string, isExpanded: boolean) => {
    if (!isExpanded) {
      return "border-slate-100 bg-white hover:bg-slate-50/50";
    }
    switch (type) {
      case "theory":
        return "border-blue-200 bg-blue-50/20";
      case "steps":
        return "border-purple-200 bg-purple-50/20";
      case "example":
        return "border-indigo-200 bg-indigo-50/20";
      case "common_mistake":
        return "border-amber-200 bg-amber-50/20";
      case "mini_practice":
        return "border-emerald-200 bg-emerald-50/20";
      case "next_step":
        return "border-amber-200 bg-amber-50/20";
      default:
        return "border-slate-200 bg-slate-50/30";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="space-y-5 text-right select-none" dir="rtl">
      {/* 1. SECTION HEADER */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div>
          <span className="font-sans text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
            {snapshot.subjectLabel}
          </span>
          <h2 className="font-sans font-black text-lg text-slate-950 mt-2.5 leading-snug">
            {snapshot.conceptTitle}
          </h2>
          <p className="font-sans text-xs font-medium text-slate-500 mt-1 leading-snug">
            {snapshot.lessonTitle}
          </p>
        </div>

        {/* Dynamic Warning Banner if any */}
        {snapshot.warnings.map((warn, index) => (
          <div key={index} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2 text-right">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="font-sans text-[11px] text-amber-800 font-medium leading-relaxed">{warn}</p>
          </div>
        ))}

        {/* Metadata Badges */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-50">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-sans text-slate-600">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>خوێندن: {snapshot.estimatedMinutes} خولەک</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-sans text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>ئاستی {snapshot.difficultyLabel}</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 text-[10px] font-sans text-slate-600">
            <span>{snapshot.gradeLabel}</span>
            <span>{snapshot.streamLabel}</span>
          </div>
        </div>
      </div>

      {/* 2. PEDAGOGICAL EXPANDABLE WORKSPACE */}
      <motion.div
        variants={containerVariants as any}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {snapshot.sections.map((section: ExplainSection) => {
          const isExpanded = expandedSection === section.id;
          const sectionIcon = getSectionIcon(section.type);
          const blockStyles = getSectionStyles(section.type, isExpanded);

          return (
            <motion.div
              key={section.id}
              variants={itemVariants as any}
              className={`border rounded-2xl overflow-hidden transition-all duration-300 shadow-xs ${blockStyles}`}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? "" : section.id)}
                className="w-full p-4 flex items-center justify-between text-right cursor-pointer"
                style={{ minHeight: "48px" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 shadow-2xs flex items-center justify-center shrink-0">
                    {sectionIcon}
                  </div>
                  <span className="font-sans font-black text-xs text-slate-800">
                    {section.title}
                  </span>
                </div>
                <div className={`w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Card Body */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100/50 text-right animate-fade-in">
                  {section.type === "mini_practice" ? (
                    <div className="space-y-4">
                      <p className="font-sans text-xs text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">
                        {section.body}
                      </p>

                      {/* Interactive practice reveal */}
                      {!practiceRevealed ? (
                        <button
                          onClick={() => setPracticeRevealed(true)}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-sans font-black transition-colors cursor-pointer flex items-center justify-center gap-2"
                          style={{ minHeight: "48px" }}
                        >
                          <Lightbulb className="w-4 h-4 shrink-0" />
                          <span>بینینی وەڵامی دروست و ڕوونکردنەوە</span>
                        </button>
                      ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-2 text-right">
                          <span className="font-sans text-[10px] font-black text-emerald-800 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            شیکار و وەڵامی فەرمی:
                          </span>
                          <p className="font-sans text-xs text-emerald-950 font-medium leading-relaxed">
                            وەڵامەکە شیبکەرەوە و هەمیشە بە دابەشکردنی ڕاستەوخۆ دەست پێبکە بۆ چەمکە جیاوازەکان.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : section.type === "next_step" ? (
                    <div className="space-y-4">
                      <p className="font-sans text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {section.body}
                      </p>
                      
                      <div className="pt-2">
                        <ZanaButton
                          variant="primary"
                          fullWidth
                          onClick={onNextStep}
                          className="shadow-md text-xs font-black"
                        >
                          <span>کردنەوەی بەشی ڕاهێنانی فەرمی</span>
                          <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                        </ZanaButton>
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {section.body}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
