import { Constitution } from "../types/constitution.ts";

export const uxConstitution: Constitution = {
  id: "const-ux-v1",
  version: "1.0.0",
  title: "ZANA User Experience & Usability Constitution",
  description: "Establishes interface constraints, ensuring high accessibility, consistent visual weight, and device compatibility.",
  priority: 50,
  metadata: {
    minTouchTargetPx: 44,
    desktopMaxContainerWidth: "7xl",
    defaultRTLSpacingPrefix: "mr-",
  },
  rules: [
    {
      id: "ux-rule-touch-targets",
      title: "Minimum Clickable Surface Area",
      description: "All buttons, selectors, and tabs must exhibit a clickable height or width of at least 44 pixels for optimal touch control.",
      severity: "high",
      enabled: true,
    },
    {
      id: "ux-rule-single-screen-preference",
      title: "Single-View Cohesion for Subsections",
      description: "Complex configurations or forms must be presented cleanly inside interactive tabs or unified cards rather than overflowing to separate windows.",
      severity: "medium",
      enabled: true,
    },
    {
      id: "ux-rule-accessibility-contrast",
      title: "Contrast and Legibility Standards",
      description: "Text combinations must meet optimal AA/AAA contrast ratios against their respective slate/card background plates.",
      severity: "critical",
      enabled: true,
    },
  ],
};
