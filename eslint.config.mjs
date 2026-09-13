import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = defineConfig([
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
  // GEO-08b (critère 1, review N5) : aucune chaîne visible en dur dans le JSX —
  // tout texte visible passe par le dictionnaire i18n passé en props. La règle
  // cible les textes d'enfants JSX (pas les className/attributs). Allow-list :
  // séparateurs et chaînes universelles non localisables.
  // Review F7 : noStrings: false est le défaut (retiré, redondant) ;
  // eslint-plugin-react déclaré en devDependencies (ne plus compter sur la
  // résolution transitive via eslint-config-next).
  // Limites d'enforcement (review F6) : attributs (placeholder, aria-label) et
  // const hissées non couverts — la garantie sémantique réside dans
  // scripts/check-locale.mjs ; content/** (page /cv, EN en dur) sera ajouté au
  // glob à GEO-08h.
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    plugins: { react: reactPlugin },
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          ignoreProps: true,
          allowedStrings: ["—", "%", "404", "*"],
        },
      ],
    },
  },
]);

export default eslintConfig;