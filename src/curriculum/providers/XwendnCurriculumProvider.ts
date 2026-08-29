import { CurriculumProvider } from "./CurriculumProvider.ts";
import {
  Curriculum,
  Grade,
  Subject,
  Unit,
  CurriculumLesson,
  SourceMetadata,
} from "../domain/CurriculumTypes.ts";

export interface XwendnProvenance {
  sourceUrl: string;
  sourceName: string;
  language: string;
  retrievedAt: string;
  curriculumDomain: string;
  licenseStatus: "OPEN_LICENSE";
}

export const XWENDN_CURRICULUM_ID = "curriculum-xwendn-krd";
export const XWENDN_LICENSE_ID = "license-xwendn-krd-open";

export const XWENDN_CURRICULUM_METADATA: Curriculum = {
  id: XWENDN_CURRICULUM_ID,
  name: "Xwendn.krd Educational Portal (پلاتفۆرمی پەروەردەیی خوێندن)",
  description: "Official educational resources, textbook curriculum metadata and examination guides from xwendn.krd for Kurdistan Region high school stages.",
  region: "Kurdistan Region of Iraq",
  version: "2024-2026",
};

export const XWENDN_GRADES: Grade[] = [
  { id: "xwendn-g10", code: "10", title: "پۆلی ١٠ - ئامادەیی", description: "قۆناغی دەیەمی ئامادەیی" },
  { id: "xwendn-g11", code: "11", title: "پۆلی ١١ - ئامادەیی", description: "قۆناغی یازدەیەمی ئامادەیی (زانستی / وێژەیی)" },
  { id: "xwendn-g12", code: "12", title: "پۆلی ١٢ - ئامادەیی", description: "قۆناغی دوازدەیەمی ئامادەیی (وەزاری)" },
];

export const XWENDN_SUBJECTS: Subject[] = [
  { id: "xwendn-subj-chem", code: "chemistry", title: "کیمیا" },
  { id: "xwendn-subj-math", code: "math", title: "بیرکاری" },
  { id: "xwendn-subj-phys", code: "physics", title: "فیزیا" },
  { id: "xwendn-subj-eng", code: "english", title: "ئینگلیزی" },
];

export const XWENDN_PILOT_UNITS: Unit[] = [
  {
    id: "xwendn-g12-chem-u1",
    curriculumId: XWENDN_CURRICULUM_ID,
    grade: "12",
    stream: "scientific",
    subject: "chemistry",
    title: "ترشەکان و تفتەکان (Acids and Bases)",
    description: "تیۆرییەکانی ترش و تفت، هاوسەنگی ئاو، پێوەری pH و کارلێکەکانی هاوتایی لە پڕۆگرامی پۆلی ١٢ی زانستی.",
    order: 1,
  },
  {
    id: "xwendn-g12-chem-u2",
    curriculumId: XWENDN_CURRICULUM_ID,
    grade: "12",
    stream: "scientific",
    subject: "chemistry",
    title: "کیمیای کارەبایی و ئۆکسان و داڕزان (Electrochemistry & Redox)",
    description: "کارلێکەکانی گواستنەوەی ئەلیکترۆن، ژمارەی ئۆکسان، و هاوکێشەکانی ئۆکسان و داڕزان.",
    order: 2,
  },
];

export const XWENDN_PILOT_LESSONS: CurriculumLesson[] = [
  {
    id: "xwendn-g12-chem-l1",
    curriculumId: XWENDN_CURRICULUM_ID,
    grade: "12",
    stream: "scientific",
    subject: "chemistry",
    unitId: "xwendn-g12-chem-u1",
    title: "پێناسەی ترش و تفتەکان (تیۆری برۆنستد-لۆری و ئارینیۆس)",
    concepts: ["ترشی برۆنستد-لۆری", "تفتی برۆنستد-لۆری", "پێناسەی ئارینیۆس", "جووتە هاوجوت"],
    learningObjectives: [
      "تێگەیشتن لە تیۆرییەکانی ئارینیۆس، برۆنستد-لۆری و لویس بۆ ترش و تفتەکان.",
      "دیاریکردنی بەخشەری پرۆتۆن (+H) و وەرگری پرۆتۆن لە کارلێکە کیمیاییەکاندا.",
      "دەستنیشانکردنی جووتی ترش و تفتی هاوجوت (Conjugate Acid-Base Pairs)."
    ],
    skills: [
      "نووسین و شیکردنەوەی هاوکێشەی کارلێکی ترش و تفت",
      "دیاریکردنی ترشی هاوجوت و تفتی هاوجوت لە هەر کارلێکێکدا"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: XWENDN_LICENSE_ID,
    contentExcerpts: [
      "ترشی برۆنستد-لۆری (Brønsted-Lowry Acid): گەرد یان ئایۆنێکە کە پرۆتۆن (+H) دەبەخشێت بە ماددەیەکی تر لە کارلێکدا.",
      "تفتی برۆنستد-لۆری (Brønsted-Lowry Base): گەرد یان ئایۆنێکە کە پرۆتۆن (+H) وەردەگرێت لە ماددەیەکی تر.",
      "جووتە هاوجوت (Conjugate Pair): دوو ماددەن کە تەنها بە جیاوازی یەک پرۆتۆن (+H) لە یەکتر جیا دەکرێنەوە. ترش دوای بەخشینی پرۆتۆن دەبێتە تفتی هاوجوت، و تفت دوای وەرگرتنی پرۆتۆن دەبێتە ترشی هاوجوت.",
      "نموونە: لە کارلێکی NH3 + H2O ⇌ NH4+ + OH-، ئاو (H2O) وەک ترش پرۆتۆن دەبەخشێت و OH- تفتی هاوجوتیەتی؛ ئامۆنیا (NH3) تفتە و NH4+ ترشی هاوجوتیەتی."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "xwendn.krd",
        author: "پەروەردەی هەرێمی کوردستان / xwendn.krd",
        edition: "چاپی فەرمی وەزاری / پۆلی ١٢ی زانستی",
        publishedYear: 2024,
        url: "https://xwendn.krd/grade/12",
        attributionText: "لەسەر بنەمای سەرچاوەی پەروەردەیی xwendn.krd بۆ پۆلی ١٢ی زانستی",
      } as SourceMetadata,
      provenance: {
        sourceUrl: "https://xwendn.krd/grade/12",
        sourceName: "xwendn.krd - پەروەردەی هەرێمی کوردستان",
        language: "ckb",
        retrievedAt: "2026-08-28T12:00:00.000Z",
        curriculumDomain: "کیمیای پۆلی ١٢ی زانستی",
        licenseStatus: "OPEN_LICENSE",
      } as XwendnProvenance,
    },
  },
  {
    id: "xwendn-g12-chem-l2",
    curriculumId: XWENDN_CURRICULUM_ID,
    grade: "12",
    stream: "scientific",
    subject: "chemistry",
    unitId: "xwendn-g12-chem-u1",
    title: "پێوەری pH و هاوسەنگی ئایۆنیی ئاو (pH Scale & Water Ionization)",
    concepts: ["پێوەری pH", "هاوسەنگی ئاو Kw", "خەستی هایدرۆنیۆم", "خەستی هایدرۆکسید"],
    learningObjectives: [
      "هەژمارکردنی هایدرۆجینە ژمارە (pH) بە بەکارهێنانی هاوکێشەی pH = -log[H3O+].",
      "تێگەیشتن لە نەگۆڕی هاوسەنگی ئایۆنیی ئاو (Kw = 1.0 × 10^-14 لە پلەی گەرمی 25°C).",
      "پۆلێنکردنی گیراوەکان بۆ ترش (pH < 7)، بێلایەن (pH = 7)، و تفت (pH > 7)."
    ],
    skills: [
      "هەژمارکردنی [H3O+] و [OH-] بە هاوکێشەی Kw",
      "شیکارکردنی پرسیارە بیرکارییەکانی پەیوەست بە pH و pOH"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: XWENDN_LICENSE_ID,
    contentExcerpts: [
      "نەگۆڕی هاوسەنگی ئاو (Kw): ئاو خۆبەخۆ کەمێک ئایۆن دەبێت: 2H2O ⇌ H3O+ + OH-. لە پلەی گەرمی 25°C دا، Kw = [H3O+][OH-] = 1.0 × 10^-14.",
      "یاسای pH: pH بریتییە لە لۆگاریتمی نەرێنی خەستی ئایۆنی هایدرۆنیۆم: pH = -log[H3O+].",
      "پەیوەندی نێوان pH و pOH: هەمیشە لە پلەی 25°C دا، pH + pOH = 14.0."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "xwendn.krd",
        author: "پەروەردەی هەرێمی کوردستان / xwendn.krd",
        edition: "چاپی فەرمی وەزاری / پۆلی ١٢ی زانستی",
        publishedYear: 2024,
        url: "https://xwendn.krd/grade/12",
        attributionText: "لەسەر بنەمای سەرچاوەی پەروەردەیی xwendn.krd بۆ پۆلی ١٢ی زانستی",
      } as SourceMetadata,
      provenance: {
        sourceUrl: "https://xwendn.krd/grade/12",
        sourceName: "xwendn.krd - پەروەردەی هەرێمی کوردستان",
        language: "ckb",
        retrievedAt: "2026-08-28T12:00:00.000Z",
        curriculumDomain: "کیمیای پۆلی ١٢ی زانستی",
        licenseStatus: "OPEN_LICENSE",
      } as XwendnProvenance,
    },
  },
  {
    id: "xwendn-g12-chem-l3",
    curriculumId: XWENDN_CURRICULUM_ID,
    grade: "12",
    stream: "scientific",
    subject: "chemistry",
    unitId: "xwendn-g12-chem-u2",
    title: "کارلێکەکانی ئۆکسان و داڕزان (Redox Reactions)",
    concepts: ["ئۆکسان", "داڕزان", "ژمارەی ئۆکسان", "هۆکاری ئۆکسێنەر", "هۆکاری داڕزێنەر"],
    learningObjectives: [
      "پێناسەکردنی کارلێکەکانی ئۆکسان و داڕزان لەسەر بنەمای گواستنەوەی ئەلیکترۆن.",
      "دیاریکردنی ژمارەی ئۆکسانی گەردیلەکان لەناو لێکدراوە جۆراوجۆرەکاندا.",
      "ناسینەوەی هۆکاری ئۆکسێنەر (Oxidizing Agent) و هۆکاری داڕزێنەر (Reducing Agent)."
    ],
    skills: [
      "دۆزینەوەی گۆڕانی ژمارەی ئۆکسان لە کارلێکدا",
      "جیاکردنەوەی نیوە کارلێکی ئۆکسان و نیوە کارلێکی داڕزان"
    ],
    sourceStatus: "OPEN_LICENSE",
    licenseId: XWENDN_LICENSE_ID,
    contentExcerpts: [
      "ئۆکسان (Oxidation): بریتییە لە لەدەستدانی ئەلیکترۆن لە لایەن گەردیلە یان ئایۆنێک، کە دەبێتە هۆی بەرزبوونەوەی ژمارەی ئۆکسان (وەک: Zn → Zn2+ + 2e-).",
      "داڕزان (Reduction): بریتییە لە وەرگرتنی ئەلیکترۆن لە لایەن گەردیلە یان ئایۆنێک، کە دەبێتە هۆی کەمبوونەوەی ژمارەی ئۆکسان (وەک: Cu2+ + 2e- → Cu).",
      "هۆکاری داڕزێنەر: ئەو ماددەیەیە کە ئەلیکترۆن دەبەخشێت و خۆی ئۆکسانی بەسەر دێت.",
      "هۆکاری ئۆکسێنەر: ئەو ماددەیەیە کە ئەلیکترۆن وەردەگرێت و خۆی داڕزانی بەسەر دێت."
    ],
    metadata: {
      sourceMetadata: {
        publisher: "xwendn.krd",
        author: "پەروەردەی هەرێمی کوردستان / xwendn.krd",
        edition: "چاپی فەرمی وەزاری / پۆلی ١٢ی زانستی",
        publishedYear: 2024,
        url: "https://xwendn.krd/grade/12",
        attributionText: "لەسەر بنەمای سەرچاوەی پەروەردەیی xwendn.krd بۆ پۆلی ١٢ی زانستی",
      } as SourceMetadata,
      provenance: {
        sourceUrl: "https://xwendn.krd/grade/12",
        sourceName: "xwendn.krd - پەروەردەی هەرێمی کوردستان",
        language: "ckb",
        retrievedAt: "2026-08-28T12:00:00.000Z",
        curriculumDomain: "کیمیای پۆلی ١٢ی زانستی",
        licenseStatus: "OPEN_LICENSE",
      } as XwendnProvenance,
    },
  },
];

export class XwendnCurriculumProvider implements CurriculumProvider {
  private curricula: Map<string, Curriculum> = new Map();
  private grades: Grade[] = XWENDN_GRADES;
  private subjects: Subject[] = XWENDN_SUBJECTS;
  private units: Map<string, Unit> = new Map();
  private lessons: Map<string, CurriculumLesson> = new Map();

  constructor() {
    this.curricula.set(XWENDN_CURRICULUM_ID, XWENDN_CURRICULUM_METADATA);
    for (const unit of XWENDN_PILOT_UNITS) {
      this.units.set(unit.id, unit);
    }
    for (const lesson of XWENDN_PILOT_LESSONS) {
      this.lessons.set(lesson.id, lesson);
    }
  }

  public async getCurriculum(id: string): Promise<Curriculum | undefined> {
    return this.curricula.get(id);
  }

  public async listGrades(): Promise<Grade[]> {
    return [...this.grades];
  }

  public async listSubjects(): Promise<Subject[]> {
    return [...this.subjects];
  }

  public async listUnits(curriculumId: string, grade: string, subject: string): Promise<Unit[]> {
    return Array.from(this.units.values()).filter(
      (u) =>
        (u.curriculumId === curriculumId || curriculumId === XWENDN_CURRICULUM_ID) &&
        u.grade === grade &&
        u.subject === subject
    );
  }

  public async listLessons(unitId: string): Promise<CurriculumLesson[]> {
    return Array.from(this.lessons.values()).filter((l) => l.unitId === unitId);
  }

  public async getLesson(id: string): Promise<CurriculumLesson | undefined> {
    return this.lessons.get(id);
  }

  public async searchLessons(query: string, limit: number = 10): Promise<CurriculumLesson[]> {
    if (!query) return [];
    const q = query.toLowerCase();
    const results = Array.from(this.lessons.values()).filter((lesson) => {
      return (
        lesson.title.toLowerCase().includes(q) ||
        lesson.concepts.some((c) => c.toLowerCase().includes(q)) ||
        lesson.learningObjectives.some((o) => o.toLowerCase().includes(q)) ||
        lesson.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
    return results.slice(0, limit);
  }

  public async retrieveContext(
    grade: string,
    subject: string,
    lessonTitle?: string,
    conceptTitle?: string,
    query?: string
  ): Promise<CurriculumLesson[]> {
    const matchingLessons = Array.from(this.lessons.values()).filter((lesson) => {
      if (lesson.grade !== grade) return false;
      if (lesson.subject !== subject) return false;
      return true;
    });

    if (matchingLessons.length === 0) {
      return [];
    }

    const scored = matchingLessons.map((lesson) => {
      let score = 1;

      if (lessonTitle) {
        const lt = lessonTitle.toLowerCase();
        if (lesson.title.toLowerCase() === lt) {
          score += 60;
        } else if (lesson.title.toLowerCase().includes(lt) || lt.includes(lesson.title.toLowerCase())) {
          score += 35;
        }
      }

      if (conceptTitle) {
        const ct = conceptTitle.toLowerCase();
        if (lesson.concepts.some((c) => c.toLowerCase() === ct)) {
          score += 50;
        } else if (lesson.concepts.some((c) => c.toLowerCase().includes(ct) || ct.includes(c.toLowerCase()))) {
          score += 25;
        }
      }

      if (query) {
        const q = query.toLowerCase();
        if (lesson.title.toLowerCase().includes(q)) {
          score += 30;
        }
        const conceptMatches = lesson.concepts.filter((c) => c.toLowerCase().includes(q)).length;
        score += conceptMatches * 20;
        const objectiveMatches = lesson.learningObjectives.filter((o) => o.toLowerCase().includes(q)).length;
        score += objectiveMatches * 15;
        const skillMatches = lesson.skills.filter((s) => s.toLowerCase().includes(q)).length;
        score += skillMatches * 10;
        if (lesson.contentExcerpts?.some((e) => e.toLowerCase().includes(q))) {
          score += 25;
        }
      }

      return { lesson, score };
    });

    const filtered = (lessonTitle || conceptTitle || query)
      ? scored.filter((s) => s.score > 1).sort((a, b) => b.score - a.score)
      : scored.map((s) => ({ lesson: s.lesson, score: 1 }));

    return filtered.map((f) => f.lesson);
  }
}
