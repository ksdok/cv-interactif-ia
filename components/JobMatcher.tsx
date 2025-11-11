'use client'

import { useState, useEffect } from 'react'

interface JobMatchResult {
  overallMatch: number
  skillsMatch: number
  experienceMatch: number
  analysis: string
  strengths: string[]
  improvements: string[]
}

interface JobMatcherProps {
  isOpen: boolean
  onClose: () => void
}

export default function JobMatcher({ isOpen, onClose }: JobMatcherProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<JobMatchResult | null>(null)
  const [error, setError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Detect dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      setIsDarkMode(isDark)
    })

    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      setError('Veuillez coller une description de poste')
      return
    }

    if (jobDescription.length > 10000) {
      setError('La description du poste est trop longue (max 10 000 caractères)')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // SECURITY: Extract CSRF token from meta tag for request
      const csrfTokenElement = document.querySelector('meta[name="csrf-token"]')
      const csrfToken = csrfTokenElement ? csrfTokenElement.getAttribute('content') : null

      if (!csrfToken) {
        setError('Security error: CSRF token not found. Please refresh the page.')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/job-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ jobDescription }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Échec de l\'analyse de correspondance')
      }

      setResult(data)
      setJobDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setJobDescription('')
    setResult(null)
    setError('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking on the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-2xl"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 opacity-100">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Job Matching score</h2>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!result ? (
            // Input form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Coller la description du poste
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Collez la description complète du poste ici... (max 10 000 caractères)"
                  className="w-full h-48 px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isLoading}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {jobDescription.length}/10 000 caractères
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={isLoading || !jobDescription.trim()}
                style={{
                  backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                  color: '#ffffff'
                }}
                className="w-full font-semibold px-4 py-3 rounded-lg transition-all duration-300 disabled:cursor-not-allowed cursor-pointer disabled:opacity-50"
                onMouseEnter={(e) => {
                  if (!isLoading && jobDescription.trim()) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                }}
              >
                {isLoading ? 'Analyse en cours...' : 'Analyser le matching du du poste'}
              </button>
            </div>
          ) : (
            // Results view
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">Correspondance Globale</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{result.overallMatch}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">Correspondance Compétences</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{result.skillsMatch}%</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold mb-1">Correspondance Expérience</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{result.experienceMatch}%</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Analyse</h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{result.analysis}</p>
              </div>

              {result.strengths.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span> Ses Points Forts
                  </h3>
                  <ul className="space-y-1">
                    {result.strengths.map((strength, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm flex gap-2">
                        <span className="text-green-600 dark:text-green-400 font-bold">-</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvements.length > 0 && (
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400">→</span> Ses domaines à Développer
                  </h3>
                  <ul className="space-y-1">
                    {result.improvements.map((improvement, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm flex gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-bold">-</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  Analyser un Autre Poste
                </button>
                <a
                  href={`mailto:dokkimsan@gmail.com?subject=Analyse de Correspondance de Poste&body=Bonjour Kim-san,%0D%0A%0D%0AJ'ai analysé le profil avec la description de poste et j'aimerais discuter des résultats:%0D%0A%0D%0ACOrrespondance Globale: ${result.overallMatch}%25%0D%0ACOrrespondance Compétences: ${result.skillsMatch}%25%0D%0ACOrrespondance Expérience: ${result.experienceMatch}%25%0D%0A%0D%0AAnalyse:%0D%0A${result.analysis}%0D%0A%0D%0APoints Forts:%0D%0A${result.strengths.join('%0D%0A')}%0D%0A%0D%0ADomaines à Développer:%0D%0A${result.improvements.join('%0D%0A')}%0D%0A%0D%0AJ'attends votre retour.`}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 flex items-center justify-center font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  Contactez moi
                </a>
                <button
                  onClick={handleClose}
                  style={{
                    backgroundColor: isDarkMode ? '#334155' : '#0f172a',
                    color: '#ffffff'
                  }}
                  className="flex-1 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#475569' : '#1a1f3a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#0f172a'
                  }}
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
