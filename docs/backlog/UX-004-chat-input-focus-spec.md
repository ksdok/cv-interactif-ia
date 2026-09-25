# UX-004 — Perte de focus de l'input chat sur envoi (Enter)

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-25)
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
   : React restaure nativement le focus/la sélection d'un contrôle contrôlé qui n'est ni
   démonté ni désactivé (source React, cf. Sources).

## 4. Scope

Dans le périmètre :
- `components/ChatPreview.tsx` : retirer `disabled={isLoading}` de l'input ; signaler
  l'état de chargement sans retirer l'interactivité (`aria-busy`, style visuel léger) ;
- garde anti-double-envoi préservée (early-return `isLoading` dans `doSend()`, déjà en
  place — vérifier qu'elle est exhaustive : Entrée + clic bouton) ;
- focus préservé pendant le stream (aucun code nouveau nécessaire si l'élément n'est plus
  jamais désactivé) ; le `blur()` mobile `< 768 px` reste tel quel ;
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
   - `aria-busy={isLoading}` (accessibilité : la section annonce déjà `aria-live="polite"`) ;
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
- Le focus React-restauré ne vaut que si l'élément n'est **jamais désactivé** : c'est le
  cœur du fix ; toute réintroduction de `disabled` sur l'input recrée le bug.
- Contraindre les re-rendus : l'ajout de `aria-busy` ne doit pas forcer un re-render qui
  recrée l'input (même position dans l'arbre, même `ref`).
- Vitest (environnement Node) ne couvre pas ce composant : aucune automatisation possible
  sans `@testing-library` (hors scope, cf. MODEL-004).

## 8. Critères d'acceptation (numérotés, vérifiables)

1. Sur desktop (> 768 px), après **Entrée** : le focus **reste** dans l'input pendant
   toute la génération ; l'utilisateur peut continuer à taper sans recliquer.
2. Sur desktop, après l'envoi par **clic bouton** : le focus revient sur l'input à la
   fin de la réponse (sans re-clic).
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
- **Focus volé à la reprise** : si un `focus()` automatique était ajouté plus tard, le
  faire seulement depuis une interaction utilisateur (guidance React — pas dans un
  `useEffect` au montage).

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
- React (repo source, `ReactInputSelection.js`) : React préserve/restaure le focus et la sélection des contrôles entre rendus — via MCP context7, library `/react/react`
- React (guidance équipe) : la logique de focus répond à une action utilisateur — event handlers, pas `useEffect` — via MCP context7, library `/react/react`