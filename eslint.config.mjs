import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // GEO-08b (critère 1, review N5) : aucune chaîne visible en dur dans le JSX —
  // tout texte visible passe par le dictionnaire i18n passé en props. La règle
  // cible les textes d'enfants JSX (pas les className/attributs). Allow-list :
  // séparateurs et chaînes universelles non localisables.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: { react: reactPlugin },
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: false,
          ignoreProps: true,
          allowedStrings: ["—", "%", "404", "*"],
        },
      ],
    },
  },
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees and standalone examples — not part of the main codebase
    ".claude/**",
    "example-project/**",
    "example-project-v2/**",
  ]),
]);

export default eslintConfig;
