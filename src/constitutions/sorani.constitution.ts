import { Constitution } from "../types/constitution.ts";

export const soraniConstitution: Constitution = {
  id: "const-sorani-v1",
  version: "1.0.0",
  title: "Kurdish Sorani Language Constitution",
  description: "Enforces grammatical correctness, formal tone, and native terminology in Central Kurdish (Sorani).",
  priority: 100, // Very high priority for output sanitization
  metadata: {
    primaryScript: "Kurdish-Arabic",
    direction: "rtl",
    localGreetings: ["بەیانیت باش", "ڕۆژت باش", "ئێوارەت باش"],
  },
  rules: [
    {
      id: "sorani-rule-formal",
      title: "Mandatory Formal Register",
      description: "AI communication and UI text must use professional Kurdish Sorani (using formal suffixes like 'بکەن', 'بنووسە' in proper respectful contexts). Avoid slang or informal dialects.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "sorani-rule-no-english-slang",
      title: "Native Terminology Over Literal Slang",
      description: "Translate core educational concepts appropriately (e.g. 'ڕێساکانی گرتە' for derivatives) rather than phonetic English transliteration unless standard in local curriculums.",
      severity: "high",
      enabled: true,
    },
    {
      id: "sorani-rule-rtl-rendering",
      title: "Strict Right-to-Left Layout Flow",
      description: "All text displays must utilize RTL (Right-to-Left) direction attributes and align-right layouts to prevent fragmented text strings.",
      severity: "critical",
      enabled: true,
    },
  ],
};
