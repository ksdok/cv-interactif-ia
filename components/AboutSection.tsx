'use client'

interface AboutSectionProps {
  onQuestionClick: (question: string) => void
}

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
            <p className="text-sm text-slate-600 dark:text-slate-400">Business Analyst chez la SG</p>
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

        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">Questions suggérées</h4>
          <div className="space-y-2 text-xs">
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
      </div>
    </div>
  )
}