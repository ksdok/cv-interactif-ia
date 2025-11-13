'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import AboutSection from '@/components/AboutSection'
import ProjectGallery from '@/components/ProjectGallery'
import Header from '@/components/Header'
import { useLanguage } from '@/lib/LanguageContext'
import { getTranslation } from '@/lib/translations'

/**
 * Main page of the interactive CV
 * Manages communication between suggested questions and chat
 * Also handles extraction and passing of CSRF token to ChatInterface component
 */
export default function Home() {
  const { language } = useLanguage()
  const t = (key: string) => getTranslation(language, key)

  // Shared state for suggested questions clicked in AboutSection
  const [suggestedQuestion, setSuggestedQuestion] = useState<string>('')

  // State to store CSRF token extracted from the page
  // SECURITY: The token is securely stored in httpOnly cookie on the server
  // We extract it here from the meta tag in the browser
  const [csrfToken, setCsrfToken] = useState<string>('')

  // Extract CSRF token from meta tag on client-side mount
  useEffect(() => {
    const tokenElement = document.querySelector('meta[name="csrf-token"]')
    const token = tokenElement?.getAttribute('content') || ''
    setCsrfToken(token)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header with responsive title and dark mode toggle */}
      <Header />

      {/* Main content - increased bottom padding on mobile to avoid overlap with iOS Safari bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chat Interface - At top on mobile, on right on desktop */}
          <div className="lg:col-span-2 lg:order-2">
            {/* Pass suggested question to chat, callback to reset it, and CSRF token */}
            <ChatInterface
              suggestedQuestion={suggestedQuestion}
              onQuestionSent={() => setSuggestedQuestion('')}
              csrfToken={csrfToken}
            />
          </div>

          {/* Left column: About + Projects - At bottom on mobile, on left on desktop */}
          <div className="lg:col-span-1 lg:order-1 space-y-6">
            {/* Pass callback to send up clicked questions */}
            <AboutSection onQuestionClick={setSuggestedQuestion} />

            {/* Visitor counter for social proof - Hidden for the time being */}
            {/* <VisitorCounter /> */}

            <ProjectGallery />

            {/* RAG Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                {t('rag.title')}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('rag.description')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-600 dark:text-slate-400 text-sm">
          {t('footer')}
        </div>
      </footer>
    </main>
  )
}