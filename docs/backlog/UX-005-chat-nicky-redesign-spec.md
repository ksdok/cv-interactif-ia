# UX-005 — Refonte visuelle du chat Nicky : header, bulle d'accueil et suggestions d'entrée

> **Statut : VALIDÉE** — opérateur 2026-09-26 (revue kimi-amendée ; arbitrages §13 tranchés le 2026-09-26)
>
> **Ticket proposé** : UX-005 · **Date** : 2026-09-26 · **Backlog** : UI / UX · **Base de code** : `main` @ `8542d8a`
> Taille S · Un composant touché (`components/ChatPreview.tsx`) + dictionnaires FR/EN + 1 ligne CSS (token `--color-success`, tranché §13 n° 2).
> Source : maquette Stitch `docs/stitch_refonte_chatbot_kim_sandok/` (périmètre restreint au chat, arbitré opérateur le 2026-09-26).
> **Amendements** (revue `kimi-analyst`, lecture seule, 2026-09-26 — 1 bloquant + 6 majeurs + mineurs, appliqués) : critère 4 réécrit (puces à usage unique par session, B1), budget de transition `max-h` prescrit (M1), classes réelles à la place de `label-caps` (M2), garde `isTokenReady` sur les puces (M3), seam `sendPrompt` précisé (M4), hauteur tactile ≥ 40 px (M5), invocation `check-locale` corrigée (M6), prompts EN écrits intégralement (m2/m4), mapping couleurs complété (m3), refs de lignes rectifiées (m1), `motion-safe:animate-pulse` (s1).
> **Arbitrages §13 tranchés le 2026-09-26** : avatar = icône actuelle (n° 1), pastille verte via nouveau token `--color-success` (n° 2), libellés §6.3 validés tels quels (n° 3), placeholder court du mock (n° 4).

---

## 1. Problème

À l'état replié, le module chat de la home n'offre **aucune affordance d'entrée** : il se
réduit à un greeting typographique (avatar + deux paragraphes) et à l'input. Le recruteur
qui ne sait pas quoi demander subit le « syndrome de la page blanche » — il doit formuler
une première question sans indice sur le périmètre de Nicky.

La maquette Stitch (`docs/stitch_refonte_chatbot_kim_sandok/sp_cification_markdown_chat_nicky.md`,
validée par l'opérateur) propose un état replié structuré : **header** d'identité (nom,
pastille de statut, badge), **bulle d'accueil** en carte, **4 puces de suggestions**
(quick-prompts cliquables, zéro emoji) et **micro-copie** sous l'input. Le doc source
recommande l'envoi direct au clic sur une puce.

## 2. Analyse (vérifiée dans le code)

- `components/ChatPreview.tsx` : l'état replié affiche l'avatar + `greeting1`/`greeting2`
  en texte nu, puis l'input. **Pas de header, pas de suggestions, pas de micro-copie.**
  Le texte du mock est **déjà identique** aux clés `dictionary.chat.greeting1`/`greeting2`
  (`lib/i18n/fr.ts` l. 182-185) — aucune réécriture de wording nécessaire.
- `lib/i18n/types.ts` : `Dictionary = typeof fr` — toute nouvelle clé dans `fr.ts`
  **doit** être déclinée dans `en.ts` (sinon erreur de compilation).
- `data/cv.md` : **ni « TJM » ni « disponibilité » n'y figurent** (grep 0 occurrence).
  Le chat tourne en CAG sur ce fichier : la puce « TJM & Disponibilité » du mock
  déclencherait le garde-fou hors-sujet (MODEL-004) ou un « je n'ai pas cette info ».
- `app/globals.css` l. 3-13 : `--color-*: initial` (l. 4) désactive **toute la palette par
  défaut** de Tailwind 4 — les classes du mock (`neutral-*`, `emerald-500`) sont
  **silencieusement inertes** dans ce repo ; seul un mapping vers les tokens existants
  (`surface-*`, `primary`, `secondary`, `outline-variant`) produit du CSS.
- Aucune couleur de succès n'existe dans les tokens (`app/globals.css` : pas de vert) —
  la pastille « En ligne » du mock exige un token nouveau ou un choix monochrome.
- `lucide-react` n'est **pas** une dépendance (`package.json`) ; le composant utilise
  des SVG inline — pas d'ajout de dépendance pour une flèche et un avion d'envoi.
- Le paradigme expand/collapse (greeting replié → conversation dépliée au 1ᵉʳ envoi),
  les comportements UX-004 (re-focus desktop, garde IME, `aria-busy`) et le flux
  streaming PERF-002 sont **conservés tels quels**.

## 3. Décisions (arbitrées avec l'opérateur le 2026-09-26)

1. **Périmètre chat seul** — la maquette `code.html` couvre toute la homepage (header,
   hero, bento grid, CTA sombre) : tout le reste est **hors périmètre** (ticket séparé
   éventuel). Seul `ChatPreview.tsx` change.
2. **Envoi direct (Option A du doc source)** — au clic sur une puce, la question part
   immédiatement comme message utilisateur et le streaming démarre. Pas de
   préremplissage. Les puces se replient à l'expansion (le paradigme existant fait déjà
   le travail : `expanded` masque l'état replié).
3. **Puce TJM remplacée** — nouvelle puce « Réduction des coûts SI » : le sujet est
   ancré dans le CAG (`data/cv.md` : « réduction des coûts » dans le profil, exemple
   Kondor+ ≈ 500 000 €/an d'économies). Zéro risque de refus hors-sujet.
4. **Expand/collapse conservé** — le header + bulle + suggestions + micro-copie
   constituent le nouvel **état replié** ; à l'expansion, tout se replie et la
   conversation (messages + input) prend le relais, exactement comme aujourd'hui.
5. **Décisions techniques déduites des conventions** (non arbitées, triviales) :
   palette 100 % tokens existants (mapping §6.1) ; pas de `lucide-react` (SVG inline) ;
   tout wording passe par `lib/i18n/fr.ts` + `en.ts` (règle `react/jsx-no-literals`,
   CONTEXT.md §6.1) ; zéro emoji (contrainte stricte du doc source).
6. **Puces à usage unique par session** (revue B1, vérifié dans le code) : il
   n'existe **aucun chemin de retour** à l'état replié — `handleExpand()` ne fait
   que `setExpanded(true)` (`components/ChatPreview.tsx` l. 84-85, aucun setter
   inverse, aucun pilotage externe : `Home.tsx` l. 35 monte le composant sans
   prop `isExpanded` contrôlée). Au premier envoi, les puces disparaissent **pour
   le reste de la session**. La spec n'ajoute pas de mécanisme de repli (hors
   scope) ; le critère 4 est réécrit en conséquence (§8).
7. **Le brouillon de l'input n'est pas effacé par un envoi puce** (revue M4) : la
   refactor `sendPrompt(text)` ne touche `setInput('')` que sur le chemin input —
   un visiteur qui a commencé à taper et clique une puce conserve sa frappe.
   Coût nul, perte de frappe évitée.

## 4. Scope

Dans le périmètre :
- `components/ChatPreview.tsx` — restylage de l'**état replié** uniquement :
  header d'identité, bulle d'accueil en carte, bloc suggestions, micro-copie ;
- `lib/i18n/fr.ts` + `lib/i18n/en.ts` : nouvelles clés `chat.*` (§6.3) ;
- `app/globals.css` : **un** nouveau token couleur `--color-success` (une ligne,
  tranché §13 n° 2) — rien d'autre.

Hors périmètre :
- tout autre fichier de la homepage (`Home.tsx`, `Header`, bento grid, CTA sombre) ;
- l'état **déplié** (liste de messages, bulles, streaming, lissage rAF PERF-002) —
  intouché ;
- le comportement serveur `/api/chat` (aucun changement) ;
- le dark mode (UX-002), le contenu TJM (`data/cv.md`), la refonte complète de l'input.

## 5. Fichiers à inspecter d'abord

1. `components/ChatPreview.tsx` — structure de l'état replié, `doSend()`, garde
   `isLoading`, blocs conditionnels `expanded`.
2. `lib/i18n/fr.ts` l. 182-193 et `lib/i18n/en.ts` (bloc `chat`) — clés existantes.
3. `app/globals.css` l. 3-13 (bloc `@theme`, `--color-*: initial` en l. 4) — tokens
   disponibles et piège palette désactivée.
4. `docs/stitch_refonte_chatbot_kim_sandok/sp_cification_markdown_chat_nicky.md` § 3-4
   (anatomie + specs typographiques) et `code.html` (markup de référence).

## 6. Changements requis

### 6.1 Anatomie de l'état replié (carte)

Conteneur de l'état replié : carte `rounded-2xl` sur `bg-surface`, bordure hairline
`border-outline-variant/60`, padding généreux. Mapping maquette → tokens :

| Maquette (Stitch) | Token projet (`app/globals.css`) |
|---|---|
| `bg-[#f6f6f5]` / `bg-neutral-100` | `bg-surface-container-low` (cible unique — le panneau actuel, l. 361) |
| `bg-white` (bulle, puces, input) | `bg-surface-container-lowest` |
| `border-neutral-200/60` | `border-outline-variant/60` |
| `text-neutral-900` | `text-on-surface` |
| `text-neutral-400/500/600` | `text-secondary` (`#5f5e5e`) |
| `bg-neutral-900` (bouton send) | `bg-primary` (`#000000`) |
| avatar du header (mock : « 8 » sur rond noir) | conservé à l'identique : `bg-primary-container` + icône « personne » SVG actuelle (**arbitrage §13 n° 1** — pas le « 8 ») |
| `bg-neutral-50` (hover puce) | fond inchangé — l'affordance hover porte sur bordure + texte |
| `font-mono` (badge du mock) | **écarté** : le site n'a qu'Inter (`app/globals.css` l. 74-76) |
| `emerald-500` (pastille) | `--color-success` — **token nouveau, tranché §13 n° 2** (une ligne dans `app/globals.css`) |
| `shadow-xs` (nom v4 de l'ex-`shadow-sm` v3) | classe valide en Tailwind 4 (voir Sources) |

Structure (haut → bas), état replié uniquement :
1. **Header** : avatar rond conservé (`bg-primary-container`, icône « personne »
   SVG actuelle — arbitrage §13 n° 1, pas le « 8 » du mock), nom
   `Nicky` (`font-semibold text-sm text-on-surface`), dessous pastille statut
   (point 6×6 `bg-success motion-safe:animate-pulse` + `chat.statusOnline`,
   `text-xs text-secondary`), à droite le badge `chat.badge` :
   `text-[11px] font-semibold uppercase tracking-wider text-secondary
   bg-surface-container-high px-2 py-1 rounded` — `label-caps` est un token du
   mock, **pas une classe du repo** (revue M2).
2. **Bulle d'accueil** : carte blanche `rounded-xl p-4 border-outline-variant/60`
   portant `greeting1` (corps) puis `greeting2` (poids médium) — clés existantes,
   réutilisation directe.
3. **Suggestions** : titre `chat.suggestionsTitle` —
   `text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2` —
   puis 4 boutons pill `flex flex-wrap gap-2` : `bg-surface-container-lowest
   text-on-surface border-outline-variant rounded-lg px-3 py-2.5 min-h-10
   text-xs font-medium` (**hauteur tactile ≥ 40 px** : aligne le style prescrit
   sur le critère §9.4, revue M5), hover `border-primary text-primary`.
   Chaque bouton : `type="button"`, `aria-label` = le prompt complet,
   `onClick` → envoi direct (§6.2).
4. **Input** : inchangé (classes actuelles conservées : `h-20`,
   `text-[max(20px,1.25rem)]` — plancher TECH-10, `rounded-full`,
   `chat-shadow-focus`). Le style « py-3 text-sm rounded-xl » du mock est **écarté**
   (régression zoom mobile et incohérence avec le paradigme actuel).
5. **Micro-copie** : `chat.hint` centré, `text-[11px] text-secondary`.

**Budget de transition** (revue M1) : le conteneur de l'état replié porte aujourd'hui
`max-h-96` (384 px, `overflow-hidden`, `components/ChatPreview.tsx` l. 363) — le
nouvel état replié (header + bulle + 4 puces en `flex-wrap` + micro-copie) dépasse
certainement ce budget, surtout en mobile 375 px. Prescription : passer à
`max-h-[640px]` (valeur à ajuster au rendu réel) ; la Verification §9 contrôle
l'absence de clipping à 375 px **et** 1280 px.

### 6.2 Comportement d'envoi des puces

- Refactor minimal de `doSend` : extraire `sendPrompt(text: string)` (corps actuel,
  paramétré) ; `doSend()` (Entrée / clic bouton) délègue à `sendPrompt(input.trim())`.
  Toute la logique UX-004/PERF-002 (re-focus desktop, blur mobile, garde
  anti-double-envoi `isLoading`, abort controller, lissage rAF) vit dans
  `sendPrompt` et est **héritée telle quelle**.
- Clic puce → `sendPrompt(item.prompt)` : la question part comme message utilisateur
  dans l'historique (identique à une frappe), `handleExpand()` replie les puces,
  le streaming démarre. Pendant `isLoading`, les puces sont `disabled`
  (cohérent avec le bouton send).
- **Garde sur le paramètre** (revue M4) : la garde devient
  `if (!text.trim() || isLoading) return` — sinon un clic puce avec input vide
  ferait un `return` silencieux. `setInput('')` ne reste que sur le chemin input
  (décision 7 : un envoi puce ne touchera pas le brouillon de l'utilisateur).
- **Garde CSRF sur les puces** (revue M3, symétrique du bouton send l. 445) : les
  puces portent `disabled={!isTokenReady || isLoading}` — un clic avant hydratation
  du token CSRF enverrait un `X-CSRF-Token` vide → 403 dès la première interaction.
- La garde IME (`e.nativeEvent.isComposing`, UX-004) ne concerne que l'input —
  inchangée.

### 6.3 Dictionnaires (FR puis EN — libellés validés opérateur, §13 n° 3)

La clé existante `chat.placeholder` change de valeur (arbitrage §13 n° 4) :
« Demandez à Nicky ce que vous voulez savoir... » (EN : « Ask Nicky what you want
to know... ») — placeholderAria et les autres clés existantes sont inchangés.

```ts
chat: {
  // … clés existantes inchangées …
  title: 'Nicky',                                        // 'Nicky'
  statusOnline: 'En ligne',                              // 'Online'
  badge: 'IA agentique',                                 // 'Agentic AI' (rendu uppercase)
  suggestionsTitle: 'Suggestions',                       // 'Suggestions'
  hint: 'Cliquez sur une suggestion ou tapez votre question',
                                                         // 'Click a suggestion or type your question'
  suggestions: [                                         // 4 × { label, prompt }
    { label: 'Missions Repo & Sec Lending',
      prompt: 'Quelles sont les missions de Kim-san en Repo et Securities Lending ?' },
    { label: 'Stack & Projets IA',
      prompt: 'Quelle est la stack technique de Kim-san et ses projets récents en IA ?' },
    { label: 'Réduction des coûts SI',
      prompt: 'Comment Kim-san contribue-t-il à la réduction des coûts des SI ?' },
    { label: 'Pourquoi recruter Kim-san ?',
      prompt: 'Pourquoi choisir Kim-san comme Business Analyst senior ?' },
  ],
}
```

Version EN (même forme, **4 entrées écrites intégralement** — `tsc` ne garantit pas
la longueur du tableau : `Dictionary = typeof fr` sans `as const` élargit en
`{ label: string; prompt: string }[]`, revue m2) :

```ts
suggestions: [
  { label: 'Repo & Sec Lending missions',
    prompt: 'What are Kim-san\'s missions in Repo and Securities Lending?' },
  { label: 'AI stack & projects',
    prompt: 'Can you detail Kim-san\'s technical background and recent AI projects?' },
  { label: 'IT cost reduction',
    prompt: 'How does Kim-san contribute to IT cost reduction?' },
  { label: 'Why hire Kim-san?',
    prompt: 'Why choose Kim-san as a senior Business Analyst?' },
],
```
**Contrainte** : le prompt envoyé suit la locale de la page (fr → prompts FR,
en → prompts EN) ; la langue de réponse est déjà portée par le champ `lang`
de `/api/chat` (GEO-08g) — rien à changer côté API.

### 6.4 Accessibilité

- Puces : `<button type="button">` + `aria-label` = prompt (le libellé court seul
  serait insuffisant hors écran) ; anneau de focus visible identique au bouton send
  (`focus-visible:ring-2 focus-visible:ring-primary`).
- Le bloc suggestions replié à l'expansion : `max-h-0 opacity-0` comme le greeting
  actuel (hors du flux, non tabulable) — pas de `aria-hidden` nécessaire si retiré
  conditionnellement, mais **ne pas** le laisser tabulable invisible.
- `aria-busy`, `aria-live` sur le conteneur de messages : intouchés.

## 7. Notes d'implémentation / pièges

1. **Palette désactivée** : `--color-*: initial` (`app/globals.css` l. 4) — toute
   classe `neutral-*`/`emerald-*` copiée du mock compile sans erreur mais ne génère
   **aucun CSS** (classe inexistante). Tout doit passer par les tokens du tableau §6.1.
2. **Noms d'ombre Tailwind 4** : `shadow-xs` = ex-`shadow-sm` v3, `shadow-2xs` plus fin
   encore (doc officielle, cf. Sources). Ne pas copier-coller les `shadow-*` de vieux
   snippets v3.
3. **`react/jsx-no-literals`** : « Nicky », « En ligne », le badge, le titre
   suggestions, la micro-copie et les 4 paires label/prompt — tout dans le
   dictionnaire. Vérification : `scripts/check-locale.mjs` + `npm run lint`.
4. **Ne pas toucher** à `sendPrompt` (ex-`doSend`) au-delà de la signature : le flux
   streaming, l'abort, le lissage rAF et les guards UX-004 sont fragiles et testés
   manuellement — la refactor ne déplace pas de logique, elle paramètre l'entrée.
5. **Faux statut « En ligne »** : Nicky est un service toujours disponible — le statut
   est cosmétique, assumé comme convention produit (§13 n° 2 pour la
   couleur).
6. Aucun test Vitest de composant dans le repo (Vitest ne couvre pas les composants
   React) — la preuve passe par la section Verification, pas par un test unitaire
   (cohérent avec UX-004).
7. **Parité FR/EN des suggestions non garantie par le compilateur** (revue m2) :
   `Dictionary = typeof fr` sans `as const` élargit le tableau en
   `{ label, prompt }[]` — un `en.ts` à 3 entrées compilerait. Les 8 chaînes EN
   sont écrites dans la spec (§6.3) ; le critère 6 exige la vérification humaine
   du compte (4 labels + 4 prompts par locale).
8. **Arbitrages §13 tranchés = corps du commit** : toute décision tranchée après
   coup doit être documentée dans le corps du commit (CONTEXT.md §7.1) — les
   arbitrages des questions ouvertes finiront là, pas seulement dans la spec.

## 8. Critères d'acceptation (numérotés, vérifiables)

1. À l'état replié, la carte du chat affiche dans l'ordre : header (avatar, nom
   « Nicky », pastille de statut, badge « IA agentique »), bulle d'accueil reprenant
   `greeting1`/`greeting2`, titre « Suggestions », 4 puces, input, micro-copie.
2. Aucun emoji n'apparaît dans les puces, boutons ou messages ; aucune mention
   « 1-CLIC » ni « Prêt à répondre » (contraintes du doc source) — vérifiable par
   `git diff -U0 | grep -iE "1-clic|prêt à répondre"`.
3. Au clic sur une puce : la question part **immédiatement** comme message
   utilisateur, le streaming démarre, les puces et le header replié cèdent la place
   à la conversation (paradigme expand/collapse existant, transition actuelle).
   Les puces sont à **usage unique par session** : aucun retour à l'état replié
   (décision 6) — le critère se vérifie sur un état initial frais (rechargement de
   page pour rejouer).
4. **Protection contre le double-envoi** : un clic puce suivi d'une frappe Entrée
   rapide (ou d'un second clic pendant la transition ~500 ms) ne déclenche qu'**un
   seul** POST `/api/chat` (garde `isLoading` dans `sendPrompt`) ; les puces sont
   `disabled` tant que `isTokenReady` est faux **ou** `isLoading` vrai (revue
   M3/B1).
5. Aucune régression UX-004 : re-focus desktop après envoi (Entrée **et** clic
   puce → le focus reste utilisable pour retaper), garde IME, blur mobile < 768 px,
   `aria-busy` conservés.
6. Wording 100 % dictionnaire FR/EN : `npm run lint` (jsx-no-literals) et
   `scripts/check-locale.mjs` passent ; `en.ts` compile sans clé manquante
   (`Dictionary = typeof fr`) **et** le compte des suggestions est vérifié humain :
   4 labels + 4 prompts dans chaque locale (`tsc` ne garantit pas la longueur du
   tableau — revue m2).
7. La puce « TJM & Disponibilité » est absente ; la puce de remplacement « Réduction
   des coûts SI » obtient une réponse ancrée dans le CV (vérification live, cf. §9.3),
   pas de refus hors-sujet.
8. Aucune classe de couleur hors tokens dans le diff (pas de `neutral-*`,
   `emerald-*` ni hexadécimal brut dans le JSX).
9. `npm run lint`, `npm run type-check`, `npm run test`, `npm run build` verts.

## 9. Verification (manuelles)

1. `npm run dev` → `/fr` : parcours complet — cliquer chacune des 4 puces une à
   une, vérifier envoi immédiat + streaming + repli des puces ; idem sur `/en`
   (libellés et prompts EN, réponse EN).
2. **Absence de clipping de l'état replié** (revue M1) : à 375 px **et** 1280 px,
   header, bulle, 4 puces (y compris retour à la ligne) et micro-copie entièrement
   visibles, rien de tronqué par le `overflow-hidden` de la transition ; ajuster
   `max-h-[640px]` si nécessaire.
3. Vérifier le prompt de la puce « Réduction des coûts SI » : la réponse cite des
   éléments du CV (profil « réduction des coûts », exemple Kondor+), pas de refus.
4. Mobile émulé (375 px) : envoi par puce → blur + scroll comme un envoi clavier ;
   pas de re-focus parasite ; puces utilisables au doigt (hauteur réelle ≥ 40 px,
   `min-h-10` — revue M5).
5. Desktop (1280 px) : focus dans l'input conservé après clic puce (UX-004) ; le
   brouillon tapé avant un clic puce est conservé (décision 7).
6. `npm run build && npm run start` (ou dev), puis `node scripts/check-locale.mjs`
   (script local : pas de `npx`, usage documenté en tête du script — revue M6),
   + les 4 gates du critère 9.
7. Vérifier `aria-label` des puces dans le DOM (inspecteur) et la non-tabulabilité
   du bloc suggestions après expansion.

## 10. Non-goals

- Refonte de la homepage (hero, bento grid, CTA sombre, header PROJETS du mock) —
  candidat à un ticket séparé si l'opérateur le souhaite.
- Redesign de l'**état déplié** (bulles de conversation, curseur de streaming,
  indicateur « trois points ») — le mock ne le représente pas, PERF-002 y vit.
- Ajout de `lucide-react` ou de toute dépendance.
- Ajout de TJM/disponibilité dans `data/cv.md` (décision opérateur : puce remplacée).
- Migration des icônes existantes (send spinner, avatar) vers un jeu d'icônes.
- Dark mode (UX-002) ; l'animation de la pastille respecte `prefers-reduced-motion`
  (`motion-safe:animate-pulse`, revue s1).

## 11. Risques

- **Régression UX-004 / PERF-002** : le refactor `doSend` → `sendPrompt` touche le
  chemin d'envoi. Mitigation : signature additive (pas de déplacement de logique),
  verification §9.4 obligatoire avant commit.
- **Puces cliquables = requêtes LLM gratuites pour un curieux** : 4 clics = 4 appels.
  Coût marginal mesuré au banc MODEL-004 ($0,0000593/appel — cf. Sources) :
  négligeable ; le rate limit 200/j/IP s'applique déjà. Aucune mesure nouvelle
  requise.
- **Wording EN** : les prompts EN doivent être naturels pour un recruteur
  anglophone ; risque faible (relecture opérateur, §13 n° 3).
- **Chips tabulables invisibles** pendant la transition d'expansion : risque
  d'anti-pattern a11y si le bloc est masqué visuellement sans quitter le flux —
  traité en §6.4/§9.6.

## 12. Mesures et limites de conception

Rien de mesurable objectivement dans ce ticket (pur front, aucune métrique perf ou
cache impactée) : **pas de section benchmark**. Limites de conception assumées :

- Le coût marginal des puces est borné par le rate limit existant (200 req/j/IP,
  mémoire) et le coût/appel mesuré au banc MODEL-004 ; aucune mesure nouvelle n'est
  requise ni effectuée.
- Le TTFT perçu est inchangé : l'envoi par puce emprunte exactement le chemin
  streaming existant ; seul l'initiateur du message change.
- La fidélité des réponses aux 4 prompts FR/EN est vérifiée **manuellement** (§9.1)
  — le pré-filtre hors-sujet mécanique est faillible (CONTEXT.md §4, banc du
  2026-09-23) : le verdict humain reste la preuve.

## 13. Questions ouvertes — arbitrées le 2026-09-26 (opérateur)

1. **Avatar** → **icône « personne » SVG actuelle conservée** (`bg-primary-container`) :
   le « 8 » du mock est un artefact Stitch sans signification établie ; réversible
   en une ligne si un monogramme est adopté plus tard.
2. **Pastille « En ligne »** → **vert** : nouveau token `--color-success` (une ligne
   dans `app/globals.css`, ex. vert #15803d) — signal « en ligne » conventionnel
   assumé ; contraste à vérifier au rendu (§9.2).
3. **Libellés des 4 puces** → **§6.3 validé tel quel** (sans « Agentic » dans les
   puces ; le badge « IA agentique » reste — cohérent avec « Agentic Coding » du
   site).
4. **Placeholder** → **version courte du mock** : `chat.placeholder` devient
   « Demandez à Nicky ce que vous voulez savoir... » (FR/EN, cf. §6.3).

> Rappel : ces arbitrages seront documentés dans le corps du commit (CONTEXT.md
> §7.1 — cf. §7 point 8).

## Sources

- `docs/stitch_refonte_chatbot_kim_sandok/sp_cification_markdown_chat_nicky.md` —
  spec UX source (anatomie, contraintes zéro-emoji, snippet de référence)
- `docs/stitch_refonte_chatbot_kim_sandok/code.html` — markup de référence homepage
  (hors périmètre) et bloc chat
- `docs/stitch_refonte_chatbot_kim_sandok/DESIGN.md` — design system « Swiss
  Precision Editorial » (palette, typographie Inter, tokens)
- `docs/stitch_refonte_chatbot_kim_sandok/screen.png` — rendu visuel
- `components/ChatPreview.tsx` (`main` @ `8542d8a`) — composant actuel, `doSend()`,
  guards UX-004/PERF-002
- `lib/i18n/fr.ts` l. 182-193 (clés `chat.*` existantes) · `lib/i18n/types.ts`
  (`Dictionary = typeof fr`)
- `app/globals.css` l. 3-13 (`@theme`, `--color-*: initial` en l. 4) · l. 88
  (`.animate-blink`) · l. 222 (`.chat-shadow-focus`)
- `data/cv.md` — absence de « TJM »/« disponibilité », présence de « réduction des
  coûts » (profil) et de l'économie Kondor+ (~500 000 €)
- `CONTEXT.md` §6 (conventions non négociables), `architecture.md` §5, §2
- Doc officielle Tailwind CSS v4 (via Context7, `/tailwindlabs/tailwindcss.com`) :
  guide d'upgrade (`shadow-sm` → `shadow-xs`) —
  https://tailwindcss.com/docs/upgrade-guide ; palette custom / `--color-*: initial`
  — https://tailwindcss.com/docs/colors
- `docs/backlog/MODEL-004-chat-guardrail-hardening-spec.md` — coût/appel mesuré,
  faillibilité du pré-filtre hors-sujet (verdict humain requis)
- Décisions de cadrage : opérateur, 2026-09-26 (périmètre chat seul, envoi direct,
  puce TJM remplacée, expand/collapse conservé)
- Revue `kimi-analyst` (Kimi k3, lecture seule, 2026-09-26) — 1 bloquant, 6
  majeurs, 5 mineurs, 4 suggestions ; findings appliqués (B1, M1-M6, m1-m5, s1,
  s4)
- Arbitrages §13 : opérateur, 2026-09-26 — avatar icône actuelle, pastille verte
  (`--color-success`), libellés §6.3 validés, placeholder court du mock