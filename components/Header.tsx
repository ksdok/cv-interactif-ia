'use client'

import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 backdrop-blur-sm bg-white/90 dark:bg-slate-800/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            CV Interactif IA avec RAG
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Assistant IA alimenté par vos documents (géré via n8n)
          </p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
