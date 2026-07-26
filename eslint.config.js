import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

const languageOptions = {
  parser: tsParser,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    jsx: true,
    project: "./tsconfig.json",
  },
};

const plugins = {
  "@typescript-eslint": tsPlugin,
  "react-hooks": reactHooks,
};

const finalizationCriticalFiles = [
  "src/App.tsx",
  "src/components/BottomNavigation.tsx",
  "src/features/study/explain/useExplainMode.ts",
  "src/features/study/practice/PracticePanel.tsx",
  "src/features/study/practice/usePracticeMode.ts",
];

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "scripts/**",
      "test_vision.ts",
    ],
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
    languageOptions,
    plugins,
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // The repository still contains legacy typing debt. Keep the whole tree
      // linted while making the finalization boundary strictly gated below.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: finalizationCriticalFiles,
    languageOptions,
    plugins,
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/set-state-in-render": "error",
    },
  },
  {
    files: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
    languageOptions,
    plugins,
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
