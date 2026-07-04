import { useState } from "react";
import { ZanaCard } from "../components/ZanaCard.tsx";
import { ZanaButton } from "../components/ZanaButton.tsx";
import { StudentProfile, SubjectKey } from "../features/student/studentTypes.ts";
import { SUBJECTS_DATA, CurriculumSubject } from "../data/subjects.ts";
import { BookOpen, Calculator, Flame, Atom, Languages, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

interface SubjectsScreenProps {
  profile: StudentProfile;
  onSelectSubject: (subjectId: SubjectKey) => void;
  onNavigate: (tab: string) => void;
}

export function SubjectsScreen({ profile, onSelectSubject, onNavigate }: SubjectsScreenProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(profile.activeSubject);

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case "Calculator":
        return <Calculator className="w-5 h-5 text-blue-600" />;
      case "Flame":
        return <Flame className="w-5 h-5 text-amber-500" />;
      case "Atom":
        return <Atom className="w-5 h-5 text-emerald-500" />;
      case "Languages":
        return <Languages className="w-5 h-5 text-indigo-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleSubjectClick = (id: string) => {
    setExpandedSubject(expandedSubject === id ? null : id);
  };

  const handleStartStudy = (id: string) => {
    onSelectSubject(id as SubjectKey);
    onNavigate("chat");
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col justify-start">
      {/* Page Title */}
      <div className="text-right">
        <h2 className="font-sans font-bold text-xl text-slate-900">
          پڕۆگرامی خوێندنی پۆلی {profile.grade}
        </h2>
        <p className="font-sans text-sm text-slate-500 mt-1">
          لێرەوە دەتوانیت لەنێوان بابەتە سەرەکییەکاندا هەڵبژێریت و دەست بە فێربوون بکەیت لەگەڵ زانا.
        </p>
      </div>

      {/* Subject List */}
      <div className="space-y-4">
        {SUBJECTS_DATA.map((subject) => {
          const isExpanded = expandedSubject === subject.id;
          const isActiveSubject = profile.activeSubject === subject.id;
          const chapters = subject.grades[profile.grade] || [];

          return (
            <div
              key={subject.id}
              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                isActiveSubject ? "border-blue-500 bg-white" : "border-slate-100 bg-white"
              }`}
            >
              {/* Subject Row Trigger */}
              <button
                onClick={() => handleSubjectClick(subject.id)}
                className="w-full flex items-center justify-between p-4 text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isActiveSubject ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-500"
                  }`}>
                    {getSubjectIcon(subject.icon)}
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-950 flex items-center gap-1.5">
                      <span>{subject.name}</span>
                      {isActiveSubject && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          دیاریکراوە
                        </span>
                      )}
                    </h3>
                    <p className="font-sans text-xs text-slate-400 mt-0.5">
                      {chapters.length} بەشی خوێندن لە فەرمی
                    </p>
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Expanded Syllabus Details */}
              {isExpanded && (
                <div className="border-t border-slate-50 p-4 bg-slate-50/50 space-y-4">
                  <div className="space-y-3">
                    <p className="font-sans text-[11px] font-bold text-slate-400 text-right">
                      پێکهاتەی بەشەکان:
                    </p>
                    {chapters.length > 0 ? (
                      chapters.map((ch) => (
                        <div key={ch.id} className="bg-white border border-slate-100 p-3 rounded-xl text-right">
                          <h4 className="font-sans font-bold text-sm text-slate-800">
                            {ch.title}
                          </h4>
                          <div className="mt-2 space-y-1 mr-2 border-r border-blue-100 pr-2">
                            {ch.lessons.map((les) => (
                              <div key={les.id}>
                                <p className="font-sans text-xs font-semibold text-slate-700">
                                  • {les.title}
                                </p>
                                <p className="font-sans text-[10px] text-slate-400 mt-0.5 mr-2">
                                  {les.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="font-sans text-xs text-slate-400 text-center py-2">
                        ئەم بابەتە تا ئێستا بەشی خوێندنی لۆ ئەم پۆلە نییە.
                      </p>
                    )}
                  </div>

                  {/* Actions to Study */}
                  <ZanaButton
                    variant={isActiveSubject ? "secondary" : "primary"}
                    fullWidth
                    onClick={() => handleStartStudy(subject.id)}
                  >
                    <span>دەستپێکردنی وانەکە</span>
                    <MessageSquare className="w-4 h-4 mr-2" />
                  </ZanaButton>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
