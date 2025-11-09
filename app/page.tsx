'use client'

import { useState } from 'react'
import ChatInterface from '@/components/ChatInterface'
import AboutSection from '@/components/AboutSection'
import ProjectGallery from '@/components/ProjectGallery'
import Header from '@/components/Header'

export default function Home() {
  const [suggestedQuestion, setSuggestedQuestion] = useState<string>('')

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <Header />

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface - En haut sur mobile, à droite sur desktop */}
          <div className="lg:col-span-2 lg:order-2">
            <ChatInterface suggestedQuestion={suggestedQuestion} onQuestionSent={() => setSuggestedQuestion('')} />
          </div>

          {/* Colonne gauche : À propos + Projets - En bas sur mobile, à gauche sur desktop */}
          <div className="lg:col-span-1 lg:order-1 space-y-6">
            <AboutSection onQuestionClick={setSuggestedQuestion} />
            <ProjectGallery />

            {/* Info RAG */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                RAG activé
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Les réponses sont générées à partir des informations stockées dans le RAG.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-600 dark:text-slate-400 text-sm">
          Propulsé par Claude AI + RAG + n8n • Créé avec Next.js
        </div>
      </footer>
    </main>
  )
}