# UX-006 — Rappel de contact direct après 4 questions dans le chat Nicky

> **Statut : PROPOSÉE** — pending validation utilisateur (2026-09-26)
>
> **Ticket proposé** : UX-006 · **Date** : 2026-09-26 · **Backlog** : UI / UX · **Base de code** : `main` @ `fbfa4ca`
> Taille S · Un composant touché (`components/ChatPreview.tsx`) + dictionnaires FR/EN. Aucun changement backend, aucune API touchée.

---

## 1. Problème

Nicky répond aux questions du recruteur sans limite de durée, mais **ne redirige jamais
spontanément vers un échange humain**. Un recruteur intéressé qui enchaîne plusieurs
questions n'a aucun signal qu'il peut parler directement à Kim-san — alors que c'est
exactement le moment où la conversation est la plus engagée et où un contact humain a
le plus de valeur. Le site n'expose pas non plus d'adresse de contact visible depuis
le chat (INFRA-11, adresse dédiée non créée à ce jour).

## 2. Analyse (vérifiée dans le code)

- Le fil de chat est un state purement client : `messages: Message[]` dans
  `components/ChatPreview.tsx` (ligne 36), initialisé avec le greeting assistant.
  `Message = { role: 'user' | 'assistant', content, streaming? }` — pas de rôle « système ».
- **Tout envoi passe par un seam unique** : `doSend()` (Entrée / clic bouton,
  ligne ~95) et le handler des puces UX-005 (ligne ~432) appellent tous deux
  `sendPrompt(text)`. Un compteur de questions posé dans `sendPrompt` couvre les
  deux chemins sans distinction artificielle.
- **Piège de contamination API** : `buildApiMessages()` (ligne ~44) reconstruit
  l'historique en sliceant depuis le 1er message `user` jusqu'à la fin du tableau.
  Tout message inséré dans `messages` après le début de la conversation serait
  **envoyé à `/api/chat`** comme un vrai tour de Nicky — à éviter : le rappel est
  un élément d'UI, pas un message de conversation.
- Rendu du fil : bloc `messages.map(...)` (ligne ~449) dans un conteneur
  `max-h-[500px]` avec `aria-live="polite"`.
- Dictionnaires : toute chaîne visible passe par `dictionary.chat.*`
  (`lib/i18n/fr.ts`, `lib/i18n/en.ts`) — règle `react/jsx-no-literals` +
  `scripts/check-locale.mjs` (convention §6.1 de CONTEXT.md).
- Rate limit (`lib/rateLimit.ts`, 200 req/j/IP) : sans rapport — le rappel est
  purement UI côté client, aucun tour serveur.

## 3. Décisions (arbitrées avec l'opérateur le 2026-09-26)

| n° | Décision | Arbitrage |
|----|----------|-----------|
| 1 | **Compteur par session de chat** — compteur client dans `ChatPreview`, remis à zéro au rechargement de page | Session de chat (recommandé). Pas de `localStorage`, pas de comptage serveur. |
| 2 | **Rappel non bloquant** — le chat reste 100 % utilisable après la 4e question | Rappel non bloquant (recommandé). Un blocage frustrerait un recruteur engagé. |
| 3 | **Une seule fois** — le rappel s'affiche exactement une fois, après le 4e envoi | Une seule fois (recommandé). Pas de répétition aux 5e/6e questions. |
| 4 | **Message dans le fil** — carte insérée en fin de fil de messages, style distinct d'une bulle Nicky | Message dans le fil (recommandé). **Hors du tableau `messages`** (état séparé) pour ne jamais polluer l'historique API (voir §2). |
| 5 | **Lien `mailto`** — `dokkimsan@gmail.com` | Adresse fournie par l'opérateur « pour l'instant ». Temporaire : bascule vers une adresse dédiée tracée en question ouverte n° 3. |
| 6 | **Les puces comptent** — un clic sur puce UX-005 est un envoi réel, donc une question | Oui (recommandé). Cohérent : le clic déclenche un POST `/api/chat`. |

Décisions de conception prescrites (non arbitrées, à confirmer §13) :

- **Comptage** : incrément dans `sendPrompt`, après les gardes (`isTokenReady`,
  `isLoading`) et au moment de l'ajout du message user (ligne ~110) — chaque tour
  user réellement envoyé compte, y compris si la réponse échoue ensuite (la
  question a bien été posée). Les envois rejetés par les gardes ne comptent pas.
- **Timing d'affichage** : la carte apparaît après réception du `done` de la 4e
  réponse (fin du 4e échange), pour ne pas interrompre l'affichage en streaming ;
  elle reste ensuite en fin de fil. Alternative rejetée : affichage immédiat au
  4e envoi (couperait le streaming en cours).

## 4. Scope

**In scope**
- `components/ChatPreview.tsx` : compteur de questions (ref), état du rappel
  (affiché / non), rendu de la carte de rappel en fin de fil, lien `mailto`.
- `lib/i18n/fr.ts` + `lib/i18n/en.ts` : libellés du rappel (texte + libellé du lien).

**Out of scope**
- Toute modification de `/api/chat`, de `lib/modelProviders.ts`, du prompt système
  ou du garde-fou hors-sujet (le rappel n'est pas un message de conversation).
- Blocage du chat, persistance du compteur (`localStorage`), comptage serveur.
- Nouvelle adresse email dédiée (INFRA-11) — la spec référence la valeur arbitré.
- Retouche de l'état replié, des puces, de l'expand/collapse (UX-005 intouché).

## 5. Fichiers à inspecter d'abord

1. `components/ChatPreview.tsx` — `sendPrompt` (seam de comptage),
   `buildApiMessages` (piège de contamination), bloc de rendu du fil (ligne ~449).
2. `lib/i18n/fr.ts` / `lib/i18n/en.ts` — section `chat` (emplacement des clés).
3. `scripts/check-locale.mjs` — rappel de la vérification i18n à passer.

## 6. Changements requis

### 6.1 `components/ChatPreview.tsx`

- **Compteur** : `const questionCountRef = useRef(0)` — incrémenté dans
  `sendPrompt` au moment de l'append du message user (une seule incrémentation
  par envoi ; Entrée et clic bouton passent tous deux par `doSend` → `sendPrompt`,
  aucun double comptage).
- **État du rappel** : `const [contactNudge, setContactNudge] = useState(false)` —
  basculé à `true` une seule fois (garde `contactNudgeRef` ou test du state
  précédent dans le setter) quand `questionCountRef.current` atteint 4 **et**
  après le `done` de la 4e réponse (même point du flux où le streaming se termine).
- **Rendu** : carte rendue **après** le `messages.map(...)` dans le conteneur du
  fil, conditionnée par `contactNudge`. Style distinct d'une bulle Nicky (contour /
  fond `surface-container` existant, pas de nouveau token CSS) ; contenu :
  texte du rappel + lien `mailto:dokkimsan@gmail.com` (libellé du lien issu du
  dictionnaire ; l'adresse n'est pas du texte visible — la mettre en constante
  locale du composant, pas dans les dictionnaires).
- Le rappel **n'entre jamais dans `messages`** : aucune modification de
  `buildApiMessages`, aucun risque de contamination de l'historique API.

### 6.2 Dictionnaires (FR puis EN)

Clés nouvelles dans `dictionary.chat` (libellés **à valider opérateur**, §13 n° 2) :

- `nudgeText` — texte du rappel. Brouillon FR :
  « Vous avez déjà posé plusieurs questions à Nicky. Pour aller plus loin,
  contactez directement Kim-san. »
- `nudgeLinkLabel` — libellé du lien mailto. Brouillon FR :
  « Écrire à Kim-san » — EN : « Email Kim-san ».
- Version EN symétrique rédigée par l'implémenteur, relue à la revue.

### 6.3 Accessibilité

- La carte hérite du conteneur `aria-live="polite"` du fil (annoncée au lecteur
  d'écran au moment de son apparition, comme un nouveau message).
- Le lien mailto : libellé visible explicite, focus visible, cible tactile ≥ 40 px.
- Aucun `role="alert"` (non intrusif — le chat reste utilisable).

## 7. Notes d'implémentation / pièges

- **Ne pas incrémenter dans `doSend` et dans `sendPrompt`** : un seul point de
  comptage (dans `sendPrompt`), sinon double comptage sur l'envoi par clic bouton.
- **Garde anti-répétition** : le basculement de `contactNudge` doit être idempotent
  (une 5e question ne doit rien ajouter) — `useState(false)` + guard ou
  `setContactNudge((prev) => prev || count === 4)` après `done`.
- **Scroll** : l'apparition de la carte après `done` doit déclencher le scroll
  existant (l'effet de scroll dépend de `messages` — vérifier que la carte est
  visible au scroll bas ; si besoin, inclure `contactNudge` dans les dépendances
  de l'effet).
- **`react/jsx-no-literals`** : aucune chaîne en dur dans le JSX, y compris le
  texte de la carte ; l'adresse mailto vit dans `href` (attribut, pas texte visible).
- Rechargement de page → compteur et rappel repartent à zéro (décision n° 1,
  comportement attendu, ne pas « corriger »).

## 8. Critères d'acceptation (numérotés, vérifiables)

1. Après **4 envois** réussis dans la session de chat (tapes manuelles ou clics
   de puces, mixtes autorisés), la carte de rappel apparaît **une fois**, en fin
   de fil, sans bloquer l'input.
2. Après un 5e envoi, **aucune nouvelle carte** n'apparaît (une seule occurrence).
3. La carte contient un lien `mailto:dokkimsan@gmail.com` avec un libellé
   visible issu du dictionnaire ; le lien ouvre le client mail.
4. Le corps de la requête POST `/api/chat` du 4e (et des envois suivants) ne
   contient **aucun** texte du rappel (inspection CDP du payload : l'historique
   n'est pas contaminé).
5. Les 3 premières questions ne déclenchent **aucun** rappel.
6. Libellés présents en FR et EN via `lib/i18n/fr.ts` / `en.ts` ;
   `node scripts/check-locale.mjs` passe.
7. `npm run lint`, `npm run type-check`, `npm run test` (87/87 minimum, aucune
   régression), `npm run build` (16 pages, secret-free) verts.

## 9. Verification (manuelles)

- CDP headless (375 px et 1280 px) : envoyer 4 questions (mix input + puces),
  vérifier critères 1-5 ; vérifier que la carte ne provoque aucun débordement
  horizontal ni clipping (le conteneur du fil est déjà `max-h-[500px]`).
- `curl` sur le POST (ou CDP network) : critère 4.
- Rechargement de page à 3 questions : aucun rappel à la reprise ; après le 4e
  envoi de la nouvelle session : rappel affiché (comportement par session).
- Vérifier l'annonce lecteur d'écran : la carte est lue une fois (conteneur
  `aria-live="polite"`).

## 10. Non-goals

- Blocage ou limitation du nombre de questions (le chat reste illimité).
- Persistance du compteur entre sessions / navigateurs.
- Comptage ou rappel côté serveur (aucun tour serveur, aucun log nouveau).
- Message injecté dans le prompt ou dans l'historique envoyé au provider.
- Nouvelle page ou section contact (INFRA-11 hors périmètre).
- Changement du wording de Nicky ou de la persona (zone ① du prompt).

## 11. Risques

| Risque | Mitigation |
|--------|-----------|
| Contamination de l'historique API si le rappel est mis dans `messages` | Décision n° 4 : état séparé + critère 4 (inspection du POST) |
| Double comptage (Entrée + clic bouton) | Comptage uniquement dans `sendPrompt` (seam unique, §7) |
| Rappel agaçant / intrusif | Non bloquant, une seule fois, pas de `role="alert"` ; micro-copie courte |
| Adresse `dokkimsan@gmail.com` temporaire rebondira un jour vers une adresse dédiée | Constante locale unique dans le composant — un seul endroit à changer ; question ouverte n° 3 |
| Poids visuel dans un fil déjà haut (`max-h-[500px]`) | Carte compacte (2 lignes + lien), classes existantes, vérification measure-viewports + CDP |

## 12. Mesures et limites de conception

Rien n'est mesurable côté production pour ce ticket (aucun métrique provider,
aucun coût, aucune latence impactée — le rappel est du rendu client conditionnel).
Les preuves attendues sont les vérifications DOM/CDP de §9 et les critères §8 ;
aucun chiffre de performance n'est invoqué.

Le rappel est **déclenché par le comportement, pas garanti produit** : un
recruteur qui recharge la page entre deux sessions peut poser 3 + 3 questions
sans voir le rappel (limite acceptée, décision n° 1).

## 13. Questions ouvertes — à trancher avant validation

1. **Timing d'affichage** : carte après le `done` de la 4e réponse (prescrit §3)
   vs immédiat au 4e envoi — à confirmer.
2. **Libellés FR/EN** (`nudgeText`, `nudgeLinkLabel`) : les brouillons §6.2
   conviennent-ils tels quels, ou micro-copie à ajuster ?
3. **Adresse email** : `dokkimsan@gmail.com` est assumée temporaire. Faut-il
   tracer une bascule future vers une adresse dédiée (lien INFRA-11) dans
   `project-state.md`, ou laisser l'adresse en dur telle quelle ?
4. **Style de la carte** : contour + fond existants (aucun nouveau token CSS)
   vs un accent visuel (icône mail, couleur `--color-success`) — à trancher.

## Sources

- `components/ChatPreview.tsx` — state `messages` (l. 36), `buildApiMessages`
  (l. ~44), seam `doSend`/`sendPrompt` (l. ~95-110), handler des puces
  (l. ~432), rendu du fil (l. ~449-470).
- `lib/i18n/fr.ts` — section `chat` (clés existantes, emplacement des nouvelles).
- `lib/rateLimit.ts` — configuration 200 req/j/IP (hors périmètre, cité pour
  écarter tout lien avec le comptage).
- `CONTEXT.md` §6 (conventions : dictionnaire obligatoire, CSP, contrats API)
  et `architecture.md` §2 (zones de code).
- **Faits externes : aucun** — le ticket ne dépend d'aucune version, API
  externe, tarif ou date tierce ; aucune recherche web n'était requise. La
  vérification s'est faite exclusivement dans le code réel (chemins ci-dessus).