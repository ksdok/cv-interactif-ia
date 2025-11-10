'use client'

interface AboutSectionProps {
  onQuestionClick: (question: string) => void // Callback to notify parent when a question is clicked
}

/**
 * "About" section with personal information and suggested questions
 * Suggested questions are clickable and automatically fill the chat input field
 */
export default function AboutSection({ onQuestionClick }: AboutSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">À propos</h2>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            KSD
          </div>
          
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">DOK Kim-san</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">En poste chez la SG, ouvert aux opportunités</p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Ce projet est pour vous montrer ma passion récente pour l'intelligence artificielle<br/>
            Sur comment, nous pouvons utiliser des modèles de langage avancés pour créer des expériences interactives et engageantes.<br/>
            N'hésitez pas à me poser des questions sur mon parcours professionnel, mes compétences techniques, ou même sur la construction de ce site !
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Compétences clés</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded-full">
              Curiosité
            </span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs rounded-full">
              Prompting
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-full">
              RAG
            </span>
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs rounded-full">
              Agent AI
            </span>
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs rounded-full">
              n8n
            </span>
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs rounded-full">
              Veille technologique
            </span>
            <span className="px-3 py-1 bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-xs rounded-full">
              L'expérimentation
            </span>
          </div>
        </div>

        {/* Clickable suggested questions */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">Suggested Questions</h4>
          <div className="space-y-2 text-xs">
            {/* Each question calls onQuestionClick to fill the chat input field */}
            <p
              onClick={() => onQuestionClick("Quel est son parcours professionnel ?")}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              Quel est son parcours professionnel ?
            </p>
            <p
              onClick={() => onQuestionClick("Quels types d'agents IA avez-vous créés ?")}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              Quels types d'agents IA avez-vous créés ?
            </p>
            <p
              onClick={() => onQuestionClick("Comment ce site a-t-il été construit ?")}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              Comment ce site a-t-il été construit ?
            </p>
            <p
              onClick={() => onQuestionClick("Aime-t-il les chats ?")}
              className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
            >
              Aime-t-il les chats ?
            </p>
          </div>
        </div>

        {/* Email contact button - Placed at the bottom of the section */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <a
            href="mailto:dokkimsan@gmail.com?subject=Opportunité professionnelle&body=Bonjour Kim-san,%0D%0A%0D%0AJ'ai consulté votre CV interactif et je souhaite échanger avec vous concernant une opportunité."
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-4 py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Me contacter par email</span>
          </a>
        </div>
      </div>
    </div>
  )
}