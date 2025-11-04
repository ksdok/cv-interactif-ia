import ChatInterface from '@/components/ChatInterface'
import AboutSection from '@/components/AboutSection'
import ProjectGallery from '@/components/ProjectGallery'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900">
            CV Interactif IA avec RAG
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Assistant IA alimenté par vos documents (géré via n8n)
          </p>
        </div>
      </header>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : À propos + Projets */}
          <div className="lg:col-span-1 space-y-6">
            <AboutSection />
            <ProjectGallery />
            
            {/* Info RAG */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-sm border border-blue-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                🤖 RAG activé
              </h3>
              <p className="text-sm text-slate-700">
                Les réponses sont générées à partir de vos documents personnels stockés dans le RAG.
              </p>
              <p className="text-xs text-slate-600 mt-2">
                💡 Pour enrichir le RAG, utilisez le workflow n8n avec vos documents PDF.
              </p>
            </div>
          </div>

          {/* Colonne droite : Chat Interface */}
          <div className="lg:col-span-2">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-600 text-sm">
          Propulsé par Claude AI + RAG + n8n • Créé avec Next.js
        </div>
      </footer>
    </main>
  )
}