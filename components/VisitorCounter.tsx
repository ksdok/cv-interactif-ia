'use client'

import { useEffect, useState } from 'react'

/**
 * Composant affichant le nombre de recruteurs ayant visité le site cette semaine
 * Affiche une valeur statique pour le social proof
 */
export default function VisitorCounter() {
  const [visitors, setVisitors] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Nombre statique de visiteurs pour le social proof
    const totalVisitors = 47

    // Animation du compteur qui monte progressivement
    let current = 0
    const increment = Math.ceil(totalVisitors / 30)
    const timer = setInterval(() => {
      current += increment
      if (current >= totalVisitors) {
        current = totalVisitors
        clearInterval(timer)
        setIsAnimating(false)
      }
      setVisitors(current)
    }, 50)

    setIsAnimating(true)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-lg shadow-sm border border-emerald-200 dark:border-emerald-800 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {/* Icône de tendance montante */}
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Profil populaire
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400 ${isAnimating ? 'animate-pulse' : ''}`}>
              {visitors}
            </span>
            <span className="ml-2">recruteurs ont consulté ce profil cette semaine</span>
          </p>
        </div>

        {/* Badge "Trending" */}
        <div className="flex-shrink-0">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <span className="animate-pulse">🔥</span>
            <span>Tendance</span>
          </div>
        </div>
      </div>

      {/* Barre de progression visuelle */}
      <div className="mt-3 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min((visitors / 50) * 100, 100)}%` }}
        ></div>
      </div>
      
    </div>
  )
}
