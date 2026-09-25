# UX-004 — Perte de focus de l'input chat sur envoi (Enter)

> **Statut : VALIDÉE** — opérateur 2026-09-25 (livrée et validée ; amendements 1–4 de la revue kimi appliqués)
>
> **Livraison** : branche `ux-004-chat-input-focus` (1 commit `1b4040b`, fusion + push en attente). Revue glm-reviewer PROPRE ; 71/71 tests, lint/type-check/build verts ; validée par l'opérateur sur son device le 2026-09-25. Trace de livraison dans `project-state.md`.
> **Ticket proposé** : UX-004 · **Date** : 2026-09-25 · **Backlog** : UI / UX · **Base de code** : `main` @ `a4cafd4`
> Taille S · Un seul composant touché (`components/ChatPreview.tsx`) + un libellé de dictionnaire au maximum.

---

## 1. Problème

Sur desktop (Mac, fenêtre > 768 px), lorsque l'utilisateur écrit un message dans le chat
et appuie sur **Entrée**, il **perd le focus de l'input** et doit **re-cliquer dessus**
pour pouvoir saisir le message suivant. Le même effet se produit après l'envoi via le
bouton (le focus retourne au `<body>`).

## 2. Cause racine (vérifiée dans le code)

`components/ChatPreview.tsx` — l'input porte `disabled={isLoading}` (~l. 431) :

1. Sur Entrée, `doSend()` appelle `setIsLoading(true)` → l'input devient `disabled`.
2. Comportement HTML standard : **un élément `disabled` ne peut pas recevoir le focus** ;
   s'il l'a, le navigateur le lui retire (MDN — Sources).
3. À la fin de la réponse, `isLoading` repasse à `false` → l'input est réactivé, mais
   **aucun code ne restaure le focus** (ni `autoFocus`, ni appel `focus()`).

Le `blur()` volontaire de `doSend()` (~l. 97–103) est **mobile-only**
(`window.innerWidth < 768`) : il ne concerne pas le cas desktop. Le bug est **antérieur à
PERF-002** (présent sur l'ancien code non-streaming, cf. `git show d491ece^` — l. 243) ; le
streaming l'a rendu plus perceptible car on enchaîne plus vite les messages.

## 3. Décisions (arbitrées avec l'opérateur le 2026-09-25)

1. **Input actif pendant la génération** — l'input n'est plus désactivé pendant que
   Nicky répond : l'utilisateur peut taper/éditer la question suivante pendant le
   streaming. Le garde `isLoading` existant dans `doSend()` bloque toujours le double
   envoi (Entrée pendant la génération est un no-op ; le bouton reste visuellement inactif).
   C'est le comportement standard des chats modernes.
2. **Blur mobile conservé** — le `blur()` volontaire après envoi (`< 768 px`, referme le
   clavier iOS) reste inchangé ; le fix ne concerne que le chemin desktop.
3. **Aucun remount** — l'élément `<input>` doit rester monté et identique entre les rendus
   : le navigateur ne retire **jamais** le focus d'un élément monté et actif ; le focus est
   donc conservé tant que l'input n'est **jamais désactivé** et n'est **pas démonté**
   (démontage / `key` changeante / déplacement dans l'arbre seuls recréeraient le nœud —
   aucun n'est introduit ici). Il ne s'agit **pas** d'une « restauration » par React : un
   simple changement d'attribut ne recrée pas le nœud DOM (cf. §7).

## 4. Scope

Dans le périmètre :
- `components/ChatPreview.tsx` : retirer `disabled={isLoading}` de l'input ; signaler
  l'état de chargement sans retirer l'interactivité (`aria-busy` sur le **conteneur de
  messages**, cf. §6.1 ; style visuel léger optionnel) ;
- garde anti-double-envoi préservée (early-return `isLoading` dans `doSend()`, déjà en
  place — vérifier qu'elle est exhaustive : Entrée + clic bouton) ;
- **re-focus explicite pour le chemin bouton (blocant)** : retirer `disabled={isLoading}`
  préserve le focus après **Entrée** (critère 1), mais après un **clic bouton** le focus
  est sur le bouton — lui-même `disabled` pendant `isLoading` (`components/ChatPreview.tsx`
  l. 436) → le focus retombe sur `<body>` et le critère 2 échoue sans code additionnel.
  Ajouter dans `doSend()` (ou sur le `onClick` du bouton) :
  `if (window.innerWidth >= 768) inputRef.current?.focus()`, placé **avant** le
  `setTimeout(500)` mobile et **jamais exécuté sur mobile** (le `blur()` l. 99 doit
  refermer le clavier iOS — pas de rebond focus/blur) ;
- **garde IME (majeur)** : `handleKeyDown` (l. 336–341) n'a pas de garde `isComposing` ;
  Entrée envoie pendant la composition IME (jp/zh/kr). Ajouter une ligne
  `if (e.nativeEvent.isComposing) return` en tête du handler (1 ligne, sans wording) — bug
  pré-existant, mais figé par cette spec qui déclarait ce code « inchangé » ;
- focus préservé pendant le stream sur le chemin Entrée ; le `blur()` mobile `< 768 px`
  reste tel quel ;
- un libellé de dictionnaire si l'état visuel de l'input pendant la génération nécessite
  un `title`/`placeholder` spécifique (sinon aucun wording).

Hors périmètre :
- file d'attente / envoi différé du message tapé pendant la génération (le message tapé
  reste dans l'input, il n'est pas envoyé automatiquement à la fin de la réponse) ;
- multiturn, historique, streaming (PERF-002 livré) ;
- le rendu des messages, le lissage d'affichage (50 c/s), le protocole NDJSON ;
- tout autre champ de formulaire du site.

## 5. Fichiers à inspecter d'abord

- `components/ChatPreview.tsx` — seul composant du périmètre (`doSend`, `handleKeyDown`, JSX de l'input, garde `isLoading`)
- `lib/i18n/fr.ts`, `lib/i18n/en.ts` — si un wording d'état est ajouté (contrat `chat.*`)
- `app/[lang]/Home.tsx` — point d'intégration de `ChatPreview` (vérifier qu'aucun parent ne remonte/démonte le composant pendant le stream)

## 6. Changements requis

1. **Retirer `disabled={isLoading}`** de l'input ; à la place :
   - `aria-busy={isLoading}` posé sur le **conteneur de messages**
     (`<div ref={messagesContainerRef} … aria-live="polite" aria-atomic="false">`, l. 376),
     **pas** sur l'input ni sur la `<section>` : `aria-busy` est le compagnon d'`aria-live`
     et marque la région en cours de mise à jour comme occupée — corrige la mention initiale
     situant le `aria-live` « sur la section ». (Le défaut « aucun style visuel » ci-dessous
     porte sur le feedback de l'input, pas sur `aria-busy`.) ;
   - si un feedback visuel est voulu : opacité/placeholder inchangés ou `title` — sans
     bloquer la frappe. Option retenue par défaut : **aucun style d'état**, l'utilisateur
     voit la réponse s'écrire, l'input est simplement actif.
2. **Garde d'envoi** : vérifier que `doSend()` refuse un envoi tant que `isLoading` est
   vrai (déjà le cas : early-return) — et que le bouton conserve son état désactivé
   visuel (`disabled` sur le **bouton** uniquement) pour ne pas suggérer un double envoi.
3. **Clavier** : `handleKeyDown` (Entrée → `preventDefault()` + `doSend()`) inchangé —
   l'Entrée pendant la génération est absorbée par le garde, pas par la désactivation.
4. **Mobile** : le `setTimeout` blur `< 768 px` reste exactement tel quel.
5. **Dictionnaire** : uniquement si un wording est ajouté (décision §6.1 par défaut : non).

## 7. Notes d'implémentation / pièges

- **Ne pas utiliser `readOnly` + focus** : l'option « input actif » arbitrée rend
  l'input éditable pendant le stream ; `readOnly` serait un état intermédiaire inutile.
- **Ne pas remounter l'input** : pas de `key` dynamique, pas de rendu conditionnel du
  `<input>` (le composant le garde monté — vérifier que `expanded` ne change que des
  classes, pas la structure).
- Le focus n'est conservé que si l'élément n'est **jamais désactivé** : c'est le cœur du
  fix ; toute réintroduction de `disabled` sur l'input recrée le bug. Le focus est préservé
  parce que le navigateur ne le retire jamais d'un élément monté et actif (pas de
  « restauration React ») — la citation `ReactInputSelection.js` surévaluait le mécanisme.
- **Aucun risque de re-render** : un changement d'attribut (`aria-busy`, etc.) ne recrée
  jamais le nœud DOM en React ; seuls démontage / `key` changeante / déplacement le
  feraient (déjà couverts en §3.3). Poser `aria-busy` sur le conteneur de messages est donc
  sans effet sur le montage de l'input.
- Vitest (environnement Node) ne couvre pas ce composant : aucune automatisation possible
  sans `@testing-library` (hors scope, cf. MODEL-004).

## 8. Critères d'acceptation (numérotés, vérifiables)

1. Sur desktop (> 768 px), après **Entrée** : le focus **reste** dans l'input pendant
   toute la génération ; l'utilisateur peut continuer à taper sans recliquer.
2. Sur desktop, après l'envoi par **clic bouton** : le focus est ramené sur l'input par un
   `focus()` explicite (dans `doSend()`, desktop uniquement) — sans lui le focus
   retomberait sur `<body>` (le bouton prend le focus au clic puis devient `disabled`) ; le
   focus est donc sur l'input à la fin de la réponse (sans re-clic).
3. Pendant la génération, appuyer sur Entrée **ne déclenche pas** de second envoi
   (garde `isLoading` intacte, aucun POST dupliqué dans les logs serveur).
4. Pendant la génération, l'input accepte la frappe et la conserve après la fin de la
   réponse (le texte tapé n'est ni effacé ni envoyé).
5. Sur mobile (< 768 px) : le blur volontaire après envoi fonctionne toujours (clavier
   refermé) ; au retour du focus manuel, la frappe fonctionne normalement.
6. `npm run lint`, `npm run type-check`, `npm run test` (71/71), `npm run build` : verts.
7. Erreur de génération (échec réseau/serveur) : l'input reste utilisable et focusé.

## 9. Verification (manuelles)

- `npm run dev` → `/fr` et `/en` : scénarios des critères 1–5, deux navigateurs
  (Chrome + Safari WebKit, la config de l'opérateur Mac).
- Vérifier les logs dev : un seul `POST /api/chat` par envoi (critère 3).
- Re-vérifier sur viewport < 768 px (DevTools) le comportement mobile (critère 5).

## 10. Non-goals

- File d'attente d'envoi (envoi automatique du message tapé à la fin de la réponse) ;
- raccourcis clavier supplémentaires (⌘+Entrée, échap = abort) ;
- le comportement du bouton send pendant `!isTokenReady` (CSRF non prêt) ;
- tout changement au lissage d'affichage (UX-004/PERF-002 lissage 50 c/s).

## 11. Risques

- **Régression mobile** : le blur volontaire et le scroll-to-top `< 768 px` partagent le
  même `setTimeout(500)` — le patch ne doit pas le modifier (test manuel critère 5).
- **Double envoi** : lever le `disabled` de l'input déplace toute la protection sur le
  garde `isLoading` de `doSend()` — vérifier les deux chemins (Entrée + clic).
- **Focus volé à la reprise** : un `focus()` explicite placé **dans `doSend()`** est requis
  pour le chemin bouton ; le déclencher uniquement depuis cette interaction utilisateur
  (jamais dans un `useEffect` au montage), et **jamais sur mobile** (`< 768 px`) pour ne pas
  contrarier le `blur()` volontaire.

## 12. Mesures et limites de conception

Rien de mesurable de façon fiable dans ce ticket (comportement de focus, pas de
performance) : pas de benchmark. La vérification est comportementale (§9). Le périmètre
reste un composant unique — la taille S tient sans découpage.

## 13. Questions ouvertes à trancher

1. **Bouton send pendant la génération** : rester `disabled` (reco actuelle : oui, il
   matérialise l'état occupé) ou activer lui aussi (l'Entrée et le clic enverraient le
   message suivant après la fin du stream — non dans ce ticket, cf. Non-goals) ?
2. **Feedback visuel** pendant la génération sur l'input : aucun (défaut retenu),
   opacité réduite, ou placeholder « Nicky répond… » (ajouterait un wording fr/en) ?
3. Le message tapé pendant la génération doit-il être **effacé** si l'utilisateur
   quitte la page (comportement actuel : conservé en mémoire d'état) — hors scope, à
   confirmer qu'on n'y touche pas.

## Sources

- `components/ChatPreview.tsx` — `disabled={isLoading}` (~l. 431), `doSend()` blur mobile (~l. 97–103), `handleKeyDown` (~l. 336–341) ; antériorité vérifiée : `git show d491ece^:components/ChatPreview.tsx` (l. 243)
- MDN — `disabled` : un élément désactivé ne peut pas recevoir le focus — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled
- MDN — `readonly` : garde l'élément focusable et interactif — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly
- `components/ChatPreview.tsx` — `aria-live="polite"` observé sur le **div conteneur de messages** (l. 376), et non sur la `<section>` (correction de la mention §6.1) ; bouton `disabled` pendant `isLoading` (l. 436).
- React (repo source, `ReactInputSelection.js`) : React préserve/restaure le focus et la sélection des contrôles entre rendus — via MCP context7, library `/react/react` — **citation non re-vérifiée par la revue kimi-analyst du 2026-09-25 (outil web/Context7 hors périmètre) : à ne plus présenter comme établie.**
- React (guidance équipe) : la logique de focus répond à une action utilisateur — event handlers, pas `useEffect` — via MCP context7, library `/react/react` — **également non re-vérifiée (voir ci-dessus).**

---

## Suggestions de revue reportées (non appliquées)

Les suggestions suivantes de la revue kimi-analyst du 2026-09-25 **ne sont pas** dans le
périmètre des amendements 1–4 et restent **non appliquées** (à traiter dans un ticket
ultérieur ou une re-validation) :

- **Suggestion 5** — critère d'acceptation « `npm run test` (71/71) » : le libellé exact du
  compteur de tests est fragile, à reformuler en « suite verte » sans nombre figé.
- **Suggestion 6** — interaction du `setTimeout(500)` mobile (blur + scroll) avec le nouvel
  envoi possible pendant le stream : clarifier le comportement quand `doSend()` est rappelé
  pendant la génération.
- **Suggestion 7** — marquage systématique des sources (distinguer les citations vérifiées
  des citations context7 non re-vérifiées) : seul le nota factuel sur les citations React a
  été ajouté ici, le marquage complet reste à faire.
