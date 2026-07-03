import { Constitution } from "../types/constitution.ts";

export const brandConstitution: Constitution = {
  id: "const-brand-v1",
  version: "1.0.0",
  title: "ZANA Brand & Identity Constitution",
  description: "Establishes visual, tone of voice, and aesthetic design rules for the ZANA brand.",
  priority: 10,
  metadata: {
    primaryColor: "#2563eb", // Blue-600
    brandName: "ZANA",
    logoSymbol: "GraduationCap",
    allowedFonts: ["Inter", "Space Grotesk", "JetBrains Mono"],
  },
  rules: [
    {
      id: "brand-rule-tone",
      title: "Friendly and Encouraging Voice",
      description: "The tone must be supportive, highly professional, encouraging, and avoid excessive sales hype or self-praise.",
      severity: "critical",
      enabled: true,
    },
    {
      id: "brand-rule-typography",
      title: "Standard Font Selection",
      description: "Must use Inter as the primary interface font, Space Grotesk/Outfit for Display elements, and JetBrains Mono for data points.",
      severity: "high",
      enabled: true,
    },
    {
      id: "brand-rule-identity",
      title: "No Mock Infrastructure decoration",
      description: "Avoid placing simulated network terminal outputs, port lines (e.g., PORT: 3000), or telemetry status lines in visual elements.",
      severity: "critical",
      enabled: true,
    },
  ],
};
