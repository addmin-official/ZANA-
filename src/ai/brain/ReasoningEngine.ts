import { StudentContext, TeachingStrategy } from "../types/aiBrain.ts";

export class ReasoningEngine {
  /**
   * Adapts the pedagogical response strategy based on student characteristics and context.
   * Exposes: selectTeachingStrategy(context)
   */
  public selectTeachingStrategy(context: StudentContext): TeachingStrategy {
    const { level, mode, subject } = context;

    let strategyName = "شیکاری هێمن و نیشاندانی نموونە";
    let explanationDepth = "مامناوەند و ڕوون";
    let exerciseTrigger = false;
    let rationale = "";
    const instructionDirectives: string[] = [];

    // 1. Set Level-Specific Parameters
    if (level === "سەرەتا") {
      strategyName = "سادەکردنەوەی بنەڕەتی و نموونەی بەرجەستە";
      explanationDepth = "سادەکردنەوەی تەواو";
      rationale = "قوتابی لە قۆناغی سەرەتادایە؛ پێویستە چەمکەکان بە بەکارهێنانی مێتافۆری سادە و گوزارشتی ژیانی ڕۆژانە شیبکرێنەوە، بەبێ بەکارهێنانی زاراوەی تەمومژاوی یان گەورە.";
      instructionDirectives.push(
        "هەر هاوکێشەیەک دەنوسیت، سەرەتا پێکهاتە گشتییەکانی زۆر بە کورتی و بە کوردییەکی سادە بناسێنە.",
        "دوا بە دوای ڕوونکردنەوە، هەمیشە داوای نموونەیەکی بچووک لە قوتابی بکە بۆ دڵنیابوونەوە.",
        "تۆنەکەت با زۆر گەرم بێت و هانی بدەیت تەنانەت ئەگەر هەڵەیەکی سادەش بکات."
      );
    } else if (level === "مامناوەند") {
      strategyName = "ڕێبازی سۆکراتی و تاقیکردنەوەی هاندەر";
      explanationDepth = "مامناوەند و ڕوون";
      rationale = "قوتابی بنەمای بابەتەکە دەزانێت؛ لێرەدا پێویستە بە پرسیارکردن لێی، ناچاری بکەین خۆی بگاتە بەشێکی گرنگی وەڵامەکە.";
      instructionDirectives.push(
        "تیۆرییەکە بە یەک تا دوو پەرەگراف شیبکەرەوە، پاشان پرسیارێکی کورت دابنێ بۆ ئەوەی خۆی هەنگاوی دواتر تاقی بکاتەوە.",
        "بەکارهێنانی یاسا فەرمییەکان گرنگە، بەڵام هاوتەریب مانا تیۆرییەکەشی بۆ باس بکە.",
        "ڕێنمایی بدە بەبێ ئەوەی هەموو وەڵامەکە یەکسەری ئاشکرا بکەیت."
      );
    } else {
      // پێشکەوتوو (Advanced)
      strategyName = "شیکاری ماتماتیکی قووڵ و تاقیکردنەوەی کێشە کورتەکان";
      explanationDepth = "قووڵ و شیکارکەرانە";
      rationale = "قوتابی ئاستی زۆر باشە؛ پێویستە بابەتەکان بە شێوازێکی زانستیی تەواو قووڵ و لۆجیکی بخەینە ڕوو، بۆ ئەوەی ئاستەنگ دروست بێت بۆ هۆشی و زیاتر حەز بە فێربوون بکات.";
      instructionDirectives.push(
        "یاساکە بە شێوازی فەرمی زانستی و هاوکێشەی ماتماتیکی کامل دابنێ و بیسەلمێنە.",
        "لەبری شیکاری گشتی، سەرنج بخەرە سەر حاڵەتە تایبەتەکان یان جیاوازییە وردەکان.",
        "پرسیاری تاقیکاریی ئاست بەرز و داهێنەرانەی بۆ پێشنیار بکە."
      );
    }

    // 2. Set Mode-Specific Tweaks
    if (mode === "assessment") {
      exerciseTrigger = true;
      strategyName = "هەڵسەنگاندنی چالاک و دڵسۆزانە";
      rationale += " (دۆخی تاقیکردنەوە چالاکە: تەنها سەرنج بخەرە سەر پرسیارکردن و دڵنیاکردنەوە).";
      instructionDirectives.push(
        "تەنها یەک پرسیار ئاڕاستە بکە لە هەر جارێکدا.",
        "هەڵسەنگاندن بکە بۆ وەڵامی پێشووی قوتابی و هۆکاری ڕاستی یان هەڵەبوونی بە کورتی باس بکە پێش ئەوەی پرسیاری نوێ دابنێیت."
      );
    } else if (mode === "report") {
      strategyName = "ڕاپۆرتی گەشەکردنی قوتابی";
      rationale = "خوێندنەوەی گەشەی قوتابی بۆ باوان بە زمانی فەرمی و دڵنیاکەرەوە.";
      instructionDirectives.push(
        "ڕاپۆرتەکە بە کوردییەکی سۆرانیی زۆر فەرمی دابڕێژە.",
        "خاڵە بەهێزەکان بخەرە پێش چاو، پاشان بە زمانێکی هاندەر لاوازییەکان باس بکە بۆ دەرگا کشانەوە."
      );
    } else {
      // chat
      // Trigger exercise sometimes (e.g. 50% probability based on request context, but let's keep it stable for now)
      if (subject === "math" || subject === "physics" || subject === "chemistry") {
        exerciseTrigger = true;
      }
    }

    return {
      strategyName,
      explanationDepth,
      exerciseTrigger,
      rationale,
      instructionDirectives
    };
  }
}
