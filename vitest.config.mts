// TEST-001 — configuration Vitest minimale.
//
// `.mts` et non `.ts` : `package.json` n'a pas de `"type": "module"`, donc un
// fichier `.ts` retomberait dans l'ambiguïté ESM/CommonJS (celle qui rend
// l'ancien `lib/test-validation.ts` inexécutable).
//
// `vite-tsconfig-paths` lit l'alias `@/*` directement depuis `tsconfig.json` :
// on ne duplique pas `resolve.alias`, qui dériverait silencieusement dès qu'un
// chemin serait ajouté au tsconfig.
//
// Note : Vite 8 résout désormais nativement ces chemins via
// `resolve.tsconfigPaths: true`, et Vitest 5 émet un warning « plugin detected »
// en conséquence. Le plugin est conservé parce que la spec TEST-001 l'exige
// explicitement (§1/§3) ; la migration vers l'option native est un candidat
// naturel pour un futur ticket dédié.
//
// `test.include` volontairement non défini : le défaut Vitest
// (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) couvre déjà `lib/**/*.test.ts` et
// `lib/**/__tests__/*.test.ts`. Le définir *remplacerait* ce défaut et
// exclurait silencieusement les futurs tests `app/**`, `components/**` et
// `proxy.ts`.
//
// Pas de `test.globals` : les helpers (`describe`, `it`, `expect`, `vi`) sont
// importés explicitement depuis `vitest`, ce qui garde chaque fichier de test
// type-checkable par `tsc` sans `types: ['vitest/globals']`.
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Les modules sous test sont du TypeScript serveur sans DOM.
    environment: 'node',
  },
})
