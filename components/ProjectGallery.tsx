'use client'

export default function ProjectGallery() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
        Stack technique
      </h2>

      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Frontend
          </h3>
          <p className="text-xs">
            Développé avec <span className="font-medium">Next.js 15</span> et <span className="font-medium">React 19</span>,
            stylisé avec <span className="font-medium">TailwindCSS</span> pour un design moderne et responsive.
            Mode clair/sombre intégré pour une meilleure expérience utilisateur.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Intelligence Artificielle
          </h3>
          <p className="text-xs">
            Propulsé par <span className="font-medium">Claude Sonnet 4</span> d'Anthropic pour des réponses
            naturelles et pertinentes sur le parcours professionnel.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Système RAG
          </h3>
          <p className="text-xs">
            Architecture <span className="font-medium">RAG (Retrieval Augmented Generation)</span> construite avec
            le framework <span className="font-medium">LangChain</span>, hébergée sur <span className="font-medium">Supabase</span> avec
            base vectorielle intégrée. Permet d'indexer et rechercher intelligemment dans les informations du CV.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Enrichissement du RAG
          </h3>
          <p className="text-xs">
            Workflow <span className="font-medium">n8n</span> avec un agent recruteur conversationnel qui pose
            des questions interactives sur le parcours professionnel. Les réponses sont automatiquement
            enregistrées et indexées dans le système RAG pour enrichir la base de connaissances.
          </p>
        </div>
      </div>
    </div>
  )
}