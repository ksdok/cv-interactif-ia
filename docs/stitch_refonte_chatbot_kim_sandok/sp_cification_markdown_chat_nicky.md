# Spécification Technique & UX : Refonte du Composant Chat (Nicky)

## 1. Contexte & Intention
L'objectif est d'optimiser le composant conversationnel du jumeau numérique (**Nicky**) sur le portfolio minimaliste éditorial de Kim-san DOK (`kimsandok.com`). 
Le but est d'éliminer la friction de saisie (« syndrome de la page blanche ») tout en préservant une esthétique suisse monochrome épurée et professionnelle (aucun emoji, aucun artifice marketing superflu).

---

## 2. Contraintes Strictes de Style & Contenu
- **Zéro Emoji** : Aucune icône emoji dans les suggestions, boutons ou messages (pas de 💼, ⚡, 💰, 🎯). Remplacer éventuellement par de la pure typographie ou de micro-icônes vectorielles SVG minimalistes très fines si nécessaire.
- **Suppression du label "1-CLIC"** : Ne pas afficher de mention de rapidité ou de tag marketing de ce type.
- **Suppression de la mention "Prêt à répondre"** : Garder l'en-tête sobre.
- **Style Minimaliste Suisse** : Palette monochrome (fonds `#f3f4f3` / blanc, bordures subtiles `#e5e5e5`, texte noir `#111111` et gris neutre `#666666`), typographie sans-serif (Inter / Helvetica), alignements rigoureux, coins arrondis discrets (`rounded-lg` / `8px`).

---

## 3. Structure du Composant (Anatomie UI)

Le composant est encapsulé dans une carte conteneur (ex: `bg-neutral-100` ou `bg-[#f9f9f8] p-6 rounded-2xl border border-neutral-200/60`).

```
+-------------------------------------------------------------------------+
| [8] Nicky                                              [IA AGENTIQUE]  |
|     En ligne                                                            |
+-------------------------------------------------------------------------+
|  +-------------------------------------------------------------------+  |
|  | Bonjour, je suis Nicky, le jumeau numérique de Kim-san. Je suis   |  |
|  | là pour vous aider à naviguer à travers des années d'expérience.  |  |
|  | Que souhaitez-vous savoir en premier ?                            |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  SUGGESTIONS                                                            |
|  [ Missions Repo & Sec Lending ]  [ Stack Agentic & Projets IA ]        |
|  [ TJM & Disponibilité ]          [ Pourquoi recruter Kim-san ? ]       |
|                                                                         |
|  +-----------------------------------------------------------------+-+  |
|  | Demandez à Nicky ce que vous voulez savoir...                   |V|  |
|  +-----------------------------------------------------------------+-+  |
|  Cliquez sur une suggestion ou tapez votre question                     |
+-------------------------------------------------------------------------+
```

---

## 4. Détail des Éléments & Spécifications Typographiques

### A. Header de conversation
- **Avatar / Pastille** : Cercle noir avec le chiffre `8` en blanc (ou avatar SVG existant).
- **Nom & Statut** :
  - Nom : `Nicky` (font-semibold, text-sm ou base, color: `#111111`).
  - Statut : Pastille verte (`w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5`) suivie de `En ligne` (text-xs, color: `#737373`).
- **Badge d'angle droit** : Tag épuré `IA AGENTIQUE` en capitales (text-[11px], tracking-wider, text-neutral-500, fond neutre léger ou simple bordure).

### B. Bulle de message d'accueil
- Conteneur blanc (`bg-white rounded-xl p-4 border border-neutral-200/60 shadow-sm`).
- Texte :
  > « Bonjour, je suis Nicky, le jumeau numérique de Kim-san. Je suis là pour vous aider à naviguer à travers des années d’expérience.
  > Que souhaitez-vous savoir en premier ? »
- Typographie : text-sm, leading-relaxed, text-neutral-800.

### C. Section des Suggestions (Quick-Prompts)
- **Titre de section** : `SUGGESTIONS` (text-[11px], font-semibold, uppercase, tracking-wider, text-neutral-400, mb-2).
- **Format des puces** : Boutons pills / badges interactifs disposés en flex-wrap (gap-2).
- **Style des boutons** :
  - Fond blanc (`bg-white`), texte noir discret (`text-neutral-700 text-xs font-medium`), bordure fine (`border border-neutral-200`).
  - Hover : `hover:border-neutral-900 hover:text-neutral-950 transition-colors cursor-pointer`.
- **Libellés des 4 puces (sans emojis)** :
  1. `Missions Repo & Sec Lending`
  2. `Stack Agentic & Projets IA`
  3. `TJM & Disponibilité`
  4. `Pourquoi recruter Kim-san ?`

### D. Champ de saisie (Input Bar)
- **Champ input** :
  - Placeholder : `Demandez à Nicky ce que vous voulez savoir...`
  - Style : `w-full bg-white border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-neutral-900 transition-colors`.
- **Bouton d'envoi** :
  - Bouton circulaire ou arrondi noir (`bg-neutral-900 text-white p-2 hover:bg-black transition-colors`).
  - Icône : Flèche d'envoi minimale en SVG (`Lucide ArrowRight` ou `Send`).

### E. Micro-copie de bas de bloc
- Texte centré : `Cliquez sur une suggestion ou tapez votre question` (text-[11px], text-neutral-400).

---

## 5. Comportements & Interactions JavaScript (Frontend Logic)

1. **Clic sur une suggestion** :
   - Au clic sur un bouton suggestion :
     - Option A (Direct Send - recommandée) : La question est immédiatement envoyée dans le flux de chat comme message utilisateur, et le LLM commence à streamer la réponse.
     - Option B (Prefill) : L'input est prérempli avec la question et reçoit le focus automatique pour permettre au visiteur d'ajuster ou d'appuyer sur Entrée.
2. **Gestion du scroll & focus** :
   - Lorsqu'une réponse commence à être générée, masquer ou replier élégamment le bloc de suggestions pour laisser la place aux messages de conversation.
3. **Accessibilité (a11y)** :
   - Chaque puce doit être un `<button type="button">` avec un attribut `aria-label`.
   - L'input doit supporter la validation par la touche `Entrée`.

---

## 6. Snippet de Référence (Tailwind CSS / React / Next.js)

```tsx
import React, { useState } from 'react';
import { ArrowUpRight, Send } from 'lucide-react';

export const NickyChatPrompt = ({ onSendMessage }: { onSendMessage: (msg: string) => void }) => {
  const [inputVal, setInputVal] = useState('');

  const suggestions = [
    { label: "Missions Repo & Sec Lending", prompt: "Quelles sont les réalisations et missions de Kim-san en Repo et Securities Lending ?" },
    { label: "Stack Agentic & Projets IA", prompt: "Peux-tu me détailler les compétences techniques et projets récents en IA agentique ?" },
    { label: "TJM & Disponibilité", prompt: "Quelle est la disponibilité actuelle de Kim-san et son TJM indicatif ?" },
    { label: "Pourquoi recruter Kim-san ?", prompt: "Quels sont les points forts et la valeur ajoutée de Kim-san sur un poste de Business Analyst ?" }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendMessage(inputVal);
    setInputVal('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#f6f6f5] border border-neutral-200/70 rounded-2xl p-6 shadow-sm font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/50 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
            8
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900 leading-tight">Nicky</div>
            <div className="flex items-center text-xs text-neutral-500 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              En ligne
            </div>
          </div>
        </div>
        <span className="text-[10px] tracking-widest uppercase font-mono px-2 py-0.5 bg-neutral-200/60 rounded text-neutral-600">
          IA AGENTIQUE
        </span>
      </div>

      {/* Bulle d'accueil */}
      <div className="bg-white rounded-xl p-4 border border-neutral-200/70 mb-5 shadow-xs">
        <p className="text-sm text-neutral-800 leading-relaxed">
          Bonjour, je suis Nicky, le jumeau numérique de Kim-san. Je suis là pour vous aider à naviguer à travers des années d’expérience.
        </p>
        <p className="text-sm font-medium text-neutral-900 mt-2">
          Que souhaitez-vous savoir en premier ?
        </p>
      </div>

      {/* Quick Suggestions (Zero Emoji, No 1-Clic) */}
      <div className="mb-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2.5">
          Suggestions
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(item.prompt)}
              className="text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 hover:text-neutral-950 hover:border-neutral-400 border border-neutral-200/90 rounded-lg px-3 py-2 transition-all duration-150 text-left shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Demandez à Nicky ce que vous voulez savoir..."
          className="w-full bg-white border border-neutral-200 rounded-xl pl-4 pr-12 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="absolute right-2 p-2 bg-neutral-900 hover:bg-black disabled:opacity-40 disabled:hover:bg-neutral-900 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
          aria-label="Envoyer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      <p className="text-center text-[11px] text-neutral-400 mt-2.5">
        Cliquez sur une suggestion ou tapez votre question
      </p>
    </div>
  );
};
```
