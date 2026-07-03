export interface Lesson {
  id: string;
  title: string;
  description: string;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface CurriculumSubject {
  id: string;
  name: string;
  icon: string;
  grades: {
    [grade: string]: Chapter[];
  };
}

export const SUBJECTS_DATA: CurriculumSubject[] = [
  {
    id: "math",
    name: "بیرکاری",
    icon: "Calculator",
    grades: {
      "9": [
        {
          id: "m9-c1",
          title: "بەشی ١: هاوکێشە یەک پلەییەکان و نەخشە بنەڕەتییەکان",
          lessons: [
            { id: "m9-c1-l1", title: "شیکارکردنی هاوکێشە هێڵییەکان", description: "شێوازی گۆڕینی لایەنەکان و دۆزینەوەی گۆڕاوە نەزانراوەکان." },
            { id: "m9-c1-l2", title: "ڕوونکرنەوەی هێڵکاریی نەخشە سادەکان", description: "چۆنیەتی کێشانی هێڵی نەخشە لەسەر تەوەرەکانی پۆوتان." }
          ]
        },
        {
          id: "m9-c2",
          title: "بەشی ٢: ئەندازەی بنەڕەتی و ڕووبەرەکان",
          lessons: [
            { id: "m9-c2-l1", title: "تیۆرمی فیساگۆرس", description: "پەیوەندی نێوان لایەکانی سێگۆشەی وەستاوە گۆشە." }
          ]
        }
      ],
      "10": [
        {
          id: "m10-c1",
          title: "بەشی ١: نەخشە دووجاکان و جەبر",
          lessons: [
            { id: "m10-c1-l1", title: "شیکارکردنی هاوکێشەی دووجا بە یاسای گشتی", description: "بەکارهێنانی دەستوور (مەمیز) بۆ دۆزینەوەی ڕەگەکان." }
          ]
        }
      ],
      "11": [
        {
          id: "m11-c1",
          title: "بەشی ١: نەخشە لۆگاریتمی و توانییەکان",
          lessons: [
            { id: "m11-c1-l1", title: "سەرەتای لۆگاریتم", description: "پەیوەندی نێوان توان و لۆگاریتم و یاسا بنەڕەتییەکانی." }
          ]
        }
      ],
      "12": [
        {
          id: "m12-c1",
          title: "بەشی ١: جیاکاری و تەواوکاری (Calculus)",
          lessons: [
            { id: "m12-c1-l1", title: "سەرەتا و تێگەیشتن لە لێژبوونی هێڵکاری", description: "دۆزینەوەی لێژی نەخشە لە خاڵێکی دیاریکراودا." },
            { id: "m12-c1-l2", title: "یاساکانی دۆزینەوەی گرتە (Derivative Rules)", description: "یاسای توان، لێکدان، و دابەشکردن بۆ گرتەی نەخشەکان." }
          ]
        }
      ]
    }
  },
  {
    id: "physics",
    name: "فیزیا",
    icon: "Flame",
    grades: {
      "9": [
        {
          id: "p9-c1",
          title: "بەشی ١: جووڵە و خێرایی",
          lessons: [
            { id: "p9-c1-l1", title: "خێرایی تێکڕا و خێرایی کاتی", description: "تێگەیشتن لە چەمکی خێرایی و چۆنیەتی پێوانی." }
          ]
        }
      ],
      "10": [
        {
          id: "p10-c1",
          title: "بەشی ١: هێزەکانی جووڵە (یاساکانی نیوتن)",
          lessons: [
            { id: "p10-c1-l1", title: "یاسای یەکەم و دووەمی نیوتن", description: "یاسای سستی و یاسای هێز کە یەکسانە بە بارستایی لێکدراوی تاودان." }
          ]
        }
      ],
      "11": [
        {
          id: "p11-c1",
          title: "بەشی ١: وزە و کار",
          lessons: [
            { id: "p11-c1-l1", title: "وزەی جووڵە و وزەی مەڵاس", description: "جۆرەکانی وزە و چۆنیەتی گۆڕانیان بۆ یەکتر بەپێی یاسای پاراستنی وزە." }
          ]
        }
      ],
      "12": [
        {
          id: "p12-c1",
          title: "بەشی ١: فیزیای کارەبا و موگناتیسی",
          lessons: [
            { id: "p12-c1-l1", title: "یاسای ئۆم و خولە کارەباییەکان", description: "پەیوەندی نێوان جیاوازی پۆتنشیاڵ، تەزووی کارەبا و بەرگری." },
            { id: "p12-c1-l2", title: "موگناتیسی و هێزی لۆرێنتز", description: "کارلێکی نێوان بارگە جووڵاوەکان و کایەی موگناتیسی." }
          ]
        }
      ]
    }
  },
  {
    id: "chemistry",
    name: "کیمیا",
    icon: "Atom",
    grades: {
      "9": [
        {
          id: "c9-c1",
          title: "بەشی ١: پێکهاتەی ماددە",
          lessons: [
            { id: "c9-c1-l1", title: "گەردیلە و پێکهێنەرەکانی", description: "سەرەتایەک لەسەر پرۆتۆن، نیوترۆن، و ئەلیکترۆن لە ناوکدا." }
          ]
        }
      ],
      "10": [
        {
          id: "c10-c1",
          title: "بەشی ١: خشتەی خولیی توخمەکان",
          lessons: [
            { id: "c10-c1-l1", title: "گرۆ و خولەکان لە خشتەی خولیدا", description: "چۆنیەتی ڕێکخستنی توخمەکان بەپێی ژمارەی گەردیلەیی." }
          ]
        }
      ],
      "11": [
        {
          id: "c11-c1",
          title: "بەشی ١: هاوسەنگیی کارلێکە کیمیاییەکان",
          lessons: [
            { id: "c11-c1-l1", title: "یاسای لۆ شاتلیە", description: "کارتێکەریی گۆڕانی پلەی گەرمی و فشار لەسەر هاوسەنگی کارلێک." }
          ]
        }
      ],
      "12": [
        {
          id: "c12-c1",
          title: "بەشی ١: ترش و قەواکان (Acids and Bases)",
          lessons: [
            { id: "c12-c1-l1", title: "پێناسەکانی ئارینیۆس و برۆنشتد-لۆری", description: "جیاوازی نێوان ترش و قەواکان لەسەر بنەمای بەخشینی پرۆتۆن." },
            { id: "c12-c1-l2", title: "پێوەری pH", description: "چۆنیەتی دیاریکردنی ترشێتی یان تفتێتی گیراوەکان." }
          ]
        }
      ]
    }
  },
  {
    id: "english",
    name: "ئینگلیزی",
    icon: "Languages",
    grades: {
      "9": [
        {
          id: "e9-c1",
          title: "بەشی ١: کاتەکانی ڕابردوو و ڕستەسازی سادە",
          lessons: [
            { id: "e9-c1-l1", title: "Past Simple vs Past Continuous", description: "چۆنیەتی گێڕانەوەی ڕووداوەکان و دروستکردنی ڕستە بەم دوو کاتە." }
          ]
        }
      ],
      "10": [
        {
          id: "e10-c1",
          title: "بەشی ١: ناواخن و گفتوگۆ",
          lessons: [
            { id: "e10-c1-l1", title: "First Conditional", description: "بەکاربردنی If لە کاتی باسی ڕووداوە شیاوەکان لە داهاتوودا." }
          ]
        }
      ],
      "11": [
        {
          id: "e11-c1",
          title: "بەشی ١: زمانەوانی پێشکەوتوو",
          lessons: [
            { id: "e11-c1-l1", title: "Passive Voice (شێوازی نەناسراو)", description: "چۆنیەتی گۆڕینی ڕستەی ناسراو بۆ نەناسراو لە کاتە جیاوازەکاندا." }
          ]
        }
      ],
      "12": [
        {
          id: "e12-c1",
          title: "بەشی ١: Sunrise 12 Grammar Focus",
          lessons: [
            { id: "e12-c1-l1", title: "Modal Verbs (Must, Should, Have to)", description: "یاسای دەربرینی ناچاری، ئامۆژگاری و پێویستی بەپێی پڕۆگرامی فەرمی." },
            { id: "e12-c1-l2", title: "Relative Clauses (Who, Which, Where)", description: "پێناسەکردن یان زیادکردنی زانیاری لەسەر ناو لە ڕێگەی ڕستەی پەیوەندییەوە." }
          ]
        }
      ]
    }
  }
];

export const GRADES_LIST = [
  { value: "9", label: "پۆلی ٩ی بنەڕەتی" },
  { value: "10", label: "پۆلی ١٠ی ئامادەیی" },
  { value: "11", label: "پۆلی ١١ی ئامادەیی" },
  { value: "12", label: "پۆلی ١٢ی ئامادەیی (پۆلی کۆتایی)" }
];

export const LEVELS_LIST = [
  { value: "سەرەتا", label: "سەرەتا (Beginner)" },
  { value: "مامناوەند", label: "مامناوەند (Intermediate)" },
  { value: "پێشکەوتوو", label: "پێشکەوتوو (Advanced)" }
];
