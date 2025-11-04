'use client'

export default function AboutSection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">À propos</h2>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            VN
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">[Votre Nom]</h3>
            <p className="text-sm text-slate-600">Spécialiste IA & Automatisation</p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Expert en intelligence artificielle et automatisation. Passionné par la création d'agents IA et l'optimisation de processus avec des outils comme n8n et Claude.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-slate-900 text-sm">Compétences clés</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              Python
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              JavaScript
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              n8n
            </span>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
              Claude AI
            </span>
            <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs rounded-full">
              RAG
            </span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="font-semibold text-slate-900 text-sm mb-2">Questions suggérées</h4>
          <div className="space-y-2 text-xs">
            <p className="text-slate-600 hover:text-blue-600 cursor-pointer">
              💼 Quel est votre parcours professionnel ?
            </p>
            <p className="text-slate-600 hover:text-blue-600 cursor-pointer">
              🤖 Quels types d'agents IA avez-vous créés ?
            </p>
            <p className="text-slate-600 hover:text-blue-600 cursor-pointer">
              🛠️ Comment ce site a-t-il été construit ?
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}